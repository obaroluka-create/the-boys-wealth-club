/**
 * Network boundary.
 *
 * When `NEXT_PUBLIC_API_URL` is set, services call that host with the
 * stored access token. Until then they stay on the mock platform.
 * UI components should keep importing from services, never from `/src/data/mock`.
 */

import { clearAccessToken, readAccessToken } from "@/lib/auth/session-store";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
}

export function hasRemoteApi() {
  return getApiBaseUrl().length > 0;
}

export async function apiDelay(ms = 320) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: { skipAuthRedirect?: boolean } = {},
): Promise<T> {
  const token = readAccessToken();
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers });

  if (response.status === 401) {
    clearAccessToken();
    if (!options.skipAuthRedirect && typeof window !== "undefined") {
      window.location.assign("/login");
    }
    throw new ApiError("Your session has expired. Sign in again.", 401);
  }

  if (!response.ok) {
    let message = response.statusText || "Request failed.";
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // keep status text
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function callService<T>(
  path: string,
  init: RequestInit | undefined,
  mock: () => T | Promise<T>,
  options?: { skipAuthRedirect?: boolean },
): Promise<T> {
  if (hasRemoteApi()) {
    return apiRequest<T>(path, init, options);
  }
  await apiDelay();
  return mock();
}
