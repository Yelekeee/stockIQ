from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text,
    ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    viewer = "viewer"


class MovementType(str, enum.Enum):
    incoming = "incoming"
    outgoing = "outgoing"
    adjustment = "adjustment"
    returns = "return"


class OrderStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    received = "received"
    cancelled = "cancelled"


class AlertType(str, enum.Enum):
    low_stock = "low_stock"
    anomaly = "anomaly"
    overstock = "overstock"
    expiry = "expiry"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.viewer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    movements = relationship("StockMovement", back_populates="user")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name_kz = Column(String(100), nullable=False)
    name_ru = Column(String(100), nullable=False)

    products = relationship("Product", back_populates="category")


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    contact_phone = Column(String(50))
    email = Column(String(100))
    delivery_days = Column(Integer, default=7)

    products = relationship("Product", back_populates="supplier")
    orders = relationship("PurchaseOrder", back_populates="supplier")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name_kz = Column(String(200), nullable=False)
    name_ru = Column(String(200), nullable=False)
    sku = Column(String(50), unique=True, index=True)
    barcode = Column(String(50), unique=True, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"))
    unit = Column(String(20), default="шт")
    purchase_price = Column(Float, nullable=False)
    selling_price = Column(Float, nullable=False)
    current_stock = Column(Float, default=0)
    min_stock = Column(Float, default=10)
    max_stock = Column(Float, default=500)
    lead_time_days = Column(Integer, default=7)
    order_cost = Column(Float, default=5000)
    holding_cost_pct = Column(Float, default=0.25)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    abc_class = Column(String(1), nullable=True)
    xyz_class = Column(String(1), nullable=True)
    cluster_label = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    category = relationship("Category", back_populates="products")
    supplier = relationship("Supplier", back_populates="products")
    movements = relationship("StockMovement", back_populates="product")
    sales = relationship("Sale", back_populates="product")
    orders = relationship("PurchaseOrder", back_populates="product")
    forecasts = relationship("MLForecast", back_populates="product")
    alerts = relationship("Alert", back_populates="product")


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    type = Column(SAEnum(MovementType), nullable=False)
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=True)
    reason = Column(String(500), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="movements")
    user = relationship("User", back_populates="movements")


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    sold_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="sales")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    ordered_qty = Column(Float, nullable=False)
    received_qty = Column(Float, default=0)
    unit_price = Column(Float, nullable=True)
    status = Column(SAEnum(OrderStatus), default=OrderStatus.draft)
    is_auto_generated = Column(Boolean, default=False)
    urgency_level = Column(String(20), default="normal")
    estimated_cost = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    received_at = Column(DateTime(timezone=True), nullable=True)

    product = relationship("Product", back_populates="orders")
    supplier = relationship("Supplier", back_populates="orders")


class MLForecast(Base):
    __tablename__ = "ml_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    forecast_date = Column(DateTime(timezone=True), nullable=False)
    predicted_qty = Column(Float, nullable=False)
    lower_bound = Column(Float, nullable=False)
    upper_bound = Column(Float, nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="forecasts")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    type = Column(SAEnum(AlertType), nullable=False)
    message = Column(Text, nullable=False)
    message_kz = Column(Text, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="alerts")
