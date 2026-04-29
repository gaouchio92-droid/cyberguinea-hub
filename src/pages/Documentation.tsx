import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, BookOpen, Layers, Sparkles, ShieldCheck, ExternalLink, Search, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

// MITRE ATT&CK Enterprise STIX bundle (officiel)
const MITRE_URL =
  "https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json";

type Tactic = { id: string; name: string; shortname: string; description: string; url: string };
type Technique = {
  id: string;
  name: string;
  description: string;
  url: string;
  tactics: string[]; // shortnames
  isSubtechnique: boolean;
  platforms: string[];
};

function useMitre() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tactics, setTactics] = useState<Tactic[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);

  async function load(force = false) {
    setLoading(true);
    setError(null);
    try {
      const cacheKey = "mitre_attack_enterprise_v1";
      const cached = !force ? localStorage.getItem(cacheKey) : null;
      let bundle: any;
      if (cached) {
        bundle = JSON.parse(cached);
      } else {
        const res = await fetch(MITRE_URL);
        if (!res.ok) throw new Error("Téléchargement MITRE échoué");
        bundle = await res.json();
        try { localStorage.setItem(cacheKey, JSON.stringify(bundle)); } catch {}
      }
      const objs: any[] = bundle.objects ?? [];
      const tac: Tactic[] = objs
        .filter((o) => o.type === "x-mitre-tactic" && !o.revoked && !o.x_mitre_deprecated)
        .map((o) => ({
          id: o.external_references?.[0]?.external_id ?? o.id,
          name: o.name,
          shortname: o.x_mitre_shortname,
          description: o.description ?? "",
          url: o.external_references?.[0]?.url ?? "",
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

      const tech: Technique[] = objs
        .filter((o) => o.type === "attack-pattern" && !o.revoked && !o.x_mitre_deprecated)
        .map((o) => ({
          id: o.external_references?.[0]?.external_id ?? o.id,
          name: o.name,
          description: o.description ?? "",
          url: o.external_references?.[0]?.url ?? "",
          tactics: (o.kill_chain_phases ?? [])
            .filter((p: any) => p.kill_chain_name === "mitre-attack")
            .map((p: any) => p.phase_name),
          isSubtechnique: !!o.x_mitre_is_subtechnique,
          platforms: o.x_mitre_platforms ?? [],
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

      setTactics(tac);
      setTechniques(tech);
    } catch (e: any) {
      setError(e.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(false); }, []);
  return { loading, error, tactics, techniques, reload: () => load(true) };
}

function MitreTab() {
  const { loading, error, tactics, techniques, reload } = useMitre();
  const [q, setQ] = useState("");
  const [activeTactic, setActiveTactic] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    return techniques.filter((t) => {
      if (activeTactic && !t.tactics.includes(activeTactic)) return false;
      if (!needle) return true;
      return (
        t.id.toLowerCase().includes(needle) ||
        t.name.toLowerCase().includes(needle) ||
        t.description.toLowerCase().includes(needle)
      );
    });
  }, [techniques, q, activeTactic]);

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground p-12 justify-center"><Loader2 className="h-5 w-5 animate-spin" /> Chargement de MITRE ATT&CK…</div>;
  if (error) return (
    <Card className="p-6 text-center space-y-3">
      <p className="text-destructive text-sm">{error}</p>
      <Button onClick={reload} size="sm" variant="outline"><RefreshCcw className="h-4 w-4" /> Réessayer</Button>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher technique, ID (T1059), description…" className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={reload}><RefreshCcw className="h-4 w-4" /> Rafraîchir</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Badge
          variant={!activeTactic ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setActiveTactic(null)}
        >
          Toutes ({techniques.length})
        </Badge>
        {tactics.map((t) => (
          <Badge
            key={t.shortname}
            variant={activeTactic === t.shortname ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setActiveTactic(t.shortname)}
          >
            {t.id} · {t.name}
          </Badge>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{filtered.length} technique{filtered.length > 1 ? "s" : ""}</CardTitle>
          <CardDescription>Source officielle : MITRE ATT&CK Enterprise (STIX 2.1)</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh] pr-4">
            <Accordion type="single" collapsible className="w-full">
              {filtered.slice(0, 400).map((t) => (
                <AccordionItem key={t.id} value={t.id}>
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="font-mono">{t.id}</Badge>
                      <span className="font-medium">{t.name}</span>
                      {t.isSubtechnique && <Badge variant="outline" className="text-[10px]">sous-technique</Badge>}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{t.description.slice(0, 800)}{t.description.length > 800 ? "…" : ""}</p>
                    {t.platforms.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {t.platforms.map((p) => <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>)}
                      </div>
                    )}
                    <a href={t.url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                      Fiche officielle MITRE <ExternalLink className="h-3 w-3" />
                    </a>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            {filtered.length > 400 && (
              <p className="text-xs text-muted-foreground mt-4 text-center">Affichage limité à 400 résultats — affinez la recherche.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

const STACK = [
  { name: "React 18", category: "Frontend", desc: "Bibliothèque UI déclarative à base de composants. Cœur de l'interface ARPT Cyber.", url: "https://react.dev" },
  { name: "TypeScript", category: "Langage", desc: "JavaScript typé statiquement pour la fiabilité du code.", url: "https://www.typescriptlang.org" },
  { name: "Vite", category: "Build", desc: "Bundler ultra-rapide en dev, build de production optimisé.", url: "https://vitejs.dev" },
  { name: "Tailwind CSS", category: "Styling", desc: "Framework utility-first. Design tokens HSL définis dans index.css.", url: "https://tailwindcss.com" },
  { name: "shadcn/ui", category: "UI", desc: "Composants accessibles construits sur Radix UI, intégrés au design system.", url: "https://ui.shadcn.com" },
  { name: "Radix UI", category: "UI", desc: "Primitives accessibles (Dialog, Tabs, Accordion…).", url: "https://www.radix-ui.com" },
  { name: "React Router", category: "Routing", desc: "Navigation client-side multi-pages.", url: "https://reactrouter.com" },
  { name: "TanStack Query", category: "Data", desc: "Gestion du cache et des requêtes asynchrones.", url: "https://tanstack.com/query" },
  { name: "Lovable Cloud", category: "Backend", desc: "Backend managé : base PostgreSQL, authentification, edge functions, stockage. RLS activée par défaut.", url: "https://docs.lovable.dev" },
  { name: "Lovable AI Gateway", category: "IA", desc: "Accès aux modèles Gemini & GPT (assistant, sync opérateur).", url: "https://docs.lovable.dev" },
  { name: "Edge Functions Deno", category: "Backend", desc: "Fonctions serveur sécurisées : admin-create-user, sync-operator, ai-assistant.", url: "https://deno.com" },
  { name: "Sonner", category: "UX", desc: "Notifications toast minimalistes.", url: "https://sonner.emilkowal.ski" },
  { name: "Lucide Icons", category: "UI", desc: "Bibliothèque d'icônes SVG cohérentes.", url: "https://lucide.dev" },
  { name: "date-fns", category: "Utilitaire", desc: "Manipulation de dates avec locale française.", url: "https://date-fns.org" },
  { name: "Recharts", category: "Data Viz", desc: "Graphiques pour le tableau de bord et reporting.", url: "https://recharts.org" },
  { name: "Zod", category: "Validation", desc: "Validation de schémas côté edge functions.", url: "https://zod.dev" },
];

function StackTab() {
  const cats = Array.from(new Set(STACK.map((s) => s.category)));
  return (
    <div className="space-y-6">
      {cats.map((cat) => (
        <Card key={cat}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> {cat}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {STACK.filter((s) => s.category === cat).map((s) => (
              <a key={s.name} href={s.url} target="_blank" rel="noreferrer" className="block p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/30 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-sm">{s.name}</h4>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </a>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const GUIDES = [
  {
    title: "Tableau de bord",
    body: "Vue synthétique : KPIs incidents en cours, sévérités, dernières alertes Threat Intel. Mis à jour en temps réel.",
  },
  {
    title: "Planning & Tâches",
    body: "Suivi des tâches personnelles et collectives. Statuts : à faire, en cours, terminé. Priorités : basse → urgente.",
  },
  {
    title: "Incidents",
    body: "Cycle de vie complet : Ouvert → Investigation → Contenu → Résolu → Clôturé. La clôture exige un commentaire obligatoire (admin/analyste). Les opérateurs sont en lecture seule après création.",
  },
  {
    title: "Threat Intelligence",
    body: "Catalogue de CVE, APT, campagnes de ransomware/phishing. Filtrage par sévérité, catégorie, région.",
  },
  {
    title: "Opérateurs & Audits",
    body: "Fiche par opérateur télécom. URL source configurable + bouton 'Synchroniser' qui scrape et résume via IA pour pré-remplir les informations.",
  },
  {
    title: "Centre de Reporting",
    body: "Génération de rapports PDF/CSV pour la direction et l'autorité.",
  },
  {
    title: "Assistant IA",
    body: "Chat avec un modèle Gemini pour analyse rapide, rédaction de communiqués, classification d'incidents.",
  },
  {
    title: "Utilisateurs (admin)",
    body: "Création de comptes : admin, analyste, opérateur. Les rôles sont stockés dans une table dédiée pour prévenir l'élévation de privilège.",
  },
];

function GuidesTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Manuel d'utilisation</CardTitle>
        <CardDescription>Comment utiliser chaque module de la plateforme.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {GUIDES.map((g) => (
            <AccordionItem key={g.title} value={g.title}>
              <AccordionTrigger className="text-left font-medium">{g.title}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{g.body}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

const FRAMEWORKS = [
  { name: "NIST Cybersecurity Framework 2.0", desc: "6 fonctions : Govern, Identify, Protect, Detect, Respond, Recover.", url: "https://www.nist.gov/cyberframework" },
  { name: "ISO/IEC 27001:2022", desc: "Système de management de la sécurité de l'information (SMSI). 93 contrôles.", url: "https://www.iso.org/standard/27001" },
  { name: "OWASP Top 10 (2021)", desc: "Top 10 des risques applicatifs web : Broken Access Control, Crypto, Injection, etc.", url: "https://owasp.org/Top10/" },
  { name: "OWASP API Security Top 10", desc: "Risques spécifiques aux APIs.", url: "https://owasp.org/API-Security/" },
  { name: "CIS Critical Security Controls v8", desc: "18 contrôles prioritaires de cyberdéfense.", url: "https://www.cisecurity.org/controls" },
  { name: "ENISA Threat Landscape", desc: "Rapport annuel des menaces de l'agence européenne.", url: "https://www.enisa.europa.eu/topics/threat-risk-management/threats-and-trends" },
  { name: "FIRST CVSS v4.0", desc: "Scoring standard des vulnérabilités.", url: "https://www.first.org/cvss/" },
  { name: "MITRE D3FEND", desc: "Contremesures défensives complémentaires à ATT&CK.", url: "https://d3fend.mitre.org" },
  { name: "RGPD / Loi guinéenne 2016", desc: "Protection des données personnelles — obligations de notification.", url: "https://gdpr-info.eu" },
];

function FrameworksTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {FRAMEWORKS.map((f) => (
        <a key={f.name} href={f.url} target="_blank" rel="noreferrer" className="block p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/30 transition-colors">
          <div className="flex items-start justify-between mb-1 gap-2">
            <h4 className="font-semibold text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary shrink-0" /> {f.name}</h4>
            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
          </div>
          <p className="text-xs text-muted-foreground">{f.desc}</p>
        </a>
      ))}
    </div>
  );
}

export default function Documentation() {
  return (
    <div>
      <PageHeader
        title="Documentation"
        description="Bibliothèque de référence : MITRE ATT&CK, technologies de la plateforme, guides d'utilisation et référentiels cyber."
      />
      <Tabs defaultValue="mitre" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-4 h-auto">
          <TabsTrigger value="mitre" className="gap-2"><Sparkles className="h-4 w-4" /> MITRE ATT&CK</TabsTrigger>
          <TabsTrigger value="stack" className="gap-2"><Layers className="h-4 w-4" /> Stack technique</TabsTrigger>
          <TabsTrigger value="guides" className="gap-2"><BookOpen className="h-4 w-4" /> Guides</TabsTrigger>
          <TabsTrigger value="frameworks" className="gap-2"><ShieldCheck className="h-4 w-4" /> Référentiels</TabsTrigger>
        </TabsList>
        <TabsContent value="mitre"><MitreTab /></TabsContent>
        <TabsContent value="stack"><StackTab /></TabsContent>
        <TabsContent value="guides"><GuidesTab /></TabsContent>
        <TabsContent value="frameworks"><FrameworksTab /></TabsContent>
      </Tabs>
    </div>
  );
}
