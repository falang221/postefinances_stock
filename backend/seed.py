import asyncio
from database.generated.prisma.enums import UserRole
from app.api.auth import get_password_hash
from database.generated.prisma import Prisma
import random
import string
import pandas as pd # Import pandas

# --- STOCK DATA FROM USER'S EXCEL FILE ---
EXCEL_FILE_PATH = "/app/stock.xlsx" # Absolute path within the container

async def get_or_create_category(prisma: Prisma, name: str):
    """Tries to find a category by name, creates it if not found."""
    category = await prisma.category.find_unique(where={"name": name})
    if not category:
        print(f"Category '{name}' not found, creating it.")
        category = await prisma.category.create(data={"name": name})
    return category

async def seed_database():
    prisma = Prisma()
    await prisma.connect()

    try:
        # Clear existing data for a fresh start
        print("Clearing existing data...")
        print("Deleting request items...")
        await prisma.requestitem.delete_many()
        print("Deleting approvals...")
        await prisma.approval.delete_many()
        print("Deleting requests...")
        await prisma.request.delete_many()
        print("Deleting transactions...")
        await prisma.transaction.delete_many()
        await prisma.purchaseorderitem.delete_many()
        await prisma.purchaseorder.delete_many()
        print("Deleting inventory audit items...")
        await prisma.inventoryaudititem.delete_many()
        print("Deleting inventory audits...")
        await prisma.inventoryaudit.delete_many()
        print("Deleting stock adjustments...")
        await prisma.stockadjustment.delete_many()
        print("Deleting stock receipts...")
        await prisma.stockreceipt.delete_many()
        print("Deleting products...")
        await prisma.product.delete_many()
        print("Deleting categories...")
        await prisma.category.delete_many()
        print("Deleting users...")
        await prisma.user.delete_many()
        print("Deleting counters...")
        await prisma.counter.delete_many()
        print("Database cleared.")

        # Create Users
        print("Creating users...")
        users_data = [
            {"username": "chef.service", "email": "chef.service@poste", "name": "Chef Service", "password": get_password_hash("password"), "role": UserRole.CHEF_SERVICE, "department": "Informatique"},
            {"username": "magasinier", "email": "magasinier@poste", "name": "Magasinier Principal", "password": get_password_hash("password"), "role": UserRole.MAGASINIER},
            {"username": "daf", "email": "daf@poste", "name": "Directeur Administratif et Financier", "password": get_password_hash("password"), "role": UserRole.DAF},
            {"username": "admin", "email": "admin@poste", "name": "Administrateur Système", "password": get_password_hash("password"), "role": UserRole.ADMIN},
        ]
        for user_data in users_data:
            await prisma.user.upsert(
                where={"username": user_data["username"]},
                data={
                    "create": user_data,
                    "update": {
                        "email": user_data["email"],
                        "name": user_data["name"],
                        "password": user_data["password"],
                        "role": user_data["role"],
                        "department": user_data.get("department"),
                    },
                },
            )
        print("Users created/updated.")

        # Get or Create Categories
        print("Ensuring categories exist...")
        category_fourniture = await get_or_create_category(prisma, "Fournitures de Bureau")
        category_informatique = await get_or_create_category(prisma, "Matériel Informatique")
        category_mobilier = await get_or_create_category(prisma, "Mobilier de Bureau")
        print("Categories ensured.")

        # --- Creating products from the Excel stock data ---
        print("Creating products from Excel data...")
        
        try:
            df = pd.read_excel(EXCEL_FILE_PATH, sheet_name=0)
            df.columns = df.columns.str.strip().str.lower() # Normalize column names
        except FileNotFoundError:
            print(f"ERROR: Excel file not found at {EXCEL_FILE_PATH}.")
            return
        except Exception as e:
            print(f"An error occurred while reading the Excel file: {e}")
            return
        
        required_columns = {'reference', 'quantité', 'coût unitaire (cfa)'}
        if not required_columns.issubset(df.columns):
            print(f"ERROR: The Excel file must contain columns named 'Reference', 'Quantité' and 'Coût Unitaire (CFA)'. Found: {list(df.columns)}")
            return

        # Check for duplicate references in the Excel file itself
        duplicate_references = df[df.duplicated(subset=['reference'])]
        if not duplicate_references.empty:
            print("ERROR: Duplicate product references found in the Excel file:")
            for index, row in duplicate_references.iterrows():
                print(f" - Reference: {row['reference']}, Article: {row['article']}")
            return


        for index, row in df.iterrows():
            reference = str(row.get('reference')).strip()
            article_name = str(row.get('article')).strip()
            quantity = int(row.get('quantité'))
            cost = float(str(row.get('coût unitaire (cfa)')).replace(',', '.'))
            category_name_excel = str(row.get('catégorie')).strip()

            # Get or create category based on Excel data
            category = await get_or_create_category(prisma, category_name_excel)
            
            # Use a dummy minStock
            min_stock = random.randint(5, 20) # Dummy min stock

            print(f"Creating product with reference: {reference}")
            await prisma.product.create(data={
                "name": article_name,
                "reference": reference,
                "quantity": quantity,
                "minStock": min_stock,
                "cost": cost,
                "unit": "Unité", # Default unit
                "categoryId": category.id,
            })
        print(f"Created {len(df)} products from Excel data.")

    except Exception as e:
        import traceback
        print(f"An error occurred during seeding:")
        traceback.print_exc()
    finally:
        await prisma.disconnect()
        print("Seeding complete. Prisma client disconnected.")

if __name__ == "__main__":
    asyncio.run(seed_database())