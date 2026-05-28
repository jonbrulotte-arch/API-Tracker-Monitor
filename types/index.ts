export type UserRole = "ADMIN" | "MEMBER";

export type InjectionType = "header" | "query" | "body" | "custom";

export type ExpiryStatus = "none" | "healthy" | "warning" | "critical" | "expired";

export type MonitorStatus = "healthy" | "failing" | "unknown" | "disabled";

export interface ApiKeyWithRelations {
  id: string;
  name: string;
  provider: string;
  encryptedValue: string;
  expiresAt: Date | null;
  tags: string;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  monitorConfig: {
    id: string;
    endpoint: string;
    method: string;
    injectionType: string;
    injectionKey: string;
    injectionFormat: string | null;
    expectedStatus: number;
    intervalMinutes: number;
    enabled: boolean;
    lastCheckedAt: Date | null;
  } | null;
  monitorResults: {
    id: string;
    checkedAt: Date;
    ok: boolean;
    statusCode: number | null;
    responseMs: number | null;
    errorMessage: string | null;
  }[];
}

export interface DashboardStats {
  total: number;
  expiringSoon: number;
  expired: number;
  monitored: number;
  failing: number;
}
