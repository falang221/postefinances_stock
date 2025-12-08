# Backend de l'Application de Gestion de Stock (FastAPI)

Ce document décrit l'architecture, la configuration et les endpoints API du backend de l'application de gestion de stock, développé avec FastAPI et Prisma Client Python.

## Table des Matières

1.  [Vue d'ensemble du Projet](#1-vue-densemble-du-projet)
2.  [Configuration du Développement](#2-configuration-du-développement)
3.  [Modèles de Données Clés](#3-modèles-de-données-clés)
4.  [Flux de Travail des Demandes de Stock](#4-flux-de-travail-des-demandes-de-stock)
5.  [Endpoints API](#5-endpoints-api)
    *   [Authentification](#authentification)
    *   [Utilisateurs](#utilisateurs)
    *   [Catégories](#catégories)
    *   [Produits](#produits)
    *   [Ajustements de Stock](#ajustements-de-stock)
    *   [Réceptions de Stock](#réceptions-de-stock)
    *   [Demandes de Stock](#demandes-de-stock)
    *   [Bons de Commande](#bons-de-commande)
6.  [Notifications en Temps Réel (WebSockets)](#6-notifications-en-temps-réel-websockets)

---

### 1. Vue d'ensemble du Projet

Le backend est une API RESTful construite avec FastAPI, gérant la logique métier de l'application de gestion de stock. Il interagit avec une base de données PostgreSQL via Prisma Client Python pour la persistance des données. Il gère les utilisateurs, les produits, les demandes de stock, les ajustements, les réceptions et les bons de commande, avec un système de rôles et de notifications en temps réel.

### 2. Configuration du Développement

#### Prérequis

*   Python 3.11+
*   PDM (gestionnaire de paquets Python)
*   Docker (pour PostgreSQL)

#### Étapes d'installation

1.  **Cloner le dépôt :**
    ```bash
    git clone <URL_DU_DEPOT>
    cd postefinances_stock_appV1/backend
    ```

2.  **Installer les dépendances Python avec PDM :**
    ```bash
    pdm install
    ```

3.  **Configurer les variables d'environnement :**
    Créez un fichier `.env` à la racine du dossier `backend` et ajoutez-y les variables nécessaires (ex: `DATABASE_URL`, `SECRET_KEY`, etc.).
    ```
    DATABASE_URL="postgresql://user:password@localhost:5432/stockdb"
    SECRET_KEY="YOUR_SUPER_SECRET_KEY"
    ALGORITHM="HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES=30
    ```

4.  **Démarrer la base de données PostgreSQL avec Docker :**
    ```bash
    docker-compose up -d postgres
    ```

5.  **Appliquer les migrations Prisma :**
    ```bash
    pdm run prisma migrate deploy
    pdm run prisma generate
    ```

6.  **Exécuter les seeds (données de test) :**
    ```bash
    pdm run python seed.py
    ```

7.  **Lancer l'application FastAPI :**
    ```bash
    pdm run uvicorn main:app --reload
    ```
    L'API sera disponible à `http://127.0.0.1:8000`. La documentation interactive (Swagger UI) est accessible à `http://127.0.0.1:8000/docs`.

### 3. Modèles de Données Clés

*   **User:** Gère les informations des utilisateurs avec des rôles (`CHEF_SERVICE`, `MAGASINIER`, `DAF`, `ADMIN`).
*   **Product:** Représente les articles en stock avec des détails comme la quantité, le seuil de stock minimum, etc.
*   **Request:** Représente une demande de stock initiée par un `CHEF_SERVICE`.
    *   **Statuts clés :** `TRANSMISE`, `APPROUVEE`, `REJETEE`, `ANNULEE`, `LIVREE_PAR_MAGASINIER`, `LITIGE_RECEPTION`, `RECEPTION_CONFIRMEE`.
*   **RequestItem:** Détails des produits et quantités demandées/approuvées pour une `Request`.
*   **Approval:** Enregistre les décisions d'approbation/rejet/résolution prises par les DAF.
*   **StockAdjustment:** Enregistre les ajustements de stock (entrée/sortie) en attente d'approbation DAF.
*   **StockReceipt:** Enregistre les réceptions de stock (entrée) en attente d'approbation DAF.
*   **PurchaseOrder:** Gère les bons de commande pour l'approvisionnement.

### 4. Flux de Travail des Demandes de Stock

Le flux de travail des demandes de stock a été simplifié et amélioré :

1.  **Création de la Demande (CHEF_SERVICE) :**
    *   Un `CHEF_SERVICE` crée une demande de stock (`POST /requests/`).
    *   La demande passe directement au statut `TRANSMISE` (En cours d'approbation par le DAF).
    *   Notification envoyée aux `DAF`.

2.  **Annulation de la Demande (CHEF_SERVICE) :**
    *   Un `CHEF_SERVICE` peut annuler ses propres demandes si elles sont `TRANSMISE` (`PUT /requests/{request_id}/cancel`).
    *   La demande passe au statut `ANNULEE`.

3.  **Approbation/Rejet de la Demande (DAF) :**
    *   Un `DAF` consulte les demandes `TRANSMISE` et `LITIGE_RECEPTION` (`GET /requests/daf`).
    *   Le `DAF` peut approuver, modifier les quantités approuvées ou rejeter une demande (`PUT /requests/{request_id}/approve`).
    *   Si approuvée, la demande passe au statut `APPROUVEE`. Notification envoyée au `CHEF_SERVICE` et aux `MAGASINIER`.
    *   Si rejetée, la demande passe au statut `REJETEE`. Notification envoyée au `CHEF_SERVICE`.

4.  **Livraison de la Demande (MAGASINIER) :**
    *   Un `MAGASINIER` consulte les demandes `APPROUVEE` et `LITIGE_RECEPTION` (`GET /requests/magasinier/approved`).
    *   Le `MAGASINIER` confirme la livraison d'une demande `APPROUVEE` (`PUT /requests/{request_id}/deliver`).
    *   Le stock est décrémenté et des transactions sont enregistrées.
    *   La demande passe au statut `LIVREE_PAR_MAGASINIER`. Notification envoyée au `CHEF_SERVICE`.

5.  **Signalement d'un Problème de Réception (CHEF_SERVICE) :**
    *   Après la livraison par le Magasinier, le `CHEF_SERVICE` peut signaler un problème de réception pour une demande `LIVREE_PAR_MAGASINIER` (`PUT /requests/{request_id}/report-issue`).
    *   La demande passe au statut `LITIGE_RECEPTION`. Notification envoyée aux `MAGASINIER` et `DAF`.

6.  **Résolution du Litige (DAF) :**
    *   Un `DAF` consulte les demandes `LITIGE_RECEPTION` sur son tableau de bord (`GET /requests/daf`).
    *   Le `DAF` peut résoudre le litige en l'approuvant ou en le rejetant (`PUT /requests/{request_id}/resolve-dispute`).
    *   Si le litige est approuvé, la demande passe au statut `RECEPTION_CONFIRMEE`.
    *   Si le litige est rejeté, la demande passe au statut `REJETEE`.
    *   Notification envoyée au `CHEF_SERVICE` et aux `MAGASINIER`.

7.  **Confirmation Finale de Réception (CHEF_SERVICE) :**
    *   Le `CHEF_SERVICE` confirme la réception finale d'une demande `LIVREE_PAR_MAGASINIER` (`PUT /requests/{request_id}/receive`).
    *   La demande passe au statut `RECEPTION_CONFIRMEE`.

### 5. Endpoints API

La documentation interactive complète est disponible via Swagger UI à `/docs`.

#### Authentification

*   `POST /auth/login`: Authentification de l'utilisateur.
*   `GET /auth/me`: Récupère les informations de l'utilisateur connecté.

#### Utilisateurs

*   `POST /users/`: Crée un nouvel utilisateur (ADMIN uniquement).
*   `GET /users/`: Liste tous les utilisateurs (ADMIN uniquement).
*   `GET /users/{user_id}`: Récupère un utilisateur par ID (ADMIN uniquement).
*   `PUT /users/{user_id}`: Met à jour un utilisateur (ADMIN uniquement).
*   `DELETE /users/{user_id}`: Supprime un utilisateur (ADMIN uniquement).
*   `PUT /users/change-password`: Change le mot de passe de l'utilisateur connecté.

#### Catégories

*   `POST /categories/`: Crée une nouvelle catégorie.
*   `GET /categories/`: Liste toutes les catégories.
*   `GET /categories/{category_id}`: Récupère une catégorie par ID.
*   `PUT /categories/{category_id}`: Met à jour une catégorie.
*   `DELETE /categories/{category_id}`: Supprime une catégorie.

#### Produits

*   `POST /products/`: Crée un nouveau produit.
*   `GET /products/`: Liste tous les produits.
*   `GET /products/{product_id}`: Récupère un produit par ID.
*   `PUT /products/{product_id}`: Met à jour un produit.
*   `DELETE /products/{product_id}`: Supprime un produit.
*   `POST /products/{product_id}/adjust-stock`: Soumet une demande d'ajustement de stock pour un produit.
*   `POST /products/receive`: Soumet une demande de réception de stock pour un produit.
*   `POST /products/receive-batch`: Soumet une demande de réception de stock pour plusieurs produits.
*   `GET /products/stock-adjustments/my-adjustments`: Liste les ajustements de stock de l'utilisateur connecté.
*   `GET /products/stock-adjustments/pending`: Liste les ajustements de stock en attente d'approbation DAF.
*   `PUT /products/stock-adjustments/{adjustment_id}/decide`: Décision DAF sur un ajustement de stock.
*   `GET /products/stock-receipts/my-receipts`: Liste les réceptions de stock de l'utilisateur connecté.
*   `GET /products/stock-receipts/pending`: Liste les réceptions de stock en attente d'approbation DAF.
*   `PUT /products/stock-receipts/{receipt_id}/decide`: Décision DAF sur une réception de stock.
*   `GET /products/reports/stock-status`: Génère un rapport sur l'état des stocks.
*   `GET /products/reports/transaction-history`: Génère un rapport sur l'historique des transactions.

#### Demandes de Stock

*   `POST /requests/`: Crée une nouvelle demande de stock (CHEF_SERVICE).
*   `GET /requests/my-requests`: Liste les demandes de stock de l'utilisateur connecté (CHEF_SERVICE).
*   `PUT /requests/{request_id}/cancel`: Annule une demande de stock (CHEF_SERVICE).
*   `PUT /requests/{request_id}/report-issue`: Signale un problème de réception pour une demande (CHEF_SERVICE).
*   `GET /requests/daf`: Liste les demandes en attente d'approbation ou en litige pour le DAF.
*   `PUT /requests/{request_id}/approve`: Approuve, modifie ou rejette une demande (DAF).
*   `PUT /requests/{request_id}/resolve-dispute`: Résout un litige de réception (DAF).
*   `GET /requests/magasinier/approved`: Liste les demandes approuvées ou en litige pour le Magasinier.
*   `PUT /requests/{request_id}/deliver`: Confirme la livraison d'une demande (MAGASINIER).
*   `PUT /requests/{request_id}/receive`: Confirme la réception finale d'une demande (CHEF_SERVICE).
*   `GET /requests/reports/stock-requests`: Génère un rapport sur les demandes de stock.

#### Bons de Commande

*   `POST /purchase-orders/`: Crée un nouveau bon de commande (MAGASINIER).
*   `GET /purchase-orders/my-orders`: Liste les bons de commande de l'utilisateur connecté (MAGASINIER).
*   `GET /purchase-orders/daf`: Liste les bons de commande en attente d'approbation DAF.
*   `PUT /purchase-orders/{order_id}/approve`: Approuve ou rejette un bon de commande (DAF).
*   `GET /purchase-orders/{order_id}`: Récupère un bon de commande par ID.
*   `GET /purchase-orders/`: Liste tous les bons de commande (ADMIN).

### 6. Notifications en Temps Réel (WebSockets)

Le backend utilise des WebSockets pour envoyer des notifications en temps réel aux utilisateurs concernés lors d'événements importants (nouvelle demande, approbation, livraison, litige, résolution de litige, etc.).

*   **Endpoint WebSocket :** `/ws/{user_id}`
*   Les clients (frontend) doivent se connecter à cet endpoint en fournissant leur `user_id` pour recevoir des notifications personnalisées.
*   Les notifications sont envoyées via le `WebSocketManager`.