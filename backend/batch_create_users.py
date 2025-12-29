# backend/batch_create_users.py
import asyncio
import pandas as pd
import requests
from typing import Optional

# --- Configuration ---
BASE_URL = "http://localhost:8000/api"
LOGIN_ENDPOINT = f"{BASE_URL}/auth/login"
USERS_ENDPOINT = f"{BASE_URL}/users/"
EXCEL_FILE_PATH = "/app/users.xlsx" # Absolute path within the container

# Admin credentials from the seed script
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "password"

# Mapping from French role names in Excel to UserRole enum values in the backend
ROLE_MAPPING = {
    "chef de service": "CHEF_SERVICE",
    "admin": "ADMIN",
    "magasinier": "MAGASINIER",
    "daf": "DAF",
    "super observateur": "SUPER_OBSERVATEUR",
}


def get_auth_token(session: requests.Session, username: str, password: str) -> Optional[str]:
    """Obtains a JWT token and sets it in the session header."""
    print(f"Attempting to log in as {username}...")
    try:
        response = session.post(LOGIN_ENDPOINT, json={"username": username, "password": password})
        response.raise_for_status()
        token = response.json().get("access_token")
        if not token:
            print("Error: Access token not found in login response.")
            return None
        
        session.headers.update({"Authorization": f"Bearer {token}"})
        print("Login successful. Token obtained.")
        return token
    except requests.exceptions.RequestException as e:
        print(f"Login failed: {e}")
        if e.response is not None:
            print(f"Response: {e.response.status_code} - {e.response.text}")
        return None


def create_user(session: requests.Session, user_data: dict) -> bool:
    """Creates a single user via the API."""
    print(f"Creating user with username: {user_data.get('username')}...")
    try:
        response = session.post(USERS_ENDPOINT, json=user_data)
        response.raise_for_status()
        print(f"  -> Success: User '{user_data.get('username')}' created with ID: {response.json()['id']}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"  -> Failed to create user '{user_data.get('username')}': {e}")
        if e.response is not None:
            print(f"     Response: {e.response.status_code} - {e.response.text}")
        return False

def main():
    """Main function to run the user creation script."""
    print("--- Starting Batch User Creation Script ---")

    try:
        df = pd.read_excel(EXCEL_FILE_PATH, sheet_name=0)
        df.columns = df.columns.str.strip().str.lower()
    except FileNotFoundError:
        print(f"ERROR: Excel file not found at {EXCEL_FILE_PATH}.")
        print("Please ensure you have mounted the 'users.xlsx' file in docker-compose.yml.")
        return
    except Exception as e:
        print(f"An error occurred while reading the Excel file: {e}")
        return

    required_columns = {'nom', 'login', 'mot de passe', 'role'}
    if not required_columns.issubset(df.columns):
        print(f"ERROR: The Excel file must contain columns named 'Nom', 'login', 'mot de passe', and 'Role'. Found: {list(df.columns)}")
        return

    with requests.Session() as session:
        token = get_auth_token(session, ADMIN_USERNAME, ADMIN_PASSWORD)
        if not token:
            print("Aborting script due to authentication failure.")
            return

        success_count = 0
        fail_count = 0

        for index, row in df.iterrows():
            login = str(row.get('login', '')).strip()
            nom = str(row.get('nom', '')).strip()
            mot_de_passe = str(row.get('mot de passe', '')).strip()
            role_excel = str(row.get('role', '')).strip().lower()
            departement = str(row.get('département', '')).strip() if 'département' in row and pd.notna(row.get('département')) else None

            if not all([login, nom, mot_de_passe, role_excel]):
                print(f"Skipping row {index + 2}: Missing one or more required fields (login, nom, mot de passe, role).")
                fail_count += 1
                continue
            
            role_api = ROLE_MAPPING.get(role_excel)
            if not role_api:
                print(f"Skipping user '{login}': Role '{role_excel}' is not valid. Valid roles are: {list(ROLE_MAPPING.keys())}")
                fail_count += 1
                continue

            user_payload = {
                "username": login,
                "name": nom,
                "password": mot_de_passe,
                "role": role_api,
                "department": departement,
                "email": None # Assuming no email from Excel for now
            }
            
            if create_user(session, user_payload):
                success_count += 1
            else:
                fail_count += 1
    
    print("\n--- Script Summary ---")
    print(f"Successful user creations: {success_count}")
    print(f"Failed/Skipped items: {fail_count}")
    print("--- Batch User Creation Finished ---")


if __name__ == "__main__":
    main()
