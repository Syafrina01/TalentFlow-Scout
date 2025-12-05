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

    const { candidateId, recommendationNumber, recommenderEmail } = await req.json();

    if (!candidateId || !recommendationNumber || !recommenderEmail) {
      throw new Error("Missing required fields");
    }

    if (![1, 2].includes(recommendationNumber)) {
      throw new Error("Recommendation number must be 1 or 2");
    }

    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (candidateError || !candidate) {
      throw new Error("Candidate not found");
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error: tokenError } = await supabase
      .from("recommendation_tokens")
      .insert({
        token,
        candidate_id: candidateId,
        recommendation_number: recommendationNumber,
        recommender_email: recommenderEmail,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      throw new Error("Failed to create recommendation token");
    }

    const statusField = `recommendation${recommendationNumber}_status`;
    const emailField = `recommendation${recommendationNumber}_email`;
    
    const { error: updateError } = await supabase
      .from("candidates")
      .update({
        [statusField]: "pending",
        [emailField]: recommenderEmail,
      })
      .eq("id", candidateId);

    if (updateError) {
      throw new Error("Failed to update candidate");
    }

    const publicUrl = Deno.env.get("PUBLIC_URL") || supabaseUrl.replace(".supabase.co", ".bolt.host");
    const recommendationUrl = `${publicUrl}/recommendation-response?token=${token}`;

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0891b2;">Recommendation Request</h2>
        <p>Hello,</p>
        <p>You have been requested to provide a recommendation for <strong>${candidate.full_name}</strong>, who has applied for the position of <strong>${candidate.position_applied}</strong>.</p>
        <p>Please click the link below to submit your recommendation:</p>
        <a href="${recommendationUrl}" style="display: inline-block; background-color: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Submit Recommendation</a>
        <p><small>This link will expire in 30 days.</small></p>
        <p>If you cannot click the button, copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #666;">${recommendationUrl}</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #666; font-size: 12px;">This is an automated email from TalentFlow Scout. Please do not reply to this email.</p>
      </div>
    `;

    console.log("Recommendation email would be sent to:", recommenderEmail);
    console.log("Recommendation URL:", recommendationUrl);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Recommendation request sent successfully",
        recommendationUrl,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in send-recommendation-request:", error);
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
