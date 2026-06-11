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
          total_races: number;
          wins: number;
          best_lap_ms: number | null;
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
      room_registry: {
        Row: {
          id: string;
          track_id: string | null;
          status: string;
          player_count: number;
          max_players: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          track_id?: string | null;
          status?: string;
          player_count?: number;
          max_players?: number;
        };
        Update: {
          status?: string;
          player_count?: number;
          updated_at?: string;
        };
      };
      skin_unlocks: {
        Row: {
          id: string;
          player_id: string;
          skin_id: string;
          unlocked_at: string;
        };
        Insert: {
          player_id: string;
          skin_id: string;
        };
        Update: Record<string, never>;
      };
      track_ratings: {
        Row: {
          id: string;
          track_id: string;
          player_id: string | null;
          rating: number;
          created_at: string;
        };
        Insert: {
          track_id: string;
          player_id: string | null;
          rating: number;
        };
        Update: {
          rating?: number;
        };
      };
      replays: {
        Row: {
          id: string;
          player_id: string | null;
          track_id: string;
          total_time: number;
          finish_pos: number;
          lap_times: number[];
          storage_url: string;
          created_at: string;
        };
        Insert: {
          id: string;
          player_id?: string | null;
          track_id: string;
          total_time: number;
          finish_pos: number;
          lap_times: number[];
          storage_url: string;
        };
        Update: Record<string, never>;
      };
    };
    Views: {
      leaderboard_monthly: {
        Row: {
          id: string;
          username: string;
          elo: number;
          xp: number;
          skin: string;
          total_races: number;
          wins: number;
          best_time: number | null;
        };
      };
    };
    Functions: {
      update_elo: {
        Args: { p_winner_id: string; p_loser_id: string };
        Returns: void;
      };
      award_race_xp: {
        Args: { p_player_id: string; p_position: number; p_laps: number };
        Returns: number;
      };
      increment_track_plays: {
        Args: { p_track_id: string };
        Returns: void;
      };
      prune_track_replays: {
        Args: { p_track_id: string };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
  };
}
