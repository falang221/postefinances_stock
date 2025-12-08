import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from app.utils.number_generator import generate_next_number

# Mock Prisma client for testing
@pytest.fixture
def mock_prisma_client():
    mock_db = MagicMock()
    mock_db.counter = MagicMock()
    
    # Mock the upsert method
    mock_db.counter.upsert = AsyncMock(side_effect=[
        # First call for a new counter
        MagicMock(lastNumber=1),
        # Subsequent calls for existing counter
        MagicMock(lastNumber=2),
        MagicMock(lastNumber=3),
        # For a new year
        MagicMock(lastNumber=1),
    ])
    return mock_db

@pytest.mark.asyncio
async def test_generate_next_number_new_counter(mock_prisma_client):
    doc_type = "COM"
    current_year = datetime.now().year
    
    # Simulate the first call for a new counter
    mock_prisma_client.counter.upsert.side_effect = [
        MagicMock(lastNumber=1)
    ]
    
    number = await generate_next_number(mock_prisma_client, doc_type)
    
    expected_number = f"{doc_type}-{current_year}-00001"
    assert number == expected_number
    
    mock_prisma_client.counter.upsert.assert_called_once_with(
        where={"type_year": {"type": doc_type, "year": current_year}},
        data={
            "create": {"type": doc_type, "year": current_year, "lastNumber": 1},
            "update": {"lastNumber": {"increment": 1}},
        },
    )

@pytest.mark.asyncio
async def test_generate_next_number_existing_counter(mock_prisma_client):
    doc_type = "COM"
    current_year = datetime.now().year
    
    # Simulate subsequent calls for an existing counter
    mock_prisma_client.counter.upsert.side_effect = [
        MagicMock(lastNumber=2),
        MagicMock(lastNumber=3),
    ]
    
    number1 = await generate_next_number(mock_prisma_client, doc_type)
    number2 = await generate_next_number(mock_prisma_client, doc_type)
    
    assert number1 == f"{doc_type}-{current_year}-00002"
    assert number2 == f"{doc_type}-{current_year}-00003"
    
    assert mock_prisma_client.counter.upsert.call_count == 2

@pytest.mark.asyncio
async def test_generate_next_number_different_doc_type(mock_prisma_client):
    doc_type1 = "COM"
    doc_type2 = "BC"
    current_year = datetime.now().year
    
    # Simulate first call for doc_type1
    mock_prisma_client.counter.upsert.side_effect = [
        MagicMock(lastNumber=1), # for COM
        MagicMock(lastNumber=1), # for BC
    ]
    
    number1 = await generate_next_number(mock_prisma_client, doc_type1)
    number2 = await generate_next_number(mock_prisma_client, doc_type2)
    
    assert number1 == f"{doc_type1}-{current_year}-00001"
    assert number2 == f"{doc_type2}-{current_year}-00001"
    
    assert mock_prisma_client.counter.upsert.call_count == 2

@pytest.mark.asyncio
async def test_generate_next_number_new_year_resets_counter(mock_prisma_client):
    doc_type = "COM"
    
    # Mock datetime.now() for 2023
    with patch('app.utils.number_generator.datetime') as mock_dt:
        mock_dt.now.return_value = datetime(2023, 1, 1)
        mock_dt.now.year = 2023 # Ensure year attribute is also mocked
        
        # First call in 2023
        mock_prisma_client.counter.upsert.side_effect = [
            MagicMock(lastNumber=1)
        ]
        number_2023 = await generate_next_number(mock_prisma_client, doc_type)
        assert number_2023 == f"{doc_type}-2023-00001"
        
        # Mock datetime.now() for 2024
        mock_dt.now.return_value = datetime(2024, 1, 1)
        mock_dt.now.year = 2024 # Ensure year attribute is also mocked
        
        # First call in 2024
        mock_prisma_client.counter.upsert.side_effect = [
            MagicMock(lastNumber=1)
        ]
        number_2024 = await generate_next_number(mock_prisma_client, doc_type)
        assert number_2024 == f"{doc_type}-2024-00001"
    
    assert mock_prisma_client.counter.upsert.call_count == 2 # Two upsert calls in total
