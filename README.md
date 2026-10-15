# AI Expense Management System (FastAPI + Google Gemini API)

A production-grade Python FastAPI backend for an **AI Expense Management System** powered by the **Google Gemini API (`gemini-3.8-flash`)** and the modern `google-genai` SDK.

The system uses Gemini's multimodal reasoning and structured outputs to automatically scan receipts and invoices, itemize individual products, categorize transactions, detect spending anomalies, and provide personalized financial advice grounded in real expense data.

---

## 🚀 Key Features

- **🧾 Multimodal Receipt & Invoice OCR**: Upload receipts (JPEG, PNG, WEBP, HEIC) or unprotected invoice PDFs. Encrypted or password-protected PDFs must be saved as an unprotected copy before upload. Powered by Gemini 3.8 Flash with Pydantic JSON schemas, returning vendor name, transaction date, line items, taxes, totals, and payment methods. Gemini calls run off the server event loop and receipt scans return a retry message after 60 seconds if processing stalls.
- **⚡ Automated Categorization & Auto-Persistence**: Automatically classify expenses into categories (Food & Dining, Groceries, Utilities, Travel, Healthcare, etc.) or save directly to the database via `/api/v1/receipts/scan-and-create`. Expense amounts are displayed in Sri Lankan rupees (Rs/LKR).
- **📊 Comprehensive Expense CRUD**: Full expense management with itemized line items, pagination, and multi-field filtering (date ranges, merchants, categories, min/max amounts, and free-text search).
- **📈 Real-Time Spending Analytics**: Category distribution percentages, transaction counts, and monthly expenditure trends.
- **🤖 AI Financial Advisor & Budget Auditor**: Chat with an AI financial advisor that inspects your actual spending history to identify saving opportunities, detect anomaly spikes, and evaluate budget health scores.

---

## 📁 Project Directory Structure

```text
AI_Expense_Project/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   ├── advisor.py      # AI Financial Advisor & Budget Audit endpoints
│   │   │       │   ├── analytics.py    # Spending summaries & breakdown endpoints
│   │   │       │   ├── expenses.py     # Expense CRUD & filtering endpoints
│   │   │       │   ├── health.py       # Health check & Gemini status endpoint
│   │   │       │   └── receipts.py     # Gemini multimodal receipt scanning endpoints
│   │   │       └── api.py              # Aggregated v1 API router
│   │   ├── core/
│   │   │   ├── config.py               # Pydantic Settings & environment variables
│   │   │   └── database.py             # SQLAlchemy engine, session maker, & Base
│   │   ├── models/
│   │   │   └── expense.py              # SQLAlchemy ORM models (Expense, ExpenseItem, Category, Budget)
│   │   ├── schemas/
│   │   │   ├── advisor.py              # Pydantic schemas for AI advice & audits
│   │   │   ├── analytics.py            # Pydantic schemas for spending analytics
│   │   │   ├── expense.py              # Pydantic schemas for CRUD operations
│   │   │   └── receipt.py              # Pydantic schemas for Gemini structured receipt extraction
│   │   ├── services/
│   │   │   ├── expense_service.py      # Expense management & analytics business logic
│   │   │   └── gemini_service.py       # Google GenAI integration (gemini-3.8-flash)
│   │   ├── utils/
│   │   │   └── file_handler.py         # File upload validation & base64 formatting
│   │   └── main.py                     # FastAPI application setup, CORS, lifespan, routes
│   ├── tests/
│   │   ├── conftest.py                 # Pytest fixtures & in-memory SQLite setup
│   │   ├── test_expenses.py            # Expense CRUD & health check tests
│   │   └── test_schemas.py             # Schema validation unit tests
│   ├── .env.example                    # Environment variable template
│   ├── .env                            # Active environment configuration
│   ├── app.py                          # Root entrypoint alias
│   ├── requirements.txt                # Python dependencies
│   ├── run.py                          # Development server launcher script
│   └── seed_data.py                    # Sample database seeder
├── database/                           # SQLite database storage (expenses.db)
├── frontend/                           # React web client
├── mobile/                             # Expo / React Native app for Expo Go
├── uploads/                            # Uploaded receipt images & PDF files
├── .gitignore
└── README.md
```

---

## 🛠️ Prerequisites & Installation

### 1. Python Environment
Requires **Python 3.10+** (tested on Python 3.11).

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

# Install required dependencies
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` (or edit `backend/.env` directly):

```env
# Gemini API Key (Get yours from https://aistudio.google.com/)
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash

# Application Configuration
APP_NAME="AI Expense Management System"
APP_ENV=development
DEBUG=True
PORT=8000
HOST=0.0.0.0

# Database & Upload Storage
DATABASE_URL=sqlite:///../database/expenses.db
UPLOAD_DIR=../uploads

# CORS
CORS_ORIGINS=["*"]
```

---

## 🏃 Running the Application

### Option A: Using the Launcher Script
```bash
python run.py
```

### Option B: Using Uvicorn CLI
```bash
uvicorn app.main:app --reload --port 8000
```

Once running, access:
- **Interactive OpenAPI (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

---

## 📱 Running the Mobile App with Expo Go

1. Install **Expo Go** on your phone from the Google Play Store or Apple App Store.
2. Connect your phone and computer to the same Wi-Fi network.
3. Find your computer's Wi-Fi IPv4 address (on Windows, run `ipconfig` and look under the Wi-Fi adapter).
4. In `mobile`, copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to `http://<COMPUTER-WIFI-IP>:8000/api/v1`.
5. Start the backend so it listens on the network:

   ```powershell
   cd backend
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

6. In another terminal, start Expo:

   ```powershell
   cd mobile
   npm install
   npm start
   ```

7. Scan the Expo Go QR code with your phone. If Windows Firewall asks, allow Node.js on private networks. If LAN mode cannot connect, run `npm run start:tunnel` from `mobile`.

The mobile app includes expense analytics, searching and category filters, add/delete expense actions, receipt image/camera/PDF scanning, and AI advisor chat. The Expo Go client calls the backend directly, so use the computer's Wi-Fi IP rather than `localhost` or `127.0.0.1` in the mobile API URL.

### Build an installable Android APK locally

Install Android Studio and its Android SDK/SDK Platform/Build Tools on the computer, then set `ANDROID_HOME` to the SDK path. In `mobile/.env`, set `EXPO_PUBLIC_API_URL` to the computer's Wi-Fi address, for example `http://192.168.1.4:8000/api/v1`. Keep the backend running and reachable from the phone on the same Wi-Fi. Then run:

```powershell
cd mobile
npm install
npm run build:apk
```

The standalone release APK is at `mobile/android/app/build/outputs/apk/release/app-release.apk`. It includes the JavaScript app bundle and is signed with the local debug key for testing; do not publish this APK to an app store. Copy it to the Android phone and open it to install (allow installs from that file source if Android asks). The APK uses the configured backend address, so update `.env` and rebuild if the computer's Wi-Fi IP changes.

### Preview the mobile UI in a browser (without Expo Go)

Set `EXPO_PUBLIC_API_URL` in `mobile/.env` to `http://<COMPUTER-WIFI-IP>:8000/api/v1`, start the backend using the command above, then run:

```powershell
cd mobile
npm run web
```

Open the URL printed by Expo on the computer, or open `http://<COMPUTER-WIFI-IP>:8081` in a phone browser connected to the same Wi-Fi.

---

## 🧪 Seeding Sample Data & Testing

### Populate Sample Expenses
To test queries, analytics, and AI recommendations immediately with realistic expenses:
```bash
python seed_data.py
```

### Run Automated Tests
```bash
pytest -v
```

---

## 📡 API Endpoints Overview

### 1. Receipts & AI OCR (`/api/v1/receipts`)
- **`POST /api/v1/receipts/scan`**: Upload receipt image or PDF; Gemini 3.8 Flash extracts structured data (merchant, date, line items, totals, taxes, currency, category).
- **`POST /api/v1/receipts/scan-and-create`**: Upload receipt and directly create a recorded expense with line items in the database.

### 2. Expense Management (`/api/v1/expenses`)
- **`GET /api/v1/expenses/`**: List expenses with pagination and filtering (`category`, `merchant`, `start_date`, `end_date`, `min_amount`, `max_amount`, `search`).
- **`POST /api/v1/expenses/`**: Create manual expense with itemized list.
- **`GET /api/v1/expenses/{id}`**: Get single expense with line items.
- **`PUT /api/v1/expenses/{id}`**: Update expense details.
- **`DELETE /api/v1/expenses/{id}`**: Delete an expense.

### 3. Analytics & Trends (`/api/v1/analytics`)
- **`GET /api/v1/analytics/summary`**: Aggregated spending analytics, category percentage distribution, and monthly breakdown.

### 4. AI Financial Advisor (`/api/v1/advisor`)
- **`POST /api/v1/advisor/chat`**: Ask questions in natural language (e.g., *"Where am I spending too much money and how can I cut costs?"*). Gemini analyzes real spending history and returns structured recommendations.
- **`GET /api/v1/advisor/audit?month=2026-10`**: AI audit detecting anomalies, recurring subscriptions, budget overruns, and a financial health score (0-100).

---

## 💡 Gemini API Usage Details

This system uses the official `google-genai` SDK (`>= 2.25.0`) with `gemini-3.8-flash`:

```python
from google import genai
from app.schemas.receipt import ExtractedReceiptData

client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Multimodal structured extraction
interaction = client.interactions.create(
    model="gemini-3.8-flash",
    input=[
        {"type": "text", "text": "Extract all expense and line item data from this receipt."},
        {
            "type": "image",  # or "document" for PDF
            "data": base64_encoded_file_string,
            "mime_type": "image/jpeg"
        }
    ],
    response_format={
        "type": "text",
        "mime_type": "application/json",
        "schema": ExtractedReceiptData.model_json_schema()
    }
)

parsed_receipt = ExtractedReceiptData.model_validate_json(interaction.output_text)
```
#   E x p e n s e G e n i u s - A I  
 #   E x p e n s e G e n i u s - A I  
 