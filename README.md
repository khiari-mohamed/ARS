# ARS
assurance projet ARS 


Certainly! Based on the provided pages and the detailed content of the PDF "cahier de charge APPLICATION - VERSION ARS TUNISIE-merged (1).pdf," I will give you a comprehensive, meticulous description of the entire application, including all modules, features, functionalities, and technical specifications as outlined in the document. This will cover every aspect and detail to provide a full understanding of the system.

Complete Description of the Application:

Overview and Purpose:

The application is designed as an integrated operational management platform for ARS Tunisie, aiming to streamline and automate internal processes related to handling bordereaux, reimbursements, documents, financial transactions, and performance monitoring. Its core goal is to enhance efficiency, transparency, real-time oversight, and data-driven decision-making.

The system is web-based, built on modern technologies (React.js frontend, Node.js backend, PostgreSQL database), and incorporates role-based security, API integrations, automation workflows, AI-driven suggestions, and comprehensive dashboards.

1. Core Business Objectives & Functional Scope

- Automate collection, processing, and archiving of documents (bordereaux, justificatives, courriers).

- Manage contractual parameters and thresholds for processing times, alerts, and escalations.

- Enable real-time monitoring of operations at departmental, team, and individual levels.

- Implement intelligent routing and allocation of workload via rules and AI.

- Facilitate financial operations including virement (bank transfer) generation, tracking, and reconciliation.

- Provide comprehensive reporting, analytics, and performance insights.

- Support automatic detection and handling of exceptions, delays, or non-compliance.

2. Modules and Features

A. Gestion électronique des documents (GED)

- Archivage Structuré: Digital storage of various documents such as bordereaux, receipts, justificatives, and contracts.

- Indexation & Recherche: Multi-criteria search by client, provider, date, keyword, and status.

- OCR Integration: Automated text extraction for efficient search and classification.

- Process: Documents are scanned, stored with metadata, categorized, and accessible via the platform.

B. Gestion électronique du courrier (GEC)

- Automation: Automatic generation of messages like settlement letters, reclamations, and reminders.

- Templates: Configurable templates based on document type or process.

- Archiving: Automatic import into GED after generation.

- Workflow: Manages the circulation of mail, with alerts, relances, and escalation procedures.

C. Bordereau Management Module

- Data Entry & Classification:

- Receives bordereaux from clients or providers.

- Contains detailed info like references, dates, processing duration, and associated BS (Bulletin de Soins).

- Parameters & Rules:

- Links to insurance contracts.

- Sets deadlines for processing and payment.

- Facilitates automatic or manual classification.

- Workflow & Tracking: Records each step, from reception to closure, with timestamps.

D. Affectation & Workflow Automation

- Intelligent Routing:

- Automatic allocation of bordereaux to teams or managers based on parameters like workload, expertise, or client profile.

- Use of a rule engine and AI for dynamic assignment.

- Manual Override: Supervisors or managers can reassign or adjust routing.

- Performance & Load Monitoring: Flags overloads, delays, or bottlenecks, with alerts to Super Admin.

E. Operational Teams & Roles

- Teams & Hierarchy:

- Bureau d’ordre: Handles document reception and initial registration.

- Équipe Scan: Responsible for electronic scanning of physical documents.

- Équipe Santé: Processes bordereaux related to health reimbursements.

- Finance: Manages virement processes, monitoring, and confirmation.

- Managers (Chefs d’Équipe): Oversee workload, assign dossiers, monitor progress.

- Gestionnaires: Execute tasks assigned, update statuses.

- Super Admin: Oversees entire system, security, and high-level analytics.

F. User Dashboards & Monitoring

- Chefs d’Équipe:

- Centralized "corbeille" (inbox) showing:

- Documents treated

- Pending tasks

- Non-assigned dossiers

- Interactive dashboards showing:

- Progress

- Alerts

- Performance metrics (productivity, response times)

- Gestionnaires:

- View their assigned files

- Track statuses: en cours, traités, retournés

- See client-specific and urgent dossiers

- Super Admin:

- Full access to all dashboards

- System-wide statistics and alert management

- Monitoring team performance and queues

- Trigger reassignments or escalations

G. Virements & Financial Management Module

- Virement Tracking:

- List of pending, confirmed, or completed transfers.

- Reconciliation with bordereaux.

- Notification & Alerts:

- System alerts when virement injection occurs, or delays happen.

- Virement Generation:

- Automated creation of bank files in PDF/TXT formats from Excel data.

- RIB adherence rules, duplication checks, RIB updates.

- Integration:

- API or communication with external banking systems for execution confirmation.

H. Client & Contract Data Management

- Client Module:

- Centralized database of insurance companies and brokers.

- Tracks contracts, associated parameters, timestamps.

- Constraining Rules:

- Enforces unique identifiers.

- Limits RIB duplication and maintains RIB change history.

- Adherent (Member) Management:

- New base added for adhérents with fields:

- Matricule, Nom, Prénom, RIB, Status, etc.

- Checks for duplicate matricule/RIB during addition.

I. Performance & KPI Monitoring

- Real-time dashboards for:

- Average processing time

- Number of bordereaux received, processed, closed

- Rejection rates

- Delay or SLA breaches

- Recurrent issues, anomalies, and alert mechanisms

- Historical data and trend analysis.

3. Technical Architecture and Security

- Frontend: Built with React.js, responsive, mobile/tablet friendly.

- Backend: Node.js server with REST API.

- Database: PostgreSQL, ensuring data integrity, relationships, transaction safety.

- Security:

- Role-based access, with differentiated permissions.

- Full log of user activities.

- Authentication with secure protocols.

- APIs & External Integrations:

- Outlook integration.

- External systems like MY TUNICLAIM.

4. Automation & AI Features

- Routing & Allocation:

- Use of rules, workload metrics, and AI-based recommendations for assigning dossiers.

- Performance Prediction:

- Estimation of required staffing based on workload projections.

- Prioritization & Planning:

- Daily suggestions for workload handling and escalation.

- Anomaly Detection:

- Detect delays, non-compliance, or recurrent issues automatically.

5. Workflow & Process Details

- Document Receipt & Scanning:

- Physical documents scanned and indexed.

- Data Entry & Validation:

- Automatic checks for RIB duplication, matricule uniqueness.

- Processing & Assignment:

- Bordereaux routed to health team, finance, or other relevant teams.

- Approval & Confirmation:

- Financial virement confirmed via API, email, or manual process.

- Monitoring:

- Real-time alerts on delays or overloads.

- Reporting:

- Exportable dashboards and analytical reports for management review.

6. Summary of Key Features:

Module / FeatureDescriptionDocument ManagementSecure archiving, OCR, searchMail & Notification AutomationAutomatic email/courrier generationBordereau ProcessingReception, classification, trackingIntelligent AllocationAI/rules-based assignmentsPerformance DashboardsReal-time KPIs, alertsVirement ModuleBank file generation, tracking, reconciliationClient & Member DataRIB, contract info, constraints enforcementRole-Based SecurityPermissions per profileAPI IntegrationsOutlook, external systemsAI & AutomationRouting, workload prediction, escalation

Conclusion:

This system is designed to be a comprehensive, end-to-end operational platform for ARS—integrating document management, workflow automation, financial tracking, real-time monitoring, and AI-driven optimization. Every component is crafted to enhance efficiency, transparency, and accuracy, making it a crucial tool for handling complex reimbursement and operational workflows.

 Based on the detailed content provided in the PDF, I will elaborate on every aspect of the application, including each module, feature, functionality, and interface element or button that could be involved. This comprehensive overview will serve as an exhaustive guide, covering all the core components, workflows, and interactive elements specified.

1. Application Overview & Core Goals

- Main Objective: Develop a comprehensive web application for real-time operational monitoring, management automation, document digitalization, and performance reporting, tailored for ARS TUNISIE.

- Key Features include:

- Real-time dashboards

- Automated workflows with artificial intelligence

- Document management (GED & GEC)

- Financial transaction tracking

- Claims management and analysis

- User roles and permissions

2. Modules and Functional Components

A. Dashboard Modules

a) Super Admin Dashboard (Page 29)

- Purpose: Complete oversight of the entire system, configuration, user management, and high-level KPIs.

- Buttons & Elements:

- User Management Button: to add/edit/delete user accounts.

- System Settings Button: access configuration parameters.

- Access Logs Button: for viewing system activity.

- Role Management Button: assign roles (admin, user, etc.).

- Statistics & Reports Button: generate/highlight overall performance metrics.

- Navigation Menu: links to core modules (e.g., Users, System Data, Reports).

b) Dossier Management by Manager (Page 28)

- Purpose: Tag and organize client/dossier files.

- Buttons & UI Elements:

- Search Bar: filter dossiers by client, status, date.

- Filter Dropdowns: status, date range, assigned manager.

- Dossier List Table: displaying dossier details:

- Columns: Client Name, Dossier ID, Status, Last Updated.

- Tag Button: assign tags or labels to dossiers.

- Detail View Button: open dossier details.

- Edit Tag Button: modify existing tags.

c) Team Leader Dashboard (Page 24)

- Purpose: Monitor team performance metrics, workload, and KPIs.

- Buttons & Elements:

- Performance Indicators: display graphs (bar, line) for processing times, volume.

- Filter Options: date range, team, status.

- Action Buttons:

- Export Data: download CSV, Excel.

- Refresh Data: reload current KPIs.

- Assign Task: assign dossiers or tasks to team members.

- Send Alert: notify team members of deadlines.

B. Core Functional Modules & Processes

3. Modules & Processes

a) Client Module & Management

- Features & Buttons:

- Add Client Button: form with fields:

- Company Name

- Contract Details

- Contact Info

- Send Invitation Button (for client portal access)

- Edit Client Button: update details

- Delete Client Button

- Client List Table: sortable/searchable

- View Contract Button: open attached contract document

- Download Data Button: export client data

b) Bordereau Data Module & Tracking

- Features & Buttons:

- Upload Bordereau Button: select files to upload

- Scan Start Button: trigger scanning process

- Scan End Button: finish scanning

- Reject Document Button: flag documents with issues

- Validate & Confirm Button: mark bordereau as processed

- Data Field Inputs: reference number, reception date, processing duration

- Notification Toggle: enable/disable alerts

c) Team Management & Workflow

- Features & Buttons:

- Assign Team Button: select team members for tasks

- Change Team Member Button: reassign work

- Team List Table: show team members, roles

- Performance Buttons: view individual/team KPIs

- Task Allocation Buttons: assign or reassign dossiers/boarderaux

4. Operational & Financial Modules

a) Order of Virement Module (Page 7)

- Purpose: Automate generate virement files from Excel data

- Buttons & Features:

- Load Excel Button: select file to upload

- Validate Data Button: check for duplicate RIBs, Matricules

- Generate PDF Button: create bank transfer PDFs

- Generate TXT Button: create bank transfer TXT files

- Select Donneur d’Ordre Dropdown: choose the initiator

- Add / Remove Adherent Button: manage adherent database

- Alert Pop-Ups: duplicate RIB or Matricule issues

- Preview Buttons: before download

- Download Buttons: for files

Data Input Fields:

- RIB, Matricule, Name, Bank account, Status (Active/Inactive)

b) Virement Management (Page 6)

- Features & Buttons:

- Virement List Table: show all transactions

- Search & Filter: by date, amount, status

- Confirmation Button: confirm pending transfers

- Manual Confirmation Checkbox: override automatic process

- Export Button: Excel, PDF versions

- Revoke / Cancel Button: for invalid transfers

- Details Button: see transaction history

Additional Elements:

- Status Indicators: pending, confirmed, rejected

- Notification Alerts: success/error

5. Document Management & Workflow Automation

a) GED (Gestion Électronique Des Documents) (Page 3 & 2)

- Features & Buttons:

- Upload Document Button: upload files (contracts, justificatives)

- Categorize Button: assign document category (bordereaux, justificatives)

- Search Bar: search by client, date, keyword

- Filter Dropdowns: document type, status

- OCR Toggle: enable/disable optical character recognition

- Download Button: get document locally

- Delete Document Button

b) GEC (Gestion Électronique du Courrier)

- Features & Buttons:

- Automated Letter Generation Button: trigger process

- Edit Template Button: for customizable email/mailing templates

- Send Email Button: dispatch generated letter

- Schedule Send Button: for delayed dispatch

- Archive Button: automatically archive emails into GED

6. Real-time Monitoring & KPI Dashboards

- Features & Buttons:

- Refresh Dashboard Button

- Filter Date Range Button: pre-set intervals or custom

- Department Filter Drop-down

- Operation Type Filter Drop-down

- Graphs & Charts:

- Bar charts for processing volumes

- Pie charts for rejection rates

- Line graphs for processing times

- Interactive Elements:

- Hover over Data Points: show detailed info

- Export Dashboard Data Button: Excel, PDF

7. Reclamações Management & Analysis

- Features & Buttons:

- Add Reclamation Button: create new case

- Categorize Button: classify urgent, recurring, etc.

- Assign Reclamation Button: to responsible staff

- Process Button: mark as processed or escalated

- AI Analysis Button: trigger anomaly detection

- View Reclamations List: filter/search by date, client

- Alert & Notification Buttons: for recurrent issues

8. User Roles & Access Control

- Features & Buttons:

- Roles Management Button: create/edit roles

- Assign Roles Button: assign to users

- Login Button: authenticate with username/password

- Logout Button

- Profile & Settings Button

- Permission Toggle: restrict/allow access to modules

- Activity Log Button: audit trail

9. Reports & Export Features

- Buttons:

- Generate Report Button: select type and period

- Download CSV/Excel Button

- Download PDF Button

- Custom Report Builder: drag-and-drop widget interface

10. System & Technical Buttons

- API Integration Buttons:

- Sync with Outlook / MY TUNICLAIM

- Initiate API Call Button

- View API Log Button

- Security & Audit:

- Test Authentication Button

- View Audit Trails Button

Summary:

Every module, dashboard, data table, form, and workflow includes multiple interactive buttons tailored for actions like create, read, update, delete, validate, export, generate, assign, filter, and notify. These are accompanied by alert mechanisms, validation pop-ups, and role-based access controls to ensure a secure, comprehensive, and user-friendly experience.

If you'd like, I can prepare a detailed visual layout or wireframe sketches listing each button and interface component corresponding to these functionalities for


Certainly! Here is a comprehensive and detailed ASCII diagram representing all modules, processes, interactions, roles, workflows, and data flows based on the entire content provided. This diagram aims for maximum fidelity to the original documentation.

+-------------------------------------------------------------------------------------------------------------------------+
|                                                      APPLICATION ARCHITECTURE                                           |
+-------------------------------------------------------------------------------------------------------------------------+

+------------------------------+                          +------------------------------+                       +------------------------------+
|      GESTION ÉLECTRONIQUE     |                          |      GEC (Gestion Courrier)   |                       |   VIREMENTS & RAPPROCHEMENT  |
|       DES DOCUMENTS (GED)     |                          |                              |                       |                              |
+--------------+--------------+--+                          +--------------+--------------+                       +--------------+--------------+
|                                                  |                                                          |
|                                                  |                                                          |
|                                                  |                                                          |
+------------v--------------+                          +--------v---------+                         +--------------v--------------+
| Archivage structuré (scans,|                          | Génération automatique |                  | Suivi des virements (attente, |
| justificatifs, contrats)   |                          | relances, courriers)   |                  | confirmation, historique)   |
+---------------------------+                          +------------------------+                  +------------------------------+
|                                                 |
|                                                 |
+--------------v--------------+                          +--------v---------+        +-------------------------------+
| Recherche intelligente, OCR |                          | Archivage automatique |   | Notification / Workflow       |
+----------------------------+                          | dans GED              |   +------------------------------+
+------------------------+

+-------------------------------------------------------------------------------------------------------------------------+
|                                                      MODULES & PROCESS FLOW                                               |
+-------------------------------------------------------------------------------------------------------------------------+

+-------------------------------------------+                                   +----------------------------------------------+
|           MODULE: CLIENT                  |                                   |      MODULE: BORDEREAU & CONTACT            |
| Kommunikation, gestion contrats, délais |                                   | Réception (Client/Prestataire), liaison   |
| Définir délais, seuils d’alerte, etc.   |                                   | contrat, numérotation horodatée           |
+-----------------+-------------------------+                                   +------------------+-------------------+
|                                                                     |
|                                                                     |
+-----------------v-------------------------+                                   +--------------v--------------+
|       MODULE: BORDEREAU                  |                                   |    MODULE: NUMÉRISATION    |
| Réception, contenu variable, liaison    |                                   | Service Scan: Numérisation,|
| contrat, numéro, gestion des références |                                   | enregistrement, indexation|
+-----------------+-------------------------+                                   +--------------+--------------+
|                                                                     |
|                                                                     |
+-----------------v-------------------------+                                   +--------------v--------------+
|   Affectation automatique via IA        |                                   |    Affectation à gestionnaires    |
+-----------------+-------------------------+                                   | selon chargé de compte ou règle  |
|                                                                     |
+-------v--------+                                                    +-------v-------+
| Traitement &   |                                                    |   Notification au  |
| Indexation     |                                                    |  service SCAN      |
+----------------+                                                    +-------------------+

+--------------------------------------------------------------------------------------------------------------+
|              PROCESSUS: TRAITEMENT DES DOSSIERS ET FLUX OPÉRATIONNEL                                           |
+--------------------------------------------------------------------------------------------------------------+

1. Reception physique / numérique
- Par le client ou prestataire
- Dossiers liés aux contrats
- Enregistrement par Bureau d’Ordre (BO)

2. Bureau d’Ordre (BO)
- Saisie manuelle des métadonnées :
* Type de fichier
* Nombre, référence bordereau
* Délai de règlement
* Chargé de dossier
- Notification automatique vers équipe Scan

3. Équipe Scan
- Numérisation, stockage
- Indexation, mise à jour statut "scanné"
- Attribution automatique au gestionnaire compétent

4. Équipes métier
- Traitement des dossiers
- Affectation selon règle ou IA (rendement, disponibilité, complexité)
- Calcul rendement xs BS/jour
- Clôture, mise à jour statut

5. Module Finance & Virement
- Confirmation virement
- Rapprochement avec bordereaux
- Récupération des paiements
- Historique des virements

+--------------------------------------------------------------------------------------------------------------+
|                 TABLEAUX DE BORD & TABLEAUX STATISTIQUES, INDICATEURS                                        |
+--------------------------------------------------------------------------------------------------------------+
| Dashboards dynamiques, graphiques, indicateurs en temps réel par équipe, département, client, période     |
| - Délai moyen, volumes, taux conformité, rejets, rendement, bordereaux critiques, etc.                     |
+--------------------------------------------------------------------------------------------------------------+

+--------------------------------------------------------------------------------------------------------------+
|                                   ACCÈS ET RÔLES ET PERMISSIONS                                               |
+--------------------------------------------------------------------------------------------------------------+
|  +----------------------------+  +------------------------------+  +--------------------------+             |
|  | Super Admin                |  | Responsable Département      |  | Gestionnaire             |             |
|  | Accès global, toutes régions|  | Dashboards, paramètres       |  | Traitement des dossiers   |             |
|  +----------------------------+  +------------------------------+  +--------------------------+             |
|  | Responsable équipe Santé   |  | Accès aux indicateurs temps  |  | Traitement opérationnel |             |
|  +----------------------------+  +------------------------------+  +--------------------------+             |
+--------------------------------------------------------------------------------------------------------------+

Notes:
- La communication entre modules se fait via notifications automatisées, API, ou workflows.
- La traçabilité complète est assurée par le module GED/GEC, le suivi en temps réel, et l’historique.
- La plateforme intègre l’analyse IA pour recommandations, affectations, prédictions.

---
Voici un résumé précis du flux lié au traitement des bordereaux (bordereaux de soins - BS) et leur gestion par le Bureau d’Ordre (BO), le service SCAN, les chefs d’équipe et les gestionnaires, en se concentrant sur leurs rôles et interactions :

1. Bureau d’Ordre (BO) :

- Le traitement commence toujours ici.

- Le BO saisit dans le système les informations liées au dossier physique reçu :

- Type de fichier (ex. BS, adhésion, contrat…)

- Nombre de fichiers reçus

- Référence du bordereau (identifiant unique)

- Délais contractuels de règlement

- Chargé de compte en charge du dossier

- La majorité de ces données proviennent du module client, qui contient le profil du client, ses délais, etc.

- Dès que les données sont saisies, une notification automatique est envoyée au service SCAN pour lancer la numérisation.

2. Service SCAN :

- Reçoit la notification du BO.

- Procède à la numérisation des bordereaux (BS) :

- La numérisation de chaque dossier est réalisée, puis le dossier est enregistré électroniquement.

- Les données sont indexées pour une recherche ultérieure.

- Le statut du dossier devient « scanné ».

- Automatiquement, le dossier est affecté au chef d’équipe correspondant, selon le chargé de compte lié au dossier.

- Si l’équipe concernée est surcharge, une alerte est envoyée au Super Admin.

3. Chef d’Équipe :

- Reçoit les dossiers dans une corbeille globale comprenant :

- Dossiers traités

- Dossiers en cours

- Dossiers non affectés

- Il peut répartir les dossiers aux gestionnaires selon plusieurs critères :

- Par nombre (lot de dossiers)

- Par client

- Par type de dossier (ex. BS)

- La vue du tableau de bord indique :

- L’état d’avancement du traitement (statuts des bordereaux : Non scanné, Scan en cours, Scan finalisé)

- Les alertes en cas de surcharge ou de retard

- La performance des gestionnaires

- L’évolution de la performance par gestionnaire et période

4. Gestionnaire :

- Accède à sa corbeille personnelle contenant ses dossiers affectés.

- Peut :

- Consulter et traiter chaque dossier.

- Marquer le dossier comme «Traité».

- Renvoyer le dossier au chef d’équipe en cas de difficulté (notification automatique).

- Son tableau de bord lui permet de suivre :

- Le nombre total de dossiers affectés, traités, en cours, ou retournés.

- La répartition par client.

- Les urgences selon les délais contractuels.

Statut des Bordereaux (BS) :

- Non scanné

- Scan en cours

- Scan finalisé

Le suivi de l’avancement du traitement repose également sur la mise à jour automatique du pourcentage du bordereau en fonction du nombre de BS traités, rejetés ou en cours. Par exemple, si un bordereau contient 100 BS, avec 50 traités, 10 rejetés et 40 en cours, le statut sera « En cours », avec un taux d’achèvement de 60%. Lorsqu’all BS sont traités, le bordereau devient « totalement traité ».

Une partie clé de ce flux est l’automatisation et le suivi en temps réel, permettant la génération d’alertes et le maintien des performances via des indicateurs[ T1-T6].


Voici une synthèse précise des fonctionnalités, exigences, boutons et interactions concernant la gestion des bulletins de soins (BS), les bordereaux (bordeux), et la corbeille du chef d’équipe, basée sur les pages et descriptions fournies :

1. Gestion des Bordereaux (Bordereaux)

**Fonctionnalités et exigences :

- Statuts du bordereau :**

- Non scanné : le bordereau n’a pas encore été numérisé.

- Scan en cours : en phase de numérisation.

- Scan finalisé : numérisation complète, prêt pour traitement.

- Mise à jour automatique du statut :

- Le statut passe à « en cours » après début de numérisation.

- Lorsqu’on ajoute tous les BS ou quand tous sont scannés/rejetés, le statut devient « Finalisé » ou « en cours » selon l’état.

- Upload progressif :

- L’upload d’un même bordereau peut être effectué en plusieurs fois ; le système met à jour automatiquement le statut global lorsque tous les éléments sont traités.

- Suivi du traitement :

- Nombre total de BS dans le bordereau

- Nombre de BS traités, rejetés, en cours

- Taux d’avancement (ex. 60%)

Boutons et Actions utilisateur :

- Ajouter un fichier BS (bouton « Importer » ou « Télécharger »)

- Mettre à jour le statut manuellement si nécessaire

- Visualiser le détail des BS (double clic, bouton « Détails »)

- Rejeter un BS spécifique (bouton « Rejeter »)

- Marquer le bordereau comme « Finalisé » ou « En cours » (automatiquement ou manuellement)

- Voir le résumé / pourcentage d’avancement

2. Bulletins de soins (BS)

Fonctionnalités et exigences :

- Prendre en charge le traitement par BS individuel.

- Visualiser l’état d’avancement de chaque BS : traité, rejeté, en cours.

- Rejeter ou valider chaque BS.

- Lier chaque BS au bordereau correspondant.

Boutons et Actions :

- Marquer comme traité / validé

- Rejeter (avec justification)

- Afficher contexte / détails du BS (ligne ou fiche individuelle)

- Voir la date et le statut

3. Corbeille du Chef d’Équipe (vue globale des dossiers)

Fonctionnalités :

- Affichage global avec filtre par statut, date, équipe, client.

- Trier et filtrer les dossiers :

- Par état (traités, en cours, non traités)

- Par date de réception ou de traitement

- Par équipe / gestionnaire / client

- Indicateurs en temps réel :

- Nombre de dossiers dans chaque état

- Dossier critique ou en retard

- Taux d’achèvement (en %) du bordereau global ou individuel

Boutons et interactions :

- Ouvrir/Visualiser le contenu du bordereau ou dossier (bouton « Détails » ou clic double)

- Attribuer ou répartir manuel ou automatique les dossiers

- Mettre à jour l’état du bordereau (ex. « Finalisé »)

- Filtrer selon différents critères (date, équipe, client, statut)

- Boutons pour assigner ou reassigner des dossiers

- Bouton « Exporter » (pour exporter le tableau en Excel ou PDF)

Résumé :

Le processus repose sur une interface intuitive permettant :

- L’import, le suivi, et la mise à jour du statut des bordereaux (avec boutons « Importer », « Rejet », « Finaliser »).

- La visualisation et gestion des BS individuels avec actions « Marquer comme traité » ou « Rejeter ».

- La gestion de la corbeille du chef d’équipe avec filtres dynamiques, boutons pour l’ouverture des détails, personnalisation de la répartition, et exportation des données.
Voici un exemple précis de maquette d’interface pour la gestion des bordereaux et bulletins de soins, ainsi que la liste exhaustive de tous les boutons disponibles pour l'utilisateur, basée sur les exigences fonctionnelles décrites.

Exemple de Maquette d’Interface

1. Écran Principal – Tableau de Bord des Bordereaux

Section :

- Affichage sous forme de tableau avec colonnes :

- Numéro de Bordereau

- Date d’Injection

- Statut (Non scanné / Scan en cours / Scan finalisé)

- Nombre total de BS

- BS traités

- BS rejetés

- BS en cours

- Taux d’achèvement (%)

- Actions (boutons)

Filtres :

- Par statut

- Par date (de / à)

- Par équipe / gestionnaire

- Par client

Boutons principaux :

- « Importer un Bordereau » (pour commencer le téléchargement de nouveaux fichiers)

- « Exporter la liste » (Excel/PDF)

- « Actualiser » (rafraîchir la vue)

2. Détail d’un Bordereau (ouverture en cliquant sur le numéro)

Section :

- Informations globales :

- Numéro bordereau

- Date d’injection

- Statut (Non scanné / En cours / Finalisé)

- Nombre total de BS

- % d’avancement

- Liste des BS (tableau avec colonnes) :

- Référence (n° BS)

- Nom du patient ou référence dossier

- Statut (Traité, Rejeté, En cours)

- Date de traitement

- Actions (boutons)

Boutons spécifiques pour le bordereau :

- « Télécharger une autre partie » (pour uploader des BS en plusieurs fois)

- « Marquer comme Finalisé » (pour changer le statut une fois le traitement terminé)

- « Rejeter un BS » (bouton dans chaque ligne)

- « Reprendre la numérisation » (si en cours et besoin de réimporter)

- « Supprimer le bordereau » (pour suppression, si autorisé)

3. Gestion des Bulletins de Soins (BS)

Dans la vue du bordereau, chaque ligne représente un BS avec boutons :

- « Marquer comme Traité »

- « Rejeter » (une fois cliqué, une fenêtre demande la justification)

- « Voir Détails » (pour voir ou éditer le BS)

- « Supprimer » (si applicable)

4. Vue de la Corbeille du Chef d’Équipe

Tableau global montrant tous les dossiers/bordereaux destinés à la gestion :

- Colonnes principales :

- Numéro dossier/bordereau

- Client

- Équipe / Gestionnaire

- Statut (En attente, Traité, Rejeté, En cours)

- Date de réception

- Date prévue de traitement

- % d’achèvement

- Actions

Boutons et actions dans chaque ligne :

- « Visualiser le détail »

- « Affecter à un gestionnaire »

- « Re-assigner »

- « Marquer comme en retard »

- « Exporter la sélection »

Filtres et boutons en haut :

- « Filtrer par statut »

- « Filtrer par équipe »

- « Filtrer par client »

- « Recharger » (actualiser la vue)

- « Exporter la liste » (Excel, PDF)

Résumé des boutons clés disponibles

ActionDescriptionContexte d’utilisationImporter un BordereauCharger un nouveau fichier ou set de BSSur la vue liste des bordereauxExporter la listeExporter en Excel ou PDFSur la liste ou tableau globalActualiserRafraîchir la vuePartoutMarquer comme FinaliséMettre à jour le statut de bordereauAprès traitement completRejeter BS / Rejeter BordereauSignaler une erreur ou rejetLors de la validation ou correctionMarquer comme TraitéConfirmer le traitement du BSLors de validation individuelleVoir DétailsVisualiser ou éditer le contenuSur la liste ou dans détailsSupprimerEffacer un bordereau ou BSSi nécessaire (administration)Re-assignerModifier l’affectation gestionnaireDans la corbeille ou détailFiltrerAppliquer des filtres avancésSur l’ensemble des vues

Conclusion

Ce scénario de maquette propose une interface claire et intuitive pour gérer toutes les étapes : importation, suivi, validation, rejet, et reporting. Simultanément, chaque bouton est associé à un processus précis pour assurer une gestion fluide et efficace.



*************


# 📋 Cahier des Charges Complet – Application ARS Tunisie

## 🎯 Objectifs Globaux

* Suivi **en temps réel** des opérations internes.
* Détection des retards / non-respect contractuel.
* **Affectation intelligente** des BS (Bulletins de soins) et bordereaux (IA + règles).
* Gestion automatisée des **réclamations**.
* Suivi et confirmation des **virements financiers**.
* Digitalisation via **GED** (documents) et **GEC** (courrier).
* **Reporting multi-niveaux** (KPI, performance, SLA).
* **Tableaux de bord dynamiques** adaptés par rôle et par équipe.

---

## 👤 Utilisateurs & Rôles

* **Administrateur** : accès total (paramétrage, supervision, reporting global).
* **Super Admin** : vision complète, réaffectation, export KPI, gestion des alertes.
* **Responsable de département / Chef d’équipe** : gestion et suivi de son équipe (corbeille globale, performance, alertes).
* **Gestionnaire** : accès uniquement aux dossiers affectés.
* **Bureau d’ordre (BO)** : saisie initiale lors de la réception physique.
* **Équipe Scan** : numérisation + indexation.
* **Service financier** : gestion et confirmation des virements.
* **Service client** : suivi des réclamations et historique.

---

## 🔑 Modules Fonctionnels & UI attendue

### 1. 📂 Gestion des Bordereaux

* **Flux :**

  1. Réception par client ou prestataire.
  2. Attribution automatique au contrat associé.
  3. Numérotation horodatée.
* **UI attendue :**

  * Formulaire de saisie rapide (type, nombre de BS, référence, délais, gestionnaire).
  * Liste avec filtres (date, client, prestataire, statut).
  * Notifications automatiques au service SCAN.

---

### 2. ⚖️ Paramétrage des Contrats

* Délais de traitement, réclamation, règlement.
* Seuils d’alerte & escalades automatiques.
* **UI attendue :**

  * Tableau centralisé listant tous les contrats.
  * Champs configurables : délais, SLA, tolérances.
  * Association auto avec bordereaux via règles prédéfinies.

---

### 3. 📑 GED (Gestion Électronique des Documents)

* Archivage sécurisé + indexation OCR.
* Recherche multicritères (client, date, mot-clé, statut).
* **UI attendue :**

  * Interface de recherche avancée.
  * Prévisualisation de documents scannés.
  * Statut dossier ("reçu", "scanné", "traité").
  * Flux automatisé depuis PaperStream → import auto → affectation → suivi.

---

### 4. ✉️ GEC (Gestion Électronique du Courrier)

* Courriers automatiques : règlement, réclamation, relance.
* Modèles configurables par type de demande.
* Archivage auto dans GED.
* **UI attendue :**

  * Générateur de modèles de courrier.
  * Workflow : génération → envoi → suivi.

---

### 5. 🧾 Réclamations

* Classification, traitement, suivi par GEC.
* Analyse IA : réclamations récurrentes, anomalies, corrélations.
* Réponses automatiques + notifications.
* **UI attendue :**

  * Tableau de suivi des réclamations (statut, type, client).
  * Alertes visuelles (icônes, code couleur).
  * Historique complet par réclamation.
  * Liens directs vers document/dossier concerné.

---

### 6. 🏦 Module Financier – Ordres de Virement (OV)

* **Étapes :**

  1. Sélection du donneur d’ordre (compte bancaire, format TXT associé).
  2. Import fichier Excel (matricules + montants).
  3. Vérification (matricule, RIB, doublons, anomalies).
  4. Génération : PDF (détail + total) + TXT (format banque).
  5. Archivage complet (date, utilisateur, montant, fichiers).
  6. Suivi financier : confirmation ou rejet.
  7. Alertes automatiques si non-traité sous 24h.
* **UI attendue :**

  * Formulaire d’import + validation anomalies.
  * Tableaux de bord financiers (filtrable par société, statut, date).
  * État virement : ✅ exécuté / ⏳ en cours / ❌ rejeté.
  * Codes couleur + filtres + export Excel/PDF.

---

### 7. 📊 Tableaux de Bord & Reporting

* Vue analytique **par client, équipe, période**.
* KPI : SLA respectés, rendement, taux de rejet, retards.
* Graphiques temps réel.
* **UI attendue :**

  * Dashboards dynamiques avec filtres.
  * Code couleur : 🟢 SLA respecté / 🟠 Risque / 🔴 Dépassement.
  * Export dynamique en Excel ou PDF.

---

### 8. ⚙️ Intelligence Opérationnelle (IA)

* Affectation intelligente (rendement, dispo, complexité).
* Prévisions de charge (par client / volume).
* Estimation gestionnaires requis.
* **UI attendue :**

  * Suggestions affichées sur dashboard chef d’équipe.
  * Classement prioritaire des dossiers.

---

### 9. 🚨 Gestion des Alertes

* Détection des retards → notifications automatiques.
* Système de codes couleur.
* Relances vers clients/prestataires.
* **UI attendue :**

  * Popups / bannières d’alerte.
  * Notifications email + internes.
  * Historique des alertes.

---

## 🏗️ Flux Global (GED & Processus Métier)

1. **Bureau d’ordre** → saisie (infos client, type, délai).
2. **Notification** → service SCAN.
3. **SCAN** → numérisation + indexation → statut "scanné".
4. **Chef d’équipe** → corbeille globale (traite/affecte dossiers).
5. **Gestionnaire** → corbeille perso → traite ou renvoie au chef.
6. **Super Admin** → vue complète + réaffectation + reporting.

---

👉 En résumé, l’application est pensée comme un **système centralisé, intelligent, automatisé et traçable**, avec une **UX claire** basée sur :

* **Corbeilles** (BO, scan, chef, gestionnaire).
* **Dashboards interactifs** (personnalisés par rôle).
* **Workflows automatisés** (notifications, affectations, alertes).
* **Exports & archivage** systématiques.

---

Descriptif détaillé du module “Ordre de Virement”
________________________________________
 But du module
Permettre de générer automatiquement les fichiers PDF et TXT de virement bancaire à partir de données Excel de remboursements, tout en s’appuyant sur une base de données déjà existante des sociétés clientes, et en ajoutant une base adhérents avec leur RIB par un donneur d’ordre sélectionné au début du processus.
________________________________________
Structure des données utilisées
1. Base des sociétés (déjà intégrée)
Cette base est existante dans l’application, elle contient :
•	L’identifiant unique de chaque société : Numéro de contrat
•	Le nom de la société
•	Ses coordonnées et autres informations de référence
 Toutes les opérations liées aux adhérents ou aux virements sont rattachées à une société existante.
________________________________________
2. Intégration de la base adhérents (à ajouter)
Une nouvelle base est intégrée dans l’application, permettant d’enregistrer tous les adhérents avec les champs suivants (Modifiable en cas de mise à jour RIB ou ajout Nv Adhérent en gardant la traçabilité de l’utulisateur qui a apporté la modification):
•	Matricule (unique dans chaque société)
•	Nom et prénom
•	Société de rattachement (via l’identifiant existant)
•	RIB (compte bancaire personnel)
•	Statut actif/inactif (optionnel)
 Règles de gestion importantes :
•	Le matricule ne peut pas être dupliqué pour une même société.
•	Le RIB est unique à un seul adhérent, sauf cas exceptionnels (compte partagé, compte familial, etc.).
•	Lors de l’ajout des adhérents :
o	Si un RIB existe déjà → alerte
o	Si un matricule existe déjà dans la même société → rejet de l’enregistrement


________________________________________
 3. Base des Donneurs d’ordre (à ajouter)
Cette base contient tous les comptes bancaires émetteurs utilisés pour les virements.
Chaque donneur d’ordre est défini par :
•	Un nom
•	Un RIB
•	Une banque
•	Une structure de fichier TXT associée (voir plus bas)
•	Un statut actif/inactif
 Lorsqu’on génère un virement, le donneur choisi détermine automatiquement :
•	Le compte bancaire utilisé
•	Le format technique du fichier TXT
________________________________________
 Processus complet étape par étape
________________________________________
Étape 0 : Intégration initiale
Avant tout traitement de remboursement :
•	La base des sociétés est déjà intégrée dans l’application.
•	On ajoute la base des adhérents (liée aux sociétés) avec RIBs.
•	On crée les donneurs d’ordre avec leurs comptes et formats.
 L’application est maintenant prête à gérer les virements.
________________________________________
 Étape 1 : Choix du donneur d’ordre
L’utilisateur sélectionne un donneur d’ordre :
•	Le nom de l’émetteur (ex : AMEN GROUP)
•	Le RIB utilisé pour l’émission
•	La banque associée
•	Le format TXT qui lui est associé (structure 1, 2, 3…)
 Ce choix est obligatoire avant d’aller plus loin. Il conditionne tout le traitement.

________________________________________
 Étape 2 : Importation du fichier Excel de remboursement
L’utilisateur importe un fichier Excel qui contient :
•	Le matricule de l’adhérent
•	Le(s) montant(s) de remboursement
 Le système traite automatiquement chaque ligne :
•	Vérifie que le matricule existe bien
•	Vérifie qu’il est lié à une société
•	Récupère le RIB de l’adhérent
•	Additionne les montants si un adhérent apparaît plusieurs fois
•	Signale les anomalies :
o	Matricule inconnu
o	Matricule dupliqué dans sa société
o	RIB manquant
o	RIB utilisé par un autre adhérent (sauf exception validée)
________________________________________
 Étape 3 : Affichage récapitulatif
L’interface affiche un tableau :
•	Nom de la société
•	Matricule adhérent
•	Nom et prénom de l’adhérent
•	RIB
•	Montant total à virer
•	Statut de chaque ligne (valide ou erreur)
L’utilisateur peut corriger, valider ou abandonner l’import.
________________________________________
Étape 4 : Génération du PDF
Le système génère un document PDF clair avec : (Le modèle est en PJ)
•	En-tête : nom du donneur d’ordre, son compte bancaire, sa banque
•	Liste des virements avec :
o	Société / Num contrat
o	Matricule
o	Nom et prénom
o	RIB
o	Montant total
•	Un total global en bas
•	La signature ou le tampon du donneur
•	La date d’émission
________________________________________
Étape 5 : Génération du fichier TXT
Le format du fichier TXT dépend du donneur sélectionné. ( à Priori 2 structures en PJ)
Exemples :
•	Structure 1 (Donneur 1) 
•	Structure 2 (Donneur 2) 
•	Structure 3 (Donneur 3) 
Le système applique automatiquement la bonne structure, et crée un fichier prêt à être envoyé à la banque.
________________________________________
Étape 6 : Historique et archivage
Tous les traitements sont enregistrés :
•	Nom du donneur utilisé
•	Date et heure
•	Nombre d’adhérents traités
•	Montant total
•	Fichiers générés (PDF, TXT)
•	Nom de l’utilisateur
L’utilisateur peut :
•	Revoir un ancien ordre de virement
•	Télécharger à nouveau les fichiers
•	Filtrer par société, date, donneur, etc.
________________________________________
Sous-module : Suivi des Virements
________________________________________
 Objectif
Assurer un suivi structuré, traçable et collaboratif de chaque virement entre :
•	L’équipe santé (qui initie le bordereau de remboursement),
•	et le service financier (qui exécute ou valide le virement bancaire).
________________________________________
 Fonctionnement global
1.	L’équipe santé injecte le fichier Excel de remboursements.
2.	Une notification automatique est envoyée au service financier.
3.	Le service financier consulte la demande, et renseigne l’état du virement.
4.	Chaque action est datée, commentée et archivée.
________________________________________
 Champs de suivi à enregistrer pour chaque virement
Champ	Rôle
Numéro de bordereau	Identifiant unique du lot de remboursement injecté
Société concernée	Rattachement du bordereau à une société cliente
Date d’injection	Date à laquelle l’équipe santé a initié le bordereau
Utilisateur santé	Nom de l’utilisateur ayant effectué l’injection
Date de traitement financier	Date à laquelle le service financier a traité le virement
Utilisateur financier	Nom de l’utilisateur ayant mis à jour l’état
État du virement	Liste déroulante avec les états possibles (voir ci-dessous)
Date de l’état final	Date à laquelle le virement a atteint son état final
Commentaire (optionnel)	Champ libre pour observations
________________________________________
 Liste des états du virement
Ces états sont choisis par le service financier via une liste déroulante :
1.	Virement non exécuté
Aucun virement n’a été lancé – blocage ou mise en attente.
2.	Virement en cours d'exécution
Le fichier a été envoyé à la banque, mais le retour n’a pas encore été reçu.
3.	Virement exécuté partiellement
Une partie seulement des virements a été acceptée (ex. : erreurs bancaires, rejet de RIB).
4.	Virement rejeté
L’ensemble du fichier a été rejeté par la banque – motif à expliquer.
5.	Virement exécuté
L’opération est terminée, tous les adhérents ont été payés.
________________________________________
 Système de notification
Dès que l’équipe santé injecte un bordereau :
•	Le service financier reçoit une alerte :
o	Par notification dans l’application
o	Et/ou par mail si activé
Exemple de message :
"Un nouveau bordereau de remboursement a été injecté par [Nom utilisateur] pour la société [Nom]. Merci de mettre à jour son état de virement."
________________________________________
 Historique et tableau de bord
Un tableau de suivi consultable permet de filtrer et suivre :
•	Tous les virements injectés
•	Leur état actuel
•	La date de traitement
•	Le responsable du traitement
•	Le donneur d’ordre utilisé
•	Le nombre d’adhérents et montant global
Avec des filtres :
•	Par société
•	Par date d’injection ou traitement
•	Par état
•	Par utilisateur santé / financier




*********

MODULES & PROCESS

Module 	Client			
				
Client	Compagnie D'assurances	Délais contractuels de Règlement	Délais de réponse réclamations	Copie du contrat Numérique
				
				
Module 	Bordereau			
				
DATA		
				
Client / Prestataire	 			
Référence Bordereau	 			
Date réception BO Bordereau	 			
Date début Scannérisation	 			
Date fin de Scannérisation	 			
Délais contractuels de règlement	 			
Date réception équipe Santé	 			
Date réelle de clôture bordereau	 			
Nombre de jour de traitement	 			
Date limite de traitement	 			
Nombre de BS	 			
Chargé de Compte	 			
Date dépôt Virement	 			
Date Exécution Virement	 			
				
				
Module 	Teams			
				
Services	1-Bureau d'ordre			
	2-SCAN			
	3-Santé			
	4-Finance			
				
3- Equipe Santé	Chef d'équipe			
	Gestionnaire			
	Equipe Production			
	Equipe Tiers Payant			


				
Module 	GED / GEC			
				
Accès : 	Equipe Scan			
	Responsable d'équipe			
	Gestionnaires			
	Super Admin			

Processus GED – Circuit réel de traitement
1. Bureau d’Ordre (BO)
Le traitement démarre systématiquement par le Bureau d’Ordre, qui a un accès au système lui permettant d’introduire manuellement les données suivantes lors de la réception physique des dossiers :
•	Type de fichier reçu (BS, adhésion, contrat…)
•	Nombre de fichiers reçus
•	Référence du bordereau
•	Délais contractuels de règlement
•	Gestionnaire en charge du dossier
Ces éléments sont en grande partie prédéfinis via le module client, qui contient :
•	Le profil du client (compagnie d’assurances)
•	Les délais contractuels de règlement
•	Les délais de réponse aux réclamations
•	Le chargé de compte associé
Une fois les informations saisies, une notification est automatiquement déclenchée vers le service SCAN pour débuter les travaux de numérisation.
________________________________________
2.  Service SCAN
Le service SCAN reçoit la notification et entame la numérisation des bordereaux reçus.
Une fois le dossier scanné :
•	Il est enregistré électroniquement
•	L’indexation est effectuée
•	Le statut du dossier est mis à jour en “scanné”
L’affectation est ensuite automatique aux chefs d’équipe concernés, selon le chargé de compte rattaché au dossier.
Si l’équipe du chef concerné est surchargée, une notification automatique est envoyée au Super Admin.
________________________________________
3.  Chef d’Équipe
Les chefs d’équipe reçoivent les dossiers dans une corbeille globale, composée de trois parties :
•	Dossiers traités
•	Dossiers en cours
•	Dossiers non affectés
Cette corbeille globale lui donne une visibilité complète sur tous les dossiers reçus.
Le chef peut ensuite sélectionner les dossiers à affecter aux gestionnaires, selon plusieurs critères :
•	Par nombre (lot de dossiers)
•	Par client
•	Par type de dossier/fichier
Le chef d’équipe dispose également :
•	D’un tableau de bord affichant :
o	L’état d’avancement du traitement
o	Des alertes en cas de surcharge de travail
o	La performance des gestionnaires
o	L’évolution de la performance par gestionnaire et par période
________________________________________
4. Gestionnaire
Chaque gestionnaire a une corbeille personnelle dans laquelle il retrouve les dossiers qui lui ont été affectés par son chef d’équipe.
Le gestionnaire peut :
•	Consulter le dossier
•	Traiter le dossier via l’outil de gestion
•	Marquer le dossier comme :
o	Traité
o	Ou le renvoyer vers la corbeille du chef d’équipe en cas de difficulté de traitement
 Le chef d’équipe reçoit une notification automatique si un retour est effectué.
Le gestionnaire dispose d’un tableau de bord personnel lui permettant de suivre :
•	Le nombre de dossiers qui lui sont affectés
•	Le nombre de dossiers traités, en cours ou retournés
•	Les dossiers par client
•	Les urgences selon les délais de règlement contractuels
________________________________________
5.  Super Admin
Le Super Admin a une vue complète sur tout le processus, avec accès à tous les dashboards suivants :
•	Performance des équipes :
o	BO
o	SCAN
o	Santé (chefs d’équipe et gestionnaires)
•	Suivi par période
•	Qualité et quantité des prestations traitées
•	Suivi des retards
•	Dossiers en instance ou retournés
•	Alertes en cas de surcharge d'une équipe
 
 
•	Exemple Accés Scan
  

•	TABLEAU DE BORD CHEF D'EQUIPE
 
•	CORBEILLE CHEF D'EQUIPE
 

•	TABLEAU DE BORD GESTIONNAIRE
 


•	CORBEILLE GESTIONNAIRE 
•	TAG DOSSIER PAR GESTIONNAIRE
 


•	TABLEAU DE BORD SUPER ADMIN

  

 
Processus de Gestion Électronique des Documents (GED) – Circuit Réel de Traitement
La mise en œuvre de la GED repose sur un processus structuré, séquencé et automatisé, reflétant le parcours réel des dossiers depuis leur réception physique jusqu’à leur traitement final. Le processus implique cinq acteurs principaux, chacun avec un rôle et des outils dédiés, garantissant une traçabilité complète, une réactivité accrue et une performance mesurable.
________________________________________
1. Bureau d’Ordre (BO)
Le point d’entrée du processus GED est systématiquement le Bureau d’Ordre, chargé de réceptionner physiquement les dossiers transmis par les clients (compagnies d’assurance, partenaires, ou courtiers).
Dès réception, le BO procède à l’enregistrement initial dans le système, via une interface dédiée qui permet d’introduire les informations suivantes :
•	Type de fichier reçu : bulletin de soins (BS), dossier d’adhésion, avenant contrat, courrier, réclamation, etc.
•	Nombre de fichiers ou documents reçus 
•	Référence du bordereau, utilisée comme identifiant unique dans tout le processus
•	Délais contractuels de traitement et de règlement automatiquement renseigné selon les règles prédéfinies
•	Nom du gestionnaire désigné, automatiquement renseigné selon les règles prédéfinies
Le système est relié à un module client, qui centralise les paramètres propres à chaque compagnie d’assurance ou client. Ce module contient notamment :
•	Le profil client avec ses spécificités
•	Les délais contractuels de règlement
•	Les délais de réponse aux réclamations
•	Le chargé de compte attitré, servant de référent tout au long du traitement
Une fois ces informations saisies, une notification automatique est envoyée au service SCAN, déclenchant ainsi le passage à l’étape suivante.
________________________________________
2. Service SCAN
Le service SCAN, composé d’opérateurs équipés de scanners à reconnaissance optique (OCR), est chargé de la dématérialisation complète des dossiers reçus.
Dès réception de la notification du BO, le service :
•	Scanne les documents physiques reçus
•	Enregistre électroniquement les fichiers dans le système GED avec les métadonnées associées
•	Indexe automatiquement chaque fichier à l’aide des données saisies (type de dossier, numéro de bordereau, client, date de réception…)
•	Met à jour le statut du dossier en « scanné »
L’outil GED intègre un système d’affectation automatique des dossiers scannés vers les chefs d’équipe selon le chargé de compte client ou les paramètres du profil client.
En cas de surcharge détectée dans une équipe (par exemple, nombre excessif de dossiers non traités), une alerte automatique est transmise au Super Admin pour une éventuelle réaffectation ou prise de décision.
________________________________________
3. Chefs d’Équipe
Chaque chef d’équipe dispose d’une corbeille globale accessible via son tableau de bord, divisée en trois sections claires :
•	Dossiers traités
•	Dossiers en cours de traitement
•	Dossiers non encore affectés aux gestionnaires
Cette vue centralisée lui permet d’avoir un contrôle total sur la charge de travail de son équipe. Il peut ensuite affecter les dossiers aux gestionnaires selon plusieurs critères :
•	Par lot (nombre de dossiers)
•	Par client (compagnie ou courtier)
•	Par type de dossier (BS, réclamation, etc.)
Chaque chef d’équipe bénéficie également d’un tableau de bord interactif qui lui fournit :
•	L’état d’avancement du traitement des dossiers par gestionnaire
•	Des alertes en cas de surcharge ou de non-respect des délais
•	Des statistiques de performance de chaque membre de l’équipe
•	L’évolution de la productivité par période (jour/semaine/mois)
________________________________________
4. Gestionnaires
Les gestionnaires accèdent uniquement aux dossiers qui leur ont été explicitement affectés par leur chef d’équipe, via une corbeille personnelle. Cette corbeille permet de classer et de visualiser facilement les dossiers par statut :
•	En cours
•	Traités
•	Retournés (si renvoyés au chef pour anomalie ou impossibilité de traitement)
	Le Chef d’équipe dispose aussi de cette fonctionnalité.
Les actions disponibles pour chaque gestionnaire sont les suivantes :
•	Consultation complète du dossier numérisé
•	Marquage du dossier comme :
o	Traité
o	Mis en instance
o	Rejeté
o	Renvoyé au chef d’équipe, ce qui déclenche automatiquement une notification pour que ce dernier intervienne.
Un tableau de bord individuel accompagne chaque gestionnaire, indiquant :
•	Le nombre de dossiers en attente, traités ou retournés
•	La répartition par client
•	Les alertes selon les délais de traitement
•	Un suivi de performance personnelle par période
________________________________________
5. Super Admin
Le Super Admin est le superviseur global du système, avec des droits d’accès complets et une vue transversale sur l’ensemble du circuit GED.
Il peut consulter tous les tableaux de bord consolidés, incluant :
•	La performance de chaque équipe :
o	Bureau d’Ordre (saisie initiale)
o	SCAN (dématérialisation)
o	Santé (chefs d’équipe et gestionnaires)
•	Un suivi chronologique par période
•	Des indicateurs sur la qualité et quantité des prestations traitées
•	Un état des dossiers en retard, en instance ou retournés
•	Des alertes automatiques en cas de surcharge ou de non-conformité
Il peut également réaffecter les dossiers, débloquer les situations complexes, ou encore exporter des rapports de performance à usage interne ou externe.


📄 Schéma du Processus GED – Circuit Réel de Traitement
1. 📥 Bureau d’Ordre (BO)
   ├── Réception physique du dossier
   ├── Saisie dans le système :
   │    ├── Type de fichier reçu
   │    ├── Nombre de fichiers
   │    ├── Référence du bordereau
   │    ├── Délais contractuels
   │    └── Gestionnaire en charge (via profil client)
   ├── Accès au module client :
   │    ├── Profil client
   │    ├── Délais de règlement / réclamation
   │    └── Chargé de compte associé
   └── 🔔 Notification automatique → Service SCAN

2. 🖨️ Service SCAN
   ├── Réception de la notification
   ├── Numérisation (avec OCR si disponible)
   ├── Enregistrement électronique des fichiers
   ├── Indexation des documents :
   │    └── Métadonnées : type, référence, client, date...
   ├── Statut dossier = "scanné"
   ├── 📤 Affectation automatique → Chef d’équipe (par chargé de compte)
   └── ⚠️ Si surcharge → Alerte automatique → Super Admin

3. 👨‍💼 Chef d’Équipe
   ├── Accès à une corbeille globale :
   │    ├── Traités
   │    ├── En cours
   │    └── Non affectés
   ├── Critères d’affectation :
   │    ├── Par lot
   │    ├── Par client
   │    └── Par type de dossier
   ├── 📈 Tableau de bord du chef :
   │    ├── Suivi d’avancement
   │    ├── Alerte surcharge
   │    ├── Performance individuelle des gestionnaires
   │    └── Historique par période
   └── Affectation manuelle / automatique → Gestionnaire

4. 👩‍💻 Gestionnaire
   ├── Accès à une corbeille personnelle :
   │
   │    ├── En cours
   │    ├── Traités
   │    └── Retournés
   ├── Actions possibles :
   │    ├── Consulter le dossier
   │    ├── Traiter via outil métier
   │    ├── Marquer comme "Traité"
   │    └── Retour au chef d’équipe (🔔 Notification automatique)
   ├── 📊 Tableau de bord personnel :
   │    ├── Dossiers affectés / traités / retournés
   │    ├── Suivi par client
   │    └── Alertes selon les délais contractuels
   └── Historique des actions

5. 🧑‍💼 Super Admin
   ├── Vue complète sur tous les modules :
   │    ├── BO
   │    ├── SCAN
   │    └── Santé (chefs + gestionnaires)
   ├── Accès à tous les tableaux de bord :
   │    ├── Par période
   │    ├── Par type de traitement
   │    ├── Retards et anomalies
   │    └── Alertes de surcharge
   ├── Suivi des dossiers en instance ou retournés
   └── Actions possibles :
        ├── Réaffectation
        ├── Interventions manuelles
        └── Exports de rapports / KPI
*********************************


1. Bureau d’Ordre (BO)

Le traitement commence toujours ici.

Le BO saisit dans le système les informations liées au dossier reçu physiquement :

Type de fichier (BS, adhésion, contrat…)

Nombre de fichiers reçus

Référence du bordereau

Délais contractuels de règlement

Gestionnaire en charge du dossier
La majorité de ces informations proviennent déjà du module client, qui contient :

Profil du client (compagnie d’assurances)

Délais contractuels de règlement

Délais de réponse aux réclamations

Chargé de compte associé
Une fois les données saisies, une notification automatique est envoyée au service SCAN pour lancer la numérisation.
---
2. Service SCAN

Le service SCAN reçoit la notification et procède à la numérisation des bordereaux.

Après numérisation :

Le dossier est enregistré électroniquement

Les données sont indexées

Le statut du dossier passe à “scanné”
Ensuite, le dossier est affecté automatiquement au chef d’équipe correspondant, en fonction du chargé de compte.

Si l’équipe concernée est surchargée, une alerte est envoyée au Super Admin.
---

3. Chef d’Équipe

Le chef d’équipe reçoit les dossiers dans une corbeille globale, qui comprend :

Dossiers traités

Dossiers en cours

Dossiers non affectés
Cette corbeille lui donne une vision complète de tous les dossiers.
Il peut ensuite affecter les dossiers aux gestionnaires selon plusieurs critères :

Par nombre (lots de dossiers)

Par client

Par type de dossier/fichier
Le chef d’équipe dispose aussi d’un tableau de bord qui affiche :

L’état d’avancement du traitement

Les alertes en cas de surcharge

La performance des gestionnaires

L’évolution de la performance par gestionnaire et par période
4. Gestionnaire

Chaque gestionnaire a une corbeille personnelle avec les dossiers affectés par son chef.

Ses actions possibles :

Consulter et traiter le dossier dans l’outil de gestion

Marquer le dossier comme “Traité”

Ou le renvoyer au chef d’équipe en cas de difficulté (ce dernier reçoit une notification automatique)
Le gestionnaire a aussi un tableau de bord personnel qui lui permet de suivre :

Le nombre total de dossiers qui lui sont affectés

Les dossiers traités, en cours ou retournés

La répartition des dossiers par client

Les urgences à traiter en fonction des délais contractuels

Résumé rapide :

1. BO → saisit les infos et envoie au SCAN.


2. SCAN → numérise, enregistre et affecte automatiquement.


3. Chef d’équipe → répartit les dossiers et suit les performances.


4. Gestionnaire → traite ou renvoie les dossiers, tout en suivant son tableau de bord.



Perfect — let’s deep-dive. I went back to your cahier de charge notes and here’s what is **literally specified** about the **BO module** and the **SCAN service module**.

---

## 📌 Back Office (BO) Module

* The **BO operator** is the **first entry point** of the workflow.
* **What the BO does:**

  1. **Register incoming dossier** with metadata: type, reference, deadlines, etc.
  2. Once saved, the dossier is visible in the system.
  3. A **notification is automatically sent to the SCAN service** that a new document needs to be digitized.

👉 **Key point:** BO does not scan, it just registers and forwards.

---

## 📌 SCAN Service Module

* The **SCAN operator** receives the notification from BO.
* **What the SCAN does:**

  1. Takes the **physical paper document**.
  2. **Digitizes** it (via scanner → PDF/image).
  3. **Uploads the scanned file** into the system.
  4. **Indexes** it (attach the scanned file to the correct dossier created by BO).
  5. Marks the dossier as **“Scanned”**.
* Once marked as scanned, the system **automatically transfers** the dossier to the **Team Leader** for assignment.

👉 **Key point:** Scanning is not optional. The cahier de charge requires **digital copies to be uploaded** (compliance with GED).

---

## 📌 Lifecycle Flow (as required)

1. **BO creates dossier** → enters metadata.
2. System sends **notification** → SCAN service.
3. **SCAN service digitizes + uploads** scanned file.
4. System changes status → “Scanned”.
5. System forwards dossier → Team Leader.
6. Team Leader assigns to a Gestionnaire.

---

## 📌 ASCII Diagram

```
 ┌─────────────┐       ┌──────────────────┐        ┌────────────────────┐
 │   BO User   │       │   SCAN Service   │        │    Team Leader     │
 └─────┬───────┘       └─────────┬────────┘        └─────────┬─────────┘
       │                         │                           │
       │ 1. Register dossier     │                           │
       │ (type, ref, deadline)   │                           │
       ▼                         │                           │
 ┌─────────────────────────────────────┐                    │
 │   System: Create record in DB       │                    │
 │   Status = "Registered (BO)"        │                    │
 │   Notify SCAN service               │                    │
 └─────────────────────────────────────┘                    │
                               │                           │
                               │ 2. Receive notification   │
                               ▼                           │
                   ┌────────────────────────────┐          │
                   │  Upload scanned document   │          │
                   │  Index & validate scan     │          │
                   └───────────┬────────────────┘          │
                               │ 3. Mark as "Scanned"      │
                               ▼                           │
                 ┌────────────────────────────────┐        │
                 │ System: Status = "Scanned"     │        │
                 │ Notify Team Leader             │        │
                 └────────────────────────────────┘        │
                                                           │
                                                           │ 4. Assign dossier
                                                           ▼
                                               ┌────────────────────────────┐
                                               │ Gestionnaire receives case │
                                               └────────────────────────────┘
```

---

## 📌 What they **literally want**

* BO **must have a form** to register the dossier.
* BO **must trigger automatic notification** to SCAN.
* SCAN service **must upload the scanned file** (PDF/image).
* SCAN service **must validate** (button) so the status changes to “Scanned”.
* System **must automatically route** to Team Leader after scan.
* **Lifecycle status** must always be visible (Registered → Scanned → Assigned → …).

---

✅ So to answer you directly:

* No, they do **not** want a completely manual scan (just clicking without file).
* They **do want** a **manual validation step** (“Validate scan”) but only **after uploading the digital file**.
* They expect the BO and SCAN modules to work **exactly in this chained workflow**, with automatic notifications and lifecycle tracking.

---


Yes 👍 you understood it correctly. Let me restate based on the cahier de charge so it’s crystal clear:

---

## 📌 After the SCAN step → **Chef d’équipe (Team Leader)**

* Once the document is scanned and indexed, the **system forwards it to the Chef d’équipe**.
* The Chef d’équipe then has **decision-making power** over what happens next.

### 🔹 Actions available to the Team Leader

1. **Reject (Rejeter)**

   * If the document is incomplete, invalid, or irrelevant.
   * The status changes to **“Rejected”** and the workflow stops (or sends it back for correction depending on rules).

2. **Assign to a Gestionnaire**

   * The Team Leader picks a **Gestionnaire** from their team.
   * The dossier is **routed to that Gestionnaire** with a notification.
   * Status changes to **“Assigned”**.

3. **Treat it personally**

   * The Team Leader decides to handle the dossier himself.
   * Status changes to **“In Progress (Chef)”**.

---

## 📌 ASCII Flow (from SCAN → Team Leader → Gestionnaire)

```
        ┌───────────────────┐
        │   Scanned File    │
        └─────────┬─────────┘
                  │
                  ▼
       ┌───────────────────────┐
       │   Team Leader (Chef)  │
       └─────────┬─────────────┘
                 │
   ┌─────────────┼──────────────────────────┐
   │             │                          │
   ▼             ▼                          ▼
┌───────┐   ┌─────────────┐          ┌─────────────┐
│Reject │   │ Assign to   │          │ Treat by    │
│Case   │   │ Gestionnaire│          │ Team Leader │
└───────┘   └───────┬─────┘          └─────────────┘
                    │
                    ▼
             ┌───────────────┐
             │ Gestionnaire  │
             │ works on case │
             └───────────────┘
```

---

## 📌 What they **literally want** at this stage

* **Team Leader dashboard** listing all scanned cases waiting for decision.
* For each case → **3 action buttons**:

  * ❌ Reject
  * 👤 Assign to Gestionnaire (dropdown to select one)
  * ✍️ Treat personally
* The system must **update the lifecycle status** accordingly:

  * “Rejected”
  * “Assigned to Gestionnaire \[Name]”
  * “In Progress (Chef)”

---

✅ So yes, you’re correct:

* The Chef d’équipe is the **gatekeeper** after SCAN.
* He can reject, delegate, or self-assign.

---

Descriptif détaillé du module “Ordre de Virement”
________________________________________
 But du module
Permettre de générer automatiquement les fichiers PDF et TXT de virement bancaire à partir de données Excel de remboursements, tout en s’appuyant sur une base de données déjà existante des sociétés clientes, et en ajoutant une base adhérents avec leur RIB par un donneur d’ordre sélectionné au début du processus.
________________________________________
Structure des données utilisées
1. Base des sociétés (déjà intégrée)
Cette base est existante dans l’application, elle contient :
•	L’identifiant unique de chaque société : Numéro de contrat
•	Le nom de la société
•	Ses coordonnées et autres informations de référence
 Toutes les opérations liées aux adhérents ou aux virements sont rattachées à une société existante.
________________________________________
2. Intégration de la base adhérents (à ajouter)
Une nouvelle base est intégrée dans l’application, permettant d’enregistrer tous les adhérents avec les champs suivants (Modifiable en cas de mise à jour RIB ou ajout Nv Adhérent en gardant la traçabilité de l’utulisateur qui a apporté la modification):
•	Matricule (unique dans chaque société)
•	Nom et prénom
•	Société de rattachement (via l’identifiant existant)
•	RIB (compte bancaire personnel)
•	Statut actif/inactif (optionnel)
 Règles de gestion importantes :
•	Le matricule ne peut pas être dupliqué pour une même société.
•	Le RIB est unique à un seul adhérent, sauf cas exceptionnels (compte partagé, compte familial, etc.).
•	Lors de l’ajout des adhérents :
o	Si un RIB existe déjà → alerte
o	Si un matricule existe déjà dans la même société → rejet de l’enregistrement


________________________________________
 3. Base des Donneurs d’ordre (à ajouter)
Cette base contient tous les comptes bancaires émetteurs utilisés pour les virements.
Chaque donneur d’ordre est défini par :
•	Un nom
•	Un RIB
•	Une banque
•	Une structure de fichier TXT associée (voir plus bas)
•	Un statut actif/inactif
 Lorsqu’on génère un virement, le donneur choisi détermine automatiquement :
•	Le compte bancaire utilisé
•	Le format technique du fichier TXT
________________________________________
 Processus complet étape par étape
________________________________________
Étape 0 : Intégration initiale
Avant tout traitement de remboursement :
•	La base des sociétés est déjà intégrée dans l’application.
•	On ajoute la base des adhérents (liée aux sociétés) avec RIBs.
•	On crée les donneurs d’ordre avec leurs comptes et formats.
 L’application est maintenant prête à gérer les virements.
________________________________________
 Étape 1 : Choix du donneur d’ordre
L’utilisateur sélectionne un donneur d’ordre :
•	Le nom de l’émetteur (ex : AMEN GROUP)
•	Le RIB utilisé pour l’émission
•	La banque associée
•	Le format TXT qui lui est associé (structure 1, 2, 3…)
 Ce choix est obligatoire avant d’aller plus loin. Il conditionne tout le traitement.

________________________________________
 Étape 2 : Importation du fichier Excel de remboursement
L’utilisateur importe un fichier Excel qui contient :
•	Le matricule de l’adhérent
•	Le(s) montant(s) de remboursement
 Le système traite automatiquement chaque ligne :
•	Vérifie que le matricule existe bien
•	Vérifie qu’il est lié à une société
•	Récupère le RIB de l’adhérent
•	Additionne les montants si un adhérent apparaît plusieurs fois
•	Signale les anomalies :
o	Matricule inconnu
o	Matricule dupliqué dans sa société
o	RIB manquant
o	RIB utilisé par un autre adhérent (sauf exception validée)
________________________________________
 Étape 3 : Affichage récapitulatif
L’interface affiche un tableau :
•	Nom de la société
•	Matricule adhérent
•	Nom et prénom de l’adhérent
•	RIB
•	Montant total à virer
•	Statut de chaque ligne (valide ou erreur)
L’utilisateur peut corriger, valider ou abandonner l’import.
________________________________________
Étape 4 : Génération du PDF
Le système génère un document PDF clair avec : (Le modèle est en PJ)
•	En-tête : nom du donneur d’ordre, son compte bancaire, sa banque
•	Liste des virements avec :
o	Société / Num contrat
o	Matricule
o	Nom et prénom
o	RIB
o	Montant total
•	Un total global en bas
•	La signature ou le tampon du donneur
•	La date d’émission
________________________________________
Étape 5 : Génération du fichier TXT
Le format du fichier TXT dépend du donneur sélectionné. ( à Priori 2 structures en PJ)
Exemples :
•	Structure 1 (Donneur 1) 
•	Structure 2 (Donneur 2) 
•	Structure 3 (Donneur 3) 
Le système applique automatiquement la bonne structure, et crée un fichier prêt à être envoyé à la banque.
________________________________________
Étape 6 : Historique et archivage
Tous les traitements sont enregistrés :
•	Nom du donneur utilisé
•	Date et heure
•	Nombre d’adhérents traités
•	Montant total
•	Fichiers générés (PDF, TXT)
•	Nom de l’utilisateur
L’utilisateur peut :
•	Revoir un ancien ordre de virement
•	Télécharger à nouveau les fichiers
•	Filtrer par société, date, donneur, etc.
________________________________________
Sous-module : Suivi des Virements
________________________________________
 Objectif
Assurer un suivi structuré, traçable et collaboratif de chaque virement entre :
•	L’équipe santé (qui initie le bordereau de remboursement),
•	et le service financier (qui exécute ou valide le virement bancaire).
________________________________________
 Fonctionnement global
1.	L’équipe santé injecte le fichier Excel de remboursements.
2.	Une notification automatique est envoyée au service financier.
3.	Le service financier consulte la demande, et renseigne l’état du virement.
4.	Chaque action est datée, commentée et archivée.
________________________________________
 Champs de suivi à enregistrer pour chaque virement
Champ	Rôle
Numéro de bordereau	Identifiant unique du lot de remboursement injecté
Société concernée	Rattachement du bordereau à une société cliente
Date d’injection	Date à laquelle l’équipe santé a initié le bordereau
Utilisateur santé	Nom de l’utilisateur ayant effectué l’injection
Date de traitement financier	Date à laquelle le service financier a traité le virement
Utilisateur financier	Nom de l’utilisateur ayant mis à jour l’état
État du virement	Liste déroulante avec les états possibles (voir ci-dessous)
Date de l’état final	Date à laquelle le virement a atteint son état final
Commentaire (optionnel)	Champ libre pour observations
________________________________________
 Liste des états du virement
Ces états sont choisis par le service financier via une liste déroulante :
1.	Virement non exécuté
Aucun virement n’a été lancé – blocage ou mise en attente.
2.	Virement en cours d'exécution
Le fichier a été envoyé à la banque, mais le retour n’a pas encore été reçu.
3.	Virement exécuté partiellement
Une partie seulement des virements a été acceptée (ex. : erreurs bancaires, rejet de RIB).
4.	Virement rejeté
L’ensemble du fichier a été rejeté par la banque – motif à expliquer.
5.	Virement exécuté
L’opération est terminée, tous les adhérents ont été payés.
________________________________________
 Système de notification
Dès que l’équipe santé injecte un bordereau :
•	Le service financier reçoit une alerte :
o	Par notification dans l’application
o	Et/ou par mail si activé
Exemple de message :
"Un nouveau bordereau de remboursement a été injecté par [Nom utilisateur] pour la société [Nom]. Merci de mettre à jour son état de virement."
________________________________________
 Historique et tableau de bord
Un tableau de suivi consultable permet de filtrer et suivre :
•	Tous les virements injectés
•	Leur état actuel
•	La date de traitement
•	Le responsable du traitement
•	Le donneur d’ordre utilisé
•	Le nombre d’adhérents et montant global
Avec des filtres :
•	Par société
•	Par date d’injection ou traitement
•	Par état
•	Par utilisateur santé / financier




*********

MODULES & PROCESS

Module 	Client			
				
Client	Compagnie D'assurances	Délais contractuels de Règlement	Délais de réponse réclamations	Copie du contrat Numérique
				
				
Module 	Bordereau			
				
DATA		
				
Client / Prestataire	 			
Référence Bordereau	 			
Date réception BO Bordereau	 			
Date début Scannérisation	 			
Date fin de Scannérisation	 			
Délais contractuels de règlement	 			
Date réception équipe Santé	 			
Date réelle de clôture bordereau	 			
Nombre de jour de traitement	 			
Date limite de traitement	 			
Nombre de BS	 			
Chargé de Compte	 			
Date dépôt Virement	 			
Date Exécution Virement	 			
				
				
Module 	Teams			
				
Services	1-Bureau d'ordre			
	2-SCAN			
	3-Santé			
	4-Finance			
				
3- Equipe Santé	Chef d'équipe			
	Gestionnaire			
	Equipe Production			
	Equipe Tiers Payant			


				
Module 	GED / GEC			
				
Accès : 	Equipe Scan			
	Responsable d'équipe			
	Gestionnaires			
	Super Admin			

Processus GED – Circuit réel de traitement
1. Bureau d’Ordre (BO)
Le traitement démarre systématiquement par le Bureau d’Ordre, qui a un accès au système lui permettant d’introduire manuellement les données suivantes lors de la réception physique des dossiers :
•	Type de fichier reçu (BS, adhésion, contrat…)
•	Nombre de fichiers reçus
•	Référence du bordereau
•	Délais contractuels de règlement
•	Gestionnaire en charge du dossier
Ces éléments sont en grande partie prédéfinis via le module client, qui contient :
•	Le profil du client (compagnie d’assurances)
•	Les délais contractuels de règlement
•	Les délais de réponse aux réclamations
•	Le chargé de compte associé
Une fois les informations saisies, une notification est automatiquement déclenchée vers le service SCAN pour débuter les travaux de numérisation.
________________________________________
2.  Service SCAN
Le service SCAN reçoit la notification et entame la numérisation des bordereaux reçus.
Une fois le dossier scanné :
•	Il est enregistré électroniquement
•	L’indexation est effectuée
•	Le statut du dossier est mis à jour en “scanné”
L’affectation est ensuite automatique aux chefs d’équipe concernés, selon le chargé de compte rattaché au dossier.
Si l’équipe du chef concerné est surchargée, une notification automatique est envoyée au Super Admin.
________________________________________
3.  Chef d’Équipe
Les chefs d’équipe reçoivent les dossiers dans une corbeille globale, composée de trois parties :
•	Dossiers traités
•	Dossiers en cours
•	Dossiers non affectés
Cette corbeille globale lui donne une visibilité complète sur tous les dossiers reçus.
Le chef peut ensuite sélectionner les dossiers à affecter aux gestionnaires, selon plusieurs critères :
•	Par nombre (lot de dossiers)
•	Par client
•	Par type de dossier/fichier
Le chef d’équipe dispose également :
•	D’un tableau de bord affichant :
o	L’état d’avancement du traitement
o	Des alertes en cas de surcharge de travail
o	La performance des gestionnaires
o	L’évolution de la performance par gestionnaire et par période
________________________________________
4. Gestionnaire
Chaque gestionnaire a une corbeille personnelle dans laquelle il retrouve les dossiers qui lui ont été affectés par son chef d’équipe.
Le gestionnaire peut :
•	Consulter le dossier
•	Traiter le dossier via l’outil de gestion
•	Marquer le dossier comme :
o	Traité
o	Ou le renvoyer vers la corbeille du chef d’équipe en cas de difficulté de traitement
 Le chef d’équipe reçoit une notification automatique si un retour est effectué.
Le gestionnaire dispose d’un tableau de bord personnel lui permettant de suivre :
•	Le nombre de dossiers qui lui sont affectés
•	Le nombre de dossiers traités, en cours ou retournés
•	Les dossiers par client
•	Les urgences selon les délais de règlement contractuels
________________________________________
5.  Super Admin
Le Super Admin a une vue complète sur tout le processus, avec accès à tous les dashboards suivants :
•	Performance des équipes :
o	BO
o	SCAN
o	Santé (chefs d’équipe et gestionnaires)
•	Suivi par période
•	Qualité et quantité des prestations traitées
•	Suivi des retards
•	Dossiers en instance ou retournés
•	Alertes en cas de surcharge d'une équipe
 
 
•	Exemple Accés Scan
  

•	TABLEAU DE BORD CHEF D'EQUIPE
 
•	CORBEILLE CHEF D'EQUIPE
 

•	TABLEAU DE BORD GESTIONNAIRE
 


•	CORBEILLE GESTIONNAIRE 
•	TAG DOSSIER PAR GESTIONNAIRE
 


•	TABLEAU DE BORD SUPER ADMIN

  

 
Processus de Gestion Électronique des Documents (GED) – Circuit Réel de Traitement
La mise en œuvre de la GED repose sur un processus structuré, séquencé et automatisé, reflétant le parcours réel des dossiers depuis leur réception physique jusqu’à leur traitement final. Le processus implique cinq acteurs principaux, chacun avec un rôle et des outils dédiés, garantissant une traçabilité complète, une réactivité accrue et une performance mesurable.
________________________________________
1. Bureau d’Ordre (BO)
Le point d’entrée du processus GED est systématiquement le Bureau d’Ordre, chargé de réceptionner physiquement les dossiers transmis par les clients (compagnies d’assurance, partenaires, ou courtiers).
Dès réception, le BO procède à l’enregistrement initial dans le système, via une interface dédiée qui permet d’introduire les informations suivantes :
•	Type de fichier reçu : bulletin de soins (BS), dossier d’adhésion, avenant contrat, courrier, réclamation, etc.
•	Nombre de fichiers ou documents reçus 
•	Référence du bordereau, utilisée comme identifiant unique dans tout le processus
•	Délais contractuels de traitement et de règlement automatiquement renseigné selon les règles prédéfinies
•	Nom du gestionnaire désigné, automatiquement renseigné selon les règles prédéfinies
Le système est relié à un module client, qui centralise les paramètres propres à chaque compagnie d’assurance ou client. Ce module contient notamment :
•	Le profil client avec ses spécificités
•	Les délais contractuels de règlement
•	Les délais de réponse aux réclamations
•	Le chargé de compte attitré, servant de référent tout au long du traitement
Une fois ces informations saisies, une notification automatique est envoyée au service SCAN, déclenchant ainsi le passage à l’étape suivante.
________________________________________
2. Service SCAN
Le service SCAN, composé d’opérateurs équipés de scanners à reconnaissance optique (OCR), est chargé de la dématérialisation complète des dossiers reçus.
Dès réception de la notification du BO, le service :
•	Scanne les documents physiques reçus
•	Enregistre électroniquement les fichiers dans le système GED avec les métadonnées associées
•	Indexe automatiquement chaque fichier à l’aide des données saisies (type de dossier, numéro de bordereau, client, date de réception…)
•	Met à jour le statut du dossier en « scanné »
L’outil GED intègre un système d’affectation automatique des dossiers scannés vers les chefs d’équipe selon le chargé de compte client ou les paramètres du profil client.
En cas de surcharge détectée dans une équipe (par exemple, nombre excessif de dossiers non traités), une alerte automatique est transmise au Super Admin pour une éventuelle réaffectation ou prise de décision.
________________________________________
3. Chefs d’Équipe
Chaque chef d’équipe dispose d’une corbeille globale accessible via son tableau de bord, divisée en trois sections claires :
•	Dossiers traités
•	Dossiers en cours de traitement
•	Dossiers non encore affectés aux gestionnaires
Cette vue centralisée lui permet d’avoir un contrôle total sur la charge de travail de son équipe. Il peut ensuite affecter les dossiers aux gestionnaires selon plusieurs critères :
•	Par lot (nombre de dossiers)
•	Par client (compagnie ou courtier)
•	Par type de dossier (BS, réclamation, etc.)
Chaque chef d’équipe bénéficie également d’un tableau de bord interactif qui lui fournit :
•	L’état d’avancement du traitement des dossiers par gestionnaire
•	Des alertes en cas de surcharge ou de non-respect des délais
•	Des statistiques de performance de chaque membre de l’équipe
•	L’évolution de la productivité par période (jour/semaine/mois)
________________________________________
4. Gestionnaires
Les gestionnaires accèdent uniquement aux dossiers qui leur ont été explicitement affectés par leur chef d’équipe, via une corbeille personnelle. Cette corbeille permet de classer et de visualiser facilement les dossiers par statut :
•	En cours
•	Traités
•	Retournés (si renvoyés au chef pour anomalie ou impossibilité de traitement)
	Le Chef d’équipe dispose aussi de cette fonctionnalité.
Les actions disponibles pour chaque gestionnaire sont les suivantes :
•	Consultation complète du dossier numérisé
•	Marquage du dossier comme :
o	Traité
o	Mis en instance
o	Rejeté
o	Renvoyé au chef d’équipe, ce qui déclenche automatiquement une notification pour que ce dernier intervienne.
Un tableau de bord individuel accompagne chaque gestionnaire, indiquant :
•	Le nombre de dossiers en attente, traités ou retournés
•	La répartition par client
•	Les alertes selon les délais de traitement
•	Un suivi de performance personnelle par période
________________________________________
5. Super Admin
Le Super Admin est le superviseur global du système, avec des droits d’accès complets et une vue transversale sur l’ensemble du circuit GED.
Il peut consulter tous les tableaux de bord consolidés, incluant :
•	La performance de chaque équipe :
o	Bureau d’Ordre (saisie initiale)
o	SCAN (dématérialisation)
o	Santé (chefs d’équipe et gestionnaires)
•	Un suivi chronologique par période
•	Des indicateurs sur la qualité et quantité des prestations traitées
•	Un état des dossiers en retard, en instance ou retournés
•	Des alertes automatiques en cas de surcharge ou de non-conformité
Il peut également réaffecter les dossiers, débloquer les situations complexes, ou encore exporter des rapports de performance à usage interne ou externe.


📄 Schéma du Processus GED – Circuit Réel de Traitement
1. 📥 Bureau d’Ordre (BO)
   ├── Réception physique du dossier
   ├── Saisie dans le système :
   │    ├── Type de fichier reçu
   │    ├── Nombre de fichiers
   │    ├── Référence du bordereau
   │    ├── Délais contractuels
   │    └── Gestionnaire en charge (via profil client)
   ├── Accès au module client :
   │    ├── Profil client
   │    ├── Délais de règlement / réclamation
   │    └── Chargé de compte associé
   └── 🔔 Notification automatique → Service SCAN

2. 🖨️ Service SCAN
   ├── Réception de la notification
   ├── Numérisation (avec OCR si disponible)
   ├── Enregistrement électronique des fichiers
   ├── Indexation des documents :
   │    └── Métadonnées : type, référence, client, date...
   ├── Statut dossier = "scanné"
   ├── 📤 Affectation automatique → Chef d’équipe (par chargé de compte)
   └── ⚠️ Si surcharge → Alerte automatique → Super Admin

3. 👨‍💼 Chef d’Équipe
   ├── Accès à une corbeille globale :
   │    ├── Traités
   │    ├── En cours
   │    └── Non affectés
   ├── Critères d’affectation :
   │    ├── Par lot
   │    ├── Par client
   │    └── Par type de dossier
   ├── 📈 Tableau de bord du chef :
   │    ├── Suivi d’avancement
   │    ├── Alerte surcharge
   │    ├── Performance individuelle des gestionnaires
   │    └── Historique par période
   └── Affectation manuelle / automatique → Gestionnaire

4. 👩‍💻 Gestionnaire
   ├── Accès à une corbeille personnelle :
   │
   │    ├── En cours
   │    ├── Traités
   │    └── Retournés
   ├── Actions possibles :
   │    ├── Consulter le dossier
   │    ├── Traiter via outil métier
   │    ├── Marquer comme "Traité"
   │    └── Retour au chef d’équipe (🔔 Notification automatique)
   ├── 📊 Tableau de bord personnel :
   │    ├── Dossiers affectés / traités / retournés
   │    ├── Suivi par client
   │    └── Alertes selon les délais contractuels
   └── Historique des actions

5. 🧑‍💼 Super Admin
   ├── Vue complète sur tous les modules :
   │    ├── BO
   │    ├── SCAN
   │    └── Santé (chefs + gestionnaires)
   ├── Accès à tous les tableaux de bord :
   │    ├── Par période
   │    ├── Par type de traitement
   │    ├── Retards et anomalies
   │    └── Alertes de surcharge
   ├── Suivi des dossiers en instance ou retournés
   └── Actions possibles :
        ├── Réaffectation
        ├── Interventions manuelles
        └── Exports de rapports / KPI
*********************************

Perfect! Let’s focus specifically on the **“Ordre de Virement”** module and break down exactly what is required, how it should work, and the expected detailed implementation according to your document. I’ll structure it clearly so nothing is missed.

---

## **Module : Ordre de Virement – Detailed Breakdown**

### **Objective**

The module is designed to **automate the generation of bank transfer files** (PDF and TXT) from reimbursement data in Excel while leveraging existing client companies and adding a member (adhérents) database with their RIBs (bank accounts).

**Key Goal:**

* Ensure traceability and data integrity.
* Integrate with existing company data.
* Allow configurable donor accounts (donneurs d’ordre) which define the TXT structure for the bank.

---

### **Data Structures**

#### **1. Existing Company Database**

* Already in the system.
* Contains:

  * **Company ID:** Unique (Numéro de contrat)
  * **Company Name**
  * **Contact & reference info**

**Rule:** All reimbursements and transfers must be linked to an existing company.

---

#### **2. Members (Adhérents) Database – To Be Added**

* Stores all individual members eligible for reimbursements.
* Fields:

  * **Matricule** (unique per company)
  * **Name / Surname**
  * **Company ID (rattachement)**
  * **RIB (bank account)**
  * **Status:** active/inactive (optional)
* **Rules / Validation:**

  * Matricule cannot be duplicated within the same company.
  * RIB should be unique except for exceptions (shared or family accounts).
  * During addition:

    * Duplicate RIB → **Alert**
    * Duplicate Matricule in the same company → **Reject record**
* **Traceability:** Must track who created or modified the record.

---

#### **3. Donneurs d’Ordre Database – To Be Added**

* Represents **payer bank accounts** used for transfers.
* Fields:

  * Name
  * RIB (bank account)
  * Bank
  * Associated TXT file structure (format 1, 2, 3…)
  * Status active/inactive

**Rules:**

* The donor selected determines:

  * Which bank account is used
  * Which TXT format is applied

---

### **Process Flow**

#### **Step 0 – Initial Setup**

* Ensure companies are in the system.
* Add members with RIBs.
* Create donneurs d’ordre with accounts and file formats.

**Result:** System ready for transfer processing.

---

#### **Step 1 – Select Donneur d’Ordre**

* User must select a donor before any processing.
* Selection includes:

  * Name of donor (e.g., AMEN GROUP)
  * Bank account (RIB)
  * Bank
  * TXT file format associated

**Importance:** This choice **conditions all further processing** (PDF and TXT generation).

---

#### **Step 2 – Import Excel File**

* Input: Excel file with reimbursements:

  * Matricule
  * Reimbursement amounts

**System Actions:**

1. Validate each matricule exists.
2. Verify matricule is linked to a company.
3. Fetch RIB for each member.
4. Sum amounts for duplicates.
5. Detect anomalies:

   * Unknown matricule
   * Duplicate matricule in the same company
   * Missing RIB
   * RIB already used by another member (exception allowed)

**Outcome:** Cleaned, validated dataset ready for processing.

---

#### **Step 3 – Display Summary**

* Table view for user:

  * Company Name
  * Matricule
  * Name / Surname
  * RIB
  * Total amount
  * Status per line (Valid/Error)

**User Actions:**

* Correct errors
* Validate or abandon import

---

#### **Step 4 – Generate PDF**

* PDF content:

  * Header: Donor name, bank account, bank
  * List of transfers:

    * Company / Contract Number
    * Matricule
    * Name / Surname
    * RIB
    * Total amount
  * Total sum at the bottom
  * Donor signature / stamp
  * Date of issuance

**Purpose:** Document ready for internal or bank use.

---

#### **Step 5 – Generate TXT File**

* TXT format depends on the donor selected:

  * Structure 1 → Donor 1
  * Structure 2 → Donor 2
  * Structure 3 → Donor 3
* System must automatically choose the correct format and output a bank-ready TXT file.

---

#### **Step 6 – History and Archiving**

* Store **all processed transfers**:

  * Donor used
  * Date & time
  * Number of members processed
  * Total amount
  * Files generated (PDF, TXT)
  * User responsible

**User Functions:**

* Review past transfers
* Download files again
* Filter by company, date, donor

---

### **Sub-Module: Virement Follow-up (Suivi des Virements)**

**Goal:** Track transfers **collaboratively and traceably** between health team and finance team.

**Process:**

1. Health team uploads Excel.
2. Automatic notification to finance team.
3. Finance team updates transfer status.
4. Every action is dated, commented, archived.

**Fields per transfer:**

| Field                   | Description                                                                     |
| ----------------------- | ------------------------------------------------------------------------------- |
| Bordereau number        | Unique batch ID                                                                 |
| Company                 | Linked company                                                                  |
| Injection date          | When health team uploaded                                                       |
| Health user             | Name of uploader                                                                |
| Finance processing date | When finance team handled                                                       |
| Finance user            | Name of updater                                                                 |
| Transfer state          | Dropdown: Non-executed / In progress / Partially executed / Rejected / Executed |
| Final state date        | Date transfer reached final state                                               |
| Comment                 | Optional free text                                                              |

**States:**

1. Virement non exécuté
2. Virement en cours
3. Virement exécuté partiellement
4. Virement rejeté
5. Virement exécuté

**Notifications:**

* Automatic alert to finance when health team uploads a new bordereau.

**Dashboard / History:**

* Filterable table by:

  * Company
  * Date of injection or processing
  * State
  * User (health / finance)
  * Donor used
  * Number of members & total amount

---

### **Summary – Expected Functionality**

1. Add and validate member data with RIBs.
2. Add donors with bank accounts and TXT formats.
3. Upload and validate reimbursement Excel files.
4. Display errors and allow correction.
5. Generate **PDF reports**.
6. Generate **bank-ready TXT files** according to donor format.
7. Archive history with user, amount, donor, files.
8. Provide **virement follow-up** with dashboard and notifications.
9. Ensure **traceability** at every step.

---

✅ Essentially, they want a **full end-to-end automated transfer module** with:

* Data validation (members & RIBs)
* Configurable donors
* Error handling
* PDF and TXT generation
* Audit trail and history
* Collaborative workflow between health and finance teams

---

Perfect! Let’s create an **ISCI-style diagram** (Information, System, Control, Interaction) for the **“Ordre de Virement”** module. I’ll connect all the dots from Excel import to validation, PDF/TXT generation, archiving, and follow-up. I’ll describe it in a clear structured way suitable for system design.

---

## **ISCI Diagram – Ordre de Virement**

### **1. Information Layer (Data)**

| Entity                  | Attributes / Key Info                                                           |
| ----------------------- | ------------------------------------------------------------------------------- |
| **Company (Société)**   | Numéro de contrat, Name, Contact info                                           |
| **Member (Adhérent)**   | Matricule, Name, Surname, RIB, Status                                           |
| **Donneur d’Ordre**     | Name, RIB, Bank, TXT format, Status                                             |
| **Reimbursement Excel** | Matricule, Amount(s)                                                            |
| **Virement Record**     | Bordereau ID, Company, Member, Amount, Donor, Status, User, Date, PDF/TXT links |

---

### **2. System Layer (Processes & Rules)**

1. **Select Donneur d’Ordre**

   * Input: List of active donors
   * Output: Selected donor → sets account & TXT format

2. **Import Excel File**

   * Input: Excel with reimbursements
   * Validation:

     * Matricule exists?
     * Matricule linked to company?
     * RIB exists & unique?
   * Output: Validated dataset + error report

3. **Display Summary Table**

   * Input: Validated dataset
   * Output: User review → Correct / Approve / Reject

4. **Generate PDF**

   * Input: Approved dataset, donor info
   * Output: PDF file with header, list, totals, signature, date

5. **Generate TXT**

   * Input: Approved dataset, donor’s TXT structure
   * Output: Bank-ready TXT file

6. **Archive / History**

   * Input: PDF, TXT, dataset, user, donor, timestamp
   * Output: Persistent record, accessible for dashboard / download

7. **Virement Follow-up**

   * Input: Bordereau, user actions
   * Output: Transfer status update, notifications, dashboard

---

### **3. Control Layer (Rules / Validations)**

* **Member Rules:**

  * Matricule unique per company
  * RIB unique (except exceptions)
  * Trace modifications (who added/edited)

* **Donor Rules:**

  * Only active donors selectable
  * TXT format determined automatically

* **Excel Import Rules:**

  * Unknown matricule → Error
  * Duplicate matricule → Sum / Flag
  * Missing RIB → Error
  * RIB conflict → Alert

* **Virement Status Workflow:**

  1. Non-executed
  2. In progress
  3. Partially executed
  4. Rejected
  5. Executed

* **Notifications:**

  * Health team uploads → Finance notified
  * Errors in processing → User alerted

---

### **4. Interaction Layer (Actors & UI)**

| Actor                   | Interaction                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| **Health Team User**    | Upload Excel, view errors, validate, submit bordereau                                            |
| **Finance User**        | Receive notification, review bordereau, update virement status                                   |
| **System**              | Validate data, generate PDF/TXT, store history, trigger notifications                            |
| **Admin / Super Admin** | Access dashboards, view all transfers, filter by donor/company/date, manage users/donors/members |

---

### **5. Diagram Flow (ASCII-style for clarity)**

```
[Health Team User]
         │
         ▼
  Select Donneur d’Ordre
         │
         ▼
  Upload Excel File
         │
         ▼
  ┌───────────────────────────┐
  │ Validation & Error Check  │
  │ - Matricule exists        │
  │ - Matricule/company link  │
  │ - RIB exists & unique     │
  └───────────────────────────┘
         │
         ▼
  Display Summary Table
         │
    Correct / Validate
         │
         ▼
 ┌───────────────────────────┐
 │ Generate PDF & TXT Files  │
 │ - PDF with donor info     │
 │ - TXT bank-ready          │
 └───────────────────────────┘
         │
         ▼
   Archive / History Store
         │
         ▼
  [Finance Team User]
         │
         ▼
  Update Transfer Status
         │
         ▼
  Notifications / Dashboard
         │
         ▼
  Super Admin: Monitor & Export Reports
```

---

✅ This diagram **connects all layers**:

* **Information:** Databases for companies, members, donors, reimbursements.
* **System:** Processing rules, PDF/TXT generation, archive.
* **Control:** Validations, workflow states, notifications.
* **Interaction:** Users (Health, Finance), System, Admin.

---

Perfect 👍 now that you laid out the workflow so clearly, we can see **exactly where the new features (Manual Scan + Chef d’Équipe action buttons) should fit in**.

---

## 🔹 Current workflow (from description)

1. **BO → Creates bordereau**

   * Notification → SCAN

2. **SCAN → Imports files (via Import button)**

   * Sees only “unfed” bordereaux (no files yet)
   * Uploads pieces jointes → finalizes scan
   * Notifications go out

3. **Chef d’Équipe → Corbeille updates**

   * Assigns / Rejects / Treats himself

4. **Gestionnaire → Corbeille personnelle**

   * Works dossier → changes status

---

## 🔹 New Features to Add

### **1. Manual Scan (Service Scan module)**

This is for cases where:

* No physical scanner is used, or
* BO uploads files directly.

👉 **UI changes (Scan module):**

* Add a **second button** next to “Import”:

  * `📄 Manual Upload` (or “Scan Manuel”)
* Clicking it shows a modal with:

  * List of eligible bordereaux (created by BO, not yet scanned)
  * File upload input (multi-file support)
  * Metadata confirmation (number of docs, type, reference)
* Once uploaded → status becomes *Scanné* → notifications go out exactly like automatic scan.

So **it reuses the same flow**, just with a new entry point (manual upload instead of physical scanner import).

---

### **2. Chef d’Équipe Actions (Corbeille)**

Already specified in the cahier de charge, but you need to **make them explicit in UI**.

👉 **UI changes (Chef d’Équipe module → Corbeille):**

* For each dossier row, add 3 buttons:

  1. **Affecter à un gestionnaire** → opens modal to select gestionnaire
  2. **Rejeter** → confirmation modal + optional reason
  3. **Traiter moi-même** → directly moves dossier into “En cours” under Chef’s personal corbeille

⚠️ All these actions **live inside the Corbeille Chef d’Équipe**, not in a separate module.

---

## 🔹 Updated ASCII Workflow (with new features)

```
📥 Bureau d’Ordre
 └─ Create bordereau → 🔔 Notify SCAN

🖨️ Service Scan
 ├─ [Import]   → Upload scanned files (classic scan)
 └─ [Manual Upload] → Upload documents manually (multi-file)
      ↓
   🔔 Notifications → Chef d’Équipe + Gestionnaires

👨‍💼 Chef d’Équipe (Corbeille)
 ├─ View: Traités / En cours / Non affectés
 ├─ Actions per dossier:
 │    ├─ Assign → Gestionnaire
 │    ├─ Reject → Back to BO (or archive with reason)
 │    └─ Do it himself → Moves to “En cours” (Chef)
 └─ 🔔 Notifications triggered

👩‍💻 Gestionnaire
 ├─ Personal corbeille: assigned dossiers only
 ├─ Open dossier → change status:
 │    ├─ Traité
 │    ├─ Rejeté
 │    └─ Retourné (back to Chef)
 └─ Dashboard updates in real time
```

---

✅ **Final takeaway for implementation:**

* **Manual Scan** = new button in **Service Scan module**, but reuses same workflow.
* **Chef d’Équipe actions** = buttons in **Chef’s corbeille**, not a new module.

---

Do you want me to **sketch a UI mockup** (ASCII or Figma-style) showing exactly how the “Manual Upload” button and the Chef’s action buttons should look inside their respective modules?




1. Création du bordereau (Bureau d’Ordre)

Le Bureau d’Ordre crée un bordereau dans l’application.

Dès la création, une notification automatique est envoyée au service Scan pour l’informer qu’un bordereau est en attente d’alimentation (pièces jointes).

Données enregistrées :

Date de création (par Bureau d’Ordre).




---

2. Alimentation du bordereau (Service Scan)

Le service Scan accède à son compte et utilise le bouton Import dans le module Scan.

Le bouton Import affiche uniquement :

Les bordereaux créés par le Bureau d’Ordre.

Qui n’ont pas encore été alimentés en pièces jointes.


Pièces jointes possibles :

Bulletins de soins, déclarations de salaires, fiches d’adhésions, contrats, etc.


Données enregistrées :

Date de finalisation du Scan.




---

3. Déclenchement des notifications (pendant et après Scan)

Au démarrage du Scan :

Notification envoyée aux gestionnaires et chefs d’équipe concernés.

Les informations de rattachement (chef d’équipe et gestionnaires) proviennent des modules Contrat/Client.


À la fin du Scan :

Une nouvelle notification est envoyée aux mêmes destinataires pour signaler que le Scan est finalisé.




---

4. Répartition du travail (Chef d’équipe)

La corbeille du chef d’équipe s’actualise automatiquement avec chaque dossier scanné importé.

Le chef d’équipe répartit les dossiers au fur et à mesure du Scan sur ses gestionnaires afin de ne pas impacter les délais.



---

5. Traitement des dossiers (Gestionnaires)

Chaque gestionnaire accède à sa corbeille personnelle qui contient uniquement les dossiers qui lui sont attribués.

Exemple : un gestionnaire chargé des Bulletins de Soins (BS) voit uniquement les BS qui lui sont affectés.

Le gestionnaire attribue un statut a chaque dossier dans l'ecran qui affiche le contenu de dossier :

Traité

Rejeté

Retourné à la corbeille du chef d’équipe


Statut initial des dossiers :

« En cours » ou « À traiter ».




Selon les informations du document, notamment à la page 17 et 30, les Bulletins de Soins (BS) sont intégrés dans le processus de traitement via le bordereau. Le bordereau est décrit comme un document regroupant plusieurs BS (par exemple, 100 BS dans un bordereau), et la gestion de ces BS se fait en relation avec le bordereau dans le système.

Plus précisément :

- La mise à jour du statut du bordereau dépend du traitement de ses BS, avec des indicateurs tels que le nombre de BS traités, rejetés ou en cours (, Page 17).

- Lorsqu’un bordereau est scanné ou traité, cela concerne un ensemble de BS, considéré comme un tout.

Il est mentionné que le bordereau doit avoir un statut de numérisation, et la progression de ce statut est calculée en fonction du traitement des BS qu'il contient.

Conclusion :
Les BS sont considérés comme des éléments constitutifs ou des sous-ensembles du bordereau dans le système. La représentation la plus cohérente est que l’affichage et la gestion des BS doivent être « imbriqués » ou « nestés » dans la vue du bordereau, plutôt que séparés. Cela signifie que dans le module de gestion, on doit voir les BS listés à l’intérieur de chaque bordereau, permettant une gestion intégrée et une visualisation globale du contenu du bordereau.

En résumé :
Les BS ne sont pas traités comme des entités séparées en dehors du bordereau ; ils doivent être visualisés et gérés comme étant imbriqués à l’intérieur du bordereau dans le système.
Voici un résumé détaillé des exigences, fonctionnalités et le fonctionnement des Bulletins de Soins (BS) ainsi que leur gestion dans le système, basé sur les informations du document. Je vous fournis également une description de leur représentation dans le diagramme associé.

1. Définition et Composition des BS

- Bulletin de Soins (BS) : Un document individuel relatif à un traitement ou une demande spécifique, qui peut contenir diverses informations médicales et liées à la réclamation.

- Contenu : Chaque BS est une unité du traitement administratif, comprenant des données telles que les détails du soin, le montant, l’adhérent concerné, etc.

2. Fonctionnalités et exigences des BS

a. Gestion de la réception et numérisation

- Les BS sont reçus via un bordereau, qui peut contenir plusieurs BS (ex. 100 BS).

- Lors de la réception physique des dossiers, le Bureau d’Ordre enregistre dans le système :

- Le type de fichier (ex. BS)

- Le nombre de BS

- La référence du bordereau (identifiant unique)

- Les délais contractuels de traitement

- Le gestionnaire en charge du dossier

- Le service SCAN numérise ensuite ces BS via OCR, puis enregistre électroniquement chaque BS.

b. Indexation et statut

- Après numérisation, chaque BS est :

- Indexé : associé à ses métadonnées (référence, date, etc.)

- Statut : doit avoir le statut « Non scanné », « Scan en cours », ou « Scan finalisé ».

- La mise à jour automatique du statut du bordereau dépend du traitement de ses BS.

c. Visualisation et gestion

- Dans l’interface utilisateur, les BS sont affichés dans une vue imbriquée au sein de chaque bordereau :

- On peut voir le total de BS dans le bordereau.

- La progression du traitement : nombre de BS traités, rejetés, en cours.

- La mise à jour du statut du bordereau dépend du traitement global des BS.

d. Traitement individuel

- Chaque BS peut être :

- Traité : validé ou rejeté par l’équipe métier.

- Rejeté : pour une erreur ou une non-conformité.

- En cours : en attente ou en traitement, selon son étape dans le flux.

e. Indicateurs de performance

- Le traitement du bordereau est considéré comme terminé lorsque tous les BS qu’il contient sont traités.

- La progression et la performance de l’équipe sont calculées en fonction du traitement des BS.

3. Règles et contrôle de qualité sur les BS

- La gestion des BS doit respecter certaines règles :

- Le nombre total de BS dans un bordereau doit correspondre à ceux traités.

- Le statut des BS doit être cohérent avec la progression du traitement.

- Lors de l’upload, il est possible d’interrompre ou de compléter la numérisation pour un BS.

4. Processus de workflow des BS (relation avec autres modules)

1. Réception physique → Enregistrement dans le BO.

2. Numérisation via SCAN → BS numérisés, indexés, statut mis à jour.

3. Traitement par l’équipe métier :

- Valider ou rejeter chaque BS.

- Mettre à jour le statut du BS.

1. Mise à jour du statut du bordereau : basé sur l’état de tous ses BS.

2. Reporting et performance : suivi du traitement via indicateurs.

5. Représentation et diagramme

- En dessinant le diagramme UML ou de flux :

- Entité « Bordereau » contient une collection d’« Élément BS ».

- Chaque BS a :

- Identifiant unique

- Statut (Non scanné, en cours, finalisé)

- Date de traitement

- Statut de rejet si applicable

- Le bordereau a un statut global basé sur ses BS (progression et pourcentage achevé).

6. Features clés à développer

- Interface pour voir la liste des BS dans chaque bordereau.

- Fonction de mise à jour automatique du statut en fonction de l’état des BS.

- Notifications automatiques pour le suivi.

- Fonction d’action individuelle pour chaque BS (traiter, rejeter, commenter).

- Génération automatique du rapport de progression du bordereau.

Résumé :

Les BS doivent être gérés comme des sous-éléments imbriqués dans chaque bordereau. La visualisation doit permettre de suivre leur progrès individuellement ou globalement. La gestion efficace repose sur une association forte entre les BS et leur bordereau correspondant, avec une mise à jour de statut automatique et des indicateurs de performance précis.

Voici un diagramme ASCII simplifié représentant la structure et le flux de gestion des Bulletins de Soins (BS) dans le système, basé sur les détails fournis :

+----------------------------+
|        Bordereau           |
|----------------------------|
| - référence (ID)           |
| - statut (Non scanné,     |
|   Scan en cours, finalisé)|
| - % progression            |
| - date d'injection         |
|                            |
| Contient une liste de     |
| Bulletins de Soins (BS)   |
+------------+--------------+
|
| contient
v
+------------------------------+
|        Bulletins de Soins    |
|------------------------------|
| - ID BS                      |
| - statut (Non scanné, en    |
|   cours, finalisé, rejeté)  |
| - date de traitement         |
| - informations spécifiques   |
|                              |
+------------------------------+

Processus de gestion :

[Réception Physique]
|
v
+------------------------------+
|    Enregistrement BO       |  (Ajoute info dans le système)
+------------------------------+
|
v
+------------------------------+
|         Numérisation        |  (Service SCAN)
|   (Transformation OCR)       |
+------------------------------+
|
v
+------------------------------+
|  Mise à jour du statut du   |
|    BS & Bordereau           |
+------------------------------+
|
v
+------------------------------+
|  Traitement par équipe      |  (Valider/rejeter chaque BS)
+------------------------------+
|
v
+------------------------------+
|   Mise à jour du progrès    |
|   et reporting              |
+------------------------------+

Indicateurs et suivi :
- Pourcentage de BS traités dans un bordereau
- Statut global du bordereau
- Notifications pour chaque étape

Résumé du diagramme:

- Le Bordereau contient plusieurs BS.

- Le processus commence par réception, enregistrement, numérisation, et traitement.

- Chaque étape met à jour le statut individuellement et globalement.

- La gestion des BS influence le statut et la progression du bordereau.




