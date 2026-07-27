Suite à la réunion d’aujourd’hui, veuillez trouver ci-dessous les points d’amélioration identifiés et discutés concernant l’application GED :
Tableau de bord
- Ajouter la possibilité d’extraire l’état complet des bordereaux en Excel
Si cela n’est pas possible, ajouter un filtre de recherche par statut afin de faciliter le suivi et la recherche d’anciens bordereaux

---------------------------------
Note 1 - Tableau de Bord GED : Export Bordereaux en Excel et Filtre de Statut
Analyse :

✅ Excel export feature already fully implemented via BordereauxExcelService with comprehensive columns (Client, Reference, Gestionnaire, Dates, SLA status, Virement status, etc.) and professional formatting (color-coded SLA, frozen headers, auto-filters).
✅ Status filtering capability exists in both backend query filters and frontend dashboard state.
⚠️ Current limitation: Excel export restricted to ADMINISTRATEUR and SUPER_ADMIN roles only. Need to clarify if other user roles (Gestionnaire, Chef Équipe, etc.) should have access.
⚠️ Dashboard UI: Verify if the export button is visible/accessible on the current dashboard interface or if it needs to be added/exposed.
Clarifications Required:

Which user roles should have permission to export the full bordereau state to Excel?
Should the status filter be made more prominent/discoverable on the dashboard for searching archived bordereaux?
Should the export include pre-filtering by status, or always export the complete dataset?
Recommendation: Feature is nearly complete; only requires UI/UX confirmation and potential permission adjustments.

---------------------------------------
------------------------------------------
Extraction de l’état des bordereaux (Via Dashboard)
-        Ajouter (si cela est techniquement possible) les champs complémentaires suivants :

·        Compte auxiliaire

·        Date de demande de récupération

·        Date de récupération

Ces champs sont souhaités pour faciliter et améliorer le suivi et l’analyse des bordereaux, mais restent optionnels

----------------------------------
Note 2 - Champs Complémentaires pour l'Export Bordereaux
Analyse :

Les trois champs demandés existent dans la base de données, mais appartiennent à des modules/tables différentes et non pas au module Bordereau/Dashboard :

✅ Compte auxiliaire → Stocké sur le modèle Client (ex: "41105500")
✅ Date de demande de récupération → Stocké sur le modèle OrdreVirement
✅ Date de récupération → Stocké sur le modèle OrdreVirement (variantes: dateMontantRecupere, dateRecouvrementRecouvre)
Problématiques :
Ces champs ne font pas partie du module Bordereau/Dashboard GED - ils appartiennent au module Finance/Virement
Les bordereaux n'ont pas tous un OrdreVirement associé (valeurs NULL possibles)
Compte auxiliaire est un attribut du Client, pas du Bordereau (partagé entre tous les bordereaux du même client)
Clarifications Requises :

Ces champs doivent-ils être ajoutés à l'export Bordereau Excel ou à l'export OrdreVirement (Finance module) ?
Si ajout au Bordereau : accepter que certaines valeurs seront vides/NULL ?
Où exactement sur le dashboard/interface ces champs sont-ils souhaités ?
Recommandation : Confirmer le contexte d'utilisation avec le client avant implémentation.


-------------------------------
Gestion des profils
-        Créer deux profils distincts :

·        Équipe Comptabilité : Sofiene et Ahlem

·        Équipe Finance : Mohamed Radhi
------------------------------------------
Note 3 - Gestion des Profils : Équipe Comptabilité vs Équipe Finance
Ce que j'ai trouvé dans le code :

✅ FINANCE role existe déjà dans le système (UserRole.FINANCE)
❌ COMPTABILITÉ role n'existe PAS - À créer ou à clarifier

Current System Capabilities:

Department model : Permet de grouper des utilisateurs par département
TeamStructure model : Permet une hiérarchie de teams avec leaders
User model : Chaque utilisateur a departmentId, role, teamLeaderId
La demande est ambiguë - 2 scénarios possibles:
Scénario 1 : Créer DEUX NOUVEAUX RÔLES

Ajouter COMPTABILITE role à l'enum UserRole
Garder FINANCE role existant
→ Définir permissions différentes pour chaque rôle
Scénario 2 : Créer DEUX TEAMS/DEPARTMENTS (pas de nouveaux rôles)

Créer Department ou TeamStructure "Comptabilité"
Créer Department ou TeamStructure "Finance"
Assigner les users à ces teams avec leurs rôles existants
→ Simple organisation, pas de nouvelles permissions
Clarifications Requises :

Nouveaux rôles ou juste organisation/regroupement ?
Si nouveaux rôles : quelles permissions spécifiques pour Comptabilité ?
Qui doit gérer ces profils/teams (admin, responsable, etc.) ?
Les 3 users (Sofiene, Ahlem, Mohamed Radhi) existent-ils déjà ?
Recommandation : Préciser si c'est une restructuration organisationnelle ou une création de nouveaux rôles système.
---------------------------
Droits de l’équipe Comptabilité
-        Accès uniquement aux virements au statut « Virement autorisé »

-        Possibilité de modifier ce statut vers :

·        Virement exécuté

·        Virement exécuté partiellement

·        Virement rejeté


------------
The requirement regarding Finance team permissions was initially interpreted as restricting access to the statuses “Virement autorisé” and “Virement bloqué”, and this was implemented accordingly. However, the client later changed the request to a broader scope by adding “Virement exécuté” and “Virement rejeté” to the list of allowed statuses. This makes the requirement ambiguous and should be clarified with the client before any further adjustment.

Note 4 - Droits de l'Équipe Comptabilité pour Virements
Ce que j'ai trouvé :

❌ Pas de rôle COMPTABILITE actuellement - À créer

✅ Système de statuts virement existe avec les états :

VIREMENT_AUTORISE ✅ (status to filter by)
EXECUTE ✅ (Virement exécuté) - allowed
EXECUTE_PARTIELLEMENT ✅ (Virement exécuté partiellement) - allowed

REJETE ✅ (Virement rejeté) - allowed
✅ Endpoint existe déjà : PUT /finance/ordres-virement/:id/etat

Problématiques Actuelles :

Aspect	Current	Required
Role	COMPTABILITE doesn't exist	Need to create it
Access Control	Finance controller restricted to: CHEF_EQUIPE, GESTIONNAIRE_SENIOR, FINANCE, SUPER_ADMIN, RESPONSABLE_DEPARTEMENT	Add COMPTABILITE role
Status Filtering	No pre-filtering by VIREMENT_AUTORISE status in endpoint	Backend should filter for them
Visibility	COMPTABILITE users will see ALL virements if granted access	Need: COMPTABILITE can ONLY see VIREMENT_AUTORISE status
Implémentation Requise :

Créer le rôle : Add COMPTABILITE to UserRole enum
Update API access : Add COMPTABILITE to /finance controller role restrictions
Add status filtering : Backend should query etatVirement = 'VIREMENT_AUTORISE' when COMPTABILITE role accesses virements
Add state transition guard : Only allow transitions from VIREMENT_AUTORISE to: EXECUTE, EXECUTE_PARTIELLEMENT, REJETE
Clarifications Requises :

Should COMPTABILITE have READ-ONLY access or WRITE access to update statuses?
Can they see OTHER statuses or ONLY VIREMENT_AUTORISE?
Are Sofiene, Ahlem, Mohamed Radhi existing users to assign, or new ones to create?


---------------------------------------
Statuts des virements
-        Simplifier la liste des statuts et conserver uniquement :

·        Virement déposé

·        En cours de validation

·        Virement autorisé

·        Virement bloqué

·        Virement exécuté partiellement

·        Virement exécuté

·        Virement rejeté


--------------
Note 5 - Simplification des Statuts des Virements
Comprendre la Demande :

Le client demande de réduire les 10 statuts actuels à 7 statuts :
À CONSERVER ✅	Statuts ACTUELS à SUPPRIMER ❌
Virement déposé (VIREMENT_DEPOSE)	NON_EXECUTE (72 occurrences)
En cours de validation (EN_COURS_VALIDATION)	EN_COURS_EXECUTION (41 occurrences)
Virement autorisé (VIREMENT_AUTORISE)	VIREMENT_NON_VALIDE (41 occurrences)
Virement bloqué (BLOQUE)	
Virement exécuté partiellement (EXECUTE_PARTIELLEMENT)	
Virement exécuté (EXECUTE)	
Virement rejeté (REJETE)	
🔴 IMPACT CRITIQUE - CONSÉQUENCES :

Migration de Données Massive

~150+ occurrences de code à mettre à jour (72 + 41 + 41)
Fichiers concernés: 25+ fichiers backend, 10+ fichiers frontend
Changement requis dans 6 migrations Prisma existantes
Workflow Impacté

NON_EXECUTE : État initial quand bordereau passe à "Traité" → À remplacer par quoi ? (VIREMENT_DEPOSE ?)
EN_COURS_EXECUTION : État intermediaire Finance → À remplacer par VIREMENT_AUTORISE ?
VIREMENT_NON_VALIDE : Rejet à l'étape validation → À remplacer par REJETE ?
Données Existantes en Base

⚠️ Tous les OrdreVirement avec statut NON_EXECUTE, EN_COURS_EXECUTION, VIREMENT_NON_VALIDE seraient perdus si pas de migration !
Risk de perte d'historique de virements
Reports & Analytics Affectés

FinancialReportingDashboard filtre sur NON_EXECUTE + EN_COURS_EXECUTION pour "pending payments" → code cassera
Workflow Impacté

NON_EXECUTE : État initial quand bordereau passe à "Traité" → À remplacer par quoi ? (VIREMENT_DEPOSE ?)
EN_COURS_EXECUTION : État intermediaire Finance → À remplacer par VIREMENT_AUTORISE ?
VIREMENT_NON_VALIDE : Rejet à l'étape validation → À remplacer par REJETE ?
Données Existantes en Base

⚠️ Tous les OrdreVirement avec statut NON_EXECUTE, EN_COURS_EXECUTION, VIREMENT_NON_VALIDE seraient perdus si pas de migration !
Risk de perte d'historique de virements
Reports & Analytics Affectés

FinancialReportingDashboard filtre sur NON_EXECUTE + EN_COURS_EXECUTION pour "pending payments" → code cassera
Exports Excel, historiques, SLA calculations → À redévelopper
Rôles & Permissions

Cette simplification s'applique-t-elle à TOUS les rôles (Finance, Comptabilité, Chef Équipe) ?

Ou seulement à certains rôles dans l'interface utilisateur ?
⚠️ CLARIFICATIONS ESSENTIELLES :

Scope de simplification :

Simplement l'interface UI (afficher moins de statuts) ?
Ou supprimer les statuts de la BD (impact énorme) ?
Mapping des statuts supprimés :

NON_EXECUTE → VIREMENT_DEPOSE ?
EN_COURS_EXECUTION → VIREMENT_AUTORISE ?
VIREMENT_NON_VALIDE → REJETE ?
Migration des données existantes :

Convertir les anciens statuts en nouveaux ou les archiver ?
Timeline pour la migration ?
S'applique à tous les rôles ou non ?

Comptabilité ne voit que ces 7 statuts ?
Finance voit les anciens aussi ?
Recommandation : Valider ces 4 points avec le client AVANT d'implémenter. Le scope a un impact énorme sur la complexité.

-------------------------
Date d’exécution
-        La date d’exécution du virement et la date de récupération doit être automatiquement la date du jour, sans possibilité de saisir une date future

Note 6 - Date d'Exécution : Auto-Population et Restriction de Date Future
Ce que j'ai trouvé :

✅ Champs de date existent :

dateMontantRecupere (Date montant récupéré) - OrdreVirement model
dateDemandeRecuperation (Date demande récupération) - OrdreVirement model
dateTraitementVirement (Date traitement virement) - Finance tracking
❌ PROBLÈME CRITIQUE - Pas de validation actuelles :

Frontend : Les champs sont en HTML type="date" - aucune restriction sur les dates futures ✗
Backend : Pas de validation pour rejeter les dates futures ✗
Auto-population : Les dates ne sont PAS pré-remplies avec "aujourd'hui" ✗
Où ces dates sont entrées :

Date	Où	Actuellement	À corriger
dateDemandeRecuperation	TrackingTab.tsx (Dialog)	Manuel, input libre	✗ Auto=Aujourd'hui, pas de futur
dateMontantRecupere	TrackingTab.tsx (Dialog)	Manuel, input libre	✗ Auto=Aujourd'hui, pas de futur
dateTraitementVirement	TrackingTab.tsx (Dialog)	Manuel, input libre	✗ Auto=Aujourd'hui, pas de futur

Clarifications Requises :

S'applique à QUELLE(S) date(s) exactement ?

Juste dateMontantRecupere ?
Juste dateDemandeRecuperation ?
TOUTES les 3 dates ci-dessus ?
"Automatiquement la date du jour" signifie :

Pré-remplir le champ avec aujourd'hui (mais éditable) ?
OU forcer automatiquement à aujourd'hui sans possibilité de changement (read-only) ?
Pour quel workflow/rôle ?

Finance peut-elle saisir des dates librement, mais système force d'autres à aujourd'hui ?
Ou TOUS les rôles doivent avoir aujourd'hui uniquement ?
Comportement si l'utilisateur tente une date future :

Bloquer (validation error) ?
Ignorer et forcer aujourd'hui ?
Warning/alerte ?


Impact de l'Implémentation :

🟠 Frontend : Ajouter validation HTML max="today" + validation JavaScript
🔴 Backend : Ajouter validation dans updateEtatVirement pour rejeter dates > today
🟠 UX : Pré-remplir les champs avec new Date().toISOString().split('T')[0]
🟠 Possible Regression : Vérifier que les dates futures existantes en base ne cassent pas le système
Recommandation : Confirmer le scope exact (quelle(s) date(s)) et le type de restriction avant d'implémenter.

---------------------------
Filtres de recherche
-        Ajouter un filtre de recherche par compagnie dans le suivi des bordereaux traités et des ordres de virement du module Finance

Note 7 - Filtre par Compagnie d'Assurance (CLARIFICATION)
La demande est bien comprise :

❌ PAS un filtre par Client (celui-ci existe déjà ✓)

✅ OUI : Un filtre par CompagnieAssurance (Insurance Company) - qui est DIFFÉRENT

La distinction :

Élément	Type	Exemple	Actuellement
Client	Client/Prestataire	PGH, HIKMA, CNAM	✅ Filtre existe
CompagnieAssurance	Insurance Company	CNAM, CNSS, ASSUR-RC	❌ Filtre MANQUANT

Relation dans la BD :

Status :

✅ La structure existe : CompagnieAssurance model + relation vers Client
❌ Le filtre n'existe pas : TrackingTab n'a pas de filtre pour sélectionner par compagnie d'assurance

À Ajouter :

Charger les CompagnieAssurance depuis /finance/compagnies-assurance
Ajouter un Autocomplete dans le filter panel (à côté du filtre Client)
Appliquer la logique de filtrage sur ordreVirement.client.compagnieAssurance.nom
Clarification Requise :

Est-ce que le filtre doit fonctionner ainsi :

Filtrer les virements (OV) dont le client est lié à une compagnie
Ou filtrer les virements générés POUR une compagnie d'assurance directement ?
(La première option est plus logique vu la relation existante)

--------------------------------------------
Sélection multiple
-        Permettre la sélection multiple des virements à exécuter, comme c’est déjà le cas pour l’autorisation des virements

---------------
Note – Sélection multiple des virements
Analyse : ce besoin semble déjà couvert dans le module Finance. La vue de suivi des virements permet déjà la sélection multiple via des cases à cocher, puis une mise à jour groupée des statuts depuis la boîte de dialogue dédiée dans TrackingTab.tsx.
Donc, ce point ne semble pas nécessiter un développement supplémentaire, à moins que le client fasse référence à une action d’exécution spécifique distincte de la simple modification de statut. Une clarification sur le workflow exact serait utile si nécessaire.
--------------------------------
Module SAGE
-        Ajouter le statut « Virement exécuté » dans le filtre du statut global
--------------------------------
Note 10 – Module SAGE : ajout du statut “Virement exécuté” dans le filtre “statut global”
Analyse : la demande est compréhensible, mais le module SAGE contient plusieurs vues et plusieurs types de filtres, ce qui rend le besoin ambigu. Dans RecouvrementTab.tsx, le filtre “statut global” utilise actuellement des valeurs telles que EN_ATTENTE, VALIDE_INTERNE, VALIDE_RECOUVREMENT, BLOQUE_RECOUVREMENT, COMPTABILISE et INTEGRE_SAGE. Dans SageIntegrationTab.tsx, il existe aussi un autre filtre lié aux intégrations SAGE. Le statut “Virement exécuté” n’apparaît pas dans la liste actuelle du “statut global”. Il serait donc nécessaire de préciser : 1) quelle vue exacte du module SAGE est visée, 2) si ce statut doit être ajouté au filtre de workflow/recouvrement ou à un autre filtre, 3) s’il faut créer une nouvelle valeur de statut global ou le mapper à une valeur existante. Sans cette clarification, l’implémentation pourrait être faite sur la mauvaise interface ou avec un mapping incohérent.

-------------------------------
Téléchargement TXT SAGE
-        Lors de la sélection des OV pour générer le fichier TXT SAGE, après validation de l’autorisation des OV, l’icône de téléchargement TXT disparaît

“Analyse : ce point semble déjà couvert dans le code. Le module SAGE dispose déjà d’un bouton de téléchargement TXT Sage, ainsi que des handlers de téléchargement simple et groupé dans RecouvrementTab.tsx. La demande ne semble donc pas nécessiter un nouveau développement, sauf si le client observe un bug spécifique d’affichage ou de logique après validation des OV.

the buton alredy working 

-----------------------
14. **Notifications SLA**
-        Mettre en place une notification après 24h pour les virements déposés non autorisés

-        Mettre en place une notification après 24h pour les virements autorisés non exécutés

-----------
SLA reminder notifications for virements: the current codebase includes a generic notification framework and finance alert logic in finance.service.ts, but no dedicated 24-hour SLA workflow was identified for “deposited but not authorized” or “authorized but not executed” virements. This appears to be a new business-rule/automation requirement that needs clarification and implementation rather than an existing feature.

Suggested clarification note
The current implementation does not show a dedicated SLA reminder workflow for virements. Before proceeding, we should ask the client to clarify the following points:

Which exact statuses should trigger the reminder for a virement: “déposé mais non autorisé” and/or “autorisé mais non exécuté”?
What is the expected notification channel and recipient role: email, in-app notification, both, and which user group should receive them?
What is the intended SLA threshold: 24 hours, or another delay period?
Should the reminder be sent once, repeatedly, or stop after a certain number of alerts?
Should this logic apply to all virements or only to a specific type, department, or workflow stage?
This wording makes it clear that the missing piece is not implementation certainty, but business clarification from the client.
