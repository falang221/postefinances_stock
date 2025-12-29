# app/crud/reports.py
from datetime import datetime, timedelta
from typing import List, Optional

from database.generated.prisma import Prisma
from app.api.schemas import StockAdjustmentType
from database.generated.prisma.enums import RequestStatus, TransactionSource, TransactionType

async def get_stock_valuation_by_category(db: Prisma):
    """
    Calcule la valeur totale du stock (quantité * coût) pour chaque catégorie de produits.

    Args:
        db: L'instance du client Prisma.

    Returns:
        Une liste de dictionnaires, chaque dictionnaire contenant :
        - categoryName: Le nom de la catégorie.
        - totalValue: La valeur totale du stock pour cette catégorie.
    """
    query = """
    SELECT
        c.name AS "categoryName",
        SUM(p.quantity * p.cost) AS "totalValue"
    FROM "Product" p
    JOIN "Category" c ON p."categoryId" = c.id
    WHERE p.quantity > 0
    GROUP BY c.name
    ORDER BY "totalValue" DESC
    """
    
    result = await db.query_raw(query)
    
    # Assurer que totalValue est un float
    for row in result:
        row['totalValue'] = float(row['totalValue'])

    return result

async def get_stock_turnover(db: Prisma, start_date: datetime, end_date: datetime):
    """
    Calcule le taux de rotation des stocks pour chaque produit sur une période donnée.

    Args:
        db: L'instance du client Prisma.
        start_date: Date de début de la période d'analyse.
        end_date: Date de fin de la période d'analyse.

    Returns:
        Un dictionnaire contenant la date du rapport et une liste d'articles de rotation.
    """
    products = await db.product.find_many()

    report_items = []
    for product in products:
        # Correctly query transactions for stock going out
        transactions_out = await db.transaction.find_many(
            where={
                'productId': product.id,
                'type': TransactionType.SORTIE,
                'source': TransactionSource.REQUEST,
                'createdAt': {
                    'gte': start_date,
                    'lte': end_date
                }
            }
        )
        total_quantity_out = sum([t.quantity for t in transactions_out])
        
        current_stock = product.quantity
        
        # Avoid division by zero if average stock is zero
        # A more accurate average stock would be (stock_start + stock_end) / 2
        # but for simplicity, we use current_stock.
        turnover_rate = 0.0
        if current_stock > 0:
            # The classic formula is Cost of Goods Sold / Average Inventory.
            # Here we simplify to Quantity Out / Current Stock for the period.
            turnover_rate = float(total_quantity_out) / current_stock
        
        report_items.append({
            "productId": product.id,
            "productName": product.name,
            "productReference": product.reference,
            "currentStock": current_stock,
            "totalQuantityOut": total_quantity_out,
            "turnoverRate": round(turnover_rate, 2)
        })
    
    return {
        "reportDate": datetime.now(),
        "items": report_items
    }


def format_timedelta(td: Optional[timedelta]) -> str:
    if td is None:
        return "N/A"
    
    seconds = int(td.total_seconds())
    
    if seconds == 0:
        return "0 minute"
    
    abs_seconds = abs(seconds)
    
    days = abs_seconds // (24 * 3600)
    abs_seconds %= (24 * 3600)
    hours = abs_seconds // 3600
    abs_seconds %= 3600
    minutes = abs_seconds // 60

    parts = []
    if days > 0:
        parts.append(f"{days} jour{'s' if days > 1 else ''}")
    if hours > 0:
        parts.append(f"{hours} heure{'s' if hours > 1 else ''}")
    if minutes > 0:
        parts.append(f"{minutes} minute{'s' if minutes > 1 else ''}")
    
    if not parts:
        return "moins d'une minute"
    return ", ".join(parts)


async def get_stock_requests_report(
    db: Prisma,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    requester_id: Optional[str] = None,
    status: Optional[str] = None
):
    """
    Récupère un rapport détaillé des demandes de stock, y compris les temps de traitement.
    """
    where_conditions = {}
    if start_date:
        where_conditions["createdAt"] = {"gte": start_date}
    if end_date:
        where_conditions.setdefault("createdAt", {})["lte"] = end_date
    if requester_id:
        where_conditions["requesterId"] = requester_id
    if status:
        where_conditions["status"] = status

    requests = await db.request.find_many(
        where=where_conditions,
        include={
            "requester": True,
            "items": {
                "include": {
                    "product": True
                }
            },
            "approvals": True,
        },
        order={
            "createdAt": "desc"
        }
    )

    report_data = []
    for request in requests:
        items_data = [
            {
                "product_name": item.product.name,
                "requested_qty": item.requestedQty,
                "approved_qty": item.approvedQty,
            }
            for item in request.items
        ]

        # Calculate processing times
        created_at = request.createdAt
        approved_at = request.approvedAt
        
        # 'transmitted_to_daf_at' can be considered request.createdAt as the request is TRANSMISE upon creation
        # or the earliest approval date that sets status to TRANSMISE
        
        approval_delay_daf = None
        if created_at and approved_at:
            approval_delay_daf = approved_at - created_at

        delivery_delay_magasinier = None
        if approved_at and request.receivedAt: # Calculate delivery delay if approved and received
            delivery_delay_magasinier = request.receivedAt - approved_at

        total_processing_time = None
        if created_at and request.receivedAt: # Total time from creation to reception
            total_processing_time = request.receivedAt - created_at

        report_data.append({
            "id": request.id,
            "request_number": request.requestNumber,
            "status": request.status,
            "requester_name": request.requester.name,
            "requester_department": request.requester.department,
            "created_at": request.createdAt,
            "items": items_data,
            "approval_delay_daf": format_timedelta(approval_delay_daf), # Renamed and formatted
            "delivery_delay_magasinier": format_timedelta(delivery_delay_magasinier), # New field
            "total_processing_time": format_timedelta(total_processing_time),
        })
    return report_data

async def get_stock_history_report(
    db: Prisma,
    page: int = 1,
    page_size: int = 10,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    product_id: Optional[str] = None,
    user_id: Optional[str] = None,
) -> dict:
    """
    Récupère l'historique des transactions de stock avec pagination et filtrage.
    """
    skip = (page - 1) * page_size
    take = page_size

    where_conditions = {}
    if start_date:
        where_conditions["createdAt"] = {"gte": start_date}
    if end_date:
        where_conditions.setdefault("createdAt", {})["lte"] = end_date
    if product_id:
        where_conditions["productId"] = product_id
    if user_id:
        where_conditions["userId"] = user_id

    transactions = await db.transaction.find_many(
        skip=skip,
        take=take,
        where=where_conditions,
        include={
            "product": True,
            "user": True,
        },
        order={
            "createdAt": "desc"
        }
    )

    total_items = await db.transaction.count(where=where_conditions)

    return {
        "items": transactions,
        "totalItems": total_items,
        "page": page,
        "pageSize": page_size,
    }


async def get_stock_value_report(db: Prisma):
    """
    Calcule la valeur totale du stock par produit et la valeur totale globale du stock.
    """
    products = await db.product.find_many(
        where={
            'quantity': {'gt': 0}
        }
    )

    report_items = []
    total_stock_value = 0.0

    for product in products:
        total_value = product.quantity * product.cost
        report_items.append({
            "productId": product.id,
            "productName": product.name,
            "productReference": product.reference,
            "quantity": product.quantity,
            "cost": product.cost,
            "totalValue": round(total_value, 2)
        })
        total_stock_value += total_value
    
    return {
        "reportDate": datetime.now(),
        "totalStockValue": round(total_stock_value, 2),
        "items": report_items
    }

async def get_stock_status_report(
    db: Prisma,
    page: int,
    page_size: int,
    status_filter: Optional[str] = None,
    category_id: Optional[str] = None,
):
    """
    Récupère un rapport paginé sur l'état des stocks.
    """
    skip = (page - 1) * page_size
    
    where_conditions = {}
    if category_id:
        where_conditions['categoryId'] = category_id

    # Fetch all products matching the basic filters first
    all_products = await db.product.find_many(
        where=where_conditions,
        include={'category': True}
    )

    # Manually calculate status and then filter
    report_items = []
    for p in all_products:
        status = "AVAILABLE"
        if p.quantity <= 0:
            status = "OUT_OF_STOCK"
        elif p.quantity <= p.minStock:
            status = "CRITICAL"
        
        if status_filter and status != status_filter:
            continue
            
        report_items.append({
            "id": p.id,
            "name": p.name,
            "reference": p.reference,
            "quantity": p.quantity,
            "minStock": p.minStock,
            "unit": p.unit,
            "location": p.location,
            "category": p.category,
            "status": status,
        })
    
    total_items = len(report_items)
    paginated_items = report_items[skip : skip + page_size]

    return {
        "items": paginated_items,
        "totalItems": total_items,
        "page": page,
        "pageSize": page_size,
    }

