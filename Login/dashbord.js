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
chatbotToggle.addEventListener('click', () => {
    chatbotContainer.classList.add('active');
    chatbotToggle.classList.add('active');
    chatbotInput.focus();
});

chatbotClose.addEventListener('click', () => {
    chatbotContainer.classList.remove('active');
    chatbotToggle.classList.remove('active');
});

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
    'الفournisseurs': 'إدارة الموردين من قسم الموردين في القائمة الجانبية.',
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

// Send Message avec intégration Backend Gemini
async function sendMessage() {
    const userMessage = chatbotInput.value.trim();
    
    if (!userMessage) return;
    
    // Désactiver le bouton d'envoi pendant le traitement
    chatbotSend.disabled = true;
    chatbotInput.disabled = true;
    
    // Ajouter le message utilisateur au chat
    const userMessageEl = document.createElement('div');
    userMessageEl.className = 'message user-message';
    userMessageEl.innerHTML = `<p>${escapeHtml(userMessage)}</p>`;
    chatbotMessages.appendChild(userMessageEl);
    
    // Effacer l'input
    chatbotInput.value = '';
    
    // Scroll vers le bas
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    
    try {
        // Afficher un indicateur de "chargement"
        const loadingEl = document.createElement('div');
        loadingEl.className = 'message bot-message';
        loadingEl.innerHTML = `<p style="color: #999;">⏳ Traitement en cours...</p>`;
        chatbotMessages.appendChild(loadingEl);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        
        // Envoyer la requête au backend
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: userMessage }),
        });
        
        const data = await response.json();
        
        // Supprimer l'indicateur de chargement
        loadingEl.remove();
        
        if (data.success) {
            // Afficher la réponse du bot
            const botMessageEl = document.createElement('div');
            botMessageEl.className = 'message bot-message';
            botMessageEl.innerHTML = `<p>${escapeHtml(data.message)}</p>`;
            chatbotMessages.appendChild(botMessageEl);
        } else {
            // Erreur du serveur
            const errorEl = document.createElement('div');
            errorEl.className = 'message bot-message';
            errorEl.innerHTML = `<p style="color: #ef4444;">❌ ${escapeHtml(data.message)}</p>`;
            chatbotMessages.appendChild(errorEl);
        }
        
        // Scroll vers le bas
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        
    } catch (error) {
        console.error('Erreur:', error);
        
        // Supprimer l'indicateur de chargement
        const loadingEl = chatbotMessages.querySelector('.bot-message:last-child');
        if (loadingEl && loadingEl.innerHTML.includes('Traitement')) {
            loadingEl.remove();
        }
        
        // Afficher un message d'erreur
        const errorEl = document.createElement('div');
        errorEl.className = 'message bot-message';
        errorEl.innerHTML = `<p style="color: #ef4444;">❌ Erreur de connexion. Vérifiez que le serveur est démarré sur le port 3000.</p>`;
        chatbotMessages.appendChild(errorEl);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    } finally {
        // Réactiver le bouton et l'input
        chatbotSend.disabled = false;
        chatbotInput.disabled = false;
        chatbotInput.focus();
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Send button click
chatbotSend.addEventListener('click', sendMessage);

// Enter key to send
chatbotInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});