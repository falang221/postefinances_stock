import requests
import json
import os
import pandas as pd
import asyncio
from datetime import datetime

# --- Configuration ---
BASE_URL = "http://localhost:8000/api"
LOGIN_ENDPOINT = f"{BASE_URL}/auth/login"
PRODUCTS_ENDPOINT = f"{BASE_URL}/products"
ADJUSTMENT_ENDPOINT = f"{BASE_URL}/stock-adjustments/"

EXCEL_FILE_PATH = "../stock.xlsx" # Relative to backend directory, so 'stock.xlsx' in project root

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "password"

# --- Helper Functions (reused from previous script) ---

def get_auth_token(username, password):
    """Obtains a JWT token for the given username/password."""
    print(f"Attempting to log in as {username}...")
    try:
        response = requests.post(LOGIN_ENDPOINT, json={"username": username, "password": password})
        response.raise_for_status()
        token = response.json().get("access_token")
        if not token:
            raise ValueError("Access token not found in response.")
        print("Login successful. Token obtained.")
        return token
    except requests.exceptions.RequestException as e:
        print(f"Login failed: {e}")
        if e.response is not None:
            print(f"Response: {e.response.status_code} - {e.response.text}")
        return None

def get_all_products(token):
    """Retrieves all products from the backend."""
    headers = {"Authorization": f"Bearer {token}"}
    all_products = []
    page = 1
    page_size = 100 # Adjust page size if needed

    while True:
        try:
            response = requests.get(PRODUCTS_ENDPOINT, headers=headers, params={"page": page, "pageSize": page_size})
            response.raise_for_status()
            products_page = response.json()
            if not products_page: # FastAPI's list of products is returned directly, not paginated in this endpoint
                break 
            all_products.extend(products_page)
            # This API doesn't seem to have explicit pagination meta data for 'totalItems' etc.
            # Assuming it returns all products in one go or requires manual page incrementing until empty.
            # For now, let's assume it returns all products directly for simplicity.
            # If the /products endpoint gets paginated later, this logic would need adjustment.
            break # Exit after first page if not explicitly paginated
        except requests.exceptions.RequestException as e:
            print(f"Failed to fetch all products: {e}")
            if e.response is not None:
                print(f"Response: {e.response.status_code} - {e.response.text}")
            return None
    
    return all_products

def perform_stock_adjustment(product_id, new_quantity, reason, token):
    """Sends a stock adjustment request to the backend."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "productId": product_id,
        "newQuantity": new_quantity,
        "reason": reason
    }
    try:
        response = requests.post(ADJUSTMENT_ENDPOINT, headers=headers, json=payload)
        response.raise_for_status()
        print(f"  -> Adjustment successful for product ID '{product_id}'. New quantity: {new_quantity}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"  -> Adjustment FAILED for product ID '{product_id}': {e}")
        if e.response is not None:
            print(f"    Response: {e.response.status_code} - {e.response.text}")
        return False

# --- Main Script Logic ---

async def main():
    print("Starting stock reinitialization script from Excel...")

    # 1. Get Authentication Token
    token = get_auth_token(ADMIN_USERNAME, ADMIN_PASSWORD)
    if not token:
        print("Exiting due to failed authentication.")
        return

    # 2. Load Excel Data
    if not os.path.exists(EXCEL_FILE_PATH):
        print(f"Error: Excel file not found at '{EXCEL_FILE_PATH}'. Please place 'stock.xlsx' in the project root.")
        return

    try:
        df = pd.read_excel(EXCEL_FILE_PATH)
        df.columns = df.columns.str.strip() # Clean column names from leading/trailing spaces
        if "Reference" not in df.columns or "Quantité" not in df.columns:
            print(f"Error: Excel file must contain 'Reference' and 'Quantité' columns. Found: {df.columns.tolist()}")
            return
        print(f"Successfully loaded {len(df)} items from '{EXCEL_FILE_PATH}'.")
    except Exception as e:
        print(f"Error loading Excel file: {e}")
        return

    excel_references = set(df["Reference"].astype(str).str.strip().str.replace(" ", "").unique())

    # 3. Get all existing products from the database
    db_products = get_all_products(token)
    if db_products is None:
        print("Exiting due to failure to retrieve products from database.")
        return

    db_product_map = {p["reference"].replace(" ", ""): {"id": p["id"], "current_quantity": p["quantity"]} for p in db_products}
    print(f"Found {len(db_products)} products in the database.")

    # 4. Identify products to set to zero (present in DB but not in Excel)
    products_to_zero = []
    for ref, product_info in db_product_map.items():
        if ref not in excel_references:
            products_to_zero.append(product_info)
    
    print(f"Identified {len(products_to_zero)} products in DB not found in Excel (will be set to 0).")

    # 5. Process adjustments from Excel and zero out unlisted products
    successful_adjustments = 0
    failed_adjustments = 0

    print("\n--- Processing Excel items ---")
    for index, row in df.iterrows():
        reference = str(row["Reference"]).strip().replace(" ", "")
        quantity = int(row["Quantité"])
        article = str(row.get("Article", reference)).strip() # Use 'Article' column if present, else reference

        if reference not in db_product_map:
            print(f"Warning: Product with reference '{reference}' from Excel not found in database. Skipping.")
            failed_adjustments += 1
            continue

        product_id = db_product_map[reference]["id"]
        reason = f"Réinitialisation du stock depuis Excel pour '{article}'."
        
        if perform_stock_adjustment(product_id, quantity, reason, token):
            successful_adjustments += 1
        else:
            failed_adjustments += 1

    print("\n--- Processing products to zero out ---")
    for product_info in products_to_zero:
        product_id = product_info["id"]
        reference = next(ref for ref, info in db_product_map.items() if info["id"] == product_id) # Get original reference
        if product_info["current_quantity"] != 0: # Only adjust if not already zero
            reason = f"Réinitialisation: produit '{reference}' non trouvé dans l'Excel 'stock.xlsx'. Stock mis à zéro."
            print(f"Setting stock to 0 for product ID '{product_id}' (reference: '{reference}')...")
            if perform_stock_adjustment(product_id, 0, reason, token):
                successful_adjustments += 1
            else:
                failed_adjustments += 1
        else:
            print(f"Product ID '{product_id}' (reference: '{reference}') already at 0. Skipping adjustment.")


    print("\n--- Script Summary ---")
    print(f"Total items in Excel: {len(df)}")
    print(f"Total existing products in DB: {len(db_products)}")
    print(f"Successful stock adjustments: {successful_adjustments}")
    print(f"Failed stock adjustments: {failed_adjustments}")
    print("Script finished.")

if __name__ == "__main__":
    asyncio.run(main())
