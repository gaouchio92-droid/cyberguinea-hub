import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TLPBadge } from "@/components/TLPBadge";
import { ShieldAlert, FileText, Search, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";

const TYPE_LABEL: Record<string, string> = { alerte: "Alerte", avis: "Avis", bulletin: "Bulletin", ioc: "Rapport IoC" };
const TYPE_COLOR: Record<string, string> = {
  alerte: "bg-destructive/15 text-destructive border-destructive/40",
  avis: "bg-warning/15 text-warning border-warning/40",
  bulletin: "bg-primary/15 text-primary border-primary/40",
  ioc: "bg-secondary/15 text-secondary border-secondary/40",
};

export default function PublicAvis() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    supabase.from("bulletins")
      .select("*")
      .eq("status", "published")
      .eq("tlp", "clear")
      .order("published_at", { ascending: false })
      .then(({ data }) => setItems(data ?? []));
  }, []);

  const filtered = items.filter(b =>
    !q || `${b.reference} ${b.title} ${b.summary ?? ""}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header public */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-bold text-lg">CERT-GN</div>
              <div className="text-xs text-muted-foreground">Avis publics — ARPT Guinée</div>
            </div>
          </Link>
          <Link to="/auth" className="text-sm text-primary hover:underline">Espace authentifié →</Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {!selected ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Avis et bulletins de sécurité</h1>
              <p className="text-muted-foreground">
                Publications du CERT National (ARPT Guinée) — diffusion publique TLP:CLEAR.
              </p>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher une référence, un sujet…" className="pl-9" />
            </div>

            <div className="grid gap-3">
              {filtered.map(b => (
                <Card key={b.id} className="p-4 cursor-pointer hover:border-primary/50 transition-colors gradient-card" onClick={() => setSelected(b)}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className="font-mono text-[10px]">{b.reference}</Badge>
                        <Badge className={`text-[10px] ${TYPE_COLOR[b.type]}`}>{TYPE_LABEL[b.type]}</Badge>
                        <TLPBadge tlp={b.tlp} />
                      </div>
                      <h2 className="font-semibold">{b.title}</h2>
                      {b.summary && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{b.summary}</p>}
                      <div className="text-[10px] text-muted-foreground mt-2">
                        Publié le {format(new Date(b.published_at), "dd MMMM yyyy", { locale: fr })}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {filtered.length === 0 && (
                <Card className="p-12 text-center text-muted-foreground">
                  {q ? "Aucun résultat" : "Aucun avis public pour le moment"}
                </Card>
              )}
            </div>
          </>
        ) : (
          <Card className="p-6 gradient-card">
            <button onClick={() => setSelected(null)} className="text-sm text-primary mb-4 hover:underline">← Retour à la liste</button>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Badge variant="outline" className="font-mono">{selected.reference}</Badge>
              <Badge className={`text-[10px] ${TYPE_COLOR[selected.type]}`}>{TYPE_LABEL[selected.type]}</Badge>
              <TLPBadge tlp={selected.tlp} />
            </div>
            <h1 className="text-2xl font-bold mb-2">{selected.title}</h1>
            <div className="text-xs text-muted-foreground mb-6">Publié le {format(new Date(selected.published_at), "dd MMMM yyyy", { locale: fr })}</div>

            {selected.summary && <div className="p-4 bg-muted/30 rounded border-l-4 border-primary mb-6">{selected.summary}</div>}

            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm">{selected.body_md}</pre>
            </div>

            {selected.affected_systems && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Systèmes affectés</h3>
                <div className="whitespace-pre-line text-sm">{selected.affected_systems}</div>
              </div>
            )}
            {selected.recommendations && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Recommandations</h3>
                <div className="whitespace-pre-line text-sm">{selected.recommendations}</div>
              </div>
            )}
            {(selected.cve_refs ?? []).length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Vulnérabilités référencées</h3>
                <div className="flex gap-2 flex-wrap">
                  {selected.cve_refs.map((c: string) => (
                    <a key={c} href={`https://nvd.nist.gov/vuln/detail/${c}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-sm">
                      {c} <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        <footer className="text-center text-xs text-muted-foreground mt-12 pt-6 border-t">
          ARPT Guinée — CERT National · Tous les avis publiés ici sont marqués TLP:CLEAR (diffusion libre).
        </footer>
      </main>
    </div>
  );
}
