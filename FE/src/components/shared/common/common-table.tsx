"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type CommonColumnType =
  | "text"
  | "number"
  | "date"
  | "datetime"
  | "currency"
  | "badge"
  | "boolean"
  | "email"
  | "link"
  | "img"
  | "custom";

export type SortDirection = "asc" | "desc";

/**
 * Class trong `globals.css` (`.badge-light-*`) — dùng với `CommonTableColumn.badgeMapping`.
 * Tương tự enum Angular `STATUS_BADGE_CLASSES`.
 */
export enum STATUS_BADGE_CLASSES {
  SUCCESS = "badge-light-success",
  WARNING = "badge-light-warning",
  DANGER = "badge-light-danger",
  INFO = "badge-light-info",
  SECONDARY = "badge-light-secondary",
  PRIMARY = "badge-light-primary",
  LIGHT = "badge-light",
  DARK = "badge-light-dark",
}

/** Một dòng map: `key` khớp `Object.is` với `row[column.id]` → `text` + `badgeClass`. */
export type CommonTableBadgeMappingEntry = {
  key: unknown;
  text: string;
  badgeClass: STATUS_BADGE_CLASSES | string;
};

/** Giá trị ô kiểu `link`: chuỗi URL hoặc href + nhãn */
export type LinkCellValue =
  | string
  | { href: string; label: string; external?: boolean };

/** Giá trị ô kiểu `img`: URL hoặc src + alt */
export type ImageCellValue = string | { src: string; alt?: string };

export interface CommonTableColumn<T> {
  /** Key trên object row */
  id: Extract<keyof T, string>;
  /** Tiêu đề cột (header) */
  label: string;
  /** Cách hiển thị ô mặc định khi không dùng `renderCell` */
  type?: CommonColumnType;
  /** Bật nút sort trên header */
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  /** Tuỳ biến nội dung ô */
  renderCell?: (row: T) => React.ReactNode;

  /** `link`: nhãn từ field khác, `id` là URL (chuỗi) */
  linkLabelKey?: Extract<keyof T, string>;
  /** `link`: href từ field khác, `id` là nhãn (chuỗi) — tiện sort theo tên */
  linkHrefKey?: Extract<keyof T, string>;
  /** `link`: ép mở tab mới / rel noopener */
  linkExternal?: boolean;

  /** `img`: kích thước thumb trong bảng */
  imageSize?: "xs" | "sm" | "md" | "lg";
  /** `img`: alt từ field khác */
  imageAltKey?: Extract<keyof T, string>;
  imageClassName?: string;

  /**
   * `badge`: ánh xạ giá trị ô → nhãn + class theme (`STATUS_BADGE_CLASSES`).
   * Có `badgeMapping` thì bỏ qua hiển thị chuỗi thô từ API.
   */
  badgeMapping?: ReadonlyArray<CommonTableBadgeMappingEntry>;
}

export interface CommonTableAction<T> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: (row: T) => void;
  /** Điều hướng nội bộ (Next.js) hoặc URL tuyệt đối */
  href?: (row: T) => string | undefined;
  disabled?: (row: T) => boolean;
  variant?: "default" | "outline" | "ghost" | "destructive";
}

/** Typography đồng nhất giữa th và td — token theme. */
const tableThClass =
  "text-sm font-normal tracking-[-0.01em] text-muted-foreground";
const tableTdClass =
  "text-sm font-normal tracking-[-0.01em] text-foreground";
const tableTdMutedClass =
  "text-sm font-normal tracking-[-0.01em] text-muted-foreground";

/** Cột / ô sticky: nền card + bóng nhẹ (dark đậm hơn). */
const stickyCellShadowLeft =
  "shadow-[6px_0_12px_-4px_rgba(0,0,0,0.08)] dark:shadow-[6px_0_12px_-4px_rgba(0,0,0,0.55)]";
const stickyCellShadowRight =
  "shadow-[-8px_0_16px_-6px_rgba(0,0,0,0.12)] dark:shadow-[-8px_0_16px_-6px_rgba(0,0,0,0.55)]";

/** Cố định — dropdown phân trang chỉ 25 / 50 / 100 (shadcn Select) */
const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

function clampPageSize(n: number): (typeof PAGE_SIZE_OPTIONS)[number] {
  return PAGE_SIZE_OPTIONS.includes(n as (typeof PAGE_SIZE_OPTIONS)[number])
    ? (n as (typeof PAGE_SIZE_OPTIONS)[number])
    : 25;
}

/** Số trang hiển thị kiểu shadcn: 1 … 4 5 6 … 10 */
function getPaginationRange(
  current: number,
  pageCount: number,
): (number | "ellipsis")[] {
  if (pageCount < 1) return [];
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  pages.add(1);
  pages.add(pageCount);
  for (let i = current - 1; i <= current + 1; i++) {
    if (i > 1 && i < pageCount) pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("ellipsis");
    result.push(p);
    prev = p;
  }
  return result;
}

export interface CommonTableProps<T> {
  /** Tiêu đề khối bảng (DESIGN.md — H2 / section) */
  title: string;
  description?: string;
  columns: CommonTableColumn<T>[];
  data: T[];
  getRowKey: (row: T, index: number) => string;
  /** Sort điều khiển từ ngoài — chỉ cần khi có cột `sortable` */
  sortKey?: string | null;
  sortDirection?: SortDirection | null;
  onSortChange?: (key: string, direction: SortDirection) => void;
  /** Cột thao tác cuối bảng — menu ⋮ với các tùy chọn */
  actions?: CommonTableAction<T>[];
  actionsLabel?: string;
  actionsHeaderClassName?: string;
  actionsCellClassName?: string;
  /** Mặc định true — cột STT đầu bảng (theo trang khi bật phân trang) */
  showRowIndex?: boolean;
  rowIndexLabel?: string;
  /** Mặc định true — phân trang client (shadcn Pagination + Select 25/50/100) */
  pagination?: boolean;
  /** Mặc định 25 — phải là 25, 50 hoặc 100 */
  defaultPageSize?: number;
  emptyMessage?: string;
  /**
   * Dùng ngay dưới `CommonHeader` trong cùng một card — bỏ viền/shadow trùng,
   * bo góc dưới, bảng full width (không thụt `md:px-1`).
   */
  embed?: boolean;
  className?: string;
  tableClassName?: string;
}

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

const imageSizeClass: Record<
  NonNullable<CommonTableColumn<unknown>["imageSize"]>,
  string
> = {
  xs: "h-8 w-8 min-h-8 min-w-8",
  sm: "h-10 w-10 min-h-10 min-w-10",
  md: "h-12 w-12 min-h-12 min-w-12",
  lg: "h-16 w-16 min-h-16 min-w-16",
};

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

/** `datetime` trong bảng: dd/MM/yyyy HH:mm (giờ địa phương). */
function formatTableDateTimeDdMmYyyy(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function formatByType<T>(
  row: T,
  column: CommonTableColumn<T>,
): React.ReactNode {
  if (column.renderCell) return column.renderCell(row);

  const raw = row[column.id];
  const type = column.type ?? "text";

  switch (type) {
    case "number":
      return typeof raw === "number"
        ? raw.toLocaleString("vi-VN")
        : raw != null
          ? String(raw)
          : "—";
    case "currency":
      return typeof raw === "number"
        ? currencyFormatter.format(raw)
        : raw != null
          ? String(raw)
          : "—";
    case "date":
      if (raw instanceof Date) return raw.toLocaleDateString("vi-VN");
      if (typeof raw === "string" || typeof raw === "number") {
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("vi-VN");
      }
      return "—";
    case "datetime":
      if (raw instanceof Date)
        return Number.isNaN(raw.getTime())
          ? "—"
          : formatTableDateTimeDdMmYyyy(raw);
      if (typeof raw === "string" || typeof raw === "number") {
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? "—" : formatTableDateTimeDdMmYyyy(d);
      }
      return "—";
    case "boolean":
      if (typeof raw === "boolean") return raw ? "Có" : "Không";
      return raw != null ? String(raw) : "—";
    case "email": {
      const addr = raw != null ? String(raw).trim() : "";
      if (!addr) return "—";
      return (
        <a
          href={`mailto:${addr}`}
          className="block max-w-[15rem] truncate font-normal text-brand-heading underline-offset-2 hover:underline"
          title={addr}
        >
          {addr}
        </a>
      );
    }
    case "link": {
      if (column.linkHrefKey) {
        const hrefRaw = row[column.linkHrefKey];
        const href =
          typeof hrefRaw === "string" && hrefRaw.trim()
            ? hrefRaw.trim()
            : undefined;
        const display = raw != null && raw !== "" ? String(raw) : "—";
        if (!href || display === "—") return "—";
        const external = column.linkExternal ?? isExternalHref(href);
        const className = cn(
          "max-w-[14rem] truncate font-normal text-brand-heading underline-offset-2 hover:underline",
        );
        if (external) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
              title={display}
            >
              {display}
            </a>
          );
        }
        return (
          <Link href={href} className={className} title={display}>
            {display}
          </Link>
        );
      }

      let href: string | undefined;
      let label: string | undefined;
      let externalFromValue: boolean | undefined;

      if (raw != null && typeof raw === "object" && "href" in raw) {
        const v = raw as unknown as {
          href: string;
          label?: string;
          external?: boolean;
        };
        href = v.href;
        label = v.label;
        externalFromValue = v.external;
      } else if (typeof raw === "string" && raw) {
        href = raw;
        label = column.linkLabelKey
          ? String(row[column.linkLabelKey] ?? "")
          : raw;
      } else {
        return "—";
      }

      if (!href) return "—";
      const display = label?.trim() || href;
      const external =
        column.linkExternal ?? externalFromValue ?? isExternalHref(href);
      const className = cn(
        "max-w-[14rem] truncate font-normal text-brand-heading underline-offset-2 hover:underline",
      );

      if (external) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
            title={display}
          >
            {display}
          </a>
        );
      }

      return (
        <Link href={href} className={className} title={display}>
          {display}
        </Link>
      );
    }
    case "img": {
      let src: string | undefined;
      let alt = "";

      if (typeof raw === "string" && raw) {
        src = raw;
      } else if (raw != null && typeof raw === "object" && "src" in raw) {
        const v = raw as { src: string; alt?: string };
        src = v.src;
        alt = v.alt ?? "";
      }

      if (!src) return "—";

      if (!alt && column.imageAltKey) {
        alt = String(row[column.imageAltKey] ?? "");
      }

      const size = column.imageSize ?? "sm";
      return (
        // eslint-disable-next-line @next/next/no-img-element -- thumb động trong bảng, không cần optimizer
        <img
          src={src}
          alt={alt || ""}
          className={cn(
            "rounded-[10px] border border-border bg-muted object-cover",
            imageSizeClass[size],
            column.imageClassName,
          )}
        />
      );
    }
    case "badge": {
      const mapping = column.badgeMapping;
      if (mapping?.length) {
        const hit = mapping.find((e) => Object.is(e.key, raw));
        if (!hit) return "—";
        return (
          <span className={cn(hit.badgeClass)} title={hit.text}>
            <span className="truncate">{hit.text}</span>
          </span>
        );
      }
      const s = raw != null ? String(raw) : "";
      if (!s) return "—";
      return (
        <span
          className={cn(
            "inline-flex max-w-full items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium tracking-[-0.01em] text-foreground",
          )}
          title={s}
        >
          <span className="truncate">{s}</span>
        </span>
      );
    }
    case "text":
    default:
      if (raw == null) return "—";
      const s = String(raw);
      return (
        <span className="block max-w-[18rem] truncate" title={s}>
          {s}
        </span>
      );
  }
}

function SortButton({
  label,
  columnId,
  sortKey,
  sortDirection,
  onSortChange,
}: {
  label: string;
  columnId: string;
  sortKey: string | null | undefined;
  sortDirection: SortDirection | null | undefined;
  onSortChange?: (key: string, direction: SortDirection) => void;
}) {
  const active = sortKey === columnId;
  const dir = active ? sortDirection : null;

  return (
    <button
      type="button"
      className={cn(
        "-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-left text-sm font-normal tracking-[-0.01em] text-muted-foreground transition-colors hover:bg-muted/90 hover:text-foreground",
        active && "text-brand-heading",
      )}
      onClick={() => {
        if (!onSortChange) return;
        if (!active) {
          onSortChange(columnId, "asc");
          return;
        }
        onSortChange(columnId, dir === "asc" ? "desc" : "asc");
      }}
    >
      <span className="truncate">{label}</span>
      {dir === "asc" ? (
        <ArrowUp className="size-3.5 shrink-0 opacity-90" aria-hidden />
      ) : dir === "desc" ? (
        <ArrowDown className="size-3.5 shrink-0 opacity-90" aria-hidden />
      ) : (
        <ArrowUpDown className="size-3.5 shrink-0 opacity-50" aria-hidden />
      )}
    </button>
  );
}

const menuItemClass =
  "flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left text-sm tracking-[-0.01em] text-foreground transition-colors hover:bg-muted";

/** z-index cao + portal để không bị cắt bởi overflow của khung bảng */
const FLOATING_MENU_Z = 9999;

function useFloatingMenuPosition(
  open: boolean,
  anchorRef: React.RefObject<HTMLElement | null>,
) {
  const [pos, setPos] = React.useState({
    top: 0,
    right: 0,
    width: 0,
  });

  const update = React.useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 4,
      right: window.innerWidth - r.right,
      width: r.width,
    });
  }, [anchorRef]);

  React.useLayoutEffect(() => {
    if (!open) return;
    update();
  }, [open, update]);

  React.useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, update]);

  return { pos, update };
}

function useMounted() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

function ActionsMenuCell<T>({
  row,
  actions,
  className,
}: {
  row: T;
  actions: CommonTableAction<T>[];
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const menuId = React.useId();
  const mounted = useMounted();
  const { pos } = useFloatingMenuPosition(open, triggerRef);

  React.useEffect(() => {
    if (!open) return;
    function handlePointer(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const menuPanel =
    open && mounted ? (
      <div
        id={menuId}
        ref={menuRef}
        role="menu"
        style={{
          position: "fixed",
          top: pos.top,
          right: pos.right,
          left: "auto",
          zIndex: FLOATING_MENU_Z,
        }}
        className="min-w-[12rem] rounded-[12px] border border-border bg-popover py-1.5 text-popover-foreground shadow-lg dark:shadow-black/40"
      >
        {actions.map((action) => {
          const disabled = action.disabled?.(row) ?? false;
          const href = action.href?.(row);
          const destructive =
            action.variant === "destructive" || action.id === "delete";

          const content = (
            <>
              {action.icon ? (
                <span className="shrink-0 opacity-80 [&_svg]:size-4">
                  {action.icon}
                </span>
              ) : null}
              <span className="min-w-0 flex-1">{action.label}</span>
            </>
          );

          if (href && !disabled) {
            const external = isExternalHref(href);
            if (external) {
              return (
                <a
                  key={action.id}
                  role="menuitem"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    menuItemClass,
                    destructive && "text-destructive hover:bg-destructive/10",
                  )}
                  onClick={() => setOpen(false)}
                >
                  {content}
                </a>
              );
            }
            return (
              <Link
                key={action.id}
                role="menuitem"
                href={href}
                className={cn(
                  menuItemClass,
                  destructive && "text-destructive hover:bg-destructive/10",
                )}
                onClick={() => setOpen(false)}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              disabled={disabled}
              className={cn(
                menuItemClass,
                destructive && "text-destructive hover:bg-destructive/10",
                disabled && "pointer-events-none opacity-50",
              )}
              onClick={() => {
                setOpen(false);
                action.onClick?.(row);
              }}
            >
              {content}
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <div
      className={cn("relative z-10 flex justify-end", className)}
      ref={wrapRef}
    >
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-[12px] text-foreground transition-colors hover:bg-muted",
          open && "bg-muted",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-label="Mở thao tác"
        onClick={() => setOpen((o) => !o)}
      >
        <MoreVertical className="size-4" strokeWidth={1.75} aria-hidden />
      </button>

      {menuPanel && typeof document !== "undefined"
        ? createPortal(menuPanel, document.body)
        : null}
    </div>
  );
}

/**
 * Bảng dữ liệu dùng chung: **shadcn `Table`** + phân trang **shadcn `Pagination`** + **shadcn `Select`** (số dòng/trang).
 * Card theo DESIGN.md (12px, shadow), cột khai báo bằng `label`, `type`, `sortable`.
 */
export function CommonTable<T>({
  title,
  description,
  columns,
  data,
  getRowKey,
  sortKey,
  sortDirection,
  onSortChange,
  actions,
  actionsLabel = "Thao tác",
  actionsHeaderClassName,
  actionsCellClassName,
  showRowIndex = true,
  rowIndexLabel = "STT",
  pagination: paginationProp = true,
  defaultPageSize = 25,
  emptyMessage = "Không có dữ liệu.",
  embed = false,
  className,
  tableClassName,
}: CommonTableProps<T>) {
  /** Chỉ ẩn STT khi gửi rõ `showRowIndex={false}` — tránh null/undefined làm mất cột */
  const showStt = showRowIndex !== false;
  const sttHeaderLabel = rowIndexLabel?.trim() || "STT";

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(() =>
    clampPageSize(defaultPageSize),
  );

  const paginationEnabled = paginationProp !== false;
  const total = data.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);

  React.useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount, total]);

  const sliceStart = (page - 1) * pageSize;
  const displayedRows = paginationEnabled
    ? data.slice(sliceStart, sliceStart + pageSize)
    : data;

  const handlePageSizeChange = (next: number) => {
    setPageSize(clampPageSize(next));
    setPage(1);
  };

  const actionList = actions?.length ? actions : null;
  const indexColumnCount = showStt ? 1 : 0;
  const colSpan = indexColumnCount + columns.length + (actionList ? 1 : 0);

  const from = total === 0 ? 0 : sliceStart + 1;
  const to = Math.min(sliceStart + pageSize, total);

  const visiblePages = React.useMemo(
    () => getPaginationRange(page, pageCount),
    [page, pageCount],
  );

  return (
    <section
      className={cn(
        "flex h-full min-h-[24rem] max-h-[min(100dvh,920px)] flex-col overflow-hidden",
        embed
          ? "w-full overflow-hidden rounded-[12px] border border-border bg-card pt-4 pb-0 text-card-foreground shadow-sm dark:shadow-black/35"
          : "rounded-[12px] border border-border bg-card text-card-foreground shadow-sm dark:shadow-black/35",
        className,
      )}
    >
      {title?.trim() || description?.trim() ? (
        <div className="border-b border-border px-4 py-4 md:px-6 md:py-5">
          {title?.trim() ? (
            <h2 className="text-base font-semibold tracking-[-0.01em] text-foreground md:text-lg">
              {title}
            </h2>
          ) : null}
          {description?.trim() ? (
            <p className="mt-1 text-sm tracking-[-0.01em] text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "min-h-0 flex-1 overflow-hidden",
          embed ? "px-0 pb-0" : "p-0 md:px-2 md:pb-2",
        )}
        data-slot="common-data-table"
      >
        <ScrollArea className="h-full w-full">
          <Table className={cn("min-w-[640px]", tableClassName)}>
            <TableHeader className="sticky top-0 z-30 bg-card">
              <TableRow className="border-border hover:bg-transparent">
                {showStt ? (
                  <TableHead
                    className={cn(
                      "sticky top-0 left-0 z-30 w-[1%] min-w-[3.25rem] bg-card text-center",
                      stickyCellShadowLeft,
                      tableThClass,
                    )}
                  >
                    {sttHeaderLabel}
                  </TableHead>
                ) : null}
                {columns.map((col) => (
                  <TableHead
                    key={String(col.id)}
                    className={cn(
                      "sticky top-0 z-20 bg-card",
                      tableThClass,
                      col.headerClassName,
                    )}
                  >
                    {col.sortable && onSortChange ? (
                      <SortButton
                        label={col.label}
                        columnId={String(col.id)}
                        sortKey={sortKey}
                        sortDirection={sortDirection}
                        onSortChange={onSortChange}
                      />
                    ) : (
                      col.label
                    )}
                  </TableHead>
                ))}
                {actionList ? (
                  <TableHead
                    className={cn(
                      "sticky top-0 right-0 z-50 w-[1%] min-w-[6.5rem] whitespace-nowrap bg-card text-right",
                      stickyCellShadowRight,
                      tableThClass,
                      actionsHeaderClassName,
                    )}
                  >
                    {actionsLabel}
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={colSpan}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                displayedRows.map((row, index) => {
                  const stt = paginationEnabled
                    ? sliceStart + index + 1
                    : index + 1;
                  return (
                    <TableRow
                      key={getRowKey(row, index)}
                      className="border-border"
                    >
                      {showStt ? (
                        <TableCell
                          className={cn(
                            "sticky left-0 z-20 w-[1%] min-w-[3.25rem] bg-card text-center tabular-nums",
                            stickyCellShadowLeft,
                            tableTdMutedClass,
                          )}
                        >
                          {stt}
                        </TableCell>
                      ) : null}
                      {columns.map((col) => (
                        <TableCell
                          key={String(col.id)}
                          className={cn(tableTdClass, col.className)}
                        >
                          {formatByType(row, col)}
                        </TableCell>
                      ))}
                      {actionList ? (
                        <TableCell
                          className={cn(
                            "sticky right-0 z-40 min-w-[6.5rem] bg-card",
                            stickyCellShadowRight,
                            tableTdClass,
                            actionsCellClassName,
                          )}
                        >
                          <ActionsMenuCell row={row} actions={actionList} />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {paginationEnabled && total > 0 ? (
        <footer className="border-t border-border px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <p className="shrink-0 text-sm tracking-[-0.01em] text-muted-foreground">
              Tổng số {total} bản ghi
            </p>
            <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => handlePageSizeChange(Number(v))}
                >
                  <SelectTrigger
                    size="sm"
                    className="h-8 w-[4.75rem] shrink-0 rounded-md border-input bg-card px-2.5 font-medium tabular-nums text-foreground shadow-none hover:bg-muted"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    align="end"
                    sideOffset={6}
                    alignItemWithTrigger={false}
                    className="!min-w-0 w-(--anchor-width) border-border bg-popover p-1 text-popover-foreground shadow-lg dark:shadow-black/40"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem
                        key={n}
                        value={String(n)}
                        className="justify-center rounded-md py-1.5 pr-8 pl-2 tabular-nums"
                      >
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Pagination
                className="mx-0 w-full min-w-0 justify-center sm:w-auto sm:justify-end"
                aria-label="Phân trang bảng"
              >
                <PaginationContent className="flex-wrap justify-center gap-0.5 sm:justify-end">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      text=""
                      className={cn(
                        "h-8 gap-1 rounded-md border-input bg-card px-2 sm:pl-2",
                        page <= 1 && "pointer-events-none opacity-40",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) setPage((p) => p - 1);
                      }}
                      aria-disabled={page <= 1}
                    />
                  </PaginationItem>
                  {visiblePages.map((item, idx) =>
                    item === "ellipsis" ? (
                      <PaginationItem key={`ellipsis-${idx}`}>
                        <PaginationEllipsis className="size-8" />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={item}>
                        <PaginationLink
                          href="#"
                          size="icon"
                          isActive={page === item}
                          className="size-8 rounded-md border-border bg-card font-medium tabular-nums"
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(item);
                          }}
                        >
                          {item}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      text=""
                      className={cn(
                        "h-8 gap-1 rounded-md border-input bg-card px-2 sm:pr-2",
                        page >= pageCount && "pointer-events-none opacity-40",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        if (page < pageCount) setPage((p) => p + 1);
                      }}
                      aria-disabled={page >= pageCount}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </footer>
      ) : null}
    </section>
  );
}
