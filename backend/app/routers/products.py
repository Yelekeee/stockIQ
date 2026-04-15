from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.models.models import Product, Category, Supplier
from app.schemas.schemas import ProductCreate, ProductUpdate, ProductOut, CategoryOut, SupplierCreate, SupplierOut

router = APIRouter(prefix="/api", tags=["products"])


@router.get("/categories", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()


@router.get("/suppliers", response_model=List[SupplierOut])
def get_suppliers(db: Session = Depends(get_db)):
    return db.query(Supplier).all()


@router.post("/suppliers", response_model=SupplierOut)
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db)):
    supplier = Supplier(**data.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.get("/products", response_model=List[ProductOut])
def get_products(
    db: Session = Depends(get_db),
    category_id: Optional[int] = None,
    abc_class: Optional[str] = None,
    xyz_class: Optional[str] = None,
    cluster: Optional[str] = None,
    search: Optional[str] = None,
    stock_status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    query = db.query(Product)
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if abc_class:
        query = query.filter(Product.abc_class == abc_class)
    if xyz_class:
        query = query.filter(Product.xyz_class == xyz_class)
    if cluster:
        query = query.filter(Product.cluster_label == cluster)
    if search:
        query = query.filter(
            Product.name_ru.ilike(f"%{search}%") |
            Product.name_kz.ilike(f"%{search}%") |
            Product.sku.ilike(f"%{search}%")
        )
    if stock_status == "critical":
        query = query.filter(Product.current_stock <= Product.min_stock)
    elif stock_status == "warning":
        query = query.filter(
            Product.current_stock > Product.min_stock,
            Product.current_stock <= Product.min_stock * 1.5
        )
    elif stock_status == "ok":
        query = query.filter(Product.current_stock > Product.min_stock * 1.5)
    products = query.offset(skip).limit(limit).all()
    return products


@router.post("/products", response_model=ProductOut)
def create_product(data: ProductCreate, db: Session = Depends(get_db)):
    if db.query(Product).filter(Product.sku == data.sku).first():
        raise HTTPException(status_code=400, detail="SKU already exists")
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: int, data: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"message": "Product deleted"}
