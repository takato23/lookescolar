export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      photos: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          storage_path: string
          event_id: string
          approved: boolean
          photo_type: string
          original_filename: string
          folder_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          storage_path: string
          event_id: string
          approved?: boolean
          photo_type: string
          original_filename: string
          folder_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          storage_path?: string
          event_id?: string
          approved?: boolean
          photo_type?: string
          original_filename?: string
          folder_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      }
      events: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          school_name: string
          start_date: string
          end_date: string
          published: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          school_name: string
          start_date: string
          end_date: string
          published?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          school_name?: string
          start_date?: string
          end_date?: string
          published?: boolean
        }
        Relationships: []
      }
      subjects: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          event_id: string
          qr_code: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          event_id: string
          qr_code: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          event_id?: string
          qr_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      }
      folders: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          event_id: string
          parent_id: string | null
          path: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          event_id: string
          parent_id?: string | null
          path: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          event_id?: string
          parent_id?: string | null
          path?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            referencedRelation: "folders"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}


