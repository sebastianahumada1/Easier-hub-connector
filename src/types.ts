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
export interface GHLAppointment {
  id: string;
  locationId: string;
  contactId: string;
  calendarId: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string; // 'confirmed', 'unconfirmed', 'paid', 'cancelled', 'showed', 'noshow'
  appointmentStatus?: string;
  assignedUserId?: string;
  notes?: string;
  [key: string]: any;
}

export interface GHLAppointmentMetrics {
  date: string;
  locationId: string;
  locationName: string;
  totalScheduled: number;
  scheduledPaid: number;
  showed: number;
  closed: number;
  scheduledConfirmed: number;
}

export interface GHLLocation {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  [key: string]: any;
}

export interface GHLCalendar {
  id: string;
  name: string;
  locationId: string;
  groupId?: string;
  calendarType?: string;
  isActive?: boolean;
  [key: string]: any;
}

