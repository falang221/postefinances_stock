# backend/batch_create_users.py
import asyncio
import pandas as pd
from prisma import Prisma
from app.api.auth import get_password_hash
from database.generated.prisma.enums import UserRole

# Chemin vers le fichier Excel des utilisateurs (depuis la racine du conteneur /app)
EXCEL_FILE_PATH = "/app/users.xlsx"

async def batch_create_users():
    prisma = Prisma()
    await prisma.connect()

    try:
        print(f"Attempting to read users from {EXCEL_FILE_PATH}...")
        df = pd.read_excel(EXCEL_FILE_PATH, sheet_name=0)
        df.columns = df.columns.str.strip().str.lower() # Normaliser les noms de colonnes

        required_columns = {'username', 'email', 'name', 'password', 'role', 'department'}
        if not required_columns.issubset(df.columns):
            print(f"ERROR: The Excel file must contain columns: {', '.join(required_columns)}.")
            print(f"Found columns: {', '.join(df.columns)}")
            return

        created_count = 0
        updated_count = 0
        skipped_count = 0

        for index, row in df.iterrows():
            username = str(row.get('username')).strip()
            email = str(row.get('email')).strip() if pd.notna(row.get('email')) else None
            name = str(row.get('name')).strip()
            password = str(row.get('password')).strip()
            role_str = str(row.get('role')).strip().upper()
            department = str(row.get('department')).strip() if pd.notna(row.get('department')) else None

            if not username or not name or not password or not role_str:
                print(f"Skipping row {index + 1}: Missing required data (username, name, password, role).")
                skipped_count += 1
                continue

            if role_str not in UserRole.__members__:
                print(f"Skipping row {index + 1} (Username: {username}): Invalid role '{role_str}'.")
                skipped_count += 1
                continue
            
            # Hash the password
            hashed_password = get_password_hash(password)

            try:
                user = await prisma.user.upsert(
                    where={"username": username},
                    data={
                        "create": {
                            "username": username,
                            "email": email,
                            "name": name,
                            "password": hashed_password,
                            "role": UserRole[role_str],
                            "department": department,
                        },
                        "update": { # Update existing user if username matches
                            "email": email,
                            "name": name,
                            "password": hashed_password,
                            "role": UserRole[role_str],
                            "department": department,
                        },
                    },
                )
                if user:
                    if user.id: # Check if it's an update or create
                        print(f"User '{username}' created or updated.")
                        if 'id' in row and row['id'] == user.id: # Simple heuristic to guess if it's an update
                            updated_count += 1
                        else:
                            created_count += 1
                else:
                    skipped_count += 1

            except Exception as e:
                print(f"Error creating/updating user '{username}': {e}")
                skipped_count += 1

        print("\n--- User Batch Creation Summary ---")
        print(f"Users created: {created_count}")
        print(f"Users updated: {updated_count}")
        print(f"Users skipped (errors/missing data): {skipped_count}")

    except FileNotFoundError:
        print(f"ERROR: Excel file not found at {EXCEL_FILE_PATH}.")
        print("Please ensure 'users.xlsx' is in the project root.")
    except Exception as e:
        import traceback
        print(f"An unexpected error occurred: {e}")
        traceback.print_exc()
    finally:
        await prisma.disconnect()
        print("Batch user creation complete. Prisma client disconnected.")

if __name__ == "__main__":
    asyncio.run(batch_create_users())