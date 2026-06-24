import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarCheck,
  GraduationCap,
  ShieldCheck,
  Users,
} from "lucide-react";
import { registerAction } from "@/app/actions/auth.actions";
import { ActionToast } from "@/app/components/action-toast";
import { PasswordField } from "@/app/components/password-field";
import { SubmitButton } from "@/app/components/submit-button";
import { AppShell, Field } from "@/app/components/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const highlights = [
  { icon: GraduationCap, text: "Get a self-service student account in minutes." },
  { icon: CalendarCheck, text: "Enroll in courses and book campus facilities." },
  { icon: Users, text: "Join events and connect with your campus community." },
  { icon: ShieldCheck, text: "Role-based access keeps your data secure." },
] as const;

const errorMessages: Record<string, string> = {
  "missing-fields":
    "Enter a name, email, and password with at least 8 characters.",
  "invalid-name": "Enter a full name between 2 and 80 characters.",
  "invalid-email": "Enter a valid email address.",
  "invalid-email-domain": "Use your university email address.",
  "invalid-student-id": "Student ID must be between 3 and 40 characters.",
  "invalid-department": "Department must be 120 characters or fewer.",
  "weak-password": "Password must be at least 8 characters long.",
  "email-exists": "An account with that email already exists.",
  "student-id-exists": "That student ID is already registered.",
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
      <section className="flex min-h-[calc(100vh-13rem)] items-center justify-center py-8 md:py-12">
        <div className="grid w-full max-w-5xl overflow-hidden border bg-card md:grid-cols-2">
          {/* Brand / value panel */}
          <aside className="hidden flex-col justify-between gap-10 border-r bg-muted/40 p-8 md:flex lg:p-10">
            <div>
              <div className="flex items-center gap-3">
                <Image
                  alt="Smart Campus"
                  className="h-10 w-10 object-cover"
                  height={40}
                  priority
                  src="/favicon.png"
                  width={40}
                />
                <span className="font-heading text-sm font-semibold uppercase tracking-wider">
                  Smart Campus
                </span>
              </div>
              <Badge variant="secondary" className="mt-8 tracking-[0.22em]">
                Get started
              </Badge>
              <h1 className="mt-5 font-heading text-3xl font-semibold uppercase leading-tight tracking-wider">
                Join your campus workspace
              </h1>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Create a student account to manage your profile, courses,
                bookings, and events from one place.
              </p>
            </div>
            <ul className="space-y-4">
              {highlights.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center border bg-background">
                    <Icon className="size-4 text-foreground" />
                  </span>
                  <span className="text-sm leading-6 text-muted-foreground">
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </aside>

          {/* Form panel */}
          <div className="p-8 lg:p-10">
            <Button
              asChild
              className="mb-8 h-auto px-0 text-muted-foreground"
              size="sm"
              variant="link"
            >
              <Link href="/" data-icon="inline-start">
                <ArrowLeft />
                Back to home
              </Link>
            </Button>

            <h2 className="font-heading text-2xl font-semibold uppercase tracking-wider">
              Create account
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Register for a student account to get started.
            </p>

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

            <form action={registerAction} className="mt-8 grid gap-5">
              <Field label="Full name">
                <Input
                  autoComplete="name"
                  name="name"
                  placeholder="Jane Doe"
                  required
                />
              </Field>
              <Field label="Email">
                <Input
                  autoComplete="email"
                  name="email"
                  placeholder="you@campus.edu"
                  required
                  type="email"
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Student ID">
                  <Input name="studentId" placeholder="S1234567" />
                </Field>
                <Field label="Department">
                  <Input name="department" placeholder="Computer Science" />
                </Field>
              </div>
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
              <p className="text-xs leading-5 text-muted-foreground">
                Use at least 8 characters. You will sign in with your email.
              </p>
              <SubmitButton
                className="mt-1 w-full"
                loadingText="Creating account..."
              >
                Create account
              </SubmitButton>
            </form>

            <p className="mt-6 text-sm text-muted-foreground">
              Already registered?{" "}
              <Button asChild className="h-auto px-0" variant="link">
                <Link href="/login">Sign in</Link>
              </Button>
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
