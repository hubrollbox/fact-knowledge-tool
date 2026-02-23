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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      application_factos: {
        Row: {
          application_id: string
          facto_id: string
          id: string
        }
        Insert: {
          application_id: string
          facto_id: string
          id?: string
        }
        Update: {
          application_id?: string
          facto_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_factos_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_factos_facto_id_fkey"
            columns: ["facto_id"]
            isOneToOne: false
            referencedRelation: "factos"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          argumento: string
          created_at: string | null
          id: string
          issue_id: string
          processo_id: string
          rule_id: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          argumento: string
          created_at?: string | null
          id?: string
          issue_id: string
          processo_id: string
          rule_id: string
          tipo?: string
          updated_at?: string | null
        }
        Update: {
          argumento?: string
          created_at?: string | null
          id?: string
          issue_id?: string
          processo_id?: string
          rule_id?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          morada: string | null
          nome: string
          telefone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          morada?: string | null
          nome: string
          telefone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          morada?: string | null
          nome?: string
          telefone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conclusoes: {
        Row: {
          created_at: string | null
          grau_confianca: string
          id: string
          issue_id: string
          pontos_frageis: string | null
          resultado: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          grau_confianca?: string
          id?: string
          issue_id: string
          pontos_frageis?: string | null
          resultado: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          grau_confianca?: string
          id?: string
          issue_id?: string
          pontos_frageis?: string | null
          resultado?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conclusoes_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: true
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplina_processos: {
        Row: {
          disciplina_id: string
          id: string
          processo_id: string
        }
        Insert: {
          disciplina_id: string
          id?: string
          processo_id: string
        }
        Update: {
          disciplina_id?: string
          id?: string
          processo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplina_processos_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplina_processos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinas: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          created_at: string | null
          data_documento: string | null
          descricao: string | null
          entidade_origem: string | null
          id: string
          localizacao: string | null
          processo_id: string
          storage_path: string | null
          tipo: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_documento?: string | null
          descricao?: string | null
          entidade_origem?: string | null
          id?: string
          localizacao?: string | null
          processo_id: string
          storage_path?: string | null
          tipo?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_documento?: string | null
          descricao?: string | null
          entidade_origem?: string | null
          id?: string
          localizacao?: string | null
          processo_id?: string
          storage_path?: string | null
          tipo?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      factos: {
        Row: {
          created_at: string | null
          data_facto: string | null
          descricao: string
          documento_id: string | null
          grau_certeza: string
          id: string
          observacoes: string | null
          processo_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_facto?: string | null
          descricao: string
          documento_id?: string | null
          grau_certeza?: string
          id?: string
          observacoes?: string | null
          processo_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_facto?: string | null
          descricao?: string
          documento_id?: string | null
          grau_certeza?: string
          id?: string
          observacoes?: string | null
          processo_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "factos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          created_at: string | null
          descricao: string
          estado: string
          id: string
          prioridade: string
          processo_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao: string
          estado?: string
          id?: string
          prioridade?: string
          processo_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string
          estado?: string
          id?: string
          prioridade?: string
          processo_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issues_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      processos: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          descricao: string | null
          estado: string
          id: string
          materia: string | null
          tipo: string
          titulo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          descricao?: string | null
          estado?: string
          id?: string
          materia?: string | null
          tipo?: string
          titulo: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          descricao?: string | null
          estado?: string
          id?: string
          materia?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      rules: {
        Row: {
          created_at: string | null
          fonte: string | null
          id: string
          processo_id: string
          referencia: string
          texto: string
          updated_at: string | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          created_at?: string | null
          fonte?: string | null
          id?: string
          processo_id: string
          referencia: string
          texto: string
          updated_at?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          created_at?: string | null
          fonte?: string | null
          id?: string
          processo_id?: string
          referencia?: string
          texto?: string
          updated_at?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rules_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      topicos: {
        Row: {
          conteudo: string | null
          created_at: string | null
          disciplina_id: string
          id: string
          nome: string
          referencias: string | null
          updated_at: string | null
        }
        Insert: {
          conteudo?: string | null
          created_at?: string | null
          disciplina_id: string
          id?: string
          nome: string
          referencias?: string | null
          updated_at?: string | null
        }
        Update: {
          conteudo?: string | null
          created_at?: string | null
          disciplina_id?: string
          id?: string
          nome?: string
          referencias?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topicos_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
