
from app.api.auth import CurrentUser
from database.generated.prisma import Prisma
from database.generated.prisma.models import StockAdjustment
from database.generated.prisma.enums import StockAdjustmentStatus, TransactionType, TransactionSource
import logging
from datetime import datetime # Import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_stock_adjustment(
    db: Prisma,
    user: CurrentUser,
    product_id: str,
    new_quantity: int,
    reason: str,
) -> StockAdjustment:
    """
    Crée un ajustement de stock direct et approuvé pour un produit.
    Cette opération est réservée aux administrateurs.
    """
    if new_quantity < 0:
        raise ValueError("La nouvelle quantité ne peut pas être négative.")

    async with db.tx() as transaction:
        # 1. Récupérer le produit et verrouiller la ligne pour la mise à jour
        product = await transaction.product.find_unique(where={"id": product_id})

        if not product:
            raise ValueError("Produit non trouvé.")

        current_quantity = product.quantity
        
        # Si la quantité est la même, ne rien faire
        if new_quantity == current_quantity:
            logger.info(f"La quantité pour le produit {product_id} est déjà {new_quantity}. Aucun ajustement nécessaire.")
            # On pourrait retourner une réponse spécifique ou simplement l'état actuel
            # Pour l'instant, on ne crée pas d'ajustement. On pourrait vouloir le logger différemment.
            return None # Ou lever une exception indiquant qu'aucun changement n'a été fait

        # 2. Calculer la différence
        difference = new_quantity - current_quantity
        adjustment_type = TransactionType.ENTREE if difference > 0 else TransactionType.SORTIE
        adjustment_quantity = abs(difference)

        # 3. Mettre à jour la quantité du produit
        await transaction.product.update(
            where={"id": product_id},
            data={"quantity": new_quantity},
        )

        # 4. Créer l'enregistrement de l'ajustement de stock
        new_adjustment = await transaction.stockadjustment.create(
            data={
                "productId": product_id,
                "quantity": adjustment_quantity,
                "type": adjustment_type,
                "reason": reason,
                "requestedById": user.id,
                "status": StockAdjustmentStatus.APPROVED, # Approuvé automatiquement pour l'admin
                "approvedById": user.id, # L'admin s'auto-approuve
                "approvedAt": datetime.now(), # Changed from "now()" to datetime.now()
            }
        )

        # 5. Créer une transaction pour l'historique
        await transaction.transaction.create(
            data={
                "productId": product_id,
                "userId": user.id,
                "type": adjustment_type,
                "source": TransactionSource.ADJUSTMENT,
                "quantity": adjustment_quantity,
            }
        )
        
        logger.info(f"Ajustement de stock créé pour le produit {product_id}. Quantité changée de {current_quantity} à {new_quantity}.")

        return new_adjustment
