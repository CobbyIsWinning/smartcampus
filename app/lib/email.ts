// Email-sending primitive (Phase 0 P0.5 / ANA-3).
//
// There is no transactional email provider wired up in this environment, so this
// is a no-op stub behind a small interface. In production, swap `sendEmail` for a
// provider call (Resend/SES/SMTP) — the rest of the app only depends on the shape
// of `EmailMessage` and `EmailResult`.

export type EmailMessage = {
  to: string;
  subject: string;
  body: string;
};

export type EmailResult =
  | { ok: true; provider: string }
  | { ok: false; provider: string; error: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pretend to deliver an email. Returns a failure result for obviously invalid
 * recipients so callers can record a realistic delivery status, and otherwise
 * "succeeds" without contacting any external service.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const provider = "noop";

  if (!message.to || !EMAIL_REGEX.test(message.to)) {
    return { ok: false, provider, error: "invalid-recipient" };
  }

  if (!message.subject || !message.body) {
    return { ok: false, provider, error: "empty-message" };
  }

  // Surface in dev logs so the delivery path is observable without a provider.
  if (process.env.NODE_ENV === "development") {
    console.info(`[email:noop] -> ${message.to}: ${message.subject}`);
  }

  return { ok: true, provider };
}
