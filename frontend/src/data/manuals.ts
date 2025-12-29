export interface ManualSection {
  title: string;
  content: string[];
}

export const MANUALS: Record<string, ManualSection[]> = {
  CHEF_SERVICE: [
    {
      title: "1. Connexion",
      content: [
        "Accédez à la page de connexion.",
        "Entrez votre identifiant et mot de passe.",
        "Cliquez sur 'Se connecter' pour accéder au Tableau de Bord."
      ]
    },
    {
      title: "2. Tableau de Bord",
      content: [
        "Votre tableau de bord affiche vos demandes récentes.",
        "Suivez le statut : En attente, Approuvée, Rejetée, Livrée, Terminée."
      ]
    },
    {
      title: "3. Créer une Demande",
      content: [
        "Cliquez sur 'Nouvelle Demande'.",
        "Sélectionnez les articles et la quantité.",
        "Ajoutez un motif et envoyez.",
        "La demande passe en statut 'En attente d'approbation'."
      ]
    },
    {
      title: "4. Suivi",
      content: [
        "'En attente d'approbation' : En attente du DAF.",
        "'Approuvée' : En attente du Magasinier.",
        "'Livrée' : Matériel prêt/livré.",
        "'Terminée' : Réception confirmée par vous."
      ]
    },
    {
      title: "5. Réception et Litiges",
      content: [
        "Vérifiez le matériel reçu.",
        "Cliquez sur 'Confirmer la réception' pour clore la demande.",
        "En cas de problème, signalez un 'Litige à la réception'."
      ]
    }
  ],
  MAGASINIER: [
    {
      title: "1. Tableau de Bord",
      content: [
        "Surveillez les alertes de stock bas.",
        "Visualisez les demandes approuvées à traiter.",
        "Suivez les livraisons en cours."
      ]
    },
    {
      title: "2. Gestion des Articles",
      content: [
        "Ajoutez ou modifiez des produits via le catalogue.",
        "Gérez les catégories de produits."
      ]
    },
    {
      title: "3. Traitement des Demandes",
      content: [
        "Traitez les demandes au statut 'Approuvée'.",
        "Préparez le matériel et validez la sortie.",
        "La demande passe en 'Livrée'. Imprimez le Bon de Livraison."
      ]
    },
    {
      title: "4. Réapprovisionnement",
      content: [
        "Créez des Commandes Fournisseurs (Purchase Orders).",
        "Faites approuver par le DAF."
      ]
    },
    {
      title: "5. Réception Fournisseur",
      content: [
        "Réceptionnez les commandes au statut 'Approuvée'.",
        "Saisissez les quantités reçues pour mettre à jour le stock."
      ]
    },
    {
      title: "6. Inventaire & Ajustements",
      content: [
        "Réalisez des audits d'inventaire réguliers.",
        "Créez des ajustements de stock (perte, casse) soumis à validation."
      ]
    }
  ],
  DAF: [
    {
      title: "1. Rôle et Responsabilités",
      content: [
        "Valider les mouvements de stock et les dépenses.",
        "Contrôler la valeur du stock."
      ]
    },
    {
      title: "2. Validation des Demandes",
      content: [
        "Examinez les demandes 'En attente d'approbation' des Chefs de Service.",
        "Approuvez pour autoriser la sortie de stock.",
        "Rejetez si la demande est injustifiée."
      ]
    },
    {
      title: "3. Validation des Commandes",
      content: [
        "Contrôlez les Commandes Fournisseurs créées par le Magasinier.",
        "Approuvez pour lancer l'achat."
      ]
    },
    {
      title: "4. Rapports",
      content: [
        "Consultez la Valeur du Stock.",
        "Analysez la rotation des stocks et l'historique des mouvements."
      ]
    }
  ],
  ADMIN: [
    {
      title: "1. Gestion Utilisateurs",
      content: [
        "Créez et gérez les comptes utilisateurs.",
        "Attribuez les rôles (Admin, Magasinier, DAF, etc.).",
        "Réinitialisez les mots de passe."
      ]
    },
    {
      title: "2. Configuration",
      content: [
        "Configurez les paramètres globaux.",
        "Accès complet à toutes les fonctionnalités en cas de besoin."
      ]
    }
  ],
  SUPER_OBSERVATEUR: [
    {
      title: "1. Vue d'ensemble",
      content: [
        "Accès en lecture seule pour l'audit.",
        "Visualisation de tous les tableaux de bord."
      ]
    },
    {
      title: "2. Rapports",
      content: [
        "Accès illimité à tous les rapports (Valeur, Historique, Inventaires).",
        "Export des données pour analyse."
      ]
    }
  ]
};