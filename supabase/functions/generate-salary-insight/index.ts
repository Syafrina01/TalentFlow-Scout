import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const {
      jobTitle,
      yearsOfExperience,
      basicSalary,
      totalSalary,
      lastDrawnSalary,
      expectedSalary,
      bandMin,
      bandMid,
      bandMax,
      totalCTC
    } = await req.json();

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const prompt = `You are a compensation analyst. Evaluate the following salary package and provide a 3-4 sentence assessment of whether it is competitive and fair.

Job Title: ${jobTitle}
Years of Experience: ${yearsOfExperience} years
Last Drawn Salary: RM ${lastDrawnSalary?.toLocaleString()}
Candidate's Expected Salary: RM ${expectedSalary?.toLocaleString()}
Proposed Basic Salary: RM ${basicSalary?.toLocaleString()}
Proposed Total Salary: RM ${totalSalary?.toLocaleString()}
Internal Band Range: RM ${bandMin?.toLocaleString()} - RM ${bandMax?.toLocaleString()} (Midpoint: RM ${bandMid?.toLocaleString()})
Total Cost to Company (CTC): RM ${totalCTC?.toLocaleString()}

Provide a concise, professional assessment covering:
1. Whether the proposed salary is appropriate for the experience level and position
2. How it compares to the internal band and the candidate's expectations
3. Whether there's a significant gap between expected and proposed salary that may affect acceptance
4. A brief recommendation on negotiation strategy or approval

Keep the response to 3-4 sentences maximum. Be direct and professional.`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional compensation analyst providing concise salary package evaluations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!openaiResponse.ok) {
      throw new Error("Failed to generate AI insight");
    }

    const openaiData = await openaiResponse.json();
    const insight = openaiData.choices[0]?.message?.content || "Unable to generate insight at this time.";

    return new Response(
      JSON.stringify({ insight }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});