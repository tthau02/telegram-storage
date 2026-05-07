"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  ChevronDown,
  LogOut,
  Moon,
  Settings,
  Sun,
  User,
} from "lucide-react";

import { useAppTheme } from "@/store/hooks";
import { Switch } from "@/components/ui/switch";
import { branding } from "@/config/branding";
import { clientRoutes } from "@/config/routes";
import { authService } from "@/services/auth-service";
import {
  clearAuthStorage,
  getStoredAccessToken,
} from "@/lib/auth-storage";
import { cn } from "@/lib/utils";

const menuItemClass =
  "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm tracking-[-0.01em] text-foreground transition-colors hover:bg-muted active:bg-muted/80";

function AdminThemeToggle() {
  const { theme, setTheme } = useAppTheme();
  const dark = theme === "dark";

  return (
    <div className="flex items-center gap-2 rounded-full border border-border px-2 py-1 pl-2.5">
      <Sun
        className="size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden
      />
      <Switch
        checked={dark}
        onCheckedChange={(on) => setTheme(on ? "dark" : "light")}
        size="sm"
        aria-label={dark ? "Đang dùng giao diện tối" : "Đang dùng giao diện sáng"}
      />
      <Moon
        className="size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden
      />
    </div>
  );
}

export function AdminHeader() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuPortalRef = useRef<HTMLDivElement>(null);
  const [menuPlacement, setMenuPlacement] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const menuId = useId();

  const updateMenuPlacement = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPlacement({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  }, []);

  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuPlacement(null);
      return;
    }
    updateMenuPlacement();
  }, [menuOpen, updateMenuPlacement]);

  useEffect(() => {
    if (!menuOpen) return;
    const onScrollOrResize = () => updateMenuPlacement();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [menuOpen, updateMenuPlacement]);

  useEffect(() => {
    function handlePointer(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || menuPortalRef.current?.contains(t)) {
        return;
      }
      setMenuOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    const token = getStoredAccessToken();
    if (token) {
      try {
        await authService.logout(token);
      } catch {
        /* vẫn xóa phiên cục bộ */
      }
    }
    clearAuthStorage();
    router.replace(clientRoutes.login);
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center border-b border-border bg-card px-4 md:px-6">
      <div className="flex w-full items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-base font-semibold tracking-tight text-foreground md:text-lg">
            Bảng điều khiển
          </h1>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <AdminThemeToggle />

          <button
            type="button"
            className="relative flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
            aria-label="Thông báo"
            title="Thông báo"
          >
            <Bell className="size-[20px]" strokeWidth={1.5} aria-hidden />
            <span
              className="absolute top-2 right-2.5 size-2 rounded-full border-2 border-card bg-destructive"
              aria-hidden
            />
          </button>

          <div className="relative" ref={wrapRef}>
            <button
              ref={triggerRef}
              type="button"
              id={`${menuId}-trigger`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={menuOpen ? `${menuId}-menu` : undefined}
              onClick={() => setMenuOpen((o) => !o)}
              className={cn(
                "flex items-center gap-2 rounded-full border border-border bg-card p-1 pr-3 transition-all hover:bg-muted active:scale-[0.98]",
                menuOpen && "bg-muted ring-2 ring-ring/30",
              )}
            >
              <div
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-house text-[10px] font-bold text-(--text-on-dark) shadow-sm"
                aria-hidden
              >
                QT
              </div>
              <span className="hidden max-w-[100px] truncate text-sm font-medium tracking-tight text-foreground lg:inline">
                Quản trị viên
              </span>
              <ChevronDown
                className={cn(
                  "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                  menuOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>

            {menuOpen && menuPlacement && typeof document !== "undefined"
              ? createPortal(
                  <div
                    ref={menuPortalRef}
                    id={`${menuId}-menu`}
                    role="menu"
                    aria-labelledby={`${menuId}-trigger`}
                    style={{
                      position: "fixed",
                      top: menuPlacement.top,
                      right: menuPlacement.right,
                    }}
                    className="z-99999 min-w-[200px] origin-top-right rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg animate-in fade-in zoom-in-95 duration-100 dark:shadow-black/40"
                  >
                    <div className="mb-1 border-b border-border px-3 py-2 lg:hidden">
                      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        Tài khoản
                      </p>
                      <p className="truncate text-sm font-medium text-foreground">
                        Quản trị viên
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {branding.appNameShort}
                      </p>
                    </div>

                    <Link
                      href="#"
                      role="menuitem"
                      className={menuItemClass}
                      onClick={() => setMenuOpen(false)}
                    >
                      <User className="size-4 shrink-0 opacity-70" aria-hidden />
                      Hồ sơ cá nhân
                    </Link>
                    <Link
                      href="#"
                      role="menuitem"
                      className={menuItemClass}
                      onClick={() => setMenuOpen(false)}
                    >
                      <Settings
                        className="size-4 shrink-0 opacity-70"
                        aria-hidden
                      />
                      Cài đặt hệ thống
                    </Link>

                    <div className="my-1.5 h-px bg-border" role="separator" />

                    <button
                      type="button"
                      role="menuitem"
                      className={cn(
                        menuItemClass,
                        "text-destructive hover:bg-destructive/10 hover:text-destructive",
                      )}
                      onClick={() => void handleLogout()}
                    >
                      <LogOut className="size-4 shrink-0" aria-hidden />
                      Đăng xuất
                    </button>
                  </div>,
                  document.body,
                )
              : null}
          </div>
        </div>
      </div>
    </header>
  );
}
