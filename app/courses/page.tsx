import Link from "next/link";
import { dropEnrollmentAction, enrollAction } from "@/app/actions/student.actions";
import { ActionToast } from "@/app/components/action-toast";
import { SubmitButton } from "@/app/components/submit-button";
import { AppShell } from "@/app/components/ui";
import { prisma } from "@/app/lib/prisma";
import { requireUser } from "@/app/lib/session";
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

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{
    semester?: string;
    enrolled?: string;
    dropped?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const semester = params.semester;

  const [courses, semesterRows, myEnrollments] = await Promise.all([
    prisma.course.findMany({
      where: { active: true, ...(semester ? { semester } : {}) },
      orderBy: [{ semester: "desc" }, { code: "asc" }],
      include: {
        _count: { select: { enrollments: { where: { status: "ENROLLED" } } } },
      },
    }),
    prisma.course.findMany({
      where: { active: true },
      select: { semester: true },
      distinct: ["semester"],
      orderBy: { semester: "desc" },
    }),
    prisma.enrollment.findMany({
      where: { studentId: user.id, status: "ENROLLED" },
      select: { courseId: true },
    }),
  ]);

  const enrolledCourseIds = new Set(myEnrollments.map((e) => e.courseId));
  const semesters = semesterRows.map((row) => row.semester);

  const errorMessages: Record<string, string> = {
    "not-available": "That course is no longer available.",
    "already-enrolled": "You are already enrolled in this course.",
    "course-full": "That course is full.",
    "not-enrolled": "You are not enrolled in this course.",
  };

  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Academics
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
            Course enrollment
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {enrolledCourseIds.size} enrolled
        </p>
      </div>

      <ActionToast
        specs={[
          ...(params.enrolled === "1"
            ? [
                {
                  key: "enrolled",
                  value: "1",
                  message: "You are enrolled in the course.",
                  type: "success" as const,
                },
              ]
            : []),
          ...(params.dropped === "1"
            ? [
                {
                  key: "dropped",
                  value: "1",
                  message: "You have dropped the course.",
                  type: "success" as const,
                },
              ]
            : []),
          ...(params.error
            ? [
                {
                  key: "error",
                  value: params.error,
                  message: errorMessages[params.error] ?? "Something went wrong.",
                  type: "error" as const,
                },
              ]
            : []),
        ]}
      />

      <section className="mt-8 flex flex-wrap gap-2">
        <Button asChild size="sm" variant={semester ? "ghost" : "secondary"}>
          <Link href="/courses">All semesters</Link>
        </Button>
        {semesters.map((sem) => (
          <Button
            key={sem}
            asChild
            size="sm"
            variant={semester === sem ? "secondary" : "ghost"}
          >
            <Link href={`/courses?semester=${encodeURIComponent(sem)}`}>{sem}</Link>
          </Button>
        ))}
      </section>

      <section className="mt-8 grid gap-5">
        {courses.length === 0 ? (
          <p className="text-muted-foreground">No courses available to enroll in.</p>
        ) : (
          courses.map((course) => {
            const enrolledCount = course._count.enrollments;
            const seatsLeft = Math.max(course.capacity - enrolledCount, 0);
            const mine = enrolledCourseIds.has(course.id);

            return (
              <Card key={course.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>
                        {course.code} — {course.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {course.semester} · {course.credits} credits
                        {course.department ? ` · ${course.department}` : ""}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{seatsLeft} seats left</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {course.description ? (
                    <p className="text-sm leading-6 text-foreground/80">
                      {course.description}
                    </p>
                  ) : null}
                  <div className="text-sm text-muted-foreground">
                    {enrolledCount} of {course.capacity} seats filled
                  </div>
                  <Separator />
                  {mine ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge>Enrolled</Badge>
                      <form action={dropEnrollmentAction}>
                        <input name="courseId" type="hidden" value={course.id} />
                        <SubmitButton loadingText="Dropping..." variant="secondary">
                          Drop course
                        </SubmitButton>
                      </form>
                    </div>
                  ) : seatsLeft > 0 ? (
                    <form action={enrollAction}>
                      <input name="courseId" type="hidden" value={course.id} />
                      <SubmitButton loadingText="Enrolling...">Enroll</SubmitButton>
                    </form>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      This course is full.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </AppShell>
  );
}
