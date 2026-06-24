import type { ValidationResult } from "@/app/lib/validation";

/**
 * File/image upload primitive (P0.3 — reused by MNT-3 ticket photos and, later,
 * STU-4 profile photos).
 *
 * There is no blob storage wired up in this environment, so tickets persist
 * image *references* (URLs/paths) rather than binary data. This module supplies
 * the format + size validation that any future real upload pipeline must run,
 * plus helpers to parse and validate the URL references we store today. When a
 * storage backend is added, `storeUpload` is the single seam to implement.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ATTACHMENTS = 5;

export const ALLOWED_IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
] as const;

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

function extensionOf(value: string): string {
  const clean = value.split(/[?#]/)[0] ?? value;
  const dot = clean.lastIndexOf(".");
  return dot === -1 ? "" : clean.slice(dot + 1).toLowerCase();
}

/**
 * Validate an uploaded file's format and size. Used by a real upload pipeline
 * (the binary is not stored here, only checked).
 */
export function validateImageFile(file: {
  name: string;
  size: number;
  type: string;
}): ValidationResult {
  if (!file.name || file.size <= 0) {
    return { ok: false, error: "invalid-file" };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "file-too-large" };
  }

  const okMime = (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(
    file.type,
  );
  const okExt = (ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(
    extensionOf(file.name),
  );

  if (!okMime && !okExt) {
    return { ok: false, error: "unsupported-format" };
  }

  return { ok: true };
}

/** Validate a single image attachment reference (an http(s) URL or a path). */
export function validateImageAttachmentUrl(url: string): ValidationResult {
  const value = url.trim();

  if (!value || value.length > 2048) {
    return { ok: false, error: "invalid-attachment" };
  }

  const isHttp = /^https?:\/\//i.test(value);
  const isPath = value.startsWith("/");

  if (!isHttp && !isPath) {
    return { ok: false, error: "invalid-attachment" };
  }

  if (
    !(ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(extensionOf(value))
  ) {
    return { ok: false, error: "unsupported-format" };
  }

  return { ok: true };
}

/**
 * Parse a raw textarea/value into a de-duplicated list of attachment URLs
 * (split on newlines or commas, blanks dropped).
 */
export function parseAttachmentUrls(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

/**
 * Validate a list of attachment URLs as a batch (count + each entry). Returns
 * the cleaned list on success.
 */
export function validateAttachments(
  urls: string[],
): { ok: true; urls: string[] } | { ok: false; error: string } {
  if (urls.length > MAX_ATTACHMENTS) {
    return { ok: false, error: "too-many-attachments" };
  }

  for (const url of urls) {
    const result = validateImageAttachmentUrl(url);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
  }

  return { ok: true, urls };
}
