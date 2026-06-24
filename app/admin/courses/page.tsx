import { createCourseAction } from "@/app/actions/student.actions";
import { ActionToast } from "@/app/components/action-toast";
import { SubmitButton } from "@/app/components/submit-button";
import { AppShell, Field } from "@/app/components/ui";
import { prisma } from "@/app/lib/prisma";
import { requireRole } from "@/app/lib/session";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; course?: string }>;
}) {
  const user = await requireRole(["ADMINISTRATOR", "FACULTY"]);
  const params = await searchParams;

  const courses = await prisma.course.findMany({
    orderBy: [{ semester: "desc" }, { code: "asc" }],
    include: { _count: { select: { enrollments: true } } },
  });

  const errorMessages: Record<string, string> = {
    "missing-fields": "Code, title, and semester are required.",
    "invalid-code": "Course code must be between 2 and 20 characters.",
    "invalid-title": "Title must be between 3 and 120 characters.",
    "invalid-semester": "Semester must be between 3 and 40 characters.",
    "invalid-credits": "Credits must be a whole number between 1 and 12.",
    "invalid-capacity": "Capacity must be a whole number of at least 1.",
    "code-exists": "A course with that code already exists.",
  };

  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Academics
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
            Course catalog
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{courses.length} courses</p>
      </div>

      <ActionToast
        specs={[
          ...(params.course === "created"
            ? [
                {
                  key: "course",
                  value: "created",
                  message: "Course added to the catalog.",
                  type: "success" as const,
                },
              ]
            : []),
          ...(params.error
            ? [
                {
                  key: "error",
                  value: params.error,
                  message: errorMessages[params.error] ?? "Could not add course.",
                  type: "error" as const,
                },
              ]
            : []),
        ]}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Add a course</CardTitle>
            <CardDescription>
              New courses become available for students to enroll in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createCourseAction} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Course code">
                  <Input name="code" placeholder="CS101" required />
                </Field>
                <Field label="Semester">
                  <Input name="semester" placeholder="Fall 2026" required />
                </Field>
              </div>
              <Field label="Title">
                <Input name="title" placeholder="Intro to Computer Science" required />
              </Field>
              <Field label="Department">
                <Input name="department" placeholder="Computer Science" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Credits">
                  <Input name="credits" type="number" min={1} max={12} defaultValue={3} required />
                </Field>
                <Field label="Capacity">
                  <Input name="capacity" type="number" min={1} defaultValue={30} required />
                </Field>
              </div>
              <Field label="Description">
                <Textarea name="description" rows={3} />
              </Field>
              <SubmitButton loadingText="Adding...">Add course</SubmitButton>
            </form>
          </CardContent>
        </Card>

        <section>
          <h2 className="mb-4 font-heading text-2xl font-semibold uppercase tracking-wider">
            Catalog
          </h2>
          {courses.length === 0 ? (
            <p className="text-muted-foreground">No courses yet.</p>
          ) : (
            courses.map((course) => (
              <div key={course.id}>
                <article className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">
                        {course.code} — {course.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {course.semester} · {course.credits} credits ·{" "}
                        {course._count.enrollments}/{course.capacity} enrolled
                        {course.department ? ` · ${course.department}` : ""}
                      </p>
                    </div>
                    <Badge variant={course.active ? "secondary" : "outline"}>
                      {course.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </article>
                <Separator />
              </div>
            ))
          )}
        </section>
      </div>
    </AppShell>
  );
}
