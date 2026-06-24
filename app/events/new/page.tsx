import { createEventAction } from "@/app/actions/event.actions";
import { ActionToast } from "@/app/components/action-toast";
import { SubmitButton } from "@/app/components/submit-button";
import { AppShell, Field } from "@/app/components/ui";
import { requireRole } from "@/app/lib/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireRole(["FACULTY", "ADMINISTRATOR"]);
  const { error } = await searchParams;
  const errorMessages: Record<string, string> = {
    "missing-fields": "Title, description, category, venue, and date/time are required.",
    "invalid-title": "Title must be between 4 and 120 characters.",
    "invalid-category": "Category must be between 2 and 60 characters.",
    "invalid-venue": "Venue must be between 3 and 120 characters.",
    "invalid-description": "Description must be between 10 and 2000 characters.",
    "invalid-capacity": "Capacity must be a whole number of at least 1.",
    "invalid-date": "Start and end must be valid dates.",
    "invalid-date-range": "The event must end after it starts.",
  };

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Create campus event</CardTitle>
            <CardDescription>
              New events are saved as a draft. Publish them from the manage page
              once details are final.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionToast
              specs={
                error
                  ? [
                      {
                        key: "error",
                        value: error,
                        message: errorMessages[error] ?? "Event creation failed.",
                        type: "error",
                      },
                    ]
                  : []
              }
            />
            <form action={createEventAction} className="grid gap-4">
              <Field label="Title">
                <Input name="title" required />
              </Field>
              <Field label="Category">
                <Input name="category" placeholder="Technology, Sports, Cultural" required />
              </Field>
              <Field label="Venue">
                <Input name="venue" placeholder="Auditorium, Block A" required />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Starts at">
                  <Input name="startsAt" type="datetime-local" required />
                </Field>
                <Field label="Ends at">
                  <Input name="endsAt" type="datetime-local" required />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Capacity">
                  <Input name="capacity" type="number" min={1} defaultValue={50} required />
                </Field>
                <Field label="Eligibility (optional)">
                  <Input name="eligibility" placeholder="Leave blank for all students" />
                </Field>
              </div>
              <Field label="Description">
                <Textarea name="description" required rows={6} />
              </Field>
              <SubmitButton loadingText="Creating...">Create event</SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
