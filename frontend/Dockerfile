# Dockerfile pour le frontend Next.js

# Étape 1: Build de l'application
FROM node:20-slim AS builder

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de package et installer les dépendances
COPY package.json ./
RUN npm install
# Copier le reste de l'application
COPY . .

# Définir l'URL de l'API comme un argument de build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ARG NEXT_PUBLIC_API_URL_HOST
ENV NEXT_PUBLIC_API_URL_HOST=${NEXT_PUBLIC_API_URL_HOST}

# Builder l'application pour la production
RUN npm run build

# Étape 2: Servir l'application buildée
FROM node:20-slim

WORKDIR /app

# Copier les dépendances de production depuis l'étape de build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copier l'application buildée
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Exposer le port 3000
EXPOSE 3000

# Commande pour démarrer le serveur Next.js en production
CMD ["npm", "start"]
