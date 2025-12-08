# Dockerfile pour le backend FastAPI

# Étape 1: Base avec Python
FROM python:3.11-slim

# Définir le répertoire de travail
WORKDIR /app

# Installer les dépendances système pour WeasyPrint et autres modules natifs
RUN apt-get update && apt-get install -y \
    build-essential \
    libffi-dev \
    libcairo2 \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libxml2-dev \
    libxslt1-dev \
    && rm -rf /var/lib/apt/lists/*

# Installer les dépendances Python via PDM (gestionnaire de paquets)
RUN pip install pdm

# Copier les fichiers de projet
COPY pyproject.toml pdm.lock README.md /app/

# Installer les dépendances de production uniquement
RUN pdm install --prod --no-lock

# Copier le reste de l'application
COPY . .

# Générer le client Prisma
RUN pdm run prisma generate --schema ./database/schema.prisma

# Exposer le port sur lequel l'application tournera
EXPOSE 8000

# Commande pour lancer l'application en production avec Gunicorn
# Gunicorn est un serveur WSGI de production robuste.
# UvicornWorker permet à Gunicorn de lancer des applications ASGI comme FastAPI.
CMD ["pdm", "run", "gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "main:app", "-b", "0.0.0.0:8000"]
