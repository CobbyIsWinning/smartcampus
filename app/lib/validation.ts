const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

// Returns the lowercased domain part of an email, or "" when malformed.
function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1).toLowerCase();
}

/**
 * STU-2 — when a non-empty allowlist is provided, the email must belong to one
 * of the listed university domains (suffix match, so subdomains pass). An empty
 * or omitted allowlist disables the check.
 */
export function isAllowedEmailDomain(
  email: string,
  allowedDomains?: string[],
): boolean {
  if (!allowedDomains || allowedDomains.length === 0) {
    return true;
  }

  const domain = emailDomain(email);

  return allowedDomains.some((allowed) => {
    const normalized = allowed.trim().toLowerCase();
    return (
      normalized.length > 0 &&
      (domain === normalized || domain.endsWith(`.${normalized}`))
    );
  });
}

export function validateRegisterInput(
  input: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    // STU-2 — optional academic fields captured at signup
    studentId?: string;
    department?: string;
  },
  options?: { allowedEmailDomains?: string[] },
): ValidationResult {
  if (!input.name || !input.email || !input.password || !input.confirmPassword) {
    return { ok: false, error: "missing-fields" };
  }

  if (input.name.length < 2 || input.name.length > 80) {
    return { ok: false, error: "invalid-name" };
  }

  if (!EMAIL_REGEX.test(input.email)) {
    return { ok: false, error: "invalid-email" };
  }

  if (!isAllowedEmailDomain(input.email, options?.allowedEmailDomains)) {
    return { ok: false, error: "invalid-email-domain" };
  }

  if (input.studentId && (input.studentId.length < 3 || input.studentId.length > 40)) {
    return { ok: false, error: "invalid-student-id" };
  }

  if (input.department && input.department.length > 120) {
    return { ok: false, error: "invalid-department" };
  }

  if (input.password.length < 8) {
    return { ok: false, error: "weak-password" };
  }

  if (input.password !== input.confirmPassword) {
    return { ok: false, error: "password-mismatch" };
  }

  return { ok: true };
}

export function validateLoginInput(input: {
  email: string;
  password: string;
}): ValidationResult {
  if (!input.email || !input.password) {
    return { ok: false, error: "missing-fields" };
  }

  if (!EMAIL_REGEX.test(input.email)) {
    return { ok: false, error: "invalid-email" };
  }

  return { ok: true };
}

export function validateTicketInput(input: {
  title: string;
  description: string;
  location: string;
}): ValidationResult {
  if (!input.title || !input.description || !input.location) {
    return { ok: false, error: "missing-fields" };
  }

  if (input.title.length < 4 || input.title.length > 120) {
    return { ok: false, error: "invalid-title" };
  }

  if (input.location.length < 3 || input.location.length > 120) {
    return { ok: false, error: "invalid-location" };
  }

  if (input.description.length < 10 || input.description.length > 2000) {
    return { ok: false, error: "invalid-description" };
  }

  return { ok: true };
}

export function validateAssetInput(input: {
  name: string;
  category: string;
  serialNumber: string;
  cost: string;
}): ValidationResult {
  if (!input.name || !input.category || !input.serialNumber) {
    return { ok: false, error: "missing-fields" };
  }

  if (input.name.length < 2 || input.name.length > 120) {
    return { ok: false, error: "invalid-name" };
  }

  if (input.category.length < 2 || input.category.length > 80) {
    return { ok: false, error: "invalid-category" };
  }

  if (input.serialNumber.length < 2 || input.serialNumber.length > 120) {
    return { ok: false, error: "invalid-serial" };
  }

  if (input.cost) {
    const cost = Number(input.cost);
    if (!Number.isFinite(cost) || cost < 0) {
      return { ok: false, error: "invalid-cost" };
    }
  }

  return { ok: true };
}

export function validateAllocationInput(input: {
  assigneeId: string;
  responsiblePerson: string;
}): ValidationResult {
  if (!input.assigneeId || !input.responsiblePerson) {
    return { ok: false, error: "missing-fields" };
  }

  if (input.responsiblePerson.length < 2 || input.responsiblePerson.length > 120) {
    return { ok: false, error: "invalid-responsible-person" };
  }

  return { ok: true };
}

export function validateTransferInput(input: {
  transferToId: string;
}): ValidationResult {
  if (!input.transferToId) {
    return { ok: false, error: "missing-transfer-target" };
  }

  return { ok: true };
}

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function validateFacilityInput(input: {
  name: string;
  capacity: number;
  building: string;
  location: string;
}): ValidationResult {
  if (!input.name || !input.building || !input.location) {
    return { ok: false, error: "missing-fields" };
  }

  if (input.name.length < 2 || input.name.length > 120) {
    return { ok: false, error: "invalid-name" };
  }

  if (input.building.length < 2 || input.building.length > 120) {
    return { ok: false, error: "invalid-building" };
  }

  if (input.location.length < 2 || input.location.length > 120) {
    return { ok: false, error: "invalid-location" };
  }

  if (
    !Number.isInteger(input.capacity) ||
    input.capacity < 1 ||
    input.capacity > 100000
  ) {
    return { ok: false, error: "invalid-capacity" };
  }

  return { ok: true };
}

export function validateBookingInput(input: {
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  attendeeCount: number;
}): ValidationResult {
  if (!input.date || !input.startTime || !input.endTime || !input.purpose) {
    return { ok: false, error: "missing-fields" };
  }

  if (!DATE_REGEX.test(input.date)) {
    return { ok: false, error: "invalid-date" };
  }

  if (!TIME_REGEX.test(input.startTime) || !TIME_REGEX.test(input.endTime)) {
    return { ok: false, error: "invalid-time" };
  }

  if (input.startTime >= input.endTime) {
    return { ok: false, error: "invalid-time-range" };
  }

  if (input.purpose.length < 4 || input.purpose.length > 500) {
    return { ok: false, error: "invalid-purpose" };
  }

  if (!Number.isInteger(input.attendeeCount) || input.attendeeCount < 1) {
    return { ok: false, error: "invalid-attendees" };
  }

  return { ok: true };
}

// A slot is in the past when its start instant is earlier than `now`.
// `date` is a yyyy-mm-dd string and `startTime` is an HH:MM string.
export function isBookingSlotInPast(
  input: { date: string; startTime: string },
  now: Date = new Date(),
): boolean {
  const slotStart = new Date(`${input.date}T${input.startTime}`);

  if (Number.isNaN(slotStart.getTime())) {
    return true;
  }

  return slotStart.getTime() < now.getTime();
}

// Two same-day slots overlap when each starts before the other ends.
// Times are HH:MM strings, which compare correctly lexicographically.
export function bookingSlotsOverlap(
  a: { startTime: string; endTime: string },
  b: { startTime: string; endTime: string },
): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

// --- Epic 5: Campus Events ---

export function validateEventInput(input: {
  title: string;
  description: string;
  category: string;
  venue: string;
  capacity: number;
  startsAt: string;
  endsAt: string;
}): ValidationResult {
  if (
    !input.title ||
    !input.description ||
    !input.category ||
    !input.venue ||
    !input.startsAt ||
    !input.endsAt
  ) {
    return { ok: false, error: "missing-fields" };
  }

  if (input.title.length < 4 || input.title.length > 120) {
    return { ok: false, error: "invalid-title" };
  }

  if (input.category.length < 2 || input.category.length > 60) {
    return { ok: false, error: "invalid-category" };
  }

  if (input.venue.length < 3 || input.venue.length > 120) {
    return { ok: false, error: "invalid-venue" };
  }

  if (input.description.length < 10 || input.description.length > 2000) {
    return { ok: false, error: "invalid-description" };
  }

  if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 100000) {
    return { ok: false, error: "invalid-capacity" };
  }

  const starts = new Date(input.startsAt);
  const ends = new Date(input.endsAt);

  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
    return { ok: false, error: "invalid-date" };
  }

  if (ends.getTime() <= starts.getTime()) {
    return { ok: false, error: "invalid-date-range" };
  }

  return { ok: true };
}

export function validateEventFeedbackInput(input: {
  rating: number;
  comment: string;
}): ValidationResult {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { ok: false, error: "invalid-rating" };
  }

  if (input.comment.length > 2000) {
    return { ok: false, error: "invalid-comment" };
  }

  return { ok: true };
}

const OPEN_ELIGIBILITY = new Set([
  "",
  "all",
  "open",
  "everyone",
  "all students",
  "all welcome",
]);

/**
 * Pure eligibility gate (EVT-4). An empty/"open" eligibility is available to
 * everyone; otherwise the user's department must match the eligibility string
 * (case-insensitive, either direction so "Science" matches "Computer Science").
 */
export function isEligible(
  eligibility: string | null | undefined,
  department: string | null | undefined,
): boolean {
  const requirement = (eligibility ?? "").trim().toLowerCase();

  if (OPEN_ELIGIBILITY.has(requirement)) {
    return true;
  }

  const dept = (department ?? "").trim().toLowerCase();

  if (!dept) {
    return false;
  }

  return (
    dept === requirement ||
    requirement.includes(dept) ||
    dept.includes(requirement)
  );
}

// --- Epic 1: Student Management Portal ---

// STU-3 — password reset request (email only)
export function validatePasswordResetRequestInput(input: {
  email: string;
}): ValidationResult {
  if (!input.email) {
    return { ok: false, error: "missing-fields" };
  }

  if (!EMAIL_REGEX.test(input.email)) {
    return { ok: false, error: "invalid-email" };
  }

  return { ok: true };
}

// STU-3 — choosing a new password from a reset link
export function validateResetPasswordInput(input: {
  password: string;
  confirmPassword: string;
}): ValidationResult {
  if (!input.password || !input.confirmPassword) {
    return { ok: false, error: "missing-fields" };
  }

  if (input.password.length < 8) {
    return { ok: false, error: "weak-password" };
  }

  if (input.password !== input.confirmPassword) {
    return { ok: false, error: "password-mismatch" };
  }

  return { ok: true };
}

// STU-5 — course catalog entry (admin / faculty)
export function validateCourseInput(input: {
  code: string;
  title: string;
  semester: string;
  credits: number;
  capacity: number;
}): ValidationResult {
  if (!input.code || !input.title || !input.semester) {
    return { ok: false, error: "missing-fields" };
  }

  if (input.code.length < 2 || input.code.length > 20) {
    return { ok: false, error: "invalid-code" };
  }

  if (input.title.length < 3 || input.title.length > 120) {
    return { ok: false, error: "invalid-title" };
  }

  if (input.semester.length < 3 || input.semester.length > 40) {
    return { ok: false, error: "invalid-semester" };
  }

  if (!Number.isInteger(input.credits) || input.credits < 1 || input.credits > 12) {
    return { ok: false, error: "invalid-credits" };
  }

  if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 100000) {
    return { ok: false, error: "invalid-capacity" };
  }

  return { ok: true };
}

// STU-6 — attendance percentage helpers.
export const LOW_ATTENDANCE_THRESHOLD = 75;

// Whole-number attendance percentage. Present + late count as attended;
// excused sessions are removed from the denominator. Returns 100 when there
// are no recorded sessions (nothing to be alarmed about yet).
export function attendancePercentage(input: {
  present: number;
  late: number;
  absent: number;
  excused: number;
}): number {
  const counted = input.present + input.late + input.absent;

  if (counted <= 0) {
    return 100;
  }

  return Math.round(((input.present + input.late) / counted) * 100);
}

export function isLowAttendance(
  percentage: number,
  threshold: number = LOW_ATTENDANCE_THRESHOLD,
): boolean {
  return percentage < threshold;
}

// STU-7 — GPA (4.0 scale) weighted by course credits over completed records.
// Returns 0 when there are no graded credits.
export function computeGpa(
  records: Array<{ gradePoints: number | null; credits: number }>,
): number {
  let totalPoints = 0;
  let totalCredits = 0;

  for (const record of records) {
    if (record.gradePoints === null || record.credits <= 0) {
      continue;
    }
    totalPoints += record.gradePoints * record.credits;
    totalCredits += record.credits;
  }

  if (totalCredits === 0) {
    return 0;
  }

  return Math.round((totalPoints / totalCredits) * 100) / 100;
}
