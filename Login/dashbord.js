// ===== 1. جلب الإحصائيات العامة =====
async function updateDashboardStats() {
    try {
        const response = await fetch('http://localhost:3000/api/stats/dashboard-cards');
        const data = await response.json();

        if (response.ok) {
            const elProducts = document.getElementById('stat-products');
            const elClients = document.getElementById('stat-clients');
            const elSuppliers = document.getElementById('stat-suppliers');
            const elRevenue = document.getElementById('stat-revenue');

            if (elProducts) elProducts.innerText = data.products || 0;
            if (elClients) elClients.innerText = data.clients || 0;
            if (elSuppliers) elSuppliers.innerText = data.suppliers || 0;
            if (elRevenue) elRevenue.innerText = (data.revenue || 0) + ' DA';
        }
    } catch (error) {
        console.error("Connection Error (Dashboard Cards):", error);
    }
}

// ===== 2. Real-Time Business Intelligence (BI) Charts =====
let abcChartInstance = null;
let stockLevelsChartInstance = null;

// Real-time synchronization loader
async function updateBIData() {
    try {
        const response = await fetch('http://localhost:3000/api/stats/bi-dashboard');
        const data = await response.json();

        if (data.success) {
            updateBICharts(data);
        }
    } catch (error) {
        console.error("Connection Error (BI Stats):", error);
    }
}

function updateBICharts(data) {
    const abcData = data.abc || [];
    const operationalData = data.operational || [];

    // --- 1. ABC Analysis Chart (Strategic View) ---
    const abcCtx = document.getElementById('abcChart');
    if (abcCtx) {
        // Sort products by value
        const topAbc = abcData.slice(0, 10);
        const labels = topAbc.map(p => p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name);
        const values = topAbc.map(p => p.valeur);
        const percentages = topAbc.map(p => p.cumulativePct);
        
        // Dynamic colors: Class A (Emerald), Class B (Amber), Class C (Slate)
        const barColors = topAbc.map(p => {
            if (p.category === 'A') return 'rgba(16, 185, 129, 0.85)'; // Emerald
            if (p.category === 'B') return 'rgba(245, 158, 11, 0.85)'; // Amber
            return 'rgba(148, 163, 184, 0.85)'; // Slate
        });

        const chartData = {
            labels: labels,
            datasets: [
                {
                    label: 'Valeur de l\'inventaire (DA)',
                    type: 'bar',
                    data: values,
                    backgroundColor: barColors,
                    borderColor: barColors.map(c => c.replace('0.85', '1')),
                    borderWidth: 1.5,
                    yAxisID: 'yLeft',
                    order: 2
                },
                {
                    label: 'Cumulé (%)',
                    type: 'line',
                    data: percentages,
                    borderColor: 'rgba(59, 130, 246, 1)', // Blue
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                    pointRadius: 4,
                    tension: 0.3,
                    fill: false,
                    yAxisID: 'yRight',
                    order: 1
                }
            ]
        };

        if (abcChartInstance) {
            abcChartInstance.data = chartData;
            abcChartInstance.update();
        } else {
            abcChartInstance = new Chart(abcCtx.getContext('2d'), {
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                boxWidth: 12,
                                font: { family: 'Inter', size: 11 }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) label += ': ';
                                    if (context.dataset.type === 'bar') {
                                        label += context.raw.toLocaleString() + ' DA';
                                    } else {
                                        label += context.raw + '%';
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { font: { family: 'Inter', size: 10 } }
                        },
                        yLeft: {
                            type: 'linear',
                            position: 'left',
                            title: { display: true, text: 'Valeur (DA)', font: { family: 'Inter', size: 11 } },
                            ticks: {
                                font: { family: 'Inter', size: 9 },
                                callback: function(value) { return value.toLocaleString(); }
                            },
                            grid: { color: '#f1f5f9' }
                        },
                        yRight: {
                            type: 'linear',
                            position: 'right',
                            min: 0,
                            max: 100,
                            title: { display: true, text: 'Cumulé (%)', font: { family: 'Inter', size: 11 } },
                            ticks: {
                                font: { family: 'Inter', size: 9 },
                                callback: function(value) { return value + '%'; }
                            },
                            grid: { display: false }
                        }
                    }
                }
            });
        }
    }

    // --- 2. Stock Levels vs. Reorder Points Chart (Operational View) ---
    const stockCtx = document.getElementById('stockLevelsChart');
    if (stockCtx) {
        const topOp = operationalData.slice(0, 7);
        const labels = topOp.map(p => p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name);
        const stocks = topOp.map(p => p.stock);
        const reorders = topOp.map(p => p.reorderPoint);
        const safeties = topOp.map(p => p.safetyStock);

        // Health indicators: Red (critical), Yellow (warning), Green (optimal)
        const stockColors = topOp.map(p => {
            if (p.status === 'critical') return 'rgba(239, 68, 68, 0.85)'; // Red
            if (p.status === 'warning') return 'rgba(245, 158, 11, 0.85)'; // Amber/Yellow
            return 'rgba(16, 185, 129, 0.85)'; // Green
        });

        const chartData = {
            labels: labels,
            datasets: [
                {
                    label: 'Stock Actuel',
                    data: stocks,
                    backgroundColor: stockColors,
                    borderColor: stockColors.map(c => c.replace('0.85', '1')),
                    borderWidth: 1.5,
                    barThickness: 16
                },
                {
                    label: 'Point de Réappro.',
                    data: reorders,
                    backgroundColor: 'rgba(99, 102, 241, 0.15)', // Light Indigo
                    borderColor: 'rgba(99, 102, 241, 0.85)',
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                    barThickness: 16
                },
                {
                    label: 'Stock de Sécurité',
                    data: safeties,
                    backgroundColor: 'rgba(226, 232, 240, 0.5)', // Gray
                    borderColor: 'rgba(148, 163, 184, 0.85)',
                    borderWidth: 1.5,
                    barThickness: 16
                }
            ]
        };

        if (stockLevelsChartInstance) {
            stockLevelsChartInstance.data = chartData;
            stockLevelsChartInstance.update();
        } else {
            stockLevelsChartInstance = new Chart(stockCtx.getContext('2d'), {
                type: 'bar',
                data: chartData,
                options: {
                    indexAxis: 'y', // Makes the chart horizontal
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                boxWidth: 12,
                                font: { family: 'Inter', size: 11 }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'Quantité', font: { family: 'Inter', size: 11 } },
                            ticks: { font: { family: 'Inter', size: 10 } },
                            grid: { color: '#f1f5f9' }
                        },
                        y: {
                            grid: { display: false },
                            ticks: { font: { family: 'Inter', size: 10 } }
                        }
                    }
                }
            });
        }
    }
}

// تشغيل جلب الإحصائيات عند تحميل واجهة الداشبورد
document.addEventListener('DOMContentLoaded', () => {
    updateDashboardStats();
    updateBIData();
    
    // Auto-sync refresh interval (every 30 seconds for dynamic synchronization)
    setInterval(() => {
        updateDashboardStats();
        updateBIData();
    }, 30000);
});

// ===== 3. نظام وميكانيكية الـ Chatbot =====
const chatbotToggle = document.getElementById('chatbotToggle');
const chatbotContainer = document.querySelector('.chatbot-container');
const chatbotClose = document.getElementById('chatbotClose');
const chatbotInput = document.getElementById('chatbotInput');
const chatbotSend = document.getElementById('chatbotSend');
const chatbotMessages = document.getElementById('chatbotMessages');

// فتح وإغلاق نافذة المحادثة
if (chatbotToggle && chatbotContainer) {
    chatbotToggle.addEventListener('click', () => {
        chatbotContainer.classList.add('active');
        chatbotToggle.classList.add('active');
        if (chatbotInput) chatbotInput.focus();
    });
}

if (chatbotClose && chatbotContainer) {
    chatbotClose.addEventListener('click', () => {
        chatbotContainer.classList.remove('active');
        chatbotToggle.classList.remove('active');
    });
}

// قاموس الردود المحلية السريعة (Fallback)
const chatbotResponses = {
    'مرحبا': 'مرحبا! كيف يمكنني مساعدتك في إدارة المخزون؟',
    'hello': 'Hello! How can I help you with inventory management?',
    'المنتجات': 'يمكنك إدارة المنتجات من قسم المنتجات. اضغط على الرابط في القائمة الجانبية.',
    'products': 'You can manage products from the Products section. Click on the link in the sidebar.',
    'العملاء': 'يمكنك إضافة وإدارة العملاء من قسم العملاء في القائمة الجانبية.',
    'clients': 'You can add and manage clients from the Clients section in the sidebar.',
    'الفواتير': 'تحقق من قسم الفواتير لعرض وإنشاء فواتير جديدة.',
    'invoices': 'Check the Invoices section to view and create new invoices.',
    'المبيعات': 'انتقل إلى قسم المبيعات لتسجيل وتتبع المبيعات.',
    'sales': 'Go to the Sales section to record and track sales.',
    'المشتريات': 'استخدم قسم المشتريات للتعامل مع طلبات الشراء.',
    'purchases': 'Use the Purchases section to handle purchase orders.',
    'الموردين': 'إدارة الموردين من قسم الموردين في القائمة الجانبية.',
    'suppliers': 'Manage suppliers from the Suppliers section in the sidebar.',
    'ساعدني': 'بالتأكيد! يمكنك استخدام الخيارات التالية: المنتجات، العملاء، المبيعات، المشتريات، الفواتير، والموردين.',
    'help': 'Sure! You can use the following options: Products, Clients, Sales, Purchases, Invoices, and Suppliers.',
    'ما اسمك': 'أنا مساعدك الذكي لإدارة المخزون. اسمي مساعد 🤖',
    'what is your name': 'I am your intelligent assistant for inventory management. My name is Assistant 🤖',
};

// فحص الردود الجاهزة
function getChatbotResponse(userMessage) {
    const message = userMessage.toLowerCase().trim();
    for (let key in chatbotResponses) {
        if (message.includes(key)) {
            return chatbotResponses[key];
        }
    }
    const defaultResponses = [
        'معذرة، لم أفهم سؤالك. يمكنك أن تسأل عن: المنتجات، العملاء، المبيعات، المشتريات، الفواتير، أو الموردين.',
        'لا أفهم هذا السؤال. حاول مرة أخرى باستخدام كلمات أخرى.',
        'يمكنك أن تسأل عن ميزات البرنامج أو كيفية استخدام الأقسام المختلفة.',
    ];
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// إرسال الرسالة إلى الـ Backend الخاص بـ Gemini AI
async function sendMessage() {
    const userMessage = chatbotInput.value.trim();
    if (!userMessage) return;
    
    // 1. عرض رسالة المستخدم في الواجهة
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message user-message';
    userMessageDiv.innerHTML = `<p>${escapeHtml(userMessage)}</p>`;
    chatbotMessages.appendChild(userMessageDiv);
    chatbotInput.value = '';
    
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    
    // 2. إظهار مؤشر الانتظار والتفكير
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'message bot-message thinking';
    thinkingDiv.innerHTML = `<p>جاري التفكير... 🤖</p>`;
    chatbotMessages.appendChild(thinkingDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    
    try {
        // 3. إرسال الطلب إلى سيرفر الذكاء الاصطناعي
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage })
        });

        const data = await response.json();
        
        if (thinkingDiv && thinkingDiv.parentNode) {
            chatbotMessages.removeChild(thinkingDiv);
        }

        // 4. عرض رد البوت المستلم
        const botMessageDiv = document.createElement('div');
        botMessageDiv.className = 'message bot-message';
        
        if (data.success) {
            botMessageDiv.innerHTML = `<p>${data.message}</p>`;
        } else {
            botMessageDiv.innerHTML = `<p style="color: #ef4444;">⚠️ خطأ: ${data.message}</p>`;
        }
        
        chatbotMessages.appendChild(botMessageDiv);
    } catch (error) {
        if (thinkingDiv && thinkingDiv.parentNode) {
            chatbotMessages.removeChild(thinkingDiv);
        }
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message bot-message';
        errorDiv.innerHTML = `<p style="color: #ef4444;">❌ فشل الاتصال: تأكد من تشغيل سيرفر البوت (node chat_bot.js)</p>`;
        chatbotMessages.appendChild(errorDiv);
        console.error("Chatbot Error:", error);
    }
    
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

// حماية البيانات المدخلة (Escape HTML)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// أحداث الإرسال بالنقر أو زر Enter
if (chatbotSend) {
    chatbotSend.addEventListener('click', sendMessage);
}

if (chatbotInput) {
    chatbotInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}