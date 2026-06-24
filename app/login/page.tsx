import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BarChart3, Bell, CalendarCheck, Wrench } from "lucide-react";
import { loginAction } from "@/app/actions/auth.actions";
import { ActionToast } from "@/app/components/action-toast";
import { PasswordField } from "@/app/components/password-field";
import { SubmitButton } from "@/app/components/submit-button";
import { AppShell, Field } from "@/app/components/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const highlights = [
  { icon: CalendarCheck, text: "Browse facilities and manage your bookings." },
  { icon: Wrench, text: "Raise and track maintenance tickets in real time." },
  { icon: BarChart3, text: "See the dashboards and records for your role." },
  { icon: Bell, text: "Stay on top of campus updates and notifications." },
] as const;

const errorMessages: Record<string, string> = {
  "invalid-email": "Enter a valid email address.",
  "missing-fields": "Enter both email and password.",
  invalid: "Email or password is incorrect.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
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
                Welcome back
              </Badge>
              <h1 className="mt-5 font-heading text-3xl font-semibold uppercase leading-tight tracking-wider">
                Your campus, all in one place
              </h1>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Sign in to pick up where you left off across facilities,
                maintenance, events, and notifications.
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
              Sign in
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Access your role-based campus dashboard.
            </p>

            <ActionToast
              specs={[
                {
                  key: "message",
                  value: "signed-out",
                  message: "You have been signed out.",
                  type: "success",
                },
                ...(error
                  ? [
                      {
                        key: "error",
                        value: error,
                        message:
                          errorMessages[error] ??
                          "Email or password is incorrect.",
                        type: "error" as const,
                      },
                    ]
                  : []),
              ]}
            />

            <form action={loginAction} className="mt-8 grid gap-5">
              <Field label="Email">
                <Input
                  autoComplete="email"
                  name="email"
                  placeholder="you@campus.edu"
                  required
                  type="email"
                />
              </Field>
              <Field label="Password">
                <PasswordField autoComplete="current-password" name="password" />
              </Field>
              <SubmitButton className="mt-2 w-full" loadingText="Signing in...">
                Sign in
              </SubmitButton>
            </form>

            <p className="mt-6 text-sm text-muted-foreground">
              Need an account?{" "}
              <Button asChild className="h-auto px-0" variant="link">
                <Link href="/register">Register</Link>
              </Button>
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
