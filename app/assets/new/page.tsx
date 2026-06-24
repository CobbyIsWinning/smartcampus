import { createAssetAction } from "@/app/actions/asset.actions";
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

export default async function NewAssetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireRole(["ADMINISTRATOR"]);
  const { error } = await searchParams;
  const errorMessages: Record<string, string> = {
    "missing-fields": "Name, category, and serial number are required.",
    "invalid-name": "Name must be between 2 and 120 characters.",
    "invalid-category": "Category must be between 2 and 80 characters.",
    "invalid-serial": "Serial number must be between 2 and 120 characters.",
    "invalid-cost": "Cost must be a non-negative number.",
    "duplicate-serial": "An asset with that serial number already exists.",
  };

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Register asset</CardTitle>
            <CardDescription>
              Add campus equipment to the tracked inventory. A unique asset ID and
              QR token are generated automatically.
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
                        message: errorMessages[error] ?? "Asset registration failed.",
                        type: "error",
                      },
                    ]
                  : []
              }
            />
            <form action={createAssetAction} className="grid gap-4">
              <Field label="Asset name">
                <Input name="name" placeholder="Dell OptiPlex 7090" required />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category">
                  <Input name="category" placeholder="Computer, Furniture, Lab" required />
                </Field>
                <Field label="Serial number">
                  <Input name="serialNumber" required />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Purchase date">
                  <Input name="purchaseDate" type="date" />
                </Field>
                <Field label="Cost">
                  <Input name="cost" type="number" min="0" step="0.01" placeholder="0.00" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Condition">
                  <Input name="condition" placeholder="New, Good, Fair" />
                </Field>
                <Field label="Owning department">
                  <Input name="owningDepartment" placeholder="Computer Science" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Building">
                  <Input name="building" placeholder="Block A" />
                </Field>
                <Field label="Room">
                  <Input name="room" placeholder="Room 204" />
                </Field>
                <Field label="Storage">
                  <Input name="storage" placeholder="Shelf 3" />
                </Field>
              </div>
              <SubmitButton loadingText="Registering...">Register asset</SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
