// Phase 0 P0.5 — email-sending primitive behind a simple interface.
//
// There is no email provider wired up in this environment, so this is a no-op
// that logs to the server console in development. Swap the body of `sendEmail`
// for a real transport (Resend, SES, SMTP, ...) without changing call sites.

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[email:dev] to=${message.to} subject="${message.subject}"\n${message.body}`,
    );
  }
  // In production, integrate a real provider here.
}
