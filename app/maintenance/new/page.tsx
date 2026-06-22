import { createTicketAction } from "@/app/actions/maintenance.actions";
import { Notice } from "@/app/components/notice";
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
  const errorMessages: Record<string, string> = {
    "missing-fields": "Title, location, and description are required.",
    "invalid-title": "Title must be between 4 and 120 characters.",
    "invalid-location": "Location must be between 3 and 120 characters.",
    "invalid-description": "Description must be between 10 and 2000 characters.",
  };

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
              <Notice variant="error">
                {errorMessages[error] ?? "Ticket submission failed."}
              </Notice>
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
