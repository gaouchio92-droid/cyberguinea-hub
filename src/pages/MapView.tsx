import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, ShieldAlert, MapPin, AlertTriangle, Megaphone, HardHat, Wrench, Crosshair } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const REGION_COORDS: Record<string, [number, number]> = {
  Conakry: [9.6412, -13.5784], Kindia: [10.0567, -12.8658], Boké: [10.9325, -14.2956], Boke: [10.9325, -14.2956],
  Labé: [11.3186, -12.2833], Labe: [11.3186, -12.2833], Mamou: [10.3754, -12.0914], Faranah: [10.0402, -10.7444],
  Kankan: [10.3856, -9.3057], Nzérékoré: [7.7561, -8.8178], Nzerekore: [7.7561, -8.8178], Siguiri: [11.4174, -9.1700],
};
const GUINEA_CENTER: [number, number] = [10.4, -11.0];
const severityColor: Record<string, string> = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };

const MARKER_META: Record<string, { color: string; emoji: string; label: string; Icon: any }> = {
  incident: { color: "#ef4444", emoji: "🚨", label: "Incident", Icon: AlertTriangle },
  signalement: { color: "#3b82f6", emoji: "📣", label: "Signalement", Icon: Megaphone },
  travaux: { color: "#f59e0b", emoji: "🚧", label: "Travaux", Icon: HardHat },
  maintenance: { color: "#8b5cf6", emoji: "🔧", label: "Maintenance", Icon: Wrench },
};

function divIconFor(type: string) {
  const m = MARKER_META[type] ?? MARKER_META.signalement;
  return L.divIcon({
    className: "custom-map-marker",
    html: `<div style="background:${m.color};width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4)"><span style="transform:rotate(45deg);font-size:14px">${m.emoji}</span></div>`,
    iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28],
  });
}

function ClickToPlace({ onPick }: { onPick: (latlng: [number, number]) => void }) {
  useMapEvents({ click(e) { onPick([e.latlng.lat, e.latlng.lng]); } });
  return null;
}

export default function MapView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [operators, setOperators] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [fiberLinks, setFiberLinks] = useState<any[]>([]);
  const [markers, setMarkers] = useState<any[]>([]);
  const [layer, setLayer] = useState<"all" | "operators" | "incidents" | "fiber" | "markers">("all");

  const [reportOpen, setReportOpen] = useState(false);
  const [pickMode, setPickMode] = useState(false);
  const [form, setForm] = useState({
    type: "incident" as keyof typeof MARKER_META,
    title: "", description: "", latitude: "", longitude: "",
  });

  // --- Mode tracer un lien fibre ---
  const [drawMode, setDrawMode] = useState(false);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [fiberDialogOpen, setFiberDialogOpen] = useState(false);
  const [fiberForm, setFiberForm] = useState({ name: "", description: "", color: "#3b82f6", operator_id: "" });

  // --- Edition d'un lien fibre existant ---
  const [editingFiber, setEditingFiber] = useState<any | null>(null);
  const [editFiberForm, setEditFiberForm] = useState({ name: "", description: "", color: "#3b82f6", operator_id: "", status: "active" });

  async function refresh() {
    const [{ data: o }, { data: i }, { data: f }, { data: m }] = await Promise.all([
      supabase.from("operators").select("*"),
      supabase.from("incidents").select("id,title,severity,status,operator_id,detected_at"),
      supabase.from("fiber_links").select("*"),
      supabase.from("map_markers").select("*").order("created_at", { ascending: false }),
    ]);
    setOperators(o ?? []); setIncidents(i ?? []); setFiberLinks(f ?? []); setMarkers(m ?? []);
  }
  useEffect(() => { refresh(); }, []);

  const incidentsByOperator = useMemo(() => {
    const m: Record<string, any[]> = {};
    incidents.forEach(i => { if (i.operator_id) (m[i.operator_id] ??= []).push(i); });
    return m;
  }, [incidents]);

  const placedOperators = useMemo(() => {
    const counters: Record<string, number> = {};
    return operators.map(op => {
      const region = op.region || "Conakry";
      const base = REGION_COORDS[region] || GUINEA_CENTER;
      const idx = counters[region] = (counters[region] ?? -1) + 1;
      return { ...op, _coord: [base[0] + idx * 0.05, base[1] + idx * 0.05] as [number, number] };
    });
  }, [operators]);

  function useMyLocation() {
    if (!navigator.geolocation) return toast.error("Géolocalisation indisponible");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        toast.success("Position GPS récupérée");
      },
      () => toast.error("Impossible de récupérer la position"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function startReport() {
    setForm({ type: "incident", title: "", description: "", latitude: "", longitude: "" });
    setReportOpen(true);
  }

  async function submitReport() {
    if (!user) return toast.error("Vous devez être connecté");
    const lat = parseFloat(form.latitude), lng = parseFloat(form.longitude);
    if (!form.title || isNaN(lat) || isNaN(lng)) return toast.error("Titre + position requis");
    const { error } = await supabase.from("map_markers").insert([{
      type: form.type as "incident" | "signalement" | "travaux" | "maintenance",
      title: form.title, description: form.description || null,
      latitude: lat, longitude: lng, created_by: user.id,
    }]);
    if (error) return toast.error(error.message);
    toast.success("Signalement enregistré");
    setReportOpen(false); refresh();
  }

  function startDrawFiber() {
    if (drawMode) {
      // confirm finalize
      if (drawPoints.length < 2) { toast.error("Au moins 2 points requis"); return; }
      setDrawMode(false);
      setFiberForm({ name: "", description: "", color: "#3b82f6", operator_id: "" });
      setFiberDialogOpen(true);
    } else {
      setDrawPoints([]);
      setDrawMode(true);
      setPickMode(false);
      toast.info("Cliquez sur la carte pour ajouter des points. Cliquez à nouveau sur ‘Terminer le tracé’ pour enregistrer.");
    }
  }

  async function submitFiberLink() {
    if (!user) return toast.error("Vous devez être connecté");
    if (!fiberForm.name.trim()) return toast.error("Nom requis");
    if (drawPoints.length < 2) return toast.error("Tracé invalide");
    const { error } = await supabase.from("fiber_links").insert([{
      name: fiberForm.name,
      description: fiberForm.description || null,
      color: fiberForm.color || "#3b82f6",
      operator_id: fiberForm.operator_id || null,
      coordinates: drawPoints as any,
      created_by: user.id,
    }]);
    if (error) return toast.error(error.message);
    toast.success("Lien fibre enregistré");
    setFiberDialogOpen(false);
    setDrawPoints([]);
    refresh();
  }

  function openEditFiber(fl: any) {
    setEditingFiber(fl);
    setEditFiberForm({
      name: fl.name ?? "",
      description: fl.description ?? "",
      color: fl.color ?? "#3b82f6",
      operator_id: fl.operator_id ?? "",
      status: fl.status ?? "active",
    });
  }

  async function saveEditFiber() {
    if (!editingFiber) return;
    if (!editFiberForm.name.trim()) return toast.error("Nom requis");
    const { error } = await supabase.from("fiber_links").update({
      name: editFiberForm.name,
      description: editFiberForm.description || null,
      color: editFiberForm.color,
      operator_id: editFiberForm.operator_id || null,
      status: editFiberForm.status,
    }).eq("id", editingFiber.id);
    if (error) return toast.error(error.message);
    toast.success("Lien fibre mis à jour");
    setEditingFiber(null);
    refresh();
  }

  async function deleteFiber(id: string) {
    if (!confirm("Supprimer ce lien fibre ?")) return;
    const { error } = await supabase.from("fiber_links").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Lien fibre supprimé");
    setEditingFiber(null);
    refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cartographie cyber"
        description={`${operators.length} opérateurs · ${incidents.length} incidents · ${fiberLinks.length} liens fibre · ${markers.length} signalements`}
      />

      <div className="flex gap-2 flex-wrap items-center">
        {([["all","Tout"],["operators","Opérateurs"],["incidents","Incidents"],["fiber","Liens fibre"],["markers","Signalements"]] as const).map(([k,v])=>(
          <Button key={k} size="sm" variant={layer===k?"default":"outline"} onClick={()=>setLayer(k)}>{v}</Button>
        ))}
        <div className="ml-auto flex gap-2 flex-wrap">
          <Button size="sm" variant={pickMode?"default":"outline"} onClick={()=>setPickMode(p=>!p)}>
            <Crosshair className="h-4 w-4 mr-1" />{pickMode?"Cliquez sur la carte…":"Choisir sur carte"}
          </Button>
          <Button size="sm" onClick={startReport}>
            <MapPin className="h-4 w-4 mr-1" />Signaler ici
          </Button>
          <Button size="sm" variant={drawMode?"default":"outline"} onClick={startDrawFiber}>
            {drawMode ? `Terminer le tracé (${drawPoints.length} pts)` : "Tracer un lien fibre"}
          </Button>
          {drawMode && drawPoints.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setDrawPoints(p => p.slice(0, -1))}>
              Annuler dernier point
            </Button>
          )}
          {drawMode && (
            <Button size="sm" variant="ghost" onClick={() => { setDrawMode(false); setDrawPoints([]); }}>
              Abandonner
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {Object.entries(MARKER_META).map(([k,m])=>(
          <span key={k} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full inline-block" style={{background:m.color}} />{m.label}
          </span>
        ))}
        <span className="flex items-center gap-1"><span className="w-4 h-1 inline-block" style={{background:"#3b82f6"}} />Lien fibre</span>
      </div>

      <Card className="p-0 overflow-hidden gradient-card border-border" style={{ height: "70vh" }}>
        <MapContainer center={GUINEA_CENTER} zoom={7} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {pickMode && (
            <ClickToPlace onPick={(c) => {
              setForm(f => ({ ...f, latitude: c[0].toFixed(6), longitude: c[1].toFixed(6) }));
              setPickMode(false);
              setReportOpen(true);
              toast.success("Position sélectionnée");
            }} />
          )}

          {drawMode && (
            <ClickToPlace onPick={(c) => setDrawPoints(p => [...p, c])} />
          )}

          {drawMode && drawPoints.length > 0 && (
            <>
              <Polyline positions={drawPoints} pathOptions={{ color: fiberForm.color || "#3b82f6", weight: 4, dashArray: "8 6", opacity: 0.9 }} />
              {drawPoints.map((p, i) => (
                <CircleMarker key={i} center={p} radius={5}
                  pathOptions={{ color: "#fff", fillColor: fiberForm.color || "#3b82f6", fillOpacity: 1, weight: 2 }} />
              ))}
            </>
          )}

          {(layer==="all"||layer==="fiber") && fiberLinks.map(fl => {
            const coords = Array.isArray(fl.coordinates) ? fl.coordinates as [number,number][] : [];
            if (coords.length < 2) return null;
            return (
              <React.Fragment key={fl.id}>
                <Polyline positions={coords} pathOptions={{ color: fl.color || "#3b82f6", weight: 5, opacity: 0.85 }}>
                  <Popup>
                    <div className="space-y-2 min-w-[200px]">
                      <div className="font-semibold flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-sm" style={{ background: fl.color || "#3b82f6" }} />
                        {fl.name}
                      </div>
                      {fl.description && <div className="text-xs">{fl.description}</div>}
                      <div className="text-xs flex gap-2">
                        <Badge variant="outline">{fl.status}</Badge>
                        <Badge variant="secondary">{coords.length} pts</Badge>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => openEditFiber(fl)}>Modifier</Button>
                        <Button size="sm" variant="destructive" className="flex-1" onClick={() => deleteFiber(fl.id)}>Supprimer</Button>
                      </div>
                    </div>
                  </Popup>
                </Polyline>
                {coords.map((p, i) => (
                  <CircleMarker key={`${fl.id}-${i}`} center={p} radius={4}
                    pathOptions={{ color: "#fff", fillColor: fl.color || "#3b82f6", fillOpacity: 1, weight: 2 }}
                    eventHandlers={{ click: () => openEditFiber(fl) }}>
                    <Popup>
                      <div className="space-y-2 min-w-[180px]">
                        <div className="font-semibold text-sm">{fl.name}</div>
                        <div className="text-xs text-muted-foreground">Point {i + 1} / {coords.length}</div>
                        <div className="text-[10px] text-muted-foreground">{p[0].toFixed(4)}, {p[1].toFixed(4)}</div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => openEditFiber(fl)}>Modifier</Button>
                          <Button size="sm" variant="destructive" className="flex-1" onClick={() => deleteFiber(fl.id)}>Supprimer</Button>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </React.Fragment>
            );
          })}

          {(layer==="all"||layer==="operators") && placedOperators.map(op => {
            const ops = incidentsByOperator[op.id] ?? [];
            return (
              <Marker key={op.id} position={op._coord}>
                <Popup>
                  <div className="space-y-2 min-w-[200px]">
                    <div className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4" />{op.name}</div>
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

          {(layer==="all"||layer==="incidents") && placedOperators.flatMap(op => {
            const ops = incidentsByOperator[op.id] ?? [];
            return ops.map((inc, idx) => {
              const c: [number, number] = [op._coord[0] + 0.02 + idx * 0.015, op._coord[1] - 0.02 - idx * 0.015];
              return (
                <CircleMarker key={inc.id} center={c} radius={8}
                  pathOptions={{ color: severityColor[inc.severity]||"#888", fillColor: severityColor[inc.severity]||"#888", fillOpacity: 0.7 }}>
                  <Popup>
                    <div className="space-y-2 min-w-[200px]">
                      <div className="flex items-center gap-2 font-semibold"><ShieldAlert className="h-4 w-4" />{inc.title}</div>
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

          {(layer==="all"||layer==="markers") && markers.map(mk => (
            <Marker key={mk.id} position={[mk.latitude, mk.longitude]} icon={divIconFor(mk.type)}>
              <Popup>
                <div className="space-y-2 min-w-[200px]">
                  <div className="font-semibold flex items-center gap-2">
                    <span>{MARKER_META[mk.type]?.emoji}</span>{mk.title}
                  </div>
                  <Badge style={{ background: MARKER_META[mk.type]?.color, color: "white" }}>
                    {MARKER_META[mk.type]?.label}
                  </Badge>
                  {mk.description && <div className="text-xs">{mk.description}</div>}
                  <div className="text-[10px] text-muted-foreground">
                    {mk.latitude.toFixed(4)}, {mk.longitude.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </Card>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Signaler sur la carte</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v: any) => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MARKER_META).map(([k,m])=>(
                    <SelectItem key={k} value={k}>{m.emoji} {m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Titre</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Coupure fibre Kindia"/>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}/>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Latitude</Label>
                <Input value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} placeholder="9.6412"/>
              </div>
              <div>
                <Label>Longitude</Label>
                <Input value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} placeholder="-13.5784"/>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={useMyLocation}>
                <Crosshair className="h-4 w-4 mr-1" />Ma position GPS
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { setReportOpen(false); setPickMode(true); }}>
                <MapPin className="h-4 w-4 mr-1" />Choisir sur carte
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Annuler</Button>
            <Button onClick={submitReport}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fiberDialogOpen} onOpenChange={(o) => { setFiberDialogOpen(o); if (!o) setDrawPoints([]); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau lien fibre ({drawPoints.length} points)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nom</Label>
              <Input value={fiberForm.name} onChange={e => setFiberForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Backbone Conakry – Kindia" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={fiberForm.description} onChange={e => setFiberForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Couleur</Label>
                <Input type="color" value={fiberForm.color} onChange={e => setFiberForm(f => ({ ...f, color: e.target.value }))} />
              </div>
              <div>
                <Label>Opérateur</Label>
                <Select value={fiberForm.operator_id || "none"} onValueChange={(v) => setFiberForm(f => ({ ...f, operator_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {operators.map(op => <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFiberDialogOpen(false); setDrawPoints([]); }}>Annuler</Button>
            <Button onClick={submitFiberLink}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
