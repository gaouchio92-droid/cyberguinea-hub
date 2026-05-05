## Carte : séparer Affichage et Modification

### Objectif
Sur `/map`, la barre d'actions mélange les filtres d'affichage (calques) avec les outils de modification (signalements, ajout opérateur, tracé fibre). On les sépare en deux zones distinctes. L'affichage se rafraîchit automatiquement après chaque ajout (déjà partiellement fait via `refresh()`, à fiabiliser via Realtime).

### Changements

**1. UI — `src/pages/MapView.tsx`**
Remplacer la barre unique par deux cartes empilées :

- Bloc **Affichage** (lecture)
  - Boutons calques : Tout / Opérateurs / Incidents / Liens fibre / Signalements
  - Bouton "Me localiser" (tracking GPS personnel)
- Bloc **Modification de la carte** (écriture, encadré accent primaire)
  - "Choisir sur carte"
  - "Signaler ici"
  - "Ajouter opérateur / FAI"
  - "Tracer un lien fibre" + actions contextuelles (Annuler dernier point / Abandonner)

**2. Rafraîchissement automatique après ajout**
- Après `submitOperator()`, `submitReport()`, `submitFiberLink()` : forcer le calque `layer` sur la catégorie correspondante (`operators` / `markers` / `fiber`) si l'utilisateur était sur "all" déjà ok, sinon basculer pour qu'il voie immédiatement son ajout.
- Ajouter un abonnement Realtime sur les tables `operators`, `map_markers`, `fiber_links` qui rappelle `refresh()` à chaque INSERT/UPDATE/DELETE — garantit que la partie Affichage reste à jour sans rechargement.

### Détails techniques
- Aucune migration DB.
- Aucun nouveau composant ni dépendance.
- Realtime : `supabase.channel('map-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'operators' }, refresh)` etc., cleanup au unmount.
- Le `PageHeader` et le reste de la page (carte Leaflet, dialogs, popups) restent inchangés.

### Hors périmètre
- Pas de réorganisation des dialogues d'ajout.
- Pas de changement des permissions/RLS.