import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { gradingScale } from "@/db/schema";

export type GradeBand = {
  id: number;
  grade: string;
  minScore: number;
  maxScore: number;
  gradePoint: number;
};

export const CA_MAX = 30;
export const EXAM_MAX = 70;

export async function getGradingScale(): Promise<GradeBand[]> {
  return db.select().from(gradingScale).orderBy(desc(gradingScale.minScore), asc(gradingScale.grade));
}

/** Inclusive bands, evaluated from the highest minimum score downwards. */
export function gradeFor(total: number, scale: GradeBand[]) {
  const band = [...scale].sort((a, b) => b.minScore - a.minScore)
    .find((item) => total >= item.minScore && total <= item.maxScore);
  return band ?? { grade: "F", gradePoint: 0, minScore: 0, maxScore: 39, id: 0 };
}

export type GpaRow = { units: number; gradePoint: number | null };

/** Standard credit-unit-weighted GPA: Σ(units × grade point) / Σ(units). */
export function calculateGpa(rows: GpaRow[]): { gpa: number; units: number; points: number } {
  const valid = rows.filter((row) => row.gradePoint !== null && row.units > 0);
  const units = valid.reduce((sum, row) => sum + row.units, 0);
  const points = valid.reduce((sum, row) => sum + row.units * (row.gradePoint ?? 0), 0);
  return { gpa: units ? Number((points / units).toFixed(2)) : 0, units, points };
}

export function classifyGpa(gpa: number): string {
  if (gpa >= 4.5) return "First Class";
  if (gpa >= 3.5) return "Second Class Upper";
  if (gpa >= 2.5) return "Second Class Lower";
  if (gpa >= 1.5) return "Third Class";
  return "Pass / Probation";
}
