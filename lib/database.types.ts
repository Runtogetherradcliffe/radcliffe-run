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
          meeting_lat: number | null
          meeting_lng: number | null
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
          meeting_lat?: number | null
          meeting_lng?: number | null
          run_type?: string
        }
        Update: Partial<Database['public']['Tables']['runs']['Insert']>
      }
    }
  }
}
