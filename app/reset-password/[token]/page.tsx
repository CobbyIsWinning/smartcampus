import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/auth.actions";
import { ActionToast } from "@/app/components/action-toast";
import { PasswordField } from "@/app/components/password-field";
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

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const errorMessages: Record<string, string> = {
    "missing-fields": "Enter and confirm your new password.",
    "weak-password": "Password must be at least 8 characters long.",
    "password-mismatch": "Password and confirmation do not match.",
    "invalid-token": "That reset link is invalid or has expired.",
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-md py-8 md:py-12">
        <Card>
          <CardHeader>
            <CardTitle>Choose a new password</CardTitle>
            <CardDescription>
              Pick a strong password of at least 8 characters. This link can
              only be used once.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionToast
              specs={
                error
                  ? [
                      {
                        key: "error",
                        value: error,
                        message: errorMessages[error] ?? "Reset failed.",
                        type: "error",
                      },
                    ]
                  : []
              }
            />

            <form action={resetPasswordAction} className="grid gap-4">
              <input name="token" type="hidden" value={token} />
              <Field label="New password">
                <PasswordField
                  autoComplete="new-password"
                  minLength={8}
                  name="password"
                />
              </Field>
              <Field label="Confirm new password">
                <PasswordField
                  autoComplete="new-password"
                  minLength={8}
                  name="confirmPassword"
                />
              </Field>
              <SubmitButton loadingText="Updating...">
                Update password
              </SubmitButton>
            </form>

            <p className="mt-6 text-sm text-muted-foreground">
              Need a new link?{" "}
              <Button asChild className="h-auto px-0" variant="link">
                <Link href="/forgot-password">Request another</Link>
              </Button>
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
