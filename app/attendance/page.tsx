import Link from "next/link";
import { ActionToast } from "@/app/components/action-toast";
import { Notice } from "@/app/components/notice";
import { AppShell, StatCard } from "@/app/components/ui";
import { prisma } from "@/app/lib/prisma";
import { requireUser } from "@/app/lib/session";
import {
  LOW_ATTENDANCE_THRESHOLD,
  attendancePercentage,
  isLowAttendance,
} from "@/app/lib/validation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type AttendanceRow = {
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  date: Date;
  course: { id: string; code: string; title: string; semester: string };
};

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; month?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();

  const records = (await prisma.attendance.findMany({
    where: {
      studentId: user.id,
      ...(params.course ? { courseId: params.course } : {}),
    },
    include: {
      course: {
        select: { id: true, code: true, title: true, semester: true },
      },
    },
    orderBy: { date: "desc" },
  })) as AttendanceRow[];

  // Month filter (yyyy-mm) applied in-memory so the per-course rollups stay
  // comparable across filters.
  const monthFiltered = params.month
    ? records.filter(
        (r) => r.date.toISOString().slice(0, 7) === params.month,
      )
    : records;

  // Build the course filter list from all of the student's attendance records.
  const courseOptions = new Map<
    string,
    { code: string; title: string }
  >();
  for (const r of records) {
    courseOptions.set(r.course.id, {
      code: r.course.code,
      title: r.course.title,
    });
  }

  const monthOptions = Array.from(
    new Set(records.map((r) => r.date.toISOString().slice(0, 7))),
  ).sort((a, b) => b.localeCompare(a));

  // Per-course rollup.
  type Rollup = {
    code: string;
    title: string;
    present: number;
    late: number;
    absent: number;
    excused: number;
  };
  const byCourse = new Map<string, Rollup>();
  for (const r of monthFiltered) {
    const key = r.course.id;
    const entry =
      byCourse.get(key) ??
      ({
        code: r.course.code,
        title: r.course.title,
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
      } satisfies Rollup);
    if (r.status === "PRESENT") entry.present += 1;
    else if (r.status === "LATE") entry.late += 1;
    else if (r.status === "ABSENT") entry.absent += 1;
    else entry.excused += 1;
    byCourse.set(key, entry);
  }

  const rollups = Array.from(byCourse.values()).map((r) => ({
    ...r,
    percentage: attendancePercentage(r),
  }));

  const overall =
    rollups.length > 0
      ? attendancePercentage({
          present: rollups.reduce((sum, r) => sum + r.present, 0),
          late: rollups.reduce((sum, r) => sum + r.late, 0),
          absent: rollups.reduce((sum, r) => sum + r.absent, 0),
          excused: rollups.reduce((sum, r) => sum + r.excused, 0),
        })
      : 100;

  const lowCourses = rollups.filter((r) => isLowAttendance(r.percentage));

  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Academics
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
            Attendance
          </h1>
        </div>
      </div>

      <ActionToast specs={[]} />

      {lowCourses.length > 0 ? (
        <div className="mt-6">
          <Notice variant="error">
            Low attendance warning: you are below {LOW_ATTENDANCE_THRESHOLD}% in{" "}
            {lowCourses.map((c) => c.code).join(", ")}. Attend upcoming sessions
            to recover.
          </Notice>
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Overall attendance" value={`${overall}%`} />
        <StatCard label="Courses tracked" value={rollups.length} />
        <StatCard label="Low-attendance courses" value={lowCourses.length} />
      </section>

      <section className="mt-8 flex flex-wrap gap-2">
        <Button asChild size="sm" variant={params.course ? "ghost" : "secondary"}>
          <Link href={params.month ? `/attendance?month=${params.month}` : "/attendance"}>
            All courses
          </Link>
        </Button>
        {Array.from(courseOptions.entries()).map(([id, c]) => (
          <Button
            key={id}
            asChild
            size="sm"
            variant={params.course === id ? "secondary" : "ghost"}
          >
            <Link
              href={`/attendance?course=${id}${params.month ? `&month=${params.month}` : ""}`}
            >
              {c.code}
            </Link>
          </Button>
        ))}
      </section>

      {monthOptions.length > 0 ? (
        <section className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm" variant={params.month ? "ghost" : "outline"}>
            <Link href={params.course ? `/attendance?course=${params.course}` : "/attendance"}>
              All months
            </Link>
          </Button>
          {monthOptions.map((m) => (
            <Button
              key={m}
              asChild
              size="sm"
              variant={params.month === m ? "outline" : "ghost"}
            >
              <Link
                href={`/attendance?month=${m}${params.course ? `&course=${params.course}` : ""}`}
              >
                {m}
              </Link>
            </Button>
          ))}
        </section>
      ) : null}

      <section className="mt-8 grid gap-5">
        {rollups.length === 0 ? (
          <p className="text-muted-foreground">
            No attendance records yet.{" "}
            <Link href="/courses" className="underline">
              Enroll in a course
            </Link>{" "}
            to start tracking.
          </p>
        ) : (
          rollups.map((r) => (
            <Card key={r.code}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>
                      {r.code} — {r.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {r.present} present · {r.late} late · {r.absent} absent ·{" "}
                      {r.excused} excused
                    </CardDescription>
                  </div>
                  <Badge variant={isLowAttendance(r.percentage) ? "destructive" : "secondary"}>
                    {r.percentage}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {isLowAttendance(r.percentage) ? (
                  <p className="text-sm text-destructive">
                    Below the {LOW_ATTENDANCE_THRESHOLD}% threshold.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Meets the {LOW_ATTENDANCE_THRESHOLD}% attendance requirement.
                  </p>
                )}
                <Separator className="mt-4" />
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </AppShell>
  );
}
