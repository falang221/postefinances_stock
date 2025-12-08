
import asyncio
from database.generated.prisma.enums import UserRole
from app.api.auth import get_password_hash
from database.generated.prisma import Prisma

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
        # The order is important due to foreign key constraints
        await prisma.requestitem.delete_many()
        await prisma.approval.delete_many()
        await prisma.request.delete_many()
        await prisma.transaction.delete_many()
        await prisma.purchaseorderitem.delete_many()
        await prisma.purchaseorder.delete_many()
        await prisma.inventoryaudititem.delete_many()
        await prisma.inventoryaudit.delete_many()
        await prisma.stockadjustment.delete_many()
        await prisma.stockreceipt.delete_many()
        await prisma.product.delete_many()
        await prisma.category.delete_many()
        await prisma.user.delete_many()
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
            # Use upsert to avoid errors on re-running the seed
            await prisma.user.upsert(
                where={"username": user_data["username"]},
                data={
                    "create": user_data,
                    "update": {
                        "email": user_data["email"], # Update email as well if username is the unique identifier
                        "name": user_data["name"],
                        "password": user_data["password"],
                        "role": user_data["role"],
                        "department": user_data.get("department"), # Handle optional department
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

        products_to_add = [
            {"fournisseur": "SMK Telecom", "designation": "HP Envy X360 (Intel i7 150u, 16GB, 1TB)", "quantite": 10, "prix_unitaire": 850000},
            {"fournisseur": "MAG SUARL", "designation": "SCANNER TYPE 1 (HP 2600F1)", "quantite": 3, "prix_unitaire": 330750},
            {"fournisseur": "MAG SUARL", "designation": "SCANNER TYPE 2 (HP PRO N4600FNW1)", "quantite": 3, "prix_unitaire": 641000},
            {"fournisseur": "Office Déco", "designation": "Fauteuil Demi Ministre", "quantite": 3, "prix_unitaire": 90000},
            {"fournisseur": "Office Déco", "designation": "Fauteuil Ministre", "quantite": 3, "prix_unitaire": 75000},
            {"fournisseur": "Office Déco", "designation": "Frigo Bar", "quantite": 3, "prix_unitaire": 65000},
            {"fournisseur": "OFFICE Consommables", "designation": "Cartouche Canon 725", "quantite": 20, "prix_unitaire": 6000},
            {"fournisseur": "OFFICE Consommables", "designation": "Cartouche 207A Noir", "quantite": 2, "prix_unitaire": 25000},
            {"fournisseur": "OFFICE Consommables", "designation": "Cartouche 207A Bleu", "quantite": 1, "prix_unitaire": 30000},
            {"fournisseur": "OFFICE Consommables", "designation": "Cartouche 207A Jaune", "quantite": 1, "prix_unitaire": 30000},
            {"fournisseur": "OFFICE Consommables", "designation": "Cartouche 207A Rouge", "quantite": 1, "prix_unitaire": 30000},
            {"fournisseur": "OFFICE Consommables", "designation": "Cartouche 17A", "quantite": 75, "prix_unitaire": 8600},
            {"fournisseur": "OFFICE Consommables", "designation": "Cartouche 953 Noir", "quantite": 15, "prix_unitaire": 22000},
            {"fournisseur": "OFFICE Consommables", "designation": "Cartouche 953 Bleu", "quantite": 10, "prix_unitaire": 20000},
            {"fournisseur": "OFFICE Consommables", "designation": "Cartouche 953 Jaune", "quantite": 10, "prix_unitaire": 20000},
            {"fournisseur": "OFFICE Consommables", "designation": "Cartouche 953 Rouge", "quantite": 10, "prix_unitaire": 20000},
            {"fournisseur": "OFFICE Consommables", "designation": "Cartouche Canon GPR-18", "quantite": 5, "prix_unitaire": 4000},
            {"fournisseur": "OFFICE Consommables", "designation": "Cartouche Canon CEXV42", "quantite": 5, "prix_unitaire": 4000},
            {"fournisseur": "OFFICE Consommables", "designation": "LBP 6030 Canon 725", "quantite": 15, "prix_unitaire": 6000},
            {"fournisseur": "A.M.C - OFFICE", "designation": "Split 12000 BTU", "quantite": 6, "prix_unitaire": 166650},
            {"fournisseur": "A.M.C - OFFICE", "designation": "Split 18000 BTU", "quantite": 3, "prix_unitaire": 255000},
            {"fournisseur": "A.M.C - OFFICE", "designation": "Split 24000 BTU", "quantite": 12, "prix_unitaire": 350000},
            {"fournisseur": "OFFICE Consommables", "designation": "Stylo bleu", "quantite": 2500, "prix_unitaire": 35},
            {"fournisseur": "OFFICE Consommables", "designation": "Stylo noir", "quantite": 1000, "prix_unitaire": 35},
            {"fournisseur": "OFFICE Consommables", "designation": "Stylo rouge", "quantite": 500, "prix_unitaire": 35},
            {"fournisseur": "OFFICE Consommables", "designation": "Marqueur (bleu/noir/rouge/vert)", "quantite": 100, "prix_unitaire": 150},
            {"fournisseur": "OFFICE Consommables", "designation": "Blanco bic", "quantite": 200, "prix_unitaire": 125},
            {"fournisseur": "OFFICE Consommables", "designation": "Chemise cartonnée", "quantite": 10000, "prix_unitaire": 25},
            {"fournisseur": "OFFICE Consommables", "designation": "Crayon noir", "quantite": 200, "prix_unitaire": 50},
            {"fournisseur": "OFFICE Consommables", "designation": "Gomme", "quantite": 100, "prix_unitaire": 75},
            {"fournisseur": "OFFICE Consommables", "designation": "Registre 500p", "quantite": 3, "prix_unitaire": 4000},
            {"fournisseur": "OFFICE Consommables", "designation": "Clavier USB", "quantite": 25, "prix_unitaire": 2500},
            {"fournisseur": "OFFICE Consommables", "designation": "Classeur chrono", "quantite": 100, "prix_unitaire": 1000},
            {"fournisseur": "OFFICE Consommables", "designation": "Recharge agrafe 24/6", "quantite": 250, "prix_unitaire": 100},
            {"fournisseur": "OFFICE Consommables", "designation": "Agrafeuse GM", "quantite": 50, "prix_unitaire": 2000},
            {"fournisseur": "OFFICE Consommables", "designation": "Baguette (3mm à 14mm)", "quantite": 15, "prix_unitaire": 100},
            {"fournisseur": "OFFICE Consommables", "designation": "Surligneur", "quantite": 25, "prix_unitaire": 400},
            {"fournisseur": "OFFICE Consommables", "designation": "Scotch GM", "quantite": 50, "prix_unitaire": 250},
        ]

        def get_category_for_product(name: str):
            name = name.lower()
            if any(term in name for term in ["scanner", "hp envy", "cartouche", "clavier", "split", "btu"]):
                return category_informatique
            if any(term in name for term in ["fauteuil", "frigo", "mobilier"]):
                return category_mobilier
            return category_fourniture  # Default for office supplies

        print("Creating products...")
        import random
        import string

        for p_data in products_to_add:
            category = get_category_for_product(p_data["designation"])
            # Generate a more unique reference
            random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            reference = f"PF-{p_data['designation'][:5].upper().replace(' ', '')}-{random_suffix}"

            await prisma.product.create(data={
                "name": p_data["designation"],
                "reference": reference,
                "quantity": p_data["quantite"],
                "cost": p_data["prix_unitaire"] if p_data["prix_unitaire"] is not None else 0.0,
                "unit": "Pièce",  # default unit
                "categoryId": category.id,
            })
        print("Products created.")

    except Exception as e:
        import traceback
        print(f"An error occurred during seeding:")
        traceback.print_exc()
    finally:
        await prisma.disconnect()
        print("Seeding complete. Prisma client disconnected.")

if __name__ == "__main__":
    asyncio.run(seed_database())
