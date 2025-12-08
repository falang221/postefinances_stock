import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime
from typing import List, Optional

from app.crud.purchase_order import (
    create_purchase_order,
    get_purchase_order,
    get_purchase_orders,
    update_purchase_order,
    delete_purchase_order,
)
from app.api.schemas import PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderItemCreate
from database.generated.prisma import Prisma
from database.generated.prisma.models import User, Product, PurchaseOrder
from database.generated.prisma.enums import PurchaseOrderStatus, UserRole, TransactionType, TransactionSource

# Helper to create a valid user instance for tests
def create_test_user(id, email, name, role, department):
    return User(
        id=id,
        email=email,
        name=name,
        role=role,
        password="hashed_password",
        department=department,
        createdAt=datetime.now(),
        updatedAt=datetime.now(),
        requestsCreated=[],
        requestsApproved=[],
        requestsReceived=[],
        approvals=[],
        transactions=[],
        requestedStockAdjustments=[],
        approvedStockAdjustments=[],
        requestedStockReceipts=[],
        approvedStockReceipts=[],
        requestedPurchaseOrders=[],
        approvedPurchaseOrders=[],
        createdAudits=[],
        refreshToken=None,
    )

# Setup Fixtures
@pytest.fixture(name="mock_db")
def mock_db_fixture():
    mock_db = MagicMock(spec=Prisma)
    
    # Configure all awaited methods with AsyncMock
    mock_db.product.find_unique = AsyncMock()
    mock_db.purchaseorder.create = AsyncMock()
    mock_db.purchaseorder.find_unique = AsyncMock()
    mock_db.purchaseorder.find_many = AsyncMock()
    mock_db.purchaseorder.update = AsyncMock()
    mock_db.purchaseorder.delete = AsyncMock()
    mock_db.purchaseorderitem.delete_many = AsyncMock()
    mock_db.product.update = AsyncMock()
    mock_db.transaction.create = AsyncMock()

    # Mocking tx() for transactional operations
    mock_db.tx.return_value.__aenter__ = AsyncMock(return_value=mock_db)
    mock_db.tx.return_value.__aexit__ = AsyncMock(return_value=None)
    
    return mock_db

@pytest.fixture(name="mock_user")
def mock_user_fixture():
    return create_test_user(
        id="test_user_id",
        email="test@example.com",
        name="Test User",
        role=UserRole.MAGASINIER,
        department="Test Department",
    )

@pytest.fixture(name="mock_generate_next_number")
def mock_generate_next_number_fixture():
    # Patch where it's USED
    with patch("app.crud.purchase_order.generate_next_number", new_callable=AsyncMock) as mock:
        yield mock

@pytest.fixture(name="mock_websocket_manager")
def mock_websocket_manager_fixture():
    # Patch where it's USED
    with patch("app.crud.purchase_order.manager", new_callable=AsyncMock) as mock:
        yield mock

# Tests for create_purchase_order
@pytest.mark.asyncio
async def test_create_purchase_order_success(mock_db, mock_user, mock_generate_next_number):
    # Arrange
    mock_generate_next_number.return_value = "BC-TEST-001"
    mock_db.product.find_unique.return_value = MagicMock(id="prod1", cost=10.0)
    mock_db.purchaseorder.create.return_value = MagicMock(id="po1", orderNumber="BC-TEST-001", status=PurchaseOrderStatus.DRAFT)

    purchase_order_data = PurchaseOrderCreate(
        supplierName="Test Supplier",
        items=[PurchaseOrderItemCreate(productId="prod1", quantity=2, unitPrice=10.0)]
    )

    # Act
    # In create_purchase_order, `current_user.userId` is used. But Prisma's User model has `id`. Let's mock a user that has both for simplicity
    po = await create_purchase_order(mock_db, purchase_order_data, mock_user)

    # Assert
    mock_generate_next_number.assert_called_once_with(mock_db, "BC")
    mock_db.product.find_unique.assert_called_once_with(where={"id": "prod1"})
    mock_db.purchaseorder.create.assert_called_once()
    assert po.orderNumber == "BC-TEST-001"
    assert po.status == PurchaseOrderStatus.DRAFT

@pytest.mark.asyncio
async def test_create_purchase_order_product_not_found(mock_db, mock_user, mock_generate_next_number):
    # Arrange
    mock_generate_next_number.return_value = "BC-TEST-002"
    mock_db.product.find_unique.return_value = None

    purchase_order_data = PurchaseOrderCreate(
        supplierName="Test Supplier",
        items=[PurchaseOrderItemCreate(productId="non_existent_prod", quantity=2, unitPrice=10.0)]
    )

    # Act & Assert
    with pytest.raises(ValueError, match="Product with ID non_existent_prod not found"):
        await create_purchase_order(mock_db, purchase_order_data, mock_user)
    
    mock_generate_next_number.assert_called_once_with(mock_db, "BC")
    mock_db.product.find_unique.assert_called_once_with(where={"id": "non_existent_prod"})
    mock_db.purchaseorder.create.assert_not_called()

# Tests for get_purchase_order
@pytest.mark.asyncio
async def test_get_purchase_order_success(mock_db):
    # Arrange
    expected_po = MagicMock(id="po1", orderNumber="BC-TEST-001")
    mock_db.purchaseorder.find_unique.return_value = expected_po

    # Act
    po = await get_purchase_order(mock_db, "po1")

    # Assert
    mock_db.purchaseorder.find_unique.assert_called_once_with(
        where={"id": "po1"},
        include={
            "requestedBy": True,
            "approvedBy": True,
            "items": {"include": {"product": True}},
        },
    )
    assert po == expected_po

@pytest.mark.asyncio
async def test_get_purchase_order_not_found(mock_db):
    # Arrange
    mock_db.purchaseorder.find_unique.return_value = None

    # Act
    po = await get_purchase_order(mock_db, "non_existent_po")

    # Assert
    assert po is None

# Tests for get_purchase_orders
@pytest.mark.asyncio
async def test_get_purchase_orders_no_filter(mock_db):
    # Arrange
    expected_pos = [MagicMock(id="po1"), MagicMock(id="po2")]
    mock_db.purchaseorder.find_many.return_value = expected_pos

    # Act
    pos = await get_purchase_orders(mock_db)

    # Assert
    assert pos == expected_pos

# Tests for update_purchase_order
@pytest.mark.asyncio
async def test_update_purchase_order_not_found(mock_db, mock_user):
    # Arrange
    mock_db.purchaseorder.find_unique.return_value = None
    update_data = PurchaseOrderUpdate(supplierName="New Supplier")

    # Act & Assert
    with pytest.raises(ValueError, match="Purchase Order not found"):
        await update_purchase_order(mock_db, "non_existent_po", update_data, mock_user)

@pytest.mark.asyncio
async def test_update_purchase_order_daf_approves_success(mock_db, mock_websocket_manager):
    # Arrange
    daf_user = create_test_user("daf_user_id", "daf@example.com", "DAF User", UserRole.DAF, "Finance")
    
    existing_po = MagicMock(id="po1", orderNumber="BC-TEST-001", requestedById="requester_id")
    mock_db.purchaseorder.find_unique.return_value = existing_po
    
    update_data = PurchaseOrderUpdate(status=PurchaseOrderStatus.APPROVED)

    # Act
    await update_purchase_order(mock_db, "po1", update_data, daf_user)

    # Assert
    mock_db.purchaseorder.update.assert_called_once()
    update_call_data = mock_db.purchaseorder.update.call_args[1]['data']
    assert update_call_data['status'] == PurchaseOrderStatus.APPROVED
    mock_websocket_manager.send_personal_message.assert_called_once()

# Tests for delete_purchase_order
@pytest.mark.asyncio
async def test_delete_purchase_order_success(mock_db):
    # Arrange
    mock_db.purchaseorder.delete.return_value = MagicMock(id="po1")

    # Act
    await delete_purchase_order(mock_db, "po1")

    # Assert
    mock_db.purchaseorderitem.delete_many.assert_called_once_with(where={"purchaseOrderId": "po1"})
    mock_db.purchaseorder.delete.assert_called_once_with(
        where={"id": "po1"},
        include={
            "requestedBy": True,
            "approvedBy": True,
            "items": {"include": {"product": True}},
        },
    )

@pytest.mark.asyncio
async def test_delete_purchase_order_not_found(mock_db):
    # Arrange
    # Prisma's delete raises an error if the record is not found. We simulate this.
    mock_db.purchaseorder.delete.side_effect = Exception("Record not found")

    # Act & Assert
    with pytest.raises(Exception, match="Record not found"):
        await delete_purchase_order(mock_db, "non_existent_po")
