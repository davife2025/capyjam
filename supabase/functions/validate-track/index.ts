import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ValidatePayload {
  trackId: string;
}

serve(async (req) => {
  try {
    const { trackId } = await req.json() as ValidatePayload;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")             ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: track, error } = await supabase
      .from("tracks")
      .select("id, tiles, width, height, name")
      .eq("id", trackId)
      .single();

    if (error || !track) {
      return new Response(JSON.stringify({ valid: false, error: "Track not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tiles   = track.tiles as Array<{ type: string; x: number; y: number }>;
    const errors:   string[] = [];
    const warnings: string[] = [];

    const roadTiles      = tiles.filter(t => ["road","boost","dirt"].includes(t.type));
    const finishTiles    = tiles.filter(t => t.type === "finish");
    const startTiles     = tiles.filter(t => t.type === "start");
    const checkpoints    = tiles.filter(t => t.type === "checkpoint");

    if (roadTiles.length < 8)     errors.push("Track needs at least 8 road tiles.");
    if (finishTiles.length === 0) errors.push("Track needs a finish line tile.");
    if (startTiles.length === 0)  errors.push("Track needs at least one start tile.");
    if (checkpoints.length === 0) warnings.push("No checkpoints — shortcuts will be possible.");

    const valid = errors.length === 0;

    // Mark invalid tracks as unpublished
    if (!valid) {
      await supabase
        .from("tracks")
        .update({ published: false })
        .eq("id", trackId);
    }

    return new Response(JSON.stringify({ valid, errors, warnings }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ valid: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
