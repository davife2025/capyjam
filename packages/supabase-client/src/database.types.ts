// Auto-generated from Supabase schema. Re-run `supabase gen types typescript` to update.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          skin: string;
          xp: number;
          elo: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          skin?: string;
          xp?: number;
          elo?: number;
        };
        Update: {
          username?: string;
          skin?: string;
          xp?: number;
          elo?: number;
        };
      };
      races: {
        Row: {
          id: string;
          track_id: string;
          status: "waiting" | "countdown" | "racing" | "finished";
          max_players: number;
          total_laps: number;
          created_at: string;
          started_at: string | null;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          track_id: string;
          status?: "waiting" | "countdown" | "racing" | "finished";
          max_players?: number;
          total_laps?: number;
        };
        Update: {
          status?: "waiting" | "countdown" | "racing" | "finished";
          started_at?: string | null;
          finished_at?: string | null;
        };
      };
      race_results: {
        Row: {
          id: string;
          race_id: string;
          player_id: string;
          position: number;
          total_time: number;
          lap_times: number[];
          created_at: string;
        };
        Insert: {
          race_id: string;
          player_id: string;
          position: number;
          total_time: number;
          lap_times: number[];
        };
        Update: Record<string, never>;
      };
      tracks: {
        Row: {
          id: string;
          name: string;
          author_id: string | null;
          tiles: Json;
          width: number;
          height: number;
          checkpoints: Json;
          start_positions: Json;
          published: boolean;
          plays: number;
          rating: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          author_id?: string | null;
          tiles: Json;
          width: number;
          height: number;
          checkpoints: Json;
          start_positions: Json;
          published?: boolean;
        };
        Update: {
          name?: string;
          tiles?: Json;
          published?: boolean;
          plays?: number;
          rating?: number;
        };
      };
      items: {
        Row: {
          id: string;
          type: string;
          name: string;
          xp_required: number;
          created_at: string;
        };
        Insert: {
          type: string;
          name: string;
          xp_required?: number;
        };
        Update: {
          name?: string;
          xp_required?: number;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      update_elo: {
        Args: { p_winner_id: string; p_loser_id: string };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
  };
}
