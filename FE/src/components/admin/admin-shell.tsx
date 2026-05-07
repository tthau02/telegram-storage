"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { clientRoutes } from "@/config/routes";
import { getStoredAccessToken, isAuthExpired } from "@/lib/auth-storage";
import { useAppTheme } from "@/store/hooks";
import { cn } from "@/lib/utils";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = React.useState(false);

  useIsomorphicLayoutEffect(() => {
    const token = getStoredAccessToken();
    if (!token || isAuthExpired()) {
      router.replace(clientRoutes.login);
      return;
    }
    setAllowed(true);
  }, [router]);

  if (!allowed) {
    return (
      <div
        role="status"
        aria-label="Đang tải"
        className="flex min-h-dvh items-center justify-center bg-neutral-cool"
      >
        <Loader2
          className="size-9 animate-spin text-muted-foreground"
          strokeWidth={1.75}
          aria-hidden
        />
      </div>
    );
  }

  return <>{children}</>;
}

function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const { theme } = useAppTheme();

  /**
   * Drawer / Popover / Select portal vào `document.body`, ngoài cây DOM của shell.
   * Gắn `dark` lên `document.documentElement` để token `--card`, `--popover`, … áp dụng cho mọi portal.
   */
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    return () => root.classList.remove("dark");
  }, [theme]);

  return (
    <div
      data-app-shell="admin"
      className={cn(
        "flex min-h-full min-w-0 flex-1 flex-col bg-neutral-cool text-foreground md:flex-row",
      )}
    >
      <AdminSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-neutral-cool">
        <AdminHeader />
        <div className="flex-1 overflow-auto p-3 md:p-4">{children}</div>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGate>
      <AdminShellLayout>{children}</AdminShellLayout>
    </AdminAuthGate>
  );
}
