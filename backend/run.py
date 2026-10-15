"""Convenience script to run the FastAPI development server."""

import uvicorn
from app.core.config import settings

if __name__ == "__main__":
    print(f"Starting {settings.APP_NAME}...")
    print(f"Interactive Swagger UI: http://{settings.HOST}:{settings.PORT}/docs")
    print(f"ReDoc Documentation:    http://{settings.HOST}:{settings.PORT}/redoc")
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
