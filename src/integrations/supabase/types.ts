export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      comp_schemes: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          id: string
          name: string
          target_payout_eur: number
          target_units: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          config: Json
          created_at?: string
          id?: string
          name: string
          target_payout_eur: number
          target_units: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          name?: string
          target_payout_eur?: number
          target_units?: number
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          archive_reason: string | null
          archived_at: string | null
          cif: string | null
          comercial_wasp: string | null
          contact_info: Json | null
          contacto_wasp: string | null
          cp: string | null
          created_at: string | null
          data_sources: Json | null
          decision_makers: Json | null
          description: string | null
          detected_needs: string[] | null
          digitalization_level: string | null
          employees: number
          enrichment_attempted: boolean | null
          estimated_arpu: number | null
          growth_signals: string[] | null
          id: string
          id_wasp: string | null
          is_hot: boolean
          is_multi_site: boolean | null
          it_complexity: string | null
          lat: number
          lineas_fijo: number | null
          lineas_movil: number | null
          lineas_total: number | null
          linkedin: string | null
          lng: number
          localidad: string | null
          location: string | null
          location_type: string | null
          name: string
          next_best_action: Json | null
          operador_actual: string | null
          operador_fijo: string | null
          opportunity_score: number
          origen: string | null
          penalizacion: number | null
          permanencia: number | null
          provincia: string | null
          recent_news: string[] | null
          recommended_products: string[] | null
          rentabilidad_linea: number | null
          representante_legal: Json
          score_breakdown: Json | null
          sector: string
          tamanio_cliente: string | null
          telefono_secundario: string | null
          triaje_estado: string | null
          triaje_fecha: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          cif?: string | null
          comercial_wasp?: string | null
          contact_info?: Json | null
          contacto_wasp?: string | null
          cp?: string | null
          created_at?: string | null
          data_sources?: Json | null
          decision_makers?: Json | null
          description?: string | null
          detected_needs?: string[] | null
          digitalization_level?: string | null
          employees?: number
          enrichment_attempted?: boolean | null
          estimated_arpu?: number | null
          growth_signals?: string[] | null
          id: string
          id_wasp?: string | null
          is_hot?: boolean
          is_multi_site?: boolean | null
          it_complexity?: string | null
          lat: number
          lineas_fijo?: number | null
          lineas_movil?: number | null
          lineas_total?: number | null
          linkedin?: string | null
          lng: number
          localidad?: string | null
          location?: string | null
          location_type?: string | null
          name: string
          next_best_action?: Json | null
          operador_actual?: string | null
          operador_fijo?: string | null
          opportunity_score?: number
          origen?: string | null
          penalizacion?: number | null
          permanencia?: number | null
          provincia?: string | null
          recent_news?: string[] | null
          recommended_products?: string[] | null
          rentabilidad_linea?: number | null
          representante_legal?: Json
          score_breakdown?: Json | null
          sector: string
          tamanio_cliente?: string | null
          telefono_secundario?: string | null
          triaje_estado?: string | null
          triaje_fecha?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          cif?: string | null
          comercial_wasp?: string | null
          contact_info?: Json | null
          contacto_wasp?: string | null
          cp?: string | null
          created_at?: string | null
          data_sources?: Json | null
          decision_makers?: Json | null
          description?: string | null
          detected_needs?: string[] | null
          digitalization_level?: string | null
          employees?: number
          enrichment_attempted?: boolean | null
          estimated_arpu?: number | null
          growth_signals?: string[] | null
          id?: string
          id_wasp?: string | null
          is_hot?: boolean
          is_multi_site?: boolean | null
          it_complexity?: string | null
          lat?: number
          lineas_fijo?: number | null
          lineas_movil?: number | null
          lineas_total?: number | null
          linkedin?: string | null
          lng?: number
          localidad?: string | null
          location?: string | null
          location_type?: string | null
          name?: string
          next_best_action?: Json | null
          operador_actual?: string | null
          operador_fijo?: string | null
          opportunity_score?: number
          origen?: string | null
          penalizacion?: number | null
          permanencia?: number | null
          provincia?: string | null
          recent_news?: string[] | null
          recommended_products?: string[] | null
          rentabilidad_linea?: number | null
          representante_legal?: Json
          score_breakdown?: Json | null
          sector?: string
          tamanio_cliente?: string | null
          telefono_secundario?: string | null
          triaje_estado?: string | null
          triaje_fecha?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      company_activities: {
        Row: {
          activity_date: string
          activity_type: string
          company_id: string
          created_at: string
          id: string
          next_action_date: string | null
          next_step: string | null
          outcome: string | null
          summary: string
          user_id: string
        }
        Insert: {
          activity_date?: string
          activity_type?: string
          company_id: string
          created_at?: string
          id?: string
          next_action_date?: string | null
          next_step?: string | null
          outcome?: string | null
          summary?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          company_id?: string
          created_at?: string
          id?: string
          next_action_date?: string | null
          next_step?: string | null
          outcome?: string | null
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          archived_at: string | null
          arpu_estimado: number | null
          cif: string | null
          company_id: string
          created_at: string | null
          decision_makers: Json | null
          empresa: string
          estado: Database["public"]["Enums"]["opportunity_stage"]
          fecha_cierre_prevista: string | null
          id: string
          importe_mensual_eur: number | null
          margen_estimado_eur: number | null
          necesidades_detectadas: string[] | null
          next_action: string | null
          next_action_date: string | null
          notas: string | null
          notion_sync_error: string | null
          notion_synced: boolean | null
          opportunity_score: number
          sales_playbook: string | null
          sector: string
          servicios_recomendados: string[] | null
          tamano: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          arpu_estimado?: number | null
          cif?: string | null
          company_id: string
          created_at?: string | null
          decision_makers?: Json | null
          empresa: string
          estado?: Database["public"]["Enums"]["opportunity_stage"]
          fecha_cierre_prevista?: string | null
          id?: string
          importe_mensual_eur?: number | null
          margen_estimado_eur?: number | null
          necesidades_detectadas?: string[] | null
          next_action?: string | null
          next_action_date?: string | null
          notas?: string | null
          notion_sync_error?: string | null
          notion_synced?: boolean | null
          opportunity_score: number
          sales_playbook?: string | null
          sector: string
          servicios_recomendados?: string[] | null
          tamano: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          arpu_estimado?: number | null
          cif?: string | null
          company_id?: string
          created_at?: string | null
          decision_makers?: Json | null
          empresa?: string
          estado?: Database["public"]["Enums"]["opportunity_stage"]
          fecha_cierre_prevista?: string | null
          id?: string
          importe_mensual_eur?: number | null
          margen_estimado_eur?: number | null
          necesidades_detectadas?: string[] | null
          next_action?: string | null
          next_action_date?: string | null
          notas?: string | null
          notion_sync_error?: string | null
          notion_synced?: boolean | null
          opportunity_score?: number
          sales_playbook?: string | null
          sector?: string
          servicios_recomendados?: string[] | null
          tamano?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_lines: {
        Row: {
          cantidad: number
          created_at: string
          id: string
          lead_id: string
          monthly_cost: number
          monthly_revenue: number
          producto: string
          updated_at: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          id?: string
          lead_id: string
          monthly_cost?: number
          monthly_revenue?: number
          producto?: string
          updated_at?: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: string
          lead_id?: string
          monthly_cost?: number
          monthly_revenue?: number
          producto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_lines_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      quarterly_kpis: {
        Row: {
          altas_actual: number
          altas_target: number
          created_at: string
          id: string
          quarter: string
          rentabilidad_media: number
          snav_total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          altas_actual?: number
          altas_target?: number
          created_at?: string
          id?: string
          quarter: string
          rentabilidad_media?: number
          snav_total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          altas_actual?: number
          altas_target?: number
          created_at?: string
          id?: string
          quarter?: string
          rentabilidad_media?: number
          snav_total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          company_id: string
          created_at: string
          fecha: string
          id: string
          lineas_fibra: number
          lineas_movil: number
          margen: number
          notas: string | null
          producto: string | null
          producto_estrategico: boolean
          snav: number
        }
        Insert: {
          company_id: string
          created_at?: string
          fecha?: string
          id?: string
          lineas_fibra?: number
          lineas_movil?: number
          margen?: number
          notas?: string | null
          producto?: string | null
          producto_estrategico?: boolean
          snav?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          fecha?: string
          id?: string
          lineas_fibra?: number
          lineas_movil?: number
          margen?: number
          notas?: string | null
          producto?: string | null
          producto_estrategico?: boolean
          snav?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sedes: {
        Row: {
          company_id: string
          cp: string | null
          created_at: string
          direccion: string | null
          id: string
          lat: number
          lng: number
          localidad: string | null
          principal: boolean
          provincia: string | null
          tipo: string
        }
        Insert: {
          company_id: string
          cp?: string | null
          created_at?: string
          direccion?: string | null
          id?: string
          lat?: number
          lng?: number
          localidad?: string | null
          principal?: boolean
          provincia?: string | null
          tipo?: string
        }
        Update: {
          company_id?: string
          cp?: string | null
          created_at?: string
          direccion?: string | null
          id?: string
          lat?: number
          lng?: number
          localidad?: string | null
          principal?: boolean
          provincia?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "sedes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          pinned: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      opportunity_stage:
        | "lead"
        | "contactado"
        | "propuesta"
        | "negociacion"
        | "ganada"
        | "perdida"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      opportunity_stage: [
        "lead",
        "contactado",
        "propuesta",
        "negociacion",
        "ganada",
        "perdida",
      ],
    },
  },
} as const
