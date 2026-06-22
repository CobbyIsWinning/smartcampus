import Link from "next/link";
import { loginAction } from "@/app/actions/auth.actions";
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
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AppShell>
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Access your role-based campus dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
          {error ? (
            <p className="mb-5 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              Email or password is incorrect.
            </p>
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
      </div>
    </AppShell>
  );
}
