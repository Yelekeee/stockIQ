#!/bin/bash
set -e

echo "════════════════════════════════════════════════════"
echo "  StockIQ — Зияткерлік қойма жүйесі"
echo "  Intelligent Inventory Management System"
echo "════════════════════════════════════════════════════"

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 -U stockiq -d stockiq_db &>/dev/null; then
  echo ""
  echo "⚠  PostgreSQL is not running."
  echo "   Option 1: Use Docker: docker-compose up -d postgres"
  echo "   Option 2: Create manually:"
  echo "     createuser -s stockiq"
  echo "     createdb -O stockiq stockiq_db"
  echo "     psql -c \"ALTER USER stockiq WITH PASSWORD 'stockiq123';\""
  echo ""
fi

echo ""
echo "Starting Backend (FastAPI)..."
cd "$(dirname "$0")/backend"

if [ ! -d "venv" ]; then
  echo "  Creating virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate

echo "  Installing dependencies..."
pip install -q -r requirements.txt

echo "  Running database seed..."
python -m app.seed

echo "  Starting API server on http://localhost:8000"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &

BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

echo ""
echo "Starting Frontend (React + Vite)..."
cd "$(dirname "$0")/frontend"

if [ ! -d "node_modules" ]; then
  echo "  Installing npm dependencies..."
  npm install
fi

echo "  Starting dev server on http://localhost:5173"
npm run dev &

FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "════════════════════════════════════════════════════"
echo "  ✅ StockIQ is running!"
echo ""
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "  Login: admin@stockiq.kz / admin123"
echo "════════════════════════════════════════════════════"
echo ""
echo "Press Ctrl+C to stop all services"

wait $BACKEND_PID $FRONTEND_PID
