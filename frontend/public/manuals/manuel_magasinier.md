# Manuel de Procédure - Magasinier (Gestionnaire de Stock)

Ce manuel détaille les opérations de gestion quotidienne du stock, du traitement des demandes à l'inventaire.

## 1. Vue d'ensemble (Tableau de Bord)
Votre tableau de bord (`MagasinierDashboard`) vous alerte sur :
- Les **Alertes Stock Bas** : Articles ayant atteint leur seuil critique.
- Les **Demandes à Traiter** : Demandes validées par le DAF en attente de préparation/livraison.
- Les **Livraisons en Cours**.

## 2. Gestion des Articles (Produits)
Pour gérer le catalogue :
1. Accédez à la section "Produits" ou "Catalogue".
2. **Ajouter un produit :** Cliquez sur "Nouveau Produit", remplissez les détails (Nom, Catégorie, Stock Min, etc.).
3. **Modifier un produit :** Mettez à jour les informations (sauf la quantité réelle qui se gère par ajustement).
4. **Catégories :** Créez ou modifiez des catégories pour organiser les articles.

## 3. Traitement des Demandes (Sorties de Stock)
Lorsqu'une demande est approuvée (`APPROVED`) par le DAF :
1. Elle apparaît dans votre liste de tâches.
2. Cliquez sur "Traiter" ou "Préparer".
3. Rassemblez les articles physiquement.
4. Validez la sortie dans le système (Ceci décrémente le stock réel).
   - La demande passe au statut `DELIVERED`.
5. Vous pouvez imprimer un **Bon de Livraison** pour signature lors de la remise au Chef de Service.

## 4. Réapprovisionnement (Commandes Fournisseurs)
Pour commander du nouveau matériel :
1. Allez dans la section "Commandes" (Purchase Orders).
2. Cliquez sur "Créer une commande".
3. Sélectionnez le fournisseur et ajoutez les articles à commander.
4. Soumettez la commande.
   - Elle doit être approuvée par le DAF avant d'être envoyée au fournisseur.

## 5. Réception de Marchandise (Entrées en Stock)
À l'arrivée d'une commande fournisseur :
1. Retrouvez la commande correspondante (statut `ORDERED` ou `APPROVED`).
2. Vérifiez la marchandise.
3. Cliquez sur "Réceptionner".
4. Saisissez les quantités reçues (Gère les réceptions partielles).
   - Le stock des articles est automatiquement augmenté.

## 6. Ajustements de Stock
Pour corriger une erreur de stock (casse, perte, erreur de comptage hors inventaire) :
1. Allez dans "Ajustements".
2. Créez une demande d'ajustement (Positif ou Négatif).
3. Justifiez la raison.
   - Cet ajustement nécessite souvent la validation du DAF pour être effectif.

## 7. Inventaire (Audit)
Pour réaliser un inventaire périodique :
1. Lancez une session d'**Audit d'Inventaire**.
2. Pour chaque article, saisissez la "Quantité Comptée".
3. Le système calculera les écarts (Théorique vs Réel).
4. Soumettez l'audit. Les écarts généreront des ajustements de stock à valider.

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