async function updateDashboardStats() {
    try {
        const response = await fetch('http://localhost:3000/api/stats/clients-trend');
        const data = await response.json();

        if (data.success) {
            // تحديث الرقم الكبير
            const countEl = document.getElementById('totalClientsCount');
            if (countEl) countEl.innerText = data.total;

            // تحديث النسبة المئوية
            const trendEl = document.getElementById('clientTrend');
            if (trendEl) {
                const val = parseFloat(data.trend);
                trendEl.innerText = val > 0 ? `+${val}%` : `0%`;
                
                // تغيير الألوان حسب القيمة
                trendEl.style.color = val > 0 ? "#10b981" : "#64748b";
                trendEl.style.backgroundColor = val > 0 ? "#dcfce7" : "#f1f5f9";
            }
        }
    } catch (error) {
        console.error("Connection Error:", error);
    }
}

document.addEventListener('DOMContentLoaded', updateDashboardStats);

// ===== Chatbot Functionality =====
const chatbotToggle = document.getElementById('chatbotToggle');
const chatbotContainer = document.querySelector('.chatbot-container');
const chatbotClose = document.getElementById('chatbotClose');
const chatbotInput = document.getElementById('chatbotInput');
const chatbotSend = document.getElementById('chatbotSend');
const chatbotMessages = document.getElementById('chatbotMessages');

// Toggle Chatbot Visibility
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

// Chatbot Responses (Local fallback)
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

// Function to get AI-like response
function getChatbotResponse(userMessage) {
    const message = userMessage.toLowerCase().trim();
    
    // Check for exact matches first
    for (let key in chatbotResponses) {
        if (message.includes(key)) {
            return chatbotResponses[key];
        }
    }
    
    // Default response for unrecognized messages
    const defaultResponses = [
        'معذرة، لم أفهم سؤالك. يمكنك أن تسأل عن: المنتجات، العملاء، المبيعات، المشتريات، الفواتير، أو الموردين.',
        'لا أفهم هذا السؤال. حاول مرة أخرى باستخدام كلمات أخرى.',
        'يمكنك أن تسأل عن ميزات البرنامج أو كيفية استخدام الأقسام المختلفة.',
    ];
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// Send Message
async function sendMessage() {
    const userMessage = chatbotInput.value.trim();
    
    if (!userMessage) return;
    
    // Add user message to chat
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message user-message';
    userMessageDiv.innerHTML = `<p>${escapeHtml(userMessage)}</p>`;
    chatbotMessages.appendChild(userMessageDiv);
    chatbotInput.value = '';
    
    // Scroll to bottom
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    
    // Simulate bot thinking
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get and display bot response
    const botResponse = getChatbotResponse(userMessage);
    const botMessageDiv = document.createElement('div');
    botMessageDiv.className = 'message bot-message';
    botMessageDiv.innerHTML = `<p>${escapeHtml(botResponse)}</p>`;
    chatbotMessages.appendChild(botMessageDiv);
    
    // Scroll to bottom
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Send message on button click
if (chatbotSend) {
    chatbotSend.addEventListener('click', sendMessage);
}

// Send message on Enter key
if (chatbotInput) {
    chatbotInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}
