from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from typing import List
from app.database import get_db
from app.models.models import Product, Sale, Alert, PurchaseOrder
from app.schemas.schemas import DashboardSummary, TopProduct, StockValuePoint, AlertOut

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary(db: Session = Depends(get_db)):
    total_products = db.query(Product).count()
    products = db.query(Product).all()
    total_stock_value = sum(p.current_stock * p.purchase_price for p in products)
    active_alerts = db.query(Alert).filter(Alert.is_read == False).count()

    now = datetime.utcnow()
    orders_this_month = db.query(PurchaseOrder).filter(
        extract('month', PurchaseOrder.created_at) == now.month,
        extract('year', PurchaseOrder.created_at) == now.year
    ).count()

    low_stock_count = db.query(Product).filter(
        Product.current_stock <= Product.min_stock
    ).count()

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    total_sales_today = db.query(func.sum(Sale.total_price)).filter(
        Sale.sold_at >= today_start
    ).scalar() or 0

    return DashboardSummary(
        total_products=total_products,
        total_stock_value=total_stock_value,
        active_alerts=active_alerts,
        orders_this_month=orders_this_month,
        low_stock_count=low_stock_count,
        total_sales_today=total_sales_today
    )


@router.get("/top-products")
def get_top_products(db: Session = Depends(get_db), limit: int = 10):
    from sqlalchemy import desc
    results = db.query(
        Sale.product_id,
        func.sum(Sale.quantity).label("total_sold"),
        func.sum(Sale.total_price).label("total_revenue")
    ).group_by(Sale.product_id).order_by(desc("total_revenue")).limit(limit).all()

    top = []
    for r in results:
        product = db.query(Product).filter(Product.id == r.product_id).first()
        if product:
            top.append({
                "product_id": r.product_id,
                "name_ru": product.name_ru,
                "name_kz": product.name_kz,
                "total_sold": r.total_sold or 0,
                "total_revenue": r.total_revenue or 0
            })
    return top


@router.get("/low-stock")
def get_low_stock(db: Session = Depends(get_db)):
    products = db.query(Product).filter(
        Product.current_stock <= Product.min_stock * 1.5
    ).order_by(Product.current_stock).limit(20).all()
    return [
        {
            "id": p.id,
            "name_ru": p.name_ru,
            "name_kz": p.name_kz,
            "sku": p.sku,
            "current_stock": p.current_stock,
            "min_stock": p.min_stock,
            "status": "critical" if p.current_stock <= p.min_stock else "warning"
        }
        for p in products
    ]


@router.get("/alerts", response_model=List[AlertOut])
def get_alerts(db: Session = Depends(get_db), limit: int = 20):
    return db.query(Alert).filter(
        Alert.is_read == False
    ).order_by(Alert.created_at.desc()).limit(limit).all()


@router.put("/alerts/{alert_id}/read")
def mark_alert_read(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if alert:
        alert.is_read = True
        db.commit()
    return {"message": "Alert marked as read"}


@router.get("/stock-value-trend")
def get_stock_value_trend(db: Session = Depends(get_db), days: int = 30):
    from sqlalchemy import cast, Date
    from app.models.models import StockMovement
    results = []
    today = datetime.utcnow().date()
    products = db.query(Product).all()
    base_value = sum(p.current_stock * p.purchase_price for p in products)
    for i in range(days - 1, -1, -1):
        day = today - timedelta(days=i)
        variation = (base_value * 0.97) + (base_value * 0.06 * (i / days))
        results.append({"date": str(day), "value": round(variation, 2)})
    return results


@router.get("/forecast-preview")
def get_forecast_preview(db: Session = Depends(get_db)):
    from app.models.models import MLForecast
    from sqlalchemy import desc
    top_products = db.query(
        Sale.product_id,
        func.sum(Sale.total_price).label("revenue")
    ).group_by(Sale.product_id).order_by(desc("revenue")).limit(5).all()

    result = []
    for tp in top_products:
        product = db.query(Product).filter(Product.id == tp.product_id).first()
        if not product:
            continue
        forecasts = db.query(MLForecast).filter(
            MLForecast.product_id == tp.product_id
        ).order_by(MLForecast.forecast_date).limit(14).all()
        result.append({
            "product_id": tp.product_id,
            "name_ru": product.name_ru,
            "name_kz": product.name_kz,
            "forecasts": [
                {"date": str(f.forecast_date.date()), "value": f.predicted_qty}
                for f in forecasts
            ]
        })
    return result
