from datetime import datetime
from database.generated.prisma import Prisma

async def generate_next_number(db: Prisma, doc_type: str) -> str:
    """
    Generates a new sequential number for a given document type and current year.
    The format is [DOC_TYPE]-[YEAR]-[SEQUENTIAL_NUMBER_5_DIGITS].
    The sequential number resets annually.
    """
    current_year = datetime.now().year
    
    # Find or create the counter for the current document type and year
    counter = await db.counter.upsert(
        where={
            "type_year": { # Unique constraint on (type, year)
                "type": doc_type,
                "year": current_year,
            }
        },
        data={
            "create": {
                "type": doc_type,
                "year": current_year,
                "lastNumber": 1, # Start with 1 for a new year/type
            },
            "update": {
                "lastNumber": { "increment": 1 },
            },
        },
    )
    
    # Format the sequential number with leading zeros
    sequential_number = str(counter.lastNumber).zfill(5)
    
    return f"{doc_type}-{current_year}-{sequential_number}"
