export interface FacebookApp {
  id: string;
  secret: string;
  token: string;
}

export interface TokenData {
  appId: string;
  token: string;
  expiresAt: number;
  lastUpdated: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface TokenDebugResponse {
  data: {
    app_id: string;
    type: string;
    application: string;
    data_access_expires_at: number;
    expires_at: number;
    is_valid: boolean;
    issued_at: number;
    scopes: string[];
    user_id: string;
  };
}

// GoHighLevel (GHL) Types
export interface GHLAccount {
  accountId: string;
  accountName: string;
  apiKey: string;
}

export interface GHLAppointmentMetrics {
  accountId: string;
  accountName: string;
  date: string;
  totalScheduled: number;
  scheduledPaid: number;
  showed: number;
  closed: number;
  scheduledConfirmed: number;
}

export interface GHLFunnelMetrics {
  accountId: string;
  accountName: string;
  date: string;
  funnelName: string;
  optInRate: number;
  uniqueViews: number;
  optIns: number;
}

