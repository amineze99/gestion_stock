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