"use client";

import { HistoryProvider } from "@/context/HistoryContext";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return <HistoryProvider>{children}</HistoryProvider>;
}
