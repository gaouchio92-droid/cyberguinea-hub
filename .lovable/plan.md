# Enrichissement inspiré des CERT sectoriels internationaux

Sources de référence analysées : **CERT-FR / ANSSI** (CSIRT sectoriels France), **CERT-EU** (Cyber Threat Intelligence Framework), **ENISA** (baseline capabilities for national/governmental CERTs, telecom sector), **MyCERT Malaysia** (MISP & threat sharing), **FIRST.org** (TLP v2.0).

## Constat

Notre plateforme couvre déjà : incidents, threat intel CVE, conformité ANSSI/NIS2, opérateurs, exercices, cartographie, reporting. Les CERT sectoriels matures ajoutent **5 capacités structurantes** que nous n'avons pas encore.

## Sprint 7 — 5 modules à valeur immédiate

### 1. Système TLP (Traffic Light Protocol v2.0)
Standard FIRST/ENISA pour marquer la diffusion de toute information sensible.

- 4 niveaux : `TLP:RED` (destinataire seul), `TLP:AMBER+STRICT` (organisation), `TLP:AMBER` (org + clients), `TLP:GREEN` (communauté), `TLP:CLEAR` (public).
- Badge visible sur **incidents, threat intel, rapports, exercices**.
- Filtrage automatique de l'export PDF/CSV selon le TLP du document.
- Champ `tlp` ajouté aux tables `incidents`, `intel_items`, `reports`.

### 2. IoC Manager + export MISP-compatible
Capacité "Indicateurs de compromission" présente dans tous les CERT (CERT-FR feed MISP, MyCERT MISP).

- Nouvelle table `iocs` : type (ip, domain, url, hash-md5/sha256, email, cve), value, confidence, tags, tlp, source, first_seen, last_seen, lié à un incident ou intel.
- Page **/iocs** : recherche, filtres par type/tag/TLP, ajout manuel, déduplication.
- Export **JSON MISP-compatible** (event + attributes) et **STIX 2.1 light** + CSV.
- Bouton "Extraire IoCs" sur les incidents (regex IP/hash/domain + IA).

### 3. Bulletins & Avis publics (style CERT-FR)
CERT-FR publie 4 types : **Alertes** (critique), **Avis** (vulnérabilités), **Bulletins** (synthèses), **IoC reports**.

- Nouvelle table `bulletins` : type (alerte/avis/bulletin/ioc), reference (ex: `CERT-GN-2026-ALE-001`), titre, contenu markdown, TLP, status (draft/published), affected_systems, recommendations.
- Page **/bulletins** : éditeur markdown, prévisualisation, workflow brouillon→publié, génération automatique du numéro de référence.
- Page publique `/avis` (lecture seule, sans auth) listant les bulletins TLP:CLEAR publiés — utile pour les opérateurs.

### 4. Constituents & Points de contact 24/7 (ENISA baseline)
Annuaire de la "constituency" : qui contacter dans chaque opérateur, en heures ouvrées et en astreinte.

- Nouvelle table `contacts` liée aux opérateurs : nom, fonction, email, téléphone, **astreinte 24/7 (oui/non)**, canaux préférés (email, téléphone, signal), PGP key, langues.
- Vue "carnet d'astreinte" filtrable par sévérité d'incident (qui appeler pour un incident `critical`).
- Visible uniquement par admins/analystes (cohérent avec la restriction contact_email du dernier audit sécurité).

### 5. Maturité CERT-CSIRT (SIM3 light)
Auto-évaluation de la maturité de notre propre CERT selon le modèle **SIM3** utilisé par ENISA / Trusted Introducer.

- 4 quadrants : Organisation, Humain, Outils, Processus (~25 items pondérés).
- Score 0-4 par item, radar chart de maturité, recommandations d'amélioration.
- Module accessible aux admins, exportable en PDF pour la DG.

## Détails techniques

```text
Tables ajoutées
├── iocs                  (type, value, confidence, tlp, tags[], source, incident_id?, intel_id?)
├── bulletins             (type, reference, title, body_md, tlp, status, published_at)
├── operator_contacts     (operator_id, name, role, email, phone, on_call_24_7, pgp)
└── csirt_maturity        (item_code, category, score, evidence, assessed_at)

Colonnes ajoutées
├── incidents.tlp         enum tlp (default 'amber')
├── intel_items.tlp       enum tlp (default 'green')
└── reports.tlp           enum tlp (default 'amber')

Routes
├── /iocs                 IoC Manager + export MISP/STIX
├── /bulletins            Rédaction des avis (admin/analyst)
├── /avis                 Vue publique des bulletins TLP:CLEAR (no auth)
├── /maturity             Auto-évaluation SIM3
└── (contacts intégrés dans la fiche opérateur existante)

Sécurité
├── RLS : iocs lisibles auth users, écriture analyst/admin
├── RLS : bulletins en draft visibles à l'auteur+admin, published selon TLP
├── RLS : operator_contacts admin/analyst seulement
└── /avis = endpoint public via edge function (pas d'auth)

UI
├── Composant <TLPBadge tlp=... /> réutilisable, couleurs FIRST officielles
├── Sidebar : nouveau groupe "Communication & Partage" (Bulletins, IoCs, Avis publics)
└── Recherche globale étendue aux IoCs et bulletins
```

## Hors-scope (proposable dans un sprint 8 ultérieur)

- Intégration MISP push/pull réel (nécessite serveur MISP)
- Échange ATT&CK Navigator JSON
- API publique authentifiée (clés API par opérateur)
- Plateforme honeypot / sinkhole
- Module forensique (analyse de logs/IoC enrichment via VirusTotal, AbuseIPDB)

## Validation

Confirmez et je lance le Sprint 7 avec les 5 modules ci-dessus, ou indiquez ceux à garder/écarter.