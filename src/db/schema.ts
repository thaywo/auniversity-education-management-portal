import {
  boolean,
  index,
  int,
  json,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export type Role = "student" | "lecturer" | "dept_admin" | "super_admin";
export type UserStatus = "active" | "inactive" | "suspended";
export type ResultStatus = "draft" | "submitted" | "approved" | "returned";
export type SubmissionStatus = "draft" | "submitted" | "approved" | "returned";

/** Internal bootstrap marker (also lets us make seeding idempotent). */
export const appMeta = mysqlTable("app_meta", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const faculties = mysqlTable("faculties", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull().unique(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  facultyId: int("faculty_id").notNull().references(() => faculties.id),
  name: varchar("name", { length: 180 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const programs = mysqlTable("programs", {
  id: int("id").autoincrement().primaryKey(),
  departmentId: int("department_id").notNull().references(() => departments.id),
  name: varchar("name", { length: 180 }).notNull(),
  code: varchar("code", { length: 30 }).notNull(),
  degree: varchar("degree", { length: 60 }).default("B.Sc").notNull(),
  durationYears: int("duration_years").default(4).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
}, (t) => [uniqueIndex("programs_dept_code_unique").on(t.departmentId, t.code)]);

export const academicLevels = mysqlTable("academic_levels", {
  id: int("id").autoincrement().primaryKey(),
  departmentId: int("department_id").notNull().references(() => departments.id),
  level: int("level").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
}, (t) => [uniqueIndex("academic_levels_dept_level_unique").on(t.departmentId, t.level)]);

export const academicSessions = mysqlTable("academic_sessions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 30 }).notNull().unique(),
  isCurrent: boolean("is_current").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const semesters = mysqlTable("semesters", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("session_id").notNull().references(() => academicSessions.id),
  name: varchar("name", { length: 40 }).notNull(),
  number: int("number").notNull(),
  isCurrent: boolean("is_current").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
}, (t) => [uniqueIndex("semesters_session_number_unique").on(t.sessionId, t.number)]);

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 190 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: varchar("full_name", { length: 180 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  role: varchar("role", { length: 30 }).$type<Role>().notNull(),
  status: varchar("status", { length: 20 }).$type<UserStatus>().default("active").notNull(),
  departmentId: int("department_id").references(() => departments.id),
  lastLoginAt: timestamp("last_login_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (t) => [index("users_role_idx").on(t.role), index("users_department_idx").on(t.departmentId)]);

export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

export const students = mysqlTable("students", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  matricNumber: varchar("matric_number", { length: 60 }).notNull().unique(),
  departmentId: int("department_id").notNull().references(() => departments.id),
  programId: int("program_id").notNull().references(() => programs.id),
  level: int("level").notNull(),
  admissionYear: int("admission_year").notNull(),
  gender: varchar("gender", { length: 20 }),
  address: text("address"),
  guardianPhone: varchar("guardian_phone", { length: 40 }),
}, (t) => [index("students_department_idx").on(t.departmentId)]);

export const lecturers = mysqlTable("lecturers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  staffNumber: varchar("staff_number", { length: 60 }).notNull().unique(),
  departmentId: int("department_id").notNull().references(() => departments.id),
  designation: varchar("designation", { length: 100 }).default("Lecturer").notNull(),
  qualification: varchar("qualification", { length: 120 }),
}, (t) => [index("lecturers_department_idx").on(t.departmentId)]);

export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 30 }).notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  units: int("units").notNull(),
  level: int("level").notNull(),
  departmentId: int("department_id").notNull().references(() => departments.id),
  programId: int("program_id").references(() => programs.id),
  semesterId: int("semester_id").notNull().references(() => semesters.id),
  sessionId: int("session_id").notNull().references(() => academicSessions.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("courses_code_dept_term_unique").on(t.code, t.departmentId, t.sessionId, t.semesterId),
  index("courses_department_idx").on(t.departmentId),
]);

export const courseAllocations = mysqlTable("course_allocations", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  lecturerId: int("lecturer_id").notNull().references(() => lecturers.id),
  sessionId: int("session_id").notNull().references(() => academicSessions.id),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (t) => [uniqueIndex("course_allocation_unique").on(t.courseId, t.sessionId)]);

export const registrations = mysqlTable("registrations", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  courseId: int("course_id").notNull().references(() => courses.id),
  sessionId: int("session_id").notNull().references(() => academicSessions.id),
  semesterId: int("semester_id").notNull().references(() => semesters.id),
  status: varchar("status", { length: 20 }).default("registered").notNull(),
  registeredAt: timestamp("registered_at", { mode: "date" }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("registration_unique").on(t.studentId, t.courseId, t.sessionId, t.semesterId),
  index("registration_student_idx").on(t.studentId),
  index("registration_course_idx").on(t.courseId),
]);

/** One course-level submission per lecturer / course / session. */
export const resultSubmissions = mysqlTable("result_submissions", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  lecturerId: int("lecturer_id").notNull().references(() => lecturers.id),
  departmentId: int("department_id").notNull().references(() => departments.id),
  sessionId: int("session_id").notNull().references(() => academicSessions.id),
  semesterId: int("semester_id").notNull().references(() => semesters.id),
  status: varchar("status", { length: 20 }).$type<SubmissionStatus>().default("draft").notNull(),
  feedback: text("feedback"),
  submittedAt: timestamp("submitted_at", { mode: "date" }),
  reviewedAt: timestamp("reviewed_at", { mode: "date" }),
  reviewedBy: int("reviewed_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("result_submission_unique").on(t.courseId, t.lecturerId, t.sessionId),
  index("result_submission_dept_status_idx").on(t.departmentId, t.status),
]);

export const results = mysqlTable("results", {
  id: int("id").autoincrement().primaryKey(),
  registrationId: int("registration_id").notNull().unique().references(() => registrations.id, { onDelete: "cascade" }),
  courseId: int("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  studentId: int("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  caScore: int("ca_score"),
  examScore: int("exam_score"),
  totalScore: int("total_score"),
  grade: varchar("grade", { length: 5 }),
  gradePoint: int("grade_point"),
  status: varchar("status", { length: 20 }).$type<ResultStatus>().default("draft").notNull(),
  enteredBy: int("entered_by").references(() => users.id),
  approvedBy: int("approved_by").references(() => users.id),
  submittedAt: timestamp("submitted_at", { mode: "date" }),
  approvedAt: timestamp("approved_at", { mode: "date" }),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (t) => [index("results_student_status_idx").on(t.studentId, t.status), index("results_course_idx").on(t.courseId)]);

/** Configurable, inclusive grading bands: minScore <= total <= maxScore. */
export const gradingScale = mysqlTable("grading_scale", {
  id: int("id").autoincrement().primaryKey(),
  grade: varchar("grade", { length: 5 }).notNull().unique(),
  minScore: int("min_score").notNull(),
  maxScore: int("max_score").notNull(),
  gradePoint: int("grade_point").notNull(),
  remark: varchar("remark", { length: 80 }),
});

export const rolePermissions = mysqlTable("role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  role: varchar("role", { length: 30 }).$type<Role>().notNull(),
  permission: varchar("permission", { length: 80 }).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  description: text("description"),
}, (t) => [uniqueIndex("role_permission_unique").on(t.role, t.permission)]);

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id),
  actorName: varchar("actor_name", { length: 180 }),
  action: varchar("action", { length: 80 }).notNull(),
  entity: varchar("entity", { length: 60 }).notNull(),
  entityId: varchar("entity_id", { length: 60 }),
  departmentId: int("department_id").references(() => departments.id),
  details: json("details").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (t) => [index("audit_created_idx").on(t.createdAt), index("audit_entity_idx").on(t.entity, t.entityId)]);
