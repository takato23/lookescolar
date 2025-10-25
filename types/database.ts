export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      photos: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string | null;
          storage_path: string | null;
          event_id: string | null;
          approved: boolean | null;
          photo_type: string | null;
          original_filename: string | null;
          folder_id: string | null;
          watermark_path: string | null;
          preview_path: string | null;
          file_size: number | null;
          mime_type: string | null;
          processing_status: string | null;
          metadata: Json | null;
          detected_qr_codes: Json | null;
          width: number | null;
          height: number | null;
          tenant_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          storage_path?: string | null;
          event_id?: string | null;
          approved?: boolean | null;
          photo_type?: string | null;
          original_filename?: string | null;
          folder_id?: string | null;
          watermark_path?: string | null;
          preview_path?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          processing_status?: string | null;
          metadata?: Json | null;
          detected_qr_codes?: Json | null;
          width?: number | null;
          height?: number | null;
          tenant_id?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          storage_path?: string | null;
          event_id?: string | null;
          approved?: boolean | null;
          photo_type?: string | null;
          original_filename?: string | null;
          folder_id?: string | null;
          watermark_path?: string | null;
          preview_path?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          processing_status?: string | null;
          metadata?: Json | null;
          detected_qr_codes?: Json | null;
          width?: number | null;
          height?: number | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'photos_event_id_fkey';
            columns: ['event_id'];
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'photos_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      events: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string | null;
          name: string;
          school_name: string | null;
          location: string | null;
          date: string | null;
          start_date: string | null;
          end_date: string | null;
          status: string | null;
          price_per_photo: number | null;
          published: boolean | null;
          active: boolean | null;
          settings: Json | null;
          photo_prices: Json | null;
          school: string | null;
          photographer_name: string | null;
          photographer_email: string | null;
          photographer_phone: string | null;
          tenant_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          school_name?: string | null;
          location?: string | null;
          date?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: string | null;
          price_per_photo?: number | null;
          published?: boolean | null;
          active?: boolean | null;
          settings?: Json | null;
          photo_prices?: Json | null;
          school?: string | null;
          photographer_name?: string | null;
          photographer_email?: string | null;
          photographer_phone?: string | null;
          tenant_id?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          school_name?: string | null;
          location?: string | null;
          date?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: string | null;
          price_per_photo?: number | null;
          published?: boolean | null;
          active?: boolean | null;
          settings?: Json | null;
          photo_prices?: Json | null;
          school?: string | null;
          photographer_name?: string | null;
          photographer_email?: string | null;
          photographer_phone?: string | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'events_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      subjects: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          event_id: string;
          qr_code: string;
          tenant_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          event_id: string;
          qr_code: string;
          tenant_id?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          event_id?: string;
          qr_code?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subjects_event_id_fkey';
            columns: ['event_id'];
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subjects_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      folders: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string | null;
          name: string;
          event_id: string | null;
          parent_id: string | null;
          path: string | null;
          depth: number | null;
          sort_order: number | null;
          description: string | null;
          metadata: Json | null;
          photo_count: number | null;
          child_folder_count: number | null;
          share_token: string | null;
          is_published: boolean | null;
          store_settings: Json | null;
          cover_asset_id: string | null;
          tenant_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          event_id?: string | null;
          parent_id?: string | null;
          path?: string | null;
          depth?: number | null;
          sort_order?: number | null;
          description?: string | null;
          metadata?: Json | null;
          photo_count?: number | null;
          child_folder_count?: number | null;
          share_token?: string | null;
          is_published?: boolean | null;
          store_settings?: Json | null;
          cover_asset_id?: string | null;
          tenant_id?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          event_id?: string | null;
          parent_id?: string | null;
          path?: string | null;
          depth?: number | null;
          sort_order?: number | null;
          description?: string | null;
          metadata?: Json | null;
          photo_count?: number | null;
          child_folder_count?: number | null;
          share_token?: string | null;
          is_published?: boolean | null;
          store_settings?: Json | null;
          cover_asset_id?: string | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'folders_event_id_fkey';
            columns: ['event_id'];
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'folders_parent_id_fkey';
            columns: ['parent_id'];
            referencedRelation: 'folders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'folders_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      assets: {
        Row: {
          id: string;
          created_at: string;
          folder_id: string;
          filename: string;
          original_path: string | null;
          storage_path: string | null;
          preview_path: string | null;
          watermark_path: string | null;
          file_size: number | null;
          mime_type: string | null;
          status: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          folder_id: string;
          filename: string;
          original_path?: string | null;
          storage_path?: string | null;
          preview_path?: string | null;
          watermark_path?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          status?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          folder_id?: string;
          filename?: string;
          original_path?: string | null;
          storage_path?: string | null;
          preview_path?: string | null;
          watermark_path?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          status?: string | null;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'assets_folder_id_fkey';
            columns: ['folder_id'];
            referencedRelation: 'folders';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string | null;
          event_id: string | null;
          folder_id: string | null;
          subject_id: string | null;
          status: string;
          total_cents: number | null;
          total_amount: number | null;
          items: Json | null;
          metadata: Json | null;
          contact_name: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          contact_info: Json | null;
          shipping_address: Json | null;
          mercadopago_preference_id: string | null;
          mp_preference_id: string | null;
          mp_external_reference: string | null;
          mp_payment_id: string | null;
          mp_status: string | null;
          mp_status_detail: string | null;
          payment_method: string | null;
          payment_details: Json | null;
          delivered_at: string | null;
          last_status_change: string | null;
          notes: string | null;
          tenant_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string | null;
          event_id?: string | null;
          folder_id?: string | null;
          subject_id?: string | null;
          status?: string;
          total_cents?: number | null;
          total_amount?: number | null;
          items?: Json | null;
          metadata?: Json | null;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          contact_info?: Json | null;
          shipping_address?: Json | null;
          mercadopago_preference_id?: string | null;
          mp_preference_id?: string | null;
          mp_external_reference?: string | null;
          mp_payment_id?: string | null;
          mp_status?: string | null;
          mp_status_detail?: string | null;
          payment_method?: string | null;
          payment_details?: Json | null;
          delivered_at?: string | null;
          last_status_change?: string | null;
          notes?: string | null;
          tenant_id?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string | null;
          event_id?: string | null;
          folder_id?: string | null;
          subject_id?: string | null;
          status?: string;
          total_cents?: number | null;
          total_amount?: number | null;
          items?: Json | null;
          metadata?: Json | null;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          contact_info?: Json | null;
          shipping_address?: Json | null;
          mercadopago_preference_id?: string | null;
          mp_preference_id?: string | null;
          mp_external_reference?: string | null;
          mp_payment_id?: string | null;
          mp_status?: string | null;
          mp_status_detail?: string | null;
          payment_method?: string | null;
          payment_details?: Json | null;
          delivered_at?: string | null;
          last_status_change?: string | null;
          notes?: string | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_event_id_fkey';
            columns: ['event_id'];
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_folder_id_fkey';
            columns: ['folder_id'];
            referencedRelation: 'folders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_subject_id_fkey';
            columns: ['subject_id'];
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      plans: {
        Row: {
          code: string;
          name: string;
          description: string | null;
          max_events: number | null;
          max_photos_per_event: number | null;
          max_shares_per_event: number | null;
          price_monthly: number | null;
          currency: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          name: string;
          description?: string | null;
          max_events?: number | null;
          max_photos_per_event?: number | null;
          max_shares_per_event?: number | null;
          price_monthly?: number | null;
          currency?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          name?: string;
          description?: string | null;
          max_events?: number | null;
          max_photos_per_event?: number | null;
          max_shares_per_event?: number | null;
          price_monthly?: number | null;
          currency?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      whatsapp_notification_attempts: {
        Row: {
          id: string;
          notification_id: string;
          tenant_id: string;
          attempt_number: number;
          status: string;
          request_payload: Json | null;
          response_payload: Json | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          notification_id: string;
          tenant_id: string;
          attempt_number: number;
          status: string;
          request_payload?: Json | null;
          response_payload?: Json | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          notification_id?: string;
          tenant_id?: string;
          attempt_number?: number;
          status?: string;
          request_payload?: Json | null;
          response_payload?: Json | null;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsapp_notification_attempts_notification_id_fkey';
            columns: ['notification_id'];
            referencedRelation: 'whatsapp_notifications';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'whatsapp_notification_attempts_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      whatsapp_notifications: {
        Row: {
          id: string;
          tenant_id: string;
          order_id: string;
          order_source: string;
          event_id: string | null;
          photographer_phone: string | null;
          photographer_name: string | null;
          photographer_email: string | null;
          status: string;
          provider: string;
          provider_message_id: string | null;
          attempt_count: number;
          last_error: string | null;
          message_body: string;
          message_payload: Json;
          next_retry_at: string | null;
          last_attempt_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          order_id: string;
          order_source?: string;
          event_id?: string | null;
          photographer_phone?: string | null;
          photographer_name?: string | null;
          photographer_email?: string | null;
          status?: string;
          provider?: string;
          provider_message_id?: string | null;
          attempt_count?: number;
          last_error?: string | null;
          message_body: string;
          message_payload?: Json;
          next_retry_at?: string | null;
          last_attempt_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          order_id?: string;
          order_source?: string;
          event_id?: string | null;
          photographer_phone?: string | null;
          photographer_name?: string | null;
          photographer_email?: string | null;
          status?: string;
          provider?: string;
          provider_message_id?: string | null;
          attempt_count?: number;
          last_error?: string | null;
          message_body?: string;
          message_payload?: Json;
          next_retry_at?: string | null;
          last_attempt_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsapp_notifications_event_id_fkey';
            columns: ['event_id'];
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'whatsapp_notifications_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      tenants: {
        Row: {
          id: string;
          slug: string;
          name: string;
          primary_domain: string | null;
          fallback_domains: string[] | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          primary_domain?: string | null;
          fallback_domains?: string[] | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          primary_domain?: string | null;
          fallback_domains?: string[] | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tenant_plan_subscriptions: {
        Row: {
          id: string;
          tenant_id: string;
          plan_code: string;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          trial_ends_at: string | null;
          billing_provider: string | null;
          billing_external_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          plan_code: string;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          trial_ends_at?: string | null;
          billing_provider?: string | null;
          billing_external_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          plan_code?: string;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          trial_ends_at?: string | null;
          billing_provider?: string | null;
          billing_external_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tenant_plan_subscriptions_plan_code_fkey';
            columns: ['plan_code'];
            referencedRelation: 'plans';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'tenant_plan_subscriptions_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      subject_tokens: {
        Row: {
          id: string;
          subject_id: string;
          token: string;
          expires_at: string;
          created_at: string | null;
          updated_at: string | null;
          metadata: Json | null;
          rotated_at: string | null;
          status: string | null;
          tenant_id: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          token: string;
          expires_at: string;
          created_at?: string | null;
          updated_at?: string | null;
          metadata?: Json | null;
          rotated_at?: string | null;
          status?: string | null;
          tenant_id?: string;
        };
        Update: {
          id?: string;
          subject_id?: string;
          token?: string;
          expires_at?: string;
          created_at?: string | null;
          updated_at?: string | null;
          metadata?: Json | null;
          rotated_at?: string | null;
          status?: string | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subject_tokens_subject_id_fkey';
            columns: ['subject_id'];
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subject_tokens_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      enhanced_tokens: {
        Row: {
          id: string;
          token: string;
          type: string;
          expires_at: string;
          is_active: boolean | null;
          usage_count: number | null;
          last_used_at: string | null;
          student_ids: string[] | null;
          family_email: string | null;
          event_id: string | null;
          metadata: Json | null;
          access_rules: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          token: string;
          type?: string;
          expires_at: string;
          is_active?: boolean | null;
          usage_count?: number | null;
          last_used_at?: string | null;
          student_ids?: string[] | null;
          family_email?: string | null;
          event_id?: string | null;
          metadata?: Json | null;
          access_rules?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          token?: string;
          type?: string;
          expires_at?: string;
          is_active?: boolean | null;
          usage_count?: number | null;
          last_used_at?: string | null;
          student_ids?: string[] | null;
          family_email?: string | null;
          event_id?: string | null;
          metadata?: Json | null;
          access_rules?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'enhanced_tokens_event_id_fkey';
            columns: ['event_id'];
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      token_aliases: {
        Row: {
          id: string;
          alias: string;
          short_code: string;
          token_id: string;
          generated_by: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          alias: string;
          short_code: string;
          token_id: string;
          generated_by?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          alias?: string;
          short_code?: string;
          token_id?: string;
          generated_by?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'token_aliases_token_id_fkey';
            columns: ['token_id'];
            referencedRelation: 'enhanced_tokens';
            referencedColumns: ['id'];
          },
        ];
      };
      public_access_tokens: {
        Row: {
          id: string;
          token: string;
          access_type: string;
          event_id: string | null;
          share_token_id: string | null;
          subject_token_id: string | null;
          student_token_id: string | null;
          folder_id: string | null;
          subject_id: string | null;
          student_id: string | null;
          share_type: string | null;
          photo_ids: string[] | null;
          title: string | null;
          description: string | null;
          password_hash: string | null;
          metadata: Json;
          allow_download: boolean;
          allow_comments: boolean;
          expires_at: string | null;
          max_views: number | null;
          view_count: number;
          is_active: boolean;
          is_legacy: boolean;
          legacy_source: string;
          legacy_reference: string | null;
          legacy_payload: Json | null;
          legacy_migrated_at: string | null;
          scope_config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          token: string;
          access_type: string;
          event_id?: string | null;
          share_token_id?: string | null;
          subject_token_id?: string | null;
          student_token_id?: string | null;
          folder_id?: string | null;
          subject_id?: string | null;
          student_id?: string | null;
          share_type?: string | null;
          photo_ids?: string[] | null;
          title?: string | null;
          description?: string | null;
          password_hash?: string | null;
          metadata?: Json;
          allow_download?: boolean;
          allow_comments?: boolean;
          expires_at?: string | null;
          max_views?: number | null;
          view_count?: number;
          is_active?: boolean;
          is_legacy?: boolean;
          legacy_source?: string;
          legacy_reference?: string | null;
          legacy_payload?: Json | null;
          legacy_migrated_at?: string | null;
          scope_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          token?: string;
          access_type?: string;
          event_id?: string | null;
          share_token_id?: string | null;
          subject_token_id?: string | null;
          student_token_id?: string | null;
          folder_id?: string | null;
          subject_id?: string | null;
          student_id?: string | null;
          share_type?: string | null;
          photo_ids?: string[] | null;
          title?: string | null;
          description?: string | null;
          password_hash?: string | null;
          metadata?: Json;
          allow_download?: boolean;
          allow_comments?: boolean;
          expires_at?: string | null;
          max_views?: number | null;
          view_count?: number;
          is_active?: boolean;
          is_legacy?: boolean;
          legacy_source?: string;
          legacy_reference?: string | null;
          legacy_payload?: Json | null;
          legacy_migrated_at?: string | null;
          scope_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'public_access_tokens_event_id_fkey';
            columns: ['event_id'];
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_access_tokens_folder_id_fkey';
            columns: ['folder_id'];
            referencedRelation: 'folders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_access_tokens_share_token_id_fkey';
            columns: ['share_token_id'];
            referencedRelation: 'share_tokens';
            referencedColumns: ['id'];
          },
        ];
      };
      share_audiences: {
        Row: {
          id: string;
          share_token_id: string;
          audience_type: string;
          subject_id: string | null;
          contact_email: string | null;
          status: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          share_token_id: string;
          audience_type: string;
          subject_id?: string | null;
          contact_email?: string | null;
          status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          share_token_id?: string;
          audience_type?: string;
          subject_id?: string | null;
          contact_email?: string | null;
          status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'share_audiences_share_token_id_fkey';
            columns: ['share_token_id'];
            referencedRelation: 'share_tokens';
            referencedColumns: ['id'];
          },
        ];
      };
      share_token_contents: {
        Row: {
          id: string;
          share_token_id: string;
          photo_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          share_token_id: string;
          photo_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          share_token_id?: string;
          photo_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'share_token_contents_photo_id_fkey';
            columns: ['photo_id'];
            referencedRelation: 'photos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'share_token_contents_share_token_id_fkey';
            columns: ['share_token_id'];
            referencedRelation: 'share_tokens';
            referencedColumns: ['id'];
          },
        ];
      };
      share_tokens: {
        Row: {
          id: string;
          token: string;
          event_id: string | null;
          folder_id: string | null;
          subject_id: string | null;
          share_type: string | null;
          photo_ids: string[] | null;
          title: string | null;
          description: string | null;
          password_hash: string | null;
          expires_at: string | null;
          max_views: number | null;
          view_count: number;
          allow_download: boolean;
          allow_comments: boolean;
          is_active: boolean;
          metadata: Json;
          scope_config: Json;
          security_metadata: Json | null;
          public_access_token_id: string | null;
          legacy_migrated_at: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          token: string;
          event_id?: string | null;
          folder_id?: string | null;
          subject_id?: string | null;
          share_type?: string | null;
          photo_ids?: string[] | null;
          title?: string | null;
          description?: string | null;
          password_hash?: string | null;
          expires_at?: string | null;
          max_views?: number | null;
          view_count?: number;
          allow_download?: boolean;
          allow_comments?: boolean;
          is_active?: boolean;
          metadata?: Json;
          scope_config?: Json;
          security_metadata?: Json | null;
          public_access_token_id?: string | null;
          legacy_migrated_at?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          token?: string;
          event_id?: string | null;
          folder_id?: string | null;
          subject_id?: string | null;
          share_type?: string | null;
          photo_ids?: string[] | null;
          title?: string | null;
          description?: string | null;
          password_hash?: string | null;
          expires_at?: string | null;
          max_views?: number | null;
          view_count?: number;
          allow_download?: boolean;
          allow_comments?: boolean;
          is_active?: boolean;
          metadata?: Json;
          scope_config?: Json;
          security_metadata?: Json | null;
          public_access_token_id?: string | null;
          legacy_migrated_at?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'share_tokens_event_id_fkey';
            columns: ['event_id'];
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'share_tokens_folder_id_fkey';
            columns: ['folder_id'];
            referencedRelation: 'folders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'share_tokens_public_access_token_id_fkey';
            columns: ['public_access_token_id'];
            referencedRelation: 'public_access_tokens';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'share_tokens_subject_id_fkey';
            columns: ['subject_id'];
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
    } & {
      [key: string]: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: unknown[];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_descendant_folders: {
        Args: {
          p_folder_id: string;
        };
        Returns: {
          id: string;
        }[];
      };
    } & {
      [key: string]: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
