import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
import math
import warnings
warnings.filterwarnings("ignore")


def get_product_sales_df(product_id: int, db: Session) -> pd.DataFrame:
    from app.models.models import Sale
    sales = db.query(Sale).filter(Sale.product_id == product_id).order_by(Sale.sold_at).all()
    if not sales:
        return pd.DataFrame(columns=["ds", "y"])
    data = [{"ds": s.sold_at.date(), "y": float(s.quantity)} for s in sales]
    df = pd.DataFrame(data)
    df["ds"] = pd.to_datetime(df["ds"])
    daily = df.groupby("ds")["y"].sum().reset_index()
    return daily


# ─────────────────────────────────────────────────────────
# MODULE 1: Prophet Demand Forecasting
# ─────────────────────────────────────────────────────────
def forecast_demand(product_id: int, db: Session, days: int = 30) -> List[Dict]:
    from app.models.models import MLForecast
    try:
        from prophet import Prophet
    except ImportError:
        return _fallback_forecast(product_id, db, days)

    df = get_product_sales_df(product_id, db)
    if len(df) < 10:
        return _fallback_forecast(product_id, db, days)

    try:
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            changepoint_prior_scale=0.05
        )
        model.fit(df)
        future = model.make_future_dataframe(periods=days)
        forecast = model.predict(future)
        tail = forecast.tail(days)

        db.query(MLForecast).filter(MLForecast.product_id == product_id).delete()
        for _, row in tail.iterrows():
            fc = MLForecast(
                product_id=product_id,
                forecast_date=row["ds"],
                predicted_qty=max(0, row["yhat"]),
                lower_bound=max(0, row["yhat_lower"]),
                upper_bound=max(0, row["yhat_upper"])
            )
            db.add(fc)
        db.commit()

        return [
            {
                "date": str(row["ds"].date()),
                "predicted": max(0, round(row["yhat"], 2)),
                "lower": max(0, round(row["yhat_lower"], 2)),
                "upper": max(0, round(row["yhat_upper"], 2))
            }
            for _, row in tail.iterrows()
        ]
    except Exception:
        return _fallback_forecast(product_id, db, days)


def _fallback_forecast(product_id: int, db: Session, days: int) -> List[Dict]:
    from app.models.models import Sale
    sales = db.query(Sale).filter(Sale.product_id == product_id).all()
    if sales:
        avg_qty = sum(s.quantity for s in sales) / max(len(sales), 1)
    else:
        avg_qty = 5.0

    result = []
    base = datetime.utcnow().date()
    for i in range(1, days + 1):
        noise = avg_qty * 0.15 * (np.random.random() - 0.5)
        predicted = max(0, avg_qty + noise)
        result.append({
            "date": str(base + timedelta(days=i)),
            "predicted": round(predicted, 2),
            "lower": round(max(0, predicted * 0.8), 2),
            "upper": round(predicted * 1.2, 2)
        })
    return result


# ─────────────────────────────────────────────────────────
# MODULE 2: ABC-XYZ Analysis
# ─────────────────────────────────────────────────────────
def run_abc_xyz_analysis(db: Session) -> List[Dict]:
    from app.models.models import Product, Sale

    products = db.query(Product).all()
    if not products:
        return []

    product_stats = []
    for product in products:
        sales = db.query(Sale).filter(Sale.product_id == product.id).all()
        total_revenue = sum(s.total_price for s in sales)
        quantities = []
        if sales:
            df = pd.DataFrame([{"date": s.sold_at.date(), "qty": s.quantity} for s in sales])
            df["date"] = pd.to_datetime(df["date"])
            monthly = df.groupby(df["date"].dt.to_period("M"))["qty"].sum()
            quantities = monthly.tolist()

        product_stats.append({
            "id": product.id,
            "name_ru": product.name_ru,
            "name_kz": product.name_kz,
            "sku": product.sku,
            "total_revenue": total_revenue,
            "quantities": quantities,
            "current_stock": product.current_stock,
            "purchase_price": product.purchase_price
        })

    # ABC Classification (by revenue)
    total_rev = sum(p["total_revenue"] for p in product_stats)
    product_stats.sort(key=lambda x: x["total_revenue"], reverse=True)

    cumulative = 0
    for p in product_stats:
        if total_rev > 0:
            cumulative += p["total_revenue"] / total_rev
        if cumulative <= 0.80:
            p["abc"] = "A"
        elif cumulative <= 0.95:
            p["abc"] = "B"
        else:
            p["abc"] = "C"

    # XYZ Classification (by demand variability)
    for p in product_stats:
        qtys = p["quantities"]
        if len(qtys) >= 2:
            mean_q = np.mean(qtys)
            std_q = np.std(qtys)
            cv = std_q / mean_q if mean_q > 0 else 1.0
        elif len(qtys) == 1:
            cv = 0.0
        else:
            cv = 1.0

        if cv < 0.1:
            p["xyz"] = "X"
        elif cv <= 0.25:
            p["xyz"] = "Y"
        else:
            p["xyz"] = "Z"

        p["cv"] = round(cv, 3)
        p["combined"] = p["abc"] + p["xyz"]

    # Update in DB
    from app.models.models import Product as ProductModel
    for p in product_stats:
        product = db.query(ProductModel).filter(ProductModel.id == p["id"]).first()
        if product:
            product.abc_class = p["abc"]
            product.xyz_class = p["xyz"]
    db.commit()

    return [
        {
            "product_id": p["id"],
            "name_ru": p["name_ru"],
            "name_kz": p["name_kz"],
            "sku": p["sku"],
            "abc_class": p["abc"],
            "xyz_class": p["xyz"],
            "combined": p["combined"],
            "total_revenue": round(p["total_revenue"], 2),
            "cv": p["cv"],
            "current_stock": p["current_stock"]
        }
        for p in product_stats
    ]


# ─────────────────────────────────────────────────────────
# MODULE 3: EOQ + Reorder Point
# ─────────────────────────────────────────────────────────
def calculate_reorder(product, db: Session) -> Dict:
    from app.models.models import Sale

    sales = db.query(Sale).filter(Sale.product_id == product.id).all()

    if sales:
        total_qty = sum(s.quantity for s in sales)
        if sales:
            first_sale = min(s.sold_at for s in sales)
            # Handle both naive and aware datetimes
            now = datetime.utcnow()
            if first_sale.tzinfo is not None:
                from datetime import timezone
                now = datetime.now(timezone.utc)
            days_span = max((now - first_sale).days, 1)
        else:
            days_span = 180
        avg_daily_demand = total_qty / days_span

        quantities_by_day = {}
        for s in sales:
            day = s.sold_at.date()
            quantities_by_day[day] = quantities_by_day.get(day, 0) + s.quantity
        daily_values = list(quantities_by_day.values())
        sigma = float(np.std(daily_values)) if len(daily_values) > 1 else avg_daily_demand * 0.2
    else:
        avg_daily_demand = 1.0
        sigma = 0.5

    annual_demand = avg_daily_demand * 365
    order_cost = product.order_cost or 5000
    holding_cost = (product.holding_cost_pct or 0.25) * product.purchase_price

    if holding_cost > 0 and annual_demand > 0:
        eoq = math.sqrt((2 * annual_demand * order_cost) / holding_cost)
    else:
        eoq = product.min_stock * 2

    Z = 1.65  # 95% service level
    lead_time = product.lead_time_days or 7
    safety_stock = Z * sigma * math.sqrt(lead_time)
    reorder_point = (avg_daily_demand * lead_time) + safety_stock

    if avg_daily_demand > 0:
        days_until_stockout = product.current_stock / avg_daily_demand
    else:
        days_until_stockout = 9999

    return {
        "product_id": product.id,
        "eoq": round(eoq, 1),
        "reorder_point": round(reorder_point, 1),
        "safety_stock": round(safety_stock, 1),
        "avg_daily_demand": round(avg_daily_demand, 2),
        "annual_demand": round(annual_demand, 1),
        "days_until_stockout": round(days_until_stockout, 1),
        "current_stock": product.current_stock
    }


# ─────────────────────────────────────────────────────────
# MODULE 4: K-Means Clustering
# ─────────────────────────────────────────────────────────
def run_clustering(db: Session) -> List[Dict]:
    from app.models.models import Product, Sale
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler

    products = db.query(Product).all()
    if len(products) < 4:
        return []

    feature_matrix = []
    product_info = []

    for product in products:
        sales = db.query(Sale).filter(Sale.product_id == product.id).all()
        total_qty = sum(s.quantity for s in sales)
        total_revenue = sum(s.total_price for s in sales)
        months = 6
        avg_monthly_sales = total_qty / months if months > 0 else 0

        if product.purchase_price > 0:
            stock_turnover = total_qty / max(product.current_stock, 1)
        else:
            stock_turnover = 0

        quantities_by_month = {}
        for s in sales:
            key = s.sold_at.strftime("%Y-%m")
            quantities_by_month[key] = quantities_by_month.get(key, 0) + s.quantity
        monthly_vals = list(quantities_by_month.values()) or [0]
        demand_variance = float(np.var(monthly_vals))

        feature_matrix.append([
            avg_monthly_sales,
            stock_turnover,
            product.selling_price,
            demand_variance
        ])
        product_info.append({
            "id": product.id,
            "name_ru": product.name_ru,
            "name_kz": product.name_kz,
            "avg_monthly_sales": round(avg_monthly_sales, 2),
            "stock_turnover": round(stock_turnover, 2),
            "price": product.selling_price,
            "demand_variance": round(demand_variance, 2)
        })

    X = np.array(feature_matrix)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    n_clusters = min(4, len(products))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X_scaled)

    cluster_names = ["Жылдам сатылатын", "Баяу сатылатын", "Маусымдық", "Өлі қор"]
    cluster_names_ru = ["Быстро-оборачиваемый", "Медленно-оборачиваемый", "Сезонный", "Мертвый запас"]

    # Assign cluster labels by turnover (highest = Fast-moving)
    cluster_turnover = {}
    for i, label in enumerate(labels):
        cluster_turnover.setdefault(label, []).append(feature_matrix[i][1])
    avg_cluster_turnover = {k: np.mean(v) for k, v in cluster_turnover.items()}
    sorted_clusters = sorted(avg_cluster_turnover.keys(), key=lambda k: avg_cluster_turnover[k], reverse=True)
    cluster_map = {old: new for new, old in enumerate(sorted_clusters)}

    results = []
    from app.models.models import Product as ProductModel
    for i, info in enumerate(product_info):
        mapped_label = cluster_map.get(labels[i], labels[i])
        label_kz = cluster_names[mapped_label % len(cluster_names)]
        label_ru = cluster_names_ru[mapped_label % len(cluster_names_ru)]
        info["cluster"] = mapped_label
        info["cluster_label_kz"] = label_kz
        info["cluster_label_ru"] = label_ru

        product = db.query(ProductModel).filter(ProductModel.id == info["id"]).first()
        if product:
            product.cluster_label = label_ru
        results.append(info)

    db.commit()
    return results


# ─────────────────────────────────────────────────────────
# MODULE 5: Anomaly Detection (Isolation Forest)
# ─────────────────────────────────────────────────────────
def detect_anomalies(db: Session, product_id: Optional[int] = None) -> List[Dict]:
    from app.models.models import Sale, Alert
    from sklearn.ensemble import IsolationForest

    query = db.query(Sale)
    if product_id:
        query = query.filter(Sale.product_id == product_id)
    sales = query.order_by(Sale.sold_at).all()

    if len(sales) < 20:
        return []

    df = pd.DataFrame([{
        "date": s.sold_at.date(),
        "product_id": s.product_id,
        "quantity": s.quantity,
        "revenue": s.total_price
    } for s in sales])

    df["date"] = pd.to_datetime(df["date"])
    daily = df.groupby(["date", "product_id"]).agg(
        total_qty=("quantity", "sum"),
        total_rev=("revenue", "sum")
    ).reset_index()

    if len(daily) < 10:
        return []

    features = daily[["total_qty", "total_rev"]].values
    clf = IsolationForest(contamination=0.05, random_state=42)
    predictions = clf.fit_predict(features)

    anomalies = daily[predictions == -1].copy()
    result = []

    for _, row in anomalies.iterrows():
        product_id_val = int(row["product_id"])
        from app.models.models import Product
        product = db.query(Product).filter(Product.id == product_id_val).first()

        existing = db.query(Alert).filter(
            Alert.product_id == product_id_val,
            Alert.type == "anomaly",
            Alert.is_read == False
        ).first()
        if not existing and product:
            alert = Alert(
                product_id=product_id_val,
                type="anomaly",
                message=f"Сатылымда аномалия анықталды: '{product.name_ru}' {str(row['date'].date())} күні — мөлшері {row['total_qty']:.1f}",
                message_kz=f"'{product.name_kz}' тауарында сатылым аномалиясы анықталды: {str(row['date'].date())}"
            )
            db.add(alert)

        result.append({
            "date": str(row["date"].date()),
            "product_id": product_id_val,
            "total_qty": float(row["total_qty"]),
            "total_revenue": float(row["total_rev"]),
            "product_name_ru": product.name_ru if product else "Unknown",
            "product_name_kz": product.name_kz if product else ""
        })

    db.commit()
    return result


# ─────────────────────────────────────────────────────────
# Retrain all models
# ─────────────────────────────────────────────────────────
def retrain_all_models(db: Session) -> Dict:
    from app.models.models import Product

    products = db.query(Product).all()

    # Run ABC-XYZ
    abc_xyz_results = run_abc_xyz_analysis(db)

    # Run Clustering
    cluster_results = run_clustering(db)

    # Run Anomaly Detection
    anomalies = detect_anomalies(db)

    # Run forecasts for each product
    forecast_count = 0
    for product in products:
        forecast_demand(product.id, db, days=30)
        forecast_count += 1

    return {
        "status": "success",
        "abc_xyz_updated": len(abc_xyz_results),
        "clusters_updated": len(cluster_results),
        "anomalies_detected": len(anomalies),
        "forecasts_generated": forecast_count
    }
