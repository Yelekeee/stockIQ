from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.services import ml_service

router = APIRouter(prefix="/api/ml", tags=["ml"])


@router.get("/forecast/{product_id}")
def get_forecast(product_id: int, days: int = 30, db: Session = Depends(get_db)):
    from app.models.models import Product
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    result = ml_service.forecast_demand(product_id, db, days)
    return {"product_id": product_id, "days": days, "forecast": result}


@router.get("/forecast/{product_id}/cached")
def get_cached_forecast(product_id: int, db: Session = Depends(get_db)):
    from app.models.models import MLForecast
    forecasts = db.query(MLForecast).filter(
        MLForecast.product_id == product_id
    ).order_by(MLForecast.forecast_date).all()
    return [
        {
            "date": str(f.forecast_date.date()),
            "predicted": f.predicted_qty,
            "lower": f.lower_bound,
            "upper": f.upper_bound
        }
        for f in forecasts
    ]


@router.get("/abc-xyz")
def get_abc_xyz(db: Session = Depends(get_db)):
    return ml_service.run_abc_xyz_analysis(db)


@router.get("/clusters")
def get_clusters(db: Session = Depends(get_db)):
    return ml_service.run_clustering(db)


@router.get("/reorder/{product_id}")
def get_reorder(product_id: int, db: Session = Depends(get_db)):
    from app.models.models import Product
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ml_service.calculate_reorder(product, db)


@router.get("/anomalies")
def get_anomalies(product_id: Optional[int] = None, db: Session = Depends(get_db)):
    return ml_service.detect_anomalies(db, product_id)


@router.post("/retrain")
def retrain_models(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    result = ml_service.retrain_all_models(db)
    return result


@router.get("/recommendations")
def get_recommendations(db: Session = Depends(get_db)):
    abc_xyz = ml_service.run_abc_xyz_analysis(db)
    recommendations = []
    for item in abc_xyz:
        combined = item.get("combined", "")
        name = item.get("name_ru", "")
        name_kz = item.get("name_kz", "")

        if combined == "AZ":
            recommendations.append({
                "product_id": item["product_id"],
                "name_ru": name,
                "name_kz": name_kz,
                "combined": combined,
                "recommendation_ru": f"Товар '{name}' (AZ) — высокий доход, нестабильный спрос. Рекомендуется увеличить страховой запас на 30%.",
                "recommendation_kz": f"'{name_kz}' тауары (AZ) — жоғары кіріс, тұрақсыз сұраныс. Қауіпсіздік қорын 30%-ға арттыру ұсынылады.",
                "priority": "high"
            })
        elif combined == "AX":
            recommendations.append({
                "product_id": item["product_id"],
                "name_ru": name,
                "name_kz": name_kz,
                "combined": combined,
                "recommendation_ru": f"Товар '{name}' (AX) — лучший класс. Поддерживайте оптимальный запас по EOQ.",
                "recommendation_kz": f"'{name_kz}' тауары (AX) — үздік класс. EOQ бойынша оңтайлы қорды сақтаңыз.",
                "priority": "medium"
            })
        elif combined in ["CX", "CY"]:
            recommendations.append({
                "product_id": item["product_id"],
                "name_ru": name,
                "name_kz": name_kz,
                "combined": combined,
                "recommendation_ru": f"Товар '{name}' (C) — низкий доход. Рассмотрите сокращение ассортимента или замену поставщика.",
                "recommendation_kz": f"'{name_kz}' тауары (C) — төмен кіріс. Ассортиментті қысқарту немесе жеткізушіні ауыстыру мүмкіндігін қарастырыңыз.",
                "priority": "low"
            })
        elif combined == "BZ":
            recommendations.append({
                "product_id": item["product_id"],
                "name_ru": name,
                "name_kz": name_kz,
                "combined": combined,
                "recommendation_ru": f"Товар '{name}' (BZ) — нестабильный спрос. Применяйте гибкое управление запасами.",
                "recommendation_kz": f"'{name_kz}' тауары (BZ) — тұрақсыз сұраныс. Икемді қорды басқаруды қолданыңыз.",
                "priority": "medium"
            })

    return recommendations[:20]
