export type EnhancedTokenAccessLevel =
  | 'none'
  | 'student'
  | 'family'
  | 'group'
  | 'event';

export type EnhancedTokenErrorCode =
  | 'INVALID_TOKEN'
  | 'EXPIRED_TOKEN'
  | 'INACTIVE_TOKEN'
  | 'EVENT_INACTIVE'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR';

export interface EnhancedTokenValidationResponse {
  valid: boolean;
  access_level: EnhancedTokenAccessLevel;
  token_type?: string;
  expires_in_days?: number;
  warnings?: string[];
  event?: {
    id: string;
    name: string;
    school_name?: string;
    start_date?: string;
    end_date?: string;
  };
  student?: {
    id: string;
    name: string;
    event: {
      id: string;
      name: string;
      school_name?: string;
      start_date?: string;
      end_date?: string;
    };
  };
  family?: {
    email: string;
    students: Array<{
      id: string;
      name: string;
    }>;
    event: {
      id: string;
      name: string;
      school_name?: string;
      start_date?: string;
      end_date?: string;
    };
  };
  permissions?: {
    can_view_photos: boolean;
    can_download_previews: boolean;
    can_purchase: boolean;
    can_share: boolean;
    max_devices: number;
    device_fingerprint_required: boolean;
  };
  security?: {
    device_registered: boolean;
    ip_address: string;
    access_logged: boolean;
    usage_count: number;
    last_access?: string;
  };
  error?: string;
  error_code?: EnhancedTokenErrorCode;
}

export type AliasLookupErrorCode =
  | 'INVALID_ALIAS'
  | 'ALIAS_NOT_FOUND'
  | 'INACTIVE_TOKEN'
  | 'EXPIRED_TOKEN'
  | 'INVALID_TOKEN'
  | 'SERVER_ERROR';

export interface AliasLookupResponse {
  alias: string;
  short_code: string;
  token: string;
  token_id: string;
  event_id?: string | null;
  expires_at?: string | null;
  warnings?: string[];
}
