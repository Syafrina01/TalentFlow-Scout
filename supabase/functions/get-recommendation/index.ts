import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      throw new Error("Token is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: tokenData, error: tokenError } = await supabase
      .from("recommendation_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (tokenError || !tokenData) {
      throw new Error("Invalid or expired recommendation link");
    }

    if (tokenData.used_at) {
      throw new Error("This recommendation link has already been used");
    }

    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      throw new Error("This recommendation link has expired");
    }

    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("full_name, position_applied, email")
      .eq("id", tokenData.candidate_id)
      .single();

    if (candidateError || !candidate) {
      throw new Error("Candidate not found");
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          candidateName: candidate.full_name,
          positionApplied: candidate.position_applied,
          candidateEmail: candidate.email,
          recommendationNumber: tokenData.recommendation_number,
          recommenderEmail: tokenData.recommender_email,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in get-recommendation:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
