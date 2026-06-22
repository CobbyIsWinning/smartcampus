import Image from "next/image";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth.actions";
import { Notice } from "@/app/components/notice";
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

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const errorMessages: Record<string, string> = {
    "invalid-email": "Enter a valid email address.",
    "missing-fields": "Enter both email and password.",
    invalid: "Email or password is incorrect.",
  };

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
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Access your role-based campus dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            {message === "signed-out" ? (
              <Notice variant="success">You have been signed out.</Notice>
            ) : null}
            {error ? (
              <Notice variant="error">
                {errorMessages[error] ?? "Email or password is incorrect."}
              </Notice>
            ) : null}
            <form action={loginAction} className="grid gap-4">
              <Field label="Email">
                <Input name="email" required type="email" />
              </Field>
              <Field label="Password">
                <PasswordField autoComplete="current-password" name="password" />
              </Field>
              <SubmitButton className="mt-2" loadingText="Signing in...">
                Sign in
              </SubmitButton>
            </form>
            <p className="mt-5 text-sm text-muted-foreground">
              Need an account?{" "}
              <Button asChild className="h-auto px-0" variant="link">
                <Link href="/register">Register</Link>
              </Button>
            </p>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
