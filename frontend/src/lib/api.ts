/**
 * Authenticated fetch wrapper for backend API calls.
 *
 * All calls to protected endpoints must include the internal API key
 * as a Bearer token. This helper centralizes that concern so individual
 * components don't have to remember to add the header.
 *
 * Usage:
 *   import { apiFetch } from "@/lib/api";
 *   const res = await apiFetch("/api/materials/upload", { method: "POST", body: formData });
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const INTERNAL_API_KEY = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || "";

/**
 * Wrapper around `fetch` that:
 * 1. Prepends the backend base URL.
 * 2. Attaches the Authorization: Bearer header for protected routes.
 * 3. Does NOT attach the header for auth-specific routes (/api/auth/register)
 *    so public registration still works.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const isPublicRoute = path === "/api/auth/register";

  const headers = new Headers(init.headers);

  if (!isPublicRoute && INTERNAL_API_KEY) {
    headers.set("Authorization", `Bearer ${INTERNAL_API_KEY}`);
  }

  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  });
}
