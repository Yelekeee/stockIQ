"""
Seed script: 5 categories, 40 products, 3 suppliers, 6 months of daily sales, 50 stock movements
Run: python -m app.seed
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import random
import numpy as np
from datetime import datetime, timedelta
from app.database import engine, SessionLocal, Base
from app.models.models import (
    User, Category, Supplier, Product, Sale, StockMovement, PurchaseOrder, Alert
)
from app.routers.auth import hash_password

random.seed(42)
np.random.seed(42)

CATEGORIES = [
    {"name_kz": "Электроника", "name_ru": "Электроника"},
    {"name_kz": "Азық-түлік", "name_ru": "Продукты питания"},
    {"name_kz": "Кеңсе тауарлары", "name_ru": "Канцтовары"},
    {"name_kz": "Тұрмыстық тауарлар", "name_ru": "Бытовые товары"},
    {"name_kz": "Киім", "name_ru": "Одежда"},
]

SUPPLIERS = [
    {"name": "ТехноСнаб Казахстан", "contact_phone": "+7 727 123-45-67", "email": "techno@kz.com", "delivery_days": 5},
    {"name": "АзықТүлік Жеткізу", "contact_phone": "+7 727 234-56-78", "email": "food@kz.com", "delivery_days": 3},
    {"name": "ОфисПро Алматы", "contact_phone": "+7 727 345-67-89", "email": "office@kz.com", "delivery_days": 7},
]

PRODUCTS = [
    # Электроника (cat 0)
    {"name_kz": "Смартфон Samsung Galaxy A54", "name_ru": "Смартфон Samsung Galaxy A54", "sku": "EL-001", "unit": "шт", "purchase_price": 89000, "selling_price": 115000, "min_stock": 5, "max_stock": 50, "lead_time_days": 10, "cat": 0, "sup": 0},
    {"name_kz": "Ноутбук Lenovo IdeaPad", "name_ru": "Ноутбук Lenovo IdeaPad", "sku": "EL-002", "unit": "шт", "purchase_price": 245000, "selling_price": 310000, "min_stock": 3, "max_stock": 20, "lead_time_days": 14, "cat": 0, "sup": 0},
    {"name_kz": "Беспроводные наушники JBL", "name_ru": "Беспроводные наушники JBL", "sku": "EL-003", "unit": "шт", "purchase_price": 18000, "selling_price": 25000, "min_stock": 10, "max_stock": 100, "lead_time_days": 7, "cat": 0, "sup": 0},
    {"name_kz": "Планшет iPad 10-буын", "name_ru": "Планшет iPad 10-го поколения", "sku": "EL-004", "unit": "шт", "purchase_price": 165000, "selling_price": 210000, "min_stock": 5, "max_stock": 30, "lead_time_days": 12, "cat": 0, "sup": 0},
    {"name_kz": "Смарт сағат Apple Watch SE", "name_ru": "Смарт часы Apple Watch SE", "sku": "EL-005", "unit": "шт", "purchase_price": 72000, "selling_price": 95000, "min_stock": 5, "max_stock": 40, "lead_time_days": 10, "cat": 0, "sup": 0},
    {"name_kz": "Зарядтағыш USB-C 65W", "name_ru": "Зарядное устройство USB-C 65W", "sku": "EL-006", "unit": "шт", "purchase_price": 4500, "selling_price": 6500, "min_stock": 20, "max_stock": 200, "lead_time_days": 5, "cat": 0, "sup": 0},
    {"name_kz": "Bluetooth үндеткіш JBL Flip", "name_ru": "Bluetooth колонка JBL Flip", "sku": "EL-007", "unit": "шт", "purchase_price": 22000, "selling_price": 30000, "min_stock": 8, "max_stock": 60, "lead_time_days": 7, "cat": 0, "sup": 0},
    {"name_kz": "Мышь Logitech беспроводная", "name_ru": "Мышь Logitech беспроводная", "sku": "EL-008", "unit": "шт", "purchase_price": 8500, "selling_price": 12000, "min_stock": 15, "max_stock": 150, "lead_time_days": 5, "cat": 0, "sup": 0},

    # Азық-түлік (cat 1)
    {"name_kz": "Күріш (1 кг)", "name_ru": "Рис (1 кг)", "sku": "FD-001", "unit": "кг", "purchase_price": 380, "selling_price": 520, "min_stock": 100, "max_stock": 2000, "lead_time_days": 2, "cat": 1, "sup": 1},
    {"name_kz": "Ұн бидай (2 кг)", "name_ru": "Мука пшеничная (2 кг)", "sku": "FD-002", "unit": "кг", "purchase_price": 290, "selling_price": 400, "min_stock": 200, "max_stock": 3000, "lead_time_days": 2, "cat": 1, "sup": 1},
    {"name_kz": "Өсімдік майы (1 л)", "name_ru": "Масло растительное (1 л)", "sku": "FD-003", "unit": "л", "purchase_price": 850, "selling_price": 1100, "min_stock": 50, "max_stock": 1000, "lead_time_days": 3, "cat": 1, "sup": 1},
    {"name_kz": "Қант (1 кг)", "name_ru": "Сахар (1 кг)", "sku": "FD-004", "unit": "кг", "purchase_price": 420, "selling_price": 580, "min_stock": 100, "max_stock": 2000, "lead_time_days": 2, "cat": 1, "sup": 1},
    {"name_kz": "Макарон (400 г)", "name_ru": "Макароны (400 г)", "sku": "FD-005", "unit": "шт", "purchase_price": 210, "selling_price": 290, "min_stock": 100, "max_stock": 1500, "lead_time_days": 2, "cat": 1, "sup": 1},
    {"name_kz": "Тұз (1 кг)", "name_ru": "Соль (1 кг)", "sku": "FD-006", "unit": "кг", "purchase_price": 95, "selling_price": 140, "min_stock": 50, "max_stock": 1000, "lead_time_days": 2, "cat": 1, "sup": 1},
    {"name_kz": "Шай (100 г)", "name_ru": "Чай черный (100 г)", "sku": "FD-007", "unit": "шт", "purchase_price": 650, "selling_price": 890, "min_stock": 30, "max_stock": 500, "lead_time_days": 3, "cat": 1, "sup": 1},
    {"name_kz": "Кофе Jacobs (190 г)", "name_ru": "Кофе Jacobs (190 г)", "sku": "FD-008", "unit": "шт", "purchase_price": 2100, "selling_price": 2800, "min_stock": 20, "max_stock": 300, "lead_time_days": 3, "cat": 1, "sup": 1},
    {"name_kz": "Балық консервасы (240 г)", "name_ru": "Консервы рыбные (240 г)", "sku": "FD-009", "unit": "шт", "purchase_price": 450, "selling_price": 620, "min_stock": 50, "max_stock": 800, "lead_time_days": 3, "cat": 1, "sup": 1},

    # Кеңсе тауарлары (cat 2)
    {"name_kz": "А4 қағазы (500 парақ)", "name_ru": "Бумага А4 (500 листов)", "sku": "OF-001", "unit": "шт", "purchase_price": 1200, "selling_price": 1700, "min_stock": 30, "max_stock": 500, "lead_time_days": 5, "cat": 2, "sup": 2},
    {"name_kz": "Шариктік қалам (синий)", "name_ru": "Ручка шариковая (синяя)", "sku": "OF-002", "unit": "шт", "purchase_price": 85, "selling_price": 130, "min_stock": 100, "max_stock": 2000, "lead_time_days": 3, "cat": 2, "sup": 2},
    {"name_kz": "Маркер (қызыл)", "name_ru": "Маркер (красный)", "sku": "OF-003", "unit": "шт", "purchase_price": 280, "selling_price": 400, "min_stock": 30, "max_stock": 500, "lead_time_days": 4, "cat": 2, "sup": 2},
    {"name_kz": "Скотч 50м", "name_ru": "Скотч прозрачный 50м", "sku": "OF-004", "unit": "шт", "purchase_price": 350, "selling_price": 500, "min_stock": 20, "max_stock": 300, "lead_time_days": 3, "cat": 2, "sup": 2},
    {"name_kz": "Ноутбук дәптер А5", "name_ru": "Тетрадь А5 96 листов", "sku": "OF-005", "unit": "шт", "purchase_price": 450, "selling_price": 650, "min_stock": 50, "max_stock": 1000, "lead_time_days": 4, "cat": 2, "sup": 2},
    {"name_kz": "Папка-скоросшиватель", "name_ru": "Папка-скоросшиватель", "sku": "OF-006", "unit": "шт", "purchase_price": 320, "selling_price": 460, "min_stock": 20, "max_stock": 400, "lead_time_days": 4, "cat": 2, "sup": 2},
    {"name_kz": "Степплер 24/6", "name_ru": "Степлер 24/6", "sku": "OF-007", "unit": "шт", "purchase_price": 1100, "selling_price": 1600, "min_stock": 10, "max_stock": 100, "lead_time_days": 5, "cat": 2, "sup": 2},
    {"name_kz": "Калькулятор Casio", "name_ru": "Калькулятор Casio", "sku": "OF-008", "unit": "шт", "purchase_price": 3500, "selling_price": 5000, "min_stock": 5, "max_stock": 80, "lead_time_days": 7, "cat": 2, "sup": 2},

    # Тұрмыстық тауарлар (cat 3)
    {"name_kz": "Ыдыс жуатын сабын 1л", "name_ru": "Средство для посуды 1л", "sku": "HH-001", "unit": "шт", "purchase_price": 580, "selling_price": 820, "min_stock": 30, "max_stock": 500, "lead_time_days": 3, "cat": 3, "sup": 2},
    {"name_kz": "Кір жуатын порошок 3кг", "name_ru": "Стиральный порошок 3кг", "sku": "HH-002", "unit": "шт", "purchase_price": 1800, "selling_price": 2500, "min_stock": 20, "max_stock": 300, "lead_time_days": 4, "cat": 3, "sup": 2},
    {"name_kz": "Сыпыртқы жиынтығы", "name_ru": "Набор для уборки", "sku": "HH-003", "unit": "шт", "purchase_price": 3200, "selling_price": 4500, "min_stock": 10, "max_stock": 100, "lead_time_days": 5, "cat": 3, "sup": 2},
    {"name_kz": "Шыны тазалағыш 500мл", "name_ru": "Средство для стекла 500мл", "sku": "HH-004", "unit": "шт", "purchase_price": 490, "selling_price": 700, "min_stock": 20, "max_stock": 400, "lead_time_days": 3, "cat": 3, "sup": 2},
    {"name_kz": "Қолды жуатын сабын 300мл", "name_ru": "Жидкое мыло 300мл", "sku": "HH-005", "unit": "шт", "purchase_price": 380, "selling_price": 560, "min_stock": 30, "max_stock": 600, "lead_time_days": 3, "cat": 3, "sup": 2},
    {"name_kz": "Шаш жуатын шампунь 400мл", "name_ru": "Шампунь 400мл", "sku": "HH-006", "unit": "шт", "purchase_price": 1100, "selling_price": 1550, "min_stock": 20, "max_stock": 300, "lead_time_days": 4, "cat": 3, "sup": 2},
    {"name_kz": "Тіс пасты 75мл", "name_ru": "Зубная паста 75мл", "sku": "HH-007", "unit": "шт", "purchase_price": 520, "selling_price": 750, "min_stock": 40, "max_stock": 800, "lead_time_days": 3, "cat": 3, "sup": 1},

    # Киім (cat 4)
    {"name_kz": "Ер адам жейдесі (L)", "name_ru": "Мужская рубашка (L)", "sku": "CL-001", "unit": "шт", "purchase_price": 7500, "selling_price": 12000, "min_stock": 10, "max_stock": 100, "lead_time_days": 14, "cat": 4, "sup": 2},
    {"name_kz": "Әйел кофта (M)", "name_ru": "Женская кофта (M)", "sku": "CL-002", "unit": "шт", "purchase_price": 6200, "selling_price": 9800, "min_stock": 10, "max_stock": 100, "lead_time_days": 14, "cat": 4, "sup": 2},
    {"name_kz": "Джинс (32/32)", "name_ru": "Джинсы (32/32)", "sku": "CL-003", "unit": "шт", "purchase_price": 8900, "selling_price": 14500, "min_stock": 8, "max_stock": 80, "lead_time_days": 14, "cat": 4, "sup": 2},
    {"name_kz": "Спорт жаттықтырғыш костюм", "name_ru": "Спортивный костюм", "sku": "CL-004", "unit": "шт", "purchase_price": 12000, "selling_price": 18500, "min_stock": 5, "max_stock": 60, "lead_time_days": 14, "cat": 4, "sup": 2},
    {"name_kz": "Жазғы сарафан", "name_ru": "Летний сарафан", "sku": "CL-005", "unit": "шт", "purchase_price": 5800, "selling_price": 9200, "min_stock": 8, "max_stock": 80, "lead_time_days": 14, "cat": 4, "sup": 2},
    {"name_kz": "Балалар футболкасы", "name_ru": "Детская футболка", "sku": "CL-006", "unit": "шт", "purchase_price": 2800, "selling_price": 4500, "min_stock": 20, "max_stock": 200, "lead_time_days": 10, "cat": 4, "sup": 2},
]


def generate_daily_sales(product, start_date, end_date, db):
    """Generate realistic 6-month daily sales with seasonality."""
    current = start_date
    sales_list = []
    base_qty = {
        "шт": random.uniform(1, 8),
        "кг": random.uniform(5, 30),
        "л": random.uniform(3, 15),
    }.get(product.unit, random.uniform(1, 10))

    # Scale by price: cheaper items sell more
    if product.selling_price > 100000:
        base_qty *= 0.3
    elif product.selling_price > 10000:
        base_qty *= 0.7
    elif product.selling_price < 1000:
        base_qty *= 3.0

    while current <= end_date:
        # Seasonality: weekend boost, month-end dip
        day_of_week = current.weekday()
        week_factor = 1.3 if day_of_week >= 4 else 1.0  # Fri/Sat boost
        month_factor = 1.2 if current.month in [1, 3, 9, 12] else 1.0  # seasonal

        qty = base_qty * week_factor * month_factor * np.random.lognormal(0, 0.3)
        qty = max(0.1, round(qty, 1 if product.unit == "шт" else 2))

        if qty > 0 and random.random() > 0.15:  # 85% chance of sale each day
            sale = Sale(
                product_id=product.id,
                quantity=qty,
                unit_price=product.selling_price,
                total_price=qty * product.selling_price,
                sold_at=datetime.combine(current, datetime.min.time()) + timedelta(
                    hours=random.randint(8, 20),
                    minutes=random.randint(0, 59)
                )
            )
            sales_list.append(sale)

        current += timedelta(days=1)

    return sales_list


def run():
    print("Creating tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Seeding users...")
        admin = User(
            name="Администратор",
            email="admin@stockiq.kz",
            password_hash=hash_password("admin123"),
            role="admin"
        )
        manager = User(
            name="Менеджер Айгуль",
            email="manager@stockiq.kz",
            password_hash=hash_password("manager123"),
            role="manager"
        )
        viewer = User(
            name="Наблюдатель",
            email="viewer@stockiq.kz",
            password_hash=hash_password("viewer123"),
            role="viewer"
        )
        db.add_all([admin, manager, viewer])
        db.commit()

        print("Seeding categories...")
        categories = []
        for cat_data in CATEGORIES:
            cat = Category(**cat_data)
            db.add(cat)
            categories.append(cat)
        db.commit()

        print("Seeding suppliers...")
        suppliers = []
        for sup_data in SUPPLIERS:
            sup = Supplier(**sup_data)
            db.add(sup)
            suppliers.append(sup)
        db.commit()

        print("Seeding products...")
        products = []
        for prod_data in PRODUCTS:
            cat_idx = prod_data.pop("cat")
            sup_idx = prod_data.pop("sup")
            prod = Product(
                **prod_data,
                category_id=categories[cat_idx].id,
                supplier_id=suppliers[sup_idx].id,
                current_stock=random.randint(
                    prod_data.get("min_stock", 10),
                    prod_data.get("max_stock", 100)
                ) // 2 + prod_data.get("min_stock", 10),
                order_cost=random.choice([3000, 5000, 7000, 10000]),
                holding_cost_pct=random.choice([0.15, 0.20, 0.25, 0.30]),
                barcode=f"87700{random.randint(1000000, 9999999)}"
            )
            db.add(prod)
            products.append(prod)
        db.commit()

        # Force some products below min_stock for alerts
        for p in products[:5]:
            p.current_stock = max(0, p.min_stock - random.randint(1, 5))
        db.commit()

        print("Generating 6 months of sales history...")
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=180)

        all_sales = []
        for product in products:
            sales = generate_daily_sales(product, start_date, end_date, db)
            all_sales.extend(sales)

        # Batch insert
        batch_size = 500
        for i in range(0, len(all_sales), batch_size):
            db.add_all(all_sales[i:i+batch_size])
            db.commit()
        print(f"  Created {len(all_sales)} sales records")

        print("Seeding stock movements...")
        movement_types = ["incoming", "incoming", "incoming", "outgoing", "adjustment"]
        movements = []
        for i in range(50):
            product = random.choice(products)
            mv_type = random.choice(movement_types)
            qty = random.uniform(5, 50)
            movements.append(StockMovement(
                product_id=product.id,
                type=mv_type,
                quantity=round(qty, 1),
                unit_price=product.purchase_price,
                reason=random.choice([
                    "Жаңа жеткізілім / Новая поставка",
                    "Тексеру / Инвентаризация",
                    "Қайтарым / Возврат",
                    "Зиян / Порча",
                    "Маусым / Сезонная корректировка"
                ]),
                user_id=admin.id,
                created_at=datetime.utcnow() - timedelta(days=random.randint(0, 60))
            ))
        db.add_all(movements)
        db.commit()

        print("Generating purchase orders...")
        orders = []
        for i in range(15):
            product = random.choice(products)
            status = random.choice(["draft", "sent", "received", "received", "cancelled"])
            orders.append(PurchaseOrder(
                product_id=product.id,
                supplier_id=product.supplier_id,
                ordered_qty=random.randint(20, 200),
                unit_price=product.purchase_price,
                status=status,
                is_auto_generated=random.random() > 0.5,
                urgency_level=random.choice(["normal", "warning", "critical"]),
                created_at=datetime.utcnow() - timedelta(days=random.randint(0, 30))
            ))
        db.add_all(orders)
        db.commit()

        print("Running ML models...")
        from app.services.ml_service import run_abc_xyz_analysis, run_clustering, detect_anomalies, forecast_demand

        print("  Running ABC-XYZ analysis...")
        run_abc_xyz_analysis(db)

        print("  Running K-Means clustering...")
        run_clustering(db)

        print("  Running anomaly detection...")
        detect_anomalies(db)

        print("  Generating forecasts (this may take a moment)...")
        for i, product in enumerate(products):
            try:
                forecast_demand(product.id, db, days=30)
                if (i + 1) % 5 == 0:
                    print(f"    Forecasted {i+1}/{len(products)} products...")
            except Exception as e:
                print(f"    Warning: forecast for {product.name_ru} failed: {e}")

        print("\n✅ Seed complete!")
        print(f"   Users: admin@stockiq.kz / admin123")
        print(f"   Products: {len(products)}")
        print(f"   Sales records: {len(all_sales)}")
        print(f"   Stock movements: {len(movements)}")
        print(f"   Purchase orders: {len(orders)}")

    finally:
        db.close()


if __name__ == "__main__":
    run()
