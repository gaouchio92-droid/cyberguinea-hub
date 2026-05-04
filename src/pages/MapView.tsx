import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Fix default Leaflet marker icons (Vite/bundler issue)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Coordonnées approximatives des régions / villes principales de Guinée
const REGION_COORDS: Record<string, [number, number]> = {
  Conakry: [9.6412, -13.5784],
  Kindia: [10.0567, -12.8658],
  Boké: [10.9325, -14.2956],
  Boke: [10.9325, -14.2956],
  Labé: [11.3186, -12.2833],
  Labe: [11.3186, -12.2833],
  Mamou: [10.3754, -12.0914],
  Faranah: [10.0402, -10.7444],
  Kankan: [10.3856, -9.3057],
  Nzérékoré: [7.7561, -8.8178],
  Nzerekore: [7.7561, -8.8178],
  Siguiri: [11.4174, -9.1700],
};

const GUINEA_CENTER: [number, number] = [10.4, -11.0];

const severityColor: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

export default function MapView() {
  const [operators, setOperators] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [layer, setLayer] = useState<"all" | "operators" | "incidents">("all");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const [{ data: o }, { data: i }] = await Promise.all([
        supabase.from("operators").select("*"),
        supabase.from("incidents").select("id,title,severity,status,operator_id,detected_at"),
      ]);
      setOperators(o ?? []);
      setIncidents(i ?? []);
    })();
  }, []);

  const incidentsByOperator = useMemo(() => {
    const m: Record<string, any[]> = {};
    incidents.forEach(i => { if (i.operator_id) (m[i.operator_id] ??= []).push(i); });
    return m;
  }, [incidents]);

  function jitter(coord: [number, number], idx: number): [number, number] {
    const offset = idx * 0.05;
    return [coord[0] + offset, coord[1] + offset];
  }

  const placedOperators = useMemo(() => {
    const counters: Record<string, number> = {};
    return operators
      .map(op => {
        const region = op.region || "Conakry";
        const base = REGION_COORDS[region] || REGION_COORDS[Object.keys(REGION_COORDS).find(k => region?.toLowerCase().includes(k.toLowerCase())) || ""] || GUINEA_CENTER;
        const idx = counters[region] = (counters[region] ?? -1) + 1;
        return { ...op, _coord: jitter(base, idx) };
      });
  }, [operators]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cartographie cyber"
        description={`Vue géographique — ${operators.length} opérateurs · ${incidents.length} incidents`}
      />

      <div className="flex gap-2 flex-wrap">
        {([["all", "Tout"], ["operators", "Opérateurs"], ["incidents", "Incidents"]] as const).map(([k, v]) => (
          <Button key={k} size="sm" variant={layer === k ? "default" : "outline"} onClick={() => setLayer(k)}>{v}</Button>
        ))}
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-primary inline-block" />Opérateur</span>
          {Object.entries(severityColor).map(([s, c]) => (
            <span key={s} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: c }} />{s}
            </span>
          ))}
        </div>
      </div>

      <Card className="p-0 overflow-hidden gradient-card border-border" style={{ height: "70vh" }}>
        <MapContainer center={GUINEA_CENTER} zoom={7} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {(layer === "all" || layer === "operators") && placedOperators.map(op => {
            const ops = incidentsByOperator[op.id] ?? [];
            return (
              <Marker key={op.id} position={op._coord}>
                <Popup>
                  <div className="space-y-2 min-w-[200px]">
                    <div className="flex items-center gap-2 font-semibold">
                      <Building2 className="h-4 w-4" />{op.name}
                    </div>
                    <div className="text-xs flex gap-2">
                      <Badge variant="outline">{op.type}</Badge>
                      {op.region && <Badge variant="secondary">{op.region}</Badge>}
                    </div>
                    <div className="text-xs">Score: <strong>{op.compliance_score ?? 0}/100</strong></div>
                    <div className="text-xs">Incidents: <strong>{ops.length}</strong></div>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/operators")}>Voir opérateur</Button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {(layer === "all" || layer === "incidents") && placedOperators.flatMap(op => {
            const ops = incidentsByOperator[op.id] ?? [];
            return ops.map((inc, idx) => {
              const c: [number, number] = [op._coord[0] + 0.02 + idx * 0.015, op._coord[1] - 0.02 - idx * 0.015];
              return (
                <CircleMarker
                  key={inc.id}
                  center={c}
                  radius={8}
                  pathOptions={{ color: severityColor[inc.severity] || "#888", fillColor: severityColor[inc.severity] || "#888", fillOpacity: 0.7 }}
                >
                  <Popup>
                    <div className="space-y-2 min-w-[200px]">
                      <div className="flex items-center gap-2 font-semibold">
                        <ShieldAlert className="h-4 w-4" />{inc.title}
                      </div>
                      <div className="text-xs flex gap-2">
                        <Badge style={{ background: severityColor[inc.severity] }}>{inc.severity}</Badge>
                        <Badge variant="outline">{inc.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">Opérateur: {op.name}</div>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => navigate(`/incidents/${inc.id}`)}>Détails</Button>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            });
          })}
        </MapContainer>
      </Card>
    </div>
  );
}
