"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { subscribeToInvalidation } from "@/lib/query";

type QueryResult<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: string };

/** Result tagged with the dependency key it was fetched for. */
type KeyedResult<T> = QueryResult<T> & { key: string };

const LOADING = { status: "loading", data: null, error: null } as const;

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load data.";
}

/**
 * Minimal data-fetching hook.
 *
 * `deps` identify the request: when they change, the hook reports "loading"
 * until the new result arrives. Results are re-fetched whenever a service
 * calls `invalidateQueries()`.
 */
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[] = [], enabled = true) {
  const key = JSON.stringify(deps);
  const [result, setResult] = useState<KeyedResult<T>>({ ...LOADING, key: "" });
  const [nonce, setNonce] = useState(0);

  const load = useEffectEvent(() => fn());

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    function run() {
      load()
        .then((data) => {
          if (active) setResult({ status: "success", data, error: null, key });
        })
        .catch((error: unknown) => {
          if (active) setResult({ status: "error", data: null, error: toMessage(error), key });
        });
    }

    run();
    const unsubscribe = subscribeToInvalidation(run);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [key, enabled, nonce]);

  const refetch = useCallback(() => {
    // Keep showing existing data while refreshing; only an error resets to loading.
    setResult((current) => (current.status === "error" ? { ...LOADING, key: "" } : current));
    setNonce((value) => value + 1);
  }, []);

  const state: QueryResult<T> = result.key === key ? result : LOADING;
  return { ...state, refetch };
}
