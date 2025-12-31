# Guide de Déploiement Complet - Postefinances Stock App

Ce guide explique comment déployer l'application de gestion de stock sur un serveur Linux vierge (type Debian/Ubuntu).

## 1. Prérequis

Avant de commencer, assurez-vous que les logiciels suivants sont installés sur le serveur de déploiement :
- **Git :** Pour cloner le code source.
- **Docker :** Pour exécuter l'application conteneurisée.
- **Docker Compose :** Pour orchestrer les services (backend, frontend, db).
- **Accès SSH** au serveur.

## 2. Étape 1 : Installation sur le Serveur

Connectez-vous à votre serveur en SSH, puis suivez ces étapes :

1.  **Cloner le dépôt GitHub :**
    ```bash
    git clone https://github.com/falang221/postefinances_stock.git
    ```

2.  **Se déplacer dans le dossier du projet :**
    ```bash
    cd postefinances_stock
    ```

## 3. Étape 2 : Configuration de l'Environnement

L'application nécessite des fichiers d'environnement pour configurer les variables sensibles.

1.  **Pour le Backend :**
    Créez un fichier nommé `.env.prod` dans le dossier `backend/`.
    ```bash
    nano backend/.env.prod
    ```
    Ajoutez le contenu suivant. Ce fichier contient les secrets pour la base de données et l'application.

    ```env
    # URL de la base de données PostgreSQL
    # Format: postgresql://<user>:<password>@<host>:<port>/<dbname>
    DATABASE_URL="postgresql://myuser:mypassword@db:5432/mydatabase"
    SHADOW_DATABASE_URL="postgresql://myuser:mypassword@db:5432/mydatabase_shadow"

    # Clé secrète pour le chiffrement des tokens JWT (TRÈS IMPORTANT)
    # Générez une clé complexe, par exemple avec : openssl rand -hex 32
    SECRET_KEY="votre_super_cle_secrete_a_changer"

    # Configuration Sentry (Optionnel, pour le suivi des erreurs)
    SENTRY_DSN=""

    # Origines autorisées pour les requêtes CORS (à adapter si votre frontend est sur un autre domaine)
    CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
    ```

2.  **Pour le Frontend :**
    Créez un fichier nommé `.env.prod` dans le dossier `frontend/`.
    ```bash
    nano frontend/.env.prod
    ```
    Ajoutez le contenu suivant. Ces variables sont accessibles côté client.

    ```env
    # URL de l'API backend accessible depuis le navigateur de l'utilisateur
    NEXT_PUBLIC_API_URL_HOST="http://<VOTRE_ADRESSE_IP_SERVEUR>:8000/api"

    # URL du WebSocket (utilisez wss:// pour une connexion sécurisée en production)
    NEXT_PUBLIC_WS_URL="ws://<VOTRE_ADRESSE_IP_SERVEUR>:8000/api"
    ```
    **Important :** Remplacez `<VOTRE_ADRESSE_IP_SERVEUR>` par l'adresse IP publique de votre serveur.

## 4. Étape 3 : Placement des Fichiers de Données

Pour l'initialisation des données, deux fichiers Excel sont utilisés.

1.  **Fichier des Utilisateurs :**
    Placez votre fichier `users.xlsx` à la **racine du projet** (`postefinances_stock/`). Ce fichier est utilisé par un script pour créer les utilisateurs en masse.

2.  **Fichier du Stock Initial :**
    Placez votre fichier `stock.xlsx` à l'intérieur du dossier `backend/`. Ce fichier est utilisé par le script d'initialisation (`seed`) pour peupler le catalogue de produits.

## 5. Étape 4 : Premier Lancement de l'Application

Ces commandes vont construire les images Docker (si elles n'existent pas localement) et lancer les conteneurs en arrière-plan.

```bash
docker compose build
docker compose up -d
```
Attendez une minute que la base de données s'initialise correctement.

## 6. Étape 5 : Initialisation de la Base de Données (Seeding)

Cette étape cruciale n'est à faire **qu'une seule fois** lors du premier déploiement, ou si vous souhaitez réinitialiser complètement la base de données.

1.  **Appliquer les Migrations de la Base de Données :**
    Cette commande prépare la structure de la base de données (tables, colonnes, etc.).
    ```bash
    docker compose exec backend pdm run prisma migrate dev
    ```

2.  **Initialiser les Données (Seed) :**
    Cette commande exécute le script `seed.py` qui va :
    - Créer les utilisateurs par défaut (admin, daf, etc.).
    - Importer tous les produits depuis votre fichier `backend/stock.xlsx`.

    ```bash
    docker compose exec backend pdm run seed
    ```

3.  **(Optionnel) Créer des Utilisateurs en Masse :**
    Si vous avez un grand nombre d'utilisateurs à créer, vous pouvez utiliser le script `batch_create_users.py` qui lit le fichier `users.xlsx`.
    ```bash
    docker compose exec backend python batch_create_users.py
    ```

Votre application est maintenant déployée et fonctionnelle ! Vous pouvez y accéder via `http://<VOTRE_ADRESSE_IP_SERVEUR>:3000`.

## 7. Procédure de Mise à Jour (Déploiement Continu)

Pour déployer les nouvelles versions de l'application à l'avenir :

1.  **Mettre à jour le code source :**
    ```bash
    git pull origin main
    ```

2.  **Télécharger les nouvelles images Docker :**
    Cette commande va chercher les nouvelles versions des images `backend` et `frontend` sur Docker Hub.
    ```bash
    docker compose pull
    ```

3.  **Redémarrer les services avec les nouvelles images :**
    L'option `--force-recreate` garantit que les anciens conteneurs sont détruits et remplacés par les nouveaux.
    ```bash
    docker compose up -d --force-recreate
    ```

4.  **(Optionnel) Nettoyer les anciennes images :**
    Pour libérer de l'espace disque, vous pouvez supprimer les anciennes images Docker qui ne sont plus utilisées.
    ```bash
    docker image prune -f
    ```
