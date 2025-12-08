import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch
from main import app
from app.api.auth import CurrentUser, UserRole, get_current_user
from app.database import get_db
from app.api.schemas import PurchaseOrderCreate, PurchaseOrderItemCreate, PurchaseOrderResponse
from datetime import datetime

# Mock the get_db dependency
@pytest.fixture(name="mock_db")
def mock_db_fixture():
    mock_db = MagicMock()
    mock_db.purchaseorder = MagicMock()
    mock_db.product = MagicMock()
    mock_db.user = MagicMock()
    mock_db.counter = MagicMock()
    mock_db.purchaseorder.create = AsyncMock()
    mock_db.product.find_unique = AsyncMock()
    mock_db.user.find_many = AsyncMock() # For websocket notifications
    mock_db.counter.upsert = AsyncMock()
    return mock_db

# Mock the CurrentUser dependency
@pytest.fixture(name="mock_magasinier_user")
def mock_magasinier_user_fixture():
    return CurrentUser(id="user123", email="magasinier@example.com", name="Magasinier User", role=UserRole.MAGASINIER)

# Mock the generate_next_number utility
@pytest.fixture(name="mock_generate_next_number")
def mock_generate_next_number_fixture():
    with patch("app.crud.purchase_order.generate_next_number", new_callable=AsyncMock) as mock:
        yield mock

# Mock the websocket manager
@pytest.fixture(name="mock_websocket_manager")
def mock_websocket_manager_fixture():
    with patch("app.api.routes.purchase_order.manager", new_callable=MagicMock) as mock:
        mock.send_personal_message = AsyncMock()
        yield mock

# Fixture to override get_db
@pytest.fixture
def override_get_db_dependency(mock_db):
    app.dependency_overrides[get_db] = lambda: mock_db
    yield
    app.dependency_overrides.pop(get_db)

# Fixture to override get_current_user
@pytest.fixture
def override_auth_dependency(mock_magasinier_user):
    app.dependency_overrides[get_current_user] = lambda: mock_magasinier_user
    yield
    app.dependency_overrides.pop(get_current_user)


client = TestClient(app)

@pytest.mark.asyncio
async def test_create_purchase_order_assigns_number(
    mock_db,
    mock_magasinier_user,
    mock_generate_next_number,
    mock_websocket_manager,
    override_get_db_dependency,
    override_auth_dependency
):
    # Arrange
    mock_generate_next_number.return_value = "BC-2023-00001"
    
    mock_db.product.find_unique.return_value = MagicMock(
        id="prod1", name="Product 1", description="Desc 1", price=10.0, quantity=100, minStock=10
    )

    mock_db.purchaseorder.create.return_value = PurchaseOrderResponse.model_validate({
        "id": "po1",
        "orderNumber": "BC-2023-00001",
        "requestedById": mock_magasinier_user.id,
        "supplierName": "Supplier A",
        "totalAmount": 50.0,
        "status": "DRAFT",
        "items": [],
        "requestedBy": {
            "id": mock_magasinier_user.id,
            "name": mock_magasinier_user.name,
            "email": mock_magasinier_user.email,
            "role": mock_magasinier_user.role.value,
            "department": "Logistics"
        },
        "approvedBy": None,
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat(),
    })
    purchase_order_data = PurchaseOrderCreate(
        supplierName="Supplier A",
        items=[
            PurchaseOrderItemCreate(productId="prod1", quantity=5, unitPrice=10.0)
        ]
    )

    # Act
    response = client.post(
        "/api/purchase-orders",
        json=purchase_order_data.model_dump(),
        headers={"Authorization": "Bearer fake-token"}
    )

    # Assert
    assert response.status_code == 201
    response_data = response.json()
    assert response_data["orderNumber"] == "BC-2023-00001"
    assert response_data["status"] == "DRAFT"
    assert response_data["requestedBy"]["name"] == mock_magasinier_user.name

    mock_generate_next_number.assert_called_once_with(mock_db, "BC")
    mock_db.purchaseorder.create.assert_called_once()
    
    create_call_args = mock_db.purchaseorder.create.call_args[1]["data"]
    assert create_call_args["orderNumber"] == "BC-2023-00001"
    
    mock_websocket_manager.send_personal_message.assert_called_once_with(
        f"Un nouveau bon de commande brouillon (N° BC-2023-00001) a été créé par {mock_magasinier_user.name}.",
        UserRole.DAF.value
    )

# TODO: Add more tests for error cases, e.g., product not found, unauthorized user, etc.
