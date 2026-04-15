from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    admin = "admin"
    manager = "manager"
    viewer = "viewer"


class MovementType(str, Enum):
    incoming = "incoming"
    outgoing = "outgoing"
    adjustment = "adjustment"
    returns = "return"


class OrderStatus(str, Enum):
    draft = "draft"
    sent = "sent"
    received = "received"
    cancelled = "cancelled"


# Auth
class UserLogin(BaseModel):
    email: str
    password: str


class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    role: UserRole = UserRole.viewer


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# Category
class CategoryOut(BaseModel):
    id: int
    name_kz: str
    name_ru: str

    class Config:
        from_attributes = True


# Supplier
class SupplierCreate(BaseModel):
    name: str
    contact_phone: Optional[str] = None
    email: Optional[str] = None
    delivery_days: int = 7


class SupplierOut(BaseModel):
    id: int
    name: str
    contact_phone: Optional[str]
    email: Optional[str]
    delivery_days: int

    class Config:
        from_attributes = True


# Product
class ProductCreate(BaseModel):
    name_kz: str
    name_ru: str
    sku: str
    barcode: Optional[str] = None
    category_id: int
    unit: str = "шт"
    purchase_price: float
    selling_price: float
    current_stock: float = 0
    min_stock: float = 10
    max_stock: float = 500
    lead_time_days: int = 7
    order_cost: float = 5000
    holding_cost_pct: float = 0.25
    supplier_id: Optional[int] = None


class ProductUpdate(BaseModel):
    name_kz: Optional[str] = None
    name_ru: Optional[str] = None
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    current_stock: Optional[float] = None
    min_stock: Optional[float] = None
    max_stock: Optional[float] = None
    lead_time_days: Optional[int] = None
    order_cost: Optional[float] = None
    holding_cost_pct: Optional[float] = None
    supplier_id: Optional[int] = None
    category_id: Optional[int] = None


class ProductOut(BaseModel):
    id: int
    name_kz: str
    name_ru: str
    sku: str
    barcode: Optional[str]
    category_id: int
    unit: str
    purchase_price: float
    selling_price: float
    current_stock: float
    min_stock: float
    max_stock: float
    lead_time_days: int
    order_cost: float
    holding_cost_pct: float
    supplier_id: Optional[int]
    abc_class: Optional[str]
    xyz_class: Optional[str]
    cluster_label: Optional[str]
    created_at: datetime
    category: Optional[CategoryOut] = None
    supplier: Optional[SupplierOut] = None

    class Config:
        from_attributes = True


# Stock Movement
class StockMovementCreate(BaseModel):
    product_id: int
    type: MovementType
    quantity: float
    unit_price: Optional[float] = None
    reason: Optional[str] = None


class StockMovementOut(BaseModel):
    id: int
    product_id: int
    type: MovementType
    quantity: float
    unit_price: Optional[float]
    reason: Optional[str]
    user_id: Optional[int]
    created_at: datetime
    product: Optional[ProductOut] = None

    class Config:
        from_attributes = True


# Sale
class SaleCreate(BaseModel):
    product_id: int
    quantity: float
    unit_price: float


class SaleOut(BaseModel):
    id: int
    product_id: int
    quantity: float
    unit_price: float
    total_price: float
    sold_at: datetime
    product: Optional[ProductOut] = None

    class Config:
        from_attributes = True


# Purchase Order
class OrderCreate(BaseModel):
    product_id: int
    supplier_id: Optional[int] = None
    ordered_qty: float
    unit_price: Optional[float] = None


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    received_qty: Optional[float] = None


class OrderOut(BaseModel):
    id: int
    product_id: int
    supplier_id: Optional[int]
    ordered_qty: float
    received_qty: float
    unit_price: Optional[float]
    status: OrderStatus
    is_auto_generated: bool
    urgency_level: str
    estimated_cost: Optional[float]
    created_at: datetime
    received_at: Optional[datetime]
    product: Optional[ProductOut] = None
    supplier: Optional[SupplierOut] = None

    class Config:
        from_attributes = True


# Alert
class AlertOut(BaseModel):
    id: int
    product_id: Optional[int]
    type: str
    message: str
    message_kz: Optional[str]
    is_read: bool
    created_at: datetime
    product: Optional[ProductOut] = None

    class Config:
        from_attributes = True


# ML Forecast
class ForecastOut(BaseModel):
    id: int
    product_id: int
    forecast_date: datetime
    predicted_qty: float
    lower_bound: float
    upper_bound: float
    generated_at: datetime

    class Config:
        from_attributes = True


# Dashboard
class DashboardSummary(BaseModel):
    total_products: int
    total_stock_value: float
    active_alerts: int
    orders_this_month: int
    low_stock_count: int
    total_sales_today: float


class TopProduct(BaseModel):
    product_id: int
    name_ru: str
    name_kz: str
    total_sold: float
    total_revenue: float


class StockValuePoint(BaseModel):
    date: str
    value: float
