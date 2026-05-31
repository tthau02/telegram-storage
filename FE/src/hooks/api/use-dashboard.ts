"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard-service";
import type { DashboardSearchParams } from "@/types/dashboard";

export const dashboardQueryKeys = {
  all: ["dashboard"] as const,
  stats: (params: DashboardSearchParams, token?: string) =>
    ["dashboard", "stats", params, token] as const,
};

export function useDashboardStatsQuery(
  params: DashboardSearchParams,
  token?: string,
) {
  return useQuery({
    queryKey: dashboardQueryKeys.stats(params, token),
    queryFn: () => dashboardService.getStats(params, token),
    enabled: Boolean(token),
  });
}
