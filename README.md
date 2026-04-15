# StockIQ — Зияткерлік қойма жүйесі

**Кәсіпорын қорларын есепке алуды басқарудың зияткерлік жүйесін құру**
*(Creation of an intelligent inventory management system for an enterprise)*

Дипломдық жоба • Дипломная работа • 2024

---

## Технологиялар / Технологии

| Layer | Stack |
|-------|-------|
| Frontend | React 18 + TypeScript + Tailwind CSS + Recharts |
| Backend | Python FastAPI + SQLAlchemy |
| Database | PostgreSQL 15 |
| ML | Prophet (forecasting) + scikit-learn (clustering, anomaly) |
| Auth | JWT (Role-based: Admin / Manager / Viewer) |

---

## ML Модульдер / ML Модули

1. **Prophet Болжамы** — Сұраныс болжамы (30 күн, сенімділік аралығымен)
2. **ABC-XYZ Талдауы** — Тауарларды ABC (пайда) және XYZ (тұрақтылық) бойынша классификациялау
3. **EOQ + Тапсырыс нүктесі** — Оңтайлы тапсырыс мөлшері және қайта тапсырыс нүктесі
4. **K-Means Кластерлеу** — 4 кластерге топтастыру (жылдам/баяу/маусымдық/өлі қор)
5. **Аномалия Анықтау** — Isolation Forest алгоритмі
6. **Авто-тапсырыс** — ML негізінде автоматты тапсырыс жасау

---

## Жылдам іске қосу / Быстрый запуск

### Алғышарттар / Требования
- Python 3.10+
- Node.js 18+
- PostgreSQL 15

### 1. Дерекқор / База данных

```bash
# PostgreSQL-де дерекқор жасау:
psql -c "CREATE USER stockiq WITH PASSWORD 'stockiq123';"
psql -c "CREATE DATABASE stockiq_db OWNER stockiq;"
```

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Дерекқорды толтыру (6 айлық тарих + ML оқыту):
python -m app.seed

# Серверді іске қосу:
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Браузерде ашу / Открыть в браузере

- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **Login**: `admin@stockiq.kz` / `admin123`

---

## Тіркелгілер / Учётные записи

| Email | Пароль | Рөл |
|-------|--------|-----|
| admin@stockiq.kz | admin123 | Администратор |
| manager@stockiq.kz | manager123 | Менеджер |
| viewer@stockiq.kz | viewer123 | Бақылаушы |

---

## API Маршруттар / API Маршруты

```
POST /api/auth/login          — Жүйеге кіру
GET  /api/products            — Тауарлар тізімі
GET  /api/dashboard/summary   — Дашборд мәліметтері
GET  /api/ml/forecast/{id}    — Prophet болжамы
GET  /api/ml/abc-xyz          — ABC-XYZ талдауы
GET  /api/ml/clusters         — K-Means кластерлеу
GET  /api/ml/reorder/{id}     — EOQ + тапсырыс нүктесі
GET  /api/ml/anomalies        — Аномалия анықтау
POST /api/orders/auto-generate — Авто-тапсырыс жасау
POST /api/ml/retrain          — Барлық модельдерді қайта оқыту
```

---

## Беттер / Страницы

| URL | Бет |
|-----|-----|
| `/` | Дашборд — Метрикалар, диаграммалар |
| `/products` | Тауарлар — ABC/XYZ/Кластер фильтрлері |
| `/products/:id` | Тауар бөлшектері — Prophet болжамы |
| `/stock` | Қор қозғалысы |
| `/sales` | Сатылым |
| `/orders` | Тапсырыстар + ML авто-тапсырыс |
| `/analytics` | ML Аналитика — 5 қойынды |
| `/reports` | Есептер — PDF |

---

*Алматы технологиялық университеті • 2024*
