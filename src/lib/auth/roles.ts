import type { Session, UserRole } from "@/types";

export function hasRole(session: Session | null, role: UserRole) {
  return session?.role === role;
}

export function canAccessPath(session: Session | null, pathname: string) {
  if (!session) return pathname === "/login" || pathname === "/forgot-password";
  if (session.role === "admin") return pathname.startsWith("/admin");
  return !pathname.startsWith("/admin");
}
