"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

type ToastSpec = {
  key: string;
  value: string;
  message: string;
  type?: "success" | "error" | "info";
};

export function ActionToast({ specs }: { specs: ToastSpec[] }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const match = specs.find(
      (spec) => searchParams.get(spec.key) === spec.value,
    );

    if (!match) {
      handledRef.current = null;
      return;
    }

    const token = `${pathname}:${match.key}:${match.value}`;
    if (handledRef.current === token) {
      return;
    }

    handledRef.current = token;

    if (match.type === "error") {
      toast.error(match.message);
    } else if (match.type === "info") {
      toast(match.message);
    } else {
      toast.success(match.message);
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete(match.key);
    const nextUrl = nextParams.size > 0 ? `${pathname}?${nextParams}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams, specs]);

  return null;
}
