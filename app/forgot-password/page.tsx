import Link from "next/link";
import { requestPasswordResetAction } from "@/app/actions/auth.actions";
import { ActionToast } from "@/app/components/action-toast";
import { Notice } from "@/app/components/notice";
import { SubmitButton } from "@/app/components/submit-button";
import { AppShell, Field } from "@/app/components/ui";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string; devToken?: string }>;
}) {
  const { error, sent, devToken } = await searchParams;
  const errorMessages: Record<string, string> = {
    "missing-fields": "Enter the email address for your account.",
    "invalid-email": "Enter a valid email address.",
    "invalid-token": "That reset link is invalid or has expired.",
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-md py-8 md:py-12">
        <Card>
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>
              Enter your account email and we will send a single-use reset link
              valid for one hour.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionToast
              specs={[
                ...(sent === "1"
                  ? [
                      {
                        key: "sent",
                        value: "1",
                        message:
                          "If an account exists for that email, a reset link has been sent.",
                        type: "success" as const,
                      },
                    ]
                  : []),
                ...(error
                  ? [
                      {
                        key: "error",
                        value: error,
                        message: errorMessages[error] ?? "Request failed.",
                        type: "error" as const,
                      },
                    ]
                  : []),
              ]}
            />

            {devToken ? (
              <Notice variant="info">
                Dev only — no email provider is configured. Use this link to
                continue:{" "}
                <Link
                  className="underline"
                  href={`/reset-password/${devToken}`}
                >
                  /reset-password/{devToken.slice(0, 12)}…
                </Link>
              </Notice>
            ) : null}

            <form action={requestPasswordResetAction} className="grid gap-4">
              <Field label="Email">
                <Input
                  autoComplete="email"
                  name="email"
                  placeholder="you@campus.edu"
                  required
                  type="email"
                />
              </Field>
              <SubmitButton loadingText="Sending...">
                Send reset link
              </SubmitButton>
            </form>

            <p className="mt-6 text-sm text-muted-foreground">
              Remembered it?{" "}
              <Button asChild className="h-auto px-0" variant="link">
                <Link href="/login">Back to sign in</Link>
              </Button>
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
