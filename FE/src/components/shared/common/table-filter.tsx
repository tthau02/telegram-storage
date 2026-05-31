"use client";

import * as React from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, RotateCcw, Search } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type TableFilterOption = { value: string; label: string };

export type TableFilterField =
  | {
      type: "input";
      id: string;
      label: string;
      placeholder?: string;
      inputType?: React.HTMLInputTypeAttribute;
      description?: string;
    }
  | {
      type: "select";
      id: string;
      label: string;
      placeholder?: string;
      options: TableFilterOption[];
      description?: string;
      clearable?: boolean;
      clearLabel?: string;
    }
  | {
      type: "switch";
      id: string;
      label: string;
      description?: string;
    }
  | {
      type: "radio";
      id: string;
      label: string;
      options: TableFilterOption[];
      description?: string;
    }
  | {
      type: "date";
      id: string;
      label: string;
      description?: string;
      placeholder?: string;
    }
  | {
      type: "daterange";
      id: string;
      label: string;
      description?: string;
      placeholder?: string;
      numberOfMonths?: number;
    }
  | {
      type: "action";
      id: string;
      label: string;
      variant?: "default" | "outline";
      onClick?: () => void;
    };

/** Giá trị theo `id`: chuỗi (input/select/radio/date ISO), boolean (switch), hoặc khoảng ngày. */
export type TableFilterValues = Record<string, unknown>;

export type DateRangeFilterValue = { from?: string; to?: string };

export type CommonTableFilterProps = {
  fields: TableFilterField[];
  values: TableFilterValues;
  onChange: (values: TableFilterValues) => void;
  /** Tiêu đề nhóm (legend) — tùy chọn */
  title?: string;
  className?: string;
  /** Bố cục lưới: số cột responsive (mặc định 1 cột dọc) */
  columnsClassName?: string;
  /**
   * Thanh tùy biến (tìm kiếm, nút thêm, xuất file, …) — truyền `ReactNode`.
   * Mặc định nằm trên danh sách field; dùng `toolbarPosition="bottom"` để đặt dưới.
   */
  toolbar?: React.ReactNode;
  toolbarPosition?: "top" | "bottom";
  onSubmit?: () => void;
  onReset?: () => void;
  submitLabel?: string;
  resetLabel?: string;
  scrollAreaClassName?: string;
};

function parseIso(s: unknown): Date | undefined {
  if (typeof s !== "string" || !s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function formatDisplayDate(d: Date | undefined): string {
  if (!d) return "";
  return format(d, "PPP", { locale: vi });
}

function formatDisplayRange(
  from: Date | undefined,
  to: Date | undefined,
): string {
  if (!from && !to) return "";
  const a = from ? format(from, "dd/MM/yyyy", { locale: vi }) : "…";
  const b = to ? format(to, "dd/MM/yyyy", { locale: vi }) : "…";
  return `${a} — ${b}`;
}

export function CommonTableFilter({
  fields,
  values,
  onChange,
  className,
  columnsClassName = "grid grid-cols-1 gap-4",
  toolbar,
  toolbarPosition = "bottom",
  onSubmit,
  onReset,
  submitLabel = "Search",
  resetLabel = "Reset",
  scrollAreaClassName,
}: CommonTableFilterProps) {
  const patch = React.useCallback(
    (id: string, value: unknown) => {
      onChange({ ...values, [id]: value });
    },
    [onChange, values],
  );

  const toolbarNode =
    toolbar != null ? (
      <div
        data-slot="table-filter-toolbar"
        className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4"
      >
        {toolbar}
      </div>
    ) : null;

  return (
    <div
      className={cn(
        "flex h-auto min-h-[24rem] max-h-[min(100dvh,920px)] min-w-0 flex-col gap-4 self-start rounded-[12px] border border-border bg-card p-4 text-card-foreground shadow-sm md:p-5 dark:shadow-black/35",
        className,
      )}
    >
      {toolbarPosition === "top" ? toolbarNode : null}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto pr-1 pb-1",
          scrollAreaClassName,
        )}
      >
        <FieldSet className="min-w-0 gap-4">
          <FieldGroup className={columnsClassName}>
            {fields.map((field) => (
              <FilterFieldRow
                key={field.id}
                field={field}
                values={values}
                patch={patch}
              />
            ))}
          </FieldGroup>
        </FieldSet>
      </div>
      {toolbarPosition === "bottom" || onSubmit || onReset ? (
        <div className="border-t border-border pt-3">
          {toolbarPosition === "bottom" ? toolbarNode : null}
          {onSubmit || onReset ? (
            <div className="mt-3 flex min-h-8 flex-wrap items-center gap-2.5">
              {onReset ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 w-8 rounded-[50px] border-primary p-0 text-primary transition-all duration-200 hover:bg-accent active:scale-95"
                  onClick={onReset}
                  aria-label={resetLabel}
                  title={resetLabel}
                >
                  <RotateCcw className="size-3.5" aria-hidden />
                </Button>
              ) : null}
              {onSubmit ? (
                <Button
                  type="button"
                  className="h-8 rounded-[50px] border border-primary bg-primary px-3 text-xs text-primary-foreground transition-all duration-200 hover:border-[var(--brand-heading)] hover:bg-[var(--brand-heading)] active:scale-95"
                  onClick={onSubmit}
                >
                  <Search className="size-3.5" aria-hidden />
                  {submitLabel}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type Patch = (id: string, value: unknown) => void;

function FilterFieldRow({
  field,
  values,
  patch,
}: {
  field: TableFilterField;
  values: TableFilterValues;
  patch: Patch;
}) {
  switch (field.type) {
    case "input":
      return (
        <Field>
          <FieldLabel htmlFor={field.id}>{field.label}</FieldLabel>
          <FieldContent>
            <Input
              id={field.id}
              name={field.id}
              type={field.inputType ?? "text"}
              placeholder={field.placeholder}
              value={String(values[field.id] ?? "")}
              onChange={(e) => patch(field.id, e.target.value)}
            />
            {field.description ? (
              <FieldDescription>{field.description}</FieldDescription>
            ) : null}
          </FieldContent>
        </Field>
      );

    case "select": {
      const clearLabel = field.clearLabel ?? "Tất cả";
      const opts =
        field.clearable === true
          ? [{ value: "", label: clearLabel }, ...field.options]
          : field.options;
      const items = opts.map((o) => ({ value: o.value, label: o.label }));
      const raw = values[field.id];
      const v = typeof raw === "string" ? raw : "";
      return (
        <Field>
          <FieldLabel htmlFor={field.id}>{field.label}</FieldLabel>
          <FieldContent>
            <Select
              value={v}
              items={items}
              onValueChange={(next) => patch(field.id, next)}
            >
              <SelectTrigger id={field.id} className="w-full min-w-0">
                <SelectValue placeholder={field.placeholder ?? "Chọn…"} />
              </SelectTrigger>
              <SelectContent>
                {opts.map((o) => (
                  <SelectItem key={o.value || "__empty"} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.description ? (
              <FieldDescription>{field.description}</FieldDescription>
            ) : null}
          </FieldContent>
        </Field>
      );
    }

    case "switch": {
      const raw = values[field.id];
      const checked = typeof raw === "boolean" ? raw : Boolean(raw);
      return (
        <Field orientation="horizontal">
          <FieldLabel htmlFor={field.id}>{field.label}</FieldLabel>
          <FieldContent className="flex flex-row items-center gap-2">
            <Switch
              id={field.id}
              name={field.id}
              checked={checked}
              onCheckedChange={(c) => patch(field.id, c)}
            />
            {field.description ? (
              <FieldDescription className="m-0">
                {field.description}
              </FieldDescription>
            ) : null}
          </FieldContent>
        </Field>
      );
    }

    case "radio": {
      const raw = values[field.id];
      const v = typeof raw === "string" ? raw : "";
      return (
        <Field>
          <FieldLabel>{field.label}</FieldLabel>
          <FieldContent>
            <RadioGroup
              name={field.id}
              value={v}
              onValueChange={(next) => patch(field.id, next)}
              className="gap-2"
            >
              {field.options.map((o) => {
                const itemId = `${field.id}-${o.value}`;
                return (
                  <div key={o.value} className="flex items-center gap-2">
                    <RadioGroupItem value={o.value} id={itemId} />
                    <Label htmlFor={itemId} className="font-normal">
                      {o.label}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
            {field.description ? (
              <FieldDescription>{field.description}</FieldDescription>
            ) : null}
          </FieldContent>
        </Field>
      );
    }

    case "date": {
      const d = parseIso(values[field.id]);
      const labelText =
        d != null ? formatDisplayDate(d) : (field.placeholder ?? "Chọn ngày");
      return (
        <Field>
          <FieldLabel>{field.label}</FieldLabel>
          <FieldContent>
            <Popover>
              <PopoverTrigger
                type="button"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full min-w-0 justify-start font-normal",
                )}
              >
                <CalendarIcon className="mr-2 size-4 shrink-0 opacity-70" />
                <span className="truncate">{labelText}</span>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  locale={vi}
                  selected={d}
                  onSelect={(day) =>
                    patch(field.id, day ? day.toISOString() : undefined)
                  }
                />
              </PopoverContent>
            </Popover>
            {field.description ? (
              <FieldDescription>{field.description}</FieldDescription>
            ) : null}
          </FieldContent>
        </Field>
      );
    }

    case "daterange":
      return (
        <DateRangeFilterRow
          field={field as Extract<TableFilterField, { type: "daterange" }>}
          values={values}
          patch={patch}
        />
      );

    case "action": {
      const variant = field.variant ?? "default";
      const isOutline = variant === "outline";
      const isReset = field.id.toLowerCase().includes("reset");
      return (
        <Field>
          <FieldContent>
            <Button
              type="button"
              className={cn(
                "h-8 rounded-[50px] px-3.5 text-xs transition-all duration-200 active:scale-95",
                isReset && "w-8 p-0",
                !isReset && "w-full min-h-8",
                isOutline
                  ? "border border-primary bg-card text-primary hover:bg-accent"
                  : "border border-primary bg-primary text-primary-foreground hover:border-[var(--brand-heading)] hover:bg-[var(--brand-heading)]",
              )}
              onClick={field.onClick}
              aria-label={field.label}
              title={field.label}
            >
              {isReset ? (
                <RotateCcw className="size-3.5" aria-hidden />
              ) : (
                <>
                  <Search className="size-3.5" aria-hidden />
                  {field.label}
                </>
              )}
            </Button>
          </FieldContent>
        </Field>
      );
    }

    default:
      return null;
  }
}

function DateRangeFilterRow({
  field,
  values,
  patch,
}: {
  field: Extract<TableFilterField, { type: "daterange" }>;
  values: TableFilterValues;
  patch: Patch;
}) {
  const [open, setOpen] = React.useState(false);
  const raw = values[field.id] as DateRangeFilterValue | undefined;
  const from = parseIso(raw?.from);
  const to = parseIso(raw?.to);
  const selected: DateRange | undefined =
    from || to
      ? { from: from ?? undefined, to: to ?? undefined }
      : undefined;
  const months = field.numberOfMonths ?? 2;
  const labelText =
    from || to
      ? formatDisplayRange(from, to)
      : (field.placeholder ?? "Chọn khoảng ngày");

  return (
    <Field>
      <FieldLabel>{field.label}</FieldLabel>
      <FieldContent>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            type="button"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full min-w-0 justify-start font-normal",
            )}
          >
            <CalendarIcon className="mr-2 size-4 shrink-0 opacity-70" />
            <span className="truncate">{labelText}</span>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              locale={vi}
              numberOfMonths={months}
              selected={selected}
              onSelect={(range) => {
                patch(field.id, {
                  from: range?.from?.toISOString(),
                  to: range?.to?.toISOString(),
                });
                if (range?.from && range?.to) {
                  setOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
        {field.description ? (
          <FieldDescription>{field.description}</FieldDescription>
        ) : null}
      </FieldContent>
    </Field>
  );
}
