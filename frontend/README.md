# Frontend de l'Application de Gestion de Stock (Next.js)

Ce document décrit l'application frontend, construite avec Next.js, et son interaction avec le backend pour la gestion des stocks.

## Table des Matières

1.  [Vue d'ensemble du Projet](#1-vue-densemble-du-projet)
2.  [Technologies Utilisées](#2-technologies-utilisées)
3.  [Configuration du Développement](#3-configuration-du-développement)
4.  [Composants et Pages Clés](#4-composants-et-pages-clés)
5.  [Rôles Utilisateur et Flux de Travail](#5-rôles-utilisateur-et-flux-de-travail)
6.  [Interaction avec l'API Backend](#6-interaction-avec-lapi-backend)
7.  [Notifications en Temps Réel (WebSockets)](#7-notifications-en-temps-réel-websockets)

---

### 1. Vue d'ensemble du Projet

Le frontend est une application web réactive développée avec Next.js (React) et Material-UI. Elle fournit une interface utilisateur intuitive pour les différents rôles (Chef de Service, Magasinier, DAF, Admin) afin de gérer les demandes de stock, les approbations, les livraisons, les ajustements de stock, les réceptions et les bons de commande.

### 2. Technologies Utilisées

*   **Next.js:** Framework React pour le rendu côté serveur et la génération de sites statiques.
*   **React:** Bibliothèque JavaScript pour la construction d'interfaces utilisateur.
*   **Material-UI (MUI):** Bibliothèque de composants React implémentant le Material Design de Google, pour une interface utilisateur cohérente et esthétique.
*   **TypeScript:** Langage de programmation qui ajoute le typage statique à JavaScript, améliorant la robustesse et la maintenabilité du code.
*   **Axios / Fetch API:** Pour les requêtes HTTP vers l'API backend.
*   **WebSockets:** Pour les notifications en temps réel.

### 3. Configuration du Développement

#### Prérequis

*   Node.js (version recommandée par Next.js)
*   npm ou yarn

#### Étapes d'installation

1.  **Naviguer vers le dossier frontend :**
    ```bash
    cd postefinances_stock_appV1/frontend
    ```

2.  **Installer les dépendances :**
    ```bash
    npm install
    # ou
    yarn install
    ```

3.  **Configurer les variables d'environnement :**
    Créez un fichier `.env.local` à la racine du dossier `frontend` et ajoutez-y l'URL de votre API backend :
    ```
    NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
    ```

4.  **Lancer le serveur de développement :**
    ```bash
    npm run dev
    # ou
    yarn dev
    ```
    L'application sera accessible à `http://localhost:3000`.

### 4. Composants et Pages Clés

*   **`src/app/page.tsx`:** Page d'accueil, gère la logique de connexion et redirige vers le tableau de bord approprié.
*   **`src/app/dashboard/page.tsx`:** Le tableau de bord principal qui rend le composant de tableau de bord spécifique à l'utilisateur en fonction de son rôle.
*   **`src/components/Login.tsx`:** Composant pour l'authentification des utilisateurs.
*   **`src/components/Navbar.tsx`:** Barre de navigation commune à l'application.
*   **`src/components/ChefServiceDashboard.tsx`:** Tableau de bord pour les Chefs de Service.
*   **`src/components/DAFDashboard.tsx`:** Tableau de bord pour les DAF.
*   **`src/components/MagasinierDashboard.tsx`:** Tableau de bord pour les Magasiniers.
*   **`src/context/AuthContext.tsx`:** Contexte React pour gérer l'état d'authentification de l'utilisateur.
*   **`src/context/NotificationContext.tsx`:** Contexte React pour afficher des notifications (Snackbar, Dialogs) de manière centralisée.
*   **`src/api/*.ts`:** Modules pour interagir avec les différents endpoints de l'API backend.

### 5. Rôles Utilisateur et Flux de Travail

Le frontend implémente des interfaces utilisateur spécifiques pour chaque rôle, reflétant le flux de travail simplifié :

#### CHEF_SERVICE

*   **Création de Demandes :** Interface pour créer de nouvelles demandes de stock.
*   **Suivi des Demandes :** Visualisation de toutes ses demandes avec leur statut actuel.
*   **Annulation de Demandes :** Possibilité d'annuler les demandes en statut `EN_COURS_APPRO`.
*   **Signalement de Problèmes de Réception :** Bouton "Signaler un problème" pour les demandes `LIVREE_PAR_MAGASINIER`, permettant de les faire passer en `LITIGE_RECEPTION`.
*   **Confirmation de Réception :** Confirmation finale des livraisons.

#### DAF (Directeur Administratif et Financier)

*   **Approbation des Demandes :** Visualisation des demandes `EN_COURS_APPRO` et `LITIGE_RECEPTION`.
*   **Traitement des Demandes :** Possibilité d'approuver, de modifier les quantités ou de rejeter les demandes `EN_COURS_APPRO`.
*   **Résolution des Litiges :** Pour les demandes `LITIGE_RECEPTION`, des boutons spécifiques "Résoudre (Approuver)" et "Résoudre (Rejeter)" sont disponibles pour clore le litige.
*   **Approbation des Ajustements/Réceptions de Stock :** Interface pour approuver ou rejeter les demandes d'ajustement et de réception de stock.
*   **Gestion des Bons de Commande :** Visualisation et approbation des bons de commande.

#### MAGASINIER

*   **Gestion des Livraisons :** Visualisation des demandes `APPROUVEE` et `LITIGE_RECEPTION`.
*   **Confirmation de Livraison :** Bouton pour confirmer la livraison des demandes `APPROUVEE`. Le bouton est désactivé pour les demandes en `LITIGE_RECEPTION`.
*   **Ajustements de Stock :** Interface pour initier des demandes d'ajustement de stock.
*   **Réceptions de Stock :** Interface pour enregistrer des réceptions de stock (produit par produit ou par lot).
*   **Rapports :** Accès à des rapports sur l'état des stocks et les bons de commande.

### 6. Interaction avec l'API Backend

Le frontend communique avec l'API FastAPI via des requêtes HTTP (GET, POST, PUT) en utilisant la Fetch API ou Axios. Les modules `src/api/*.ts` centralisent la logique d'appel API pour chaque ressource (utilisateurs, produits, demandes, etc.). L'authentification est gérée par des tokens JWT.

### 7. Notifications en Temps Réel (WebSockets)

L'application utilise des WebSockets pour recevoir des notifications en temps réel du backend. Le `NotificationContext` gère l'affichage de ces notifications sous forme de `Snackbar` ou de `Dialog` pour informer l'utilisateur des événements importants (nouvelles demandes, changements de statut, résolutions de litiges, etc.). Le composant `WebSocketProvider` établit et maintient la connexion WebSocket.