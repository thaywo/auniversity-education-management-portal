import { and, asc, desc, eq, inArray, isNull, notInArray, or } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  academicSessions, auditLogs, courseAllocations, courses, departments, faculties,
  lecturers, programs, registrations, results, resultSubmissions, semesters, students, users,
} from "@/db/schema";
import { calculateGpa } from "@/lib/grades";

export async function getCurrentTerm() {
  let sessionRows = await db.select().from(academicSessions)
    .where(eq(academicSessions.isCurrent, true)).limit(1);
  if (!sessionRows.length) {
    sessionRows = await db.select().from(academicSessions).orderBy(desc(academicSessions.id)).limit(1);
  }
  const session = sessionRows[0];
  if (!session) throw new Error("No academic session is configured. Ask the Super Admin to create one.");
  let semesterRows = await db.select().from(semesters)
    .where(and(eq(semesters.sessionId, session.id), eq(semesters.isCurrent, true))).limit(1);
  if (!semesterRows.length) {
    semesterRows = await db.select().from(semesters)
      .where(eq(semesters.sessionId, session.id)).orderBy(asc(semesters.number)).limit(1);
  }
  const semester = semesterRows[0];
  if (!semester) throw new Error("No semester is configured for the current session.");
  return { session, semester };
}

export async function getStudentContext(userId: number) {
  const rows = await db.select({
    studentId: students.id, userId: users.id, fullName: users.fullName, email: users.email,
    phone: users.phone, matricNumber: students.matricNumber, departmentId: students.departmentId,
    department: departments.name, departmentCode: departments.code, faculty: faculties.name,
    programId: students.programId, program: programs.name, degree: programs.degree,
    level: students.level, admissionYear: students.admissionYear, gender: students.gender,
    address: students.address, guardianPhone: students.guardianPhone, status: users.status,
  }).from(students)
    .innerJoin(users, eq(students.userId, users.id))
    .innerJoin(departments, eq(students.departmentId, departments.id))
    .innerJoin(faculties, eq(departments.facultyId, faculties.id))
    .innerJoin(programs, eq(students.programId, programs.id))
    .where(eq(students.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function getLecturerContext(userId: number) {
  const rows = await db.select({
    lecturerId: lecturers.id, userId: users.id, fullName: users.fullName, email: users.email,
    phone: users.phone, staffNumber: lecturers.staffNumber, departmentId: lecturers.departmentId,
    department: departments.name, designation: lecturers.designation,
    qualification: lecturers.qualification, status: users.status,
  }).from(lecturers)
    .innerJoin(users, eq(lecturers.userId, users.id))
    .innerJoin(departments, eq(lecturers.departmentId, departments.id))
    .where(eq(lecturers.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export type CourseView = {
  id: number; code: string; title: string; units: number; level: number;
  semester: string; session: string; program: string | null; department: string;
  lecturer: string | null; isActive: boolean; registrationId?: number;
  status?: string | null; resultId?: number | null; caScore?: number | null;
  examScore?: number | null; totalScore?: number | null; grade?: string | null;
};

export async function getRegisteredCourses(studentId: number, sessionId: number, semesterId: number) {
  return db.select({
    id: courses.id, code: courses.code, title: courses.title, units: courses.units,
    level: courses.level, semester: semesters.name, session: academicSessions.name,
    program: programs.name, department: departments.name, lecturer: users.fullName,
    isActive: courses.isActive, registrationId: registrations.id,
    status: results.status, resultId: results.id, caScore: results.caScore,
    examScore: results.examScore, totalScore: results.totalScore, grade: results.grade,
  }).from(registrations)
    .innerJoin(courses, eq(registrations.courseId, courses.id))
    .innerJoin(semesters, eq(registrations.semesterId, semesters.id))
    .innerJoin(academicSessions, eq(registrations.sessionId, academicSessions.id))
    .innerJoin(departments, eq(courses.departmentId, departments.id))
    .leftJoin(programs, eq(courses.programId, programs.id))
    .leftJoin(courseAllocations, and(eq(courseAllocations.courseId, courses.id), eq(courseAllocations.sessionId, academicSessions.id)))
    .leftJoin(lecturers, eq(courseAllocations.lecturerId, lecturers.id))
    .leftJoin(users, eq(lecturers.userId, users.id))
    .leftJoin(results, eq(results.registrationId, registrations.id))
    .where(and(eq(registrations.studentId, studentId), eq(registrations.sessionId, sessionId), eq(registrations.semesterId, semesterId)))
    .orderBy(asc(courses.code));
}

export async function getAvailableCourses(student: {
  studentId: number; departmentId: number; programId: number; level: number;
}, sessionId: number, semesterId: number) {
  const registered = await db.select({ courseId: registrations.courseId }).from(registrations)
    .where(and(
      eq(registrations.studentId, student.studentId),
      eq(registrations.sessionId, sessionId),
      eq(registrations.semesterId, semesterId),
    ));
  const registeredIds = registered.map((r) => r.courseId);
  const conditions = [
    eq(courses.departmentId, student.departmentId),
    eq(courses.level, student.level),
    eq(courses.semesterId, semesterId),
    eq(courses.sessionId, sessionId),
    eq(courses.isActive, true),
    or(isNull(courses.programId), eq(courses.programId, student.programId)),
  ];
  if (registeredIds.length) conditions.push(notInArray(courses.id, registeredIds));
  return db.select({
    id: courses.id, code: courses.code, title: courses.title, units: courses.units,
    level: courses.level, semester: semesters.name, session: academicSessions.name,
    program: programs.name, department: departments.name, lecturer: users.fullName,
    isActive: courses.isActive,
  }).from(courses)
    .innerJoin(semesters, eq(courses.semesterId, semesters.id))
    .innerJoin(academicSessions, eq(courses.sessionId, academicSessions.id))
    .innerJoin(departments, eq(courses.departmentId, departments.id))
    .leftJoin(programs, eq(courses.programId, programs.id))
    .leftJoin(courseAllocations, and(eq(courseAllocations.courseId, courses.id), eq(courseAllocations.sessionId, academicSessions.id)))
    .leftJoin(lecturers, eq(courseAllocations.lecturerId, lecturers.id))
    .leftJoin(users, eq(lecturers.userId, users.id))
    .where(and(...conditions))
    .orderBy(asc(courses.code));
}

export type ApprovedResult = {
  resultId: number; code: string; title: string; units: number; level: number;
  caScore: number | null; examScore: number | null; totalScore: number | null;
  grade: string | null; gradePoint: number | null;
  session: string; semester: string; sessionId: number; semesterId: number;
};

export async function getApprovedResults(studentId: number): Promise<ApprovedResult[]> {
  return db.select({
    resultId: results.id, code: courses.code, title: courses.title, units: courses.units,
    level: courses.level, caScore: results.caScore, examScore: results.examScore,
    totalScore: results.totalScore, grade: results.grade, gradePoint: results.gradePoint,
    session: academicSessions.name, semester: semesters.name,
    sessionId: academicSessions.id, semesterId: semesters.id,
  }).from(results)
    .innerJoin(courses, eq(results.courseId, courses.id))
    .innerJoin(academicSessions, eq(courses.sessionId, academicSessions.id))
    .innerJoin(semesters, eq(courses.semesterId, semesters.id))
    .where(and(eq(results.studentId, studentId), eq(results.status, "approved")))
    .orderBy(desc(academicSessions.name), asc(semesters.number), asc(courses.code));
}

export function groupResultsByTerm(rows: ApprovedResult[]) {
  const map = new Map<string, { key: string; session: string; semester: string; rows: ApprovedResult[]; gpa: number; units: number; points: number }>();
  for (const row of rows) {
    const key = `${row.sessionId}-${row.semesterId}`;
    if (!map.has(key)) map.set(key, { key, session: row.session, semester: row.semester, rows: [], gpa: 0, units: 0, points: 0 });
    map.get(key)!.rows.push(row);
  }
  const terms = [...map.values()];
  for (const term of terms) {
    const calc = calculateGpa(term.rows);
    term.gpa = calc.gpa; term.units = calc.units; term.points = calc.points;
  }
  return terms;
}

export type LecturerCourse = {
  id: number; code: string; title: string; units: number; level: number;
  semester_name: string; department_name: string; session_id: number;
  submission_id: number | null; submission_status: string; feedback: string | null;
  submitted_at: Date | null; reviewed_at: Date | null; student_count: number;
  approved_count: number; pass_count: number; average_score: number | null;
};

export async function getLecturerCourses(lecturerId: number, sessionId: number): Promise<LecturerCourse[]> {
  const query = await db.execute(sql`
    SELECT c.id, c.code, c.title, c.units, c.level, s.name AS semester_name,
      d.name AS department_name, c.session_id,
      rs.id AS submission_id, COALESCE(rs.status, 'draft') AS submission_status,
      rs.feedback, rs.submitted_at, rs.reviewed_at,
      COUNT(DISTINCT r.id)::int AS student_count,
      COUNT(DISTINCT CASE WHEN res.status = 'approved' THEN res.id END)::int AS approved_count,
      COUNT(DISTINCT CASE WHEN res.total_score >= 40 THEN res.id END)::int AS pass_count,
      ROUND(AVG(res.total_score))::int AS average_score
    FROM course_allocations ca
    JOIN courses c ON c.id = ca.course_id
    JOIN departments d ON d.id = c.department_id
    JOIN semesters s ON s.id = c.semester_id
    LEFT JOIN registrations r ON r.course_id = c.id AND r.session_id = ca.session_id
    LEFT JOIN results res ON res.registration_id = r.id
    LEFT JOIN result_submissions rs ON rs.course_id = c.id AND rs.lecturer_id = ca.lecturer_id AND rs.session_id = ca.session_id
    WHERE ca.lecturer_id = ${lecturerId} AND ca.session_id = ${sessionId}
    GROUP BY c.id, c.code, c.title, c.units, c.level, s.name, d.name, c.session_id,
      rs.id, rs.status, rs.feedback, rs.submitted_at, rs.reviewed_at
    ORDER BY c.code
  `);
  return query.rows as unknown as LecturerCourse[];
}

export type RosterRow = {
  registrationId: number; studentId: number; matricNumber: string; fullName: string;
  level: number; caScore: number | null; examScore: number | null;
  totalScore: number | null; grade: string | null; gradePoint: number | null;
  resultId: number | null; resultStatus: string | null;
};

export async function getCourseRoster(courseId: number): Promise<RosterRow[]> {
  return db.select({
    registrationId: registrations.id, studentId: students.id,
    matricNumber: students.matricNumber, fullName: users.fullName, level: students.level,
    caScore: results.caScore, examScore: results.examScore, totalScore: results.totalScore,
    grade: results.grade, gradePoint: results.gradePoint, resultId: results.id,
    resultStatus: results.status,
  }).from(registrations)
    .innerJoin(students, eq(registrations.studentId, students.id))
    .innerJoin(users, eq(students.userId, users.id))
    .leftJoin(results, eq(results.registrationId, registrations.id))
    .where(eq(registrations.courseId, courseId))
    .orderBy(asc(students.matricNumber));
}

export type SubmissionView = {
  id: number; courseId: number; code: string; title: string; units: number;
  departmentId: number; department: string; lecturer: string; lecturerId: number;
  session: string; semester: string; status: string; feedback: string | null;
  submittedAt: Date | null; reviewedAt: Date | null; reviewer: string | null;
  studentCount: number;
};

export async function getSubmissions(departmentId?: number): Promise<SubmissionView[]> {
  const base = db.select({
    id: resultSubmissions.id, courseId: resultSubmissions.courseId,
    code: courses.code, title: courses.title, units: courses.units,
    departmentId: resultSubmissions.departmentId, department: departments.name,
    lecturer: users.fullName, lecturerId: resultSubmissions.lecturerId,
    session: academicSessions.name, semester: semesters.name,
    status: resultSubmissions.status, feedback: resultSubmissions.feedback,
    submittedAt: resultSubmissions.submittedAt, reviewedAt: resultSubmissions.reviewedAt,
    reviewer: sql<string | null>`(SELECT u.full_name FROM users u WHERE u.id = ${resultSubmissions.reviewedBy})`,
    studentCount: sql<number>`(SELECT COUNT(*)::int FROM results r WHERE r.course_id = ${resultSubmissions.courseId})`,
  }).from(resultSubmissions)
    .innerJoin(courses, eq(resultSubmissions.courseId, courses.id))
    .innerJoin(departments, eq(resultSubmissions.departmentId, departments.id))
    .innerJoin(lecturers, eq(resultSubmissions.lecturerId, lecturers.id))
    .innerJoin(users, eq(lecturers.userId, users.id))
    .innerJoin(academicSessions, eq(resultSubmissions.sessionId, academicSessions.id))
    .innerJoin(semesters, eq(resultSubmissions.semesterId, semesters.id));
  if (departmentId) {
    return base.where(eq(resultSubmissions.departmentId, departmentId)).orderBy(desc(resultSubmissions.updatedAt));
  }
  return base.orderBy(desc(resultSubmissions.updatedAt));
}

export async function getSubmissionById(id: number) {
  const rows = await getSubmissions();
  return rows.find((row) => row.id === id) ?? null;
}

export type AuditView = {
  id: number; action: string; entity: string; entityId: string | null;
  actorName: string | null; department: string | null; details: Record<string, unknown>;
  createdAt: Date;
};

export async function getAuditTrail(departmentId?: number, limit = 80): Promise<AuditView[]> {
  const base = db.select({
    id: auditLogs.id, action: auditLogs.action, entity: auditLogs.entity,
    entityId: auditLogs.entityId, actorName: auditLogs.actorName,
    department: departments.name, details: auditLogs.details, createdAt: auditLogs.createdAt,
  }).from(auditLogs).leftJoin(departments, eq(auditLogs.departmentId, departments.id));
  const query = departmentId ? base.where(eq(auditLogs.departmentId, departmentId)) : base;
  return query.orderBy(desc(auditLogs.createdAt)).limit(limit);
}

export async function getOverviewCounts() {
  const query = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS users,
      (SELECT COUNT(*)::int FROM students) AS students,
      (SELECT COUNT(*)::int FROM lecturers) AS lecturers,
      (SELECT COUNT(*)::int FROM faculties WHERE is_active) AS faculties,
      (SELECT COUNT(*)::int FROM departments WHERE is_active) AS departments,
      (SELECT COUNT(*)::int FROM programs WHERE is_active) AS programs,
      (SELECT COUNT(*)::int FROM courses WHERE is_active) AS courses,
      (SELECT COUNT(*)::int FROM registrations) AS registrations,
      (SELECT COUNT(*)::int FROM results WHERE status = 'approved') AS approved_results,
      (SELECT COUNT(*)::int FROM result_submissions WHERE status = 'submitted') AS pending_approvals,
      (SELECT COUNT(*)::int FROM result_submissions WHERE status = 'returned') AS returned_results
  `);
  return query.rows[0] as unknown as {
    users: number; students: number; lecturers: number; faculties: number;
    departments: number; programs: number; courses: number; registrations: number;
    approved_results: number; pending_approvals: number; returned_results: number;
  };
}

export async function getDepartmentCounts(departmentId: number) {
  const query = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM students WHERE department_id = ${departmentId}) AS students,
      (SELECT COUNT(*)::int FROM lecturers WHERE department_id = ${departmentId}) AS lecturers,
      (SELECT COUNT(*)::int FROM courses WHERE department_id = ${departmentId} AND is_active) AS courses,
      (SELECT COUNT(*)::int FROM registrations r JOIN courses c ON c.id = r.course_id WHERE c.department_id = ${departmentId}) AS registrations,
      (SELECT COUNT(*)::int FROM result_submissions WHERE department_id = ${departmentId} AND status = 'submitted') AS pending_approvals,
      (SELECT COUNT(*)::int FROM result_submissions WHERE department_id = ${departmentId} AND status = 'approved') AS approved_results
  `);
  return query.rows[0] as unknown as {
    students: number; lecturers: number; courses: number; registrations: number;
    pending_approvals: number; approved_results: number;
  };
}

export async function getCourseById(courseId: number) {
  const rows = await db.select({
    id: courses.id, code: courses.code, title: courses.title, units: courses.units,
    level: courses.level, departmentId: courses.departmentId, department: departments.name,
    programId: courses.programId, semesterId: courses.semesterId, semester: semesters.name,
    sessionId: courses.sessionId, session: academicSessions.name, isActive: courses.isActive,
  }).from(courses)
    .innerJoin(departments, eq(courses.departmentId, departments.id))
    .innerJoin(semesters, eq(courses.semesterId, semesters.id))
    .innerJoin(academicSessions, eq(courses.sessionId, academicSessions.id))
    .where(eq(courses.id, courseId)).limit(1);
  return rows[0] ?? null;
}

export async function getRegistrationsForCourses(courseIds: number[]) {
  if (!courseIds.length) return [];
  return db.select({ courseId: registrations.courseId, studentId: registrations.studentId })
    .from(registrations).where(inArray(registrations.courseId, courseIds));
}
