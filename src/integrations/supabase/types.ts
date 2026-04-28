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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audits: {
        Row: {
          audit_date: string
          auditor_id: string | null
          created_at: string
          findings: string | null
          framework: Database["public"]["Enums"]["audit_framework"]
          id: string
          operator_id: string
          remediation_plan: string | null
          score: number | null
        }
        Insert: {
          audit_date?: string
          auditor_id?: string | null
          created_at?: string
          findings?: string | null
          framework: Database["public"]["Enums"]["audit_framework"]
          id?: string
          operator_id: string
          remediation_plan?: string | null
          score?: number | null
        }
        Update: {
          audit_date?: string
          auditor_id?: string | null
          created_at?: string
          findings?: string | null
          framework?: Database["public"]["Enums"]["audit_framework"]
          id?: string
          operator_id?: string
          remediation_plan?: string | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audits_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          detected_at: string
          id: string
          notes: string | null
          operator_id: string | null
          owner_id: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["severity"]
          status: Database["public"]["Enums"]["incident_status"]
          timeline: Json | null
          title: string
          type: Database["public"]["Enums"]["incident_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          detected_at?: string
          id?: string
          notes?: string | null
          operator_id?: string | null
          owner_id?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          timeline?: Json | null
          title: string
          type: Database["public"]["Enums"]["incident_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          detected_at?: string
          id?: string
          notes?: string | null
          operator_id?: string | null
          owner_id?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          timeline?: Json | null
          title?: string
          type?: Database["public"]["Enums"]["incident_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      intel_items: {
        Row: {
          category: Database["public"]["Enums"]["intel_category"]
          created_at: string
          cve_id: string | null
          description: string | null
          id: string
          published_at: string
          recommendations: string | null
          region_impact: string | null
          severity: Database["public"]["Enums"]["severity"]
          source: string | null
          title: string
        }
        Insert: {
          category: Database["public"]["Enums"]["intel_category"]
          created_at?: string
          cve_id?: string | null
          description?: string | null
          id?: string
          published_at?: string
          recommendations?: string | null
          region_impact?: string | null
          severity?: Database["public"]["Enums"]["severity"]
          source?: string | null
          title: string
        }
        Update: {
          category?: Database["public"]["Enums"]["intel_category"]
          created_at?: string
          cve_id?: string | null
          description?: string | null
          id?: string
          published_at?: string
          recommendations?: string | null
          region_impact?: string | null
          severity?: Database["public"]["Enums"]["severity"]
          source?: string | null
          title?: string
        }
        Relationships: []
      }
      kpi_snapshots: {
        Row: {
          created_at: string
          id: string
          incidents_open: number | null
          incidents_resolved: number | null
          mttd_minutes: number | null
          mttr_minutes: number | null
          operator_compliance_avg: number | null
          snapshot_date: string
          threat_level: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          incidents_open?: number | null
          incidents_resolved?: number | null
          mttd_minutes?: number | null
          mttr_minutes?: number | null
          operator_compliance_avg?: number | null
          snapshot_date?: string
          threat_level?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          incidents_open?: number | null
          incidents_resolved?: number | null
          mttd_minutes?: number | null
          mttr_minutes?: number | null
          operator_compliance_avg?: number | null
          snapshot_date?: string
          threat_level?: string | null
        }
        Relationships: []
      }
      operators: {
        Row: {
          compliance_score: number | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          region: string | null
          type: Database["public"]["Enums"]["operator_type"]
          updated_at: string
        }
        Insert: {
          compliance_score?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          region?: string | null
          type: Database["public"]["Enums"]["operator_type"]
          updated_at?: string
        }
        Update: {
          compliance_score?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          region?: string | null
          type?: Database["public"]["Enums"]["operator_type"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          content: string | null
          generated_at: string
          generated_by: string | null
          id: string
          title: string
          type: Database["public"]["Enums"]["report_type"]
        }
        Insert: {
          content?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          title: string
          type: Database["public"]["Enums"]["report_type"]
        }
        Update: {
          content?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          title?: string
          type?: Database["public"]["Enums"]["report_type"]
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "analyst" | "operator"
      audit_framework: "ISO27001" | "NIST" | "ARPT" | "PCI_DSS"
      incident_status:
        | "open"
        | "investigating"
        | "contained"
        | "resolved"
        | "closed"
      incident_type:
        | "phishing"
        | "malware"
        | "ddos"
        | "account_compromise"
        | "data_leak"
        | "other"
      intel_category:
        | "cve"
        | "apt"
        | "ransomware"
        | "phishing_campaign"
        | "other"
      operator_type: "telecom" | "isp"
      report_type: "weekly" | "monthly" | "incident" | "audit"
      severity: "low" | "medium" | "high" | "critical"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "done"
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
    Enums: {
      app_role: ["admin", "analyst", "operator"],
      audit_framework: ["ISO27001", "NIST", "ARPT", "PCI_DSS"],
      incident_status: [
        "open",
        "investigating",
        "contained",
        "resolved",
        "closed",
      ],
      incident_type: [
        "phishing",
        "malware",
        "ddos",
        "account_compromise",
        "data_leak",
        "other",
      ],
      intel_category: [
        "cve",
        "apt",
        "ransomware",
        "phishing_campaign",
        "other",
      ],
      operator_type: ["telecom", "isp"],
      report_type: ["weekly", "monthly", "incident", "audit"],
      severity: ["low", "medium", "high", "critical"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "done"],
    },
  },
} as const
