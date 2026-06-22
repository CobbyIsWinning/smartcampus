"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordField({
  name,
  autoComplete,
  minLength,
}: {
  name: string;
  autoComplete?: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        autoComplete={autoComplete}
        className="pr-20"
        minLength={minLength}
        name={name}
        required
        type={visible ? "text" : "password"}
      />
      <Button
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-0 top-1/2 -translate-y-1/2"
        onClick={() => setVisible((current) => !current)}
        size="sm"
        type="button"
        variant="ghost"
      >
        {visible ? "Hide" : "Show"}
      </Button>
    </div>
  );
}
