"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Cloud, 
  File, 
  ArrowUpRight, 
  Link as LinkIcon, 
  Calendar as CalendarIcon, 
  BarChart2, 
  FileText,
  Clock,
  RefreshCw,
  Database
} from "lucide-react";
import { formatFileSizeBytes } from "@/lib/format-file-size";
import { getStoredAccessToken } from "@/lib/auth-storage";
import { useDashboardStatsQuery } from "@/hooks/api/use-dashboard";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CommonHeader } from "@/components/shared/common";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

// Định dạng ngày hiển thị theo kiểu Việt Nam (dd/MM/yyyy)
function formatViDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Định dạng ngày hiển thị ngắn gọn trên trục X (dd/MM)
function formatShortDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

// Định dạng hiển thị khoảng ngày của Range Picker
function formatDisplayRange(range: DateRange | undefined): string {
  if (!range || (!range.from && !range.to)) return "Chọn khoảng ngày";
  const a = range.from ? format(range.from, "dd/MM/yyyy", { locale: vi }) : "…";
  const b = range.to ? format(range.to, "dd/MM/yyyy", { locale: vi }) : "…";
  return `${a} — ${b}`;
}

export default function AdminDashboardPage() {
  const [token, setToken] = useState<string | undefined>();
  const [numberOfMonths, setNumberOfMonths] = useState(2);
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  // Quản lý khoảng ngày lọc dạng DateRange từ react-day-picker (Mặc định 30 ngày gần nhất)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const to = new Date();
    return { from, to };
  });

  // Tự động điều chỉnh số lượng tháng hiển thị trên lịch dựa theo độ rộng màn hình (responsive calendar)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => {
        setNumberOfMonths(window.innerWidth < 640 ? 1 : 2);
      };
      handleResize(); // Khởi tạo ban đầu
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Tự động map sang định dạng string yyyy-MM-dd để gọi API
  const queryParams = useMemo(() => {
    return {
      fromDate: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
      toDate: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
    };
  }, [dateRange]);

  // Chế độ xem biểu đồ: dung lượng (bytes) hoặc số lượng (files)
  const [chartMode, setChartMode] = useState<"bytes" | "files">("bytes");

  useEffect(() => {
    setToken(getStoredAccessToken());
  }, []);

  // Gọi query lấy số liệu thống kê dựa trên khoảng ngày đã chọn
  const { data: stats, isLoading, isError, refetch, isFetching } = useDashboardStatsQuery(
    queryParams,
    token
  );

  // Tính toán vẽ biểu đồ
  const chartData = useMemo(() => {
    if (!stats || !stats.dailyStats || stats.dailyStats.length === 0) return [];
    return stats.dailyStats;
  }, [stats]);

  // Tìm giá trị lớn nhất phục vụ vẽ biểu đồ (tránh chia cho 0)
  const maxVal = useMemo(() => {
    if (chartData.length === 0) return 1;
    const values = chartData.map((d) => 
      chartMode === "bytes" ? d.bytesUploaded : d.filesUploaded
    );
    const max = Math.max(...values);
    return max > 0 ? max : 1;
  }, [chartData, chartMode]);

  // Thêm khoảng đệm 20% ở phía trên trục Y để biểu đồ cân đối và không bị chạm đỉnh (wow factor)
  const chartMaxY = useMemo(() => {
    return maxVal * 1.2;
  }, [maxVal]);

  // Cấu hình xPadding trong Recharts để biểu đồ cân đối hơn khi có ít điểm dữ liệu
  const xPadding = useMemo(() => {
    if (chartData.length <= 3) return 100;
    if (chartData.length <= 7) return 50;
    return 10;
  }, [chartData.length]);

  // Tìm unit thích hợp nhất cho giá trị tối đa của trục Y
  const yAxisUnit = useMemo(() => {
    if (chartMode === "files") return "";
    let n = chartMaxY;
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (n >= 1024 && i < units.length - 1) {
      n /= 1024;
      i++;
    }
    return units[i];
  }, [chartMaxY, chartMode]);

  // Định dạng nhãn trục Y
  const formatYLabel = (val: number): string => {
    if (val === 0) return "0";
    if (chartMode === "bytes") {
      const units = ["B", "KB", "MB", "GB", "TB"];
      const unitIdx = units.indexOf(yAxisUnit);
      let n = val;
      for (let i = 0; i < unitIdx; i++) {
        n /= 1024;
      }
      const formatted = n.toLocaleString("vi-VN", {
        maximumFractionDigits: n % 1 === 0 ? 0 : 1,
      });
      return `${formatted} ${yAxisUnit}`;
    }
    return Math.round(val).toString();
  };

  // Cấu hình màu sắc cho biểu đồ từ thiết kế hệ thống
  const chartConfig = {
    bytesUploaded: {
      label: "Dung lượng tải lên",
      color: "hsl(var(--primary))",
    },
    filesUploaded: {
      label: "Số lượng file",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  return (
    <div className="flex min-h-0 flex-col gap-4">
      {/* Sử dụng Header chung đồng nhất với dự án */}
      <CommonHeader
        title="Thống kê lưu lượng tải lên hệ thống"
        subtitle=""
      >
        {/* Bộ lọc Date Range Picker của shadcn - Thiết kế gọn gàng, responsive */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase pl-1.5 flex items-center gap-1 tracking-wider whitespace-nowrap">
            <CalendarIcon className="size-3.5 text-(--brand-cta)" /> Lọc ngày:
          </span>
          
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger
              type="button"
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors font-semibold shadow-inner min-w-[220px] text-left cursor-pointer"
            >
              <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground mr-1" />
              <span className="truncate">{formatDisplayRange(dateRange)}</span>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                locale={vi}
                numberOfMonths={numberOfMonths}
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range);
                  if (range?.from && range?.to) {
                    setPopoverOpen(false);
                  }
                }}
              />
            </PopoverContent>
          </Popover>

          <button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="flex size-9 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-all active:scale-95 disabled:opacity-50 border border-border/40 cursor-pointer"
            title="Làm mới số liệu"
          >
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </CommonHeader>

      {/* Grid thẻ thông tin Tổng quan sử dụng class chuẩn ds-surface-card-elevated và tinh chỉnh cỡ chữ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Thẻ 1: Dung lượng lưu trữ hiện tại */}
        <div className="ds-surface-card-elevated relative group overflow-hidden p-5 transition-all hover:shadow-md hover:border-primary/20 border border-border/50">
          <div className="flex justify-between items-start">
            <div>
              <p className="ds-text-overline">
                Dung lượng lưu trữ hiện tại
              </p>
              <h3 className="text-xl font-bold tracking-tight text-foreground mt-1.5">
                {isLoading ? (
                  <span className="h-7 w-28 bg-muted/40 animate-pulse inline-block rounded" />
                ) : (
                  formatFileSizeBytes(stats?.currentStorageBytes ?? 0)
                )}
              </h3>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Database className="size-4.5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-[11px] text-muted-foreground border-t border-border/30 pt-3">
            <FileText className="size-3 mr-1" />
            <span>{isLoading ? "..." : `${stats?.currentFilesCount ?? 0} file hiện có`}</span>
          </div>
        </div>

        {/* Thẻ 2: Tổng dung lượng upload */}
        <div className="ds-surface-card-elevated relative group overflow-hidden p-5 transition-all hover:shadow-md hover:border-primary/20 border border-border/50">
          <div className="flex justify-between items-start">
            <div>
              <p className="ds-text-overline">
                Tổng dung lượng upload
              </p>
              <h3 className="text-xl font-bold tracking-tight text-foreground mt-1.5">
                {isLoading ? (
                  <span className="h-7 w-28 bg-muted/40 animate-pulse inline-block rounded" />
                ) : (
                  formatFileSizeBytes(stats?.totalBytesUploaded ?? 0)
                )}
              </h3>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Cloud className="size-4.5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-[11px] text-muted-foreground border-t border-border/30 pt-3">
            <Clock className="size-3 mr-1" />
            <span>Trong khoảng thời gian đã chọn</span>
          </div>
        </div>

        {/* Thẻ 2: Tổng số file */}
        <div className="ds-surface-card-elevated relative group overflow-hidden p-5 transition-all hover:shadow-md hover:border-primary/20 border border-border/50">
          <div className="flex justify-between items-start">
            <div>
              <p className="ds-text-overline">
                Tổng số file upload
              </p>
              <h3 className="text-xl font-bold tracking-tight text-foreground mt-1.5">
                {isLoading ? (
                  <span className="h-7 w-20 bg-muted/40 animate-pulse inline-block rounded" />
                ) : (
                  `${stats?.totalFilesUploaded ?? 0} file`
                )}
              </h3>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <File className="size-4.5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-[11px] text-muted-foreground border-t border-border/30 pt-3">
            <Clock className="size-3 mr-1" />
            <span>Đã đưa lên kênh Telegram</span>
          </div>
        </div>

        {/* Thẻ 3: Upload Local */}
        <div className="ds-surface-card-elevated relative group overflow-hidden p-5 transition-all hover:shadow-md hover:border-primary/20 border border-border/50">
          <div className="flex justify-between items-start">
            <div>
              <p className="ds-text-overline">
                Tải lên trực tiếp
              </p>
              <h3 className="text-xl font-bold tracking-tight text-foreground mt-1.5">
                {isLoading ? (
                  <span className="h-6 w-24 bg-muted/40 animate-pulse inline-block rounded" />
                ) : (
                  formatFileSizeBytes(stats?.uploadLocalBytes ?? 0)
                )}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isLoading ? "..." : `${stats?.uploadLocalCount ?? 0} file`}
              </p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <ArrowUpRight className="size-4.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-center text-[11px] text-muted-foreground border-t border-border/30 pt-3">
            <FileText className="size-3 mr-1" />
            <span>File tải lên trực tiếp từ thiết bị</span>
          </div>
        </div>

        {/* Thẻ 4: Upload Mirror */}
        <div className="ds-surface-card-elevated relative group overflow-hidden p-5 transition-all hover:shadow-md hover:border-primary/20 border border-border/50">
          <div className="flex justify-between items-start">
            <div>
              <p className="ds-text-overline">
                Tải qua URL (Mirror)
              </p>
              <h3 className="text-xl font-bold tracking-tight text-foreground mt-1.5">
                {isLoading ? (
                  <span className="h-6 w-24 bg-muted/40 animate-pulse inline-block rounded" />
                ) : (
                  formatFileSizeBytes(stats?.uploadMirrorBytes ?? 0)
                )}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isLoading ? "..." : `${stats?.uploadMirrorCount ?? 0} file`}
              </p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <LinkIcon className="size-4.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-center text-[11px] text-muted-foreground border-t border-border/30 pt-3">
            <LinkIcon className="size-3 mr-1" />
            <span>Kéo file từ link URL từ xa</span>
          </div>
        </div>
      </div>

      {/* Khu vực Biểu đồ sử dụng Card từ shadcn */}
      <Card className="border border-border/50">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BarChart2 className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Biểu đồ tiến trình upload
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-primary animate-pulse" />
                {chartMode === "bytes" ? "Dung lượng tải lên" : "Số lượng file tải lên"}
              </p>
            </div>
          </div>

          {/* Toggle chế độ xem biểu đồ */}
          <div className="inline-flex rounded-xl bg-muted p-1 self-start sm:self-auto border border-border/10">
            <button
              onClick={() => setChartMode("bytes")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold tracking-tight transition-all active:scale-[0.97] cursor-pointer ${
                chartMode === "bytes"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Dung lượng (Bytes)
            </button>
            <button
              onClick={() => setChartMode("files")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold tracking-tight transition-all active:scale-[0.97] cursor-pointer ${
                chartMode === "files"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Số lượng (Files)
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="relative animate-in fade-in duration-300">
            {isLoading ? (
              <div className="h-[350px] w-full flex items-center justify-center bg-muted/20 rounded-xl animate-pulse">
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="size-8 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground font-medium">Đang tải biểu đồ...</span>
                </div>
              </div>
            ) : isError ? (
              <div className="h-[350px] w-full flex items-center justify-center border border-dashed border-destructive/20 rounded-xl bg-destructive/5 text-destructive text-sm p-4">
                Không thể tải dữ liệu thống kê. Vui lòng kiểm tra kết nối API và thử lại.
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-[350px] w-full flex items-center justify-center border border-dashed border-border rounded-xl text-muted-foreground text-sm">
                Không có dữ liệu upload nào trong khoảng thời gian đã chọn.
              </div>
            ) : (
              <div className="w-full overflow-x-auto pb-2">
                <div className="min-w-[650px] relative">
                  <ChartContainer
                    config={chartConfig}
                    className="h-[350px] w-full aspect-auto [&_.recharts-cartesian-axis-tick_text]:text-[9px] [&_.recharts-cartesian-axis-tick_text]:font-medium"
                  >
                    <AreaChart
                      accessibilityLayer
                      data={chartData}
                      margin={{
                        top: 15,
                        left: -15,
                        right: 15,
                        bottom: 0,
                      }}
                    >
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor={chartMode === "bytes" ? "var(--color-bytesUploaded)" : "var(--color-filesUploaded)"}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={chartMode === "bytes" ? "var(--color-bytesUploaded)" : "var(--color-filesUploaded)"}
                            stopOpacity={0.01}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="4 4"
                        className="stroke-border/60"
                      />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={12}
                        tickFormatter={formatShortDate}
                        padding={{ left: xPadding, right: xPadding }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={12}
                        tickFormatter={formatYLabel}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            labelFormatter={(value) => typeof value === "string" ? formatViDate(value) : String(value)}
                            formatter={(value, name, item) => {
                              if (item.dataKey === "bytesUploaded") {
                                return (
                                  <div className="flex items-center justify-between gap-4 w-full text-xs">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                      <Cloud className="size-3 text-primary" /> Dung lượng:
                                    </span>
                                    <span className="font-bold text-foreground">
                                      {formatFileSizeBytes(Number(value))}
                                    </span>
                                  </div>
                                );
                              }
                              return (
                                <div className="flex items-center justify-between gap-4 w-full text-xs">
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    <FileText className="size-3 text-indigo-500" /> Số lượng:
                                  </span>
                                  <span className="font-bold text-foreground">{value} file</span>
                                </div>
                              );
                            }}
                          />
                        }
                      />
                      <Area
                        dataKey={chartMode === "bytes" ? "bytesUploaded" : "filesUploaded"}
                        type="monotone"
                        fill="url(#chartGradient)"
                        stroke={chartMode === "bytes" ? "var(--color-bytesUploaded)" : "var(--color-filesUploaded)"}
                        strokeWidth={2}
                        dot={
                          chartData.length <= 31
                            ? {
                                r: chartData.length <= 7 ? 4 : 3,
                                fill: "hsl(var(--card))",
                                stroke: chartMode === "bytes" ? "var(--color-bytesUploaded)" : "var(--color-filesUploaded)",
                                strokeWidth: 2,
                              }
                            : false
                        }
                        activeDot={{
                          r: 6,
                          style: {
                            fill: chartMode === "bytes" ? "var(--color-bytesUploaded)" : "var(--color-filesUploaded)",
                            strokeWidth: 2,
                          },
                        }}
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
