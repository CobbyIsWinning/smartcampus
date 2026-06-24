import Link from "next/link";
import { AppShell, StatCard } from "@/app/components/ui";
import { prisma } from "@/app/lib/prisma";
import { requireUser } from "@/app/lib/session";
import { computeGpa } from "@/app/lib/validation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type RecordRow = {
  semester: string;
  status: "COMPLETED" | "PENDING";
  grade: string | null;
  gradePoints: number | null;
  course: { code: string; title: string; credits: number };
};

export default async function RecordsPage() {
  const user = await requireUser();

  const records = (await prisma.academicRecord.findMany({
    where: { studentId: user.id },
    include: {
      course: { select: { code: true, title: true, credits: true } },
    },
    orderBy: [{ semester: "desc" }, { createdAt: "asc" }],
  })) as RecordRow[];

  const completed = records.filter((r) => r.status === "COMPLETED");
  const pending = records.filter((r) => r.status === "PENDING");

  const cumulativeGpa = computeGpa(
    completed.map((r) => ({
      gradePoints: r.gradePoints,
      credits: r.course.credits,
    })),
  );
  const completedCredits = completed.reduce(
    (sum, r) => sum + r.course.credits,
    0,
  );

  // Group by semester for a read-only transcript view.
  const semesters = Array.from(new Set(records.map((r) => r.semester)));

  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Academics
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
            Academic records
          </h1>
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Cumulative GPA" value={cumulativeGpa.toFixed(2)} />
        <StatCard label="Completed credits" value={completedCredits} />
        <StatCard label="Pending courses" value={pending.length} />
      </section>

      <section className="mt-8 grid gap-6">
        {records.length === 0 ? (
          <p className="text-muted-foreground">
            No academic records yet.{" "}
            <Link href="/courses" className="underline">
              Enroll in a course
            </Link>{" "}
            to get started.
          </p>
        ) : (
          semesters.map((semester) => {
            const rows = records.filter((r) => r.semester === semester);
            const semesterGpa = computeGpa(
              rows
                .filter((r) => r.status === "COMPLETED")
                .map((r) => ({
                  gradePoints: r.gradePoints,
                  credits: r.course.credits,
                })),
            );

            return (
              <Card key={semester}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle>{semester}</CardTitle>
                    <Badge variant="secondary">GPA {semesterGpa.toFixed(2)}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {rows.map((r, index) => (
                    <div key={`${r.course.code}-${index}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div>
                          <p className="font-semibold">
                            {r.course.code} — {r.course.title}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {r.course.credits} credits
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {r.status === "COMPLETED" ? (
                            <>
                              <Badge>{r.grade ?? "—"}</Badge>
                              <Badge variant="secondary">Completed</Badge>
                            </>
                          ) : (
                            <Badge variant="outline">In progress</Badge>
                          )}
                        </div>
                      </div>
                      {index < rows.length - 1 ? <Separator /> : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </AppShell>
  );
}
