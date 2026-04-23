export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      members: {
        Row: {
          id: string
          created_at: string
          first_name: string
          last_name: string
          email: string
          mobile: string | null
          emergency_name: string
          emergency_phone: string
          emergency_relationship: string
          medical_info: string | null
          consent_data: boolean
          health_declaration: boolean
          status: 'active' | 'inactive'
        }
        Insert: {
          id?: string
          created_at?: string
          first_name: string
          last_name: string
          email: string
          mobile?: string | null
          emergency_name: string
          emergency_phone: string
          emergency_relationship: string
          medical_info?: string | null
          consent_data: boolean
          health_declaration: boolean
          status?: 'active' | 'inactive'
        }
        Update: Partial<Database['public']['Tables']['members']['Insert']>
      }
      runs: {
        Row: {
          id: string
          created_at: string
          date: string
          title: string
          description: string | null
          route_slug: string | null
          distance_km: number | null
          terrain: 'road' | 'trail' | 'mixed' | null
          meeting_point: string
          leader_name: string | null
          cancelled: boolean
          on_tour: boolean
          has_jeffing: boolean
          meeting_map_url: string | null
          run_type: string
        }
        Insert: {
          id?: string
          created_at?: string
          date: string
          title: string
          description?: string | null
          route_slug?: string | null
          distance_km?: number | null
          terrain?: 'road' | 'trail' | 'mixed' | null
          meeting_point?: string
          leader_name?: string | null
          cancelled?: boolean
          on_tour?: boolean
          has_jeffing?: boolean
          meeting_map_url?: string | null
          run_type?: string
        }
        Update: Partial<Database['public']['Tables']['runs']['Insert']>
      }
      roundup_posts: {
        Row: {
          id: string
          created_at: string
          weekend_of: string
          intro: string | null
          published: boolean
          published_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          weekend_of: string
          intro?: string | null
          published?: boolean
          published_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['roundup_posts']['Insert']>
      }
      parkrun_results: {
        Row: {
          id: string
          roundup_id: string
          venue: string
          location: string | null
          narrative: string
          milestone: number | null
          pb: boolean
          podium: string | null
          sort_order: number
        }
        Insert: {
          id?: string
          roundup_id: string
          venue: string
          location?: string | null
          narrative: string
          milestone?: number | null
          pb?: boolean
          podium?: string | null
          sort_order?: number
        }
        Update: Partial<Database['public']['Tables']['parkrun_results']['Insert']>
      }
      race_results: {
        Row: {
          id: string
          roundup_id: string
          name: string
          distance: string
          terrain: 'road' | 'trail' | 'mixed'
          date: string
          location: string
          narrative: string
          podium: string | null
          sort_order: number
        }
        Insert: {
          id?: string
          roundup_id: string
          name: string
          distance: string
          terrain: 'road' | 'trail' | 'mixed'
          date: string
          location: string
          narrative: string
          podium?: string | null
          sort_order?: number
        }
        Update: Partial<Database['public']['Tables']['race_results']['Insert']>
      }
      social_run_results: {
        Row: {
          id: string
          roundup_id: string
          name: string
          date: string
          location: string
          narrative: string
          sort_order: number
        }
        Insert: {
          id?: string
          roundup_id: string
          name: string
          date: string
          location: string
          narrative: string
          sort_order?: number
        }
        Update: Partial<Database['public']['Tables']['social_run_results']['Insert']>
      }
      roundup_photos: {
        Row: {
          id: string
          roundup_id: string
          url: string
          alt: string
          caption: string | null
          credit: string | null
          tall: boolean
          sort_order: number
        }
        Insert: {
          id?: string
          roundup_id: string
          url: string
          alt: string
          caption?: string | null
          credit?: string | null
          tall?: boolean
          sort_order?: number
        }
        Update: Partial<Database['public']['Tables']['roundup_photos']['Insert']>
      }
    }
  }
}
