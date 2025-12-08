# Guide de Déploiement avec Docker Compose

Ce guide explique comment déployer l'application Postefinances Stock en utilisant Docker et Docker Compose.

**Application Stack:**
*   **Backend:** FastAPI (Python)
*   **Frontend:** Next.js (React)
*   **Base de données:** PostgreSQL
*   **Orchestration:** Docker Compose

---

### Prérequis

Avant de commencer, assurez-vous d'avoir les éléments suivants installés sur votre serveur de déploiement (ou votre machine locale si c'est un test) :

1.  **Docker:** Le moteur de conteneurisation.
2.  **Docker Compose:** L'outil d'orchestration de conteneurs.

---

### Étapes de Déploiement

#### 1. Configuration des Variables d'Environnement

Le fichier `docker-compose.yml` fait référence à un fichier d'environnement `backend/.env.prod`. Ce fichier contient des variables sensibles pour la configuration de production de votre backend.

*   **Créez ou ouvrez** le fichier `./backend/.env.prod`.
*   **Renseignez les informations de connexion à votre base de données PostgreSQL de production :**
    *   `DATABASE_URL` et `SHADOW_DATABASE_URL` : Remplacez `myuser`, `mypassword`, `mydatabase` et `mydatabase_shadow` par des identifiants et noms de bases de données *forts et uniques* pour votre environnement de production.
        *   **Exemple :**
            ```
            DATABASE_URL="postgresql://admin_stock:secure_pass123@db:5432/prod_stock_db?schema=public"
            SHADOW_DATABASE_URL="postgresql://admin_stock:secure_pass123@db:5432/prod_stock_db_shadow?schema=public"
            ```
        *   **Note :** Le `hostname 'db'` est le nom du service PostgreSQL défini dans `docker-compose.yml`.
*   **Renseignez une clé secrète forte pour le JWT :**
    *   `SECRET_KEY` : Utilisez une clé **très sécurisée et unique** pour la production. La valeur `cLMaBU9MYvISBNG4ZzLIsQnoUiAXzSHElIcN2nFaGRo` a été générée précédemment, mais il est recommandé de la changer pour une nouvelle clé unique à votre déploiement.
        *   Vous pouvez générer une nouvelle clé avec `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`.

**Exemple de `backend/.env.prod` :**

```env
# Fichier d'environnement pour le backend en production (Docker Compose)

# --- Base de données PostgreSQL ---
# Le hostname 'db' correspond au nom du service de base de données dans docker-compose.yml
# Remplacez 'user', 'password' et 'dbname' par vos propres valeurs sécurisées
DATABASE_URL="postgresql://votre_user_db:votre_mdp_db@db:5432/votre_base_db?schema=public"
SHADOW_DATABASE_URL="postgresql://votre_user_db:votre_mdp_db@db:5432/votre_base_db_shadow?schema=public" # Utilisé par Prisma pour les migrations

# --- Clé secrète pour le JWT ---
# UTILISEZ UNE CLÉ TRÈS SÉCURISÉE ET UNIQUE POUR LA PRODUCTION !
SECRET_KEY="VOTRE_CLÉ_SECRÈTE_TRÈS_FORTE_ET_UNIQUE"
```

**Recommandation de sécurité pour la production :**
Pour une sécurité optimale, évitez de stocker les informations sensibles directement dans des fichiers sur le disque. Utilisez plutôt des variables d'environnement définies directement sur votre système hôte ou via un système de gestion de secrets (par exemple, Kubernetes Secrets, HashiCorp Vault, etc.).

#### 2. Initialisation de la Base de Données (Migrations Prisma)

Avant de lancer l'application, vous devez appliquer les migrations de base de données à votre instance PostgreSQL.

1.  **Placez-vous à la racine de votre projet** (`postefinances_stock_appV1`).
2.  **Construisez les images Docker :**
    ```bash
    docker-compose build
    ```
    Cette commande va construire les images Docker pour le `backend` (FastAPI) et le `frontend` (Next.js) selon leurs `Dockerfile` respectifs.

3.  **Appliquez les migrations Prisma :**
    ```bash
    docker-compose run --rm backend pdm run prisma migrate deploy
    ```
    *   `docker-compose run --rm backend` : Lance une nouvelle instance *temporaire* du service `backend` dans le même réseau Docker, exécute la commande spécifiée (`pdm run prisma migrate deploy`), puis supprime le conteneur une fois la commande terminée.
    *   `pdm run prisma migrate deploy` : C'est la commande Prisma qui applique toutes les migrations en attente à votre base de données connectée via `DATABASE_URL`.

#### 3. Lancement de l'Application

Une fois les migrations appliquées et les images construites, vous pouvez lancer tous les services de l'application :

1.  **Démarrez les conteneurs :**
    ```bash
    docker-compose up -d
    ```
    *   `up` : Démarre les services définis dans votre `docker-compose.yml`.
    *   `-d` : Lance les conteneurs en mode détaché (en arrière-plan), vous rendant la main dans le terminal.

#### 4. Accéder à l'Application

*   **Frontend (Application Web) :** Ouvrez votre navigateur web et naviguez vers `http://localhost:3000`.
    *   Si vous déployez sur un serveur distant, remplacez `localhost` par l'adresse IP de votre serveur ou son nom de domaine configuré.
*   **Backend (API FastAPI) :** L'API est accessible en interne par le frontend via `http://backend:8000/api`. Si vous avez configuré un reverse proxy, vous y accéderez via votre domaine (par exemple, `https://api.votreapp.com`).

#### 5. Vérifier l'État des Services

Vous pouvez vérifier que tous les conteneurs sont en cours d'exécution et en bonne santé avec la commande :
```bash
docker-compose ps
```

#### 6. Arrêter et Nettoyer

*   **Pour arrêter tous les services** (les conteneurs seront conservés) :
    ```bash
    docker-compose stop
    ```
*   **Pour arrêter et supprimer les conteneurs et les réseaux** (mais conserver les volumes de données PostgreSQL pour ne pas perdre vos données) :
    ```bash
    docker-compose down
    ```
*   **Pour arrêter et supprimer les conteneurs, les réseaux ET les volumes de données** (attention : cela efface définitivement toutes les données de votre base de données !) :
    ```bash
    docker-compose down --volumes
    ```

---

### Considérations de Production Supplémentaires (Fortement Recommandé)

Pour un déploiement robuste et sécurisé en production, considérez les points suivants :

1.  **HTTPS (SSL/TLS) :**
    *   **Pourquoi ?** Pour chiffrer toutes les communications entre les utilisateurs et votre application, protégeant ainsi les données sensibles (identifiants, etc.).
    *   **Comment ?** Configurez un reverse proxy (voir ci-dessous) pour gérer les certificats SSL/TLS. Des services comme Let's Encrypt offrent des certificats gratuits et automatisés.

2.  **Nom de Domaine Dédié :**
    *   **Pourquoi ?** Facilite l'accès à votre application et améliore le professionnalisme.
    *   **Comment ?** Achetez un nom de domaine et configurez ses enregistrements DNS (A/AAAA) pour pointer vers l'adresse IP de votre serveur.

3.  **Reverse Proxy (Nginx ou Caddy) :**
    *   **Pourquoi ?** Agit comme un point d'entrée unique pour votre application, gérant le trafic, le HTTPS, le routage intelligent vers le frontend et le backend Docker, la mise en cache, la compression, etc.
    *   **Comment ?** Ajoutez un service Nginx ou Caddy à votre `docker-compose.yml` (ou configurez-le directement sur l'hôte) et configurez-le pour proxifier les requêtes vers les services `frontend` (port 3000) et `backend` (port 8000) au sein du réseau Docker.

4.  **Gestion des Logs Centralisée :**
    *   **Pourquoi ?** Pour collecter, visualiser et analyser facilement les logs de vos applications Docker, ce qui est crucial pour le débogage et la surveillance en production.
    *   **Comment ?** Mettez en place une stack ELK (Elasticsearch, Logstash, Kibana), Grafana Loki, ou utilisez un service de gestion des logs cloud.

5.  **Stratégie de Sauvegarde de la Base de Données :**
    *   **Pourquoi ?** Vos données sont précieuses. Les volumes Docker persistants protègent contre la suppression des conteneurs, mais pas contre la corruption ou la perte du serveur.
    *   **Comment ?** Implémentez des sauvegardes régulières de votre volume `postgres_data` vers un stockage externe sécurisé.

Ce guide devrait vous aider à démarrer votre déploiement. N'hésitez pas si vous avez des questions sur une étape spécifique !