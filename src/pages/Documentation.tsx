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

type Guide = {
  title: string;
  intro: string;
  roles?: string[];
  steps?: string[];
  tips?: string[];
};

const GUIDES: Guide[] = [
  {
    title: "🔐 Connexion & gestion du compte",
    intro: "Toute action est tracée et liée à votre identité. Utilisez l'email professionnel fourni par l'ARPT.",
    roles: ["Tous"],
    steps: [
      "Rendez-vous sur la page de connexion et saisissez vos identifiants.",
      "Si c'est votre première connexion, cliquez sur « Mot de passe oublié » pour définir votre mot de passe.",
      "Une fois connecté, votre rôle (admin / analyste / opérateur) détermine les modules accessibles.",
      "Mettez à jour votre profil (nom, photo) depuis le menu utilisateur en haut à droite.",
    ],
    tips: [
      "Déconnectez-vous systématiquement en fin de journée.",
      "Ne partagez jamais vos identifiants — chaque action est journalisée dans Logs Système.",
    ],
  },
  {
    title: "📊 Tableau de bord exécutif",
    intro: "Vue 360° de la cybersécurité nationale : KPIs, tendances 14 jours, heatmap, top opérateurs à risque.",
    roles: ["Tous"],
    steps: [
      "Les 5 KPIs en haut sont cliquables et renvoient vers le module détaillé correspondant.",
      "La courbe « Tendance » montre incidents ouverts vs résolus jour par jour.",
      "La heatmap (jour × heure) identifie les créneaux à risque pour adapter les astreintes.",
      "« Threat Intel récent » liste les 5 dernières alertes — cliquez pour voir le détail.",
    ],
    tips: [
      "Le compteur « Incidents ouverts » reflète l'état réel temps réel de la base.",
      "La conformité moyenne est calculée à partir des évaluations ANSSI/NIS2 du module Conformité.",
    ],
  },
  {
    title: "📅 Planning & Tâches",
    intro: "Suivi personnel des tâches opérationnelles avec priorités, échéances et catégories.",
    roles: ["Tous"],
    steps: [
      "Cliquez « Nouvelle tâche » pour créer une tâche (titre, description, priorité, échéance, catégorie).",
      "Faites évoluer le statut : À faire → En cours → Terminé.",
      "Filtrez par priorité ou statut pour vous concentrer sur l'urgent.",
      "Les tâches sont privées — seul vous voyez vos tâches.",
    ],
    tips: [
      "Une notification temps réel est envoyée si un admin vous assigne une tâche.",
      "Utilisez les catégories (Audit, Veille, Réponse, Reporting…) pour structurer votre semaine.",
    ],
  },
  {
    title: "🚨 Incidents — Cycle de vie complet",
    intro: "Gestion de l'intégralité du processus de réponse à incident, du signalement à la clôture documentée.",
    roles: ["Opérateur (création)", "Analyste / Admin (gestion complète)"],
    steps: [
      "Créer : « Nouvel incident » → renseigner titre, type (malware, phishing, DDoS…), sévérité, opérateur impacté.",
      "Assigner : ouvrez l'incident, choisissez un assigné et une priorité (Urgente 4h / Haute 12h / Moyenne 48h / Basse 7j) — la SLA est calculée automatiquement.",
      "Investiguer : passez le statut à « Investigation », puis « Contenu » lorsque la menace est isolée.",
      "Commenter : utilisez le fil de commentaires pour tracer chaque action — ajoutez l'URL d'une pièce jointe si besoin.",
      "Résoudre puis Clôturer : la clôture exige un commentaire de clôture obligatoire (RETEX).",
    ],
    tips: [
      "Les opérateurs ne peuvent que créer/voir leurs incidents — la modification est réservée aux analystes/admins.",
      "Une notification temps réel est diffusée à toute la cellule à chaque nouvel incident ou changement de statut.",
      "L'échéance SLA passe en rouge dans la liste si elle est dépassée.",
    ],
  },
  {
    title: "🛰️ Threat Intelligence",
    intro: "Veille consolidée : CVE, APT, campagnes ransomware/phishing, alertes régionales.",
    roles: ["Tous (lecture)", "Analyste / Admin (création)"],
    steps: [
      "Filtrez par sévérité, catégorie ou région pour cibler ce qui concerne la Guinée.",
      "Cliquez « Sync CVE » pour ingérer les dernières vulnérabilités publiées par le NVD.",
      "Ajoutez manuellement une fiche pour les menaces locales non publiées par le NVD.",
      "Chaque fiche contient des recommandations actionnables pour les opérateurs.",
    ],
    tips: [
      "Une synchronisation automatique des CVE tourne tous les jours à 06:00 UTC.",
      "Référencez systématiquement le CVE-ID dans les incidents liés.",
    ],
  },
  {
    title: "🏢 Opérateurs & Audits",
    intro: "Annuaire des opérateurs télécom régulés et historique des audits de conformité.",
    roles: ["Tous (lecture)", "Analyste / Admin (édition)"],
    steps: [
      "Ajoutez un opérateur avec nom, type (FAI, MNO, hébergeur…), région et coordonnées.",
      "Renseignez l'URL source officielle puis cliquez « Synchroniser » : l'IA récupère et résume les infos publiques.",
      "Créez un audit (référentiel ANSSI/NIS2/ISO/PCI), notez le score, les constats et le plan de remédiation.",
      "Le score de conformité affiché est mis à jour depuis le module Conformité.",
    ],
    tips: [
      "Renseignez la latitude/longitude pour faire apparaître l'opérateur sur la cartographie.",
      "Un opérateur sous 50% apparaît en zone rouge dans le rapport DG.",
    ],
  },
  {
    title: "✅ Conformité ANSSI / NIS2 / ISO / PCI",
    intro: "Évaluation détaillée des exigences réglementaires par opérateur, avec scoring pondéré et suivi de remédiation.",
    roles: ["Analyste / Admin"],
    steps: [
      "Sélectionnez l'opérateur puis l'onglet du référentiel (ANSSI, NIS2, ISO27001, PCIDSS).",
      "Pour chaque exigence, cliquez l'icône crayon → choisissez le statut : Conforme / Partiel / Non conforme / N/A.",
      "Renseignez les preuves (politique, capture, rapport) et l'échéance de remédiation si non conforme.",
      "Le score (0-100) est recalculé automatiquement et propagé sur la fiche opérateur.",
      "Cliquez « Exporter CSV » pour transmettre l'évaluation à l'opérateur ou à la DG.",
    ],
    tips: [
      "Les exigences pondérées (poids 1-3) reflètent leur criticité.",
      "Les statuts « N/A » sont exclus du calcul de score.",
    ],
  },
  {
    title: "🗺️ Cartographie nationale",
    intro: "Vue géographique des opérateurs, incidents et liens fibre — utile en cellule de crise.",
    roles: ["Tous (lecture)", "Analyste / Admin (création de marqueurs et liens)"],
    steps: [
      "Activez/désactivez les couches : opérateurs, incidents, liens fibre.",
      "Cliquez sur un point pour voir le détail (incident, opérateur).",
      "Ajoutez un marqueur d'événement (panne, intervention) en cliquant sur la carte.",
      "Tracez un lien fibre en saisissant les coordonnées et un nom descriptif.",
    ],
    tips: [
      "La carte se centre automatiquement sur la Guinée.",
      "Les incidents ouverts apparaissent en rouge, résolus en gris.",
    ],
  },
  {
    title: "🎯 Exercices & PCA",
    intro: "Planification d'exercices de crise (table-top, red team, PCA) et capitalisation des retours d'expérience.",
    roles: ["Analyste / Admin"],
    steps: [
      "Créez un exercice : titre, type, scénario, objectifs, date.",
      "Ajoutez les participants et leur rôle (animateur, observateur, joueur).",
      "À l'issue, passez le statut à « Terminé », notez le score (0-100) et rédigez le RETEX (lessons learned).",
      "Consultez l'historique pour mesurer la progression de la maturité.",
    ],
    tips: [
      "Un exercice annuel minimum est recommandé par l'ANSSI pour chaque OIV.",
      "Documentez systématiquement le RETEX — c'est la valeur principale de l'exercice.",
    ],
  },
  {
    title: "📈 Centre de Reporting",
    intro: "Génération automatisée de rapports pour la Direction Générale et l'autorité de tutelle.",
    roles: ["Analyste / Admin"],
    steps: [
      "Cliquez « Générer un rapport » → choisissez Hebdomadaire, Mensuel, Incident ou Audit.",
      "Le système agrège incidents, KPIs et top opérateurs à risque sur la période.",
      "Téléchargez en PDF (impression depuis le navigateur) ou exportez les incidents bruts en CSV.",
      "Les rapports historiques restent consultables et réimprimables.",
    ],
    tips: [
      "Si l'export PDF ne s'ouvre pas, autorisez les pop-ups pour cette page dans votre navigateur.",
      "Le CSV est compatible Excel (BOM UTF-8 inclus pour les accents).",
    ],
  },
  {
    title: "🤖 Assistant IA",
    intro: "Copilote conversationnel basé sur Gemini : analyse rapide, rédaction, classification.",
    roles: ["Tous"],
    steps: [
      "Posez une question en langage naturel (français).",
      "Demandez par exemple : « Rédige un communiqué pour une fuite de données opérateur X ».",
      "Demandez la classification d'un IoC, l'explication d'un CVE, ou un plan de réponse.",
    ],
    tips: [
      "L'IA n'a pas accès aux données sensibles — n'y collez jamais d'identifiants ou de données nominatives.",
      "Vérifiez toujours les sorties IA avant diffusion officielle.",
    ],
  },
  {
    title: "🔔 Notifications temps réel",
    intro: "Cloche en haut à droite : alertes instantanées sur incidents et tâches.",
    roles: ["Tous"],
    steps: [
      "Un toast apparaît à chaque nouvel incident, changement de statut, ou nouvelle tâche assignée.",
      "Cliquez la cloche pour voir l'historique des 30 dernières notifications.",
      "Cliquez une notification pour ouvrir la ressource concernée.",
      "Bouton « Vider » pour réinitialiser la liste.",
    ],
    tips: [
      "Les notifications restent en mémoire entre les sessions (stockage local du navigateur).",
      "Le badge rouge indique le nombre de notifications non lues depuis votre dernière ouverture.",
    ],
  },
  {
    title: "👥 Utilisateurs & rôles (admin)",
    intro: "Création et gestion des comptes. Trois rôles définissent les permissions.",
    roles: ["Admin uniquement"],
    steps: [
      "Module « Utilisateurs » → « Nouvel utilisateur » : email, nom complet, rôle.",
      "Choisissez le rôle : Admin (tout), Analyste (gestion opérationnelle), Opérateur (lecture + création d'incidents propres).",
      "L'utilisateur reçoit un email d'invitation pour définir son mot de passe.",
      "Modifiez le rôle ou désactivez le compte à tout moment.",
    ],
    tips: [
      "Les rôles sont stockés dans une table dédiée pour bloquer toute élévation de privilège.",
      "Limitez le nombre d'admins au strict minimum (principe du moindre privilège).",
    ],
  },
  {
    title: "📜 Logs Système (admin)",
    intro: "Journal d'audit immuable de toutes les actions sensibles.",
    roles: ["Admin uniquement"],
    steps: [
      "Consultez l'horodatage, l'acteur, l'action et la cible.",
      "Filtrez par niveau (info, warning, error) ou recherchez par email/action.",
      "Les suppressions sont automatiquement marquées en « warning ».",
    ],
    tips: [
      "Les logs ne peuvent ni être modifiés ni supprimés (conformité audit).",
      "À conserver minimum 1 an pour traçabilité réglementaire.",
    ],
  },
];

function GuidesTab() {
  const [q, setQ] = useState("");
  const filtered = GUIDES.filter((g) => {
    const n = q.toLowerCase().trim();
    if (!n) return true;
    return g.title.toLowerCase().includes(n) || g.intro.toLowerCase().includes(n)
      || (g.steps ?? []).some(s => s.toLowerCase().includes(n))
      || (g.tips ?? []).some(s => s.toLowerCase().includes(n));
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Manuel d'utilisation détaillé</CardTitle>
        <CardDescription>Guide pas à pas pour chaque module — rôles, étapes, bonnes pratiques.</CardDescription>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher dans le guide (incident, conformité, SLA…)" className="pl-9" />
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {filtered.map((g) => (
            <AccordionItem key={g.title} value={g.title}>
              <AccordionTrigger className="text-left font-medium">{g.title}</AccordionTrigger>
              <AccordionContent className="space-y-4 text-sm">
                <p className="text-muted-foreground">{g.intro}</p>
                {g.roles && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground mr-1">Rôles :</span>
                    {g.roles.map(r => <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>)}
                  </div>
                )}
                {g.steps && (
                  <div>
                    <div className="text-xs font-semibold mb-2 text-foreground">Marche à suivre</div>
                    <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground">
                      {g.steps.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                  </div>
                )}
                {g.tips && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div className="text-xs font-semibold mb-1.5 text-primary">💡 Bonnes pratiques</div>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-xs">
                      {g.tips.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Aucun résultat — essayez un autre mot-clé.</p>}
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
