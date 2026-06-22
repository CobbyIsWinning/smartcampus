import Link from "next/link";
import { registerAction } from "@/app/actions/auth.actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const errorMessages: Record<string, string> = {
  "missing-fields": "Enter a name, email, and password with at least 8 characters.",
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
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Create account</CardTitle>
            <CardDescription>
              Register as a student, administrator, or maintenance staff member.
            </CardDescription>
          </CardHeader>
          <CardContent>
          {error ? (
            <p className="mb-5 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessages[error] ?? "Registration failed."}
            </p>
          ) : null}
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
            <Field label="Role">
              <Select defaultValue="STUDENT" name="role">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="ADMINISTRATOR">Administrator</SelectItem>
                  <SelectItem value="MAINTENANCE_STAFF">Maintenance Staff</SelectItem>
                </SelectContent>
              </Select>
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
      </div>
    </AppShell>
  );
}
