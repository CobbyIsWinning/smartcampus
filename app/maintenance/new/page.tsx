import { createTicketAction } from "@/app/actions/maintenance.actions";
import { ActionToast } from "@/app/components/action-toast";
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
    "invalid-category": "Category must be between 2 and 60 characters.",
    "invalid-building": "Building must be at most 120 characters.",
    "invalid-room": "Room number must be at most 60 characters.",
    "invalid-attachment": "Each attachment must be a valid image URL or path.",
    "unsupported-format": "Attachments must be jpg, jpeg, png, gif, or webp.",
    "too-many-attachments": "You can attach at most 5 images.",
  };

  const categories = [
    "Electrical",
    "Plumbing",
    "HVAC",
    "Furniture",
    "Cleaning",
    "IT Equipment",
    "Safety",
    "Security",
    "Other",
  ];

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
            <ActionToast
              specs={
                error
                  ? [
                      {
                        key: "error",
                        value: error,
                        message: errorMessages[error] ?? "Ticket submission failed.",
                        type: "error",
                      },
                    ]
                  : []
              }
            />
            <form action={createTicketAction} className="grid gap-4">
              <Field label="Issue title">
                <Input name="title" required />
              </Field>
              <Field label="Category">
                <Select defaultValue="Other" name="category">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Location">
                <Input name="location" placeholder="Library, Block A, Room 204" required />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Building">
                  <Input name="building" placeholder="Block A" />
                </Field>
                <Field label="Room number">
                  <Input name="roomNumber" placeholder="204" />
                </Field>
              </div>
              <Field label="Priority">
                <Select defaultValue="MEDIUM" name="priority">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Description">
                <Textarea name="description" required rows={6} />
              </Field>
              <Field label="Photo attachments (optional)">
                <Textarea
                  name="imageUrls"
                  rows={3}
                  placeholder="Paste image URLs, one per line (jpg, png, gif, webp). Max 5."
                />
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
