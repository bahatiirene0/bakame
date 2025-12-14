/**
 * Supabase Database Types
 *
 * Scalable schema designed for:
 * - User authentication
 * - Chat sessions & messages
 * - Specialist agents
 * - Usage analytics
 * - Subscriptions (future)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// User roles for access control
export type UserRole = 'user' | 'premium' | 'admin';

// Message roles
export type MessageRole = 'user' | 'assistant' | 'system';

// Subscription plans
export type SubscriptionPlan = 'free' | 'basic' | 'premium' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial';

export interface Database {
  public: {
    Tables: {
      // ============================================
      // USERS - Extended profile from Supabase Auth
      // ============================================
      users: {
        Row: {
          id: string;
          email: string | null;
          name: string | null;
          avatar_url: string | null;
          phone: string | null;
          role: UserRole;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          role?: UserRole;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          role?: UserRole;
          metadata?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // AGENTS - Specialist AI assistants
      // ============================================
      agents: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          system_prompt: string;
          icon: string;
          color: string;
          capabilities: Json | null;
          is_active: boolean;
          is_premium: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          system_prompt: string;
          icon?: string;
          color?: string;
          capabilities?: Json | null;
          is_active?: boolean;
          is_premium?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          system_prompt?: string;
          icon?: string;
          color?: string;
          capabilities?: Json | null;
          is_active?: boolean;
          is_premium?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // CHAT SESSIONS - Conversation containers
      // ============================================
      chat_sessions: {
        Row: {
          id: string;
          user_id: string;
          agent_id: string | null;
          agent_slug: string;
          title: string;
          metadata: Json | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          agent_id?: string | null;
          agent_slug?: string;
          title?: string;
          metadata?: Json | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          agent_id?: string | null;
          agent_slug?: string;
          title?: string;
          metadata?: Json | null;
          is_archived?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // MESSAGES - Individual chat messages
      // ============================================
      messages: {
        Row: {
          id: string;
          session_id: string;
          role: MessageRole;
          content: string;
          tool_calls: Json | null;
          tokens_used: number | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: MessageRole;
          content: string;
          tool_calls?: Json | null;
          tokens_used?: number | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          tool_calls?: Json | null;
          tokens_used?: number | null;
          metadata?: Json | null;
        };
        Relationships: [];
      };

      // ============================================
      // USER_AGENTS - Track agent usage per user
      // ============================================
      user_agents: {
        Row: {
          id: string;
          user_id: string;
          agent_id: string;
          is_favorite: boolean;
          usage_count: number;
          last_used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          agent_id: string;
          is_favorite?: boolean;
          usage_count?: number;
          last_used_at?: string | null;
          created_at?: string;
        };
        Update: {
          is_favorite?: boolean;
          usage_count?: number;
          last_used_at?: string | null;
        };
        Relationships: [];
      };

      // ============================================
      // SUBSCRIPTIONS - User plans (future)
      // ============================================
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: SubscriptionPlan;
          status: SubscriptionStatus;
          current_period_start: string | null;
          current_period_end: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan?: SubscriptionPlan;
          status?: SubscriptionStatus;
          current_period_start?: string | null;
          current_period_end?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          plan?: SubscriptionPlan;
          status?: SubscriptionStatus;
          current_period_start?: string | null;
          current_period_end?: string | null;
          metadata?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // USAGE_LOGS - Analytics & billing tracking
      // ============================================
      usage_logs: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          action: string;
          tokens_input: number;
          tokens_output: number;
          cost_usd: number | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id?: string | null;
          action: string;
          tokens_input?: number;
          tokens_output?: number;
          cost_usd?: number | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          tokens_input?: number;
          tokens_output?: number;
          cost_usd?: number | null;
          metadata?: Json | null;
        };
        Relationships: [];
      };

      // ============================================
      // ADMIN_SETTINGS - Configuration storage
      // ============================================
      admin_settings: {
        Row: {
          id: string;
          key: string;
          value: Json;
          description: string | null;
          category: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
          description?: string | null;
          category?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          description?: string | null;
          category?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // ADMIN_AUDIT_LOGS - Admin action tracking
      // ============================================
      admin_audit_logs: {
        Row: {
          id: string;
          admin_id: string;
          action: string;
          target_type: string | null;
          target_id: string | null;
          details: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          details?: Json;
        };
        Relationships: [];
      };
    };
    Views: {
      // Admin dashboard aggregated stats
      admin_dashboard_stats: {
        Row: {
          total_users: number;
          total_admins: number;
          total_premium: number;
          active_today: number;
          active_week: number;
          total_sessions: number;
          total_messages: number;
          active_agents: number;
          active_subscriptions: number;
          generated_at: string;
        };
      };
    };
    Functions: {
      // Check if current user is admin
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      // Log admin action
      log_admin_action: {
        Args: {
          p_action: string;
          p_target_type?: string;
          p_target_id?: string;
          p_details?: Json;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      message_role: MessageRole;
      subscription_plan: SubscriptionPlan;
      subscription_status: SubscriptionStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Convenient type exports
export type User = Database['public']['Tables']['users']['Row'];
export type Agent = Database['public']['Tables']['agents']['Row'];
export type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type UserAgent = Database['public']['Tables']['user_agents']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type UsageLog = Database['public']['Tables']['usage_logs']['Row'];
export type AdminSetting = Database['public']['Tables']['admin_settings']['Row'];
export type AdminAuditLog = Database['public']['Tables']['admin_audit_logs']['Row'];

// Insert types
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type AgentInsert = Database['public']['Tables']['agents']['Insert'];
export type ChatSessionInsert = Database['public']['Tables']['chat_sessions']['Insert'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];
export type AdminSettingInsert = Database['public']['Tables']['admin_settings']['Insert'];
export type AdminAuditLogInsert = Database['public']['Tables']['admin_audit_logs']['Insert'];

// Update types
export type UserUpdate = Database['public']['Tables']['users']['Update'];
export type ChatSessionUpdate = Database['public']['Tables']['chat_sessions']['Update'];
export type AdminSettingUpdate = Database['public']['Tables']['admin_settings']['Update'];

// View types
export type AdminDashboardStats = Database['public']['Views']['admin_dashboard_stats']['Row'];
