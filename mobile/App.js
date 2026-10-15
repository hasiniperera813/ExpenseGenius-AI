import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  BotMessageSquare,
  Banknote,
  Camera,
  Check,
  ChevronDown,
  FileText,
  LayoutDashboard,
  Plus,
  Receipt,
  Send,
  Sparkles,
  Trash2,
  TrendingDown,
  Upload,
  X,
} from 'lucide-react-native';
import { api } from './src/api';

const CATEGORIES = [
  'Groceries',
  'Food & Dining',
  'Transportation',
  'Travel',
  'Utilities',
  'Office Supplies',
  'Shopping',
  'Healthcare',
  'Other',
];

const COLORS = {
  background: '#090d16',
  surface: '#111a2b',
  card: '#182234',
  border: '#26354a',
  primary: '#7778ff',
  text: '#f8fafc',
  muted: '#94a3b8',
  green: '#10b981',
  red: '#fb7185',
  amber: '#f59e0b',
};

const today = () => new Date().toISOString().slice(0, 10);
const amount = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

function ActionButton({ label, icon: Icon, onPress, secondary = false, disabled = false, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondaryButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {Icon ? <Icon size={17} color={secondary ? COLORS.text : '#fff'} /> : null}
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function SectionTitle({ children, action }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action}
    </View>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [backendOnline, setBackendOnline] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    category: 'Groceries',
    date: today(),
    merchant: '',
  });
  const [savingExpense, setSavingExpense] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [scanMessage, setScanMessage] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanning, setScanning] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: 'ai',
      headline: 'Your AI financial advisor',
      content: 'Ask me about your spending, budget, or ways to save. I can use your recorded expenses to give you personalized guidance.',
      recommendations: [],
      insights: [],
    },
  ]);
  const [advisorInput, setAdvisorInput] = useState('');
  const [askingAdvisor, setAskingAdvisor] = useState(false);
  const chatRef = useRef(null);

  async function refreshDashboard({ showLoader = true } = {}) {
    if (showLoader) setLoading(true);
    setDashboardError('');
    try {
      const [expenseData, analyticsData] = await Promise.all([
        api.fetchExpenses({ search, category }),
        api.fetchAnalytics(),
      ]);
      setExpenses(expenseData.expenses || []);
      setAnalytics(analyticsData);
      setBackendOnline(true);
    } catch (error) {
      setBackendOnline(false);
      setDashboardError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    api.fetchHealth()
      .then((health) => setBackendOnline(health.status === 'online'))
      .catch(() => setBackendOnline(false));
    refreshDashboard();
  }, []);

  async function applyFilters(nextSearch = search, nextCategory = category) {
    setLoading(true);
    setDashboardError('');
    try {
      const data = await api.fetchExpenses({ search: nextSearch, category: nextCategory });
      setExpenses(data.expenses || []);
      setBackendOnline(true);
    } catch (error) {
      setDashboardError(error.message);
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  }

  async function choosePhoto(fromCamera) {
    setScanMessage('');
    setScanError('');
    setScanResult(null);
    try {
      if (fromCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Camera permission needed', 'Allow camera access in your device settings to take a receipt photo.');
          return;
        }
      }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })
        : await DocumentPicker.getDocumentAsync({
            type: 'image/*',
            copyToCacheDirectory: true,
          });
      const asset = result.assets?.[0];
      if (!result.canceled && asset) {
        setSelectedFile({
          uri: asset.uri,
          name: asset.fileName || asset.name || `receipt-${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (error) {
      const message = error.message || 'Could not open the image picker.';
      setScanError(message);
      Alert.alert('Could not open images', message);
    }
  }

  async function choosePdf() {
    setScanMessage('');
    setScanError('');
    setScanResult(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name || `invoice-${Date.now()}.pdf`,
          type: asset.mimeType || 'application/pdf',
        });
      }
    } catch (error) {
      const message = error.message || 'Could not open the PDF picker.';
      setScanError(message);
      Alert.alert('Could not open PDFs', message);
    }
  }

  async function scanReceipt(saveDirectly = false) {
    if (!selectedFile) return;
    setScanning(true);
    setScanError('');
    setScanMessage('');
    try {
      if (saveDirectly) {
        const created = await api.scanAndCreateExpense(selectedFile);
        setScanMessage(`Saved ${created.title} for ${amount(created.amount)}.`);
        setSelectedFile(null);
        setScanResult(null);
        await refreshDashboard({ showLoader: false });
      } else {
        const result = await api.scanReceipt(selectedFile);
        setScanResult(result.extracted_data);
      }
    } catch (error) {
      setScanError(error.message || 'Receipt scanning failed.');
    } finally {
      setScanning(false);
    }
  }

  async function saveExtractedReceipt() {
    if (!scanResult) return;
    setScanning(true);
    setScanError('');
    try {
      await api.createExpense({
        title: `Receipt: ${scanResult.merchant_name || 'Purchase'}`,
        amount: scanResult.total_amount,
        currency: scanResult.currency || 'LKR',
        category: scanResult.suggested_category || 'Other',
        date: scanResult.transaction_date || today(),
        merchant: scanResult.merchant_name || null,
        payment_method: scanResult.payment_method || null,
        items: (scanResult.line_items || []).map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })),
      });
      setScanMessage('Receipt expense saved.');
      setSelectedFile(null);
      setScanResult(null);
      await refreshDashboard({ showLoader: false });
    } catch (error) {
      setScanError(error.message || 'Could not save the extracted receipt.');
    } finally {
      setScanning(false);
    }
  }

  function removeExpense(expense) {
    Alert.alert('Delete expense?', `Remove "${expense.title}" from your records?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteExpense(expense.id);
            await refreshDashboard({ showLoader: false });
          } catch (error) {
            Alert.alert('Could not delete expense', error.message);
          }
        },
      },
    ]);
  }

  async function createExpense() {
    const parsedAmount = Number(newExpense.amount);
    if (!newExpense.title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Check expense details', 'Enter a title and an amount greater than zero.');
      return;
    }
    setSavingExpense(true);
    try {
      await api.createExpense({
        ...newExpense,
        title: newExpense.title.trim(),
        amount: parsedAmount,
        merchant: newExpense.merchant.trim() || null,
      });
      setAddModalVisible(false);
      setNewExpense({ title: '', amount: '', category: 'Groceries', date: today(), merchant: '' });
      await refreshDashboard({ showLoader: false });
    } catch (error) {
      Alert.alert('Could not add expense', error.message);
    } finally {
      setSavingExpense(false);
    }
  }

  async function askAdvisor(question = advisorInput) {
    const value = question.trim();
    if (!value || askingAdvisor) return;
    setMessages((current) => [...current, { role: 'user', content: value }]);
    setAdvisorInput('');
    setAskingAdvisor(true);
    try {
      const response = await api.askAdvisor(value);
      setMessages((current) => [
        ...current,
        {
          role: 'ai',
          headline: response.summary_headline,
          content: response.answer,
          insights: response.insights || [],
          recommendations: response.actionable_recommendations || [],
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: 'ai', headline: 'Unable to get advice', content: error.message, insights: [], recommendations: [] },
      ]);
    } finally {
      setAskingAdvisor(false);
    }
  }

  function renderDashboard() {
    const metrics = [
      { label: 'Total spent', value: amount(analytics?.total_spent), icon: Banknote, color: COLORS.red },
      { label: 'Transactions', value: analytics?.total_transactions || 0, icon: Receipt, color: COLORS.primary },
      { label: 'Top category', value: analytics?.top_spending_category || 'None', icon: TrendingDown, color: COLORS.green },
      { label: 'Average', value: amount(analytics?.average_transaction_amount), icon: Banknote, color: COLORS.amber },
    ];

    return (
      <ScrollView
        contentContainerStyle={styles.screenContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); refreshDashboard({ showLoader: false }); }} tintColor={COLORS.primary} />}
      >
        {dashboardError ? <Notice tone="error" text={dashboardError} /> : null}
        <View style={styles.metricsGrid}>
          {metrics.map(({ label, value, icon: Icon, color }) => (
            <View key={label} style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: `${color}22` }]}><Icon size={19} color={color} /></View>
              <Text style={styles.metricLabel}>{label}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <SectionTitle>Spending by category</SectionTitle>
          {analytics?.by_category?.length ? analytics.by_category.map((item) => (
            <View key={item.category} style={styles.categoryItem}>
              <View style={styles.categoryHeading}>
                <Text style={styles.bodyText}>{item.category}</Text>
                <Text style={styles.mutedText}>{amount(item.total_amount)} · {item.percentage}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(Number(item.percentage) || 0, 100)}%` }]} />
              </View>
            </View>
          )) : <Text style={styles.mutedText}>No spending data yet.</Text>}
        </View>

        <SectionTitle
          action={<Pressable onPress={() => setAddModalVisible(true)} style={styles.addSmallButton}><Plus size={16} color="#fff" /><Text style={styles.buttonText}>Add</Text></Pressable>}
        >
          Recorded expenses
        </SectionTitle>
        <TextInput
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => applyFilters(search, category)}
          placeholder="Search merchant or title"
          placeholderTextColor={COLORS.muted}
          returnKeyType="search"
          style={styles.input}
        />
        <Pressable style={styles.selectInput} onPress={() => setFilterOpen(!filterOpen)}>
          <Text style={styles.bodyText}>{category || 'All categories'}</Text>
          <ChevronDown size={18} color={COLORS.muted} />
        </Pressable>
        {filterOpen ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryOptions}>
            {['', ...CATEGORIES].map((item) => (
              <Pressable
                key={item || 'all'}
                onPress={() => {
                  setCategory(item);
                  setFilterOpen(false);
                  applyFilters(search, item);
                }}
                style={[styles.filterChip, category === item && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, category === item && styles.filterChipTextActive]}>{item || 'All'}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {loading ? (
          <ActivityIndicator style={styles.loader} color={COLORS.primary} size="large" />
        ) : expenses.length ? (
          expenses.map((expense) => (
            <View key={expense.id} style={styles.expenseCard}>
              <View style={styles.expenseTopRow}>
                <Text style={styles.categoryTag}>{expense.category}</Text>
                <Pressable accessibilityLabel="Delete expense" hitSlop={10} onPress={() => removeExpense(expense)}>
                  <Trash2 size={18} color={COLORS.red} />
                </Pressable>
              </View>
              <Text style={styles.expenseTitle}>{expense.title}</Text>
              <Text style={styles.mutedText}>
                {[expense.merchant, expense.date, expense.items?.length ? `${expense.items.length} items` : null].filter(Boolean).join(' · ')}
              </Text>
              <Text style={styles.expenseAmount}>-{amount(expense.amount)}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}><Text style={styles.bodyText}>No expenses found.</Text><Text style={styles.mutedText}>Add an expense or scan a receipt to get started.</Text></View>
        )}
      </ScrollView>
    );
  }

  function renderScanner() {
    return (
      <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Scan a receipt</Text>
          <Text style={[styles.mutedText, styles.spacedText]}>Take a photo, choose an image, or select an invoice PDF to extract the expense.</Text>
          {scanMessage ? <Notice tone="success" text={scanMessage} /> : null}
          {scanError ? <Notice tone="error" text={scanError} /> : null}

          {selectedFile ? (
            <View style={styles.filePreview}>
              {selectedFile.type.startsWith('image/') ? (
                <Image source={{ uri: selectedFile.uri }} style={styles.receiptImage} resizeMode="contain" />
              ) : (
                <View style={styles.pdfPreview}><FileText size={34} color={COLORS.primary} /><Text style={styles.bodyText}>{selectedFile.name}</Text></View>
              )}
              <Pressable onPress={() => { setSelectedFile(null); setScanResult(null); }} style={styles.removeFile}>
                <X size={16} color={COLORS.red} /><Text style={styles.removeText}>Remove file</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.pickerButtons}>
              <ActionButton label="Take photo" icon={Camera} onPress={() => choosePhoto(true)} />
              <ActionButton label="Choose image" icon={Upload} secondary onPress={() => choosePhoto(false)} />
              <ActionButton label="Choose invoice PDF" icon={FileText} secondary onPress={choosePdf} />
            </View>
          )}

          {selectedFile ? (
            <View style={styles.pickerButtons}>
              <ActionButton label={scanning ? 'Scanning…' : 'Scan & preview'} icon={Sparkles} disabled={scanning} onPress={() => scanReceipt(false)} />
              <ActionButton label={scanning ? 'Processing…' : 'Scan & save'} icon={Check} disabled={scanning} secondary onPress={() => scanReceipt(true)} />
            </View>
          ) : null}
          {scanning ? (
            <>
              <ActivityIndicator style={styles.inlineLoader} color={COLORS.primary} />
              <Text style={[styles.mutedText, styles.spacedText]}>Receipt scanning can take up to a minute. If it times out, check your connection and try again.</Text>
            </>
          ) : null}
        </View>

        {scanResult ? (
          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { color: COLORS.green }]}>Receipt details</Text>
            <DetailRow label="Merchant" value={scanResult.merchant_name || 'Unknown'} />
            <DetailRow label="Date" value={scanResult.transaction_date || 'Not detected'} />
            <DetailRow label="Total" value={amount(scanResult.total_amount)} />
            <DetailRow label="Category" value={scanResult.suggested_category || 'Other'} />
            {scanResult.line_items?.length ? (
              <>
                <Text style={[styles.bodyText, styles.spacedText]}>Items ({scanResult.line_items.length})</Text>
                {scanResult.line_items.map((item, index) => (
                  <View key={`${item.name}-${index}`} style={styles.itemRow}>
                    <Text style={[styles.bodyText, styles.itemName]}>{item.name} × {item.quantity}</Text>
                    <Text style={styles.bodyText}>{amount(item.total_price)}</Text>
                  </View>
                ))}
              </>
            ) : null}
            <ActionButton label={scanning ? 'Saving…' : 'Save to expenses'} icon={Check} disabled={scanning} onPress={saveExtractedReceipt} style={styles.saveReceiptButton} />
          </View>
        ) : null}
      </ScrollView>
    );
  }

  function renderAdvisor() {
    const suggestions = [
      'Where did I spend the most money?',
      'How can I reduce my grocery and dining expenses?',
      'Audit my spending and detect unusual transactions.',
    ];
    return (
      <KeyboardAvoidingView style={styles.advisorScreen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView
          ref={chatRef}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => chatRef.current?.scrollToEnd({ animated: true })}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestions}>
            {suggestions.map((suggestion) => (
              <Pressable key={suggestion} onPress={() => askAdvisor(suggestion)} style={styles.suggestionChip}>
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {messages.map((message, index) => (
            <View key={`${message.role}-${index}`} style={[styles.chatBubble, message.role === 'user' ? styles.userBubble : styles.aiBubble]}>
              {message.headline ? <Text style={styles.chatHeadline}>{message.headline}</Text> : null}
              <Text style={styles.chatText}>{message.content}</Text>
              {message.insights?.map((insight, itemIndex) => (
                <View key={`${insight.title}-${itemIndex}`} style={styles.insightCard}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.mutedText}>{insight.message}</Text>
                  {insight.potential_monthly_savings ? <Text style={styles.savingsText}>Potential savings: {amount(insight.potential_monthly_savings)}/mo</Text> : null}
                </View>
              ))}
              {message.recommendations?.length ? (
                <View style={styles.recommendations}>
                  <Text style={styles.bodyText}>Recommendations</Text>
                  {message.recommendations.map((recommendation, itemIndex) => (
                    <Text key={`${itemIndex}-${recommendation}`} style={styles.recommendationText}>• {recommendation}</Text>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
          {askingAdvisor ? <View style={styles.thinking}><ActivityIndicator size="small" color={COLORS.primary} /><Text style={styles.mutedText}>Reviewing your expenses…</Text></View> : null}
        </ScrollView>
        <View style={styles.chatInputRow}>
          <TextInput
            value={advisorInput}
            onChangeText={setAdvisorInput}
            onSubmitEditing={() => askAdvisor()}
            placeholder="Ask about your spending…"
            placeholderTextColor={COLORS.muted}
            returnKeyType="send"
            style={[styles.input, styles.chatInput]}
          />
          <Pressable accessibilityLabel="Send message" onPress={() => askAdvisor()} disabled={askingAdvisor} style={styles.sendButton}>
            <Send size={19} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'scanner', label: 'Scan', icon: Camera },
    { id: 'advisor', label: 'Advisor', icon: BotMessageSquare },
  ];

  return (
    <View style={styles.app}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}><Sparkles size={20} color="#fff" /></View>
          <View>
            <Text style={styles.brandTitle}>ExpenseGenius</Text>
            <Text style={styles.brandSubtitle}>AI expense tracker</Text>
          </View>
        </View>
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: backendOnline ? COLORS.green : COLORS.red }]} />
          <Text style={styles.statusText}>{backendOnline ? 'Online' : 'Offline'}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {activeTab === 'dashboard' ? renderDashboard() : null}
        {activeTab === 'scanner' ? renderScanner() : null}
        {activeTab === 'advisor' ? renderAdvisor() : null}
      </View>

      <View style={styles.tabBar}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <Pressable key={id} onPress={() => { setActiveTab(id); if (id === 'dashboard') refreshDashboard({ showLoader: false }); }} style={styles.tabButton}>
            <Icon size={21} color={activeTab === id ? COLORS.primary : COLORS.muted} />
            <Text style={[styles.tabLabel, activeTab === id && styles.tabLabelActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <Modal visible={addModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.sectionTitle}>Add expense</Text>
              <Pressable accessibilityLabel="Close" onPress={() => setAddModalVisible(false)}><X size={22} color={COLORS.muted} /></Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput value={newExpense.title} onChangeText={(value) => setNewExpense({ ...newExpense, title: value })} placeholder="e.g. Grocery shopping" placeholderTextColor={COLORS.muted} style={styles.input} />
              <Text style={styles.fieldLabel}>Amount</Text>
              <TextInput value={newExpense.amount} onChangeText={(value) => setNewExpense({ ...newExpense, amount: value })} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={COLORS.muted} style={styles.input} />
              <Text style={styles.fieldLabel}>Merchant (optional)</Text>
              <TextInput value={newExpense.merchant} onChangeText={(value) => setNewExpense({ ...newExpense, merchant: value })} placeholder="Store or merchant" placeholderTextColor={COLORS.muted} style={styles.input} />
              <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput value={newExpense.date} onChangeText={(value) => setNewExpense({ ...newExpense, date: value })} placeholder={today()} placeholderTextColor={COLORS.muted} style={styles.input} />
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.modalCategories}>
                {CATEGORIES.map((item) => (
                  <Pressable key={item} onPress={() => setNewExpense({ ...newExpense, category: item })} style={[styles.filterChip, newExpense.category === item && styles.filterChipActive]}>
                    <Text style={[styles.filterChipText, newExpense.category === item && styles.filterChipTextActive]}>{item}</Text>
                  </Pressable>
                ))}
              </View>
              <ActionButton label={savingExpense ? 'Saving…' : 'Save expense'} icon={Check} disabled={savingExpense} onPress={createExpense} style={styles.modalSubmit} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Notice({ tone, text }) {
  return (
    <View style={[styles.notice, tone === 'error' ? styles.errorNotice : styles.successNotice]}>
      <Text style={styles.noticeText}>{text}</Text>
    </View>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.mutedText}>{label}</Text>
      <Text style={styles.bodyText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0 },
  header: { minHeight: 72, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  brandTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  brandSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, backgroundColor: COLORS.surface },
  statusDot: { width: 7, height: 7, borderRadius: 5 },
  statusText: { color: COLORS.text, fontSize: 11, fontWeight: '600' },
  content: { flex: 1 },
  screenContent: { padding: 16, paddingBottom: 26, gap: 14 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '47%', flexGrow: 1, minHeight: 116, padding: 13, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  metricIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  metricLabel: { color: COLORS.muted, fontSize: 11, marginBottom: 3 },
  metricValue: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  card: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 16, gap: 10 },
  sectionTitleRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  categoryItem: { marginTop: 5 },
  categoryHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 7 },
  bodyText: { color: COLORS.text, fontSize: 13 },
  mutedText: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  progressTrack: { height: 7, borderRadius: 5, overflow: 'hidden', backgroundColor: '#263247' },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: COLORS.primary },
  addSmallButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 },
  button: { minHeight: 44, borderRadius: 12, backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryButton: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  disabledButton: { opacity: 0.6 },
  pressed: { opacity: 0.82 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  input: { minHeight: 46, color: COLORS.text, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 11, paddingHorizontal: 13, fontSize: 14 },
  selectInput: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, borderWidth: 1, borderColor: COLORS.border, borderRadius: 11, backgroundColor: COLORS.surface },
  categoryOptions: { maxHeight: 42 },
  filterChip: { paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, backgroundColor: COLORS.surface, marginRight: 7, marginBottom: 7 },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { color: COLORS.muted, fontSize: 12 },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },
  expenseCard: { padding: 14, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, gap: 6 },
  expenseTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryTag: { color: '#c4b5fd', fontSize: 11, fontWeight: '700', backgroundColor: '#7778ff22', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  expenseTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  expenseAmount: { color: COLORS.red, fontWeight: '800', fontSize: 16, marginTop: 2 },
  emptyState: { alignItems: 'center', gap: 5, padding: 28, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  loader: { paddingVertical: 25 },
  tabBar: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingBottom: Platform.OS === 'ios' ? 8 : 3, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  tabButton: { minWidth: 70, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 7 },
  tabLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '600' },
  tabLabelActive: { color: COLORS.primary },
  notice: { padding: 11, borderRadius: 11, borderWidth: 1 },
  errorNotice: { backgroundColor: '#ef44441a', borderColor: '#ef444455' },
  successNotice: { backgroundColor: '#10b9811a', borderColor: '#10b98155' },
  noticeText: { color: COLORS.text, fontSize: 12, lineHeight: 18 },
  spacedText: { marginTop: 2, marginBottom: 5 },
  pickerButtons: { gap: 9, marginTop: 4 },
  filePreview: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  receiptImage: { width: '100%', height: 260, borderRadius: 12, backgroundColor: COLORS.surface },
  pdfPreview: { minHeight: 140, width: '100%', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, backgroundColor: COLORS.surface },
  removeFile: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 7 },
  removeText: { color: COLORS.red, fontSize: 12, fontWeight: '600' },
  inlineLoader: { marginTop: 5 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7, borderTopWidth: 1, borderTopColor: COLORS.border },
  itemName: { flex: 1 },
  saveReceiptButton: { marginTop: 8 },
  advisorScreen: { flex: 1 },
  chatContent: { padding: 14, paddingBottom: 20, gap: 12 },
  suggestions: { flexGrow: 0, marginBottom: 2 },
  suggestionChip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, paddingHorizontal: 11, paddingVertical: 9, marginRight: 7, maxWidth: 260 },
  suggestionText: { color: '#c4b5fd', fontSize: 11, fontWeight: '600' },
  chatBubble: { maxWidth: '92%', borderRadius: 16, padding: 13, gap: 8 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#4f46e5' },
  chatHeadline: { color: COLORS.text, fontWeight: '800', fontSize: 14 },
  chatText: { color: COLORS.text, fontSize: 13, lineHeight: 20 },
  insightCard: { borderRadius: 10, backgroundColor: COLORS.surface, padding: 10, gap: 4 },
  insightTitle: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
  savingsText: { color: COLORS.green, fontSize: 12, fontWeight: '700' },
  recommendations: { gap: 6, paddingTop: 4 },
  recommendationText: { color: COLORS.text, fontSize: 12, lineHeight: 18 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background },
  chatInput: { flex: 1 },
  sendButton: { width: 45, height: 45, borderRadius: 13, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0009' },
  modalCard: { maxHeight: '90%', padding: 18, paddingBottom: 25, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  fieldLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  modalCategories: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  modalSubmit: { marginTop: 15, marginBottom: 10 },
});
