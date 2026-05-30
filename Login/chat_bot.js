const express = require('express');
const mysql = require('mysql2/promise');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('📂 Loading .env from:', path.join(__dirname, '.env'));
console.log('🔑 GEMINI_API_KEY loaded:', process.env.GEMINI_API_KEY ? '✅ YES' : '❌ NOT FOUND');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// ===== GEMINI API =====
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ===== MySQL Connection =====
const pool = mysql.createPool({
  host: '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gestion_stock',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ===== GET STORE DATA =====
async function getStoreData() {
  let conn;
  try {
    conn = await pool.getConnection();

    let products = [];
    let salesStats = { totalSalesCount: 0, totalRevenue: 0, revenueToday: 0 };
    let recentSales = [];

    // 1. جلب المنتجات
    try {
      const [p] = await conn.query('SELECT nom_produit, stock_actuel, quantite_min FROM Produit LIMIT 50');
      products = p;
    } catch (e) { console.error("⚠️ Produit table error:", e.message); }

    // 2. جلب إحصائيات المبيعات
    try {
      const [s] = await conn.query(`
        SELECT 
          COUNT(*) as totalSalesCount, 
          IFNULL(SUM(montant_total), 0) as totalRevenue,
          (SELECT IFNULL(SUM(montant_total), 0) FROM Operation WHERE type_op = 'Vente' AND DATE(date_op) = CURDATE()) as revenueToday
        FROM Operation 
        WHERE type_op = 'Vente'
      `);
      if (s[0]) salesStats = s[0];
    } catch (e) { console.error("⚠️ Operation stats error:", e.message); }

    // 3. جلب آخر المبيعات
    try {
      const [r] = await conn.query(`
        SELECT o.date_op, o.montant_total, IFNULL(c.nom, 'عميل') as client_name
        FROM Operation o
        LEFT JOIN Client c ON o.id_client = c.id
        WHERE o.type_op = 'Vente'
        ORDER BY o.date_op DESC
        LIMIT 5
      `);
      recentSales = r;
    } catch (e) { console.error("⚠️ Recent sales error:", e.message); }

    return {
      products: products,
      totalProducts: products.length,
      lowStockItems: products.filter(p => p.stock_actuel < p.quantite_min),
      salesStats: salesStats,
      recentSales: recentSales
    };
  } catch (err) {
    console.error("❌ Fatal Database Error:", err);
    throw new Error("فشل الاتصال بقاعدة البيانات. تأكد من تشغيل MySQL.");
  } finally {
    if (conn) conn.release();
  }
}

// ===== PROCESS WITH GEMINI =====
async function processWithGemini(userMessage, storeData) {
  // استخدام الموديل الأكثر استقراراً
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

  // تحضير قائمة المنتجات الناقصة
  const lowStockNames = storeData.lowStockItems
    .map(p => `${p.nom_produit} (المتبقي: ${p.stock_actuel})`)
    .join('، ');

  const prompt = `أنت مساعد ذكي لمتجر "BRICODZ" لإدارة المخزون. أجب دائماً بالعربية بلهجة مهنية ومختصرة وواضحة.
استخدم البيانات التالية للإجابة على سؤال المستخدم بدقة:

📦 بيانات المتجر الحالية:
- عدد المنتجات الإجمالي: ${storeData.totalProducts}
- مبيعات اليوم: ${storeData.salesStats.revenueToday} DA
- إجمالي الإيرادات الكلية: ${storeData.salesStats.totalRevenue} DA
- عدد عمليات البيع: ${storeData.salesStats.totalSalesCount}
- منتجات أوشكت على النفاذ: ${lowStockNames || 'لا يوجد حالياً'}

🛒 آخر 5 مبيعات:
${storeData.recentSales.map(s => `- ${s.client_name}: ${s.montant_total} DA بتاريخ ${s.date_op}`).join('\n') || 'لا توجد مبيعات مسجلة'}

❓ سؤال المستخدم: "${userMessage}"

قدم إجابة مفيدة ومحددة بناءً على البيانات أعلاه. إذا كان السؤال لا يتعلق ببيانات المتجر، أجب بشكل عام ومفيد.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('❌ GEMINI ERROR Details:', JSON.stringify(error, null, 2));
    console.error('❌ GEMINI ERROR Message:', error.message);
    
    let userFriendlyError;
    if (error.message && error.message.includes('API_KEY_INVALID')) {
      userFriendlyError = '❌ مفتاح الـ API غير صالح. تحقق من ملف .env';
    } else if (error.message && error.message.includes('fetch')) {
      userFriendlyError = '❌ فشل الاتصال بالإنترنت. تحقق من الاتصال.';
    } else if (error.status === 404 || (error.message && error.message.includes('404'))) {
      userFriendlyError = '❌ الموديل غير متاح. تحقق من اسم الموديل.';
    } else if (error.status === 429) {
      userFriendlyError = '⚠️ تجاوزت حد الطلبات المجانية. انتظر قليلاً.';
    } else {
      userFriendlyError = error.message || 'خطأ غير معروف';
    }
    
    return userFriendlyError;
  }
}

// ===== HEALTH CHECK ENDPOINT =====
app.get('/api/health', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  let dbStatus = 'unknown';
  try {
    const conn = await pool.getConnection();
    await conn.query('SELECT 1');
    conn.release();
    dbStatus = 'connected ✅';
  } catch (e) {
    dbStatus = `error: ${e.message}`;
  }
  res.json({
    status: 'running ✅',
    apiKey: apiKey ? `${apiKey.substring(0, 8)}... ✅` : '❌ NOT FOUND',
    database: dbStatus,
    model: 'gemini-2.0-flash-lite'
  });
});

// ===== CHAT ENDPOINT =====
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Empty Message!!' });

    console.log(`📩 Received message: ${message}`);

    const storeData = await getStoreData();
    const response = await processWithGemini(message, storeData);

    res.json({ success: true, message: response });
  } catch (error) {
    console.error('❌ Server Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = 3003;
app.listen(PORT, () => {
  console.log(`✅ Chatbot Server Started on port ${PORT}`);
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    console.log(`🔑 API Key loaded: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}`);
  } else {
    console.error("❌ API Key NOT FOUND in .env file!");
  }
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
  } else {
    console.error('❌ Server Error:', err);
  }
});