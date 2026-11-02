import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { courseAllocations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentTerm, getLecturerContext, getStudentContext } from "@/lib/data";

export const dynamic = "force-dynamic";

type CsvRow = Record<string, unknown>;

function toCsv(rows: CsvRow[]) {
  if (!rows.length) return "No records found\n";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((key) => escape(row[key])).join(",")),
  ].join("\r\n");
}

function csvResponse(rows: CsvRow[], filename: string) {
  return new Response(`\uFEFF${toCsv(rows)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, message: "Authentication required." }, { status: 401 });
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "";
  const requestedDept = Number(url.searchParams.get("departmentId")) || null;
  const scopedDept = user.role === "dept_admin" ? user.departmentId : user.role === "super_admin" ? requestedDept : null;
  const deptClause = scopedDept ? sql`AND c.department_id = ${scopedDept}` : sql``;
  const studentDeptClause = scopedDept ? sql`AND s.department_id = ${scopedDept}` : sql``;

  try {
    if (type === "registration" && user.role === "student") {
      const student = await getStudentContext(user.id);
      if (!student) return Response.json({ ok: false, message: "Student record not found." }, { status: 404 });
      const term = await getCurrentTerm();
      const result = await db.execute(sql`
        SELECT r.registered_at AS "Date", c.code AS "Course Code", c.title AS "Course Title",
          c.units AS "Units", c.level AS "Level", sem.name AS "Semester", ses.name AS "Session",
          COALESCE(u.full_name, 'Unallocated') AS "Lecturer"
        FROM registrations r
        JOIN courses c ON c.id = r.course_id
        JOIN semesters sem ON sem.id = r.semester_id
        JOIN academic_sessions ses ON ses.id = r.session_id
        LEFT JOIN course_allocations ca ON ca.course_id = c.id AND ca.session_id = r.session_id
        LEFT JOIN lecturers l ON l.id = ca.lecturer_id
        LEFT JOIN users u ON u.id = l.user_id
        WHERE r.student_id = ${student.studentId} AND r.session_id = ${term.session.id} AND r.semester_id = ${term.semester.id}
        ORDER BY c.code
      `);
      return csvResponse(result.rows as CsvRow[], `UEMP-registration-${student.matricNumber.replace(/\//g, "-")}`);
    }

    if (type === "results" && user.role === "student") {
      const student = await getStudentContext(user.id);
      if (!student) return Response.json({ ok: false, message: "Student record not found." }, { status: 404 });
      const result = await db.execute(sql`
        SELECT ses.name AS "Session", sem.name AS "Semester", c.code AS "Course Code",
          c.title AS "Course Title", c.units AS "Units", res.ca_score AS "CA (30)",
          res.exam_score AS "Exam (70)", res.total_score AS "Total (100)", res.grade AS "Grade",
          res.grade_point AS "Grade Point", (c.units * res.grade_point) AS "Weighted Points",
          res.approved_at AS "Approved At"
        FROM results res
        JOIN courses c ON c.id = res.course_id
        JOIN academic_sessions ses ON ses.id = c.session_id
        JOIN semesters sem ON sem.id = c.semester_id
        WHERE res.student_id = ${student.studentId} AND res.status = 'approved'
        ORDER BY ses.name, sem.number, c.code
      `);
      return csvResponse(result.rows as CsvRow[], `UEMP-result-statement-${student.matricNumber.replace(/\//g, "-")}`);
    }

    if (type === "class-list" && user.role === "lecturer") {
      const courseId = Number(url.searchParams.get("courseId"));
      const lecturer = await getLecturerContext(user.id);
      if (!lecturer || !Number.isInteger(courseId)) return Response.json({ ok: false, message: "Invalid request." }, { status: 400 });
      const allocation = await db.select({ id: courseAllocations.id }).from(courseAllocations)
        .where(and(eq(courseAllocations.courseId, courseId), eq(courseAllocations.lecturerId, lecturer.lecturerId))).limit(1);
      if (!allocation.length) return Response.json({ ok: false, message: "Forbidden: course not allocated to you." }, { status: 403 });
      const result = await db.execute(sql`
        SELECT s.matric_number AS "Matric Number", u.full_name AS "Student Name", s.level AS "Level",
          c.code AS "Course Code", c.title AS "Course Title", c.units AS "Units",
          COALESCE(res.ca_score::text, '') AS "CA", COALESCE(res.exam_score::text, '') AS "Exam",
          COALESCE(res.total_score::text, '') AS "Total", COALESCE(res.grade, '') AS "Grade"
        FROM registrations r
        JOIN students s ON s.id = r.student_id
        JOIN users u ON u.id = s.user_id
        JOIN courses c ON c.id = r.course_id
        LEFT JOIN results res ON res.registration_id = r.id
        WHERE r.course_id = ${courseId}
        ORDER BY s.matric_number
      `);
      return csvResponse(result.rows as CsvRow[], `UEMP-class-list-${courseId}`);
    }

    if (!["dept_admin", "super_admin"].includes(user.role)) {
      return Response.json({ ok: false, message: "Forbidden: your role cannot access this report." }, { status: 403 });
    }
    if (user.role === "dept_admin" && requestedDept && requestedDept !== user.departmentId) {
      return Response.json({ ok: false, message: "Forbidden: cross-department report denied." }, { status: 403 });
    }

    if (type === "students") {
      const result = await db.execute(sql`
        SELECT s.matric_number AS "Matric Number", u.full_name AS "Full Name", u.email AS "Email",
          d.name AS "Department", p.name AS "Program", s.level AS "Level",
          s.admission_year AS "Admission Year", u.status AS "Account Status"
        FROM students s
        JOIN users u ON u.id = s.user_id
        JOIN departments d ON d.id = s.department_id
        JOIN programs p ON p.id = s.program_id
        WHERE 1 = 1 ${studentDeptClause}
        ORDER BY s.matric_number
      `);
      return csvResponse(result.rows as CsvRow[], "UEMP-student-list");
    }

    if (type === "registrations") {
      const result = await db.execute(sql`
        SELECT ses.name AS "Session", sem.name AS "Semester", s.matric_number AS "Matric Number",
          u.full_name AS "Student", d.name AS "Department", c.code AS "Course Code",
          c.title AS "Course Title", c.units AS "Units", c.level AS "Level",
          r.registered_at AS "Registered At"
        FROM registrations r
        JOIN students s ON s.id = r.student_id
        JOIN users u ON u.id = s.user_id
        JOIN courses c ON c.id = r.course_id
        JOIN departments d ON d.id = c.department_id
        JOIN academic_sessions ses ON ses.id = r.session_id
        JOIN semesters sem ON sem.id = r.semester_id
        WHERE 1 = 1 ${deptClause}
        ORDER BY ses.name DESC, sem.number, c.code, s.matric_number
      `);
      return csvResponse(result.rows as CsvRow[], "UEMP-course-registration-report");
    }

    if (type === "performance") {
      const result = await db.execute(sql`
        SELECT ses.name AS "Session", sem.name AS "Semester", d.name AS "Department",
          c.code AS "Course Code", c.title AS "Course Title", c.units AS "Units",
          COUNT(res.id)::int AS "Approved Results",
          ROUND(AVG(res.total_score), 1) AS "Average Score",
          COUNT(CASE WHEN res.total_score >= 40 THEN 1 END)::int AS "Passes",
          COUNT(CASE WHEN res.total_score < 40 THEN 1 END)::int AS "Fails",
          ROUND(100.0 * COUNT(CASE WHEN res.total_score >= 40 THEN 1 END) / NULLIF(COUNT(res.id), 0), 1) AS "Pass Rate %"
        FROM results res
        JOIN courses c ON c.id = res.course_id
        JOIN departments d ON d.id = c.department_id
        JOIN academic_sessions ses ON ses.id = c.session_id
        JOIN semesters sem ON sem.id = c.semester_id
        WHERE res.status = 'approved' ${deptClause}
        GROUP BY ses.name, sem.name, d.name, c.code, c.title, c.units
        ORDER BY ses.name DESC, sem.name, c.code
      `);
      return csvResponse(result.rows as CsvRow[], "UEMP-academic-performance-report");
    }

    if (type === "users" && user.role === "super_admin") {
      const result = await db.execute(sql`
        SELECT u.full_name AS "Full Name", u.email AS "Email", u.role AS "Role",
          u.status AS "Status", COALESCE(d.name, 'University-wide') AS "Department",
          u.last_login_at AS "Last Login", u.created_at AS "Created At"
        FROM users u LEFT JOIN departments d ON d.id = u.department_id
        ORDER BY u.role, u.full_name
      `);
      return csvResponse(result.rows as CsvRow[], "UEMP-user-accounts");
    }

    return Response.json({ ok: false, message: "Unknown or unauthorized export type." }, { status: 400 });
  } catch (error) {
    console.error("Export error:", error);
    return Response.json({ ok: false, message: "Could not generate the report." }, { status: 500 });
  }
}
