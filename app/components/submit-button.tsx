"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  loadingText = "Working...",
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  loadingText?: string;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      aria-disabled={pending}
      className={className}
      disabled={pending}
      variant={variant === "primary" ? "default" : "outline"}
      type="submit"
    >
      {pending ? loadingText : children}
    </Button>
  );
}
