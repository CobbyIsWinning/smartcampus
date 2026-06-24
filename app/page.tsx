import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Boxes,
  CalendarCheck,
  CalendarDays,
  GraduationCap,
  HardHat,
  Megaphone,
  ShieldCheck,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import { AppShell } from "@/app/components/ui";
import { getCurrentUser } from "@/app/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const modules = [
  {
    icon: GraduationCap,
    title: "Student Portal",
    description:
      "Self-service accounts, profiles, course enrollment, attendance, and academic records in one place.",
  },
  {
    icon: CalendarCheck,
    title: "Facility Booking",
    description:
      "Browse the facility catalog, check availability, and request, reschedule, or cancel bookings.",
  },
  {
    icon: Boxes,
    title: "Asset Tracking",
    description:
      "Register and categorize campus assets, manage allocation, and track them with QR codes.",
  },
  {
    icon: Wrench,
    title: "Maintenance Requests",
    description:
      "Raise tickets with photos, route them to technicians, and follow status against SLAs.",
  },
  {
    icon: CalendarDays,
    title: "Campus Events",
    description:
      "Publish events, manage registration and waitlists, and run QR-based attendance check-in.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Notifications",
    description:
      "Role-based dashboards, KPI reports, and in-app plus email notifications across modules.",
  },
] as const;

const roles = [
  {
    icon: GraduationCap,
    title: "Students",
    description:
      "Manage your profile, enroll in courses, track attendance, book facilities, and register for events.",
  },
  {
    icon: Users,
    title: "Faculty",
    description:
      "Reserve facilities, organize events, and request assets allocated to your department.",
  },
  {
    icon: ShieldCheck,
    title: "Administrators",
    description:
      "Oversee users and roles, approve bookings, and monitor activity through analytics dashboards.",
  },
  {
    icon: HardHat,
    title: "Maintenance Teams",
    description:
      "Pick up assigned tickets, update status, and stay ahead of SLA deadlines and overdue work.",
  },
  {
    icon: Megaphone,
    title: "Event Organizers",
    description:
      "Create and publish events, track registrations and waitlists, and review participation reports.",
  },
] as const;

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <AppShell user={user}>
      {/* Hero */}
      <section className="grid gap-10 py-12 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-16">
        <div>
          <Badge variant="secondary" className="tracking-[0.22em]">
            Smart Campus Management System
          </Badge>
          <h1 className="mt-5 max-w-3xl font-heading text-4xl font-semibold uppercase leading-tight tracking-wider sm:text-5xl">
            One platform to run the whole campus
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Students, faculty, and staff manage profiles, facilities, assets,
            maintenance, and events from a single role-based workspace — with
            analytics and notifications keeping everyone in the loop.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <Button asChild size="lg">
                <Link href="/dashboard" data-icon="inline-end">
                  Open dashboard
                  <ArrowRight />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link href="/register" data-icon="inline-end">
                    Get started
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">Sign in</Link>
                </Button>
              </>
            )}
          </div>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span>6 integrated modules</span>
            <span>Role-based access</span>
            <span>Real-time notifications</span>
          </div>
        </div>

        <div className="grid gap-3 border bg-muted/30 p-6 sm:grid-cols-2">
          {modules.map(({ icon: Icon, title }) => (
            <div
              key={title}
              className="flex items-center gap-3 border bg-background px-4 py-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center border bg-muted/40">
                <Icon className="size-4.5 text-foreground" />
              </span>
              <p className="text-sm font-semibold leading-tight">{title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features / modules */}
      <section className="border-t py-14">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            What&apos;s inside
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold uppercase tracking-wider">
            Six modules, one system
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Every part of campus operations is connected, so requests, bookings,
            and records stay consistent across teams.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="h-full">
              <CardHeader>
                <span className="mb-3 flex h-11 w-11 items-center justify-center border bg-muted/40">
                  <Icon className="size-5 text-foreground" />
                </span>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Roles / how it works */}
      <section className="border-t py-14">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Built for every role
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold uppercase tracking-wider">
            One workspace, tailored access
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Each person sees the tools and data relevant to their role — from
            self-service students to administrators with full oversight.
          </p>
        </div>

        <div className="mt-10 grid gap-px overflow-hidden border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {roles.map(({ icon: Icon, title, description }) => (
            <div key={title} className="bg-background p-6">
              <div className="flex items-center gap-3">
                <Icon className="size-5 text-foreground" />
                <h3 className="font-heading text-base font-semibold uppercase tracking-wider">
                  {title}
                </h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
          <div className="flex flex-col justify-center gap-2 bg-muted/40 p-6">
            <UserCog className="size-5 text-muted-foreground" />
            <p className="text-sm leading-6 text-muted-foreground">
              Administrators assign roles, so access scales as your campus grows.
            </p>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="my-14 border bg-muted/40 px-6 py-12 text-center sm:px-12 sm:py-16">
        <Bell className="mx-auto size-6 text-muted-foreground" />
        <h2 className="mx-auto mt-5 max-w-2xl font-heading text-3xl font-semibold uppercase leading-tight tracking-wider">
          {user ? "Pick up where you left off" : "Ready to get organized?"}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          {user
            ? "Head to your dashboard to manage requests, bookings, and notifications."
            : "Create an account in minutes and start managing your campus the smart way."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {user ? (
            <Button asChild size="lg">
              <Link href="/dashboard" data-icon="inline-end">
                Open dashboard
                <ArrowRight />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg">
                <Link href="/register" data-icon="inline-end">
                  Get started
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
            </>
          )}
        </div>
      </section>
    </AppShell>
  );
}
