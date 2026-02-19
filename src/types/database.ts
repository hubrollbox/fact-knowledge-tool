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
      clientes: {
        Row: {
          id: string
          user_id: string
          nome: string
          email: string | null
          telefone: string | null
          morada: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['clientes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['clientes']['Insert']>
      }
      processos: {
        Row: {
          id: string
          user_id: string
          titulo: string
          tipo: string
          estado: string
          materia: string | null
          descricao: string | null
          cliente_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['processos']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['processos']['Insert']>
      }
      factos: {
        Row: {
          id: string
          processo_id: string
          descricao: string
          data_facto: string | null
          grau_certeza: string
          observacoes: string | null
          documento_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['factos']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['factos']['Insert']>
      }
      issues: {
        Row: {
          id: string
          processo_id: string
          descricao: string
          prioridade: string
          estado: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['issues']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['issues']['Insert']>
      }
      rules: {
        Row: {
          id: string
          processo_id: string
          referencia: string
          texto: string
          vigencia_inicio: string | null
          vigencia_fim: string | null
          fonte: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['rules']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['rules']['Insert']>
      }
      applications: {
        Row: {
          id: string
          processo_id: string
          issue_id: string
          rule_id: string
          argumento: string
          tipo: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['applications']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['applications']['Insert']>
      }
      application_factos: {
        Row: {
          id: string
          application_id: string
          facto_id: string
        }
        Insert: Omit<Database['public']['Tables']['application_factos']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['application_factos']['Insert']>
      }
      conclusoes: {
        Row: {
          id: string
          issue_id: string
          resultado: string
          grau_confianca: string
          pontos_frageis: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['conclusoes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['conclusoes']['Insert']>
      }
      documentos: {
        Row: {
          id: string
          processo_id: string
          titulo: string
          tipo: string | null
          data_documento: string | null
          entidade_origem: string | null
          localizacao: string | null
          descricao: string | null
          storage_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['documentos']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['documentos']['Insert']>
      }
      disciplinas: {
        Row: {
          id: string
          user_id: string
          nome: string
          descricao: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['disciplinas']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['disciplinas']['Insert']>
      }
      topicos: {
        Row: {
          id: string
          disciplina_id: string
          nome: string
          conteudo: string | null
          referencias: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['topicos']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['topicos']['Insert']>
      }
      disciplina_processos: {
        Row: {
          id: string
          disciplina_id: string
          processo_id: string
        }
        Insert: Omit<Database['public']['Tables']['disciplina_processos']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['disciplina_processos']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
