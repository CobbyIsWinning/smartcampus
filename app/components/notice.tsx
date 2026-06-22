import { cn } from "@/lib/utils";

export function Notice({
  children,
  variant = "info",
}: {
  children: React.ReactNode;
  variant?: "info" | "success" | "error";
}) {
  return (
    <div
      className={cn(
        "mb-5 border px-4 py-3 text-sm",
        variant === "success" && "border-primary/20 bg-primary/5 text-foreground",
        variant === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
        variant === "info" && "border-border bg-muted/40 text-foreground",
      )}
    >
      {children}
    </div>
  );
}
