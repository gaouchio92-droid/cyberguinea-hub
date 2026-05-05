import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Layers, Database, ShieldCheck, KeyRound, FunctionSquare, Workflow,
  Code2, BookMarked, Server, Search,
} from "lucide-react";

const ARCHI_ASCII = `
   ┌──────────────────────────────────────────────────┐
   │  Frontend (React 18 + Vite + TS + Tailwind)      │
   │  Pages • Components shadcn • hooks • lib/zod     │
   └────────────────────────┬─────────────────────────┘
                            │ supabase-js (HTTPS + WebSocket)
   ┌────────────────────────▼─────────────────────────┐
   │             Lovable Cloud (Supabase)              │
   │ ┌─────────────┐ ┌──────────────┐ ┌─────────────┐ │
   │ │  Auth/JWT   │ │   Postgres   │ │  Realtime   │ │
   │ │ Email+OAuth │ │ + RLS + RPC  │ │  channels   │ │
   │ └─────────────┘ └──────┬───────┘ └─────────────┘ │
   │ ┌─────────────────────▼────────────────────────┐ │
   │ │    Edge Functions (Deno)  •  Storage         │ │
   │ │ cve-feed • sync-operator • assistant • …     │ │
   │ └────────────────────┬─────────────────────────┘ │
   └──────────────────────┼───────────────────────────┘
                          │
              ┌───────────▼───────────┐
              │ Lovable AI Gateway    │
              │ Gemini 2.5 / GPT-5    │
              └───────────────────────┘
`;

type Item = { name: string; desc: string };

const PAGES: Item[] = [
  { name: "Dashboard.tsx", desc: "Tableau de bord exécutif : KPIs, tendance 14j, heatmap, top opérateurs à risque." },
  { name: "Auth.tsx / ResetPassword.tsx", desc: "Connexion email + Google OAuth, réinitialisation mot de passe." },
  { name: "Tasks.tsx", desc: "Tâches personnelles avec priorité, échéance, catégorie." },
  { name: "Incidents.tsx / IncidentDetail.tsx", desc: "Cycle de vie complet d'un incident, fil de commentaires, timeline, clôture documentée." },
  { name: "Intel.tsx", desc: "Threat intelligence : CVE, APT, ransomware. Sync NVD + ajout manuel + TLP." },
  { name: "Iocs.tsx", desc: "Indicateurs de compromission, export MISP/STIX 2.1/CSV." },
  { name: "Bulletins.tsx / PublicAvis.tsx", desc: "Bulletins/avis officiels (CERT-FR style) + page publique TLP:CLEAR." },
  { name: "Operators.tsx", desc: "Annuaire opérateurs, audits, sync IA URL source, contacts 24/7." },
  { name: "Compliance.tsx", desc: "Conformité ANSSI/NIS2/ISO27001/PCI DSS — scoring pondéré." },
  { name: "Exercises.tsx", desc: "Exercices de crise (table-top, red team, PCA) + RETEX." },
  { name: "Operations.tsx", desc: "Opérations longues (investigation, remédiation, surveillance)." },
  { name: "MapView.tsx", desc: "Cartographie nationale : opérateurs, incidents, liens fibre." },
  { name: "Reports.tsx", desc: "Génération de rapports DG (hebdo, mensuel, incident, audit)." },
  { name: "Maturity.tsx", desc: "Auto-évaluation SIM3 du CERT (radar 4 quadrants)." },
  { name: "Assistant.tsx", desc: "Copilote IA Gemini : analyse, rédaction, classification." },
  { name: "Users.tsx", desc: "Gestion comptes & rôles (admin)." },
  { name: "SystemLogs.tsx", desc: "Journal d'audit immuable (admin)." },
  { name: "Documentation.tsx", desc: "Guide utilisateur, MITRE ATT&CK, glossaire." },
  { name: "Architecture.tsx", desc: "Cette page : documentation technique & code." },
];

const COMPONENTS: Item[] = [
  { name: "AppLayout / AppSidebar / PageHeader", desc: "Squelette applicatif, navigation par rôle, en-tête de page." },
  { name: "TLPBadge", desc: "Badge couleur normalisé Traffic Light Protocol v2.0 + options pour Select." },
  { name: "OperatorContactsDialog", desc: "Dialogue carnet d'astreinte 24/7 d'un opérateur (admin/analyste)." },
  { name: "NotificationsBell", desc: "Cloche temps-réel, abonnée au canal realtime-notif." },
  { name: "ProtectedRoute / RoleGate", desc: "Garde de route selon session et rôle." },
  { name: "ui/*", desc: "Primitives shadcn (Button, Card, Dialog, Select, Table, Tabs, Toaster…)." },
];

const HOOKS_LIB: Item[] = [
  { name: "hooks/useAuth.ts", desc: "Provider session Supabase, expose user / isAdmin / isAnalyst / signOut." },
  { name: "hooks/useNotifications.ts", desc: "Abonnement realtime + persistance localStorage." },
  { name: "lib/types.ts", desc: "Enums et libellés FR (severity, incident_status, etc.) + couleurs." },
  { name: "lib/validation.ts", desc: "Schémas Zod (incidentSchema, auditSchema…) + firstZodError." },
  { name: "lib/utils.ts", desc: "cn() (clsx+tailwind-merge), helpers divers." },
  { name: "integrations/supabase/client.ts", desc: "Instance supabase-js (auto-générée — ne pas éditer)." },
  { name: "integrations/supabase/types.ts", desc: "Types TypeScript du schéma DB (auto-générés)." },
];

const TABLES: Item[] = [
  { name: "incidents", desc: "Incidents cyber. Colonnes clés : type, severity, status, tlp, sla_due_at, owner_id, operator_id, timeline jsonb, closure_comment." },
  { name: "incident_comments", desc: "Fil de discussion par incident (auteur immutable, append-only sauf admin)." },
  { name: "intel_items", desc: "Items de veille : category, severity, tlp, cve_id, region_impact, recommendations." },
  { name: "iocs", desc: "Indicateurs : type (ip/domain/url/hash/email…), value, confidence 0-100, tlp, tags[], liens incident/intel." },
  { name: "bulletins", desc: "Publications officielles : type (alerte/avis/bulletin/ioc), status, tlp, body_md, reference auto CERT-GN-AAAA-XXX-NNN." },
  { name: "operators", desc: "Opérateurs régulés : name, type, region, lat/long, compliance_score, source_url. Contacts via fonction sécurisée." },
  { name: "operator_contacts", desc: "Carnet d'astreinte (RSSI/NOC…), on_call_24_7, pgp_fingerprint. Lecture admin/analyste." },
  { name: "audits", desc: "Audits opérateur par framework (ANSSI/NIS2/ISO/PCI), score, constats, plan de remédiation." },
  { name: "compliance_requirements / compliance_assessments", desc: "Référentiel d'exigences pondérées + évaluation par opérateur." },
  { name: "csirt_maturity", desc: "Items SIM3 (24 items, 4 catégories), score 0-4 + preuves. Admin only." },
  { name: "exercises / exercise_participants", desc: "Exercices PCA/table-top avec scénario, score, lessons_learned, participants." },
  { name: "operations", desc: "Opérations longues : type, status, owner, dates de début/fin." },
  { name: "reports", desc: "Rapports générés (PDF/CSV) avec type et tlp." },
  { name: "tasks", desc: "Tâches personnelles. RLS user_id = auth.uid()." },
  { name: "profiles", desc: "Profil utilisateur (nom, avatar, operator_id). Créé par trigger handle_new_user." },
  { name: "user_roles", desc: "Rôles séparés (anti-escalation). Enum app_role : admin / analyst / operator." },
  { name: "system_logs", desc: "Journal d'audit immuable, alimenté par trigger audit_table_change. Lecture admin uniquement." },
  { name: "kpi_snapshots", desc: "Snapshots quotidiens KPIs (MTTD, MTTR, conformité). Append-only." },
  { name: "map_markers / fiber_links", desc: "Marqueurs et tracés sur la carte nationale. created_by immutable." },
];

const ENUMS: Item[] = [
  { name: "app_role", desc: "admin | analyst | operator" },
  { name: "severity", desc: "low | medium | high | critical" },
  { name: "incident_status", desc: "open | investigating | contained | resolved | closed" },
  { name: "incident_type", desc: "phishing | malware | ddos | data_breach | unauthorized_access | other" },
  { name: "tlp_level", desc: "red | amber_strict | amber | green | clear (FIRST/ENISA v2.0)" },
  { name: "bulletin_type / bulletin_status", desc: "alerte/avis/bulletin/ioc — draft/published/archived" },
  { name: "ioc_type", desc: "ip | domain | url | hash_md5/sha1/sha256 | email | filename | other" },
  { name: "exercise_kind / exercise_status", desc: "tabletop/redteam/pca/full — planned/running/completed/cancelled" },
  { name: "operation_type / operation_status", desc: "investigation/remediation/surveillance — planned/active/closed" },
  { name: "compliance_status", desc: "compliant | partial | non_compliant | not_applicable" },
  { name: "framework", desc: "ANSSI | NIS2 | ISO27001 | NIST | PCI_DSS | ARPT" },
  { name: "task_status / task_priority", desc: "todo/in_progress/done — low/medium/high/urgent" },
  { name: "log_level", desc: "info | warning | error" },
];

const RLS_MATRIX = [
  ["incidents",            "Tous (auth)", "admin/analyst/operator(self)", "admin/analyst", "admin"],
  ["intel_items",          "Tous (auth)", "admin/analyst",                "admin/analyst", "admin"],
  ["iocs",                 "Tous (auth)", "admin/analyst",                "admin/analyst", "admin"],
  ["bulletins",            "Public si TLP:CLEAR publié, sinon auth+rôle", "admin/analyst", "admin/analyst", "admin"],
  ["operators",            "Tous (auth) — sans contacts", "admin/analyst", "admin/analyst", "admin"],
  ["operator_contacts",    "admin/analyst",   "admin/analyst",            "admin/analyst", "admin"],
  ["audits / compliance_*","Tous (auth)",     "admin/analyst",            "admin/analyst", "admin"],
  ["csirt_maturity",       "admin",           "admin",                    "admin",         "admin"],
  ["exercises",            "Tous (auth)",     "admin/analyst",            "admin/analyst", "admin"],
  ["reports",              "Tous (auth)",     "admin/analyst",            "—",             "admin"],
  ["tasks",                "self",            "self",                     "self",          "self"],
  ["profiles",             "Tous (auth)",     "(trigger)",                "self",          "—"],
  ["user_roles",           "self ou admin",   "admin",                    "admin",         "admin"],
  ["system_logs",          "admin",           "admin (trigger)",          "—",             "—"],
  ["kpi_snapshots",        "Tous (auth)",     "admin/analyst",            "—",             "—"],
  ["map_markers",          "Tous (auth)",     "auth (created_by=self)",   "owner ou admin/analyst", "owner ou admin"],
  ["fiber_links",          "Tous (auth)",     "admin/analyst",            "admin/analyst", "admin"],
];

const FUNCTIONS = [
  { name: "has_role(uid, role)", desc: "STABLE SECURITY DEFINER — base de toutes les politiques RLS, anti-récursion." },
  { name: "handle_new_user()", desc: "Trigger AFTER INSERT auth.users → crée profiles + user_roles('operator')." },
  { name: "get_operator_contact(_operator_id)", desc: "Expose contact_email/contact_phone d'un opérateur uniquement aux admin/analyst." },
  { name: "next_bulletin_reference(_type)", desc: "Génère la référence officielle CERT-GN-AAAA-{ALE/AVI/BUL/IOC}-NNN." },
  { name: "audit_table_change()", desc: "Trigger générique → insère un log dans system_logs à chaque INSERT/UPDATE/DELETE sensible." },
  { name: "guard_profile_operator_id()", desc: "Empêche la modification de operator_id sauf par un admin." },
  { name: "guard_map_markers_update()", desc: "Rend created_by immutable sur map_markers." },
  { name: "set_updated_at()", desc: "Trigger BEFORE UPDATE pour mettre à jour updated_at automatiquement." },
];

const EDGE_FUNCTIONS = [
  { name: "cve-feed", desc: "Sync quotidienne du NVD (CVE récents) → intel_items. Cron 06:00 UTC." },
  { name: "sync-operator", desc: "Récupère et résume via IA le contenu public d'une URL opérateur (last_sync_summary)." },
  { name: "assistant", desc: "Proxy chat Gemini 2.5 (Lovable AI Gateway) — conversation libre cyber." },
  { name: "send-notification", desc: "Push d'événements vers le canal realtime-notif." },
];

const MODULE_MAP = [
  ["Incidents",   "Incidents.tsx, IncidentDetail.tsx", "incidents, incident_comments, operators", "send-notification", "Tous (création opérateur self), édition admin/analyst"],
  ["Veille",      "Intel.tsx",                          "intel_items",                       "cve-feed",          "Lecture tous, écriture admin/analyst"],
  ["IoCs",        "Iocs.tsx",                           "iocs",                              "—",                 "Lecture tous, écriture admin/analyst"],
  ["Bulletins",   "Bulletins.tsx, PublicAvis.tsx",      "bulletins",                         "—",                 "Public si CLEAR/published, écriture admin/analyst"],
  ["Opérateurs",  "Operators.tsx",                      "operators, operator_contacts, audits","sync-operator",   "Lecture tous (sans contacts), édition admin/analyst"],
  ["Conformité",  "Compliance.tsx",                     "compliance_requirements, compliance_assessments", "—", "Lecture tous, édition admin/analyst"],
  ["Exercices",   "Exercises.tsx",                      "exercises, exercise_participants",  "—",                 "Lecture tous, édition admin/analyst"],
  ["Cartographie","MapView.tsx",                        "map_markers, fiber_links, operators, incidents","—",     "Lecture tous, écriture auth"],
  ["Reporting",   "Reports.tsx",                        "incidents, audits, kpi_snapshots",  "—",                 "Génération admin/analyst"],
  ["Maturité",    "Maturity.tsx",                       "csirt_maturity",                    "—",                 "Admin uniquement"],
  ["Assistant",   "Assistant.tsx",                      "—",                                 "assistant",         "Tous"],
  ["Admin",       "Users.tsx, SystemLogs.tsx",          "user_roles, profiles, system_logs", "—",                 "Admin uniquement"],
];

function ItemList({ items }: { items: Item[] }) {
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.name} className="text-sm">
          <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-primary">{i.name}</code>
          <span className="text-muted-foreground"> — {i.desc}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Architecture() {
  const { isAdmin, loading } = useAuth() as any;
  const [q, setQ] = useState("");

  const filterItems = (arr: Item[]) =>
    !q.trim() ? arr : arr.filter(i => (i.name + " " + i.desc).toLowerCase().includes(q.toLowerCase()));

  const filteredModules = useMemo(
    () => !q.trim() ? MODULE_MAP : MODULE_MAP.filter(r => r.join(" ").toLowerCase().includes(q.toLowerCase())),
    [q]
  );

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Architecture & Code"
        description="Documentation technique exhaustive de la plateforme ARPT-CERT : structure du code, modèle de données, sécurité RLS, edge functions et conventions."
      />

      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (table, fichier, fonction…)" className="pl-9" />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview" className="gap-2"><Layers className="h-4 w-4" />Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="tree" className="gap-2"><Code2 className="h-4 w-4" />Arborescence</TabsTrigger>
          <TabsTrigger value="data" className="gap-2"><Database className="h-4 w-4" />Modèle de données</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><ShieldCheck className="h-4 w-4" />Sécurité (RLS)</TabsTrigger>
          <TabsTrigger value="auth" className="gap-2"><KeyRound className="h-4 w-4" />Auth</TabsTrigger>
          <TabsTrigger value="edge" className="gap-2"><FunctionSquare className="h-4 w-4" />Edge Functions</TabsTrigger>
          <TabsTrigger value="modules" className="gap-2"><Workflow className="h-4 w-4" />Modules</TabsTrigger>
          <TabsTrigger value="conv" className="gap-2"><BookMarked className="h-4 w-4" />Conventions</TabsTrigger>
          <TabsTrigger value="ops" className="gap-2"><Server className="h-4 w-4" />Déploiement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Stack & architecture</CardTitle>
              <CardDescription>Application 100% web, backend managé par Lovable Cloud.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge>React 18</Badge><Badge>Vite</Badge><Badge>TypeScript</Badge>
                <Badge>TailwindCSS</Badge><Badge>shadcn/ui</Badge><Badge>react-router-dom</Badge>
                <Badge>@tanstack/react-query</Badge><Badge>recharts</Badge><Badge>react-leaflet</Badge>
                <Badge>zod</Badge><Badge>sonner</Badge><Badge>date-fns</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Postgres</Badge>
                <Badge variant="secondary">Auth (email + Google OAuth)</Badge>
                <Badge variant="secondary">Row-Level Security</Badge>
                <Badge variant="secondary">Realtime (WebSocket)</Badge>
                <Badge variant="secondary">Storage</Badge>
                <Badge variant="secondary">Edge Functions (Deno)</Badge>
                <Badge variant="secondary">Lovable AI Gateway (Gemini 2.5)</Badge>
              </div>
              <pre className="text-[11px] leading-tight font-mono bg-muted/40 p-3 rounded overflow-auto whitespace-pre">{ARCHI_ASCII}</pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tree" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>src/pages/</CardTitle><CardDescription>Une page = une route.</CardDescription></CardHeader>
            <CardContent><ItemList items={filterItems(PAGES)} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>src/components/</CardTitle></CardHeader>
            <CardContent><ItemList items={filterItems(COMPONENTS)} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>src/hooks/ & src/lib/ & src/integrations/</CardTitle></CardHeader>
            <CardContent><ItemList items={filterItems(HOOKS_LIB)} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>supabase/</CardTitle></CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2">
                <li><code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-primary">supabase/migrations/</code> <span className="text-muted-foreground">— historique versionné du schéma (timestamp_*.sql).</span></li>
                <li><code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-primary">supabase/functions/</code> <span className="text-muted-foreground">— edge functions Deno déployées automatiquement.</span></li>
                <li><code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-primary">supabase/config.toml</code> <span className="text-muted-foreground">— config par fonction (verify_jwt, etc.).</span></li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Tables principales</CardTitle></CardHeader>
            <CardContent><ItemList items={filterItems(TABLES)} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Enums Postgres</CardTitle></CardHeader>
            <CardContent><ItemList items={filterItems(ENUMS)} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Fonctions & triggers SQL</CardTitle></CardHeader>
            <CardContent><ItemList items={filterItems(FUNCTIONS)} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Modèle de sécurité</CardTitle>
              <CardDescription>Trois rôles, RLS sur toutes les tables, pas de données sensibles côté client.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1">Rôles (enum app_role)</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li><Badge>admin</Badge> — accès total, gestion utilisateurs, suppression, lecture system_logs.</li>
                  <li><Badge variant="secondary">analyst</Badge> — gestion opérationnelle (incidents, intel, IoCs, audits, bulletins, contacts).</li>
                  <li><Badge variant="outline">operator</Badge> — lecture + déclaration d'incidents les concernant.</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Pattern anti-récursion</h4>
                <p className="text-sm text-muted-foreground">
                  Toutes les politiques RLS appellent <code className="text-xs bg-muted px-1 rounded">public.has_role(auth.uid(), 'role')</code>,
                  une fonction <code className="text-xs bg-muted px-1 rounded">SECURITY DEFINER</code> qui contourne la RLS pour éviter
                  les boucles infinies sur <code className="text-xs bg-muted px-1 rounded">user_roles</code>. Les rôles sont stockés dans une
                  table dédiée pour bloquer toute élévation de privilège.
                </p>
              </div>
              <div className="overflow-x-auto">
                <h4 className="font-semibold mb-2">Matrice d'accès (table → opérations)</h4>
                <table className="text-xs w-full border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-left p-2 border">Table</th>
                      <th className="text-left p-2 border">SELECT</th>
                      <th className="text-left p-2 border">INSERT</th>
                      <th className="text-left p-2 border">UPDATE</th>
                      <th className="text-left p-2 border">DELETE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RLS_MATRIX.filter(r => !q.trim() || r.join(" ").toLowerCase().includes(q.toLowerCase())).map((r) => (
                      <tr key={r[0]} className="hover:bg-muted/40">
                        <td className="p-2 border font-mono">{r[0]}</td>
                        <td className="p-2 border">{r[1]}</td>
                        <td className="p-2 border">{r[2]}</td>
                        <td className="p-2 border">{r[3]}</td>
                        <td className="p-2 border">{r[4]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Cas spéciaux</h4>
                <ul className="text-sm space-y-1 text-muted-foreground list-disc pl-5">
                  <li>Bulletins TLP:CLEAR + status published lisibles par <code className="text-xs bg-muted px-1 rounded">anon</code> (page /avis).</li>
                  <li>Champs <code className="text-xs bg-muted px-1 rounded">contact_email/phone</code> de operators retirés du grant — accessibles via <code className="text-xs bg-muted px-1 rounded">get_operator_contact()</code> (admin/analyst).</li>
                  <li>system_logs : insertion par trigger SECURITY DEFINER, jamais d'UPDATE/DELETE.</li>
                  <li>kpi_snapshots : append-only (ni UPDATE ni DELETE).</li>
                  <li>Realtime : seul le canal global <code className="text-xs bg-muted px-1 rounded">realtime-notif</code> est exposé.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auth">
          <Card>
            <CardHeader><CardTitle>Authentification & session</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Connexion via email + mot de passe ou Google OAuth. Jeton JWT Supabase, refresh automatique, session persistée dans le navigateur.</p>
              <Accordion type="single" collapsible>
                <AccordionItem value="flow">
                  <AccordionTrigger>Flux d'inscription</AccordionTrigger>
                  <AccordionContent className="space-y-2 text-muted-foreground">
                    <p>1. <code className="text-xs bg-muted px-1 rounded">supabase.auth.signUp()</code> crée la ligne dans <code className="text-xs bg-muted px-1 rounded">auth.users</code>.</p>
                    <p>2. Trigger <code className="text-xs bg-muted px-1 rounded">handle_new_user()</code> insère <code className="text-xs bg-muted px-1 rounded">profiles</code> + <code className="text-xs bg-muted px-1 rounded">user_roles('operator')</code>.</p>
                    <p>3. Email de confirmation (sauf si auto-confirm activé).</p>
                    <p>4. Connexion → JWT dans le client → toutes les requêtes filtrées par RLS via <code className="text-xs bg-muted px-1 rounded">auth.uid()</code>.</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="hook">
                  <AccordionTrigger>Hook useAuth</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-1">
                    <p>Provider monté dans <code className="text-xs bg-muted px-1 rounded">App.tsx</code>. Expose : <code className="text-xs bg-muted px-1 rounded">user, session, loading, isAdmin, isAnalyst, signIn, signUp, signOut</code>.</p>
                    <p>Utilise <code className="text-xs bg-muted px-1 rounded">onAuthStateChange</code> + <code className="text-xs bg-muted px-1 rounded">getSession</code> pour rester en phase.</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edge">
          <Card>
            <CardHeader>
              <CardTitle>Edge Functions (Deno)</CardTitle>
              <CardDescription>Logique serveur, accès aux secrets, appels externes.</CardDescription>
            </CardHeader>
            <CardContent><ItemList items={filterItems(EDGE_FUNCTIONS)} /></CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader><CardTitle>Secrets configurés</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>Stockés dans Lovable Cloud, jamais exposés au frontend :</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">SUPABASE_URL</Badge>
                <Badge variant="outline">SUPABASE_ANON_KEY</Badge>
                <Badge variant="outline">SUPABASE_SERVICE_ROLE_KEY</Badge>
                <Badge variant="outline">SUPABASE_DB_URL</Badge>
                <Badge variant="outline">LOVABLE_API_KEY</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle>Mapping module → fichiers → tables → fonctions</CardTitle>
              <CardDescription>Pour retrouver rapidement où intervenir.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="text-xs w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-2 border">Module</th>
                    <th className="text-left p-2 border">Fichier(s)</th>
                    <th className="text-left p-2 border">Tables</th>
                    <th className="text-left p-2 border">Edge function</th>
                    <th className="text-left p-2 border">Accès</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModules.map((r) => (
                    <tr key={r[0]} className="hover:bg-muted/40 align-top">
                      <td className="p-2 border font-semibold">{r[0]}</td>
                      <td className="p-2 border font-mono">{r[1]}</td>
                      <td className="p-2 border font-mono">{r[2]}</td>
                      <td className="p-2 border font-mono">{r[3]}</td>
                      <td className="p-2 border">{r[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conv">
          <Card>
            <CardHeader><CardTitle>Conventions de code</CardTitle></CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground list-disc pl-5">
                <li><strong className="text-foreground">Design tokens</strong> dans <code className="text-xs bg-muted px-1 rounded">index.css</code> + <code className="text-xs bg-muted px-1 rounded">tailwind.config.ts</code> — jamais de couleurs en dur dans les composants.</li>
                <li><strong className="text-foreground">Validation</strong> via Zod (<code className="text-xs bg-muted px-1 rounded">src/lib/validation.ts</code>) avant chaque insert sensible. Utilise <code className="text-xs bg-muted px-1 rounded">firstZodError()</code> pour le toast.</li>
                <li><strong className="text-foreground">Toasts</strong> via <code className="text-xs bg-muted px-1 rounded">sonner</code> (<code className="text-xs bg-muted px-1 rounded">toast.success / error / loading</code>).</li>
                <li><strong className="text-foreground">Realtime</strong> via <code className="text-xs bg-muted px-1 rounded">supabase.channel('realtime-notif')</code> — un seul canal global pour éviter les fuites cross-user.</li>
                <li><strong className="text-foreground">TLP</strong> : composant <code className="text-xs bg-muted px-1 rounded">TLPBadge</code> + constantes <code className="text-xs bg-muted px-1 rounded">TLP_OPTIONS</code> partagés (incidents, intel, IoCs, bulletins, exercices, rapports).</li>
                <li><strong className="text-foreground">Lazy loading</strong> de toutes les pages dans <code className="text-xs bg-muted px-1 rounded">App.tsx</code> sauf Dashboard et Auth.</li>
                <li><strong className="text-foreground">Types DB</strong> dans <code className="text-xs bg-muted px-1 rounded">src/integrations/supabase/types.ts</code> — auto-générés, ne jamais éditer.</li>
                <li><strong className="text-foreground">Migrations</strong> versionnées dans <code className="text-xs bg-muted px-1 rounded">supabase/migrations/</code> — jamais de modifications SQL ad-hoc.</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader><CardTitle>Standards & référentiels intégrés</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge>TLP v2.0 (FIRST/ENISA)</Badge>
                <Badge>MITRE ATT&CK Enterprise</Badge>
                <Badge>MISP JSON</Badge>
                <Badge>STIX 2.1</Badge>
                <Badge>SIM3 (maturité CSIRT)</Badge>
                <Badge>ANSSI</Badge>
                <Badge>NIS2</Badge>
                <Badge>ISO 27001</Badge>
                <Badge>NIST CSF</Badge>
                <Badge>PCI DSS</Badge>
                <Badge>NVD (CVE)</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ops">
          <Card>
            <CardHeader><CardTitle>Déploiement & exploitation</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-3 text-muted-foreground">
              <p><strong className="text-foreground">Build</strong> : Vite produit un bundle statique (HTML/JS/CSS) servi par l'hébergement Lovable.</p>
              <p><strong className="text-foreground">Backend</strong> : Lovable Cloud gère Postgres, Auth, Realtime, Storage et Edge Functions. Sauvegardes Postgres automatiques.</p>
              <p><strong className="text-foreground">Edge functions</strong> : déployées automatiquement à chaque push, exécution Deno.</p>
              <p><strong className="text-foreground">Secrets</strong> : gérés via Lovable Cloud, jamais commités, accessibles uniquement aux edge functions.</p>
              <p><strong className="text-foreground">Logs</strong> : <code className="text-xs bg-muted px-1 rounded">system_logs</code> (métier, immuable) + logs des edge functions (techniques, console Lovable).</p>
              <p><strong className="text-foreground">Observabilité</strong> : KPIs quotidiens dans <code className="text-xs bg-muted px-1 rounded">kpi_snapshots</code> alimentent le dashboard exécutif.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
