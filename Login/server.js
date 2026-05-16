const express = require('express');
const mysql = require('mysql2');
const mysql2Promise = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

// --- 1. الميدل وير (Middlewares) ---
app.use(cors());
app.use(express.json()); // بديل حديث لـ bodyParser.json()
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // المجلد العام

// --- 2. الاتصال بقاعدة البيانات ---
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '', 
    database: 'gestion_stock' 
});

db.connect((err) => {
    if (err) { console.error('خطأ في الاتصال:', err); return; }
    console.log('تم الاتصال بقاعدة البيانات بنجاح!');
});

// --- 3. مسارات المصادقة (Auth) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const sql = "SELECT * FROM Utilisateur WHERE email = ? AND mot_de_passe = ?";
    db.query(sql, [email, password], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Erreur serveur" });
        if (results.length > 0) {
            res.json({ success: true, message: results[0].nom, role: results[0].role });
        } else {
            res.status(401).json({ success: false, message: "المستخدم غير متوفر." });
        }
    });
});

// --- 4. مسارات العملاء (Clients) المعدلة ---

// جلب جميع العملاء مرتبين من الأحدث إلى الأقدم
app.get('/api/clients', (req, res) => {
    db.query("SELECT * FROM Client ORDER BY id DESC", (err, results) => {
        if (err) {
            console.error("Erreur Fetch Clients:", err);
            return res.status(500).json({ error: "خطأ في جلب بيانات العملاء" });
        }
        res.json(results);
    });
});

// إضافة عميل جديد
app.post('/api/clients', (req, res) => {
    const { nom, contact, rc, nif, ai, nis, total_solde } = req.body;
    const sql = "INSERT INTO Client (nom, contact, rc, nif, ai, nis, total_solde) VALUES (?, ?, ?, ?, ?, ?, ?)";
    
    db.query(sql, [nom, contact, rc || '', nif || '', ai || '', nis || '', total_solde || 0], (err, result) => {
        if (err) {
            console.error("Erreur Add Client:", err);
            return res.status(500).json({ error: "تعذر إضافة العميل" });
        }
        res.json({ success: true, id: result.insertId });
    });
});

// تحديث بيانات عميل
app.put('/api/clients/:id', (req, res) => {
    const { nom, contact, total_solde, rc, nif, ai, nis } = req.body;
    const clientId = req.params.id;

    // السطر الصحيح: ترتيب الأعمدة ثم WHERE في الأخير مرة واحدة فقط
    const sql = "UPDATE Client SET nom = ?, contact = ?, rc = ?, nif = ?, ai = ?, nis = ?, total_solde = ? WHERE id = ?";
    
    db.query(sql, [
        nom, 
        contact, 
        rc || '', 
        nif || '', 
        ai || '', 
        nis || '', 
        total_solde || 0, 
        clientId
    ], (err) => {
        if (err) {
            console.error("Erreur Update Client:", err);
            return res.status(500).json({ success: false, message: "تعذر تحديث البيانات" });
        }
        res.json({ success: true });
    });
});
// حذف عميل
app.delete('/api/clients/:id', (req, res) => {
    // ملاحظة: إذا كان للعميل عمليات بيع، قد يمنعك SQL بسبب (Foreign Key Constraint)
    // وهذا أفضل لحماية سلامة البيانات
    db.query("DELETE FROM Client WHERE id = ?", [req.params.id], (err) => {
        if (err) {
            console.error("Erreur Delete Client:", err);
            return res.status(500).json({ 
                success: false, 
                message: "لا يمكن حذف العميل لأنه مرتبط بعمليات بيع مسجلة" 
            });
        }
        res.json({ success: true });
    });
});

// --- مسار حذف مبيعة (Vente) وتحديث المخزن والصولد آلياً ---
app.delete('/api/ventes/:id', (req, res) => {
    const opId = req.params.id;

    // الحذف من جدول Operation سيقوم بـ:
    // 1. حذف التفاصيل من Details_Operation (بسبب ON DELETE CASCADE في الداتابايز)
    // 2. تفعيل الـ Trigger لإرجاع الستوك وتعديل صولد الكليون
    const sql = "DELETE FROM Operation WHERE id = ?";
    
    db.query(sql, [opId], (err, result) => {
        if (err) {
            console.error("خطأ أثناء حذف المبيعة:", err);
            return res.status(500).json({ success: false, message: "Erreur SQL" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Vente non trouvée" });
        }

        console.log(`تم حذف المبيعة رقم ${opId} بنجاح`);
        res.json({ success: true, message: "Supprimé avec succès" });
    });
});

// --- 5. مسارات الموردين (Suppliers) ---
app.get('/api/suppliers', (req, res) => {
    db.query("SELECT * FROM fournisseur ORDER BY id DESC", (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.post('/api/suppliers', (req, res) => {
    const { nom, contact, tel, email, total_solde } = req.body;
    const sql = "INSERT INTO fournisseur (nom, contact, tel, email, total_solde) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [nom, contact, tel, email, total_solde], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ success: true, id: result.insertId });
    });
});

// كود الحذف البسيط (الاعتماد على التريجر في الداتابايز)
app.delete('/api/achats/:id', (req, res) => {
    const opId = req.params.id;
    
    // الحذف هنا سيقوم بتفعيل TRIGGER before_operation_delete تلقائياً
    db.query("DELETE FROM Operation WHERE id = ?", [opId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Erreur SQL" });
        }
        res.json({ success: true, message: "Supprimé بنجاح والمخزن تحديث آلياً" });
    });
});

// أضف هذا المسار في server.js
app.get('/api/categories', (req, res) => {
    db.query("SELECT * FROM Categorie", (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});
// --- 6. مسارات المنتجات (Products) ---
app.get('/api/produits', (req, res) => {
    const sql = "SELECT p.*, c.libelle as category_name FROM Produit p LEFT JOIN Categorie c ON p.id_categorie = c.id";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.post('/api/produits', (req, res) => {
    const { referencee, designation, prix_achat, prix_vente, stock_actuel, quantite_min, id_categorie } = req.body;
    const sql = "INSERT INTO Produit (referencee, designation, prix_achat, prix_vente, stock_actuel, quantite_min, id_categorie) VALUES (?, ?, ?, ?, ?, ?, ?)";
    db.query(sql, [referencee, designation, prix_achat, prix_vente, stock_actuel, quantite_min || 5, id_categorie || null], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.sqlMessage });
        res.json({ success: true, id: result.insertId });
    });
});

// مسار جلب منتج واحد (مهم لملء بيانات نافذة التعديل)
app.get('/api/produits/:id', (req, res) => {
    db.query("SELECT * FROM Produit WHERE id = ?", [req.params.id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: "Produit non trouvé" });
        res.json(results[0]);
    });
});

// مسار تعديل منتج
app.put('/api/produits/:id', (req, res) => {
    const { referencee, designation, prix_achat, prix_vente, stock_actuel, quantite_min, id_categorie } = req.body;
    const sql = `UPDATE Produit SET referencee=?, designation=?, prix_achat=?, prix_vente=?, 
                 stock_actuel=?, quantite_min=?, id_categorie=? WHERE id=?`;
    
    db.query(sql, [referencee, designation, prix_achat, prix_vente, stock_actuel, quantite_min, id_categorie, req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.sqlMessage });
        res.json({ success: true });
    });
});

// مسار حذف منتج
app.delete('/api/produits/:id', (req, res) => {
    // ملاحظة: SQL سيمنع الحذف إذا كان المنتج مرتبطاً بفواتير سابقة (Foreign Key Constraint)
    db.query("DELETE FROM Produit WHERE id = ?", [req.params.id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ 
                success: false, 
                message: "لا يمكن حذف المنتج لأنه مرتبط بعمليات بيع أو شراء مسجلة." 
            });
        }
        res.json({ success: true });
    });
});

// --- 7. مسارات المشتريات (Purchases/Achats) ---
app.get('/api/recent-achats', (req, res) => {
    const sql = `SELECT o.id, o.date_op, IFNULL(f.nom, 'Inconnu') as fournisseur, o.montant_total 
                 FROM Operation o LEFT JOIN Fournisseur f ON o.id_fournisseur = f.id
                 WHERE o.type_op = 'Achat' ORDER BY o.date_op DESC LIMIT 10`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/achats', (req, res) => {
    const { fournisseur_id, montant_total, items } = req.body;
    const sqlOp = "INSERT INTO Operation (type_op, montant_total, id_utilisateur, id_fournisseur) VALUES ('Achat', ?, 1, ?)";
    db.query(sqlOp, [montant_total, fournisseur_id], (err, result) => {
        if (err) return res.status(500).json(err);
        const opId = result.insertId;
        const sqlDetails = "INSERT INTO Details_Operation (id_operation, id_produit, quantite, prix_unitaire) VALUES ?";
        const values = items.map(item => [opId, item.id, item.qty, item.price]);
        db.query(sqlDetails, [values], (errDet) => {
            if (errDet) return res.status(500).json(errDet);
            res.json({ success: true, id: opId });
        });
    });
});

// كود الحذف المصلح للمشتريات (يتعامل مع الستوك)
app.delete('/api/achats/:id', (req, res) => {
    const opId = req.params.id;
    db.query("SELECT id_produit, quantite FROM Details_Operation WHERE id_operation = ?", [opId], (err, items) => {
        if (err) return res.status(500).json(err);
        
        // تحديث الستوك (طرح الكميات لأننا حذفنا شراء)
        const updates = items.map(item => {
            return new Promise((resolve) => {
                db.query("UPDATE Produit SET stock_actuel = stock_actuel - ? WHERE id = ?", [item.quantite, item.id_produit], resolve);
            });
        });

        Promise.all(updates).then(() => {
            db.query("DELETE FROM Details_Operation WHERE id_operation = ?", [opId], () => {
                db.query("DELETE FROM Operation WHERE id = ?", [opId], () => {
                    res.json({ success: true });
                });
            });
        });
    });
});

// --- 8. مسارات المبيعات (Sales/Ventes) ---
app.get('/api/recent-ventes', (req, res) => {
    const sql = `SELECT o.id, o.date_op, IFNULL(c.nom, 'Client Comptant') as client, o.montant_total 
                 FROM Operation o LEFT JOIN Client c ON o.id_client = c.id
                 WHERE o.type_op = 'Vente' ORDER BY o.id DESC LIMIT 10`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/ventes', (req, res) => {
    const { client_id, montant_total, items } = req.body;
    db.query("INSERT INTO Operation (type_op, montant_total, id_utilisateur, id_client) VALUES ('Vente', ?, 1, ?)", [montant_total, client_id], (err, result) => {
        if (err) return res.status(500).json(err);
        const opId = result.insertId;
        const values = items.map(i => [opId, i.id, i.qty, i.price]);
        db.query("INSERT INTO Details_Operation (id_operation, id_produit, quantite, prix_unitaire) VALUES ?", [values], (errDet) => {
            if (errDet) return res.status(500).json(errDet);
            res.json({ success: true });
        });
    });
});

// جلب تفاصيل فاتورة للطباعة
app.get('/api/operation-details/:id', (req, res) => {
    const sqlOp = "SELECT o.id, o.date_op, o.montant_total, c.nom as client_nom, f.nom as fournisseur_nom FROM Operation o LEFT JOIN Client c ON o.id_client = c.id LEFT JOIN Fournisseur f ON o.id_fournisseur = f.id WHERE o.id = ?";
    db.query(sqlOp, [req.params.id], (err, opResult) => {
        if (err || opResult.length === 0) return res.status(404).json({message: "Non trouvé"});
        const sqlItems = "SELECT d.quantite, d.prix_unitaire, p.designation FROM Details_Operation d JOIN Produit p ON d.id_produit = p.id WHERE d.id_operation = ?";
        db.query(sqlItems, [req.params.id], (errDet, items) => {
            res.json({ operation: opResult[0], items });
        });
    });
});

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

    // جلب المنتجات - محاولة nom_produit أولاً ثم designation
    try {
      const [p] = await conn.query('SELECT nom_produit as designation, stock_actuel, quantite_min FROM Produit LIMIT 50');
      products = p;
    } catch (e) {
      console.error('⚠️ Produit query (nom_produit) error:', e.message);
      try {
        const [p] = await conn.query('SELECT designation, stock_actuel, quantite_min FROM Produit LIMIT 50');
        products = p;
      } catch (e2) { console.error('⚠️ Produit fallback also failed:', e2.message); }
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
      response += `\n⚠️ منتجات أوشكت على النفاذ: ${storeData.lowStockItems.map(p => p.designation || p.nom_produit).join('، ')}`;
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
  const models = ['gemini-2.0-flash-lite', 'gemini-1.5-flash'];
  
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
        .map(p => `${p.designation || p.nom_produit || 'منتج'} (المتبقي: ${p.stock_actuel})`)
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


// جلب الموردين - تأكد أن اسم الجدول في SQL هو fournisseur
app.get('/api/fournisseur', (req, res) => {
    const sql = "SELECT * FROM fournisseur"; // تم التغيير للمفرد ليطابق قاعدة بياناتك
    db.query(sql, (err, results) => {
        if (err) {
            console.error("خطأ في قاعدة البيانات:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(results);
    });
});

// جلب الزبائن - تأكد أن اسم الجدول هو client
app.get('/api/clients', (req, res) => {
    const sql = "SELECT * FROM client"; // تم التغيير للمفرد
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// تسجيل عملية دفع وتحديث الرصيد
app.post('/api/transactions', async (req, res) => {
    const { type_entite, entite_id, type_paiement, montant, num_cheque, date_transaction } = req.body;

    try {
        // أ. محاولة الإدخال في جدول العمليات
        const sqlInsert = `INSERT INTO transactions 
            (type_entite, entite_id, type_paiement, montant, num_cheque, date_transaction) 
            VALUES (?, ?, ?, ?, ?, ?)`;
        
        await db.promise().query(sqlInsert, [type_entite, entite_id, type_paiement, montant, num_cheque, date_transaction]);

        // ب. محاولة تحديث الرصيد
        const table = (type_entite === 'client') ? 'client' : 'fournisseur';
        console.log("سيتم التحديث في جدول:", table);
        const sqlUpdateSolde = `UPDATE ${table} SET total_solde = total_solde - ? WHERE id = ?`;
        
        await db.promise().query(sqlUpdateSolde, [montant, entite_id]);

        res.status(200).json({ message: "تم التسجيل بنجاح" });

    } catch (err) {
        // طباعة الخطأ في تيرمينال السيرفر
        console.error("خطأ MySQL حقيقي:", err);

        // إرسال تفاصيل الخطأ للمتصفح (بشكل مؤقت للإصلاح)
        res.status(500).json({ 
            error: "Database error", 
            sqlMessage: err.sqlMessage, // سيقول لك مثلاً: العمود X غير موجود
            sqlErrorCode: err.code      // كود الخطأ مثل ER_NO_SUCH_TABLE
        });
    }
});
