const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path'); // جلب مكتبة المسارات في الأعلى

const app = express();

// 1. إعدادات الميدل وير (Middlewares) - الترتيب مهم
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 2. تعريف المجلد العام (Static Files) - سطر واحد يكفي لكل الملفات (CSS, JS, Images)
app.use(express.static(__dirname));

// 3. الاتصال بقاعدة البيانات (XAMPP)
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '', 
    database: 'gestion_stock' 
});

db.connect((err) => {
    if (err) {
        console.error('خطأ في الاتصال:', err);
        return;
    }
    console.log('تم الاتصال بقاعدة البيانات بنجاح!');
});

// 4. المسارات (Routes)

// مسار الصفحة الرئيسية (يفتح صفحة اللوجن فوراً)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// مسار تسجيل الدخول
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const sql = "SELECT * FROM Utilisateur WHERE email = ? AND mot_de_passe = ?";
    
    db.query(sql, [email, password], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Erreur serveur" });
        }

        if (results.length > 0) {
            const user = results[0];
            res.json({ 
                success: true, 
                message: user.nom, // نرسل الاسم فقط لاستخدامه في الترحيب
                role: user.role 
            });
        } else {
            // نرسل success: false لكي يفهم الفرونت أند أن الدخول فشل
            res.status(401).json({ success: false, message: "المستخدم غير متوفر في قاعدة البيانات، يرجى التواصل مع الإدارة." });
        }
    });
});

// 5. تشغيل السيرفر (دائماً يكون في آخر الملف)
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`السيرفر شغال على الرابط: http://localhost:${PORT}`);
});


// جلب قائمة العملاء من قاعدة البيانات
app.get('/api/clients', (req, res) => {
    const sql = "SELECT * FROM client";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// إضافة عميل جديد
app.post('/api/clients', (req, res) => {
    const { nom, contact, total_solde } = req.body;
    const sql = "INSERT INTO Client (nom, contact, total_solde) VALUES (?, ?, ?)";
    db.query(sql, [nom, contact, total_solde || 0], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

// 3. تعديل معلومات زبون (UPDATE)
app.put('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    const { nom, contact, total_solde } = req.body;
    
    const sql = "UPDATE Client SET nom = ?, contact = ?, total_solde = ? WHERE id = ?";
    db.query(sql, [nom, contact, total_solde, id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Erreur lors de la modification" });
        }
        res.json({ success: true, message: "Client mis à jour avec succès" });
    });
});

// 4. حذف زبون (DELETE)
app.delete('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    
    const sql = "DELETE FROM Client WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Erreur lors de la suppression" });
        }
        res.json({ success: true, message: "Client supprimé avec succès" });
    });
});


// جلب إحصائيات سريعة للـ Dashboard
app.get('/api/stats/clients-count', (req, res) => {
    const sql = "SELECT COUNT(*) AS total FROM client";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, total: results[0].total });
    });
});


app.get('/api/stats/clients-trend', (req, res) => {
    // نجلب العدد الإجمالي والعدد الذي أضيف في آخر 30 يوم
    const sql = `
        SELECT 
            (SELECT COUNT(*) FROM client) as total,
            (SELECT COUNT(*) FROM client WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as new_clients
    `;
    // ملاحظة: تأكد أن جدول client يحتوي على عمود اسمه created_at نوعه TIMESTAMP أو DATETIME
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        
        const { total, new_clients } = results[0];
        let trend = 0;
        if (total > 0) {
            trend = (new_clients / total) * 100; // حساب النسبة
        }
        
        res.json({ 
            success: true, 
            total: total, 
            trend: trend.toFixed(1) // تقريب لرقم واحد بعد الفاصلة
        });
    });
});



// جلب الموردين
app.get('/api/suppliers', (req, res) => {
    db.query("SELECT * FROM fournisseur ORDER BY id DESC", (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// إضافة مورد جديد
app.post('/api/suppliers', (req, res) => {
    const { nom, contact, tel, email, total_solde } = req.body;
    const sql = "INSERT INTO fournisseur (nom, contact, tel, email, total_solde) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [nom, contact, tel, email, total_solde], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ success: true, id: result.insertId });
    });
});
// أضف هذا الكود في server.js
app.delete('/api/suppliers/:id', (row, res) => {
    const { id } = row.params;
    db.query("DELETE FROM fournisseur WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ success: true });
    });
});



// مسار تحديث مورد
app.put('/api/suppliers/:id', (req, res) => {
    const { id } = req.params;
    const { nom, contact, tel, email, total_solde } = req.body;
    const sql = "UPDATE fournisseur SET nom=?, contact=?, tel=?, email=?, total_solde=? WHERE id=?";
    
    db.query(sql, [nom, contact, tel, email, total_solde, id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err });
        res.json({ success: true, message: "Fournisseur mis à jour" });
    });
});

app.use(express.json()); // ضروري جداً لقراءة req.body
// جلب المنتجات مع اسم الفئة (Join)
app.get('/api/produits', (req, res) => {
    const sql = `
        SELECT p.*, c.libelle as category_name 
        FROM Produit p 
        LEFT JOIN Categorie c ON p.id_categorie = c.id
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// 1. إضافة منتج جديد
app.post('/api/produits', (req, res) => {
    const { referencee, designation, prix_achat, prix_vente, stock_actuel, quantite_min, id_categorie } = req.body;
    const categoryId = (id_categorie && parseInt(id_categorie) > 0) ? parseInt(id_categorie) : null;
    const sql = "INSERT INTO Produit (referencee, designation, prix_achat, prix_vente, stock_actuel, quantite_min, id_categorie) VALUES (?, ?, ?, ?, ?, ?, ?)";
    
    // الحل هنا: إرسال id_categorie || null لضمان عدم إرسال نص فارغ لقاعدة البيانات
    db.query(sql, [
        referencee, 
        designation, 
        prix_achat, 
        prix_vente, 
        stock_actuel, 
        quantite_min || 5, 
        id_categorie || null 
    ], (err, result) => {
        if (err) {
            console.error("DEBUG SQL POST ERROR:", err);
            // إرسال رسالة واضحة للفرونت آند
            return res.status(500).json({ success: false, message: err.sqlMessage || "Erreur SQL lors de l'ajout" });
        }
        res.json({ success: true, message: "Produit ajouté avec succès", id: result.insertId });
    });
});

// 2. تحديث بيانات منتج (Update)
app.put('/api/produits/:id', (req, res) => {
    const id = req.params.id;
    const { referencee, designation, prix_achat, prix_vente, stock_actuel, quantite_min, id_categorie } = req.body;
    
    const sql = "UPDATE Produit SET referencee=?, designation=?, prix_achat=?, prix_vente=?, stock_actuel=?, quantite_min=?, id_categorie=? WHERE id=?";
    
    db.query(sql, [
        referencee, 
        designation, 
        prix_achat, 
        prix_vente, 
        stock_actuel, 
        quantite_min, 
        id_categorie || null, 
        id
    ], (err, result) => {
        if (err) {
            console.error("DEBUG SQL PUT ERROR:", err);
            return res.status(500).json({ success: false, message: err.sqlMessage || "Erreur lors de la mise à jour" });
        }
        res.json({ success: true, message: "Produit mis à jour !" });
    });
});

// 3. جلب بيانات منتج واحد (مسار واحد يكفي)
app.get('/api/produits/:id', (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM Produit WHERE id = ?";
    
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Erreur Base de données" });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: "Produit non trouvé" });
        }
        res.json(result[0]); 
    });
});

app.delete('/api/achats/:id', (req, res) => {
    const operationId = req.params.id;

    // 1. جلب البيانات مع التأكد من المسميات: total_solde و Details_Operation
    const getOpQuery = "SELECT id_fournisseur, montant_total FROM Operation WHERE id = ?";
    const getItemsQuery = "SELECT id_produit, quantite FROM Details_Operation WHERE id_operation = ?";

    db.query(getOpQuery, [operationId], (err, opResult) => {
        if (err || opResult.length === 0) return res.status(500).json({ error: "Opération non trouvée" });

        const { id_fournisseur, montant_total } = opResult[0];

        db.query(getItemsQuery, [operationId], (err, items) => {
            if (err) return res.status(500).json({ error: err.message });

            db.beginTransaction((err) => {
                try {
                    // أ. تحديث رصيد المورد (استخدام الحقل الصحيح total_solde)
                    const updateSup = "UPDATE Fournisseur SET total_solde = total_solde - ? WHERE id = ?";
                    db.query(updateSup, [montant_total, id_fournisseur]);

                    // ب. تحديث المخزن (استخدام quantite)
                    items.forEach(item => {
                        const updateStock = "UPDATE Produit SET stock_actuel = stock_actuel - ? WHERE id = ?";
                        db.query(updateStock, [item.quantite, item.id_produit]);
                    });

                    // ج. الحذف مع تعطيل القيود لضمان النجاح
                    db.query("SET FOREIGN_KEY_CHECKS = 0", () => {
                        db.query("DELETE FROM Operation WHERE id = ?", [operationId], (errDelete) => {
                            db.query("SET FOREIGN_KEY_CHECKS = 1");
                            if (errDelete) throw errDelete;
                            
                            db.commit((errCommit) => {
                                if (errCommit) throw errCommit;
                                res.json({ success: true, message: "Achat supprimé" });
                            });
                        });
                    });

                } catch (error) {
                    db.rollback(() => res.status(500).json({ error: "Erreur SQL" }));
                }
            });
        });
    });
});

// أضف هذا المسار في ملف server.js
app.get('/api/fournisseurs', (req, res) => {
    const sql = "SELECT id, nom FROM fournisseur"; // تأكد من أن العمود اسمه 'nom' وليس 'nom_fournisseur'
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Erreur SQL:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.post('/api/achats', (req, res) => {
    const { fournisseur_id, montant_total, items } = req.body;
    const id_utilisateur = 1; // افترضنا أن الأدمن هو رقم 1

    // 1. إدخال العملية الرئيسية (النوع 'Achat')
    const sqlOp = "INSERT INTO Operation (type_op, montant_total, id_utilisateur, id_fournisseur) VALUES ('Achat', ?, ?, ?)";
    
    db.query(sqlOp, [montant_total, id_utilisateur, fournisseur_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        const operationId = result.insertId; // الحصول على ID العملية التي أُدخلت للتو

        // 2. إدخال تفاصيل المنتجات (التي ستفعل الـ Trigger تلقائياً)
        const sqlDetails = "INSERT INTO Details_Operation (id_operation, id_produit, quantite, prix_unitaire) VALUES ?";
        
        // تحويل مصفوفة المنتجات إلى تنسيق يقبله SQL (Array of Arrays)
        const values = items.map(item => [operationId, item.id, item.qty, item.price]);

        db.query(sqlDetails, [values], (errDetails) => {
            if (errDetails) return res.status(500).json({ error: errDetails.message });
            
            // هنا الـ Triggers في الداتابايز قامت بعملها الآن:
            // - زاد المخزون في جدول Produit
            // - زاد رصيد المورد في جدول Fournisseur
            res.json({ success: true, message: "Achat enregistré avec succès !" });
        });
    });
});


// 1. جلب قائمة المشتريات الأخيرة مع اسم المورد
app.get('/api/recent-achats', (req, res) => {
    const sql = `
        SELECT o.id, o.date_op, IFNULL(f.nom, 'Inconnu') as fournisseur, o.montant_total 
        FROM Operation o
        LEFT JOIN Fournisseur f ON o.id_fournisseur = f.id
        WHERE o.type_op = 'Achat'
        ORDER BY o.date_op DESC LIMIT 10`;
    
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.delete('/api/achats/:id', (req, res) => {
    const operationId = req.params.id;

    // 1. نبدأ بجلب بيانات العملية قبل حذفها لنعرف المبلغ والمنتجات
    const getOpQuery = "SELECT id_fournisseur, montant_total FROM Operation WHERE id = ?";
    const getItemsQuery = "SELECT id_produit, qte FROM Ligne_Operation WHERE id_operation = ?";

    db.query(getOpQuery, [operationId], (err, opResult) => {
        if (err || opResult.length === 0) return res.status(500).json({ error: "Opération non trouvée" });

        const { id_fournisseur, montant_total } = opResult[0];

        db.query(getItemsQuery, [operationId], (err, items) => {
            if (err) return res.status(500).json({ error: err.message });

            // بدء "Transaction" لضمان تحديث كل شيء أو لا شيء
            db.beginTransaction(async (err) => {
                try {
                    // أ. تحديث رصيد المورد (طرح مبلغ الشراء المحذوف)
                    const updateSup = "UPDATE Fournisseur SET solde = solde - ? WHERE id = ?";
                    db.query(updateSup, [montant_total, id_fournisseur]);

                    // ب. تحديث المخزن (طرح الكميات التي دخلت)
                    items.forEach(item => {
                        const updateStock = "UPDATE Produit SET stock_actuel = stock_actuel - ? WHERE id = ?";
                        db.query(updateStock, [item.qte, item.id_produit]);
                    });

                    // ج. حذف العملية (سيتم حذف التفاصيل تلقائياً إذا كان لديك ON DELETE CASCADE)
                    db.query("DELETE FROM Operation WHERE id = ?", [operationId], (err) => {
                        if (err) throw err;
                        
                        // إنهاء العملية بنجاح
                        db.commit((err) => {
                            if (err) throw err;
                            res.json({ success: true, message: "Achat supprimé et comptes mis à jour" });
                        });
                    });

                } catch (error) {
                    db.rollback(() => {
                        res.status(500).json({ error: "Erreur lors de la mise à jour des stocks" });
                    });
                }
            });
        });
    });
});


// 1. جلب المبيعات الأخيرة
app.get('/api/recent-ventes', (req, res) => {
    const sql = `
        SELECT o.id, o.date_op, IFNULL(c.nom, 'Client Comptant') as client, o.montant_total 
        FROM Operation o
        LEFT JOIN Client c ON o.id_client = c.id
        WHERE o.type_op = 'Vente'
        ORDER BY o.id DESC LIMIT 10`; // ترتيب حسب الـ ID الأحدث
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 2. كود الحذف الكامل (حذف التفاصيل ثم العملية)
app.delete('/api/ventes/:id', (req, res) => {
    const opId = req.params.id;
    // أولاً حذف التفاصيل
    const sqlDelDetails = "DELETE FROM Details_Operation WHERE id_operation = ?";
    db.query(sqlDelDetails, [opId], (err) => {
        if (err) return res.status(500).json(err);
        
        // ثانياً حذف العملية نفسها
        const sqlDelOp = "DELETE FROM Operation WHERE id = ?";
        db.query(sqlDelOp, [opId], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ success: true });
        });
    });
});

// 2. تسجيل بيع جديد (طرح من المخزن وزيادة ديون العميل)
app.post('/api/ventes', (req, res) => {
    const { client_id, montant_total, items } = req.body;
    const sqlOp = "INSERT INTO Operation (type_op, montant_total, id_utilisateur, id_client) VALUES ('Vente', ?, 1, ?)";
    
    db.query(sqlOp, [montant_total, client_id], (err, result) => {
        if (err) return res.status(500).json(err);
        const opId = result.insertId;
        const sqlDetails = "INSERT INTO Details_Operation (id_operation, id_produit, quantite, prix_unitaire) VALUES ?";
        const values = items.map(i => [opId, i.id, i.qty, i.price]);

        db.query(sqlDetails, [values], (errDet) => {
            if (errDet) return res.status(500).json(errDet);
            
            // تحديث المخزن (طرح) وتحديث رصيد العميل (زيادة ديون)
            // ملاحظة: إذا كان لديك Triggers في الداتابايز سيتم الأمر تلقائياً
            // إذا لم يكن لديك، يجب تنفيذ UPDATE Produit و UPDATE Client هنا.
            res.json({ success: true });
        });
    });
});

