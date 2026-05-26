import type { ReactNode } from "react";

import { Topbar } from "./Topbar";
import { Footer } from "./Footer";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Topbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
