import Image from "next/image";
import Link from "next/link";
import { registerAction } from "@/app/actions/auth.actions";
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
import { Input } from "@/components/ui/input";

const errorMessages: Record<string, string> = {
  "missing-fields": "Enter a name, email, and password with at least 8 characters.",
  "invalid-name": "Enter a full name between 2 and 80 characters.",
  "invalid-email": "Enter a valid email address.",
  "weak-password": "Password must be at least 8 characters long.",
  "email-exists": "An account with that email already exists.",
  "password-mismatch": "Password and confirmation do not match.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AppShell>
      <section className="mx-auto flex min-h-[calc(100vh-13rem)] w-full max-w-xl flex-col items-center justify-start pt-8 md:pt-14">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            alt="Smart Campus"
            className="h-24 w-24 object-cover md:h-28 md:w-28"
            height={112}
            priority
            src="/favicon.png"
            width={112}
          />
          <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Smart Campus
          </p>
        </div>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Create account</CardTitle>
            <CardDescription>Register for a student account.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionToast
              specs={
                error
                  ? [
                      {
                        key: "error",
                        value: error,
                        message: errorMessages[error] ?? "Registration failed.",
                        type: "error",
                      },
                    ]
                  : []
              }
            />
            <form action={registerAction} className="grid gap-4">
              <Field label="Full name">
                <Input name="name" required />
              </Field>
              <Field label="Email">
                <Input name="email" required type="email" />
              </Field>
              <Field label="Password">
                <PasswordField
                  autoComplete="new-password"
                  minLength={8}
                  name="password"
                />
              </Field>
              <Field label="Confirm password">
                <PasswordField
                  autoComplete="new-password"
                  minLength={8}
                  name="confirmPassword"
                />
              </Field>
              <SubmitButton className="mt-2" loadingText="Creating account...">
                Create account
              </SubmitButton>
            </form>
            <p className="mt-5 text-sm text-muted-foreground">
              Already registered?{" "}
              <Button asChild className="h-auto px-0" variant="link">
                <Link href="/login">Sign in</Link>
              </Button>
            </p>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
