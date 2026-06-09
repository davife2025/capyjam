import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RankUpdatePayload {
  raceId: string;
  results: Array<{
    playerId: string;
    position: number;
  }>;
}

serve(async (req) => {
  try {
    const { raceId, results } = await req.json() as RankUpdatePayload;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Sort by position
    const sorted = [...results].sort((a, b) => a.position - b.position);

    // Update Elo: each player beats everyone below them
    const updates: Promise<unknown>[] = [];
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const winner = sorted[i];
        const loser = sorted[j];
        if (winner.playerId && loser.playerId) {
          updates.push(
            supabase.rpc("update_elo", {
              p_winner_id: winner.playerId,
              p_loser_id: loser.playerId,
            })
          );
        }
      }
    }

    await Promise.all(updates);

    // Update race status
    await supabase
      .from("races")
      .update({ status: "finished", finished_at: new Date().toISOString() })
      .eq("id", raceId);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
