import { describe, it, expect, beforeEach, vi } from "vitest";

// lib/settings.ts uses `useSyncExternalStore` (React) and `window.localStorage`.
// We test the pure storage logic — loadMode / saveMode — in a Node environment
// by providing a minimal localStorage mock.

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

// Inject localStorage into globalThis before importing the module
vi.stubGlobal("localStorage", localStorageMock);
vi.stubGlobal("window", { localStorage: localStorageMock, addEventListener: () => {}, removeEventListener: () => {} });

// Import AFTER stubbing globals so the module picks up the mock
const { loadMode, saveMode } = await import("../settings.js");

describe("settings — AgentMode store", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("defaults to demo mode when nothing is stored", () => {
    expect(loadMode()).toBe("demo");
  });

  it("returns demo when localStorage contains 'demo'", () => {
    localStorageMock.setItem("voc_agent_mode", "demo");
    expect(loadMode()).toBe("demo");
  });

  it("returns live when localStorage contains 'live'", () => {
    localStorageMock.setItem("voc_agent_mode", "live");
    expect(loadMode()).toBe("live");
  });

  it("falls back to demo for an unrecognised stored value", () => {
    localStorageMock.setItem("voc_agent_mode", "unknown_value");
    expect(loadMode()).toBe("demo");
  });

  it("saveMode persists the mode and loadMode reads it back", () => {
    saveMode("live");
    expect(loadMode()).toBe("live");

    saveMode("demo");
    expect(loadMode()).toBe("demo");
  });

  it("saveMode('live') does not leave demo mode active", () => {
    saveMode("live");
    expect(loadMode()).not.toBe("demo");
  });
});
