from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date
from app.database import get_db
from app.models.models import Sale, Product, StockMovement
from app.schemas.schemas import SaleCreate, SaleOut

router = APIRouter(prefix="/api/sales", tags=["sales"])


@router.post("", response_model=SaleOut)
def create_sale(data: SaleCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.current_stock < data.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    sale = Sale(
        product_id=data.product_id,
        quantity=data.quantity,
        unit_price=data.unit_price,
        total_price=data.quantity * data.unit_price
    )
    product.current_stock -= data.quantity

    movement = StockMovement(
        product_id=data.product_id,
        type="outgoing",
        quantity=data.quantity,
        unit_price=data.unit_price,
        reason="Сатылым / Продажа"
    )

    db.add(sale)
    db.add(movement)
    db.commit()
    db.refresh(sale)
    return sale


@router.get("", response_model=List[SaleOut])
def get_sales(
    db: Session = Depends(get_db),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    product_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100
):
    query = db.query(Sale)
    if product_id:
        query = query.filter(Sale.product_id == product_id)
    if from_date:
        query = query.filter(Sale.sold_at >= datetime.fromisoformat(from_date))
    if to_date:
        query = query.filter(Sale.sold_at <= datetime.fromisoformat(to_date))
    return query.order_by(Sale.sold_at.desc()).offset(skip).limit(limit).all()


@router.get("/stats/daily")
def get_daily_stats(db: Session = Depends(get_db), days: int = 30):
    from sqlalchemy import cast, Date
    results = db.query(
        cast(Sale.sold_at, Date).label("sale_date"),
        func.sum(Sale.total_price).label("revenue"),
        func.sum(Sale.quantity).label("quantity")
    ).group_by(cast(Sale.sold_at, Date)).order_by(cast(Sale.sold_at, Date).desc()).limit(days).all()
    return [{"date": str(r.sale_date), "revenue": r.revenue or 0, "quantity": r.quantity or 0} for r in results]
