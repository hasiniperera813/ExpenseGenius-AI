import asyncio
import threading
from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException

from app.services.gemini_service import GeminiService


class TimeoutInteractions:
    def create(self, **kwargs):
        assert 0 < kwargs["timeout"] <= 60.0
        raise httpx.ReadTimeout("request timed out")


class TimeoutClient:
    interactions = TimeoutInteractions()


def test_receipt_scan_returns_gateway_timeout(monkeypatch):
    monkeypatch.setattr(GeminiService, "client", property(lambda self: TimeoutClient()))
    service = GeminiService()

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(service.extract_receipt_data(b"test image", "image/jpeg"))

    assert exc_info.value.status_code == 504
    assert "timed out" in exc_info.value.detail.lower()


class ThreadCheckingInteractions:
    def create(self, **kwargs):
        assert threading.current_thread() is not threading.main_thread()
        return SimpleNamespace(output_text='{"total_amount": 42.5}')


class ThreadCheckingClient:
    interactions = ThreadCheckingInteractions()


def test_receipt_scan_runs_blocking_gemini_call_off_event_loop(monkeypatch):
    monkeypatch.setattr(GeminiService, "client", property(lambda self: ThreadCheckingClient()))
    service = GeminiService()

    result = asyncio.run(service.extract_receipt_data(b"test image", "image/jpeg"))

    assert result.total_amount == 42.5
