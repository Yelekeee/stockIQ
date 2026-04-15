from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.models import PurchaseOrder, Product, Supplier
from app.schemas.schemas import OrderCreate, OrderStatusUpdate, OrderOut

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.get("", response_model=List[OrderOut])
def get_orders(
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    limit: int = 100
):
    query = db.query(PurchaseOrder)
    if status:
        query = query.filter(PurchaseOrder.status == status)
    return query.order_by(PurchaseOrder.created_at.desc()).limit(limit).all()


@router.post("", response_model=OrderOut)
def create_order(data: OrderCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    order = PurchaseOrder(
        product_id=data.product_id,
        supplier_id=data.supplier_id or product.supplier_id,
        ordered_qty=data.ordered_qty,
        unit_price=data.unit_price or product.purchase_price,
        estimated_cost=(data.ordered_qty * (data.unit_price or product.purchase_price))
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.post("/auto-generate", response_model=List[OrderOut])
def auto_generate_orders(db: Session = Depends(get_db)):
    from app.services.ml_service import calculate_reorder
    products = db.query(Product).all()
    created_orders = []

    for product in products:
        reorder_data = calculate_reorder(product, db)
        days_until_stockout = reorder_data.get("days_until_stockout", 999)
        reorder_point = reorder_data.get("reorder_point", product.min_stock)
        eoq = reorder_data.get("eoq", product.min_stock * 2)

        if product.current_stock <= reorder_point:
            existing_draft = db.query(PurchaseOrder).filter(
                PurchaseOrder.product_id == product.id,
                PurchaseOrder.status == "draft"
            ).first()
            if existing_draft:
                continue

            if days_until_stockout < 3:
                urgency = "critical"
            elif days_until_stockout < 7:
                urgency = "warning"
            else:
                urgency = "normal"

            order = PurchaseOrder(
                product_id=product.id,
                supplier_id=product.supplier_id,
                ordered_qty=max(eoq, product.min_stock),
                unit_price=product.purchase_price,
                estimated_cost=max(eoq, product.min_stock) * product.purchase_price,
                is_auto_generated=True,
                urgency_level=urgency
            )
            db.add(order)
            created_orders.append(order)

    db.commit()
    for o in created_orders:
        db.refresh(o)
    return created_orders


@router.put("/{order_id}/status", response_model=OrderOut)
def update_order_status(order_id: int, data: OrderStatusUpdate, db: Session = Depends(get_db)):
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = data.status
    if data.status == "received":
        order.received_at = datetime.utcnow()
        if data.received_qty is not None:
            order.received_qty = data.received_qty
            product = db.query(Product).filter(Product.id == order.product_id).first()
            if product:
                product.current_stock += data.received_qty

    db.commit()
    db.refresh(order)
    return order
