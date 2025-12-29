# Manuel de Procédure - Administrateur (Admin)

Ce manuel couvre les tâches d'administration système et de gestion des utilisateurs.

## 1. Gestion des Utilisateurs
L'administrateur est responsable de la création et de la gestion des comptes d'accès.
1. Accédez au panneau d'administration ou à la section "Utilisateurs".
2. **Créer un utilisateur :**
   - Renseignez le `Username` (Identifiant unique).
   - Définissez le mot de passe initial.
   - **Attribuez le Rôle :** (Important) Choisissez parmi `ADMIN`, `CHEF_SERVICE`, `MAGASINIER`, `DAF`, `SUPER_OBSERVATEUR`.
   - Renseignez le département (si applicable, ex: pour Chef de Service).
3. **Modifier/Désactiver :**
   - Vous pouvez réinitialiser les mots de passe ou désactiver un compte en cas de départ.

## 2. Configuration Système
Selon les besoins, l'administrateur peut :
- Gérer les catégories de produits.
- Configurer certains paramètres globaux de l'application.

## 3. Rôle de Super-Utilisateur
En tant qu'Administrateur, vous disposez généralement des droits cumulés pour :
- Effectuer des opérations de Magasinier (secours).
- Consulter tous les rapports.
- Voir l'intégralité des logs d'activité pour l'audit technique.

## 4. Maintenance
- Assurez-vous que les sauvegardes de la base de données sont effectuées (selon la politique informatique en place).
- Surveillez les logs du serveur pour détecter d'éventuelles erreurs.

### Changer Votre Mot de Passe

Chaque utilisateur peut changer son propre mot de passe à tout moment pour des raisons de sécurité.

**Procédure :**

1.  **Ouvrir le Menu Utilisateur :** Cliquez sur votre avatar (le cercle avec votre initiale) en haut à droite de la barre de navigation.
2.  **Accéder au Profil :** Dans le menu qui apparaît, cliquez sur **"Profile"**.
3.  **Remplir le Formulaire :**
    *   Dans la section "Changer le mot de passe", entrez votre mot de passe actuel dans le champ **"Mot de passe actuel"**.
    *   Entrez votre nouveau mot de passe dans le champ **"Nouveau mot de passe"**.
    *   Confirmez votre nouveau mot de passe dans le champ **"Confirmer le nouveau mot de passe"**.
4.  **Mettre à Jour :** Cliquez sur le bouton **"METTRE À JOUR LE MOT DE PASSE"**.

Si votre mot de passe actuel est correct, il sera immédiatement mis à jour. Vous recevrez une notification de succès.