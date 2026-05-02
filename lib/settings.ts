"use client";

import { useSyncExternalStore } from "react";

export type AgentMode = "live" | "demo";

const KEY = "voc_agent_mode";
const DEFAULT_MODE: AgentMode = "demo";

const listeners = new Set<() => void>();

export function loadMode(): AgentMode {
  if (typeof window === "undefined") return DEFAULT_MODE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === "demo" || raw === "live") return raw;
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_MODE;
}

export function saveMode(mode: AgentMode): void {
  try {
    window.localStorage.setItem(KEY, mode);
  } catch {
    // ignore
  }
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const handler = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handler);
  }
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handler);
    }
  };
}

export function useAgentMode(): AgentMode {
  return useSyncExternalStore(
    subscribe,
    () => loadMode(),
    () => DEFAULT_MODE,
  );
}
