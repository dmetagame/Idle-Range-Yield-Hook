import type { ReactNode } from "react";

import { Topbar } from "./Topbar";
import { Footer } from "./Footer";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Topbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-10">
        {children}
      </main>
      <Footer />
    </div>
  );
}
