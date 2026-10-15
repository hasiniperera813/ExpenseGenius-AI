import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Upload,
  Receipt,
  LayoutDashboard,
  BotMessageSquare,
  TrendingDown,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  Banknote,
  PieChart,
  Calendar,
  X,
  Loader2,
  Send,
} from "lucide-react";
import * as api from "./api";
import "./App.css";

const formatRupees = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard" | "scanner" | "advisor"
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dashboard Data
  const [expenses, setExpenses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: "",
    amount: "",
    category: "Groceries",
    date: new Date().toISOString().split("T")[0],
    merchant: "",
  });

  // Receipt Scanner State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanSuccessMsg, setScanSuccessMsg] = useState("");
  const [scanErrorMsg, setScanErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    const mimeType = file.type || ({
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      heic: "image/heic",
      pdf: "application/pdf",
    })[extension] || "";
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

    if (!allowedTypes.includes(mimeType)) {
      setScanErrorMsg("Choose a JPG, PNG, WEBP, HEIC, or PDF receipt.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setScanErrorMsg("This file is larger than 20 MB. Choose a smaller receipt file.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setScanResult(null);
    setScanSuccessMsg("");
    setScanErrorMsg("");
    setPreviewUrl(mimeType.startsWith("image/") ? URL.createObjectURL(file) : null);
  }

  function removeSelectedFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setScanResult(null);
    setScanErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // AI Advisor State
  const [messages, setMessages] = useState([
    {
      role: "ai",
      headline: "Welcome to your AI Financial Advisor",
      content:
        "I am connected to your real expense history and powered by Google Gemini 3.8 Flash. Ask me anything about your spending, budget optimization, or category breakdowns!",
      insights: [],
      recommendations: [
        "Ask 'Where am I spending the most?' to see top categories.",
        "Ask 'How can I save Rs 10,000 this month?' for personalized tips.",
      ],
    },
  ]);
  const [advisorInput, setAdvisorInput] = useState("");
  const [isAskingAdvisor, setIsAskingAdvisor] = useState(false);

  // Check Backend health on load
  useEffect(() => {
    checkHealth();
    loadDashboardData();
  }, []);

  async function checkHealth() {
    try {
      const data = await api.fetchHealth();
      setIsBackendOnline(data.status === "online");
    } catch {
      setIsBackendOnline(false);
    }
  }

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [expData, anaData] = await Promise.all([
        api.fetchExpenses({ search: searchQuery, category: selectedCategory }),
        api.fetchAnalytics(),
      ]);
      setExpenses(expData.expenses || []);
      setAnalytics(anaData);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Scan with Gemini (Preview only)
  async function handleScanReceipt() {
    if (!selectedFile) return;
    setIsScanning(true);
    setScanResult(null);
    setScanSuccessMsg("");
    setScanErrorMsg("");

    try {
      const res = await api.scanReceipt(selectedFile);
      setScanResult(res.extracted_data);
    } catch (err) {
      setScanErrorMsg(err.message || "Receipt scanning failed");
    } finally {
      setIsScanning(false);
    }
  }

  // Scan and Save directly
  async function handleScanAndSave() {
    if (!selectedFile) return;
    setIsScanning(true);
    setScanErrorMsg("");
    setScanSuccessMsg("");
    try {
      const res = await api.scanAndCreateExpense(selectedFile);
      setScanSuccessMsg(`Expense saved successfully as #${res.id}: ${res.title} (${formatRupees(res.amount)})`);
      setScanResult(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      loadDashboardData();
    } catch (err) {
      setScanErrorMsg(err.message || "Error scanning and saving expense");
    } finally {
      setIsScanning(false);
    }
  }

  // Save extracted preview to database
  async function handleSaveExtractedToDB() {
    if (!scanResult) return;
    try {
      await api.createExpense({
        title: `Receipt: ${scanResult.merchant_name || "Purchase"}`,
        amount: scanResult.total_amount,
        currency: scanResult.currency || "LKR",
        category: scanResult.suggested_category || "Other",
        date: scanResult.transaction_date || new Date().toISOString().split("T")[0],
        merchant: scanResult.merchant_name,
        payment_method: scanResult.payment_method,
        items: scanResult.line_items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_price: i.total_price,
        })),
      });
      setScanSuccessMsg("Extracted expense successfully saved to database!");
      setScanResult(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      loadDashboardData();
    } catch (err) {
      alert("Failed to save: " + err.message);
    }
  }

  // Delete expense
  async function handleDeleteExpense(id) {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      await api.deleteExpense(id);
      loadDashboardData();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  }

  // Manual create expense
  async function handleCreateManualExpense(e) {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) return;
    try {
      await api.createExpense({
        ...newExpense,
        amount: parseFloat(newExpense.amount),
      });
      setIsModalOpen(false);
      setNewExpense({
        title: "",
        amount: "",
        category: "Groceries",
        date: new Date().toISOString().split("T")[0],
        merchant: "",
      });
      loadDashboardData();
    } catch (err) {
      alert("Failed to create expense: " + err.message);
    }
  }

  // AI Advisor question
  async function handleSendAdvisor(questionText) {
    const q = questionText || advisorInput;
    if (!q.trim()) return;

    const userMsg = { role: "user", content: q };
    setMessages((prev) => [...prev, userMsg]);
    setAdvisorInput("");
    setIsAskingAdvisor(true);

    try {
      const res = await api.askAdvisor(q);
      const aiMsg = {
        role: "ai",
        headline: res.summary_headline,
        content: res.answer,
        insights: res.insights || [],
        recommendations: res.actionable_recommendations || [],
        topCategory: res.top_spending_category,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          headline: "Unable to process advice",
          content: "Sorry, I couldn't connect to Gemini API: " + err.message,
          insights: [],
          recommendations: [],
        },
      ]);
    } finally {
      setIsAskingAdvisor(false);
    }
  }

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="brand-wrapper">
          <div className="logo-badge">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="brand-title">ExpenseGenius AI</h1>
            <p className="brand-subtitle">Smart Expense Tracker with Gemini 3.8 Flash</p>
          </div>
        </div>

        <div className="header-status">
          <div className={`status-pill ${isBackendOnline ? "" : "offline"}`}>
            <span className="status-dot"></span>
            {isBackendOnline ? "Backend & Gemini Online" : "Backend Offline"}
          </div>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <nav className="nav-tabs">
        <button
          className={`tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("dashboard");
            loadDashboardData();
          }}
        >
          <LayoutDashboard size={18} />
          Dashboard & Analytics
        </button>

        <button
          className={`tab-btn ${activeTab === "scanner" ? "active" : ""}`}
          onClick={() => setActiveTab("scanner")}
        >
          <Upload size={18} />
          Scan Receipt (Photo OCR)
        </button>

        <button
          className={`tab-btn ${activeTab === "advisor" ? "active" : ""}`}
          onClick={() => setActiveTab("advisor")}
        >
          <BotMessageSquare size={18} />
          AI Financial Advisor
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* TAB 1: DASHBOARD & EXPENSES */}
      {/* ========================================================================= */}
      {activeTab === "dashboard" && (
        <main>
          {/* Top KPI Metrics */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon-wrap" style={{ background: "rgba(244, 63, 94, 0.15)", color: "#f43f5e" }}>
                <Banknote size={24} />
              </div>
              <div>
                <div className="metric-label">Total Spent</div>
                <div className="metric-val">{formatRupees(analytics?.total_spent)}</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-wrap" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#6366f1" }}>
                <Receipt size={24} />
              </div>
              <div>
                <div className="metric-label">Total Transactions</div>
                <div className="metric-val">{analytics?.total_transactions || 0}</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-wrap" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                <PieChart size={24} />
              </div>
              <div>
                <div className="metric-label">Top Category</div>
                <div className="metric-val" style={{ fontSize: "18px" }}>
                  {analytics?.top_spending_category || "None"}
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-wrap" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
                <TrendingDown size={24} />
              </div>
              <div>
                <div className="metric-label">Average Expense</div>
                <div className="metric-val">{formatRupees(analytics?.average_transaction_amount)}</div>
              </div>
            </div>
          </div>

          {/* Category Progress Bars */}
          {analytics?.by_category && analytics.by_category.length > 0 && (
            <div className="category-bars-card">
              <h3 className="category-bars-header">Spending by Category</h3>
              {analytics.by_category.map((cat) => (
                <div key={cat.category} className="category-bar-item">
                  <div className="category-bar-label">
                    <span>{cat.category} ({cat.transaction_count} txns)</span>
                    <span>{formatRupees(cat.total_amount)} ({cat.percentage}%)</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.min(cat.percentage, 100)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Controls Bar */}
          <div className="section-header">
            <h2 className="section-title">Recorded Expenses</h2>
            <div className="filter-bar">
              <input
                type="text"
                className="input-field"
                placeholder="Search merchant, title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadDashboardData()}
              />
              <select
                className="input-field"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setTimeout(loadDashboardData, 50);
                }}
              >
                <option value="">All Categories</option>
                <option value="Groceries">Groceries</option>
                <option value="Food & Dining">Food & Dining</option>
                <option value="Transportation">Transportation</option>
                <option value="Travel">Travel</option>
                <option value="Utilities">Utilities</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Shopping">Shopping</option>
                <option value="Healthcare">Healthcare</option>
              </select>
              <button className="primary-btn" onClick={() => setIsModalOpen(true)}>
                <Plus size={16} /> Add Expense
              </button>
            </div>
          </div>

          {/* Expenses List */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <Loader2 className="animate-spin" size={32} style={{ margin: "0 auto", color: "var(--primary)" }} />
              <p style={{ marginTop: "10px", color: "var(--text-muted)" }}>Loading expenses...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="scanner-card" style={{ padding: "40px" }}>
              <p style={{ color: "var(--text-muted)" }}>No expenses found. Try scanning a receipt or adding one manually!</p>
            </div>
          ) : (
            <div className="expense-list">
              {expenses.map((exp) => (
                <div key={exp.id} className="expense-row">
                  <div className="expense-left">
                    <span className="category-tag">{exp.category}</span>
                    <div>
                      <div className="expense-title">{exp.title}</div>
                      <div className="expense-meta">
                        {exp.merchant ? `${exp.merchant} • ` : ""}
                        {exp.date}
                        {exp.items && exp.items.length > 0 ? ` • ${exp.items.length} items` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="expense-right">
                    <div className="expense-amount">-{formatRupees(exp.amount)}</div>
                    <button
                      className="delete-btn"
                      title="Delete expense"
                      onClick={() => handleDeleteExpense(exp.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RECEIPT SCANNER & OCR */}
      {/* ========================================================================= */}
      {activeTab === "scanner" && (
        <main>
          <div className="scanner-card">
            {scanSuccessMsg && (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  padding: "14px",
                  borderRadius: "12px",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={18} />
                {scanSuccessMsg}
              </div>
            )}

            {scanErrorMsg && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  padding: "14px",
                  borderRadius: "12px",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={18} />
                {scanErrorMsg}
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
              onChange={handleFileChange}
            />

            {!selectedFile ? (
              <div className="dropzone-box" onClick={() => fileInputRef.current?.click()}>
                <div className="dropzone-icon">
                  <Upload size={28} />
                </div>
                <div className="dropzone-title">Click to upload Receipt Photo or Invoice PDF</div>
                <div className="dropzone-subtitle">Supports JPG, PNG, WEBP, and PDF up to 20MB</div>
              </div>
            ) : (
              <div className="preview-container">
                {previewUrl ? (
                  <img src={previewUrl} alt="Receipt preview" className="receipt-img-preview" />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)" }}>
                    <FileText size={32} />
                    <span>{selectedFile.name} (PDF Document)</span>
                  </div>
                )}
                <button
                  className="secondary-btn"
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                  onClick={removeSelectedFile}
                >
                  <X size={14} /> Remove photo
                </button>
              </div>
            )}

            {selectedFile && (
              <div className="scan-action-bar">
                <button
                  className="primary-btn"
                  disabled={isScanning}
                  onClick={handleScanReceipt}
                  style={{ opacity: isScanning ? 0.7 : 1 }}
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Scanning with Gemini AI...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Scan & Preview Extraction
                    </>
                  )}
                </button>

                <button
                  className="secondary-btn"
                  disabled={isScanning}
                  onClick={handleScanAndSave}
                  style={{ background: "#10b981", color: "#fff", borderColor: "#10b981" }}
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Scan & Save Immediately
                    </>
                  )}
                </button>
              </div>
            )}
            {isScanning && (
              <p style={{ color: "var(--text-muted)", textAlign: "center", marginTop: "12px" }}>
                Receipt scanning can take up to a minute. You’ll see an error here if it times out.
              </p>
            )}
          </div>

          {/* Extracted Receipt Results Card */}
          {scanResult && (
            <div className="extracted-results-card">
              <div className="results-header">
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#10b981" }}>
                    Gemini 3.8 Flash Extraction Successful
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Confidence Score: {(scanResult.confidence_score * 100).toFixed(0)}%
                  </p>
                </div>
                <button className="primary-btn" onClick={handleSaveExtractedToDB}>
                  <CheckCircle2 size={16} /> Save to Expenses Database
                </button>
              </div>

              <div className="results-grid">
                <div>
                  <div className="result-item-label">Merchant / Store</div>
                  <div className="result-item-val">{scanResult.merchant_name || "Unknown"}</div>
                </div>
                <div>
                  <div className="result-item-label">Transaction Date</div>
                  <div className="result-item-val">{scanResult.transaction_date || "Not detected"}</div>
                </div>
                <div>
                  <div className="result-item-label">Total Amount</div>
                  <div className="result-item-val" style={{ color: "#fb7185" }}>
                    {formatRupees(scanResult.total_amount)}
                  </div>
                </div>
                <div>
                  <div className="result-item-label">Suggested Category</div>
                  <div className="result-item-val">{scanResult.suggested_category}</div>
                </div>
              </div>

              {scanResult.line_items && scanResult.line_items.length > 0 && (
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: 700, marginTop: "10px", marginBottom: "8px" }}>
                    Itemized Products ({scanResult.line_items.length})
                  </h4>
                  <table className="line-items-table">
                    <thead>
                      <tr>
                        <th>Item Description</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanResult.line_items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.name}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unit_price ? formatRupees(item.unit_price) : "-"}</td>
                          <td>{formatRupees(item.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AI FINANCIAL ADVISOR */}
      {/* ========================================================================= */}
      {activeTab === "advisor" && (
        <main className="advisor-container">
          <div className="suggestion-pills">
            <button
              className="suggestion-pill"
              onClick={() => handleSendAdvisor("Where did I spend the most money this month?")}
            >
              Where did I spend the most money?
            </button>
            <button
              className="suggestion-pill"
              onClick={() => handleSendAdvisor("How can I reduce my grocery and dining expenses?")}
            >
              How can I reduce food & dining expenses?
            </button>
            <button
              className="suggestion-pill"
              onClick={() => handleSendAdvisor("Audit my spending and detect any unusual transactions.")}
            >
              Audit spending & detect anomalies
            </button>
          </div>

          <div className="chat-history">
            {messages.map((m, idx) => (
              <div key={idx} className={`chat-bubble ${m.role}`}>
                {m.role === "user" ? (
                  <div>{m.content}</div>
                ) : (
                  <div>
                    {m.headline && <div className="ai-headline">{m.headline}</div>}
                    <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>

                    {m.insights && m.insights.length > 0 && (
                      <div className="ai-insights-grid">
                        {m.insights.map((ins, iIdx) => (
                          <div key={iIdx} className="insight-card">
                            <div className={`insight-type ${ins.type}`}>{ins.type.replace("_", " ")}</div>
                            <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>{ins.title}</div>
                            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{ins.message}</div>
                            {ins.potential_monthly_savings && (
                              <div style={{ color: "#10b981", fontSize: "12px", fontWeight: 700, marginTop: "6px" }}>
                                Potential Savings: +{formatRupees(ins.potential_monthly_savings)}/mo
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {m.recommendations && m.recommendations.length > 0 && (
                      <div style={{ marginTop: "12px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-muted)" }}>
                          Actionable Recommendations:
                        </div>
                        <ul className="ai-recommendations">
                          {m.recommendations.map((rec, rIdx) => (
                            <li key={rIdx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isAskingAdvisor && (
              <div className="chat-bubble ai" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Loader2 className="animate-spin" size={18} style={{ color: "var(--primary)" }} />
                <span>Gemini 3.8 Flash is analyzing your financial records...</span>
              </div>
            )}
          </div>

          <form
            className="chat-input-bar"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendAdvisor();
            }}
          >
            <input
              type="text"
              className="chat-input"
              placeholder="Ask a question about your spending (e.g. Can I afford a Rs 20,000 flight?)..."
              value={advisorInput}
              onChange={(e) => setAdvisorInput(e.target.value)}
              disabled={isAskingAdvisor}
            />
            <button type="submit" className="primary-btn" disabled={isAskingAdvisor || !advisorInput.trim()}>
              <Send size={16} /> Send
            </button>
          </form>
        </main>
      )}

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Add New Expense</h3>
              <button className="delete-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateManualExpense}>
              <div className="form-group">
                <label className="form-label">Expense Title</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  style={{ width: "100%" }}
                  placeholder="e.g. Dinner with Friends"
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Amount (Rs)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input-field"
                  style={{ width: "100%" }}
                  placeholder="0.00"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="input-field"
                  style={{ width: "100%" }}
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                >
                  <option value="Groceries">Groceries</option>
                  <option value="Food & Dining">Food & Dining</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Travel">Travel</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  required
                  className="input-field"
                  style={{ width: "100%" }}
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Merchant (Optional)</label>
                <input
                  type="text"
                  className="input-field"
                  style={{ width: "100%" }}
                  placeholder="e.g. Starbucks, Uber"
                  value={newExpense.merchant}
                  onChange={(e) => setNewExpense({ ...newExpense, merchant: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button type="button" className="secondary-btn" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
