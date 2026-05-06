import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ingest-token",
};

type Severity = "low" | "medium" | "high" | "critical";

function mapSeverity(vendor: string, raw: any): Severity {
  const v = String(raw ?? "").toLowerCase();
  if (vendor === "wazuh") {
    const lvl = Number(raw) || 0;
    if (lvl >= 13) return "critical";
    if (lvl >= 10) return "high";
    if (lvl >= 6) return "medium";
    return "low";
  }
  if (vendor === "crowdstrike") {
    const n = Number(raw) || 0;
    if (n >= 4) return "critical";
    if (n === 3) return "high";
    if (n === 2) return "medium";
    return "low";
  }
  if (["critical", "crit", "fatal"].includes(v)) return "critical";
  if (["high", "error", "sev1", "sev2"].includes(v)) return "high";
  if (["medium", "warn", "warning", "sev3"].includes(v)) return "medium";
  return "low";
}

function normalize(vendor: string, payload: any) {
  switch (vendor) {
    case "wazuh": {
      // Wazuh alert format
      const r = payload.rule || {};
      const a = payload.agent || {};
      const d = payload.data || {};
      return {
        external_id: payload.id || r.id,
        title: r.description || "Alerte Wazuh",
        description: payload.full_log || JSON.stringify(d).slice(0, 500),
        severity: mapSeverity("wazuh", r.level),
        category: (r.groups || []).join(","),
        host: a.name,
        source_ip: d.srcip || payload.srcip,
        occurred_at: payload.timestamp,
      };
    }
    case "splunk": {
      // Splunk HEC alert format
      const e = payload.result || payload.event || payload;
      return {
        external_id: payload.sid || e.event_id,
        title: e.search_name || e.signature || payload.search_name || "Alerte Splunk",
        description: e._raw || e.message || "",
        severity: mapSeverity("splunk", e.severity || e.urgency),
        category: e.source || payload.source,
        host: e.host || e.dest,
        source_ip: e.src_ip || e.src,
        occurred_at: e._time || payload.time,
      };
    }
    case "sentinel": {
      // Microsoft Sentinel incident schema
      const props = payload.properties || payload;
      return {
        external_id: payload.id || props.incidentNumber,
        title: props.title || "Alerte Microsoft Sentinel",
        description: props.description || "",
        severity: mapSeverity("sentinel", props.severity),
        category: (props.classification || props.tactics || []).toString(),
        host: props.entities?.[0]?.HostName,
        source_ip: props.entities?.find((e: any) => e.Address)?.Address,
        occurred_at: props.createdTimeUtc || props.firstActivityTimeUtc,
      };
    }
    case "crowdstrike": {
      // Falcon detection
      return {
        external_id: payload.detection_id || payload.event_id,
        title: payload.name || payload.tactic || "Détection CrowdStrike Falcon",
        description: payload.description || payload.scenario || "",
        severity: mapSeverity("crowdstrike", payload.severity),
        category: payload.tactic,
        host: payload.device?.hostname || payload.hostname,
        source_ip: payload.network?.local_ip || payload.local_ip,
        occurred_at: payload.timestamp || payload.created_timestamp,
      };
    }
    default: {
      return {
        external_id: payload.id,
        title: payload.title || payload.name || "Alerte",
        description: payload.description || payload.message || "",
        severity: mapSeverity("generic", payload.severity),
        category: payload.category,
        host: payload.host,
        source_ip: payload.source_ip || payload.src_ip,
        occurred_at: payload.timestamp || payload.occurred_at,
      };
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const sourceId = url.searchParams.get("source_id");
    const token = req.headers.get("x-ingest-token") || url.searchParams.get("token");
    if (!sourceId || !token) {
      return new Response(JSON.stringify({ error: "source_id and token required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: src, error: srcErr } = await supabase
      .from("siem_sources").select("*").eq("id", sourceId).maybeSingle();
    if (srcErr || !src) return new Response(JSON.stringify({ error: "source not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!src.enabled) return new Response(JSON.stringify({ error: "source disabled" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (src.ingest_token !== token) return new Response(JSON.stringify({ error: "invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const events = Array.isArray(body) ? body : (body.events ?? [body]);
    const rows = events.map((ev: any) => {
      const n = normalize(src.vendor, ev);
      return {
        source_id: src.id,
        external_id: n.external_id ? String(n.external_id) : null,
        title: String(n.title).slice(0, 500),
        description: n.description ? String(n.description).slice(0, 4000) : null,
        severity: n.severity,
        category: n.category ? String(n.category).slice(0, 200) : null,
        host: n.host ? String(n.host).slice(0, 200) : null,
        source_ip: n.source_ip ? String(n.source_ip).slice(0, 64) : null,
        occurred_at: n.occurred_at ? new Date(n.occurred_at).toISOString() : new Date().toISOString(),
        raw: ev,
      };
    });

    const { data, error } = await supabase.from("siem_alerts").insert(rows).select("id, incident_id, severity");
    if (error) throw error;

    return new Response(JSON.stringify({ ingested: data.length, alerts: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
