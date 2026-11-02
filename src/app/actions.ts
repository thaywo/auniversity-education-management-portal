"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  academicLevels, academicSessions, auditLogs, courseAllocations, courses,
  departments, faculties, gradingScale, lecturers, programs, registrations,
  results, resultSubmissions, rolePermissions, semesters, students, users,
  type Role,
} from "@/db/schema";
import type { AuthUser } from "@/lib/auth";
import { hashPassword, requireActionUser } from "@/lib/auth";
import { getCourseById, getCourseRoster, getCurrentTerm, getLecturerContext, getRegisteredCourses, getStudentContext } from "@/lib/data";
import { getGradingScale, gradeFor, CA_MAX, EXAM_MAX } from "@/lib/grades";
import { PERMISSION_CATALOG, requirePermission } from "@/lib/permissions";

export type ActionResult = { ok: boolean; message: string };

async function run(message: string, fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
    revalidatePath("/", "layout");
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

function text(form: FormData, key: string, required = true, max = 220): string {
  const value = String(form.get(key) ?? "").trim();
  if (required && !value) throw new Error(`${key.replaceAll("_", " ")} is required.`);
  if (value.length > max) throw new Error(`${key.replaceAll("_", " ")} is too long (max ${max} characters).`);
  return value;
}

function integer(form: FormData, key: string, min = -Infinity, max = Infinity): number {
  const raw = String(form.get(key) ?? "").trim();
  const value = Number(raw);
  if (!raw || !Number.isInteger(value)) throw new Error(`${key.replaceAll("_", " ")} must be a whole number.`);
  if (value < min || value > max) throw new Error(`${key.replaceAll("_", " ")} must be between ${min} and ${max}.`);
  return value;
}

function optionalInteger(form: FormData, key: string): number | null {
  const raw = String(form.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value)) throw new Error(`${key.replaceAll("_", " ")} must be a whole number.`);
  return value;
}

function validEmail(value: string): string {
  const email = value.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  return email;
}

async function audit(
  user: AuthUser, action: string, entity: string, entityId: string | number | null,
  details: Record<string, unknown>, departmentId?: number | null,
) {
  await db.insert(auditLogs).values({
    userId: user.id, actorName: user.fullName, action, entity,
    entityId: entityId === null ? null : String(entityId),
    departmentId: departmentId ?? user.departmentId, details,
  });
}

/** Super Admins may choose any department; Department Admins are locked to their own. */
async function resolveDepartment(user: AuthUser, requested: number | null): Promise<number> {
  if (user.role === "super_admin") {
    if (!requested) throw new Error("Select a department.");
    const rows = await db.select({ id: departments.id }).from(departments).where(eq(departments.id, requested)).limit(1);
    if (!rows.length) throw new Error("Selected department does not exist.");
    return requested;
  }
  if (user.role === "dept_admin") {
    if (!user.departmentId) throw new Error("Your account has no department assignment.");
    if (requested && requested !== user.departmentId) throw new Error("Forbidden: you cannot manage another department.");
    return user.departmentId;
  }
  throw new Error("Forbidden: insufficient administrative privileges.");
}

async function assertProgramInDepartment(programId: number | null, departmentId: number): Promise<number | null> {
  if (!programId) return null;
  const rows = await db.select({ id: programs.id }).from(programs)
    .where(and(eq(programs.id, programId), eq(programs.departmentId, departmentId))).limit(1);
  if (!rows.length) throw new Error("The selected program does not belong to this department.");
  return programId;
}

/* ---------------------------------- Profile --------------------------------- */

export async function updateProfile(form: FormData): Promise<ActionResult> {
  return run("Profile updated successfully.", async () => {
    const user = await requireActionUser(["student"]);
    const phone = text(form, "phone", false, 40);
    const address = text(form, "address", false, 500);
    const gender = text(form, "gender", false, 20);
    const guardianPhone = text(form, "guardian_phone", false, 40);
    await db.update(users).set({ phone: phone || null }).where(eq(users.id, user.id));
    await db.update(students).set({
      address: address || null, gender: gender || null, guardianPhone: guardianPhone || null,
    }).where(eq(students.userId, user.id));
  });
}

/* --------------------------- Course registration ---------------------------- */

export async function registerCourses(form: FormData): Promise<ActionResult> {
  return run("Courses registered successfully.", async () => {
    const user = await requireActionUser(["student"]);
    await requirePermission(user, "student.register");
    const student = await getStudentContext(user.id);
    if (!student || student.status !== "active") throw new Error("Student record not found or account inactive.");
    const term = await getCurrentTerm();
    if (!term.semester.isActive || !term.session.isActive) throw new Error("Course registration is closed for the current term.");

    const requested = [...new Set(form.getAll("courseId").map((value) => Number(value)).filter(Number.isInteger))];
    if (!requested.length) throw new Error("Select at least one course.");

    const existing = await getRegisteredCourses(student.studentId, term.session.id, term.semester.id);
    const alreadyRegistered = new Set(existing.map((row) => row.id));
    const newIds = requested.filter((id) => !alreadyRegistered.has(id));
    if (!newIds.length) throw new Error("All selected courses are already registered (duplicate registration prevented).");

    const available = await db.select().from(courses).where(inArray(courses.id, newIds));
    if (available.length !== newIds.length) throw new Error("One or more selected courses no longer exist.");
    for (const course of available) {
      if (
        course.departmentId !== student.departmentId || course.level !== student.level ||
        course.semesterId !== term.semester.id || course.sessionId !== term.session.id ||
        !course.isActive || (course.programId !== null && course.programId !== student.programId)
      ) {
        throw new Error(`${course.code} is not available for your department, program, level or semester.`);
      }
    }
    const currentUnits = existing.reduce((sum, row) => sum + row.units, 0);
    const addedUnits = available.reduce((sum, row) => sum + row.units, 0);
    if (currentUnits + addedUnits > 24) throw new Error(`Credit limit exceeded: the maximum is 24 units per semester (current ${currentUnits}, requested ${addedUnits}).`);

    await db.insert(registrations).values(newIds.map((courseId) => ({
      studentId: student.studentId, courseId, sessionId: term.session.id, semesterId: term.semester.id,
    }))).onConflictDoNothing();
    await audit(user, "COURSES_REGISTERED", "registration", null,
      { courses: available.map((c) => c.code), units: addedUnits, session: term.session.name }, student.departmentId);
  });
}

export async function dropRegistration(form: FormData): Promise<ActionResult> {
  return run("Course removed from your registration.", async () => {
    const user = await requireActionUser(["student"]);
    await requirePermission(user, "student.register");
    const student = await getStudentContext(user.id);
    if (!student) throw new Error("Student record not found.");
    const registrationId = integer(form, "registrationId", 1);
    const rows = await db.select({ id: registrations.id, code: courses.code }).from(registrations)
      .innerJoin(courses, eq(registrations.courseId, courses.id))
      .where(and(eq(registrations.id, registrationId), eq(registrations.studentId, student.studentId))).limit(1);
    if (!rows.length) throw new Error("Registration not found.");
    const existingResult = await db.select({ id: results.id }).from(results)
      .where(eq(results.registrationId, registrationId)).limit(1);
    if (existingResult.length) throw new Error("A course with recorded results cannot be dropped.");
    await db.delete(registrations).where(eq(registrations.id, registrationId));
    await audit(user, "COURSE_REGISTRATION_REMOVED", "registration", registrationId, { course: rows[0].code }, student.departmentId);
  });
}

/* ----------------------------- Result workflow ------------------------------ */

export type ScoreEntry = { registrationId: number; ca: string; exam: string };

export async function saveResultScores(
  courseId: number, entries: ScoreEntry[], mode: "draft" | "submit",
): Promise<ActionResult> {
  return run(mode === "submit" ? "Results submitted for departmental review." : "Draft scores saved.", async () => {
    const user = await requireActionUser(["lecturer"]);
    await requirePermission(user, mode === "submit" ? "lecturer.submit_results" : "lecturer.enter_results");
    const lecturer = await getLecturerContext(user.id);
    if (!lecturer) throw new Error("Lecturer profile not found.");
    const course = await getCourseById(courseId);
    if (!course || course.departmentId !== lecturer.departmentId) {
      throw new Error("Forbidden: this course is outside your department or teaching responsibilities.");
    }
    const allocations = await db.select({ id: courseAllocations.id }).from(courseAllocations).where(and(
      eq(courseAllocations.courseId, courseId), eq(courseAllocations.lecturerId, lecturer.lecturerId),
      eq(courseAllocations.sessionId, course.sessionId),
    )).limit(1);
    if (!allocations.length) throw new Error("Forbidden: this course is not allocated to you.");

    const [submission] = await db.select().from(resultSubmissions).where(and(
      eq(resultSubmissions.courseId, courseId), eq(resultSubmissions.lecturerId, lecturer.lecturerId),
      eq(resultSubmissions.sessionId, course.sessionId),
    )).limit(1);
    if (submission?.status === "submitted" || submission?.status === "approved") {
      throw new Error("Submitted results are locked. A Department Admin must reopen them for correction.");
    }

    const roster = await getCourseRoster(courseId);
    const rosterMap = new Map(roster.map((row) => [row.registrationId, row]));
    const parsed = entries.map((entry) => {
      const row = rosterMap.get(Number(entry.registrationId));
      if (!row) throw new Error("A score was submitted for a student not registered for this course.");
      const caRaw = String(entry.ca ?? "").trim();
      const examRaw = String(entry.exam ?? "").trim();
      const ca = caRaw === "" ? null : Number(caRaw);
      const exam = examRaw === "" ? null : Number(examRaw);
      if (ca !== null && (!Number.isFinite(ca) || ca < 0 || ca > CA_MAX)) throw new Error(`CA score for ${row.fullName} must be 0–${CA_MAX}.`);
      if (exam !== null && (!Number.isFinite(exam) || exam < 0 || exam > EXAM_MAX)) throw new Error(`Exam score for ${row.fullName} must be 0–${EXAM_MAX}.`);
      if ((ca === null) !== (exam === null)) throw new Error(`Enter both CA and exam scores for ${row.fullName}.`);
      return { row, ca, exam };
    });
    const enteredIds = new Set(parsed.map((entry) => entry.row.registrationId));
    const merged = roster.map((row) => {
      const entry = parsed.find((item) => item.row.registrationId === row.registrationId);
      return {
        row,
        ca: entry ? entry.ca : row.caScore,
        exam: entry ? entry.exam : row.examScore,
      };
    });
    if (mode === "submit") {
      const incomplete = merged.filter((item) => item.ca === null || item.exam === null);
      if (incomplete.length) throw new Error(`Complete scores for all ${roster.length} registered students before submitting (${incomplete.length} incomplete).`);
    }
    const scale = await getGradingScale();
    const now = new Date();
    await db.transaction(async (tx) => {
      for (const item of parsed) {
        const hasScores = item.ca !== null && item.exam !== null;
        const total = hasScores ? (item.ca ?? 0) + (item.exam ?? 0) : null;
        const band = total === null ? null : gradeFor(total, scale);
        const values = {
          registrationId: item.row.registrationId, courseId, studentId: item.row.studentId,
          caScore: item.ca, examScore: item.exam, totalScore: total,
          grade: band?.grade ?? null, gradePoint: band?.gradePoint ?? null,
          status: (mode === "submit" ? "submitted" : "draft") as "submitted" | "draft",
          enteredBy: user.id, approvedBy: null, approvedAt: null,
          submittedAt: mode === "submit" ? now : null, updatedAt: now,
        };
        await tx.insert(results).values(values).onConflictDoUpdate({ target: results.registrationId, set: values });
      }
      if (mode === "submit") {
        // Make sure results saved in an earlier draft are also marked submitted.
        await tx.update(results).set({ status: "submitted", submittedAt: now, updatedAt: now })
          .where(and(eq(results.courseId, courseId), eq(results.status, "draft")));
      }
      const submissionValues = {
        courseId, lecturerId: lecturer.lecturerId, departmentId: course.departmentId,
        sessionId: course.sessionId, semesterId: course.semesterId,
        status: (mode === "submit" ? "submitted" : "draft") as "submitted" | "draft",
        feedback: mode === "submit" ? null : submission?.feedback ?? null,
        submittedAt: mode === "submit" ? now : null,
        reviewedAt: null, reviewedBy: null, updatedAt: now,
      };
      if (submission) {
        await tx.update(resultSubmissions).set(submissionValues).where(eq(resultSubmissions.id, submission.id));
      } else {
        await tx.insert(resultSubmissions).values(submissionValues);
      }
    });
    await audit(user, mode === "submit" ? "RESULT_SUBMITTED" : "RESULT_DRAFT_SAVED", "result_submission",
      submission?.id ?? null, {
        course: course.code, studentCount: roster.length, changedRows: enteredIds.size,
        previousStatus: submission?.status ?? "none",
        scores: parsed.map((item) => ({ student: item.row.matricNumber, ca: item.ca, exam: item.exam })),
      }, course.departmentId);
  });
}

export async function reviewSubmission(form: FormData): Promise<ActionResult> {
  return run("Result review recorded.", async () => {
    const user = await requireActionUser(["dept_admin"]);
    await requirePermission(user, "dept.review_results");
    const submissionId = integer(form, "submissionId", 1);
    const decision = text(form, "decision", true, 20);
    const feedback = text(form, "feedback", false, 600);
    if (!["approve", "return", "reopen"].includes(decision)) throw new Error("Invalid review decision.");
    if ((decision === "return" || decision === "reopen") && !feedback) throw new Error("Feedback is required when returning or reopening results.");
    const [submission] = await db.select().from(resultSubmissions).where(eq(resultSubmissions.id, submissionId)).limit(1);
    if (!submission) throw new Error("Submission not found.");
    if (submission.departmentId !== user.departmentId) throw new Error("Forbidden: this submission belongs to another department.");
    if (decision === "approve" && submission.status !== "submitted") throw new Error("Only submitted results can be approved.");
    if (decision === "return" && submission.status !== "submitted") throw new Error("Only submitted results can be returned.");
    if (decision === "reopen" && submission.status !== "approved") throw new Error("Only approved results can be reopened.");

    if (decision === "approve") {
      const roster = await getCourseRoster(submission.courseId);
      if (roster.some((row) => row.resultStatus !== "submitted")) {
        throw new Error("Cannot approve: some registered students have incomplete or unsubmitted results.");
      }
    }
    const now = new Date();
    await db.transaction(async (tx) => {
      const resultStatus = decision === "approve" ? "approved" : decision === "return" ? "returned" : "draft";
      await tx.update(results).set({
        status: resultStatus, approvedBy: decision === "approve" ? user.id : null,
        approvedAt: decision === "approve" ? now : null,
        submittedAt: decision === "reopen" ? null : undefined,
        updatedAt: now,
      }).where(eq(results.courseId, submission.courseId));
      await tx.update(resultSubmissions).set({
        status: decision === "approve" ? "approved" : decision === "return" ? "returned" : "draft",
        feedback: decision === "approve" ? (feedback || "Approved for publication.") : feedback,
        reviewedAt: now, reviewedBy: user.id, updatedAt: now,
      }).where(eq(resultSubmissions.id, submissionId));
    });
    await audit(user, decision === "approve" ? "RESULT_APPROVED" : decision === "return" ? "RESULT_RETURNED" : "RESULT_REOPENED",
      "result_submission", submissionId,
      { decision, feedback: feedback || null, previousStatus: submission.status }, submission.departmentId);
  });
}

/* ------------------------ Academic structure (Super Admin) ------------------- */

export async function createFaculty(form: FormData): Promise<ActionResult> {
  return run("Faculty created.", async () => {
    const user = await requireActionUser(["super_admin"]);
    await requirePermission(user, "admin.manage_structure");
    const name = text(form, "name");
    const code = text(form, "code", true, 20).toUpperCase();
    const existing = await db.select({ id: faculties.id }).from(faculties).where(eq(faculties.code, code)).limit(1);
    if (existing.length) throw new Error("A faculty with this code already exists.");
    const [created] = await db.insert(faculties).values({ name, code }).returning();
    await audit(user, "FACULTY_CREATED", "faculty", created.id, { name, code });
  });
}

export async function toggleFaculty(form: FormData): Promise<ActionResult> {
  return run("Faculty status updated.", async () => {
    const user = await requireActionUser(["super_admin"]);
    await requirePermission(user, "admin.manage_structure");
    const id = integer(form, "id", 1);
    const [row] = await db.select().from(faculties).where(eq(faculties.id, id)).limit(1);
    if (!row) throw new Error("Faculty not found.");
    await db.update(faculties).set({ isActive: !row.isActive }).where(eq(faculties.id, id));
    await audit(user, "FACULTY_STATUS_CHANGED", "faculty", id, { isActive: !row.isActive });
  });
}

export async function createDepartment(form: FormData): Promise<ActionResult> {
  return run("Department created.", async () => {
    const user = await requireActionUser(["super_admin"]);
    await requirePermission(user, "admin.manage_structure");
    const name = text(form, "name");
    const code = text(form, "code", true, 20).toUpperCase();
    const facultyId = integer(form, "facultyId", 1);
    const existing = await db.select({ id: departments.id }).from(departments).where(eq(departments.code, code)).limit(1);
    if (existing.length) throw new Error("A department with this code already exists.");
    const [created] = await db.insert(departments).values({ name, code, facultyId }).returning();
    await db.insert(academicLevels).values([100, 200, 300, 400, 500].map((level) => ({
      departmentId: created.id, level, name: `${level} Level`,
    })));
    await audit(user, "DEPARTMENT_CREATED", "department", created.id, { name, code, facultyId });
  });
}

export async function toggleDepartment(form: FormData): Promise<ActionResult> {
  return run("Department status updated.", async () => {
    const user = await requireActionUser(["super_admin"]);
    await requirePermission(user, "admin.manage_structure");
    const id = integer(form, "id", 1);
    const [row] = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
    if (!row) throw new Error("Department not found.");
    await db.update(departments).set({ isActive: !row.isActive }).where(eq(departments.id, id));
    await audit(user, "DEPARTMENT_STATUS_CHANGED", "department", id, { isActive: !row.isActive });
  });
}

export async function createSession(form: FormData): Promise<ActionResult> {
  return run("Academic session created.", async () => {
    const user = await requireActionUser(["super_admin"]);
    await requirePermission(user, "admin.manage_sessions");
    const name = text(form, "name", true, 30);
    const existing = await db.select({ id: academicSessions.id }).from(academicSessions).where(eq(academicSessions.name, name)).limit(1);
    if (existing.length) throw new Error("This academic session already exists.");
    const [created] = await db.insert(academicSessions).values({ name }).returning();
    await db.insert(semesters).values([
      { sessionId: created.id, name: "First Semester", number: 1 },
      { sessionId: created.id, name: "Second Semester", number: 2 },
    ]);
    await audit(user, "SESSION_CREATED", "academic_session", created.id, { name });
  });
}

export async function toggleSession(form: FormData): Promise<ActionResult> {
  return run("Session status updated.", async () => {
    const user = await requireActionUser(["super_admin"]);
    await requirePermission(user, "admin.manage_sessions");
    const id = integer(form, "id", 1);
    const [row] = await db.select().from(academicSessions).where(eq(academicSessions.id, id)).limit(1);
    if (!row) throw new Error("Session not found.");
    await db.update(academicSessions).set({ isActive: !row.isActive }).where(eq(academicSessions.id, id));
    await audit(user, "SESSION_STATUS_CHANGED", "academic_session", id, { isActive: !row.isActive });
  });
}

export async function setCurrentSession(form: FormData): Promise<ActionResult> {
  return run("Current academic session updated.", async () => {
    const user = await requireActionUser(["super_admin"]);
    await requirePermission(user, "admin.manage_sessions");
    const id = integer(form, "id", 1);
    await db.transaction(async (tx) => {
      await tx.update(academicSessions).set({ isCurrent: false });
      await tx.update(academicSessions).set({ isCurrent: true, isActive: true }).where(eq(academicSessions.id, id));
      await tx.update(semesters).set({ isCurrent: false });
      const first = await tx.select().from(semesters).where(eq(semesters.sessionId, id)).orderBy(semesters.number).limit(1);
      if (first[0]) await tx.update(semesters).set({ isCurrent: true, isActive: true }).where(eq(semesters.id, first[0].id));
    });
    await audit(user, "CURRENT_SESSION_CHANGED", "academic_session", id, {});
  });
}

export async function createSemester(form: FormData): Promise<ActionResult> {
  return run("Semester created.", async () => {
    const user = await requireActionUser(["super_admin"]);
    await requirePermission(user, "admin.manage_sessions");
    const sessionId = integer(form, "sessionId", 1);
    const name = text(form, "name", true, 40);
    const number = integer(form, "number", 1, 3);
    const existing = await db.select({ id: semesters.id }).from(semesters)
      .where(and(eq(semesters.sessionId, sessionId), eq(semesters.number, number))).limit(1);
    if (existing.length) throw new Error("This semester number already exists for the session.");
    const [created] = await db.insert(semesters).values({ sessionId, name, number }).returning();
    await audit(user, "SEMESTER_CREATED", "semester", created.id, { sessionId, name, number });
  });
}

export async function toggleSemester(form: FormData): Promise<ActionResult> {
  return run("Semester status updated.", async () => {
    const user = await requireActionUser(["super_admin"]);
    await requirePermission(user, "admin.manage_sessions");
    const id = integer(form, "id", 1);
    const [row] = await db.select().from(semesters).where(eq(semesters.id, id)).limit(1);
    if (!row) throw new Error("Semester not found.");
    await db.update(semesters).set({ isActive: !row.isActive }).where(eq(semesters.id, id));
    await audit(user, "SEMESTER_STATUS_CHANGED", "semester", id, { isActive: !row.isActive });
  });
}

export async function setCurrentSemester(form: FormData): Promise<ActionResult> {
  return run("Current semester updated.", async () => {
    const user = await requireActionUser(["super_admin"]);
    await requirePermission(user, "admin.manage_sessions");
    const id = integer(form, "id", 1);
    const [row] = await db.select().from(semesters).where(eq(semesters.id, id)).limit(1);
    if (!row) throw new Error("Semester not found.");
    await db.transaction(async (tx) => {
      await tx.update(semesters).set({ isCurrent: false });
      await tx.update(semesters).set({ isCurrent: true, isActive: true }).where(eq(semesters.id, id));
      await tx.update(academicSessions).set({ isCurrent: false });
      await tx.update(academicSessions).set({ isCurrent: true, isActive: true }).where(eq(academicSessions.id, row.sessionId));
    });
    await audit(user, "CURRENT_SEMESTER_CHANGED", "semester", id, { sessionId: row.sessionId });
  });
}

/* --------------------- Programs, levels & courses --------------------------- */

export async function createProgram(form: FormData): Promise<ActionResult> {
  return run("Program created.", async () => {
    const user = await requireActionUser(["dept_admin", "super_admin"]);
    await requirePermission(user, user.role === "super_admin" ? "admin.manage_structure" : "dept.manage_programs");
    const departmentId = await resolveDepartment(user, optionalInteger(form, "departmentId"));
    const name = text(form, "name");
    const code = text(form, "code", true, 30).toUpperCase();
    const degree = text(form, "degree", false, 60) || "B.Sc.";
    const durationYears = integer(form, "durationYears", 1, 10);
    const existing = await db.select({ id: programs.id }).from(programs)
      .where(and(eq(programs.departmentId, departmentId), eq(programs.code, code))).limit(1);
    if (existing.length) throw new Error("A program with this code already exists in the department.");
    const [created] = await db.insert(programs).values({ departmentId, name, code, degree, durationYears }).returning();
    await audit(user, "PROGRAM_CREATED", "program", created.id, { name, code, departmentId }, departmentId);
  });
}

export async function toggleProgram(form: FormData): Promise<ActionResult> {
  return run("Program status updated.", async () => {
    const user = await requireActionUser(["dept_admin", "super_admin"]);
    await requirePermission(user, user.role === "super_admin" ? "admin.manage_structure" : "dept.manage_programs");
    const id = integer(form, "id", 1);
    const [row] = await db.select().from(programs).where(eq(programs.id, id)).limit(1);
    if (!row) throw new Error("Program not found.");
    const departmentId = await resolveDepartment(user, row.departmentId);
    await db.update(programs).set({ isActive: !row.isActive }).where(eq(programs.id, id));
    await audit(user, "PROGRAM_STATUS_CHANGED", "program", id, { isActive: !row.isActive }, departmentId);
  });
}

export async function createLevel(form: FormData): Promise<ActionResult> {
  return run("Academic level created.", async () => {
    const user = await requireActionUser(["dept_admin", "super_admin"]);
    await requirePermission(user, user.role === "super_admin" ? "admin.manage_structure" : "dept.manage_programs");
    const departmentId = await resolveDepartment(user, optionalInteger(form, "departmentId"));
    const level = integer(form, "level", 100, 900);
    const name = text(form, "name", false, 80) || `${level} Level`;
    const existing = await db.select({ id: academicLevels.id }).from(academicLevels)
      .where(and(eq(academicLevels.departmentId, departmentId), eq(academicLevels.level, level))).limit(1);
    if (existing.length) throw new Error("This level already exists in the department.");
    const [created] = await db.insert(academicLevels).values({ departmentId, level, name }).returning();
    await audit(user, "LEVEL_CREATED", "academic_level", created.id, { level, name }, departmentId);
  });
}

export async function toggleLevel(form: FormData): Promise<ActionResult> {
  return run("Academic level status updated.", async () => {
    const user = await requireActionUser(["dept_admin", "super_admin"]);
    await requirePermission(user, user.role === "super_admin" ? "admin.manage_structure" : "dept.manage_programs");
    const id = integer(form, "id", 1);
    const [row] = await db.select().from(academicLevels).where(eq(academicLevels.id, id)).limit(1);
    if (!row) throw new Error("Level not found.");
    const departmentId = await resolveDepartment(user, row.departmentId);
    await db.update(academicLevels).set({ isActive: !row.isActive }).where(eq(academicLevels.id, id));
    await audit(user, "LEVEL_STATUS_CHANGED", "academic_level", id, { isActive: !row.isActive }, departmentId);
  });
}

export async function createCourse(form: FormData): Promise<ActionResult> {
  return run("Course created.", async () => {
    const user = await requireActionUser(["dept_admin", "super_admin"]);
    await requirePermission(user, user.role === "super_admin" ? "admin.manage_courses" : "dept.manage_courses");
    const departmentId = await resolveDepartment(user, optionalInteger(form, "departmentId"));
    const code = text(form, "code", true, 30).toUpperCase().replace(/\s+/g, "");
    const title = text(form, "title");
    const units = integer(form, "units", 1, 6);
    const level = integer(form, "level", 100, 900);
    const semesterId = integer(form, "semesterId", 1);
    const sessionId = integer(form, "sessionId", 1);
    const programId = await assertProgramInDepartment(optionalInteger(form, "programId"), departmentId);
    const semester = await db.select().from(semesters).where(and(eq(semesters.id, semesterId), eq(semesters.sessionId, sessionId))).limit(1);
    if (!semester.length) throw new Error("The selected semester does not belong to the selected session.");
    const existing = await db.select({ id: courses.id }).from(courses).where(and(
      eq(courses.code, code), eq(courses.departmentId, departmentId),
      eq(courses.sessionId, sessionId), eq(courses.semesterId, semesterId),
    )).limit(1);
    if (existing.length) throw new Error("Duplicate course: this code already exists for the department and term.");
    const [created] = await db.insert(courses).values({
      code, title, units, level, departmentId, programId, semesterId, sessionId,
    }).returning();
    await audit(user, "COURSE_CREATED", "course", created.id, { code, title, units, level, sessionId, semesterId }, departmentId);
  });
}

export async function toggleCourse(form: FormData): Promise<ActionResult> {
  return run("Course status updated.", async () => {
    const user = await requireActionUser(["dept_admin", "super_admin"]);
    await requirePermission(user, user.role === "super_admin" ? "admin.manage_courses" : "dept.manage_courses");
    const id = integer(form, "id", 1);
    const [row] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
    if (!row) throw new Error("Course not found.");
    const departmentId = await resolveDepartment(user, row.departmentId);
    await db.update(courses).set({ isActive: !row.isActive }).where(eq(courses.id, id));
    await audit(user, "COURSE_STATUS_CHANGED", "course", id, { isActive: !row.isActive, code: row.code }, departmentId);
  });
}

export async function assignLecturer(form: FormData): Promise<ActionResult> {
  return run("Course allocation saved.", async () => {
    const user = await requireActionUser(["dept_admin", "super_admin"]);
    await requirePermission(user, user.role === "super_admin" ? "admin.manage_courses" : "dept.assign_courses");
    const courseId = integer(form, "courseId", 1);
    const lecturerId = integer(form, "lecturerId", 1);
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!course) throw new Error("Course not found.");
    const departmentId = await resolveDepartment(user, course.departmentId);
    const [lecturer] = await db.select().from(lecturers).where(eq(lecturers.id, lecturerId)).limit(1);
    if (!lecturer || lecturer.departmentId !== departmentId) throw new Error("The selected lecturer does not belong to this department.");
    const [existing] = await db.select().from(courseAllocations).where(and(
      eq(courseAllocations.courseId, courseId), eq(courseAllocations.sessionId, course.sessionId),
    )).limit(1);
    if (existing) {
      await db.update(courseAllocations).set({ lecturerId }).where(eq(courseAllocations.id, existing.id));
    } else {
      await db.insert(courseAllocations).values({ courseId, lecturerId, sessionId: course.sessionId });
    }
    await audit(user, "COURSE_ALLOCATED", "course", courseId, { lecturerId, previousLecturerId: existing?.lecturerId ?? null }, departmentId);
  });
}

/* ------------------------------ User accounts ------------------------------- */

export async function createStudent(form: FormData): Promise<ActionResult> {
  return run("Student account created.", async () => {
    const user = await requireActionUser(["dept_admin", "super_admin"]);
    await requirePermission(user, user.role === "super_admin" ? "admin.manage_users" : "dept.manage_students");
    const departmentId = await resolveDepartment(user, optionalInteger(form, "departmentId"));
    const fullName = text(form, "fullName");
    const email = validEmail(text(form, "email", true, 190));
    const matricNumber = text(form, "matricNumber", true, 60).toUpperCase();
    const programId = integer(form, "programId", 1);
    await assertProgramInDepartment(programId, departmentId);
    const level = integer(form, "level", 100, 900);
    const admissionYear = integer(form, "admissionYear", 1990, 2100);
    const password = text(form, "password", false, 100) || "Student@123";
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");
    const duplicate = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (duplicate.length) throw new Error("An account with this email already exists.");
    const duplicateMatric = await db.select({ id: students.id }).from(students).where(eq(students.matricNumber, matricNumber)).limit(1);
    if (duplicateMatric.length) throw new Error("This matriculation number already exists.");
    const [created] = await db.insert(users).values({
      email, fullName, role: "student", status: "active", departmentId,
      passwordHash: hashPassword(password),
    }).returning();
    await db.insert(students).values({
      userId: created.id, matricNumber, departmentId, programId, level, admissionYear,
    });
    await audit(user, "STUDENT_CREATED", "student", created.id, { email, matricNumber, programId, level }, departmentId);
  });
}

export async function createLecturer(form: FormData): Promise<ActionResult> {
  return run("Lecturer account created.", async () => {
    const user = await requireActionUser(["dept_admin", "super_admin"]);
    await requirePermission(user, user.role === "super_admin" ? "admin.manage_users" : "dept.manage_lecturers");
    const departmentId = await resolveDepartment(user, optionalInteger(form, "departmentId"));
    const fullName = text(form, "fullName");
    const email = validEmail(text(form, "email", true, 190));
    const staffNumber = text(form, "staffNumber", true, 60).toUpperCase();
    const designation = text(form, "designation", false, 100) || "Lecturer";
    const qualification = text(form, "qualification", false, 120);
    const password = text(form, "password", false, 100) || "Lecturer@123";
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");
    const duplicate = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (duplicate.length) throw new Error("An account with this email already exists.");
    const duplicateStaff = await db.select({ id: lecturers.id }).from(lecturers).where(eq(lecturers.staffNumber, staffNumber)).limit(1);
    if (duplicateStaff.length) throw new Error("This staff number already exists.");
    const [created] = await db.insert(users).values({
      email, fullName, role: "lecturer", status: "active", departmentId,
      passwordHash: hashPassword(password),
    }).returning();
    await db.insert(lecturers).values({
      userId: created.id, staffNumber, departmentId, designation, qualification: qualification || null,
    });
    await audit(user, "LECTURER_CREATED", "lecturer", created.id, { email, staffNumber, designation }, departmentId);
  });
}

export async function createAdminAccount(form: FormData): Promise<ActionResult> {
  return run("Administrative account created.", async () => {
    const user = await requireActionUser(["super_admin"]);
    await requirePermission(user, "admin.manage_users");
    const fullName = text(form, "fullName");
    const email = validEmail(text(form, "email", true, 190));
    const role = text(form, "role", true, 30) as Role;
    if (!["dept_admin", "super_admin"].includes(role)) throw new Error("Invalid administrative role.");
    const departmentId = role === "dept_admin" ? await resolveDepartment(user, optionalInteger(form, "departmentId")) : null;
    const password = text(form, "password", false, 100) || "Admin@123";
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");
    const duplicate = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (duplicate.length) throw new Error("An account with this email already exists.");
    const [created] = await db.insert(users).values({
      email, fullName, role, status: "active", departmentId, passwordHash: hashPassword(password),
    }).returning();
    await audit(user, "ADMIN_ACCOUNT_CREATED", "user", created.id, { email, role, departmentId }, departmentId);
  });
}

export async function updateUserStatus(form: FormData): Promise<ActionResult> {
  return run("Account status updated.", async () => {
    const user = await requireActionUser(["super_admin"]);
    await requirePermission(user, "admin.manage_users");
    const id = integer(form, "id", 1);
    const status = text(form, "status", true, 20);
    if (!["active", "inactive", "suspended"].includes(status)) throw new Error("Invalid account status.");
    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) throw new Error("User not found.");
    if (target.id === user.id && status !== "active") throw new Error("You cannot deactivate or suspend your own account.");
    if (target.role === "super_admin" && target.status === "active" && status !== "active") {
      const others = await db.select({ id: users.id }).from(users).where(and(
        eq(users.role, "super_admin"), eq(users.status, "active"), ne(users.id, id),
      )).limit(1);
      if (!others.length) throw new Error("At least one active Super Admin account must remain.");
    }
    await db.update(users).set({ status: status as "active" | "inactive" | "suspended" }).where(eq(users.id, id));
    await audit(user, "USER_STATUS_CHANGED", "user", id, { previousStatus: target.status, status, email: target.email }, target.departmentId);
  });
}

export async function updateUserRole(form: FormData): Promise<ActionResult> {
  return run("User role and department assignment updated.", async () => {
    const user = await requireActionUser(["super_admin"]);
    await requirePermission(user, "admin.manage_users");
    const id = integer(form, "id", 1);
    const role = text(form, "role", true, 30) as Role;
    if (!["student", "lecturer", "dept_admin", "super_admin"].includes(role)) throw new Error("Invalid role.");
    const departmentId = optionalInteger(form, "departmentId");
    if (role !== "super_admin" && !departmentId) throw new Error("A department is required for this role.");
    if (departmentId) await resolveDepartment(user, departmentId);
    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) throw new Error("User not found.");
    await db.transaction(async (tx) => {
      await tx.update(users).set({ role, departmentId: role === "super_admin" ? null : departmentId }).where(eq(users.id, id));
      if (role === "student") {
        const profile = await tx.select({ id: students.id }).from(students).where(eq(students.userId, id)).limit(1);
        if (!profile.length && departmentId) {
          const [program] = await tx.select().from(programs).where(eq(programs.departmentId, departmentId)).limit(1);
          if (!program) throw new Error("Create a program in this department before assigning a student role.");
          await tx.insert(students).values({
            userId: id, matricNumber: `UEMP/${departmentId}/${id}`, departmentId,
            programId: program.id, level: 100, admissionYear: new Date().getFullYear(),
          });
        }
      }
      if (role === "lecturer") {
        const profile = await tx.select({ id: lecturers.id }).from(lecturers).where(eq(lecturers.userId, id)).limit(1);
        if (!profile.length && departmentId) {
          await tx.insert(lecturers).values({ userId: id, staffNumber: `STAFF/${departmentId}/${id}`, departmentId });
        }
      }
    });
    await audit(user, "USER_ROLE_CHANGED", "user", id,
      { previousRole: target.role, role, previousDepartmentId: target.departmentId, departmentId }, departmentId);
  });
}

export async function updateStudentAcademic(form: FormData): Promise<ActionResult> {
  return run("Student academic record updated.", async () => {
    const user = await requireActionUser(["dept_admin", "super_admin"]);
    await requirePermission(user, user.role === "super_admin" ? "admin.manage_users" : "dept.manage_students");
    const id = integer(form, "id", 1);
    const [row] = await db.select().from(students).where(eq(students.id, id)).limit(1);
    if (!row) throw new Error("Student not found.");
    const departmentId = await resolveDepartment(user, row.departmentId);
    const programId = integer(form, "programId", 1);
    await assertProgramInDepartment(programId, departmentId);
    const level = integer(form, "level", 100, 900);
    await db.update(students).set({ programId, level, departmentId }).where(eq(students.id, id));
    await db.update(users).set({ departmentId }).where(eq(users.id, row.userId));
    await audit(user, "STUDENT_ACADEMIC_UPDATED", "student", id,
      { previousProgramId: row.programId, programId, previousLevel: row.level, level }, departmentId);
  });
}

export async function updateLecturerProfile(form: FormData): Promise<ActionResult> {
  return run("Lecturer profile updated.", async () => {
    const user = await requireActionUser(["dept_admin", "super_admin"]);
    await requirePermission(user, user.role === "super_admin" ? "admin.manage_users" : "dept.manage_lecturers");
    const id = integer(form, "id", 1);
    const [row] = await db.select().from(lecturers).where(eq(lecturers.id, id)).limit(1);
    if (!row) throw new Error("Lecturer not found.");
    const departmentId = await resolveDepartment(user, row.departmentId);
    const designation = text(form, "designation");
    const qualification = text(form, "qualification", false, 120);
    await db.update(lecturers).set({ designation, qualification: qualification || null }).where(eq(lecturers.id, id));
    await audit(user, "LECTURER_UPDATED", "lecturer", id, { designation, qualification }, departmentId);
  });
}

/* ------------------------- Permissions & grading ---------------------------- */

export async function togglePermission(form: FormData): Promise<ActionResult> {
  return run("Permission updated.", async () => {
    const user = await requireActionUser(["super_admin"]);
    const role = text(form, "role", true, 30) as Role;
    const permission = text(form, "permission", true, 80);
    if (!PERMISSION_CATALOG.some((item) => item.key === permission)) throw new Error("Unknown permission.");
    if (role === "super_admin") throw new Error("Super Admin permissions are deliberately fixed to preserve system-wide control.");
    const [row] = await db.select().from(rolePermissions).where(and(
      eq(rolePermissions.role, role), eq(rolePermissions.permission, permission),
    )).limit(1);
    if (!row) throw new Error("Permission entry not found.");
    await db.update(rolePermissions).set({ enabled: !row.enabled }).where(eq(rolePermissions.id, row.id));
    await audit(user, "PERMISSION_CHANGED", "role_permission", row.id,
      { role, permission, previousEnabled: row.enabled, enabled: !row.enabled });
  });
}

export async function updateGradingBand(form: FormData): Promise<ActionResult> {
  return run("Grading scale updated.", async () => {
    const user = await requireActionUser(["super_admin"]);
    await requirePermission(user, "admin.manage_structure");
    const id = integer(form, "id", 1);
    const minScore = integer(form, "minScore", 0, 100);
    const gradePoint = integer(form, "gradePoint", 0, 5);
    const [row] = await db.select().from(gradingScale).where(eq(gradingScale.id, id)).limit(1);
    if (!row) throw new Error("Grading band not found.");
    if (minScore > row.maxScore) throw new Error(`Minimum score cannot exceed the band maximum (${row.maxScore}).`);
    await db.update(gradingScale).set({ minScore, gradePoint }).where(eq(gradingScale.id, id));
    await audit(user, "GRADING_SCALE_UPDATED", "grading_scale", id,
      { grade: row.grade, previousMinScore: row.minScore, minScore, previousGradePoint: row.gradePoint, gradePoint });
  });
}
