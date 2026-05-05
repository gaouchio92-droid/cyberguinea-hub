## Nouvelle page : Architecture & Code

Ajouter une page de documentation technique exhaustive expliquant le fonctionnement interne de la plateforme ARPT-CERT, accessible aux développeurs, auditeurs et nouveaux arrivants.

### Emplacement
- Route : `/architecture`
- Fichier : `src/pages/Architecture.tsx`
- Lien dans la sidebar (groupe admin) : "Architecture & Code" — icône `Code2`

### Contenu structuré (onglets)

**1. Vue d'ensemble**
- Stack : React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui
- Backend : Lovable Cloud (Postgres + Auth + Edge Functions + Realtime + Storage)
- IA : Lovable AI Gateway (Gemini 2.5)
- Schéma ASCII : Frontend → Supabase Client → RLS → Postgres / Edge Functions

**2. Arborescence du projet**
- `src/pages/` — toutes les pages avec une ligne de description par fichier
- `src/components/` — composants réutilisables (TLPBadge, OperatorContactsDialog, AppSidebar, PageHeader…)
- `src/components/ui/` — primitives shadcn
- `src/hooks/` — useAuth, useNotifications…
- `src/lib/` — types, validation Zod, utils
- `src/integrations/supabase/` — client + types auto-générés
- `supabase/functions/` — edge functions (cve-feed, sync-operator, assistant…)
- `supabase/migrations/` — historique du schéma

**3. Modèle de données**
- Liste des tables principales (incidents, intel_items, iocs, bulletins, operators, operator_contacts, csirt_maturity, audits, compliance_requirements/assessments, exercises, reports, tasks, profiles, user_roles, system_logs, kpi_snapshots, map_markers, fiber_links)
- Pour chacune : but métier en 1 phrase + colonnes clés
- Enums : app_role, severity, incident_status, incident_type, tlp_level, bulletin_type, bulletin_status, ioc_type, exercise_kind/status, operation_type/status, log_level, compliance_status, framework, task_status/priority

**4. Sécurité (RLS & rôles)**
- Modèle 3 rôles : admin / analyst / operator
- Pattern `has_role(uid, role)` via SECURITY DEFINER (anti-récursion)
- Tableau matriciel : table → SELECT / INSERT / UPDATE / DELETE par rôle
- Cas spéciaux : bulletins TLP:CLEAR publics, operator_contacts admin/analyst, system_logs admin lecture seule, kpi_snapshots append-only, get_operator_contact() pour exposer contacts opérateur de façon contrôlée
- Triggers d'audit (audit_table_change) et garde-fous (guard_profile_operator_id, guard_map_markers_update)

**5. Authentification & flux**
- Inscription / login email + Google OAuth
- Trigger handle_new_user → profiles + user_roles('operator')
- Session persistée, refresh auto, useAuth expose user/isAdmin/isAnalyst

**6. Edge Functions**
- Liste avec but, déclencheur, secrets utilisés
- cve-feed (sync NVD, cron quotidien), sync-operator (résumé IA URL opérateur), assistant (chat Gemini), publish-avis (route publique), etc.

**7. Modules fonctionnels (mapping page → tables → fonctions)**
- Tableau page / fichier / tables touchées / edge functions appelées / rôles requis

**8. Conventions de code**
- Tokens design dans `index.css` + `tailwind.config.ts`, jamais de couleurs en dur
- Validation Zod (`src/lib/validation.ts`) côté formulaire
- Toasts via `sonner`
- Realtime via `supabase.channel()` (canal `realtime-notif`)
- TLP : composant `TLPBadge` + `TLP_OPTIONS` partagés

**9. Standards & référentiels intégrés**
- TLP v2.0 (FIRST/ENISA), MITRE ATT&CK (chargé dynamiquement), MISP/STIX 2.1 (export IoCs), SIM3 (maturité), ANSSI/NIS2/ISO27001/PCI DSS (conformité), NVD (CVE)

**10. Déploiement & opérations**
- Build Vite, hébergement Lovable, secrets gérés via Lovable Cloud
- Sauvegarde Postgres automatique
- Logs : system_logs (métier) + edge function logs (technique)

### Détails techniques

- Composant `Architecture.tsx` reprend le pattern de `Documentation.tsx` (Tabs + Cards + Accordion + recherche).
- Aucune nouvelle dépendance, aucune migration DB.
- Accès restreint admin via `useAuth().isAdmin` (redirige sinon).
- Ajout d'une entrée dans `adminItems` de `src/components/AppSidebar.tsx`.
- Route ajoutée dans `src/App.tsx` protégée par `<ProtectedRoute>` admin.

### Hors périmètre
- Pas de génération automatique de doc à partir du code (statique, maintenu à la main).
- Pas de diagramme interactif — uniquement ASCII et tableaux Markdown rendus.