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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, name, organization, relationship, feedback } = await req.json();

    if (!token || !name || !relationship || !feedback) {
      throw new Error("Missing required fields");
    }

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

    const recommendationNumber = tokenData.recommendation_number;
    const updateData: any = {};
    
    updateData[`recommendation${recommendationNumber}_name`] = name;
    updateData[`recommendation${recommendationNumber}_organization`] = organization || null;
    updateData[`recommendation${recommendationNumber}_relationship`] = relationship;
    updateData[`recommendation${recommendationNumber}_feedback`] = feedback;
    updateData[`recommendation${recommendationNumber}_status`] = "completed";
    updateData[`recommendation${recommendationNumber}_submitted_at`] = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("candidates")
      .update(updateData)
      .eq("id", tokenData.candidate_id);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error("Failed to save recommendation");
    }

    const { error: tokenUpdateError } = await supabase
      .from("recommendation_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token", token);

    if (tokenUpdateError) {
      console.error("Token update error:", tokenUpdateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Recommendation submitted successfully",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in submit-recommendation:", error);
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
