import base64
import uuid
from io import BytesIO
from pathlib import Path
from typing import Tuple
from fastapi import HTTPException, UploadFile, status
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.core.config import settings

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
}

ALLOWED_DOCUMENT_TYPES = {
    "application/pdf": ".pdf",
}

ALLOWED_MIME_TYPES = {**ALLOWED_IMAGE_TYPES, **ALLOWED_DOCUMENT_TYPES}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB limit


async def validate_and_save_upload(file: UploadFile) -> Tuple[Path, str, bytes]:
    """
    Validates uploaded receipt/invoice file by MIME type and size,
    saves it securely into the configured upload directory,
    and returns (saved_path, mime_type, file_bytes).
    """
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        allowed_list = ", ".join(ALLOWED_MIME_TYPES.keys())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{content_type}'. Supported types: {allowed_list}",
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB.",
        )

    if content_type in ALLOWED_DOCUMENT_TYPES:
        try:
            if PdfReader(BytesIO(file_bytes), strict=False).is_encrypted:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This PDF is encrypted or password-protected. Please save an unprotected copy and upload it.",
                )
        except PdfReadError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded PDF could not be read. Please upload a valid PDF file.",
            ) from exc

    # Generate unique filename
    ext = ALLOWED_MIME_TYPES[content_type]
    unique_filename = f"receipt_{uuid.uuid4().hex[:12]}{ext}"
    target_path = settings.upload_path / unique_filename

    # Save to disk
    with open(target_path, "wb") as f:
        f.write(file_bytes)

    return target_path, content_type, file_bytes


def encode_bytes_to_base64(file_bytes: bytes) -> str:
    """Encode binary content into UTF-8 base64 string for Gemini API."""
    return base64.b64encode(file_bytes).decode("utf-8")


def get_gemini_input_part(file_bytes: bytes, mime_type: str) -> dict:
    """
    Formats the file bytes into a Gemini Interactions API input part dict.
    - 'image' for images
    - 'document' for application/pdf
    """
    b64_data = encode_bytes_to_base64(file_bytes)
    if mime_type in ALLOWED_DOCUMENT_TYPES:
        part_type = "document"
    else:
        part_type = "image"

    return {
        "type": part_type,
        "data": b64_data,
        "mime_type": mime_type,
    }
