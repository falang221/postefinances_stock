import logging
logger = logging.getLogger(__name__) # Moved logger initialization here

from fastapi import FastAPI
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.middleware.cors import CORSMiddleware
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

# Import centralized settings
from app.config import settings

# Import API routers
from app.api.auth import set_jwt_settings
from app.api.routes.auth import router as auth_router
from app.api.routes.category import router as category_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.inventory_audit import router as inventory_audit_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.product import router as product_router
from app.api.routes.purchase_order import router as purchase_order_router
from app.api.routes.reports import router as reports_router
from app.api.routes.request import router as request_router
from app.api.routes.user import router as user_router
from app.api.routes.websockets import router as websockets_router
from app.api.routes.stock_adjustment import router as stock_adjustment_router

# --- Sentry Integration ---
# Sentry is initialized if a DSN is provided in the settings.
if settings.SENTRY_DSN: # Sentry DSN will be loaded from .env via app.config
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
        integrations=[FastApiIntegration()],
    )

# --- JWT Settings ---
# The app will fail to start if SECRET_KEY is not set, thanks to Pydantic
set_jwt_settings(settings.SECRET_KEY)


# --- FastAPI App Initialization ---
app = FastAPI(
    title="Postefinances Stock Management API",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)


# --- Middleware Configuration ---

# Logging middleware for debugging requests
logger = logging.getLogger(__name__)
class DebugMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        logger.info(f"Incoming Request: Method={request.method}, URL={request.url.path}")
        response = await call_next(request)
        logger.info(f"Outgoing Response: Status={response.status_code}")
        return response

app.add_middleware(DebugMiddleware)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Global Exception Handlers ---
@app.exception_handler(ValueError)
async def value_error_exception_handler(request: Request, exc: ValueError):
    # Log the error for debugging purposes
    logger.error(f"ValueError caught: {exc}")
    # Check for "not found" to return a 404, otherwise a 400
    status_code = 404 if "not found" in str(exc).lower() else 400
    return JSONResponse(
        status_code=status_code,
        content={"detail": str(exc)},
    )

@app.exception_handler(PermissionError)
async def permission_error_exception_handler(request: Request, exc: PermissionError):
    logger.error(f"PermissionError caught: {exc}")
    return JSONResponse(
        status_code=403,
        content={"detail": str(exc)},
    )


# --- API Router Inclusion ---
app.include_router(request_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(category_router, prefix="/api")
app.include_router(product_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(inventory_audit_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(purchase_order_router, prefix="/api")
app.include_router(reports_router, prefix="/api/reports", tags=["Reports"])
app.include_router(stock_adjustment_router, prefix="/api")

@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to Postefinances Stock Management API!"}



