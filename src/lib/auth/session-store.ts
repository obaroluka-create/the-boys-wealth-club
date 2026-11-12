import { SESSION_STORAGE_KEY } from "@/lib/constants";

interface StoredAuth {
  token: string;
  remember: boolean;
}

function storage(remember: boolean) {
  if (typeof window === "undefined") return null;
  return remember ? window.localStorage : window.sessionStorage;
}

export function persistAccessToken(token: string, remember: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  storage(remember)?.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token, remember } satisfies StoredAuth));
}

export function readAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const raw =
    window.localStorage.getItem(SESSION_STORAGE_KEY) ??
    window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuth>;
    return typeof parsed.token === "string" && parsed.token ? parsed.token : null;
  } catch {
    return null;
  }
}

export function clearAccessToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

const UNAUTHORIZED_EVENT = "auth:unauthorized";

/** Tell the app the stored session was rejected so it can return to sign-in. */
export function notifySessionExpired() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}

export function onSessionExpired(listener: () => void) {
  window.addEventListener(UNAUTHORIZED_EVENT, listener);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, listener);
}
