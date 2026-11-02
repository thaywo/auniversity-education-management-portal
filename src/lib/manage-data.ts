import { and, asc, desc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  academicLevels, academicSessions, courseAllocations, courses, departments, faculties,
  gradingScale, lecturers, programs, registrations, results, semesters, students, users,
} from "@/db/schema";

export async function getFaculties() {
  return db.select().from(faculties).orderBy(asc(faculties.name));
}

export async function getDepartments() {
  return db.select({
    id: departments.id, name: departments.name, code: departments.code,
    faculty: faculties.name, facultyId: departments.facultyId, isActive: departments.isActive,
  }).from(departments).innerJoin(faculties, eq(departments.facultyId, faculties.id)).orderBy(asc(departments.name));
}

export async function getPrograms(departmentId?: number) {
  const base = db.select({
    id: programs.id, name: programs.name, code: programs.code, degree: programs.degree,
    durationYears: programs.durationYears, isActive: programs.isActive,
    departmentId: programs.departmentId, department: departments.name,
  }).from(programs).innerJoin(departments, eq(programs.departmentId, departments.id));
  const query = departmentId ? base.where(eq(programs.departmentId, departmentId)) : base;
  return query.orderBy(asc(departments.name), asc(programs.code));
}

export async function getLevels(departmentId?: number) {
  const base = db.select({
    id: academicLevels.id, level: academicLevels.level, name: academicLevels.name,
    isActive: academicLevels.isActive, departmentId: academicLevels.departmentId,
    department: departments.name,
  }).from(academicLevels).innerJoin(departments, eq(academicLevels.departmentId, departments.id));
  const query = departmentId ? base.where(eq(academicLevels.departmentId, departmentId)) : base;
  return query.orderBy(asc(departments.name), asc(academicLevels.level));
}

export async function getSessions() {
  return db.select().from(academicSessions).orderBy(desc(academicSessions.name));
}

export async function getSemesters() {
  return db.select({
    id: semesters.id, name: semesters.name, number: semesters.number,
    isCurrent: semesters.isCurrent, isActive: semesters.isActive,
    sessionId: semesters.sessionId, session: academicSessions.name,
  }).from(semesters).innerJoin(academicSessions, eq(semesters.sessionId, academicSessions.id))
    .orderBy(desc(academicSessions.name), asc(semesters.number));
}

export async function getCourses(departmentId?: number) {
  const base = db.select({
    id: courses.id, code: courses.code, title: courses.title, units: courses.units,
    level: courses.level, isActive: courses.isActive, departmentId: courses.departmentId,
    department: departments.name, program: programs.name, programId: courses.programId,
    semester: semesters.name, semesterId: courses.semesterId,
    session: academicSessions.name, sessionId: courses.sessionId,
    lecturer: users.fullName, lecturerId: lecturers.id,
  }).from(courses)
    .innerJoin(departments, eq(courses.departmentId, departments.id))
    .innerJoin(semesters, eq(courses.semesterId, semesters.id))
    .innerJoin(academicSessions, eq(courses.sessionId, academicSessions.id))
    .leftJoin(programs, eq(courses.programId, programs.id))
    .leftJoin(courseAllocations, and(eq(courseAllocations.courseId, courses.id), eq(courseAllocations.sessionId, courses.sessionId)))
    .leftJoin(lecturers, eq(courseAllocations.lecturerId, lecturers.id))
    .leftJoin(users, eq(lecturers.userId, users.id));
  const query = departmentId ? base.where(eq(courses.departmentId, departmentId)) : base;
  return query.orderBy(asc(courses.code));
}

export async function getUsers(departmentId?: number) {
  const base = db.select({
    id: users.id, fullName: users.fullName, email: users.email, role: users.role,
    status: users.status, departmentId: users.departmentId, department: departments.name,
    lastLoginAt: users.lastLoginAt, createdAt: users.createdAt,
    matricNumber: students.matricNumber, staffNumber: lecturers.staffNumber,
  }).from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .leftJoin(students, eq(students.userId, users.id))
    .leftJoin(lecturers, eq(lecturers.userId, users.id));
  const query = departmentId ? base.where(eq(users.departmentId, departmentId)) : base;
  return query.orderBy(asc(users.role), asc(users.fullName));
}

export async function getStudents(departmentId?: number) {
  const base = db.select({
    id: students.id, userId: students.userId, fullName: users.fullName, email: users.email,
    matricNumber: students.matricNumber, departmentId: students.departmentId,
    department: departments.name, programId: students.programId, program: programs.name,
    level: students.level, admissionYear: students.admissionYear, status: users.status,
  }).from(students)
    .innerJoin(users, eq(students.userId, users.id))
    .innerJoin(departments, eq(students.departmentId, departments.id))
    .innerJoin(programs, eq(students.programId, programs.id));
  const query = departmentId ? base.where(eq(students.departmentId, departmentId)) : base;
  return query.orderBy(asc(students.matricNumber));
}

export async function getLecturerList(departmentId?: number) {
  const base = db.select({
    id: lecturers.id, userId: lecturers.userId, fullName: users.fullName, email: users.email,
    staffNumber: lecturers.staffNumber, departmentId: lecturers.departmentId,
    department: departments.name, designation: lecturers.designation,
    qualification: lecturers.qualification, status: users.status,
  }).from(lecturers)
    .innerJoin(users, eq(lecturers.userId, users.id))
    .innerJoin(departments, eq(lecturers.departmentId, departments.id));
  const query = departmentId ? base.where(eq(lecturers.departmentId, departmentId)) : base;
  return query.orderBy(asc(lecturers.staffNumber));
}

export async function getAllocations(departmentId?: number) {
  const base = db.select({
    id: courseAllocations.id, courseId: courseAllocations.courseId,
    code: courses.code, title: courses.title, units: courses.units,
    lecturerId: lecturers.id, lecturer: users.fullName, staffNumber: lecturers.staffNumber,
    departmentId: courses.departmentId, department: departments.name,
    session: academicSessions.name, semester: semesters.name,
  }).from(courseAllocations)
    .innerJoin(courses, eq(courseAllocations.courseId, courses.id))
    .innerJoin(lecturers, eq(courseAllocations.lecturerId, lecturers.id))
    .innerJoin(users, eq(lecturers.userId, users.id))
    .innerJoin(departments, eq(courses.departmentId, departments.id))
    .innerJoin(academicSessions, eq(courseAllocations.sessionId, academicSessions.id))
    .innerJoin(semesters, eq(courses.semesterId, semesters.id));
  const query = departmentId ? base.where(eq(courses.departmentId, departmentId)) : base;
  return query.orderBy(asc(departments.name), asc(courses.code));
}

export type RegistrationReportRow = {
  id: number; student: string; matric_number: string; department: string;
  course_code: string; course_title: string; units: number; level: number;
  session: string; semester: string; registered_at: Date;
};

export async function getRegistrationReport(departmentId?: number, limit = 200): Promise<RegistrationReportRow[]> {
  const clause = departmentId ? sql`AND d.id = ${departmentId}` : sql``;
  const query = await db.execute(sql`
    SELECT r.id, u.full_name AS student, s.matric_number, d.name AS department,
      c.code AS course_code, c.title AS course_title, c.units, c.level,
      ses.name AS session, sem.name AS semester, r.registered_at
    FROM registrations r
    JOIN students s ON s.id = r.student_id
    JOIN users u ON u.id = s.user_id
    JOIN courses c ON c.id = r.course_id
    JOIN departments d ON d.id = c.department_id
    JOIN academic_sessions ses ON ses.id = r.session_id
    JOIN semesters sem ON sem.id = r.semester_id
    WHERE 1 = 1 ${clause}
    ORDER BY ses.name DESC, sem.number, c.code, s.matric_number
    LIMIT ${limit}
  `);
  return query.rows as unknown as RegistrationReportRow[];
}

export type PerformanceReportRow = {
  department: string; course_code: string; course_title: string; units: number;
  session: string; semester: string; approved: number; average: number;
  passes: number; fails: number; pass_rate: number;
};

export async function getPerformanceReport(departmentId?: number): Promise<PerformanceReportRow[]> {
  const clause = departmentId ? sql`AND d.id = ${departmentId}` : sql``;
  const query = await db.execute(sql`
    SELECT d.name AS department, c.code AS course_code, c.title AS course_title, c.units,
      ses.name AS session, sem.name AS semester,
      COUNT(res.id)::int AS approved,
      COALESCE(AVG(res.total_score)::int, 0) AS average,
      COUNT(CASE WHEN res.total_score >= 40 THEN 1 END)::int AS passes,
      COUNT(CASE WHEN res.total_score < 40 THEN 1 END)::int AS fails,
      COALESCE((100.0 * COUNT(CASE WHEN res.total_score >= 40 THEN 1 END) / NULLIF(COUNT(res.id), 0))::int, 0) AS pass_rate
    FROM results res
    JOIN courses c ON c.id = res.course_id
    JOIN departments d ON d.id = c.department_id
    JOIN academic_sessions ses ON ses.id = c.session_id
    JOIN semesters sem ON sem.id = c.semester_id
    WHERE res.status = 'approved' ${clause}
    GROUP BY d.name, c.code, c.title, c.units, ses.name, sem.name
    ORDER BY d.name, ses.name DESC, sem.name, c.code
  `);
  return query.rows as unknown as PerformanceReportRow[];
}

export async function getDepartmentBreakdown() {
  const query = await db.execute(sql`
    SELECT d.name AS department, f.name AS faculty,
      (SELECT COUNT(*)::int FROM students s WHERE s.department_id = d.id) AS students,
      (SELECT COUNT(*)::int FROM lecturers l WHERE l.department_id = d.id) AS lecturers,
      (SELECT COUNT(*)::int FROM courses c WHERE c.department_id = d.id) AS courses,
      (SELECT COUNT(*)::int FROM registrations r JOIN courses c ON c.id = r.course_id WHERE c.department_id = d.id) AS registrations,
      (SELECT COUNT(*)::int FROM result_submissions rs WHERE rs.department_id = d.id AND rs.status = 'submitted') AS pending
    FROM departments d JOIN faculties f ON f.id = d.faculty_id
    ORDER BY d.name
  `);
  return query.rows as unknown as {
    department: string; faculty: string; students: number; lecturers: number;
    courses: number; registrations: number; pending: number;
  }[];
}

export async function getGradeBands() {
  return db.select().from(gradingScale).orderBy(desc(gradingScale.minScore));
}

export async function getCourseRegistrationCounts(departmentId?: number) {
  const clause = departmentId ? sql`AND c.department_id = ${departmentId}` : sql``;
  const query = await db.execute(sql`
    SELECT c.code AS course_code, c.title AS course_title, c.units,
      COUNT(r.id)::int AS registrations, d.name AS department
    FROM courses c
    LEFT JOIN registrations r ON r.course_id = c.id
    JOIN departments d ON d.id = c.department_id
    WHERE 1 = 1 ${clause}
    GROUP BY c.code, c.title, c.units, d.name
    ORDER BY registrations DESC, c.code
  `);
  return query.rows as unknown as {
    course_code: string; course_title: string; units: number; registrations: number; department: string;
  }[];
}
