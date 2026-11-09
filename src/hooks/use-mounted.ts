"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** False during server render and hydration, true once running on the client. */
export function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
