import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  academicLevels, academicSessions, appMeta, auditLogs, courseAllocations, courses,
  departments, faculties, gradingScale, lecturers, programs, registrations,
  results, resultSubmissions, rolePermissions, semesters, students, users,
  type Role,
} from "@/db/schema";

type RegistrationRow = typeof registrations.$inferSelect;
import { hashPassword } from "@/lib/auth";
import { PERMISSION_CATALOG } from "@/lib/permissions";

const SEED_KEY = "uemp_seed_v1";

async function runSeed() {
  await db.transaction(async (tx) => {
    const pw = {
      admin: hashPassword("Admin@123"),
      lecturer: hashPassword("Lecturer@123"),
      student: hashPassword("Student@123"),
    };

    const createUser = async (values: {
      email: string; fullName: string; role: Role; password: string;
      departmentId?: number | null; status?: "active" | "inactive" | "suspended"; phone?: string;
    }) => {
      const [user] = await tx.insert(users).values({
        email: values.email,
        fullName: values.fullName,
        role: values.role,
        passwordHash: values.password,
        departmentId: values.departmentId ?? null,
        status: values.status ?? "active",
        phone: values.phone ?? null,
      }).returning();
      return user;
    };

    const [science] = await tx.insert(faculties).values([
      { name: "Faculty of Science & Technology", code: "FST" },
      { name: "Faculty of Arts & Humanities", code: "FAH" },
    ]).returning();
    const arts = (await tx.select().from(faculties).where(eq(faculties.code, "FAH")))[0];

    const insertedDepartments = await tx.insert(departments).values([
      { facultyId: science.id, name: "Computer Science", code: "CSC" },
      { facultyId: science.id, name: "Mathematics", code: "MTH" },
      { facultyId: arts.id, name: "English & Literary Studies", code: "ENG" },
    ]).returning();
    const cs = insertedDepartments[0];
    const maths = insertedDepartments[1];
    const english = insertedDepartments[2];

    const insertedPrograms = await tx.insert(programs).values([
      { departmentId: cs.id, name: "B.Sc. Computer Science", code: "CSC", degree: "B.Sc.", durationYears: 4 },
      { departmentId: cs.id, name: "B.Sc. Information Technology", code: "IFT", degree: "B.Sc.", durationYears: 4 },
      { departmentId: maths.id, name: "B.Sc. Mathematics", code: "MTH", degree: "B.Sc.", durationYears: 4 },
      { departmentId: english.id, name: "B.A. English", code: "ENG", degree: "B.A.", durationYears: 4 },
    ]).returning();
    const csProgram = insertedPrograms[0];
    const mathsProgram = insertedPrograms[2];

    for (const dept of insertedDepartments) {
      await tx.insert(academicLevels).values(
        [100, 200, 300, 400, 500].map((level) => ({
          departmentId: dept.id, level, name: `${level} Level`,
        })),
      );
    }

    const [session] = await tx.insert(academicSessions).values([
      { name: "2025/2026", isCurrent: true },
      { name: "2024/2025", isCurrent: false },
    ]).returning();
    const previousSession = (await tx.select().from(academicSessions).where(eq(academicSessions.name, "2024/2025")))[0];
    const insertedSemesters = await tx.insert(semesters).values([
      { sessionId: session.id, name: "First Semester", number: 1, isCurrent: true },
      { sessionId: session.id, name: "Second Semester", number: 2, isCurrent: false },
      { sessionId: previousSession.id, name: "First Semester", number: 1, isCurrent: false },
    ]).returning();
    const first = insertedSemesters[0];
    const second = insertedSemesters[1];

    const superAdmin = await createUser({
      email: "super@uemp.edu", fullName: "Prof. Ngozi Eze", role: "super_admin",
      password: pw.admin, phone: "+234 800 000 0001",
    });
    const csAdmin = await createUser({
      email: "cs.admin@uemp.edu", fullName: "Mrs. Funke Adeyemi", role: "dept_admin",
      password: pw.admin, departmentId: cs.id, phone: "+234 800 000 0002",
    });
    const mathsAdmin = await createUser({
      email: "math.admin@uemp.edu", fullName: "Dr. Halima Sani", role: "dept_admin",
      password: pw.admin, departmentId: maths.id,
    });

    const lecturer1User = await createUser({
      email: "okafor@uemp.edu", fullName: "Dr. Chinedu Okafor", role: "lecturer",
      password: pw.lecturer, departmentId: cs.id,
    });
    const lecturer2User = await createUser({
      email: "bello@uemp.edu", fullName: "Dr. Aisha Bello", role: "lecturer",
      password: pw.lecturer, departmentId: cs.id,
    });
    const mathsLecturerUser = await createUser({
      email: "aliyu@uemp.edu", fullName: "Dr. Musa Aliyu", role: "lecturer",
      password: pw.lecturer, departmentId: maths.id,
    });
    const [lec1, lec2, lecMath] = await tx.insert(lecturers).values([
      { userId: lecturer1User.id, staffNumber: "STAFF/CSC/001", departmentId: cs.id, designation: "Senior Lecturer", qualification: "PhD Computer Science" },
      { userId: lecturer2User.id, staffNumber: "STAFF/CSC/002", departmentId: cs.id, designation: "Lecturer I", qualification: "MSc Software Engineering" },
      { userId: mathsLecturerUser.id, staffNumber: "STAFF/MTH/001", departmentId: maths.id, designation: "Lecturer II", qualification: "PhD Mathematics" },
    ]).returning();

    const studentDefs = [
      { email: "amina@uemp.edu", name: "Amina Ibrahim", matric: "2023/CSC/001", dept: cs.id, program: csProgram.id, gender: "Female" },
      { email: "tolu@uemp.edu", name: "Tolu Adewale", matric: "2023/CSC/002", dept: cs.id, program: csProgram.id, gender: "Male" },
      { email: "zara@uemp.edu", name: "Zara Mohammed", matric: "2023/CSC/003", dept: cs.id, program: csProgram.id, gender: "Female" },
      { email: "musa@uemp.edu", name: "Musa Danjuma", matric: "2023/MTH/001", dept: maths.id, program: mathsProgram.id, gender: "Male" },
      { email: "suspended@uemp.edu", name: "Demo Suspended Student", matric: "2023/CSC/004", dept: cs.id, program: csProgram.id, gender: "Male", suspended: true },
    ];
    const studentRows = [];
    for (const definition of studentDefs) {
      const user = await createUser({
        email: definition.email, fullName: definition.name, role: "student", password: pw.student,
        departmentId: definition.dept, status: definition.suspended ? "suspended" : "active",
      });
      const [student] = await tx.insert(students).values({
        userId: user.id, matricNumber: definition.matric, departmentId: definition.dept,
        programId: definition.program, level: 200, admissionYear: 2023,
        gender: definition.gender, address: "University Campus, Abuja", guardianPhone: "+234 803 000 0000",
      }).returning();
      studentRows.push(student);
    }
    const [amina, tolu, zara, musa] = studentRows;

    const courseDefs = [
      { code: "CSC201", title: "Data Structures & Algorithms", units: 3, level: 200, programId: csProgram.id, sem: first.id, lecturer: lec1.id },
      { code: "CSC203", title: "Object-Oriented Programming", units: 3, level: 200, programId: csProgram.id, sem: first.id, lecturer: lec1.id },
      { code: "CSC205", title: "Database Systems I", units: 2, level: 200, programId: csProgram.id, sem: first.id, lecturer: lec2.id },
      { code: "MTH201", title: "Discrete Mathematics", units: 3, level: 200, programId: null, sem: first.id, lecturer: lec2.id },
      { code: "GST201", title: "Entrepreneurship Studies", units: 2, programId: null, level: 200, sem: first.id, lecturer: lec1.id },
      { code: "CSC202", title: "Operating Systems I", units: 3, level: 200, programId: csProgram.id, sem: second.id, lecturer: lec1.id },
      { code: "CSC204", title: "Web Technologies", units: 2, level: 200, programId: csProgram.id, sem: second.id, lecturer: lec2.id },
      { code: "MTH211", title: "Linear Algebra II", units: 3, level: 200, programId: mathsProgram.id, sem: first.id, lecturer: lecMath.id },
    ];
    const courseRows = [];
    for (const course of courseDefs) {
      const departmentId = course.code === "MTH211" ? maths.id : cs.id;
      const [row] = await tx.insert(courses).values({
        code: course.code, title: course.title, units: course.units, level: course.level,
        departmentId, programId: course.programId, semesterId: course.sem, sessionId: session.id,
      }).returning();
      courseRows.push(row);
      await tx.insert(courseAllocations).values({ courseId: row.id, lecturerId: course.lecturer, sessionId: session.id });
    }
    const [csc201, csc203, csc205, mth201, gst201] = courseRows;

    const registrationDefs = [
      [amina, [csc201, csc203, mth201, gst201]],
      [tolu, [csc201, csc203, csc205, mth201]],
      [zara, [csc201, csc203, csc205]],
      [musa, [courseRows[7]]],
    ] as const;
    const registrationRows: RegistrationRow[] = [];
    for (const [student, studentCourses] of registrationDefs) {
      for (const course of studentCourses) {
        const [registration] = await tx.insert(registrations).values({
          studentId: student.id, courseId: course.id, sessionId: session.id, semesterId: course.semesterId,
        }).returning();
        registrationRows.push(registration);
      }
    }
    const regIdFor = (studentId: number, courseId: number) =>
      registrationRows.find((r) => r.studentId === studentId && r.courseId === courseId)!.id;

    const gradeValues = [
      { grade: "A", minScore: 70, maxScore: 100, gradePoint: 5, remark: "Excellent" },
      { grade: "B", minScore: 60, maxScore: 69, gradePoint: 4, remark: "Very Good" },
      { grade: "C", minScore: 50, maxScore: 59, gradePoint: 3, remark: "Good" },
      { grade: "D", minScore: 45, maxScore: 49, gradePoint: 2, remark: "Credit" },
      { grade: "E", minScore: 40, maxScore: 44, gradePoint: 1, remark: "Pass" },
      { grade: "F", minScore: 0, maxScore: 39, gradePoint: 0, remark: "Fail" },
    ];
    await tx.insert(gradingScale).values(gradeValues);

    // CSC201: already approved; students can see these results immediately.
    const [approvedSubmission] = await tx.insert(resultSubmissions).values({
      courseId: csc201.id, lecturerId: lec1.id, departmentId: cs.id, sessionId: session.id,
      semesterId: first.id, status: "approved", feedback: "Verified and approved for publication.",
      submittedAt: new Date(Date.now() - 4 * 86400000), reviewedAt: new Date(Date.now() - 2 * 86400000),
      reviewedBy: csAdmin.id,
    }).returning();
    await tx.insert(results).values([
      { registrationId: regIdFor(amina.id, csc201.id), courseId: csc201.id, studentId: amina.id, caScore: 26, examScore: 62, totalScore: 88, grade: "A", gradePoint: 5, status: "approved", enteredBy: lecturer1User.id, approvedBy: csAdmin.id, submittedAt: new Date(Date.now() - 4 * 86400000), approvedAt: new Date(Date.now() - 2 * 86400000) },
      { registrationId: regIdFor(tolu.id, csc201.id), courseId: csc201.id, studentId: tolu.id, caScore: 22, examScore: 49, totalScore: 71, grade: "A", gradePoint: 5, status: "approved", enteredBy: lecturer1User.id, approvedBy: csAdmin.id, submittedAt: new Date(Date.now() - 4 * 86400000), approvedAt: new Date(Date.now() - 2 * 86400000) },
      { registrationId: regIdFor(zara.id, csc201.id), courseId: csc201.id, studentId: zara.id, caScore: 20, examScore: 37, totalScore: 57, grade: "C", gradePoint: 3, status: "approved", enteredBy: lecturer1User.id, approvedBy: csAdmin.id, submittedAt: new Date(Date.now() - 4 * 86400000), approvedAt: new Date(Date.now() - 2 * 86400000) },
    ]);

    // CSC203: complete and submitted, waiting for departmental review.
    const [pendingSubmission] = await tx.insert(resultSubmissions).values({
      courseId: csc203.id, lecturerId: lec1.id, departmentId: cs.id, sessionId: session.id,
      semesterId: first.id, status: "submitted", submittedAt: new Date(Date.now() - 86400000),
    }).returning();
    await tx.insert(results).values([
      { registrationId: regIdFor(amina.id, csc203.id), courseId: csc203.id, studentId: amina.id, caScore: 25, examScore: 55, totalScore: 80, grade: "A", gradePoint: 5, status: "submitted", enteredBy: lecturer1User.id, submittedAt: new Date(Date.now() - 86400000) },
      { registrationId: regIdFor(tolu.id, csc203.id), courseId: csc203.id, studentId: tolu.id, caScore: 21, examScore: 44, totalScore: 65, grade: "B", gradePoint: 4, status: "submitted", enteredBy: lecturer1User.id, submittedAt: new Date(Date.now() - 86400000) },
      { registrationId: regIdFor(zara.id, csc203.id), courseId: csc203.id, studentId: zara.id, caScore: 18, examScore: 28, totalScore: 46, grade: "D", gradePoint: 2, status: "submitted", enteredBy: lecturer1User.id, submittedAt: new Date(Date.now() - 86400000) },
    ]);

    // CSC205: draft scores, ready for the lecturer to complete and submit.
    const [draftSubmission] = await tx.insert(resultSubmissions).values({
      courseId: csc205.id, lecturerId: lec2.id, departmentId: cs.id, sessionId: session.id,
      semesterId: first.id, status: "draft",
    }).returning();
    await tx.insert(results).values([
      { registrationId: regIdFor(tolu.id, csc205.id), courseId: csc205.id, studentId: tolu.id, caScore: 24, examScore: 51, totalScore: 75, grade: "A", gradePoint: 5, status: "draft", enteredBy: lecturer2User.id },
      { registrationId: regIdFor(zara.id, csc205.id), courseId: csc205.id, studentId: zara.id, caScore: 19, examScore: 42, totalScore: 61, grade: "B", gradePoint: 4, status: "draft", enteredBy: lecturer2User.id },
    ]);

    // MTH201: returned with feedback, demonstrating the correction workflow.
    const [returnedSubmission] = await tx.insert(resultSubmissions).values({
      courseId: mth201.id, lecturerId: lec2.id, departmentId: cs.id, sessionId: session.id,
      semesterId: first.id, status: "returned", feedback: "Please recheck the CA score for Tolu Adewale and resubmit.",
      submittedAt: new Date(Date.now() - 3 * 86400000), reviewedAt: new Date(Date.now() - 2 * 86400000),
      reviewedBy: csAdmin.id,
    }).returning();
    await tx.insert(results).values([
      { registrationId: regIdFor(amina.id, mth201.id), courseId: mth201.id, studentId: amina.id, caScore: 23, examScore: 47, totalScore: 70, grade: "A", gradePoint: 5, status: "returned", enteredBy: lecturer2User.id },
      { registrationId: regIdFor(tolu.id, mth201.id), courseId: mth201.id, studentId: tolu.id, caScore: 21, examScore: 40, totalScore: 61, grade: "B", gradePoint: 4, status: "returned", enteredBy: lecturer2User.id },
    ]);

    const allRoles: Role[] = ["student", "lecturer", "dept_admin", "super_admin"];
    await tx.insert(rolePermissions).values(
      allRoles.flatMap((role) => PERMISSION_CATALOG.map((item) => ({
        role,
        permission: item.key,
        enabled: (item.roles as readonly string[]).includes(role),
        description: item.label,
      }))),
    );

    await tx.insert(auditLogs).values([
      { userId: lecturer1User.id, actorName: lecturer1User.fullName, action: "RESULT_SUBMITTED", entity: "result_submission", entityId: String(approvedSubmission.id), departmentId: cs.id, details: { course: "CSC201", students: 3 } },
      { userId: csAdmin.id, actorName: csAdmin.fullName, action: "RESULT_APPROVED", entity: "result_submission", entityId: String(approvedSubmission.id), departmentId: cs.id, details: { course: "CSC201", students: 3 } },
      { userId: lecturer1User.id, actorName: lecturer1User.fullName, action: "RESULT_SUBMITTED", entity: "result_submission", entityId: String(pendingSubmission.id), departmentId: cs.id, details: { course: "CSC203", students: 3 } },
      { userId: lecturer2User.id, actorName: lecturer2User.fullName, action: "RESULT_DRAFT_SAVED", entity: "result_submission", entityId: String(draftSubmission.id), departmentId: cs.id, details: { course: "CSC205", students: 2 } },
      { userId: csAdmin.id, actorName: csAdmin.fullName, action: "RESULT_RETURNED", entity: "result_submission", entityId: String(returnedSubmission.id), departmentId: cs.id, details: { course: "MTH201", feedback: "Please recheck the CA score for Tolu Adewale and resubmit." } },
      { userId: superAdmin.id, actorName: superAdmin.fullName, action: "SYSTEM_SEEDED", entity: "system", entityId: "uemp", details: { session: "2025/2026", note: "Initial demonstration data created" } },
    ]);
  });
}

let seedPromise: Promise<void> | null = null;

/** Safe to call from the health check, login route and landing page. */
export function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const marker = await db.select().from(appMeta).where(eq(appMeta.key, SEED_KEY)).limit(1);
      if (marker[0]?.value === "complete") return;
      const claimed = await db.insert(appMeta).values({ key: SEED_KEY, value: "running" })
        .onConflictDoNothing().returning({ key: appMeta.key });
      if (claimed.length === 0) return;
      try {
        await runSeed();
        await db.update(appMeta).set({ value: "complete" }).where(eq(appMeta.key, SEED_KEY));
      } catch (error) {
        await db.delete(appMeta).where(eq(appMeta.key, SEED_KEY));
        throw error;
      }
    })().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  return seedPromise;
}
