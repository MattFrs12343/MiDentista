import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { PageHeaderProvider } from "@/components/layout/PageHeaderContext";
import { AppBackground } from "@/components/ui/app-background";

export function AppShell() {
  return (
    <PageHeaderProvider>
      <AppBackground />
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto px-8 py-8">
            <div className="mx-auto max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </PageHeaderProvider>
  );
}
