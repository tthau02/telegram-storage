import { apiFetch } from "@/lib/api-client";
import type { DashboardStats, DashboardSearchParams } from "@/types/dashboard";

const DASHBOARD_BASE = "/v1/api/Dashboard";

export const dashboardService = {
  getStats(params: DashboardSearchParams, token?: string): Promise<DashboardStats> {
    return apiFetch<DashboardStats>(`${DASHBOARD_BASE}/stats`, {
      method: "GET",
      query: params,
      token,
    });
  },
};
