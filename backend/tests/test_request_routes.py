import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch
from main import app # Assuming your FastAPI app is in main.py
from app.api.auth import CurrentUser, UserRole, get_current_user # Import get_current_user
from app.database import get_db
from app.api.schemas import RequestCreate, RequestItemCreate, RequestResponse, UserResponse # New import
from fastapi import Depends, HTTPException
from datetime import datetime # New import for datetime.now()

# Mock the get_db dependency
@pytest.fixture(name="mock_db")
def mock_db_fixture():
    mock_db = MagicMock()
    mock_db.request = MagicMock()
    mock_db.user = MagicMock()
    mock_db.counter = MagicMock()
    mock_db.product = MagicMock() # Added mock for product

    mock_db.request.create = AsyncMock()
    mock_db.user.find_many = AsyncMock()
    mock_db.counter.upsert = AsyncMock()
    mock_db.product.find_unique = AsyncMock() # Added for stock check in create_request

    # Mocking tx() for transactional operations
    mock_db.tx = MagicMock()
    mock_db.tx.return_value.__aenter__ = AsyncMock(return_value=mock_db)
    mock_db.tx.return_value.__aexit__ = AsyncMock(return_value=None)
    
    return mock_db

# Mock the CurrentUser dependency
@pytest.fixture(name="mock_chef_service_user")
def mock_chef_service_user_fixture():
    return CurrentUser(id="user123", email="chef@example.com", name="Chef Service", role=UserRole.CHEF_SERVICE)

# Mock the generate_next_number utility
@pytest.fixture(name="mock_generate_next_number")
def mock_generate_next_number_fixture():
    with patch("app.api.routes.request.generate_next_number", new_callable=AsyncMock) as mock:
        yield mock

# Mock the websocket manager
@pytest.fixture(name="mock_websocket_manager")
def mock_websocket_manager_fixture():
    with patch("app.api.routes.request.manager", new_callable=MagicMock) as mock:
        mock.send_to_users = AsyncMock()
        yield mock

# Fixture to override get_db
@pytest.fixture
def override_get_db_dependency(mock_db):
    app.dependency_overrides[get_db] = lambda: mock_db
    yield
    app.dependency_overrides.pop(get_db)

# Fixture to override get_current_user
@pytest.fixture
def override_auth_dependency(mock_chef_service_user):
    app.dependency_overrides[get_current_user] = lambda: mock_chef_service_user
    yield
    app.dependency_overrides.pop(get_current_user)


client = TestClient(app)

@pytest.mark.asyncio
async def test_create_request_assigns_number(
    mock_db,
    mock_chef_service_user,
    mock_generate_next_number,
    mock_websocket_manager,
    override_get_db_dependency, # Use the new fixture here
    override_auth_dependency # Use the new fixture here
):
    # Arrange
    mock_generate_next_number.return_value = "COM-2023-00001"
    mock_db.product.find_unique.return_value = AsyncMock(
        id="prod1", name="Product 1", quantity=100, # Sufficient quantity
        _mock_await_return_value=MagicMock(id="prod1", name="Product 1", quantity=100) 
    )
    
    mock_db.request.create.return_value = RequestResponse.model_validate({
        "id": "req1",
        "requestNumber": "COM-2023-00001",
        "requesterId": mock_chef_service_user.id,
        "status": "TRANSMISE",
        "items": [],
        "requester": {
            "id": mock_chef_service_user.id,
            "name": mock_chef_service_user.name,
            "email": mock_chef_service_user.email,
            "role": mock_chef_service_user.role.value, # Pydantic expects string for Enum
            "department": "IT"
        },
        "approvedBy": None,
        "receivedBy": None,
        "approvals": [],
        "createdAt": datetime.now().isoformat(), # Add required fields
        "updatedAt": datetime.now().isoformat(), # Add required fields
    })    
    mock_db.user.find_many.return_value = [
        MagicMock(id="daf1", role=UserRole.DAF),
        MagicMock(id="daf2", role=UserRole.DAF)
    ]

    request_data = RequestCreate(
        items=[
            RequestItemCreate(productId="prod1", requestedQty=5),
            RequestItemCreate(productId="prod2", requestedQty=10)
        ]
    )

    # Act
    response = client.post(
        "/api/requests/",
        json=request_data.model_dump(),
        headers={"Authorization": "Bearer fake-token"} # Token is mocked away by dependency override
    )

    # Assert
    assert response.status_code == 201
    response_data = response.json()
    assert response_data["requestNumber"] == "COM-2023-00001"
    assert response_data["status"] == "TRANSMISE"
    assert response_data["requester"]["name"] == mock_chef_service_user.name

    mock_generate_next_number.assert_called_once_with(mock_db, "COM")
    mock_db.request.create.assert_called_once()
    
    # Check that the requestNumber passed to create was the generated one
    create_call_args = mock_db.request.create.call_args[1]["data"]
    assert create_call_args["requestNumber"] == "COM-2023-00001"
    
    mock_websocket_manager.send_to_users.assert_called_once_with(
        {
            "type": "daf_approval_request",
            "message": "Nouvelle demande de stock (N°COM-2023-00001) en attente de votre approbation.",
        },
        ["daf1", "daf2"],
    )

# TODO: Add more tests for error cases, e.g., product not found, unauthorized user, etc.
