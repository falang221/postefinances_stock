from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel

from app.api.auth import UserRole
from database.generated.prisma.enums import (  # Corrected import path for StockAdjustmentStatus and StockReceiptStatus
    StockAdjustmentStatus,
    StockReceiptStatus,
    TransactionSource,
    TransactionType,
    PurchaseOrderStatus, # Added for Purchase Orders
    InventoryAuditStatus,
    DisputeReason,
    RequestItemDisputeStatus, # NEW: for item-level disputes
)


class RequestItemCreate(BaseModel):
    productId: str
    requestedQty: int


class RequestCreate(BaseModel):
    items: List[RequestItemCreate]
    requesterObservations: Optional[str] = None


class RequestItemUpdateApprovedQty(BaseModel):
    requestItemId: str
    approvedQty: int


class RequestApprove(BaseModel):
    decision: str  # "APPROUVE", "REJETEE", "MODIFIE"
    items: Optional[List[RequestItemUpdateApprovedQty]] = None
    comment: Optional[str] = None


class RequestItemReportIssueData(BaseModel): # Renamed from RequestReportIssueData
    requestItemId: str # NEW: to identify which item has the issue
    reason: DisputeReason
    comment: Optional[str] = None


class RequestBulkItemIssuesData(BaseModel): # NEW: for bulk item issue reporting
    items: List[RequestItemReportIssueData]


# New schema for dispute resolution
class DisputeResolutionData(BaseModel):
    decision: str # "RESOLVE_APPROVE" or "RESOLVE_REJECT"
    comment: Optional[str] = None


# Response models (for returning data from API)
class ProductResponse(BaseModel):
    id: str
    name: str
    reference: str
    quantity: int
    unit: str

    class Config:
        from_attributes = True

    


class UserResponse(BaseModel):
    name: str
    department: Optional[str] = None

    class Config:
        from_attributes = True


class RequestItemResponse(BaseModel):
    id: str
    productId: str
    requestedQty: int
    
    approvedQty: Optional[int] = None
    product: ProductResponse
    itemDisputeReason: Optional[DisputeReason] = None # NEW
    itemDisputeComment: Optional[str] = None         # NEW
    itemDisputeStatus: RequestItemDisputeStatus = RequestItemDisputeStatus.NO_DISPUTE # NEW

    class Config:
        from_attributes = True


class ApprovalResponse(BaseModel):
    id: str
    userId: str
    role: UserRole
    decision: str
    comment: Optional[str] = None
    createdAt: datetime
    user: UserResponse  # Nested user info

    class Config:
        from_attributes = True


class RequestResponse(BaseModel):
    id: str
    requestNumber: str
    status: str
    requesterId: str
    requester: UserResponse
    items: List[RequestItemResponse]
    requesterObservations: Optional[str] = None # New field

    approvedAt: Optional[datetime] = None
    approvedBy: Optional[UserResponse] = None
    receivedAt: Optional[datetime] = None
    receivedBy: Optional[UserResponse] = None
    approvals: List[ApprovalResponse] = []
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

# New schema for Delivery Note
class DeliveryNoteItem(BaseModel):
    productId: str
    productName: str
    productReference: str
    deliveredQty: int

    class Config:
        from_attributes = True

class DeliveryNoteResponse(BaseModel):
    requestId: str
    requestNumber: str
    requestDate: datetime
    deliveryDate: datetime
    requesterName: str
    requesterDepartment: Optional[str] = None
    delivererName: str
    requesterObservations: Optional[str] = None # New field
    items: List[DeliveryNoteItem]

    class Config:
        from_attributes = True


# User Schemas
class UserCreate(BaseModel):
    username: str
    name: str
    password: str
    role: UserRole
    email: Optional[str] = None
    department: Optional[str] = None


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    department: Optional[str] = None


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str


class UserFullResponse(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    name: str
    role: UserRole
    department: Optional[str] = None
    createdAt: datetime

    class Config:
        from_attributes = True


# Category Schemas
class CategoryCreate(BaseModel):
    name: str


class CategoryUpdate(BaseModel):
    name: str


class CategoryResponse(BaseModel):
    id: str
    name: str

    class Config:
        from_attributes = True


# Product Schemas
class ProductCreate(BaseModel):
    name: str
    reference: str
    categoryId: str
    quantity: int
    minStock: int
    cost: Optional[float] = 0.0
    unit: str
    location: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    reference: Optional[str] = None
    categoryId: Optional[str] = None
    quantity: Optional[int] = None
    minStock: Optional[int] = None
    cost: Optional[float] = None
    unit: Optional[str] = None
    location: Optional[str] = None


class ProductFullResponse(BaseModel):
    id: str
    name: str
    reference: str
    categoryId: str
    category: CategoryResponse  # Nested category info
    quantity: int
    minStock: int
    cost: float
    unit: str
    location: Optional[str] = None

    class Config:
        from_attributes = True


# Transaction Schemas (for stock adjustments)


class StockAdjustmentType(str, Enum):


    ENTREE = "ENTREE"


    SORTIE = "SORTIE"


class StockAdjustmentCreate(BaseModel):
    quantity: int
    type: StockAdjustmentType
    reason: str


class StockReceiptCreate(BaseModel):
    productId: str
    quantity: int
    supplierName: Optional[str] = None
    batchNumber: Optional[str] = None


class StockReceiptItemCreate(BaseModel):
    productId: str
    quantity: int
    supplierName: Optional[str] = None
    batchNumber: Optional[str] = None


class BatchStockReceiptCreate(BaseModel):
    items: List[StockReceiptItemCreate]


class StockAdjustmentResponse(BaseModel):
    id: str
    productId: str
    product: ProductResponse
    quantity: int
    type: StockAdjustmentType
    reason: str
    requestedById: str
    requestedBy: UserResponse
    status: StockAdjustmentStatus
    approvedById: Optional[str] = None
    approvedBy: Optional[UserResponse] = None
    approvedAt: Optional[datetime] = None
    dafComment: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


class StockAdjustmentDecision(BaseModel):
    decision: str  # "APPROVE" or "REJECT"
    comment: Optional[str] = None


class StockReceiptResponse(BaseModel):
    id: str
    productId: str
    product: ProductResponse
    quantity: int
    supplierName: Optional[str] = None
    batchNumber: Optional[str] = None
    requestedById: str
    requestedBy: UserResponse
    status: StockReceiptStatus
    approvedById: Optional[str] = None
    approvedBy: Optional[UserResponse] = None
    approvedAt: Optional[datetime] = None
    dafComment: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


class StockReceiptDecision(BaseModel):
    decision: str  # "APPROVE" or "REJECT"
    comment: Optional[str] = None


# Dashboard Schemas
class DashboardStats(BaseModel):
    lowStock: int
    pendingApprovals: int
    totalItems: Optional[int] = None


# Auth Schemas
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Stock Report Schemas
class StockReportProduct(BaseModel):
    id: str
    name: str
    reference: str
    unit: str
    category: CategoryResponse  # Nested category info

    class Config:
        from_attributes = True


class StockReportItem(BaseModel):
    product: StockReportProduct
    currentQuantity: int
    minStock: int
    location: Optional[str] = None
    lastAdjustmentDate: Optional[datetime] = None
    lastReceiptDate: Optional[datetime] = None

    class Config:
        from_attributes = True


class StockReportResponse(BaseModel):
    reportDate: datetime
    items: List[StockReportItem]
    totalItems: int  # Added totalItems field

    class Config:
        from_attributes = True


# Transaction History Schemas


class UserBase(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    id: str
    name: str
    reference: str
    unit: str

    class Config:
        from_attributes = True


class TransactionHistoryResponse(BaseModel):
    id: str
    product: ProductBase
    user: UserBase
    type: TransactionType
    source: TransactionSource
    quantity: int
    createdAt: datetime

    class Config:
        from_attributes = True


class PaginatedTransactionHistoryResponse(BaseModel):
    items: List[TransactionHistoryResponse]
    totalItems: int
    page: int
    pageSize: int

    class Config:
        from_attributes = True


# Stock Status Report Schemas
class StockStatusEnum(str, Enum):
    OUT_OF_STOCK = "OUT_OF_STOCK"
    CRITICAL = "CRITICAL"
    AVAILABLE = "AVAILABLE"


class ProductStockStatus(BaseModel):
    id: str
    name: str
    reference: str
    quantity: int
    minStock: int
    unit: str
    location: Optional[str] = None
    category: CategoryResponse  # Nested category info
    status: StockStatusEnum  # Calculated status

    class Config:
        from_attributes = True


class PaginatedProductStockStatusResponse(BaseModel):
    items: List[ProductStockStatus]
    totalItems: int
    page: int
    pageSize: int

    class Config:
        from_attributes = True


# Stock Request Report Schemas
class StockRequestReportItem(BaseModel):
    product_name: str
    requested_qty: int
    approved_qty: Optional[int]


class StockRequestReportResponse(BaseModel):
    id: str
    request_number: str
    status: str
    requester_name: str
    requester_department: Optional[str]
    created_at: datetime
    items: List[StockRequestReportItem]
    approval_delay_daf: Optional[str] = None # Renamed
    delivery_delay_magasinier: Optional[str] = None # New field
    total_processing_time: Optional[str] = None

    class Config:
        from_attributes = True

# Stock Valuation Report Schemas
class StockValuationByCategory(BaseModel):
    categoryName: str
    totalValue: float

    class Config:
        from_attributes = True



class StockValueReportItem(BaseModel):
    productId: str
    productName: str
    productReference: str
    quantity: int
    cost: float
    totalValue: float

class StockValueReportResponse(BaseModel):
    reportDate: datetime
    totalStockValue: float
    items: List[StockValueReportItem]

# Inventory Audit Schemas
class InventoryAuditCreate(BaseModel):
    # No fields needed, creator is determined from token
    pass


class InventoryAuditItemCreate(BaseModel):
    productId: str
    countedQuantity: int


class InventoryAuditBulkUpdate(BaseModel):
    items: List[InventoryAuditItemCreate]


class InventoryAuditItemResponse(BaseModel):
    id: str
    productId: str
    product: ProductResponse
    systemQuantity: int
    countedQuantity: Optional[int] = None
    discrepancy: Optional[int] = None
    
    class Config:
        from_attributes = True


class InventoryAuditResponse(BaseModel):
    id: str
    auditNumber: str
    status: InventoryAuditStatus
    createdById: str
    createdBy: UserResponse
    items: List[InventoryAuditItemResponse]
    createdAt: datetime
    updatedAt: datetime
    completedAt: Optional[datetime] = None

    class Config:
        from_attributes = True


class InventoryAuditSummaryResponse(BaseModel):
    id: str
    auditNumber: str
    status: InventoryAuditStatus
    createdBy: UserResponse
    createdAt: datetime
    completedAt: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaginatedInventoryAuditResponse(BaseModel):
    items: List[InventoryAuditSummaryResponse]
    totalItems: int
    page: int
    pageSize: int

# Purchase Order Schemas
class PurchaseOrderItemCreate(BaseModel):
    productId: str
    quantity: int
    unitPrice: float


class PurchaseOrderCreate(BaseModel):
    supplierName: Optional[str] = None
    items: List[PurchaseOrderItemCreate]


class PurchaseOrderUpdate(BaseModel):
    status: Optional[PurchaseOrderStatus] = None
    supplierName: Optional[str] = None
    totalAmount: Optional[float] = None


class PurchaseOrderItemResponse(BaseModel):
    id: str
    productId: str
    product: ProductResponse
    quantity: int
    unitPrice: float
    totalPrice: float

    class Config:
        from_attributes = True


class PurchaseOrderResponse(BaseModel):
    id: str
    orderNumber: str
    status: PurchaseOrderStatus
    requestedById: str
    requestedBy: UserResponse
    approvedById: Optional[str] = None
    approvedBy: Optional[UserResponse] = None
    supplierName: Optional[str] = None
    totalAmount: float
    items: List[PurchaseOrderItemResponse]
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


class PurchaseOrderSummaryResponse(BaseModel):


    id: str


    orderNumber: str


    status: PurchaseOrderStatus


    requestedBy: UserResponse


    supplierName: Optional[str] = None


    totalAmount: float


    createdAt: datetime


    updatedAt: datetime





    class Config:


        from_attributes = True








class PaginatedPurchaseOrderResponse(BaseModel):


    total: int


    data: List[PurchaseOrderSummaryResponse]





    class Config:


        from_attributes = True








class PurchaseOrderPrintDataItem(BaseModel):


    productName: str


    productReference: str


    quantity: int


    unitPrice: float


    totalPrice: float





    class Config:


        from_attributes = True





class PurchaseOrderPrintData(BaseModel):





    orderNumber: str





    supplierName: Optional[str] = None





    totalAmount: float





    createdAt: datetime





    items: List[PurchaseOrderPrintDataItem]





    requestedBy: UserResponse





    approvedBy: Optional[UserResponse] = None











    class Config:





        from_attributes = True

















# Stock Turnover Report Schemas

















class StockTurnoverReportItem(BaseModel):

















    productId: str

















    productName: str

















    productReference: str

















    currentStock: int

















    totalQuantityOut: int

















    turnoverRate: float

















    

















    class Config:

















        from_attributes = True



































class StockTurnoverReportResponse(BaseModel):

















    reportDate: datetime

















    items: List[StockTurnoverReportItem]

















    

















    class Config:

















        from_attributes = True











    class Config:





        from_attributes = True













