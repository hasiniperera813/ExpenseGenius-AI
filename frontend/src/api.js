const API_BASE = `http://${window.location.hostname}:8000/api/v1`;
const RECEIPT_SCAN_TIMEOUT_MS = 75_000;

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Backend offline");
  return res.json();
}

export async function fetchExpenses(params = {}) {
  const query = new URLSearchParams();
  if (params.category) query.append("category", params.category);
  if (params.search) query.append("search", params.search);
  if (params.page) query.append("page", params.page);
  if (params.page_size) query.append("page_size", params.page_size);

  const res = await fetch(`${API_BASE}/expenses/?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch expenses");
  return res.json();
}

export async function createExpense(expenseData) {
  const res = await fetch(`${API_BASE}/expenses/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(expenseData),
  });
  if (!res.ok) throw new Error("Failed to create expense");
  return res.json();
}

export async function deleteExpense(id) {
  const res = await fetch(`${API_BASE}/expenses/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete expense");
  return true;
}

export async function fetchAnalytics() {
  const res = await fetch(`${API_BASE}/analytics/summary`);
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

export async function scanReceipt(file) {
  const formData = new FormData();
  formData.append("file", file);

  return requestReceiptScan("/receipts/scan", formData, "Failed to scan receipt");
}

export async function scanAndCreateExpense(file) {
  const formData = new FormData();
  formData.append("file", file);

  return requestReceiptScan("/receipts/scan-and-create", formData, "Failed to scan and save expense");
}

async function requestReceiptScan(path, formData, fallbackMessage) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RECEIPT_SCAN_TIMEOUT_MS);
  let res;

  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Receipt scanning took too long. Check your connection and try again.");
    }
    throw new Error("Could not connect to the receipt scanner. Check that the backend is running and try again.");
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatErrorMessage(err.detail || err.message) || `${fallbackMessage} (HTTP ${res.status})`);
  }
  return res.json();
}

export async function askAdvisor(question) {
  const res = await fetch(`${API_BASE}/advisor/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Advisor query failed" }));
    throw new Error(err.detail || "Failed to get financial advice");
  }
  return res.json();
}

export async function auditBudget(month) {
  const url = month ? `${API_BASE}/advisor/audit?month=${month}` : `${API_BASE}/advisor/audit`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Audit failed" }));
    throw new Error(err.detail || "Failed to audit budget");
  }
  return res.json();
}

function formatErrorMessage(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        return item?.msg || item?.message || "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (value && typeof value === "object") {
    return formatErrorMessage(value.detail || value.message || value.error);
  }
  return "";
}
