# University Education Management Portal (UEMP)

> **Lead Web Praxis Media Limited** · Practical Software Development Test  
> **Project:** University Education Management Portal (UEMP)  
> **Assessment Type:** Practical Software Development Test (24 Hours)  
> **Department:** Technology & Engineering  

---

## 1. Project Overview

The **University Education Management Portal (UEMP)** is a robust, full-stack, web-based university academic management portal engineered to support four distinct user levels with rigorous server-side Role-Based Access Control (RBAC), multi-stage academic workflows, transactional database integrity, and comprehensive audit trails.

The application satisfies all requirements of the Lead Web Praxis Media Limited assessment specification, implementing:
1. **Student Workspace:** Course registration with prerequisites & 24-credit cap enforcement, semester result checking, cumulative GPA (CGPA) computation, and printable/downloadable course summaries and statements of results.
2. **Lecturer Workspace:** Assigned course rosters, continuous assessment (CA 0–30) and examination (0–70) score entry, draft saving, result submission for departmental review, and performance summaries.
3. **Department Admin Workspace:** Student and lecturer records management, course catalogue & allocations, academic programs and levels, result moderation & approval workflow (approve/return with remarks), and departmental reporting.
4. **Super Admin Workspace:** Full university-wide oversight, faculties & departments, academic sessions and semester toggles, user activation/suspension, dynamic role permission matrix, and full system audit trail.

---

## 2. Technology Stack & Architectural Decisions

* **Framework:** Next.js 16 (App Router with React 19 and React Server Components)
* **Language:** TypeScript 5 (Strict type checking enabled)
* **Database:** **MySQL 8.0+** (Relational schema with foreign keys, compound unique constraints, and ACID transactions)
* **ORM:** Drizzle ORM (`drizzle-orm/mysql2`) with `drizzle-kit` for schema management
* **Authentication & Security:** 
  - Passwords salted and hashed with Node.js native `crypto.scrypt` (timing-safe verification)
  - Cryptographically random 256-bit session tokens stored as SHA-256 hashes in MySQL
  - Secure `HttpOnly`, `SameSite=Lax` cookies
  - Independent server-side RBAC and departmental scope validation on every Server Action and Route Handler
* **Styling & UI:** Tailwind CSS with custom responsive panels, tables, badges, and `@media print` support
* **Export Engine:** Native RFC 4180 CSV export handlers with UTF-8 BOM encoding for Excel/Sheets compatibility

---

## 3. Database Schema & Entity Relationship (ER) Diagram

The system uses 19 normalized relational tables in MySQL. Every relationship is enforced with foreign keys, indexes, and unique constraints.

### ER Diagram

```
+-------------------+       +-----------------------+       +-------------------+
|     faculties     |1     *|      departments      |1     *|     programs      |
+-------------------+-------+-----------------------+-------+-------------------+
| id (PK)           |       | id (PK)               |       | id (PK)           |
| name, code        |       | faculty_id (FK)       |       | department_id (FK)|
| is_active         |       | name, code, is_active |       | code, name, degree|
+-------------------+       +-----------------------+       +-------------------+
                                        |1                            |1
                                        |                             |
                                        |*                            |*
                                 +--------------+              +--------------+
                                 | academic_lvl |              |   students   |
                                 +--------------+              +--------------+
                                 | id (PK)      |              | id (PK)      |
                                 | dept_id (FK) |              | user_id (FK) |
                                 | level, name  |              | matric_number|
                                 +--------------+              | dept_id (FK) |
                                                               | prog_id (FK) |
                                                               | level, year  |
                                                               +--------------+
                                                                      |1
                                                                      |*
+-------------------+       +-----------------------+          +---------------+
| academic_sessions |1     *|       semesters       |1        *| registrations |
+-------------------+-------+-----------------------+----------+---------------+
| id (PK)           |       | id (PK)               |          | id (PK)       |
| name, is_current  |       | session_id (FK)       |          | student_id(FK)|
+-------------------+       | name, number          |          | course_id (FK)|
          |1                +-----------------------+          | session_id(FK)|
          |                             |1                     | semester_id(FK|
          |*                            |*                     +---------------+
+---------------------------------------------------+                  |1
|                      courses                      |                  |1
+---------------------------------------------------+                  |
| id (PK), code, title, units, level                |                  |
| department_id (FK), program_id (FK)               |                  |
| session_id (FK), semester_id (FK), is_active      |                  |
+---------------------------------------------------+                  |
         |1                              |1                            |
         |*                              |*                            |
+--------------------+         +--------------------+          +---------------+
| course_allocations |         | result_submissions |          |    results    |
+--------------------+         +--------------------+          +---------------+
| id (PK)            |         | id (PK)            |          | id (PK)       |
| course_id (FK)     |         | course_id (FK)     |          | regist_id (FK)|
| lecturer_id (FK)   |         | lecturer_id (FK)   |          | course_id (FK)|
| session_id (FK)    |         | department_id (FK) |          | student_id(FK)|
+--------------------+         | session_id (FK)    |          | ca_score (30) |
                               | status (draft/sub/ |          | exam_score(70)|
                               | feedback, reviewed |          | total, grade  |
                               +--------------------+          | status        |
                                                               +---------------+

+-------------------+       +-----------------------+       +-------------------+
|       users       |1     *|       sessions        |       |    audit_logs     |
+-------------------+-------+-----------------------+       +-------------------+
| id (PK)           |       | id (PK)               |       | id (PK)           |
| email, full_name  |       | token_hash (Unique)   |       | user_id (FK)      |
| password_hash     |       | user_id (FK)          |       | actor_name, action|
| role, status      |       | expires_at            |       | entity, details   |
| department_id(FK) |       +-----------------------+       +-------------------+
+-------------------+
         |1
         +------------------+
         |1                *|
   +-------------+    +-------------------+    +--------------------+
   |  lecturers  |    | role_permissions  |    |   grading_scale    |
   +-------------+    +-------------------+    +--------------------+
   | id (PK)     |    | id (PK)           |    | id (PK)            |
   | user_id(FK) |    | role, permission  |    | grade, min, max, pt|
   | staff_number|    | enabled           |    +--------------------+
   | dept_id(FK) |    +-------------------+
   +-------------+
```

---

## 4. Test Login Credentials

The database seeds automatically with sample data on first run. You can log in as any of the four roles:

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `super@uemp.edu` | `Admin@123` | University-wide Administration & Security |
| **Department Admin** | `cs.admin@uemp.edu` | `Admin@123` | Department of Computer Science |
| **Lecturer** | `okafor@uemp.edu` | `Lecturer@123` | Assigned courses (CSC201 & CSC203) |
| **Student** | `amina@uemp.edu` | `Student@123` | 200 Level Computer Science |

*Note: Alternate accounts are also available in seed data:*
* Second Dept Admin: `math.admin@uemp.edu` / `Admin@123` (Mathematics)
* Second Lecturer: `bello@uemp.edu` / `Lecturer@123` (CSC205 & MTH201)
* Additional Students: `tolu@uemp.edu`, `zara@uemp.edu`, `musa@uemp.edu` (all with `Student@123`)

---

## 5. Installation & Setup Instructions

### Prerequisites
* **Node.js**: v18.17+ or v20+ / v22+
* **MySQL Server**: v8.0+ running locally (e.g. via WampServer, XAMPP, MySQL Installer, or Docker)

### Step 1: Clone Repository & Install Dependencies
```bash
git clone https://github.com/thaywo/auniversity-education-management-portal.git
cd auniversity-education-management-portal
npm install
```

### Step 2: Configure Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL="mysql://root:%40T25r5s540@127.0.0.1:3306/auniversity_portal"
```
*(Replace `root` and password with your MySQL credentials. Note: special characters like `@` in passwords must be URL-encoded, e.g. `%40`)*.

### Step 3: Create MySQL Database & Apply Schema
Create the database in MySQL:
```sql
CREATE DATABASE auniversity_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
Push the schema to MySQL using Drizzle Kit:
```bash
npx drizzle-kit push
```

### Step 4: Run the Application
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. The application will automatically detect that the database is fresh and seed complete sample demonstration records.

### Step 5: Production Build Verification
To verify production readiness:
```bash
npm run typecheck
npm run build
npm start
```

---

## 6. Implementation of the 4 Core Workflows

### Workflow 1: Student Course Registration
1. Student logs in (`amina@uemp.edu`).
2. The dashboard detects the student's department (Computer Science), degree program (B.Sc. Computer Science), level (200 Level), and current academic session/semester (2025/2026 First Semester).
3. Student navigates to **Course Registration** (`/student/courses`).
4. Available courses matching their program and level are listed with credit units.
5. Student selects courses. The server enforces:
   - Eligibility check (department, program, level, semester).
   - Duplicate prevention via compound database unique index `(student_id, course_id, session_id, semester_id)`.
   - Maximum 24 credit units limit.
6. Once registered, courses immediately appear on the student dashboard, and the Department Admin can view/monitor them in real time.
7. Student can download the registration summary as a CSV or print an official PDF-ready summary via **Print / Download** (`/student/documents`).

### Workflow 2: Lecturer Result Entry & Submission
1. Lecturer logs in (`okafor@uemp.edu`).
2. Navigates to **Assigned Courses** (`/lecturer/courses`). Only courses allocated to this lecturer are accessible.
3. Selects a course (e.g., `CSC201`). The class list displays all registered students.
4. Enters continuous assessment (`0–30`) and examination scores (`0–70`).
5. Real-time feedback displays total scores and letter grades calculated against the grading scale.
6. Lecturer clicks **Save Draft** to store interim work without locking the sheet.
7. Once all student scores are filled, lecturer clicks **Submit for Review**.
8. The server locks the result sheet (`status: 'submitted'`) so scores cannot be altered.

### Workflow 3: Departmental Result Review & Approval
1. Department Admin logs in (`cs.admin@uemp.edu`).
2. Navigates to **Result Review** (`/department/results`).
3. Selects the submitted course (e.g., `CSC201` or `CSC203`).
4. The admin inspects the complete student roster with CA, Exam, Total, Grade, and Grade Points.
5. **If Approved:** Admin clicks **Approve Results & Publish to Students**. Results update to `approved` status and immediately become visible on the students' dashboards and official statements of results.
6. **If Returned:** Admin enters required correction remarks (e.g., *"Please recheck CA score for student X"*) and clicks **Return Results**. The submission is unlocked for the lecturer, and the lecturer sees the admin's feedback on their score sheet.

### Workflow 4: Super Admin University Governance
1. Super Admin logs in (`super@uemp.edu`).
2. Accesses the University-Wide Dashboard with university counts and quick actions.
3. **Faculties & Departments (`/admin/structure`):** Create new faculties or departments, toggle active status.
4. **Sessions & Semesters (`/admin/sessions`):** Create academic sessions, activate terms, and set the university-wide active session/semester.
5. **User Management (`/admin/users`):** Create accounts for students, lecturers, or departmental admins; activate, deactivate, or suspend any user account.
6. **Permission Matrix (`/admin/permissions`):** Dynamically toggle role permissions in real time.
7. **Grading Scale (`/admin/grading`):** Configure minimum/maximum score thresholds and grade points for A, B, C, D, E, F.
8. **Audit Trail (`/admin/audit`):** Inspect chronological records of all grade entries, approvals, returns, and administrative modifications.

---

## 7. Grading Scale & CGPA Computation Logic

### Grading Bands
The system enforces standard Nigerian university grading bands (configurable by Super Admin):

| Score Range | Grade | Grade Point | Classification |
| :---: | :---: | :---: | :--- |
| **70 – 100** | **A** | 5 | Excellent |
| **60 – 69** | **B** | 4 | Very Good |
| **50 – 59** | **C** | 3 | Good |
| **45 – 49** | **D** | 2 | Credit |
| **40 – 44** | **E** | 1 | Pass |
| **0 – 39** | **F** | 0 | Fail |

### CGPA Formula
* **Grade Point Average (GPA):**
  $$\text{GPA} = \frac{\sum (\text{Course Units} \times \text{Grade Point})}{\sum \text{Course Units}}$$
* **Cumulative Grade Point Average (CGPA):** Computed across all approved courses in the student's entire academic history.
* **Degree Classification:**
  * $\text{CGPA} \ge 4.50$: First Class Honours
  * $3.50 \le \text{CGPA} < 4.50$: Second Class Honours (Upper Division)
  * $2.50 \le \text{CGPA} < 3.50$: Second Class Honours (Lower Division)
  * $1.50 \le \text{CGPA} < 2.50$: Third Class Honours
  * $\text{CGPA} < 1.50$: Fail / Academic Warning

---

## 8. Compliance & Deliverables Checklist

| Requirement | Status | Implementation Details |
| :--- | :---: | :--- |
| **Functional Web Portal** | ✅ Complete | Complete Next.js 16 + MySQL application |
| **4 User Dashboards** | ✅ Complete | Student, Lecturer, Dept Admin, Super Admin |
| **Course Registration** | ✅ Complete | 24-unit cap, duplicate prevention, eligibility checks |
| **Result Management** | ✅ Complete | CA (30), Exam (70), draft saving, locking |
| **Approval Workflow** | ✅ Complete | Submitted → Reviewed → Approved / Returned with feedback |
| **Student Result Visibility**| ✅ Complete | Approved results only; instant GPA/CGPA computation |
| **Print & Download** | ✅ Complete | Print-ready course summaries, result slips & CSV exports |
| **Database Design** | ✅ Complete | MySQL schema with 19 tables, foreign keys & unique indexes |
| **ER Diagram** | ✅ Complete | Documented in README and `/documentation` |
| **Audit Trails** | ✅ Complete | Complete log of result changes, approvals, and admin actions |
| **Responsive UI/UX** | ✅ Complete | Mobile navigation drawer, sticky desktop sidebar, clean cards |
| **Pre-Seeded Sample Data** | ✅ Complete | Automatic bootstrap on initial launch |

---

## 9. License & Credits

Developed for the **Lead Web Praxis Media Limited Practical Software Development Test**.  
All rights reserved © 2026.
