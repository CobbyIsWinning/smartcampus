import { createTicketAction } from "@/app/actions/maintenance.actions";
import { SubmitButton } from "@/app/components/submit-button";
import { AppShell, Field } from "@/app/components/ui";
import { requireUser } from "@/app/lib/session";
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
import { Textarea } from "@/components/ui/textarea";

export default async function NewMaintenanceTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { error } = await searchParams;

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Create maintenance ticket</CardTitle>
            <CardDescription>
              Submit facility issues for campus operations to review.
            </CardDescription>
          </CardHeader>
          <CardContent>
          {error ? (
            <p className="mb-5 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              Title, location, and description are required.
            </p>
          ) : null}
          <form action={createTicketAction} className="grid gap-4">
            <Field label="Issue title">
              <Input name="title" required />
            </Field>
            <Field label="Location">
              <Input name="location" placeholder="Library, Block A, Room 204" required />
            </Field>
            <Field label="Priority">
              <Select defaultValue="MEDIUM" name="priority">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Description">
              <Textarea name="description" required rows={6} />
            </Field>
            <SubmitButton loadingText="Submitting...">
              Submit ticket
            </SubmitButton>
          </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
