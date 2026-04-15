from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.database import get_db
from app.models.models import Product, Sale, PurchaseOrder, Supplier, StockMovement

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/inventory-turnover")
def inventory_turnover_report(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    results = []
    for p in products:
        sales = db.query(Sale).filter(Sale.product_id == p.id).all()
        total_cost_sold = sum(s.quantity * p.purchase_price for s in sales)
        avg_inventory_value = p.current_stock * p.purchase_price
        if avg_inventory_value > 0:
            turnover_ratio = total_cost_sold / avg_inventory_value
        else:
            turnover_ratio = 0
        results.append({
            "product_id": p.id,
            "name_ru": p.name_ru,
            "name_kz": p.name_kz,
            "sku": p.sku,
            "current_stock": p.current_stock,
            "stock_value": round(p.current_stock * p.purchase_price, 2),
            "total_sold": sum(s.quantity for s in sales),
            "total_revenue": round(sum(s.total_price for s in sales), 2),
            "turnover_ratio": round(turnover_ratio, 2)
        })
    results.sort(key=lambda x: x["turnover_ratio"], reverse=True)
    return results


@router.get("/stock-aging")
def stock_aging_report(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    results = []
    now = datetime.utcnow()
    for p in products:
        last_sale = db.query(Sale).filter(
            Sale.product_id == p.id
        ).order_by(Sale.sold_at.desc()).first()

        if last_sale:
            days_since_sold = (now - last_sale.sold_at).days
        else:
            days_since_sold = 999

        if days_since_sold > 90:
            aging_category = ">90 күн / >90 дней"
        elif days_since_sold > 60:
            aging_category = "60-90 күн / 60-90 дней"
        elif days_since_sold > 30:
            aging_category = "30-60 күн / 30-60 дней"
        else:
            aging_category = "<30 күн / <30 дней"

        results.append({
            "product_id": p.id,
            "name_ru": p.name_ru,
            "name_kz": p.name_kz,
            "sku": p.sku,
            "current_stock": p.current_stock,
            "stock_value": round(p.current_stock * p.purchase_price, 2),
            "days_since_sold": days_since_sold,
            "aging_category": aging_category,
            "last_sale_date": str(last_sale.sold_at.date()) if last_sale else None
        })
    results.sort(key=lambda x: x["days_since_sold"], reverse=True)
    return results


@router.get("/supplier-performance")
def supplier_performance_report(db: Session = Depends(get_db)):
    suppliers = db.query(Supplier).all()
    results = []
    for s in suppliers:
        orders = db.query(PurchaseOrder).filter(PurchaseOrder.supplier_id == s.id).all()
        total_orders = len(orders)
        received_orders = [o for o in orders if o.status == "received"]
        on_time = len(received_orders)
        total_value = sum((o.unit_price or 0) * o.ordered_qty for o in orders)
        results.append({
            "supplier_id": s.id,
            "name": s.name,
            "total_orders": total_orders,
            "completed_orders": on_time,
            "completion_rate": round(on_time / total_orders * 100, 1) if total_orders > 0 else 0,
            "total_order_value": round(total_value, 2),
            "delivery_days": s.delivery_days
        })
    return results


@router.get("/summary")
def summary_report(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    total_products = len(products)
    total_stock_value = sum(p.current_stock * p.purchase_price for p in products)
    total_selling_value = sum(p.current_stock * p.selling_price for p in products)

    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0)
    month_sales = db.query(func.sum(Sale.total_price)).filter(
        Sale.sold_at >= month_start
    ).scalar() or 0

    low_stock = [p for p in products if p.current_stock <= p.min_stock]
    return {
        "total_products": total_products,
        "total_stock_value": round(total_stock_value, 2),
        "total_selling_value": round(total_selling_value, 2),
        "potential_profit": round(total_selling_value - total_stock_value, 2),
        "month_sales_revenue": round(month_sales, 2),
        "low_stock_products": len(low_stock),
        "abc_a_count": sum(1 for p in products if p.abc_class == "A"),
        "abc_b_count": sum(1 for p in products if p.abc_class == "B"),
        "abc_c_count": sum(1 for p in products if p.abc_class == "C")
    }
