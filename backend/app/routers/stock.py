from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.models import StockMovement, Product, Alert, AlertType
from app.schemas.schemas import StockMovementCreate, StockMovementOut

router = APIRouter(prefix="/api/stock", tags=["stock"])


def check_stock_alerts(product: Product, db: Session):
    if product.current_stock <= product.min_stock:
        existing = db.query(Alert).filter(
            Alert.product_id == product.id,
            Alert.type == AlertType.low_stock,
            Alert.is_read == False
        ).first()
        if not existing:
            alert = Alert(
                product_id=product.id,
                type=AlertType.low_stock,
                message=f"Товар '{product.name_ru}' ниже минимального запаса. Текущий: {product.current_stock}, минимум: {product.min_stock}",
                message_kz=f"'{product.name_kz}' тауарының қоры минималды деңгейден төмен. Қазіргі: {product.current_stock}, минимум: {product.min_stock}"
            )
            db.add(alert)
    if product.current_stock > product.max_stock:
        existing = db.query(Alert).filter(
            Alert.product_id == product.id,
            Alert.type == AlertType.overstock,
            Alert.is_read == False
        ).first()
        if not existing:
            alert = Alert(
                product_id=product.id,
                type=AlertType.overstock,
                message=f"Товар '{product.name_ru}' превышает максимальный запас. Текущий: {product.current_stock}, максимум: {product.max_stock}",
                message_kz=f"'{product.name_kz}' тауарының қоры максималды деңгейден жоғары. Қазіргі: {product.current_stock}, максимум: {product.max_stock}"
            )
            db.add(alert)


@router.post("/incoming", response_model=StockMovementOut)
def incoming_stock(data: StockMovementCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    movement = StockMovement(
        product_id=data.product_id,
        type="incoming",
        quantity=data.quantity,
        unit_price=data.unit_price,
        reason=data.reason
    )
    product.current_stock += data.quantity
    db.add(movement)
    check_stock_alerts(product, db)
    db.commit()
    db.refresh(movement)
    return movement


@router.post("/outgoing", response_model=StockMovementOut)
def outgoing_stock(data: StockMovementCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.current_stock < data.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    movement = StockMovement(
        product_id=data.product_id,
        type="outgoing",
        quantity=data.quantity,
        unit_price=data.unit_price,
        reason=data.reason
    )
    product.current_stock -= data.quantity
    db.add(movement)
    check_stock_alerts(product, db)
    db.commit()
    db.refresh(movement)
    return movement


@router.post("/adjustment", response_model=StockMovementOut)
def adjust_stock(data: StockMovementCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    movement = StockMovement(
        product_id=data.product_id,
        type="adjustment",
        quantity=data.quantity,
        unit_price=data.unit_price,
        reason=data.reason
    )
    product.current_stock += data.quantity
    db.add(movement)
    check_stock_alerts(product, db)
    db.commit()
    db.refresh(movement)
    return movement


@router.get("/movements/{product_id}", response_model=List[StockMovementOut])
def get_movements(product_id: int, db: Session = Depends(get_db), limit: int = 50):
    return db.query(StockMovement).filter(
        StockMovement.product_id == product_id
    ).order_by(StockMovement.created_at.desc()).limit(limit).all()


@router.get("/movements", response_model=List[StockMovementOut])
def get_all_movements(
    db: Session = Depends(get_db),
    movement_type: Optional[str] = None,
    limit: int = 100
):
    query = db.query(StockMovement)
    if movement_type:
        query = query.filter(StockMovement.type == movement_type)
    return query.order_by(StockMovement.created_at.desc()).limit(limit).all()
