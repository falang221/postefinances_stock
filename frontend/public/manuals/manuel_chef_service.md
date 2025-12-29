# Manuel de Procédure - Chef de Service (Utilisateur Demandeur)

Ce manuel décrit les étapes pour utiliser l'application de gestion de stock en tant que Chef de Service. Votre rôle principal est de formuler des demandes de matériel et d'en assurer le suivi jusqu'à la réception.

## 1. Connexion
1. Accédez à la page de connexion de l'application.
2. Entrez votre identifiant (Username) et votre mot de passe.
3. Cliquez sur "Se connecter".
4. Vous serez redirigé vers votre tableau de bord personnel (`ChefServiceDashboard`).

## 2. Tableau de Bord
Votre tableau de bord affiche :
- Un résumé de vos demandes récentes.
- Le statut de chaque demande (En attente, Approuvée, Rejetée, Livrée, Terminée).
- Des notifications en cas de changement de statut.

## 3. Créer une Demande de Matériel
Pour obtenir des articles du stock :
1. Sur le tableau de bord, localisez le bouton ou la section "Nouvelle Demande".
2. Sélectionnez les articles souhaités depuis le catalogue.
3. Indiquez la quantité nécessaire pour chaque article.
4. Ajoutez un motif ou une observation si nécessaire.
5. Cliquez sur "Envoyer la demande".
   - **Statut initial :** La demande passe au statut `PENDING_APPROVAL` (En attente d'approbation par le DAF).

## 4. Suivi d'une Demande
Vous pouvez suivre l'évolution de votre demande via les statuts suivants :
- **PENDING_APPROVAL :** En attente de validation par le DAF.
- **APPROVED :** Validée par le DAF, en attente de traitement par le Magasinier.
- **REJECTED :** Refusée par le DAF (le motif sera affiché).
- **IN_PREPARATION :** Le magasinier prépare votre commande.
- **DELIVERED :** Le matériel a été sorti du stock et vous est destiné.

## 5. Réception et Clôture
Une fois le matériel physiquement reçu :
1. Ouvrez le détail de la demande concernée (statut `DELIVERED`).
2. Vérifiez que les articles et quantités correspondent.
3. Cliquez sur le bouton "Confirmer la réception".
   - La demande passe au statut `COMPLETED`.

## 6. Gestion des Litiges (Réception non conforme)
Si le matériel reçu ne correspond pas (quantité incorrecte, article abîmé) :
1. Ne confirmez pas la réception tout de suite.
2. Utilisez l'option "Signaler un litige" ou "Refuser la réception" sur la demande.
3. Décrivez le problème (ex: "Manque 2 stylos").
4. La demande passera en statut `LITIGE_RECEPTION` pour traitement par le Magasinier/Admin.

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