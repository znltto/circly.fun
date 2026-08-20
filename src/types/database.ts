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
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
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
        };
        Insert: {
          id?: string;
          room_id: string;
          sender_profile_id?: string | null;
          guest_name?: string | null;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          sender_profile_id?: string | null;
          guest_name?: string | null;
          content?: string;
          created_at?: string;
        };
        Relationships: [];
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
