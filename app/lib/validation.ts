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
