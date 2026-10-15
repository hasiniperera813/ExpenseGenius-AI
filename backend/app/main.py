from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import api_router
from app.core.config import settings
from app.core.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for initialization and cleanup."""
    # Ensure database tables exist
    init_db()

    # Ensure upload directory exists
    _ = settings.upload_path

    yield


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Production-ready AI Expense Management System powered by FastAPI and Google Gemini API (gemini-3.8-flash).\n\n"
        "Features:\n"
        "- **Receipt & Invoice OCR**: Multimodal parsing of images & PDFs into structured line items.\n"
        "- **Smart Categorization**: Automated categorization and tagging.\n"
        "- **Expense Management**: Complete CRUD operations, rich query filters, and pagination.\n"
        "- **Financial Analytics**: Real-time spending summaries, category distribution, and monthly trends.\n"
        "- **AI Financial Advisor**: Conversational financial guidance and anomaly audits grounded in spending history."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded receipts statically
app.mount("/uploads", StaticFiles(directory=settings.upload_path), name="uploads")

# Include API v1 router
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["Root"])
def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "api_v1_url": "/api/v1",
        "gemini_model": settings.GEMINI_MODEL,
        "gemini_configured": settings.is_gemini_configured,
    }
