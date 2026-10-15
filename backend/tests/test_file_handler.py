import asyncio
from io import BytesIO

import pytest
from fastapi import HTTPException, UploadFile
from pypdf import PdfWriter
from starlette.datastructures import Headers

from app.utils.file_handler import validate_and_save_upload


def test_rejects_password_protected_pdf():
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    writer.encrypt("receipt-password")
    pdf_bytes = BytesIO()
    writer.write(pdf_bytes)

    upload = UploadFile(
        filename="locked.pdf",
        file=BytesIO(pdf_bytes.getvalue()),
        headers=Headers({"content-type": "application/pdf"}),
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(validate_and_save_upload(upload))

    assert exc_info.value.status_code == 400
    assert "password-protected" in exc_info.value.detail
