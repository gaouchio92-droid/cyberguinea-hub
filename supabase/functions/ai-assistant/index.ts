// AI Assistant edge function — uses Lovable AI Gateway (Gemini)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es l'assistant IA de l'ARPT Guinée (Autorité de Régulation des Postes et Télécommunications), CERT national.
Tu aides Gaoussou DIAWARA, analyste cybersécurité, à prioriser ses actions, évaluer les risques et conseiller sur les incidents.

Contexte: tu travailles sur l'écosystème télécom et FAI guinéen (Orange Guinée, MTN Guinée, Cellcom, SOTELGUI, ~20 ISPs).
Style: réponses en français, concises, structurées avec puces, professionnelles. Toujours orienté action.
Pour toute question:
- Évalue le niveau de risque (Faible/Moyen/Élevé/Critique)
- Donne 3 actions concrètes prioritaires
- Mentionne les référentiels applicables (ISO 27001, NIST CSF, recommandations ARPT) quand pertinent`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages } = await req.json();
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY missing");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: true,
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(resp.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
