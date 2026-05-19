// ===================================================================
// --- 9. Chatbot (Gemini AI) Routes ---
// ===================================================================
const geminiApiKey = process.env.GEMINI_API_KEY;
let genAI_instance = null;
if (geminiApiKey) {
  genAI_instance = new GoogleGenerativeAI(geminiApiKey);
  console.log('🤖 Gemini AI initialized successfully');
} else {
  console.error('❌ GEMINI_API_KEY not found in .env - chatbot will use fallback mode');
}

// Pool منفصل لاستخدام promise-based queries في chatbot
const chatPool = mysql2Promise.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'gestion_stock',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

async function getStoreData() {
  let conn;
  try {
    conn = await chatPool.getConnection();
    let products = [], salesStats = { totalSalesCount: 0, totalRevenue: 0, revenueToday: 0 }, recentSales = [];

    // جلب المنتجات باسم الحقل الصحيح nom_produit
    try {
      const [p] = await conn.query('SELECT nom_produit, stock_actuel, quantite_min FROM Produit LIMIT 50');
      products = p;
    } catch (e) {
      console.error('⚠️ Produit query (nom_produit) error:', e.message);
    }

    try {
      const [s] = await conn.query(`
        SELECT COUNT(*) as totalSalesCount,
          IFNULL(SUM(montant_total),0) as totalRevenue,
          (SELECT IFNULL(SUM(montant_total),0) FROM Operation WHERE type_op='Vente' AND DATE(date_op)=CURDATE()) as revenueToday
        FROM Operation WHERE type_op='Vente'
      `);
      if (s[0]) salesStats = s[0];
    } catch (e) { console.error('⚠️ Stats:', e.message); }

    try {
      const [r] = await conn.query(`
        SELECT o.date_op, o.montant_total, IFNULL(c.nom,'عميل') as client_name
        FROM Operation o LEFT JOIN Client c ON o.id_client=c.id
        WHERE o.type_op='Vente' ORDER BY o.date_op DESC LIMIT 5
      `);
      recentSales = r;
    } catch (e) {
      console.error('⚠️ RecentSales (Client):', e.message);
      // محاولة بدون JOIN إذا فشل الجدول
      try {
        const [r] = await conn.query(`
          SELECT o.date_op, o.montant_total, 'عميل' as client_name
          FROM Operation o
          WHERE o.type_op='Vente' ORDER BY o.date_op DESC LIMIT 5
        `);
        recentSales = r;
      } catch (e2) { console.error('⚠️ RecentSales fallback also failed:', e2.message); }
    }

    return {
      products,
      totalProducts: products.length,
      lowStockItems: products.filter(p => p.stock_actuel < p.quantite_min),
      salesStats,
      recentSales
    };
  } finally {
    if (conn) conn.release();
  }
}

// دالة لتوليد إجابة محلية بدون Gemini (fallback)
function generateLocalResponse(message, storeData) {
  const msg = message.toLowerCase();
  
  if (msg.includes('منتج') || msg.includes('produit') || msg.includes('المتوفر') || msg.includes('stock') || msg.includes('مخزون')) {
    let response = `📦 عدد المنتجات في المخزون: ${storeData.totalProducts} منتج.`;
    if (storeData.lowStockItems.length > 0) {
      response += `\n⚠️ منتجات أوشكت على النفاذ: ${storeData.lowStockItems.map(p => p.nom_produit).join('، ')}`;
    } else {
      response += '\n✅ جميع المنتجات متوفرة بكميات كافية.';
    }
    return response;
  }
  
  if (msg.includes('مبيع') || msg.includes('vente') || msg.includes('بيع') || msg.includes('إيراد') || msg.includes('revenue')) {
    return `💰 إحصائيات المبيعات:\n- إجمالي عمليات البيع: ${storeData.salesStats.totalSalesCount}\n- إيرادات اليوم: ${storeData.salesStats.revenueToday} DA\n- الإيرادات الكلية: ${storeData.salesStats.totalRevenue} DA`;
  }
  
  if (msg.includes('تقرير') || msg.includes('rapport') || msg.includes('ملخص') || msg.includes('résumé')) {
    let report = `📊 ملخص المتجر:\n`;
    report += `- المنتجات: ${storeData.totalProducts}\n`;
    report += `- إيرادات اليوم: ${storeData.salesStats.revenueToday} DA\n`;
    report += `- الإيرادات الكلية: ${storeData.salesStats.totalRevenue} DA\n`;
    report += `- عمليات البيع: ${storeData.salesStats.totalSalesCount}`;
    if (storeData.lowStockItems.length > 0) {
      report += `\n- ⚠️ منتجات ناقصة: ${storeData.lowStockItems.length}`;
    }
    return report;
  }
  
  // إجابة افتراضية
  return `📊 إليك ملخص سريع:\n- المنتجات: ${storeData.totalProducts}\n- الإيرادات الكلية: ${storeData.salesStats.totalRevenue} DA\n- مبيعات اليوم: ${storeData.salesStats.revenueToday} DA\n\nيمكنك أن تسألني عن: المنتجات، المبيعات، التقارير، أو المخزون.`;
}

// دالة Gemini مع retry عند خطأ 429
async function callGeminiWithRetry(prompt, maxRetries = 2) {
  if (!genAI_instance) {
    throw new Error('GEMINI_NOT_CONFIGURED');
  }

  // تجربة عدة موديلات
  const models = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.5-flash'];
  
  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const modelName = models[modelIndex];
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 Trying model: ${modelName} (attempt ${attempt + 1})`);
        const model = genAI_instance.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        console.log(`✅ Gemini response OK with ${modelName}`);
        return responseText;
      } catch (error) {
        const is429 = error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'));
        const is404 = error.message && (error.message.includes('404') || error.message.includes('not found'));
        
        if (is404) {
          console.log(`⚠️ Model ${modelName} not available, trying next...`);
          break; // جرب الموديل التالي
        }
        
        if (is429 && attempt < maxRetries) {
          const waitTime = (attempt + 1) * 3000; // 3s, 6s
          console.log(`⏳ Rate limited (429). Waiting ${waitTime/1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        if (modelIndex === models.length - 1 && attempt === maxRetries) {
          throw error; // آخر محاولة
        }
      }
    }
  }
  
  throw new Error('All models and retries exhausted');
}

app.get('/api/chat/health', async (req, res) => {
  let dbStatus = 'unknown';
  try {
    const conn = await chatPool.getConnection();
    await conn.query('SELECT 1');
    conn.release();
    dbStatus = 'connected ✅';
  } catch (e) { dbStatus = `error: ${e.message}`; }
  
  res.json({
    status: 'running ✅',
    apiKey: geminiApiKey ? `${geminiApiKey.substring(0,8)}... ✅` : '❌ NOT FOUND',
    database: dbStatus,
    model: 'gemini-2.0-flash-lite (with fallback)',
    fallbackMode: !geminiApiKey
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'الرسالة فارغة' });

    console.log(`📩 Chat message: ${message}`);

    // 1. جلب بيانات المتجر
    let storeData;
    try {
      storeData = await getStoreData();
      console.log(`📊 Store data loaded: ${storeData.totalProducts} products`);
    } catch (dbError) {
      console.error('❌ Database error:', dbError.message);
      return res.status(500).json({ success: false, message: '❌ فشل الاتصال بقاعدة البيانات. تأكد من تشغيل MySQL.' });
    }

    // 2. محاولة استخدام Gemini
    try {
      const lowStockNames = storeData.lowStockItems
        .map(p => `${p.nom_produit || 'منتج'} (المتبقي: ${p.stock_actuel})`)
        .join('، ');

      const prompt = `أنت مساعد ذكي لمتجر "Bricaillerie" لإدارة المخزون. أجب دائماً بالعربية بلهجة مهنية ومختصرة وواضحة.
استخدم البيانات التالية للإجابة على سؤال المستخدم بدقة:

📦 بيانات المتجر الحالية:
- عدد المنتجات الإجمالي: ${storeData.totalProducts}
- مبيعات اليوم: ${storeData.salesStats.revenueToday} DA
- إجمالي الإيرادات الكلية: ${storeData.salesStats.totalRevenue} DA
- عدد عمليات البيع: ${storeData.salesStats.totalSalesCount}
- منتجات أوشكت على النفاذ: ${lowStockNames || 'لا يوجد حالياً'}

🛒 آخر 5 مبيعات:
${storeData.recentSales.map(s => `- ${s.client_name}: ${s.montant_total} DA بتاريخ ${s.date_op}`).join('\n') || 'لا توجد مبيعات مسجلة'}

❓ سؤال المستخدم: "${message}"

قدم إجابة مفيدة ومحددة ومختصرة بناءً على البيانات أعلاه. لا تستخدم markdown.`;

      const responseText = await callGeminiWithRetry(prompt);
      return res.json({ success: true, message: responseText });
      
    } catch (geminiError) {
      console.error('⚠️ Gemini failed, using local fallback:', geminiError.message);
      
      // 3. استخدام الإجابة المحلية كـ fallback
      const fallbackResponse = generateLocalResponse(message, storeData);
      return res.json({ success: true, message: fallbackResponse });
    }
    
  } catch (error) {
    console.error('❌ Chat Error:', error.message);
    res.status(500).json({ success: false, message: '❌ حدث خطأ. حاول مرة أخرى.' });
  }
});

// --- 10. تشغيل السيرفر ---
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ السيرفر شغال: http://localhost:${PORT}`);
  console.log(`🔑 Gemini API Key: ${process.env.GEMINI_API_KEY ? 'Loaded ✅' : '❌ NOT FOUND'}`);
});