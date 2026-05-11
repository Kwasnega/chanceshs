/**
 * inputValidation.ts
 * Server-side validation and sanitization for prediction API endpoints.
 *
 * Why: The current predict route only checks truthiness of inputs, which allows
 * out-of-range values (aggregate: 99999), wrong types, or oversized payloads to
 * reach the prediction engine. This layer prevents engine errors and malformed
 * telemetry, and closes a surface for fuzzing attacks.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export const VALID_COURSES = [
  'General Science',
  'General Arts',
  'Business',
  'Agriculture',
  'Visual Arts',
] as const;

export type ValidCourse = typeof VALID_COURSES[number];

/**
 * Validates the body of a POST /api/predict request.
 * Aggregate range: 6–54 (6 subjects × grades 1–9).
 * RawScore range:  0–100.
 * Grades: object values must be integers 1–9.
 * Schools: 1–10 items, each with a non-empty string id.
 * Course: one of the five valid CSSPS programs.
 */
export function validatePredictInput(body: unknown): ValidationResult {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const b = body as Record<string, unknown>;

  // aggregate
  if (typeof b.aggregate !== 'number' || !Number.isInteger(b.aggregate) ||
      b.aggregate < 6 || b.aggregate > 54) {
    return { valid: false, error: 'aggregate must be an integer between 6 and 54' };
  }

  // rawScore: 0–600 (sum of 6 BECE subjects, each scored 0–100 raw marks)
  if (typeof b.rawScore !== 'number' || b.rawScore < 0 || b.rawScore > 600) {
    return { valid: false, error: 'rawScore must be a number between 0 and 600' };
  }

  // grades
  if (typeof b.grades !== 'object' || b.grades === null || Array.isArray(b.grades)) {
    return { valid: false, error: 'grades must be a non-null object' };
  }
  const gradeEntries = Object.entries(b.grades as Record<string, unknown>);
  if (gradeEntries.length === 0) {
    return { valid: false, error: 'grades must have at least one entry' };
  }
  for (const [key, val] of gradeEntries) {
    if (typeof key !== 'string' || key.length > 40) {
      return { valid: false, error: 'Grade keys must be strings of max 40 chars' };
    }
    // Grades are CSSPS letter-grade equivalents: integer 1 (best) to 9 (weakest)
    const n = typeof val === 'string' ? parseInt(val as string, 10) : val;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 9) {
      return { valid: false, error: `Grade "${key}" must be an integer between 1 and 9` };
    }
  }

  // schools
  if (!Array.isArray(b.schools) || b.schools.length === 0 || b.schools.length > 10) {
    return { valid: false, error: 'schools must be an array of 1–10 items' };
  }
  for (const s of b.schools as unknown[]) {
    if (typeof s !== 'object' || s === null) {
      return { valid: false, error: 'Each school entry must be an object' };
    }
    const sid = (s as Record<string, unknown>).id;
    if (typeof sid !== 'string' || sid.trim().length === 0 || sid.length > 128) {
      return { valid: false, error: 'Each school must have a non-empty id string (max 128 chars)' };
    }
  }

  // course
  if (!VALID_COURSES.includes(b.course as ValidCourse)) {
    return { valid: false, error: `course must be one of: ${VALID_COURSES.join(', ')}` };
  }

  // schoolRegionFlags (optional)
  if (b.schoolRegionFlags !== undefined) {
    if (typeof b.schoolRegionFlags !== 'object' || b.schoolRegionFlags === null ||
        Array.isArray(b.schoolRegionFlags)) {
      return { valid: false, error: 'schoolRegionFlags must be a plain object' };
    }
    for (const [k, v] of Object.entries(b.schoolRegionFlags as Record<string, unknown>)) {
      if (typeof v !== 'boolean') {
        return { valid: false, error: `schoolRegionFlags["${k}"] must be a boolean` };
      }
    }
  }

  return { valid: true };
}

/**
 * Validates the body of a POST /api/schools/suggest request.
 * Looser than predict: no schools array required, excludeIds is optional.
 */
export function validateSuggestInput(body: unknown): ValidationResult {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.aggregate !== 'number' || !Number.isInteger(b.aggregate) ||
      b.aggregate < 6 || b.aggregate > 54) {
    return { valid: false, error: 'aggregate must be an integer between 6 and 54' };
  }

  if (typeof b.rawScore !== 'number' || b.rawScore < 0 || b.rawScore > 600) {
    return { valid: false, error: 'rawScore must be a number between 0 and 600' };
  }

  if (typeof b.grades !== 'object' || b.grades === null || Array.isArray(b.grades)) {
    return { valid: false, error: 'grades must be a non-null object' };
  }

  if (!VALID_COURSES.includes(b.course as ValidCourse)) {
    return { valid: false, error: `course must be one of: ${VALID_COURSES.join(', ')}` };
  }

  // excludeIds (optional)
  if (b.excludeIds !== undefined) {
    if (!Array.isArray(b.excludeIds) || b.excludeIds.length > 50) {
      return { valid: false, error: 'excludeIds must be an array of at most 50 strings' };
    }
    for (const id of b.excludeIds as unknown[]) {
      if (typeof id !== 'string' || id.length > 128) {
        return { valid: false, error: 'Each excludeId must be a string of max 128 chars' };
      }
    }
  }

  return { valid: true };
}
