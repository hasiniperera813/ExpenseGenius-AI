"""Root entry point for the FastAPI application.

Allows running directly via:
    uvicorn app:app --reload --port 8000
"""

from app.main import app

__all__ = ["app"]
