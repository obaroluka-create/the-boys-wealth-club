"use client";

import { useCallback, useEffect, useState } from "react";
import { subscribeToInvalidation } from "@/lib/query";

type QueryState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: string };

export function useQuery<T>(fn: () => Promise<T>, deps: unknown[] = [], enabled = true) {
  const [state, setState] = useState<QueryState<T>>({
    status: "loading",
    data: null,
    error: null,
  });

  const refetch = useCallback(async () => {
    setState((current) =>
      current.status === "success"
        ? current
        : { status: "loading", data: null, error: null },
    );
    try {
      const data = await fn();
      setState({ status: "success", data, error: null });
    } catch (error) {
      setState({
        status: "error",
        data: null,
        error: error instanceof Error ? error.message : "Unable to load data.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setState({ status: "loading", data: null, error: null });
    fn()
      .then((data) => {
        if (active) setState({ status: "success", data, error: null });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: "error",
            data: null,
            error: error instanceof Error ? error.message : "Unable to load data.",
          });
        }
      });
    const unsubscribe = subscribeToInvalidation(() => {
      if (!enabled) return;
      fn()
        .then((data) => {
          if (active) setState({ status: "success", data, error: null });
        })
        .catch(() => undefined);
    });
    return () => {
      active = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);

  return { ...state, refetch };
}
