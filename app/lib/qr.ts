import { randomBytes } from "crypto";

/**
 * Dependency-free QR helpers (P0.4 — reused by AST-6 asset scanning and, later,
 * EVT-6 event check-in). We intentionally avoid adding an npm QR dependency:
 * each scannable entity stores a unique `qrToken`, and the value encoded by a
 * QR image is the deterministic scan URL produced here. The actual SVG/PNG
 * raster can be rendered later (client-side or via a service) from this value.
 */

/** Generate a unique, opaque token to embed in a QR scan target. */
export function generateQrToken() {
  return randomBytes(16).toString("hex");
}

/**
 * Deterministic scan URL for an asset. The QR image should encode this string.
 * Visiting it with the matching `qr` token records a scan (see /assets/[id]).
 */
export function assetScanPath(assetDbId: string, qrToken: string) {
  return `/assets/${assetDbId}?qr=${qrToken}`;
}

/** Absolute scan URL when a base origin is known (e.g. for printable labels). */
export function assetScanUrl(baseUrl: string, assetDbId: string, qrToken: string) {
  return `${baseUrl.replace(/\/$/, "")}${assetScanPath(assetDbId, qrToken)}`;
}
