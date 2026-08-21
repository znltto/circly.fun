/**
 * Tipos do banco Supabase.
 *
 * Este arquivo é um placeholder inicial. Assim que aplicar as migrations,
 * regenere com:
 *
 *   npx supabase gen types typescript --project-id <seu-id> --schema public \
 *     > src/types/database.ts
 *
 * Ou, se rodando Supabase local:
 *   npx supabase gen types typescript --local > src/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type FriendshipStatus = "pending" | "accepted" | "blocked";
export type RoomVisibility = "private" | "link" | "friends";
export type RecordingStatus =
  | "starting"
  | "active"
  | "complete"
  | "failed"
  | "aborted";
export type RecordingProcessingStatus =
  | "pending"
  | "processing"
  | "complete"
  | "failed"
  | "skipped";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          onboarded_at: string | null;
          status_message: string | null;
          status_emoji: string | null;
          status_updated_at: string | null;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          onboarded_at?: string | null;
          status_message?: string | null;
          status_emoji?: string | null;
          status_updated_at?: string | null;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          onboarded_at?: string | null;
          status_message?: string | null;
          status_emoji?: string | null;
          status_updated_at?: string | null;
        };
        Relationships: [];
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: FriendshipStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          status?: FriendshipStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          requester_id?: string;
          addressee_id?: string;
          status?: FriendshipStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "friendships_requester_id_fkey";
            columns: ["requester_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "friendships_addressee_id_fkey";
            columns: ["addressee_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      rooms: {
        Row: {
          id: string;
          slug: string;
          host_id: string;
          title: string;
          visibility: RoomVisibility;
          allow_guests: boolean;
          max_participants: number;
          active: boolean;
          created_at: string;
          updated_at: string;
          expires_at: string | null;
          ended_at: string | null;
          recording_consent_required: boolean;
          locked: boolean;
          lobby_enabled: boolean;
          scheduled_for: string | null;
          duration_minutes: number | null;
          e2ee_enabled: boolean;
        };
        Insert: {
          id?: string;
          slug: string;
          host_id: string;
          title: string;
          visibility?: RoomVisibility;
          allow_guests?: boolean;
          max_participants?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          expires_at?: string | null;
          ended_at?: string | null;
          recording_consent_required?: boolean;
          locked?: boolean;
          lobby_enabled?: boolean;
          scheduled_for?: string | null;
          duration_minutes?: number | null;
          e2ee_enabled?: boolean;
        };
        Update: {
          id?: string;
          slug?: string;
          host_id?: string;
          title?: string;
          visibility?: RoomVisibility;
          allow_guests?: boolean;
          max_participants?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          expires_at?: string | null;
          ended_at?: string | null;
          recording_consent_required?: boolean;
          locked?: boolean;
          lobby_enabled?: boolean;
          scheduled_for?: string | null;
          duration_minutes?: number | null;
          e2ee_enabled?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "rooms_host_id_fkey";
            columns: ["host_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          profile_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
          last_used_at: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
          last_used_at?: string | null;
        };
        Update: {
          id?: string;
          profile_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          created_at?: string;
          last_used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      room_actions_log: {
        Row: {
          id: string;
          room_id: string;
          actor_profile_id: string | null;
          actor_display_name: string | null;
          target_profile_id: string | null;
          target_display_name: string | null;
          action: string;
          detail: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          actor_profile_id?: string | null;
          actor_display_name?: string | null;
          target_profile_id?: string | null;
          target_display_name?: string | null;
          action: string;
          detail?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          actor_profile_id?: string | null;
          actor_display_name?: string | null;
          target_profile_id?: string | null;
          target_display_name?: string | null;
          action?: string;
          detail?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_actions_log_room_id_fkey";
            columns: ["room_id"];
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          }
        ];
      };
      room_lobby: {
        Row: {
          id: string;
          room_id: string;
          profile_id: string | null;
          guest_name: string | null;
          display_name: string;
          requested_at: string;
          resolved_at: string | null;
          resolution: "admitted" | "denied" | "cancelled" | "timeout" | null;
          admit_token: string | null;
        };
        Insert: {
          id?: string;
          room_id: string;
          profile_id?: string | null;
          guest_name?: string | null;
          display_name: string;
          requested_at?: string;
          resolved_at?: string | null;
          resolution?:
            | "admitted"
            | "denied"
            | "cancelled"
            | "timeout"
            | null;
          admit_token?: string | null;
        };
        Update: {
          id?: string;
          room_id?: string;
          profile_id?: string | null;
          guest_name?: string | null;
          display_name?: string;
          requested_at?: string;
          resolved_at?: string | null;
          resolution?:
            | "admitted"
            | "denied"
            | "cancelled"
            | "timeout"
            | null;
          admit_token?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "room_lobby_room_id_fkey";
            columns: ["room_id"];
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          }
        ];
      };
      room_recordings: {
        Row: {
          id: string;
          room_id: string;
          egress_id: string;
          status: RecordingStatus;
          storage_path: string | null;
          audio_path: string | null;
          size_bytes: number | null;
          duration_seconds: number | null;
          started_by: string;
          started_at: string;
          ended_at: string | null;
          expires_at: string;
          created_at: string;
          processing_status: RecordingProcessingStatus;
          processed_at: string | null;
          processing_error: string | null;
          transcript: string | null;
          summary: string | null;
          topics_json: Json | null;
          action_items_json: Json | null;
          decisions_json: Json | null;
          participants_json: Json | null;
          language: string | null;
          keep_video: boolean;
        };
        Insert: {
          id?: string;
          room_id: string;
          egress_id: string;
          status?: RecordingStatus;
          storage_path?: string | null;
          audio_path?: string | null;
          size_bytes?: number | null;
          duration_seconds?: number | null;
          started_by: string;
          started_at?: string;
          ended_at?: string | null;
          expires_at?: string;
          created_at?: string;
          processing_status?: RecordingProcessingStatus;
          processed_at?: string | null;
          processing_error?: string | null;
          transcript?: string | null;
          summary?: string | null;
          topics_json?: Json | null;
          action_items_json?: Json | null;
          decisions_json?: Json | null;
          participants_json?: Json | null;
          language?: string | null;
          keep_video?: boolean;
        };
        Update: {
          id?: string;
          room_id?: string;
          egress_id?: string;
          status?: RecordingStatus;
          storage_path?: string | null;
          audio_path?: string | null;
          size_bytes?: number | null;
          duration_seconds?: number | null;
          started_by?: string;
          started_at?: string;
          ended_at?: string | null;
          expires_at?: string;
          created_at?: string;
          processing_status?: RecordingProcessingStatus;
          processed_at?: string | null;
          processing_error?: string | null;
          transcript?: string | null;
          summary?: string | null;
          topics_json?: Json | null;
          action_items_json?: Json | null;
          decisions_json?: Json | null;
          participants_json?: Json | null;
          language?: string | null;
          keep_video?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "room_recordings_room_id_fkey";
            columns: ["room_id"];
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_recordings_started_by_fkey";
            columns: ["started_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      room_invites: {
        Row: {
          id: string;
          room_id: string;
          token_hash: string;
          created_by: string;
          max_uses: number | null;
          uses_count: number;
          expires_at: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          token_hash: string;
          created_by: string;
          max_uses?: number | null;
          uses_count?: number;
          expires_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          token_hash?: string;
          created_by?: string;
          max_uses?: number | null;
          uses_count?: number;
          expires_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      room_participants: {
        Row: {
          id: string;
          room_id: string;
          profile_id: string | null;
          guest_name: string | null;
          livekit_identity: string;
          joined_at: string;
          left_at: string | null;
        };
        Insert: {
          id?: string;
          room_id: string;
          profile_id?: string | null;
          guest_name?: string | null;
          livekit_identity: string;
          joined_at?: string;
          left_at?: string | null;
        };
        Update: {
          id?: string;
          room_id?: string;
          profile_id?: string | null;
          guest_name?: string | null;
          livekit_identity?: string;
          joined_at?: string;
          left_at?: string | null;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          room_id: string;
          sender_profile_id: string | null;
          guest_name: string | null;
          content: string;
          created_at: string;
          attachment_url: string | null;
          attachment_type: string | null;
        };
        Insert: {
          id?: string;
          room_id: string;
          sender_profile_id?: string | null;
          guest_name?: string | null;
          content: string;
          created_at?: string;
          attachment_url?: string | null;
          attachment_type?: string | null;
        };
        Update: {
          id?: string;
          room_id?: string;
          sender_profile_id?: string | null;
          guest_name?: string | null;
          content?: string;
          created_at?: string;
          attachment_url?: string | null;
          attachment_type?: string | null;
        };
        Relationships: [];
      };
      message_reactions: {
        Row: {
          id: string;
          message_id: string;
          reactor_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          reactor_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          reactor_id?: string;
          emoji?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_chat_logs: {
        Row: {
          id: string;
          user_id: string | null;
          user_email: string | null;
          ip: string | null;
          model: string;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          cost_micro_dollars: number;
          user_message: string | null;
          assistant_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          user_email?: string | null;
          ip?: string | null;
          model?: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          cost_micro_dollars?: number;
          user_message?: string | null;
          assistant_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          user_email?: string | null;
          ip?: string | null;
          model?: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          cost_micro_dollars?: number;
          user_message?: string | null;
          assistant_message?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      direct_messages: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          content: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          sender_id: string;
          recipient_id: string;
          content: string;
          created_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          sender_id?: string;
          recipient_id?: string;
          content?: string;
          created_at?: string;
          read_at?: string | null;
        };
        Relationships: [];
      };
      room_invitations: {
        Row: {
          id: string;
          room_id: string;
          inviter_id: string;
          invitee_id: string;
          status: "pending" | "accepted" | "declined" | "expired";
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          room_id: string;
          inviter_id: string;
          invitee_id: string;
          status?: "pending" | "accepted" | "declined" | "expired";
          created_at?: string;
          responded_at?: string | null;
        };
        Update: {
          id?: string;
          room_id?: string;
          inviter_id?: string;
          invitee_id?: string;
          status?: "pending" | "accepted" | "declined" | "expired";
          created_at?: string;
          responded_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "room_invitations_room_id_fkey";
            columns: ["room_id"];
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_invitations_inviter_id_fkey";
            columns: ["inviter_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_invitations_invitee_id_fkey";
            columns: ["invitee_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      friendship_status: FriendshipStatus;
      room_visibility: RoomVisibility;
    };
    CompositeTypes: Record<string, never>;
  };
}
