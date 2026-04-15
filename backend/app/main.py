from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routers import auth, products, stock, sales, orders, ml, dashboard, reports

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="StockIQ API",
    description="Intelligent Inventory Management System / Зияткерлік қойма басқару жүйесі",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(stock.router)
app.include_router(sales.router)
app.include_router(orders.router)
app.include_router(ml.router)
app.include_router(dashboard.router)
app.include_router(reports.router)


@app.get("/")
def root():
    return {
        "system": "StockIQ",
        "description": "Кәсіпорын қорларын есепке алуды басқарудың зияткерлік жүйесі",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
def health():
    return {"status": "ok"}
