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
      bulletins: {
        Row: {
          affected_systems: string | null
          author_id: string | null
          body_md: string
          created_at: string
          cve_refs: string[]
          id: string
          published_at: string | null
          recommendations: string | null
          reference: string
          status: Database["public"]["Enums"]["bulletin_status"]
          summary: string | null
          title: string
          tlp: Database["public"]["Enums"]["tlp_level"]
          type: Database["public"]["Enums"]["bulletin_type"]
          updated_at: string
        }
        Insert: {
          affected_systems?: string | null
          author_id?: string | null
          body_md: string
          created_at?: string
          cve_refs?: string[]
          id?: string
          published_at?: string | null
          recommendations?: string | null
          reference: string
          status?: Database["public"]["Enums"]["bulletin_status"]
          summary?: string | null
          title: string
          tlp?: Database["public"]["Enums"]["tlp_level"]
          type: Database["public"]["Enums"]["bulletin_type"]
          updated_at?: string
        }
        Update: {
          affected_systems?: string | null
          author_id?: string | null
          body_md?: string
          created_at?: string
          cve_refs?: string[]
          id?: string
          published_at?: string | null
          recommendations?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["bulletin_status"]
          summary?: string | null
          title?: string
          tlp?: Database["public"]["Enums"]["tlp_level"]
          type?: Database["public"]["Enums"]["bulletin_type"]
          updated_at?: string
        }
        Relationships: []
      }
      compliance_assessments: {
        Row: {
          assessed_at: string
          assessed_by: string | null
          evidence: string | null
          id: string
          operator_id: string
          remediation_due: string | null
          requirement_id: string
          status: Database["public"]["Enums"]["compliance_status"]
          updated_at: string
        }
        Insert: {
          assessed_at?: string
          assessed_by?: string | null
          evidence?: string | null
          id?: string
          operator_id: string
          remediation_due?: string | null
          requirement_id: string
          status?: Database["public"]["Enums"]["compliance_status"]
          updated_at?: string
        }
        Update: {
          assessed_at?: string
          assessed_by?: string | null
          evidence?: string | null
          id?: string
          operator_id?: string
          remediation_due?: string | null
          requirement_id?: string
          status?: Database["public"]["Enums"]["compliance_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_assessments_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "compliance_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_requirements: {
        Row: {
          category: string | null
          code: string
          created_at: string
          description: string | null
          framework: Database["public"]["Enums"]["compliance_framework"]
          id: string
          title: string
          weight: number
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          description?: string | null
          framework: Database["public"]["Enums"]["compliance_framework"]
          id?: string
          title: string
          weight?: number
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          description?: string | null
          framework?: Database["public"]["Enums"]["compliance_framework"]
          id?: string
          title?: string
          weight?: number
        }
        Relationships: []
      }
      csirt_maturity: {
        Row: {
          assessed_at: string
          assessed_by: string | null
          category: string
          description: string | null
          evidence: string | null
          id: string
          item_code: string
          score: number
          title: string
          updated_at: string
        }
        Insert: {
          assessed_at?: string
          assessed_by?: string | null
          category: string
          description?: string | null
          evidence?: string | null
          id?: string
          item_code: string
          score?: number
          title: string
          updated_at?: string
        }
        Update: {
          assessed_at?: string
          assessed_by?: string | null
          category?: string
          description?: string | null
          evidence?: string | null
          id?: string
          item_code?: string
          score?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      exercise_participants: {
        Row: {
          attended: boolean | null
          exercise_id: string
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          attended?: boolean | null
          exercise_id: string
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          attended?: boolean | null
          exercise_id?: string
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_participants_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          id: string
          kind: Database["public"]["Enums"]["exercise_kind"]
          lessons_learned: string | null
          objectives: string | null
          operator_id: string | null
          scenario: string | null
          scheduled_at: string
          score: number | null
          status: Database["public"]["Enums"]["exercise_status"]
          title: string
          tlp: Database["public"]["Enums"]["tlp_level"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["exercise_kind"]
          lessons_learned?: string | null
          objectives?: string | null
          operator_id?: string | null
          scenario?: string | null
          scheduled_at?: string
          score?: number | null
          status?: Database["public"]["Enums"]["exercise_status"]
          title: string
          tlp?: Database["public"]["Enums"]["tlp_level"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["exercise_kind"]
          lessons_learned?: string | null
          objectives?: string | null
          operator_id?: string | null
          scenario?: string | null
          scheduled_at?: string
          score?: number | null
          status?: Database["public"]["Enums"]["exercise_status"]
          title?: string
          tlp?: Database["public"]["Enums"]["tlp_level"]
          updated_at?: string
        }
        Relationships: []
      }
      fiber_links: {
        Row: {
          color: string | null
          coordinates: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          operator_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          coordinates: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          operator_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          coordinates?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          operator_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      incident_comments: {
        Row: {
          attachment_url: string | null
          author_id: string
          body: string
          created_at: string
          id: string
          incident_id: string
        }
        Insert: {
          attachment_url?: string | null
          author_id: string
          body: string
          created_at?: string
          id?: string
          incident_id: string
        }
        Update: {
          attachment_url?: string | null
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          incident_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_comments_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          assignee_id: string | null
          closed_at: string | null
          closed_by: string | null
          closure_comment: string | null
          created_at: string
          created_by: string | null
          description: string | null
          detected_at: string
          id: string
          notes: string | null
          operator_id: string | null
          owner_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          resolved_at: string | null
          severity: Database["public"]["Enums"]["severity"]
          sla_due_at: string | null
          status: Database["public"]["Enums"]["incident_status"]
          timeline: Json | null
          title: string
          tlp: Database["public"]["Enums"]["tlp_level"]
          type: Database["public"]["Enums"]["incident_type"]
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closure_comment?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          detected_at?: string
          id?: string
          notes?: string | null
          operator_id?: string | null
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["severity"]
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          timeline?: Json | null
          title: string
          tlp?: Database["public"]["Enums"]["tlp_level"]
          type: Database["public"]["Enums"]["incident_type"]
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closure_comment?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          detected_at?: string
          id?: string
          notes?: string | null
          operator_id?: string | null
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["severity"]
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          timeline?: Json | null
          title?: string
          tlp?: Database["public"]["Enums"]["tlp_level"]
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
          tlp: Database["public"]["Enums"]["tlp_level"]
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
          tlp?: Database["public"]["Enums"]["tlp_level"]
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
          tlp?: Database["public"]["Enums"]["tlp_level"]
        }
        Relationships: []
      }
      iocs: {
        Row: {
          confidence: number
          created_at: string
          created_by: string | null
          description: string | null
          first_seen: string
          id: string
          incident_id: string | null
          intel_id: string | null
          last_seen: string
          source: string | null
          tags: string[]
          tlp: Database["public"]["Enums"]["tlp_level"]
          type: Database["public"]["Enums"]["ioc_type"]
          updated_at: string
          value: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          first_seen?: string
          id?: string
          incident_id?: string | null
          intel_id?: string | null
          last_seen?: string
          source?: string | null
          tags?: string[]
          tlp?: Database["public"]["Enums"]["tlp_level"]
          type: Database["public"]["Enums"]["ioc_type"]
          updated_at?: string
          value: string
        }
        Update: {
          confidence?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          first_seen?: string
          id?: string
          incident_id?: string | null
          intel_id?: string | null
          last_seen?: string
          source?: string | null
          tags?: string[]
          tlp?: Database["public"]["Enums"]["tlp_level"]
          type?: Database["public"]["Enums"]["ioc_type"]
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "iocs_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iocs_intel_id_fkey"
            columns: ["intel_id"]
            isOneToOne: false
            referencedRelation: "intel_items"
            referencedColumns: ["id"]
          },
        ]
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
      map_markers: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          latitude: number
          longitude: number
          operator_id: string | null
          status: string | null
          title: string
          type: Database["public"]["Enums"]["map_marker_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          latitude: number
          longitude: number
          operator_id?: string | null
          status?: string | null
          title: string
          type: Database["public"]["Enums"]["map_marker_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          latitude?: number
          longitude?: number
          operator_id?: string | null
          status?: string | null
          title?: string
          type?: Database["public"]["Enums"]["map_marker_type"]
          updated_at?: string
        }
        Relationships: []
      }
      operations: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ended_at: string | null
          id: string
          operator_id: string | null
          owner_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          started_at: string | null
          status: Database["public"]["Enums"]["operation_status"]
          title: string
          type: Database["public"]["Enums"]["operation_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          operator_id?: string | null
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["operation_status"]
          title: string
          type?: Database["public"]["Enums"]["operation_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          operator_id?: string | null
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["operation_status"]
          title?: string
          type?: Database["public"]["Enums"]["operation_type"]
          updated_at?: string
        }
        Relationships: []
      }
      operator_contacts: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          languages: string[]
          notes: string | null
          on_call_24_7: boolean
          operator_id: string
          pgp_fingerprint: string | null
          phone: string | null
          preferred_channel: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          languages?: string[]
          notes?: string | null
          on_call_24_7?: boolean
          operator_id: string
          pgp_fingerprint?: string | null
          phone?: string | null
          preferred_channel?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          languages?: string[]
          notes?: string | null
          on_call_24_7?: boolean
          operator_id?: string
          pgp_fingerprint?: string | null
          phone?: string | null
          preferred_channel?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_contacts_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          compliance_score: number | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          last_sync_summary: string | null
          last_synced_at: string | null
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          region: string | null
          source_url: string | null
          type: Database["public"]["Enums"]["operator_type"]
          updated_at: string
        }
        Insert: {
          compliance_score?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          last_sync_summary?: string | null
          last_synced_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          region?: string | null
          source_url?: string | null
          type: Database["public"]["Enums"]["operator_type"]
          updated_at?: string
        }
        Update: {
          compliance_score?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          last_sync_summary?: string | null
          last_synced_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          region?: string | null
          source_url?: string | null
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
          operator_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          operator_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          operator_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          content: string | null
          generated_at: string
          generated_by: string | null
          id: string
          title: string
          tlp: Database["public"]["Enums"]["tlp_level"]
          type: Database["public"]["Enums"]["report_type"]
        }
        Insert: {
          content?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          title: string
          tlp?: Database["public"]["Enums"]["tlp_level"]
          type: Database["public"]["Enums"]["report_type"]
        }
        Update: {
          content?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          title?: string
          tlp?: Database["public"]["Enums"]["tlp_level"]
          type?: Database["public"]["Enums"]["report_type"]
        }
        Relationships: []
      }
      siem_alerts: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          external_id: string | null
          host: string | null
          id: string
          incident_id: string | null
          occurred_at: string
          raw: Json
          severity: Database["public"]["Enums"]["severity"]
          source_id: string
          source_ip: string | null
          status: string
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          host?: string | null
          id?: string
          incident_id?: string | null
          occurred_at?: string
          raw?: Json
          severity?: Database["public"]["Enums"]["severity"]
          source_id: string
          source_ip?: string | null
          status?: string
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          host?: string | null
          id?: string
          incident_id?: string | null
          occurred_at?: string
          raw?: Json
          severity?: Database["public"]["Enums"]["severity"]
          source_id?: string
          source_ip?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "siem_alerts_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siem_alerts_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "siem_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      siem_sources: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          enabled: boolean
          endpoint_url: string | null
          events_count: number
          id: string
          ingest_token: string
          last_event_at: string | null
          name: string
          operator_id: string | null
          severity_threshold: Database["public"]["Enums"]["severity"]
          updated_at: string
          vendor: Database["public"]["Enums"]["siem_vendor"]
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          endpoint_url?: string | null
          events_count?: number
          id?: string
          ingest_token?: string
          last_event_at?: string | null
          name: string
          operator_id?: string | null
          severity_threshold?: Database["public"]["Enums"]["severity"]
          updated_at?: string
          vendor: Database["public"]["Enums"]["siem_vendor"]
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          endpoint_url?: string | null
          events_count?: number
          id?: string
          ingest_token?: string
          last_event_at?: string | null
          name?: string
          operator_id?: string | null
          severity_threshold?: Database["public"]["Enums"]["severity"]
          updated_at?: string
          vendor?: Database["public"]["Enums"]["siem_vendor"]
        }
        Relationships: [
          {
            foreignKeyName: "siem_sources_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          level: Database["public"]["Enums"]["log_level"]
          metadata: Json | null
          target: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["log_level"]
          metadata?: Json | null
          target?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["log_level"]
          metadata?: Json | null
          target?: string | null
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
      get_operator_contact: {
        Args: { _operator_id: string }
        Returns: {
          contact_email: string
          contact_phone: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_bulletin_reference: {
        Args: { _type: Database["public"]["Enums"]["bulletin_type"] }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "analyst" | "operator"
      audit_framework: "ISO27001" | "NIST" | "ARPT" | "PCI_DSS"
      bulletin_status: "draft" | "published" | "archived"
      bulletin_type: "alerte" | "avis" | "bulletin" | "ioc"
      compliance_framework: "ANSSI" | "NIS2" | "ISO27001" | "PCIDSS"
      compliance_status:
        | "compliant"
        | "partial"
        | "non_compliant"
        | "not_applicable"
      exercise_kind:
        | "tabletop"
        | "simulation"
        | "pra_test"
        | "phishing_drill"
        | "red_team"
      exercise_status: "planned" | "running" | "completed" | "cancelled"
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
      ioc_type:
        | "ipv4"
        | "ipv6"
        | "domain"
        | "url"
        | "md5"
        | "sha1"
        | "sha256"
        | "email"
        | "cve"
        | "filename"
        | "mutex"
        | "other"
      log_level: "info" | "warning" | "error" | "critical" | "debug"
      map_marker_type: "incident" | "signalement" | "travaux" | "maintenance"
      operation_status:
        | "planned"
        | "ongoing"
        | "paused"
        | "completed"
        | "cancelled"
      operation_type:
        | "investigation"
        | "response"
        | "audit"
        | "monitoring"
        | "exercise"
        | "other"
      operator_type: "telecom" | "isp"
      report_type: "weekly" | "monthly" | "incident" | "audit"
      severity: "low" | "medium" | "high" | "critical"
      siem_vendor: "wazuh" | "splunk" | "sentinel" | "crowdstrike" | "generic"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "done"
      tlp_level: "red" | "amber_strict" | "amber" | "green" | "clear"
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
      bulletin_status: ["draft", "published", "archived"],
      bulletin_type: ["alerte", "avis", "bulletin", "ioc"],
      compliance_framework: ["ANSSI", "NIS2", "ISO27001", "PCIDSS"],
      compliance_status: [
        "compliant",
        "partial",
        "non_compliant",
        "not_applicable",
      ],
      exercise_kind: [
        "tabletop",
        "simulation",
        "pra_test",
        "phishing_drill",
        "red_team",
      ],
      exercise_status: ["planned", "running", "completed", "cancelled"],
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
      ioc_type: [
        "ipv4",
        "ipv6",
        "domain",
        "url",
        "md5",
        "sha1",
        "sha256",
        "email",
        "cve",
        "filename",
        "mutex",
        "other",
      ],
      log_level: ["info", "warning", "error", "critical", "debug"],
      map_marker_type: ["incident", "signalement", "travaux", "maintenance"],
      operation_status: [
        "planned",
        "ongoing",
        "paused",
        "completed",
        "cancelled",
      ],
      operation_type: [
        "investigation",
        "response",
        "audit",
        "monitoring",
        "exercise",
        "other",
      ],
      operator_type: ["telecom", "isp"],
      report_type: ["weekly", "monthly", "incident", "audit"],
      severity: ["low", "medium", "high", "critical"],
      siem_vendor: ["wazuh", "splunk", "sentinel", "crowdstrike", "generic"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "done"],
      tlp_level: ["red", "amber_strict", "amber", "green", "clear"],
    },
  },
} as const
