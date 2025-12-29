# backend/update_stock_script.py
import asyncio
import pandas as pd
import requests
from typing import Optional

# --- Configuration ---
# This script runs inside the backend container, so it can connect to the API directly.
BASE_URL = "http://localhost:8000/api"
LOGIN_ENDPOINT = f"{BASE_URL}/auth/login"
PRODUCTS_ENDPOINT = f"{BASE_URL}/products"
EXCEL_FILE_PATH = "../stock.xlsx"  # Path relative to the script location in the backend folder

# Admin credentials from the seed script
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "password"


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


def get_product_by_reference(session: requests.Session, reference: str) -> Optional[dict]:
    """Retrieves a product by its exact reference number."""
    try:
        # The search parameter is efficient for finding potential matches
        response = session.get(f"{PRODUCTS_ENDPOINT}/", params={"search": reference})
        response.raise_for_status()
        products = response.json()
        
        # We must find the *exact* match from the search results
        for product in products:
            if product.get("reference") == reference:
                return product
        
        return None
    except requests.exceptions.RequestException as e:
        print(f"Failed to get product for reference '{reference}': {e}")
        return None

def update_product_quantity(session: requests.Session, product_id: str, new_quantity: int) -> bool:
    """Updates the quantity of a single product."""
    print(f"Updating product ID {product_id} to quantity {new_quantity}...")
    try:
        payload = {"quantity": new_quantity}
        response = session.put(f"{PRODUCTS_ENDPOINT}/{product_id}", json=payload)
        response.raise_for_status()
        print(f"  -> Success: Product {product_id} quantity set to {new_quantity}.")
        return True
    except requests.exceptions.RequestException as e:
        print(f"  -> Failed to update product {product_id}: {e}")
        if e.response is not None:
            print(f"     Response: {e.response.status_code} - {e.response.text}")
        return False

def main():
    """Main function to run the stock update script."""
    print("--- Starting Stock Update Script ---")

    try:
        # Read the Excel file
        df = pd.read_excel(EXCEL_FILE_PATH, sheet_name=0)
        print(f"Successfully loaded {len(df)} rows from {EXCEL_FILE_PATH}")
        # Standardize column names: remove leading/trailing spaces and convert to lowercase
        df.columns = df.columns.str.strip().str.lower()
    except FileNotFoundError:
        print(f"ERROR: Excel file not found at {EXCEL_FILE_PATH}.")
        print("Please ensure the file exists at the root of the project.")
        return
    except Exception as e:
        print(f"An error occurred while reading the Excel file: {e}")
        return

    # Check for required columns
    required_columns = {'reference', 'quantité'}
    if not required_columns.issubset(df.columns):
        print(f"ERROR: The Excel file must contain columns named 'Reference' and 'Quantité'. Found: {list(df.columns)}")
        return

    # Start a requests session
    with requests.Session() as session:
        # 1. Authenticate
        token = get_auth_token(session, ADMIN_USERNAME, ADMIN_PASSWORD)
        if not token:
            print("Aborting script due to authentication failure.")
            return

        # 2. Iterate and update
        success_count = 0
        fail_count = 0

        for index, row in df.iterrows():
            reference = row.get('reference')
            quantity = row.get('quantité')

            # Validate row data
            if pd.isna(reference):
                print(f"Skipping row {index + 2}: Reference is empty.")
                fail_count += 1
                continue
            
            if pd.isna(quantity) or not isinstance(quantity, (int, float)):
                print(f"Skipping row {index + 2} for reference '{reference}': Invalid or empty quantity '{quantity}'.")
                fail_count += 1
                continue
            
            new_quantity = int(quantity)

            # Find product by reference
            product = get_product_by_reference(session, reference)

            if not product:
                print(f"Warning: Product with reference '{reference}' not found in database. Skipping.")
                fail_count += 1
                continue
            
            # Update the product's quantity
            if update_product_quantity(session, product['id'], new_quantity):
                success_count += 1
            else:
                fail_count += 1
    
    print("\n--- Script Summary ---")
    print(f"Successful updates: {success_count}")
    print(f"Failed/Skipped items: {fail_count}")
    print("--- Stock Update Script Finished ---")


if __name__ == "__main__":
    main()