"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getSession,
  homeForRole,
  login as loginRequest,
  loginAsDemo,
  logout as logoutRequest,
} from "@/services/auth.service";
import { onSessionExpired } from "@/lib/auth/session-store";
import { CHANGE_PASSWORD_PATH } from "@/lib/constants";
import type { LoginInput, Session, UserRole } from "@/types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  session: Session | null;
  status: AuthStatus;
  login: (input: LoginInput) => Promise<Session>;
  demoLogin: (role: UserRole) => Promise<Session>;
  logout: () => Promise<void>;
  /** Replace the session after the server returns a fresh copy (e.g. after a password change). */
  updateSession: (session: Session) => void;
  /** Where the user belongs now: their home, or the password page if they must change it. */
  homePath: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let active = true;
    getSession()
      .then((next) => {
        if (!active) return;
        setSession(next);
        setStatus(next ? "authenticated" : "unauthenticated");
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setStatus("unauthenticated");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () =>
      onSessionExpired(() => {
        setSession(null);
        setStatus("unauthenticated");
      }),
    [],
  );

  const login = useCallback(async (input: LoginInput) => {
    const next = await loginRequest(input);
    setSession(next);
    setStatus("authenticated");
    return next;
  }, []);

  const demoLogin = useCallback(async (role: UserRole) => {
    const next = await loginAsDemo(role);
    setSession(next);
    setStatus("authenticated");
    return next;
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setSession(null);
    setStatus("unauthenticated");
  }, []);

  const updateSession = useCallback((next: Session) => {
    setSession(next);
    setStatus("authenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      status,
      login,
      demoLogin,
      logout,
      updateSession,
      homePath: !session
        ? "/login"
        : session.mustChangePassword
          ? CHANGE_PASSWORD_PATH
          : homeForRole(session.role),
    }),
    [demoLogin, login, logout, session, status, updateSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
