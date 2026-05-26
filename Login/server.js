const express = require('express');
const mysql = require('mysql2');
const mysql2Promise = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const XLSX = require('xlsx');
const fs = require('fs');

const app = express();
const http = require('http');
const server = http.createServer(app); // تحويل التطبيق ليدعم الـ WebSockets




// --- 1. الميدل وير (Middlewares) ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname)); // المجلد العام
app.use('/photos', express.static(path.join(__dirname, 'photos')));

// --- 2. الاتصال بقاعدة البيانات ---
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    // ⚠️ هذا السطر ضروري جداً لكي تنجح المنصات السحابية في الاتصال ببعضها
    ssl: {
        rejectUnauthorized: false
    }
});

db.connect((err) => {
    if (err) { console.error('خطأ في الاتصال:', err); return; }
    console.log('Successfully connected to the database.');
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
            res.status(401).json({ success: false, message: "User not found." });
        }
    });
});

// --- 4. مسارات العملاء (Clients) المعدلة ---

// جلب جميع العملاء مرتبين من الأحدث إلى الأقدم
app.get('/api/clients', (req, res) => {
    db.query("SELECT * FROM Client ORDER BY id DESC", (err, results) => {
        if (err) {
            console.error("Erreur Fetch Clients:", err);
            return res.status(500).json({ error: "Error fetching client data" });
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
            return res.status(500).json({ error: "Error adding client" });
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
            return res.status(500).json({ success: false, message: "Error updating client data" });
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
                message: "Cannot delete client as they are linked to registered sales" 
            });
        }
        res.json({ success: true });
    });
});

// --- مسار حذف مبيعة (Vente) وتحديث المخزن والصولد آلياً ---
app.delete('/api/ventes/:id', (req, res) => {
    const opId = req.params.id;

    // حذف تفاصيل العملية أولاً ثم العملية نفسها
    db.query("DELETE FROM Details_Operation WHERE id_operation = ?", [opId], (err) => {
        if (err) {
            console.error("Error while deleting sale details:", err);
            return res.status(500).json({ success: false, message: "Error SQL details" });
        }

        db.query("DELETE FROM Operation WHERE id = ?", [opId], (err2, result) => {
            if (err2) {
                console.error("Error while deleting sale:", err2);
                return res.status(500).json({ success: false, message: "Error SQL operation" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "Sale not found" });
            }

            console.log(`Sale  with ID ${opId} deleted successfully  `);
            res.json({ success: true, message: "Deleted successfully " });
        });
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
            return res.status(500).json({ success: false, message: "Error SQL" });
        }
        res.json({ success: true, message: "Deleted successfully " });
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
// Helper to save base64 photo to local filesystem
function savePhotoSync(photoBase64, referencee) {
    if (!photoBase64 || !photoBase64.startsWith('data:')) return null;
    try {
        const matches = photoBase64.match(/^data:(.*?);base64,(.*)$/);
        if (!matches || matches.length !== 3) return null;
        
        const mimeType = matches[1].split(';')[0]; // in case there are other parameters
        const fileExtension = mimeType.split('/')[1] || 'jpg';
        const imageBuffer = Buffer.from(matches[2], 'base64');
        const fileName = `p_${Date.now()}_${referencee.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExtension}`;
        const filePath = path.join(__dirname, 'photos', fileName);
        
        // Ensure folder exists
        if (!fs.existsSync(path.join(__dirname, 'photos'))) {
            fs.mkdirSync(path.join(__dirname, 'photos'));
        }
        
        fs.writeFileSync(filePath, imageBuffer);
        return `photos/${fileName}`;
    } catch (e) {
        console.error('Error saving photo:', e);
        return null;
    }
}

// --- 6. مسارات المنتجات (Products) ---
app.get('/api/produits', (req, res) => {
    const sql = "SELECT p.*, c.libelle as category_name, f.nom as fournisseur_name FROM Produit p LEFT JOIN Categorie c ON p.id_categorie = c.id LEFT JOIN fournisseur f ON p.id_fournisseur = f.id ORDER BY p.id DESC";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.post('/api/produits', (req, res) => {
    const { referencee, nom_produit, prix_achat, prix_vente, stock_actuel, quantite_min, id_categorie, id_fournisseur, photoBase64 } = req.body;
    
    // Save photo to disk if provided
    const photoPath = savePhotoSync(photoBase64, referencee);
    
    const sql = "INSERT INTO Produit (referencee, nom_produit, prix_achat, prix_vente, stock_actuel, quantite_min, id_categorie, id_fournisseur, photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    db.query(sql, [referencee, nom_produit, prix_achat, prix_vente, stock_actuel, quantite_min || 5, id_categorie || null, id_fournisseur || null, photoPath], (err, result) => {
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
    const { referencee, nom_produit, prix_achat, prix_vente, stock_actuel, quantite_min, id_categorie, id_fournisseur, photoBase64, photo } = req.body;
    
    // If a new photo is uploaded, save it. Otherwise, keep the existing photo path.
    let photoPath = photo;
    if (photoBase64 && photoBase64.startsWith('data:')) {
        photoPath = savePhotoSync(photoBase64, referencee);
    }
    
    const sql = `UPDATE Produit SET referencee=?, nom_produit=?, prix_achat=?, prix_vente=?, 
                 stock_actuel=?, quantite_min=?, id_categorie=?, id_fournisseur=?, photo=? WHERE id=?`;
    
    db.query(sql, [referencee, nom_produit, prix_achat, prix_vente, stock_actuel, quantite_min, id_categorie || null, id_fournisseur || null, photoPath, req.params.id], (err) => {
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
                message: "cannot delete product as it is linked to registered sales or purchases" 
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
            items.forEach(item => {
                db.query("SELECT id, nom_produit, stock_actuel, quantite_min FROM Produit WHERE id = ?", [item.id], (errProd, prodResults) => {
                    if (!errProd && prodResults.length > 0) {
                        const product = prodResults[0];
                        
                        // التحقق مما إذا كان المخزون الحالي وصل أو قل عن الحد الأدنى المحدد
                        if (product.stock_actuel <= product.quantite_min) {
                            // استدعاء دالة الإرسال من ملف notifications.js
                            const { sendLowStockAlert } = require('./notifications');
                            sendLowStockAlert(product);
                        }
                    }
                });
            });
            res.json({ success: true });
        });
    });
});

// جلب تفاصيل فاتورة للطباعة
app.get('/api/operation-details/:id', (req, res) => {
    const sqlOp = "SELECT o.id, o.date_op, o.montant_total, c.nom as client_nom, f.nom as fournisseur_nom FROM Operation o LEFT JOIN Client c ON o.id_client = c.id LEFT JOIN Fournisseur f ON o.id_fournisseur = f.id WHERE o.id = ?";
    db.query(sqlOp, [req.params.id], (err, opResult) => {
        if (err || opResult.length === 0) return res.status(404).json({message: "Non trouvé"});
        const sqlItems = "SELECT d.quantite, d.prix_unitaire, p.nom_produit as nom_produit FROM Details_Operation d JOIN Produit p ON d.id_produit = p.id WHERE d.id_operation = ?";
        db.query(sqlItems, [req.params.id], (errDet, items) => {
            res.json({ operation: opResult[0], items });
        });
    });
});






// ===================================================================
// --- 9. Chatbot (Gemini / ChatGPT) Advanced Database Assistant ---
// ===================================================================

const geminiApiKey = process.env.GEMINI_API_KEY;
let genAI_instance = null;

if (geminiApiKey) {
    genAI_instance = new GoogleGenerativeAI(geminiApiKey);
    console.log('🤖 Gemini AI initialized successfully');
}

const chatPool = mysql2Promise.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'gestion_stock',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const openaiClient = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
if (openaiClient) console.log('🤖 OpenAI (ChatGPT) initialized as fallback');

// Helper to ask OpenAI
async function callOpenAI(messages) {
    if (!openaiClient) throw new Error('OPENAI_NOT_CONFIGURED');
    const completion = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 800,
        temperature: 0.5
    });
    return completion.choices[0].message.content;
}

// System prompt explaining full database schema & query generation rules
const systemPrompt = `Vous êtes Bricaillerie IA, un assistant intelligent d'aide à la décision pour un magasin de gestion de stock.
Vous avez un accès complet en lecture seule à la base de données MySQL.

Voici la structure exacte de la base de données (Schéma SQL) :
- client (id, nom, contact, total_solde, rc, nif, ai, nis)
- fournisseur (id, nom, contact, total_solde, tel, email, rc, nif, ai, nis)
- produit (id, referencee, nom_produit, prix_achat, prix_vente, stock_actuel, quantite_min, id_categorie)
- categorie (id, libelle)
- operation (id, date_op, type_op ['Achat','Vente'], montant_total, id_utilisateur, id_client, id_fournisseur)
- details_operation (id, id_operation, id_produit, quantite, prix_unitaire)
- transactions (id, type_entite ['client','fournisseur'], entite_id, type_paiement ['Versement','Chèque'], montant, date_transaction, num_cheque)
- utilisateur (id, nom, email, role ['Manager', 'Vendeur', 'Acheteur'])

Règles de fonctionnement :
1. Si l'utilisateur vous demande des informations nécessitant des données réelles de la base (ex: ventes du jour, ventes récentes, bénéfice, produits en rupture de stock, transactions d'un client, liste des fournisseurs, etc.), vous devez générer une requête SQL valide uniquement de type SELECT (pas d'INSERT, UPDATE, DELETE ni d'ALTER).
   Votre réponse doit commencer EXACTEMENT par :
   [SQL_QUERY]: <Votre requête SQL SELECT ici>
   Et rien d'autre. Le serveur exécutera automatiquement cette requête pour vous et vous transmettra les résultats pour générer la réponse finale.

2. Si vous recevez des données sous la forme "SQL_RESULTS: [...]", utilisez ces données exactes pour formuler une réponse complète, chaleureuse et structurée.

3. Répondez TOUJOURS dans la langue de l'utilisateur (Français, Arabe, Anglais, Dialecte Algérien, etc.). S'il demande en Français, répondez en Français. S'il demande en Arabe, répondez en Arabe.

4. Si l'utilisateur demande la création ou le téléchargement de rapports (quotidien, hebdomadaire, mensuel ou annuel), proposez-lui systématiquement les liens HTML stylisés suivants (utilisez les classes CSS adéquates) :
   - Pour le rapport quotidien :
     <a href="http://localhost:3000/api/reports/download?format=xlsx&period=daily" target="_blank">📊 Rapport Quotidien (Excel)</a>
     <a href="http://localhost:3000/api/reports/download?format=html&print=true&period=daily" target="_blank" class="pdf-link">📄 Rapport Quotidien (PDF)</a>
   - Pour le rapport hebdomadaire :
     <a href="http://localhost:3000/api/reports/download?format=xlsx&period=weekly" target="_blank">📊 Rapport Hebdomadaire (Excel)</a>
     <a href="http://localhost:3000/api/reports/download?format=html&print=true&period=weekly" target="_blank" class="pdf-link">📄 Rapport Hebdomadaire (PDF)</a>
   - Pour le rapport mensuel :
     <a href="http://localhost:3000/api/reports/download?format=xlsx&period=monthly" target="_blank">📊 Rapport Mensuel (Excel)</a>
     <a href="http://localhost:3000/api/reports/download?format=html&print=true&period=monthly" target="_blank" class="pdf-link">📄 Rapport Mensuel (PDF)</a>
   - Pour le rapport annuel :
     <a href="http://localhost:3000/api/reports/download?format=xlsx&period=annual" target="_blank">📊 Rapport Annuel (Excel)</a>
     <a href="http://localhost:3000/api/reports/download?format=html&print=true&period=annual" target="_blank" class="pdf-link">📄 Rapport Annuel (PDF)</a>

5. Restez professionnel, poli, clair et concis. Ne montrez pas la requête SQL brute dans votre réponse finale à moins qu'on ne vous le demande.

6. RÉPONDEZ À TOUTES LES QUESTIONS SANS EXCEPTION, QUEL QUE SOIT LE CONTEXTE DE LA QUESTION :
   Si la question de l'utilisateur est d'ordre général, théorique, concerne des conseils commerciaux, de l'aide à la gestion de son commerce, de la rédaction de courriels, des calculs généraux, ou tout autre sujet ne nécessitant pas d'interroger la base de données de manière directe, RÉPONDEZ-Y DIRECTEMENT ET CHALEUREUSEMENT avec vos connaissances approfondies d'intelligence artificielle. Dans ce cas, NE GÉNÉREZ PAS de préfixe [SQL_QUERY]. Aidez l'utilisateur au maximum sans aucune restriction !`;

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ success: false, message: 'La question est vide' });

        console.log(`📩 Incoming message: "${message}"`);

        // Prepare messages for OpenAI or Prompt for Gemini
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
        ];

        let responseText = null;

        // Try المحاولة 1: Gemini
        if (genAI_instance) {
            const modelsToTry = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.5-flash'];
            for (const modelName of modelsToTry) {
                try {
                    const model = genAI_instance.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(`${systemPrompt}\n\nUser: ${message}`);
                    responseText = result.response.text();
                    break;
                } catch (geminiError) {
                    console.error(`⚠️ Gemini ${modelName} failed:`, geminiError.message);
                }
            }
        }

        // Try المحاولة 2: OpenAI Fallback
        if (!responseText && openaiClient) {
            try {
                responseText = await callOpenAI(messages);
            } catch (openaiError) {
                console.error(`❌ OpenAI failed:`, openaiError.message);
            }
        }

        // If no AI responds
        if (!responseText) {
            return res.json({
                success: true,
                message: "Désolé, les services IA sont actuellement indisponibles. Vous pouvez toujours générer des rapports en utilisant les liens directs suivants :<br><br>" +
                         "<a href='http://localhost:3000/api/reports/download?format=xlsx&period=daily' target='_blank'>📊 Rapport Quotidien (Excel)</a> " +
                         "<a href='http://localhost:3000/api/reports/download?format=html&print=true&period=daily' target='_blank' class='pdf-link'>📄 Rapport Quotidien (PDF)</a>"
            });
        }

        // Check if the AI wants to execute a SQL query
        if (responseText.trim().startsWith('[SQL_QUERY]:')) {
            const sqlQuery = responseText.replace('[SQL_QUERY]:', '').trim();
            console.log(`🔍 AI requested SQL query: "${sqlQuery}"`);

            // Security check: Only allow SELECT queries
            const isSafe = sqlQuery.toUpperCase().startsWith('SELECT') || sqlQuery.toUpperCase().startsWith('SHOW') || sqlQuery.toUpperCase().startsWith('DESCRIBE');
            
            if (!isSafe) {
                console.warn('⚠️ Rejected unsafe SQL query from AI!');
                return res.json({ success: true, message: "Désolé, je ne suis pas autorisé à exécuter des requêtes de modification ou de suppression." });
            }

            // Execute SQL query
            let queryResult = null;
            try {
                const [rows] = await chatPool.query(sqlQuery);
                queryResult = rows;
                console.log(`✅ SQL query executed successfully. Retrieved ${rows.length} rows.`);
            } catch (dbError) {
                console.error('❌ SQL Execution error:', dbError.message);
                queryResult = { error: dbError.message };
            }

            // Call AI a second time with the SQL results
            const followUpPrompt = `Résultats de la requête SQL : ${JSON.stringify(queryResult)}\n\nRédigez maintenant la réponse finale à l'utilisateur s'il vous plaît (en répondant précisément à sa question originale : "${message}").`;
            
            messages.push({ role: 'assistant', content: responseText });
            messages.push({ role: 'user', content: followUpPrompt });

            let finalResponse = null;

            // Try Gemini second pass
            if (genAI_instance) {
                try {
                    const model = genAI_instance.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
                    const result = await model.generateContent(`${systemPrompt}\n\nAI: ${responseText}\n\nUser: ${followUpPrompt}`);
                    finalResponse = result.response.text();
                } catch (e) {
                    console.error('⚠️ Gemini second pass failed:', e.message);
                }
            }

            // Try OpenAI second pass fallback
            if (!finalResponse && openaiClient) {
                try {
                    finalResponse = await callOpenAI(messages);
                } catch (e) {
                    console.error('❌ OpenAI second pass failed:', e.message);
                }
            }

            if (finalResponse) {
                responseText = finalResponse;
            } else {
                // Beautiful fallback HTML table formatter if LLM is rate-limited on the second pass
                if (Array.isArray(queryResult) && queryResult.length > 0) {
                    let tableHtml = `<div style="margin-top:10px;">📋 <b>Données récupérées :</b><br><br><div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; font-size:12px; margin-top:5px;"><thead><tr style="background:#f1f5f9; border-bottom:2px solid #cbd5e1;">`;
                    
                    // Headers
                    const headers = Object.keys(queryResult[0]);
                    headers.forEach(h => {
                        tableHtml += `<th style="padding:6px; text-align:left; color:#475569;">${h}</th>`;
                    });
                    tableHtml += `</tr></thead><tbody>`;
                    
                    // Rows
                    queryResult.forEach(row => {
                        tableHtml += `<tr style="border-bottom:1px solid #e2e8f0;">`;
                        headers.forEach(h => {
                            let val = row[h];
                            if (val instanceof Date) val = new Date(val).toLocaleString('fr-FR');
                            if (val === null || val === undefined) val = '-';
                            tableHtml += `<td style="padding:6px; color:#1e293b;">${val}</td>`;
                        });
                        tableHtml += `</tr>`;
                    });
                    tableHtml += `</tbody></table></div></div>`;
                    responseText = tableHtml;
                } else if (Array.isArray(queryResult) && queryResult.length === 0) {
                    responseText = `ℹ️ Aucune donnée correspondante n'a été trouvée dans la base de données.`;
                } else {
                    responseText = `Voici les données correspondantes récupérées : ${JSON.stringify(queryResult)}`;
                }
            }
        }

        res.json({ success: true, message: responseText });

    } catch (error) {
        console.error('❌ Server Chat Error:', error.message);
        res.status(500).json({ success: false, message: 'Une erreur interne est survenue.' });
    }
});

// Endpoint to generate Excel and HTML reports
app.get('/api/reports/download', async (req, res) => {
    let conn;
    try {
        const { format, period } = req.query;
        conn = await chatPool.getConnection();
        
        let dateFilter = '';
        if (period === 'daily') {
            dateFilter = 'AND DATE(date_op) = CURDATE()';
        } else if (period === 'weekly') {
            dateFilter = 'AND date_op >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
        } else if (period === 'monthly') {
            dateFilter = 'AND date_op >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        } else if (period === 'annual') {
            dateFilter = 'AND date_op >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)';
        } else {
            dateFilter = 'AND date_op >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)'; // default monthly
        }

        // Fetch Operations
        const [operations] = await conn.query(`
            SELECT o.id, o.date_op, o.type_op, o.montant_total, 
                   u.nom as utilisateur, 
                   IFNULL(c.nom, 'Client Comptant') as client, 
                   IFNULL(f.nom, 'N/A') as fournisseur
            FROM Operation o
            LEFT JOIN Utilisateur u ON o.id_utilisateur = u.id
            LEFT JOIN Client c ON o.id_client = c.id
            LEFT JOIN Fournisseur f ON o.id_fournisseur = f.id
            WHERE 1=1 ${dateFilter}
            ORDER BY o.date_op DESC
        `);

        // Fetch Top Selling Products in that period
        const [topProducts] = await conn.query(`
            SELECT p.nom_produit, SUM(d.quantite) as quantite_vendue, SUM(d.quantite * d.prix_unitaire) as revenue
            FROM Details_Operation d
            JOIN Produit p ON d.id_produit = p.id
            JOIN Operation o ON d.id_operation = o.id
            WHERE o.type_op = 'Vente' ${dateFilter}
            GROUP BY p.id
            ORDER BY quantite_vendue DESC
            LIMIT 10
        `);

        // Fetch overall stats
        const [stats] = await conn.query(`
            SELECT 
                COUNT(CASE WHEN type_op = 'Vente' THEN 1 END) as count_sales,
                COUNT(CASE WHEN type_op = 'Achat' THEN 1 END) as count_purchases,
                IFNULL(SUM(CASE WHEN type_op = 'Vente' THEN montant_total END), 0) as total_sales,
                IFNULL(SUM(CASE WHEN type_op = 'Achat' THEN montant_total END), 0) as total_purchases
            FROM Operation
            WHERE 1=1 ${dateFilter}
        `);

        const overallStats = stats[0] || { count_sales: 0, count_purchases: 0, total_sales: 0, total_purchases: 0 };

        if (format === 'xlsx') {
            // Generate Excel File
            const wb = XLSX.utils.book_new();

            // Sheet 1: General Stats
            const statsData = [
                ['Rapport de Gestion de Stock - ' + period.toUpperCase()],
                [],
                ['Métrique', 'Valeur'],
                ['Nombre total de Ventes', overallStats.count_sales],
                ['Nombre total d\'Achats', overallStats.count_purchases],
                ['Chiffre d\'Affaires (Ventes)', overallStats.total_sales + ' DA'],
                ['Total Dépenses (Achats)', overallStats.total_purchases + ' DA'],
                ['Marge Estimée', (overallStats.total_sales - overallStats.total_purchases) + ' DA']
            ];
            const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
            XLSX.utils.book_append_sheet(wb, statsSheet, 'Statistiques');

            // Sheet 2: Operations Details
            const opsData = [
                ['ID', 'Date', 'Type', 'Montant (DA)', 'Utilisateur', 'Client', 'Fournisseur']
            ];
            operations.forEach(op => {
                opsData.push([op.id, op.date_op, op.type_op, op.montant_total, op.utilisateur, op.client, op.fournisseur]);
            });
            const opsSheet = XLSX.utils.aoa_to_sheet(opsData);
            XLSX.utils.book_append_sheet(wb, opsSheet, 'Opérations');

            // Sheet 3: Top Products
            const prodData = [
                ['Nom Produit', 'Quantité Vendue', 'Chiffre d\'Affaires (DA)']
            ];
            topProducts.forEach(p => {
                prodData.push([p.nom_produit, p.quantite_vendue, p.revenue]);
            });
            const prodSheet = XLSX.utils.aoa_to_sheet(prodData);
            XLSX.utils.book_append_sheet(wb, prodSheet, 'Top Produits');

            // Send buffer
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            res.setHeader('Content-Disposition', `attachment; filename=Rapport_${period}_${new Date().toISOString().split('T')[0]}.xlsx`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            return res.send(buffer);
        } else {
            // Generate Beautiful HTML Report for PDF printing/saving
            const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Rapport de Gestion - ${period.toUpperCase()}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #333; }
                    .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
                    .header h1 { margin: 0; color: #2563eb; font-size: 28px; }
                    .header p { margin: 5px 0 0 0; color: #64748b; }
                    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
                    .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; text-align: center; }
                    .card h3 { margin: 0 0 10px 0; color: #64748b; font-size: 14px; text-transform: uppercase; }
                    .card p { margin: 0; font-size: 24px; font-weight: bold; color: #1e293b; }
                    .section { margin-bottom: 40px; }
                    .section h2 { border-left: 4px solid #2563eb; padding-left: 10px; font-size: 20px; margin-bottom: 20px; color: #1e293b; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
                    th { background-color: #f1f5f9; color: #475569; font-weight: 600; }
                    tr:nth-child(even) { background-color: #f8fafc; }
                    .btn-print { background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; float: right; }
                    @media print {
                        .btn-print { display: none; }
                        body { margin: 20px; }
                    }
                </style>
            </head>
            <body>
                <button class="btn-print" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
                <div class="header">
                    <h1>Rapport de Gestion de Stock</h1>
                    <p>Période : ${period.toUpperCase()} | Généré le : ${new Date().toLocaleDateString('fr-FR')}</p>
                </div>

                <div class="grid">
                    <div class="card">
                        <h3>Chiffre d'Affaires</h3>
                        <p>${overallStats.total_sales.toLocaleString()} DA</p>
                    </div>
                    <div class="card">
                        <h3>Total Dépenses</h3>
                        <p>${overallStats.total_purchases.toLocaleString()} DA</p>
                    </div>
                    <div class="card">
                        <h3>Marge nette estimée</h3>
                        <p>${(overallStats.total_sales - overallStats.total_purchases).toLocaleString()} DA</p>
                    </div>
                </div>

                <div class="section">
                    <h2>Résumé des Transactions</h2>
                    <div class="grid" style="grid-template-columns: repeat(2, 1fr); margin-bottom: 0;">
                        <div class="card" style="padding: 15px;">
                            <h3>Nombre de Ventes</h3>
                            <p>${overallStats.count_sales}</p>
                        </div>
                        <div class="card" style="padding: 15px;">
                            <h3>Nombre d'Achats</h3>
                            <p>${overallStats.count_purchases}</p>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h2>Top Produits Vendus</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Produit</th>
                                <th>Quantité Vendue</th>
                                <th>Chiffre d'Affaires</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topProducts.map(p => `
                                <tr>
                                    <td>${p.nom_produit}</td>
                                    <td>${p.quantite_vendue}</td>
                                    <td>${parseFloat(p.revenue).toLocaleString()} DA</td>
                                </tr>
                            `).join('') || '<tr><td colspan="3" style="text-align:center;">Aucune donnée disponible</td></tr>'}
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <h2>Historique des Opérations récentes</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Montant</th>
                                <th>Utilisateur</th>
                                <th>Client</th>
                                <th>Fournisseur</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${operations.slice(0, 15).map(op => `
                                <tr>
                                    <td>${op.id}</td>
                                    <td>${new Date(op.date_op).toLocaleString('fr-FR')}</td>
                                    <td>${op.type_op === 'Vente' ? '🔴 Vente' : '🟢 Achat'}</td>
                                    <td>${parseFloat(op.montant_total).toLocaleString()} DA</td>
                                    <td>${op.utilisateur}</td>
                                    <td>${op.client}</td>
                                    <td>${op.fournisseur}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="7" style="text-align:center;">Aucune opération enregistrée</td></tr>'}
                        </tbody>
                    </table>
                </div>
                
                <script>
                    const urlParams = new URLSearchParams(window.location.search);
                    if (urlParams.get('print') === 'true') {
                        window.onload = function() {
                            setTimeout(() => { window.print(); }, 500);
                        }
                    }
                </script>
            </body>
            </html>
            `;
            res.setHeader('Content-Type', 'text/html');
            return res.send(htmlContent);
        }
    } catch (e) {
        console.error('Error generating report:', e);
        res.status(500).send('Error generating report: ' + e.message);
    } finally {
        if (conn) conn.release();
    }
});

// تشغيل السيرفر
const PORT = 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));




// ===== 11. Fournisseurs (Suppliers) CRUD =====
app.get('/api/suppliers', (req, res) => {
    db.query("SELECT * FROM fournisseur ORDER BY id DESC", (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results);
    });
});

app.post('/api/suppliers', (req, res) => {
    const { nom, contact, tel, email, total_solde, rc, nif, ai, nis } = req.body;
    const sql = "INSERT INTO fournisseur (nom, contact, tel, email, total_solde, rc, nif, ai, nis) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    db.query(sql, [nom, contact, tel, email, total_solde || 0, rc, nif, ai, nis], (err, result) => {
        if (err) {
            console.error("Erreur Add Supplier:", err);
            return res.status(500).json({ success: false, error: "Error While Adding a new Supplier" });
        }
        res.json({ success: true, id: result.insertId });
    });
});

app.put('/api/suppliers/:id', (req, res) => {
    const { nom, contact, tel, email, total_solde, rc, nif, ai, nis } = req.body;
    const supplierId = req.params.id;

    const sql = "UPDATE fournisseur SET nom = ?, contact = ?, tel = ?, email = ?, total_solde = ?, rc = ?, nif = ?, ai = ?, nis = ? WHERE id = ?";
    
    db.query(sql, [nom, contact, tel, email, total_solde || 0, rc, nif, ai, nis, supplierId], (err) => {
        if (err) {
            console.error("Erreur Update Supplier:", err);
            return res.status(500).json({ success: false, message: "Error updating supplier data" });
        }
        res.json({ success: true });
    });
});

app.delete('/api/suppliers/:id', (req, res) => {
    const supplierId = req.params.id;
    
    // Set id_fournisseur to NULL in operation table before deleting
    db.query("UPDATE operation SET id_fournisseur = NULL WHERE id_fournisseur = ?", [supplierId], (errUpdate) => {
        if (errUpdate) {
            console.error("Erreur Update Operation before delete:", errUpdate);
            return res.status(500).json({ success: false, message: "Error deleting due to database constraints" });
        }
        
        const sql = "DELETE FROM fournisseur WHERE id = ?";
        db.query(sql, [supplierId], (err) => {
            if (err) {
                console.error("Erreur Delete Supplier:", err);
                return res.status(500).json({ success: false, message: "Error deleting supplier" });
            }
            res.json({ success: true });
        });
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

        res.status(200).json({ message: "Registered Successfully" });

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

// جلب تاريخ العمليات المالية
app.get('/api/transactions', (req, res) => {
    const sql = `
        SELECT t.*, 
               COALESCE(c.nom, f.nom) as entite_nom 
        FROM transactions t 
        LEFT JOIN client c ON t.type_entite = 'client' AND t.entite_id = c.id 
        LEFT JOIN fournisseur f ON t.type_entite = 'fournisseur' AND t.entite_id = f.id 
        ORDER BY t.date_transaction DESC, t.id DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: "Database error", details: err });
        res.json(results);
    });
});

app.put('/api/transactions/:id', async (req, res) => {
    const id = req.params.id;
    const { type_entite, entite_id, type_paiement, montant, num_cheque, date_transaction } = req.body;

    try {
        const [rows] = await db.promise().query('SELECT * FROM transactions WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Transaction non trouvée' });
        }

        const oldTx = rows[0];
        const oldTable = oldTx.type_entite === 'client' ? 'client' : 'fournisseur';
        await db.promise().query(`UPDATE ${oldTable} SET total_solde = total_solde + ? WHERE id = ?`, [oldTx.montant, oldTx.entite_id]);

        await db.promise().query(
            `UPDATE transactions SET type_entite = ?, entite_id = ?, type_paiement = ?, montant = ?, num_cheque = ?, date_transaction = ? WHERE id = ?`,
            [type_entite, entite_id, type_paiement, montant, num_cheque, date_transaction, id]
        );

        const newTable = type_entite === 'client' ? 'client' : 'fournisseur';
        await db.promise().query(`UPDATE ${newTable} SET total_solde = total_solde - ? WHERE id = ?`, [montant, entite_id]);

        res.json({ success: true, message: 'Transaction mise à jour' });
    } catch (err) {
        console.error('Erreur de mise à jour transaction:', err);
        res.status(500).json({ error: 'Database error', details: err });
    }
});

app.delete('/api/transactions/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const [rows] = await db.promise().query('SELECT * FROM transactions WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Transaction non trouvée' });
        }

        const tx = rows[0];
        const table = tx.type_entite === 'client' ? 'client' : 'fournisseur';
        await db.promise().query(`UPDATE ${table} SET total_solde = total_solde + ? WHERE id = ?`, [tx.montant, tx.entite_id]);
        await db.promise().query('DELETE FROM transactions WHERE id = ?', [id]);

        res.json({ success: true, message: 'Transaction supprimée' });
    } catch (err) {
        console.error('Erreur de suppression transaction:', err);
        res.status(500).json({ error: 'Database error', details: err });
    }
});

// ===== 10. BI Dashboard Endpoints =====
// ===== DASHBOARD CARDS STATS =====
app.get('/api/stats/dashboard-cards', (req, res) => {
    const sqlProducts = "SELECT COUNT(*) as count FROM produit";
    const sqlClients = "SELECT COUNT(*) as count FROM client";
    const sqlSuppliers = "SELECT COUNT(*) as count FROM fournisseur";
    const sqlRevenue = "SELECT SUM(montant_total) as total FROM operation WHERE type_op = 'Vente' AND MONTH(date_op) = MONTH(CURRENT_DATE()) AND YEAR(date_op) = YEAR(CURRENT_DATE())";

    db.query(sqlProducts, (err1, res1) => {
        db.query(sqlClients, (err2, res2) => {
            db.query(sqlSuppliers, (err3, res3) => {
                db.query(sqlRevenue, (err4, res4) => {
                    if (err1 || err2 || err3 || err4) {
                        console.error("Dashboard Stats Error", err1 || err2 || err3 || err4);
                        return res.status(500).json({ error: "Database error" });
                    }
                    res.json({
                        products: res1[0].count || 0,
                        clients: res2[0].count || 0,
                        suppliers: res3[0].count || 0,
                        revenue: res4[0].total || 0
                    });
                });
            });
        });
    });
});

app.get('/api/stats/bi-dashboard', async (req, res) => {
    try {
        // Fetch all products with non-zero stock/price to compute ABC
        const [products] = await chatPool.query(`
            SELECT id, nom_produit, referencee, stock_actuel, prix_achat, quantite_min 
            FROM produit 
            ORDER BY (stock_actuel * prix_achat) DESC
        `);

        if (!products || products.length === 0) {
            return res.json({ success: true, abc: [], operational: [] });
        }

        // Calculate total inventory value
        let totalVal = 0;
        products.forEach(p => {
            p.valeur = p.stock_actuel * p.prix_achat;
            totalVal += p.valeur;
        });

        // Compute cumulative values and ABC classifications
        let cumulativeVal = 0;
        const abcData = products.map(p => {
            cumulativeVal += p.valeur;
            const cumulativePct = totalVal > 0 ? (cumulativeVal / totalVal) * 100 : 0;
            
            let category = 'C';
            if (cumulativePct <= 70) {
                category = 'A';
            } else if (cumulativePct <= 90) {
                category = 'B';
            }

            return {
                id: p.id,
                name: p.nom_produit,
                ref: p.referencee,
                valeur: p.valeur,
                cumulativePct: parseFloat(cumulativePct.toFixed(2)),
                category: category
            };
        });

        // Get operational data for top 8 products (with reorder points and safety stock)
        const operationalData = products.slice(0, 8).map(p => {
            const reorderPoint = p.quantite_min;
            const safetyStock = Math.round(p.quantite_min * 0.5);
            
            let status = 'optimal'; // optimal, warning, critical
            if (p.stock_actuel <= safetyStock) {
                status = 'critical';
            } else if (p.stock_actuel <= reorderPoint) {
                status = 'warning';
            }

            return {
                id: p.id,
                name: p.nom_produit,
                stock: p.stock_actuel,
                reorderPoint: reorderPoint,
                safetyStock: safetyStock,
                status: status
            };
        });

        res.json({
            success: true,
            abc: abcData,
            operational: operationalData
        });

    } catch (e) {
        console.error('Error fetching BI stats:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});



