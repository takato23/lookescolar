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
          subject_id: string | null;
          approved: boolean | null;
          photo_type: string | null;
          original_filename: string | null;
          filename: string | null;
          folder_id: string | null;
          course_id: string | null;
          watermark_path: string | null;
          preview_path: string | null;
          file_size: number | null;
          mime_type: string | null;
          processing_status: string | null;
          metadata: Json | null;
          detected_qr_codes: Json | null;
          width: number | null;
          height: number | null;
          exif_taken_at: string | null;
          taken_at: string | null;
          dimensions: Json | null;
          tenant_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          storage_path?: string | null;
          event_id?: string | null;
          subject_id?: string | null;
          approved?: boolean | null;
          photo_type?: string | null;
          original_filename?: string | null;
          filename?: string | null;
          folder_id?: string | null;
          course_id?: string | null;
          watermark_path?: string | null;
          preview_path?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          processing_status?: string | null;
          metadata?: Json | null;
          detected_qr_codes?: Json | null;
          width?: number | null;
          height?: number | null;
          exif_taken_at?: string | null;
          taken_at?: string | null;
          dimensions?: Json | null;
          tenant_id?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          storage_path?: string | null;
          event_id?: string | null;
          subject_id?: string | null;
          approved?: boolean | null;
          photo_type?: string | null;
          original_filename?: string | null;
          filename?: string | null;
          folder_id?: string | null;
          course_id?: string | null;
          watermark_path?: string | null;
          preview_path?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          processing_status?: string | null;
          metadata?: Json | null;
          detected_qr_codes?: Json | null;
          width?: number | null;
          height?: number | null;
          exif_taken_at?: string | null;
          taken_at?: string | null;
          dimensions?: Json | null;
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
          event_date: string | null;
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
          token: string | null;
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
          event_date?: string | null;
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
          token?: string | null;
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
          event_date?: string | null;
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
          token?: string | null;
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
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          type: string | null;
          event_id: string;
          qr_code: string;
          grade: string | null;
          section: string | null;
          token: string | null;
          access_token: string | null;
          parent_name: string | null;
          parent_email: string | null;
          token_expires_at: string | null;
          metadata: Json | null;
          tenant_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          type?: string | null;
          event_id: string;
          qr_code: string;
          grade?: string | null;
          section?: string | null;
          token?: string | null;
          access_token?: string | null;
          parent_name?: string | null;
          parent_email?: string | null;
          token_expires_at?: string | null;
          metadata?: Json | null;
          tenant_id?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          type?: string | null;
          event_id?: string;
          qr_code?: string;
          grade?: string | null;
          section?: string | null;
          token?: string | null;
          access_token?: string | null;
          parent_name?: string | null;
          parent_email?: string | null;
          token_expires_at?: string | null;
          metadata?: Json | null;
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
          published_at: string | null;
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
          published_at?: string | null;
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
          published_at?: string | null;
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
          order_id: string | null;
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
          customer_name: string | null;
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
          order_id?: string | null;
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
          customer_name?: string | null;
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
          order_id?: string | null;
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
          customer_name?: string | null;
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
      photo_subjects: {
        Row: {
          id: string;
          photo_id: string;
          subject_id: string;
          tagged_at: string | null;
          tagged_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          photo_id: string;
          subject_id: string;
          tagged_at?: string | null;
          tagged_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          photo_id?: string;
          subject_id?: string;
          tagged_at?: string | null;
          tagged_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'photo_subjects_photo_id_fkey';
            columns: ['photo_id'];
            referencedRelation: 'photos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'photo_subjects_subject_id_fkey';
            columns: ['subject_id'];
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      photo_courses: {
        Row: {
          id: string;
          photo_id: string;
          course_id: string;
          photo_type: string | null;
          tagged_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          photo_id: string;
          course_id: string;
          photo_type?: string | null;
          tagged_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          photo_id?: string;
          course_id?: string;
          photo_type?: string | null;
          tagged_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'photo_courses_photo_id_fkey';
            columns: ['photo_id'];
            referencedRelation: 'photos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'photo_courses_course_id_fkey';
            columns: ['course_id'];
            referencedRelation: 'event_courses';
            referencedColumns: ['id'];
          },
        ];
      };
      event_levels: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          description: string | null;
          sort_order: number | null;
          active: boolean | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          description?: string | null;
          sort_order?: number | null;
          active?: boolean | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          description?: string | null;
          sort_order?: number | null;
          active?: boolean | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'event_levels_event_id_fkey';
            columns: ['event_id'];
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      event_courses: {
        Row: {
          id: string;
          event_id: string;
          level_id: string | null;
          name: string;
          grade: string | null;
          section: string | null;
          description: string | null;
          sort_order: number | null;
          active: boolean | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          event_id: string;
          level_id?: string | null;
          name: string;
          grade?: string | null;
          section?: string | null;
          description?: string | null;
          sort_order?: number | null;
          active?: boolean | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          event_id?: string;
          level_id?: string | null;
          name?: string;
          grade?: string | null;
          section?: string | null;
          description?: string | null;
          sort_order?: number | null;
          active?: boolean | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'event_courses_event_id_fkey';
            columns: ['event_id'];
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_courses_level_id_fkey';
            columns: ['level_id'];
            referencedRelation: 'event_levels';
            referencedColumns: ['id'];
          },
        ];
      };
      students: {
        Row: {
          id: string;
          course_id: string;
          name: string;
          code: string | null;
          qr_code: string | null;
          active: boolean | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          course_id: string;
          name: string;
          code?: string | null;
          qr_code?: string | null;
          active?: boolean | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          course_id?: string;
          name?: string;
          code?: string | null;
          qr_code?: string | null;
          active?: boolean | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'students_course_id_fkey';
            columns: ['course_id'];
            referencedRelation: 'event_courses';
            referencedColumns: ['id'];
          },
        ];
      };
      store_settings: {
        Row: {
          id: string;
          tenant_id: string;
          event_id: string | null;
          folder_id: string | null;
          settings: Json;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          event_id?: string | null;
          folder_id?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          event_id?: string | null;
          folder_id?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      unified_orders: {
        Row: {
          id: string;
          order_id: string | null;
          tenant_id: string;
          event_id: string | null;
          folder_id: string | null;
          token_id: string | null;
          token: string | null;
          share_token_id: string | null;
          status: string;
          currency: string | null;
          total_cents: number | null;
          total_amount: number | null;
          total_price: number | null;
          items: Json | null;
          metadata: Json | null;
          base_package: Json | null;
          selected_photos: Json | null;
          additional_copies: Json | null;
          contact_info: Json | null;
          contact_name: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          mp_preference_id: string | null;
          mercadopago_preference_id: string | null;
          mp_payment_id: string | null;
          mp_status: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          tenant_id?: string;
          event_id?: string | null;
          folder_id?: string | null;
          token_id?: string | null;
          token?: string | null;
          share_token_id?: string | null;
          status?: string;
          total_cents?: number | null;
          total_amount?: number | null;
          total_price?: number | null;
          items?: Json | null;
          metadata?: Json | null;
          base_package?: Json | null;
          selected_photos?: Json | null;
          additional_copies?: Json | null;
          contact_info?: Json | null;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          mp_preference_id?: string | null;
          mercadopago_preference_id?: string | null;
          mp_payment_id?: string | null;
          mp_status?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string | null;
          tenant_id?: string;
          event_id?: string | null;
          folder_id?: string | null;
          token_id?: string | null;
          token?: string | null;
          share_token_id?: string | null;
          status?: string;
          total_cents?: number | null;
          total_amount?: number | null;
          total_price?: number | null;
          items?: Json | null;
          metadata?: Json | null;
          base_package?: Json | null;
          selected_photos?: Json | null;
          additional_copies?: Json | null;
          contact_info?: Json | null;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          mp_preference_id?: string | null;
          mercadopago_preference_id?: string | null;
          mp_payment_id?: string | null;
          mp_status?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      downloads: {
        Row: {
          id: string;
          order_id: string;
          photo_id: string;
          download_url: string | null;
          expires_at: string | null;
          remaining_downloads: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          photo_id: string;
          download_url?: string | null;
          expires_at?: string | null;
          remaining_downloads?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          photo_id?: string;
          download_url?: string | null;
          expires_at?: string | null;
          remaining_downloads?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      token_access_log: {
        Row: {
          id: string;
          token_id: string;
          accessed_at: string;
          ip_address: string | null;
          user_agent: string | null;
          action: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          token_id: string;
          accessed_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          action?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          token_id?: string;
          accessed_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          action?: string | null;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      event_folders: {
        Row: {
          id: string;
          event_id: string;
          folder_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          folder_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          folder_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      // Additional tables needed by the codebase
      courses: {
        Row: {
          id: string;
          name: string;
          grade: string | null;
          section: string | null;
          event_id: string | null;
          tenant_id: string;
          created_at: string;
          updated_at: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          name: string;
          grade?: string | null;
          section?: string | null;
          event_id?: string | null;
          tenant_id?: string;
          created_at?: string;
          updated_at?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          name?: string;
          grade?: string | null;
          section?: string | null;
          event_id?: string | null;
          tenant_id?: string;
          created_at?: string;
          updated_at?: string | null;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          type: string | null;
          enabled: boolean;
          tenant_id: string;
          event_id: string | null;
          created_at: string;
          updated_at: string | null;
          metadata: Json | null;
          options: Json | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price: number;
          type?: string | null;
          enabled?: boolean;
          tenant_id?: string;
          event_id?: string | null;
          created_at?: string;
          updated_at?: string | null;
          metadata?: Json | null;
          options?: Json | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          type?: string | null;
          enabled?: boolean;
          tenant_id?: string;
          event_id?: string | null;
          created_at?: string;
          updated_at?: string | null;
          metadata?: Json | null;
          options?: Json | null;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          photo_id: string | null;
          product_id: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          photo_id?: string | null;
          product_id?: string | null;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          photo_id?: string | null;
          product_id?: string | null;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      photo_students: {
        Row: {
          id: string;
          photo_id: string;
          student_id: string;
          created_at: string;
          detection_metadata: Json | null;
        };
        Insert: {
          id?: string;
          photo_id: string;
          student_id: string;
          created_at?: string;
          detection_metadata?: Json | null;
        };
        Update: {
          id?: string;
          photo_id?: string;
          student_id?: string;
          created_at?: string;
          detection_metadata?: Json | null;
        };
        Relationships: [];
      };
      photo_courses: {
        Row: {
          id: string;
          photo_id: string;
          course_id: string;
          photo_type: string | null;
          tagged_at: string | null;
          tagged_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          photo_id: string;
          course_id: string;
          photo_type?: string | null;
          tagged_at?: string | null;
          tagged_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          photo_id?: string;
          course_id?: string;
          photo_type?: string | null;
          tagged_at?: string | null;
          tagged_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      photo_products: {
        Row: {
          id: string;
          photo_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          photo_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          photo_id?: string;
          product_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      share_access_log: {
        Row: {
          id: string;
          share_token_id: string | null;
          token: string | null;
          ip_address: string | null;
          user_agent: string | null;
          accessed_at: string;
          action: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          share_token_id?: string | null;
          token?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          accessed_at?: string;
          action?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          share_token_id?: string | null;
          token?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          accessed_at?: string;
          action?: string | null;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      share_favorites: {
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
        Relationships: [];
      };
      combo_packages: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          contents: Json | null;
          enabled: boolean;
          tenant_id: string;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price?: number;
          contents?: Json | null;
          enabled?: boolean;
          tenant_id?: string;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          contents?: Json | null;
          enabled?: boolean;
          tenant_id?: string;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      egress_metrics: {
        Row: {
          id: string;
          tenant_id: string;
          bytes_transferred: number;
          request_count: number;
          recorded_at: string;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          bytes_transferred?: number;
          request_count?: number;
          recorded_at?: string;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          bytes_transferred?: number;
          request_count?: number;
          recorded_at?: string;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      temp_photo_tags: {
        Row: {
          id: string;
          photo_id: string;
          tag_type: string | null;
          tag_value: string | null;
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          photo_id: string;
          tag_type?: string | null;
          tag_value?: string | null;
          created_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          photo_id?: string;
          tag_type?: string | null;
          tag_value?: string | null;
          created_at?: string;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          amount: number;
          status: string;
          payment_method: string | null;
          external_id: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          amount?: number;
          status?: string;
          payment_method?: string | null;
          external_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          amount?: number;
          status?: string;
          payment_method?: string | null;
          external_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      payment_settings: {
        Row: {
          id: string;
          tenant_id: string;
          provider: string;
          enabled: boolean;
          credentials: Json | null;
          settings: Json | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          provider?: string;
          enabled?: boolean;
          credentials?: Json | null;
          settings?: Json | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          provider?: string;
          enabled?: boolean;
          credentials?: Json | null;
          settings?: Json | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      performance_metrics: {
        Row: {
          id: string;
          tenant_id: string | null;
          metric_type: string;
          value: number;
          recorded_at: string;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          metric_type: string;
          value?: number;
          recorded_at?: string;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          tenant_id?: string | null;
          metric_type?: string;
          value?: number;
          recorded_at?: string;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      event_product_pricing: {
        Row: {
          id: string;
          event_id: string;
          product_id: string;
          price: number;
          enabled: boolean;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          event_id: string;
          product_id: string;
          price?: number;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          event_id?: string;
          product_id?: string;
          price?: number;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: number;
          business_name: string;
          business_email: string | null;
          business_phone: string | null;
          business_address: string | null;
          business_website: string | null;
          watermark_text: string;
          watermark_position: string;
          watermark_opacity: number;
          watermark_size: string;
          upload_max_size_mb: number;
          upload_max_concurrent: number;
          upload_quality: number;
          upload_max_resolution: number;
          default_photo_price_ars: number;
          bulk_discount_percentage: number;
          bulk_discount_minimum: number;
          pack_price_ars: number;
          notify_new_orders: boolean;
          notify_payments: boolean;
          notify_weekly_report: boolean;
          notify_storage_alerts: boolean;
          timezone: string;
          date_format: string;
          currency: string;
          language: string;
          auto_cleanup_previews: boolean;
          cleanup_preview_days: number;
          qr_default_size: string;
          qr_detection_sensitivity: string;
          qr_auto_tag_on_upload: boolean;
          qr_show_in_gallery: boolean;
          created_at: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: number;
          business_name?: string;
          business_email?: string | null;
          business_phone?: string | null;
          business_address?: string | null;
          business_website?: string | null;
          watermark_text?: string;
          watermark_position?: string;
          watermark_opacity?: number;
          watermark_size?: string;
          upload_max_size_mb?: number;
          upload_max_concurrent?: number;
          upload_quality?: number;
          upload_max_resolution?: number;
          default_photo_price_ars?: number;
          bulk_discount_percentage?: number;
          bulk_discount_minimum?: number;
          pack_price_ars?: number;
          notify_new_orders?: boolean;
          notify_payments?: boolean;
          notify_weekly_report?: boolean;
          notify_storage_alerts?: boolean;
          timezone?: string;
          date_format?: string;
          currency?: string;
          language?: string;
          auto_cleanup_previews?: boolean;
          cleanup_preview_days?: number;
          qr_default_size?: string;
          qr_detection_sensitivity?: string;
          qr_auto_tag_on_upload?: boolean;
          qr_show_in_gallery?: boolean;
          created_at?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: number;
          business_name?: string;
          business_email?: string | null;
          business_phone?: string | null;
          business_address?: string | null;
          business_website?: string | null;
          watermark_text?: string;
          watermark_position?: string;
          watermark_opacity?: number;
          watermark_size?: string;
          upload_max_size_mb?: number;
          upload_max_concurrent?: number;
          upload_quality?: number;
          upload_max_resolution?: number;
          default_photo_price_ars?: number;
          bulk_discount_percentage?: number;
          bulk_discount_minimum?: number;
          pack_price_ars?: number;
          notify_new_orders?: boolean;
          notify_payments?: boolean;
          notify_weekly_report?: boolean;
          notify_storage_alerts?: boolean;
          timezone?: string;
          date_format?: string;
          currency?: string;
          language?: string;
          auto_cleanup_previews?: boolean;
          cleanup_preview_days?: number;
          qr_default_size?: string;
          qr_detection_sensitivity?: string;
          qr_auto_tag_on_upload?: boolean;
          qr_show_in_gallery?: boolean;
          created_at?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'app_settings_updated_by_fkey';
            columns: ['updated_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      app_settings_audit: {
        Row: {
          id: number;
          changed_at: string | null;
          changed_by: string | null;
          operation: string | null;
          before_data: Json | null;
          after_data: Json | null;
        };
        Insert: {
          id?: number;
          changed_at?: string | null;
          changed_by?: string | null;
          operation?: string | null;
          before_data?: Json | null;
          after_data?: Json | null;
        };
        Update: {
          id?: number;
          changed_at?: string | null;
          changed_by?: string | null;
          operation?: string | null;
          before_data?: Json | null;
          after_data?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'app_settings_audit_changed_by_fkey';
            columns: ['changed_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      assets: {
        Row: {
          id: string;
          photo_id: string | null;
          folder_id: string | null;
          photo_type: string | null;
          dimensions: Json | null;
          taken_at: string | null;
          storage_path: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          photo_id?: string | null;
          folder_id?: string | null;
          photo_type?: string | null;
          dimensions?: Json | null;
          taken_at?: string | null;
          storage_path?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          photo_id?: string | null;
          folder_id?: string | null;
          photo_type?: string | null;
          dimensions?: Json | null;
          taken_at?: string | null;
          storage_path?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [];
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
