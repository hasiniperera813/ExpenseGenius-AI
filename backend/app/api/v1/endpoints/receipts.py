from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.receipt import ReceiptUploadResponse
from app.schemas.expense import ExpenseResponse
from app.services.gemini_service import gemini_service
from app.services.expense_service import expense_service
from app.utils.file_handler import validate_and_save_upload

router = APIRouter()


@router.post(
    "/scan",
    response_model=ReceiptUploadResponse,
    status_code=status.HTTP_200_OK,
    summary="Scan receipt or invoice using Gemini 3.8 Flash",
    description="Upload a receipt image (JPEG, PNG, WEBP, HEIC) or invoice PDF. Gemini extracts all details into structured JSON.",
)
async def scan_receipt(
    file: UploadFile = File(..., description="Receipt image or PDF file to scan"),
):
    saved_path, mime_type, file_bytes = await validate_and_save_upload(file)

    extracted_data = await gemini_service.extract_receipt_data(
        file_bytes=file_bytes,
        mime_type=mime_type,
    )

    return ReceiptUploadResponse(
        filename=saved_path.name,
        file_url=f"/uploads/{saved_path.name}",
        mime_type=mime_type,
        file_size_bytes=len(file_bytes),
        extracted_data=extracted_data,
        auto_created_expense_id=None,
    )


@router.post(
    "/scan-and-create",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Scan receipt and immediately create Expense in database",
    description="Scans the uploaded receipt using Gemini, saves the receipt file, and persists the extracted expense and line items to the database.",
)
async def scan_and_create_expense(
    file: UploadFile = File(..., description="Receipt image or PDF file to scan and record"),
    db: Session = Depends(get_db),
):
    saved_path, mime_type, file_bytes = await validate_and_save_upload(file)

    extracted_data = await gemini_service.extract_receipt_data(
        file_bytes=file_bytes,
        mime_type=mime_type,
    )

    file_url = f"/uploads/{saved_path.name}"
    expense = expense_service.create_from_extracted_receipt(
        db=db,
        extracted=extracted_data,
        receipt_file_url=file_url,
    )

    return expense
