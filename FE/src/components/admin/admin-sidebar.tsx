"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronsLeft, ChevronsRight } from "lucide-react";
import {
  type AdminNavItem,
  adminNavTree,
  filterAdminNavTree,
  isAdminNavBranchActive,
  isAdminNavHrefActive,
} from "@/config/admin-nav";
import { branding } from "@/config/branding";
import { clientRoutes } from "@/config/routes";
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const STORAGE_COLLAPSED = "admin-sidebar-collapsed";

const expanderEase = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";
const expanderMs = "300ms";

export type AdminSidebarProps = {
  userPermissions?: readonly string[];
};

const rowLink = cn(
  "flex min-h-10 w-full items-center gap-2 rounded-[12px] px-3 py-2 text-sm tracking-[-0.01em] transition-colors",
);

function collectOpenIdsForPath(
  nodes: readonly AdminNavItem[],
  pathname: string,
): Set<string> {
  const ids = new Set<string>();
  function walk(items: readonly AdminNavItem[]): boolean {
    let anyActive = false;
    for (const n of items) {
      if (n.children?.length) {
        const childActive = walk(n.children);
        const selfActive =
          n.href !== undefined && isAdminNavHrefActive(pathname, n.href);
        if (childActive || selfActive) {
          ids.add(n.id);
          anyActive = true;
        }
      } else if (n.href && isAdminNavHrefActive(pathname, n.href)) {
        anyActive = true;
      }
    }
    return anyActive;
  }
  walk(nodes);
  return ids;
}

function ExpandedNavRows({
  items,
  pathname,
  depth,
  expandedIds,
  toggleSection,
}: {
  items: AdminNavItem[];
  pathname: string;
  depth: number;
  expandedIds: ReadonlySet<string>;
  toggleSection: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5",
        depth > 0 && "ml-1 border-l border-[var(--text-on-dark)]/15 pl-2",
      )}
    >
      {items.map((item) => {
        if (item.children?.length) {
          const open = expandedIds.has(item.id);
          const branchActive = isAdminNavBranchActive(item, pathname);

          return (
            <div key={item.id} className="flex flex-col gap-0.5">
              <div className="flex items-stretch gap-0.5">
                {item.href ? (
                  <Link
                    href={item.href}
                    className={cn(
                      rowLink,
                      "min-w-0 flex-1",
                      isAdminNavHrefActive(pathname, item.href) || branchActive
                        ? "bg-[var(--text-on-dark)]/15 font-medium text-[var(--text-on-dark)]"
                        : "text-[var(--text-on-dark-muted)] hover:bg-[var(--text-on-dark)]/10 hover:text-[var(--text-on-dark)]",
                    )}
                  >
                    <item.icon
                      className="size-4 shrink-0 opacity-90"
                      aria-hidden
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleSection(item.id)}
                    className={cn(
                      rowLink,
                      "flex-1 text-left",
                      branchActive
                        ? "bg-[var(--text-on-dark)]/10 text-[var(--text-on-dark)]"
                        : "text-[var(--text-on-dark-muted)] hover:bg-[var(--text-on-dark)]/10 hover:text-[var(--text-on-dark)]",
                    )}
                  >
                    <item.icon
                      className="size-4 shrink-0 opacity-90"
                      aria-hidden
                    />
                    <span className="flex-1 truncate text-xs font-semibold tracking-wide uppercase">
                      {item.label}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 opacity-90 transition-transform",
                        open && "rotate-180",
                      )}
                      style={{
                        transitionDuration: expanderMs,
                        transitionTimingFunction: expanderEase,
                      }}
                      aria-hidden
                    />
                  </button>
                )}

                {item.href ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(item.id)}
                    className={cn(
                      "flex w-9 shrink-0 items-center justify-center rounded-[12px] text-[var(--text-on-dark-muted)] transition-colors hover:bg-[var(--text-on-dark)]/10 hover:text-[var(--text-on-dark)]",
                      branchActive && "text-[var(--text-on-dark)]",
                    )}
                    aria-expanded={open}
                    aria-label={open ? "Thu gọn nhóm" : "Mở rộng nhóm"}
                  >
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform",
                        open && "rotate-180",
                      )}
                      style={{
                        transitionDuration: expanderMs,
                        transitionTimingFunction: expanderEase,
                      }}
                    />
                  </button>
                ) : null}
              </div>

              <div
                className="grid min-h-0 transition-[grid-template-rows]"
                style={{
                  gridTemplateRows: open ? "1fr" : "0fr",
                  transitionDuration: expanderMs,
                  transitionTimingFunction: expanderEase,
                }}
              >
                <div className="overflow-hidden">
                  <ExpandedNavRows
                    items={item.children}
                    pathname={pathname}
                    depth={depth + 1}
                    expandedIds={expandedIds}
                    toggleSection={toggleSection}
                  />
                </div>
              </div>
            </div>
          );
        }

        if (!item.href) return null;
        const active = isAdminNavHrefActive(pathname, item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              rowLink,
              active
                ? "bg-[var(--text-on-dark)]/15 font-medium text-[var(--text-on-dark)]"
                : "text-[var(--text-on-dark-muted)] hover:bg-[var(--text-on-dark)]/10 hover:text-[var(--text-on-dark)]",
            )}
          >
            <item.icon className="size-4 shrink-0 opacity-90" aria-hidden />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function CollapsedRail({
  items,
  pathname,
}: {
  items: AdminNavItem[];
  pathname: string;
}) {
  const [flyoutId, setFlyoutId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setFlyoutId(null);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={rootRef} className="flex flex-col gap-1 p-2">
      {items.map((item) => {
        if (item.children?.length) {
          const open = flyoutId === item.id;
          return (
            <div key={item.id} className="relative flex justify-center">
              <button
                type="button"
                onClick={() => setFlyoutId(open ? null : item.id)}
                className={cn(
                  "flex size-10 items-center justify-center rounded-[12px] text-[var(--text-on-dark-muted)] transition-colors hover:bg-[var(--text-on-dark)]/10 hover:text-[var(--text-on-dark)]",
                  isAdminNavBranchActive(item, pathname) &&
                    "bg-[var(--text-on-dark)]/15 text-[var(--text-on-dark)]",
                )}
                title={item.label}
                aria-expanded={open}
              >
                <item.icon className="size-5 shrink-0 opacity-95" aria-hidden />
              </button>
              {open && (
                <div
                  className="absolute top-0 left-full z-50 ml-2 min-w-[12.5rem] rounded-[12px] border border-[var(--text-on-dark)]/12 bg-[var(--brand-house)] py-2 shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_8px_24px_rgba(0,0,0,0.18)]"
                  role="menu"
                >
                  <p className="border-b border-[var(--text-on-dark)]/12 px-3 pb-2 text-xs font-semibold tracking-wide text-[var(--text-on-dark-muted)] uppercase">
                    {item.label}
                  </p>
                  <div className="flex flex-col gap-0.5 p-1">
                    {item.children.map((child) => {
                      if (!child.href) return null;
                      const active = isAdminNavHrefActive(pathname, child.href);
                      return (
                        <Link
                          key={child.id}
                          href={child.href}
                          onClick={() => setFlyoutId(null)}
                          className={cn(
                            "flex items-center gap-2 rounded-[12px] px-3 py-2 text-sm tracking-[-0.01em]",
                            active
                              ? "bg-[var(--text-on-dark)]/15 font-medium text-[var(--text-on-dark)]"
                              : "text-[var(--text-on-dark-muted)] hover:bg-[var(--text-on-dark)]/10 hover:text-[var(--text-on-dark)]",
                          )}
                        >
                          <child.icon
                            className="size-4 shrink-0 opacity-90"
                            aria-hidden
                          />
                          <span className="truncate">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        }

        if (!item.href) return null;
        const active = isAdminNavHrefActive(pathname, item.href);
        return (
          <div key={item.id} className="flex justify-center">
            <Link
              href={item.href}
              title={item.label}
              className={cn(
                "flex size-10 items-center justify-center rounded-[12px] text-[var(--text-on-dark-muted)] transition-colors hover:bg-[var(--text-on-dark)]/10 hover:text-[var(--text-on-dark)]",
                active &&
                  "bg-[var(--text-on-dark)]/15 text-[var(--text-on-dark)]",
              )}
            >
              <item.icon className="size-5 shrink-0 opacity-95" aria-hidden />
            </Link>
          </div>
        );
      })}
    </div>
  );
}

export function AdminSidebar({ userPermissions }: AdminSidebarProps) {
  const pathname = usePathname() ?? "";
  const visible = useMemo(
    () => filterAdminNavTree(adminNavTree, userPermissions),
    [userPermissions],
  );

  const [collapsed, setCollapsed] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    try {
      if (
        typeof window !== "undefined" &&
        localStorage.getItem(STORAGE_COLLAPSED) === "1"
      ) {
        setCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COLLAPSED, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      for (const id of collectOpenIdsForPath(visible, pathname)) next.add(id);
      return next;
    });
  }, [pathname, visible]);

  const toggleSection = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <SidebarProvider defaultOpen={!collapsed}>
      <Sidebar
        data-collapsed={collapsed ? "" : undefined}
        aria-label="Điều hướng quản trị"
        className={cn(
          // relative + overflow-visible để button absolute thoát ra ngoài
          "relative overflow-visible border-r border-[var(--text-on-dark)]/12 bg-[var(--brand-house)] text-[var(--text-on-dark)] transition-[width] motion-reduce:transition-none md:flex",
          collapsed ? "w-14" : "w-full md:w-56 lg:w-64",
        )}
        style={{
          transitionDuration: expanderMs,
          transitionTimingFunction: expanderEase,
        }}
      >
        {/* Header */}
        <div
          className={cn(
            "border-b border-[var(--text-on-dark)]/12 transition-[padding] motion-reduce:transition-none",
            collapsed ? "px-2 py-3" : "px-4 py-4",
          )}
          style={{
            transitionDuration: expanderMs,
            transitionTimingFunction: expanderEase,
          }}
        >
          {collapsed ? (
            <div className="flex justify-center" aria-hidden>
              <span className="flex size-10 items-center justify-center rounded-[12px] bg-[var(--text-on-dark)]/10 text-sm font-semibold text-[var(--text-on-dark)]">
                {branding.collapsedMonogram}
              </span>
            </div>
          ) : (
            <>
              <p className="text-xs font-medium tracking-wide text-[var(--text-on-dark-muted)] uppercase">
                Quản trị
              </p>
              <p className="mt-1 text-lg font-semibold tracking-[-0.01em] text-[var(--text-on-dark)]">
                {branding.appName}
              </p>
            </>
          )}
        </div>

        {/* Nav */}
        <nav
          className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden"
          aria-label="Admin"
        >
          {collapsed ? (
            <CollapsedRail items={visible} pathname={pathname} />
          ) : (
            <div className="p-2">
              <ExpandedNavRows
                items={visible}
                pathname={pathname}
                depth={0}
                expandedIds={expandedIds}
                toggleSection={toggleSection}
              />
            </div>
          )}
        </nav>

        {/* Toggle button — floating ra ngoài cạnh phải sidebar */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "absolute -right-3.5 bottom-[4.5rem] z-40",
            "flex size-7 items-center justify-center rounded-full",
            // Nền lấy màu sidebar để "gắn" liền vào cạnh
            "bg-[var(--brand-house)] text-[var(--text-on-dark)]",
            // Viền + shadow để nổi bật trên content bên phải
            "ring-1 ring-[var(--text-on-dark)]/20 shadow-md",
            "transition-colors hover:bg-[var(--text-on-dark)]/15",
          )}
          aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          title={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
        >
          {collapsed ? (
            <ChevronsRight className="size-3.5" strokeWidth={2.5} aria-hidden />
          ) : (
            <ChevronsLeft className="size-3.5" strokeWidth={2.5} aria-hidden />
          )}
        </button>
      </Sidebar>
    </SidebarProvider>
  );
}
