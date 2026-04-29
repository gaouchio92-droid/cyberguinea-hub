import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { operator_id } = await req.json();
    if (!operator_id) return new Response(JSON.stringify({ error: "operator_id requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: op, error: opErr } = await supabase.from("operators").select("*").eq("id", operator_id).single();
    if (opErr || !op) return new Response(JSON.stringify({ error: "Opérateur introuvable" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!op.source_url) return new Response(JSON.stringify({ error: "Aucune URL source configurée" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Fetch the URL content
    let pageText = "";
    try {
      const r = await fetch(op.source_url, { headers: { "User-Agent": "Mozilla/5.0 ARPT-Cyber-Bot" } });
      const html = await r.text();
      pageText = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000);
    } catch (e) {
      return new Response(JSON.stringify({ error: `Impossible de récupérer la page: ${e.message}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Use Lovable AI to extract structured info
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let summary = pageText.slice(0, 500);
    let extracted: any = {};

    if (LOVABLE_API_KEY) {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Tu es un analyste cybersécurité ARPT Guinée. Extrait des informations utiles d'un site d'opérateur télécom/FAI pour la supervision réglementaire." },
            { role: "user", content: `URL: ${op.source_url}\nNom opérateur: ${op.name}\n\nContenu page:\n${pageText}\n\nRetourne JSON strict avec: contact_email, contact_phone, region, summary (résumé 2-3 phrases en français des activités/services pertinents pour la cybersécurité).` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "save_operator_info",
              description: "Enregistre les infos extraites",
              parameters: {
                type: "object",
                properties: {
                  contact_email: { type: "string" },
                  contact_phone: { type: "string" },
                  region: { type: "string" },
                  summary: { type: "string" },
                },
                required: ["summary"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "save_operator_info" } },
        }),
      });
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const tc = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (tc) {
          try { extracted = JSON.parse(tc.function.arguments); summary = extracted.summary || summary; } catch {}
        }
      } else if (aiRes.status === 429 || aiRes.status === 402) {
        return new Response(JSON.stringify({ error: aiRes.status === 429 ? "Limite IA atteinte, réessayez plus tard" : "Crédits IA épuisés" }), { status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const updates: any = { last_synced_at: new Date().toISOString(), last_sync_summary: summary };
    if (extracted.contact_email && !op.contact_email) updates.contact_email = extracted.contact_email;
    if (extracted.contact_phone && !op.contact_phone) updates.contact_phone = extracted.contact_phone;
    if (extracted.region && !op.region) updates.region = extracted.region;

    await supabase.from("operators").update(updates).eq("id", operator_id);

    return new Response(JSON.stringify({ success: true, extracted, summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
