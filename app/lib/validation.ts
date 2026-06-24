const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validateRegisterInput(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): ValidationResult {
  if (!input.name || !input.email || !input.password || !input.confirmPassword) {
    return { ok: false, error: "missing-fields" };
  }

  if (input.name.length < 2 || input.name.length > 80) {
    return { ok: false, error: "invalid-name" };
  }

  if (!EMAIL_REGEX.test(input.email)) {
    return { ok: false, error: "invalid-email" };
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
