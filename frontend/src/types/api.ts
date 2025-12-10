// frontend/src/types/api.ts

export enum UserRole {
    ADMIN = "ADMIN",
    MAGASINIER = "MAGASINIER",
    CHEF_SERVICE = "CHEF_SERVICE",
    DAF = "DAF",
    SUPER_OBSERVATEUR = "SUPER_OBSERVATEUR",
}

export interface UserFullResponse {
    id: string;
    username: string;
    email: string;
    name: string;
    role: UserRole;
    department?: string | null;
    createdAt: string; // Assuming ISO 8601 string
}

export interface UserUpdate {
    email?: string;
    name?: string;
    username?: string;
    password?: string; // Only for admin updates, not for /me endpoint
    role?: UserRole; // Only for admin updates, not for /me endpoint
    department?: string | null;
}

export interface PasswordUpdate {
    current_password: string;
    new_password: string;
}

export interface UserCreate {
    username: string;
    name: string;
    password: string;
    role: UserRole;
    email?: string | null;
    department?: string | null;
}

// Add other API types as needed
// For example, if you have a Product schema:
export interface ProductResponse {
    id: string;
    name: string;
    reference: string;
    quantity: number;
    unit: string;
    maxStock: number; // Added maxStock to response
    categoryId: string; // Added categoryId to response
    category: CategoryResponse; // Added category to response
}

export interface ProductCreate {
    name: string;
    reference: string;
    initialQuantity: number;
    maxStock: number;
    categoryId: string;
    unit?: string; // Assuming unit might be optional or have a default
}

export interface ProductUpdate {
    name?: string;
    reference?: string;
    quantity?: number; // Quantity can be updated directly (e.g., via adjustments)
    maxStock?: number;
    categoryId?: string;
    unit?: string;
}

export interface CategoryResponse {
    id: string;
    name: string;
}

export interface ProductFullResponse {
    id: string;
    name: string;
    reference: string;
    categoryId: string;
    category: CategoryResponse;
    quantity: number;
    minStock: number;
    maxStock: number; // Added maxStock
    unit: string;
    location?: string | null;
}

export enum StockAdjustmentStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
}

export enum StockReceiptStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
}

export enum TransactionType {
    ENTREE = "ENTREE",
    SORTIE = "SORTIE",
}

export enum StockAdjustmentType {
    ENTREE = "ENTREE",
    SORTIE = "SORTIE",
}

export enum TransactionSource {
    ADJUSTMENT = "ADJUSTMENT",
    RECEIPT = "RECEIPT",
    REQUEST = "REQUEST",
}

export interface StockAdjustmentResponse {
    id: string;
    productId: string;
    product: ProductResponse;
    quantity: number;
    type: "ENTREE" | "SORTIE";
    reason: string;
    requestedById: string;
    requestedBy: UserFullResponse; // Using UserFullResponse for consistency
    status: StockAdjustmentStatus;
    approvedById?: string | null;
    approvedBy?: UserFullResponse | null;
    approvedAt?: string | null;
    dafComment?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface StockReceiptResponse {
    id: string;
    productId: string;
    product: ProductResponse;
    quantity: number;
    supplierName?: string | null;
    batchNumber?: string | null;
    requestedById: string;
    requestedBy: UserFullResponse;
    status: StockReceiptStatus;
    approvedById?: string | null;
    approvedBy?: UserFullResponse | null;
    approvedAt?: string | null;
    dafComment?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface RequestItemResponse {
    id: string;
    productId: string;
    requestedQty: number;
    proposedQty?: number | null;
    approvedQty?: number | null;
    product: ProductResponse;
    itemDisputeReason?: DisputeReason | null;
    itemDisputeComment?: string | null;
    itemDisputeStatus: RequestItemDisputeStatus;
}

export interface ApprovalResponse {
    id: string;
    userId: string;
    role: UserRole;
    decision: string;
    comment?: string | null;
    createdAt: string;
    user: UserFullResponse;
}

export enum DisputeReason {
    QUANTITE_INCORRECTE = "QUANTITE_INCORRECTE",
    ARTICLE_ENDOMMAGE = "ARTICLE_ENDOMMAGE",
    MAUVAIS_ARTICLE = "MAUVAIS_ARTICLE",
    AUTRE = "AUTRE",
}

export enum RequestItemDisputeStatus {
  NO_DISPUTE = "NO_DISPUTE",
  REPORTED = "REPORTED",
  RESOLVED_APPROVED = "RESOLVED_APPROVED",
  RESOLVED_REJECTED = "RESOLVED_REJECTED",
}

export interface RequestItemReportIssueData { // Renamed from RequestReportIssueData
  requestItemId: string; // NEW: to identify which item has the issue
  reason: DisputeReason;
  comment?: string;
}

export interface RequestBulkItemIssuesData { // NEW: for bulk item issue reporting
  items: RequestItemReportIssueData[];
}

export interface RequestResponse {
    id: string;
    requestNumber: string;
    status: string;
    requesterId: string;
    requester: UserFullResponse;
    items: RequestItemResponse[];
    requesterObservations?: string | null;
    proposedAt?: string | null;
    proposedBy?: UserFullResponse | null;
    approvedAt?: string | null;
    approvedBy?: UserFullResponse | null;
    receivedAt?: string | null;
    receivedBy?: UserFullResponse | null;
    approvals: ApprovalResponse[];
    createdAt: string;
    updatedAt: string;
}

export interface DashboardStats {
    lowStock: number;
    pendingApprovals: number;
    totalItems?: number | null;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
}

export interface StockReportProduct {
    id: string;
    name: string;
    reference: string;
    unit: string;
    category: CategoryResponse;
}

export interface StockReportItem {
    product: StockReportProduct;
    currentQuantity: number;
    minStock: number;
    location?: string | null;
    lastAdjustmentDate?: string | null;
    lastReceiptDate?: string | null;
}

export interface StockReportResponse {
    reportDate: string;
    items: StockReportItem[];
    totalItems: number;
}

export interface UserBase {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}

export interface ProductBase {
    id: string;
    name: string;
    reference: string;
    unit: string;
}

export interface TransactionHistoryResponse {
    id: string;
    product: ProductBase;
    user: UserBase;
    type: TransactionType;
    source: TransactionSource;
    quantity: number;
    createdAt: string;
}

export interface PaginatedTransactionHistoryResponse {
    items: TransactionHistoryResponse[];
    totalItems: number;
    page: number;
    pageSize: number;
}

export enum StockStatusEnum {
    OUT_OF_STOCK = "OUT_OF_STOCK",
    CRITICAL = "CRITICAL",
    AVAILABLE = "AVAILABLE",
    OVERSTOCK = "OVERSTOCK",
}

export interface ProductStockStatus {
    id: string;
    name: string;
    reference: string;
    quantity: number;
    minStock: number;
    unit: string;
    location?: string | null;
    category: CategoryResponse;
    status: StockStatusEnum;
}

export enum RequestStatus {
    BROUILLON = "BROUILLON",
    SOUMISE = "SOUMISE",
    TRANSMISE = "TRANSMISE",
    APPROUVEE = "APPROUVEE",
    REJETEE = "REJETEE",
    LIVREE_PAR_MAGASINIER = "LIVREE_PAR_MAGASINIER",
    RECEPTION_CONFIRMEE = "RECEPTION_CONFIRMEE",
}

export interface PaginatedProductStockStatusResponse {
    items: ProductStockStatus[];
    totalItems: number;
    page: number;
    pageSize: number;
}

// Stock Request Report Types
export interface StockRequestReportItem {
    product_name: string;
    requested_qty: number;
    proposed_qty?: number | null;
    approved_qty?: number | null;
}

export interface StockRequestReportResponse {
    id: string;
    request_number: string;
    status: string;
    requester_name: string;
    requester_department?: string | null;
    created_at: string;
    items: StockRequestReportItem[];
    processing_time_requester_to_storekeeper?: string | null;
    processing_time_storekeeper_to_daf?: string | null;
    approval_delay_daf?: string | null;
    total_processing_time?: string | null;
}

export interface StockValuationByCategory {
  categoryName: string;
  totalValue: number;
}

// Purchase Order Types
export enum PurchaseOrderStatus {
    DRAFT = "DRAFT",
    PENDING_APPROVAL = "PENDING_APPROVAL",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    ORDERED = "ORDERED",
    RECEIVED = "RECEIVED",
}

export interface PurchaseOrderItemCreate {
    productId: string;
    quantity: number;
    unitPrice: number;
}

export interface PurchaseOrderCreate {
    supplierName?: string | null;
    items: PurchaseOrderItemCreate[];
}

export interface PurchaseOrderUpdate {
    status?: PurchaseOrderStatus;
    supplierName?: string | null;
    totalAmount?: number;
}

export interface PurchaseOrderItemResponse {
    id: string;
    productId: string;
    product: ProductResponse; // Assuming ProductResponse is already defined
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

export interface PurchaseOrderResponse {
    id: string;
    orderNumber: string;
    status: PurchaseOrderStatus;
    requestedById: string;
    requestedBy: UserFullResponse; // Assuming UserFullResponse is already defined
    approvedById?: string | null;
    approvedBy?: UserFullResponse | null;
    supplierName?: string | null;
    totalAmount: number;
    items: PurchaseOrderItemResponse[];
    createdAt: string;
    updatedAt: string;
}

export interface PurchaseOrderSummaryResponse {
  id: string;
  orderNumber: string;
  status: PurchaseOrderStatus;
  requestedBy: UserFullResponse;
  supplierName?: string | null;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPurchaseOrderResponse {
  total: number;
  data: PurchaseOrderSummaryResponse[];
}

// Inventory Audit Types
export enum InventoryAuditStatus {
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  RECONCILIATION_PENDING = "RECONCILIATION_PENDING",
  CLOSED = "CLOSED",
}

export interface InventoryAuditItem {
  id: string;
  productId: string;
  product: ProductResponse;
  systemQuantity: number;
  countedQuantity?: number | null;
  discrepancy?: number | null;
}

export interface InventoryAudit {
  id: string;
  auditNumber: string;
  status: InventoryAuditStatus;
  createdById: string;
  createdBy: UserFullResponse;
  items: InventoryAuditItem[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface InventoryAuditSummary {
  id: string;
  auditNumber: string;
  status: InventoryAuditStatus;
  createdBy: UserFullResponse;
  createdAt: string;
  completedAt?: string | null;
}

export interface PaginatedInventoryAuditResponse {
  items: InventoryAuditSummary[];
  totalItems: number;
  page: number;
  pageSize: number;
}

export interface InventoryAuditItemCreate {
  productId: string;
  countedQuantity: number;
}

export interface InventoryAuditBulkUpdate {
  items: InventoryAuditItemCreate[];
}

export interface DeliveryNoteData {
  requestNumber: string;
  requestDate: string;
  deliveryDate: string;
  requesterName: string;
  requesterDepartment?: string | null;
  requesterObservations?: string;
  delivererName: string;
  items: Array<{
    productName: string;
    productReference: string;
    deliveredQty: number;
  }>;
}

export interface StockReceiptItemCreate {
    productId: string;
    quantity: number;
}

export interface PurchaseOrderPrintData {
  orderNumber: string;
  supplierName?: string | null;
  totalAmount: number;
  createdAt: string;
  items: Array<{
    productName: string;
    productReference: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  requestedBy: {
    name: string;
  };
  approvedBy?: {
    name: string;
  } | null;
}

export interface StockValueReportItem {
  productId: string;
  productName: string;
  productReference: string;
  quantity: number;
  cost: number;
  totalValue: number;
}

export interface StockValueReportResponse {
  reportDate: string;
  totalStockValue: number;
  items: StockValueReportItem[];
}
