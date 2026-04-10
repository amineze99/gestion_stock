// دالة لجلب العملاء من السيرفر
async function fetchClients() {
    try {
        const response = await fetch('http://localhost:3000/api/clients');
        const clients = await response.json();
        renderClients(clients);
    } catch (error) {
        console.error("خطأ في جلب العملاء:", error);
    }
}

// دالة عرض العملاء في الصفحة
function renderClients(clients) {
    const grid = document.getElementById('clientGrid');
    grid.innerHTML = "";

    clients.forEach((client) => {
        grid.innerHTML += `
            <div class="client-card">
                <div class="card-header">
                    <div class="user-info">
                        <div class="user-avatar">👤</div>
                        <div>
                            <strong>${client.nom}</strong>
                            <p style="font-size:12px; color:#94a3b8">ID: #${client.id}</p>
                        </div>
                    </div>
                    <div class="actions">📝 🗑️</div>
                </div>
                <div class="contact-details">
                    <p>📞 ${client.contact || 'Non spécifié'}</p>
                </div>
                <div class="card-footer">
                    <div class="stat-box">
                        <span>Solde à payer</span>
                        <strong style="color: ${client.total_solde > 0 ? '#ef4444' : '#10b981'}">
                            ${client.total_solde} DA
                        </strong>
                    </div>
                </div>
                <button class="view-history">Voir détails</button>
            </div>
        `;
    });
}

// تشغيل الجلب عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', fetchClients);



// 1. تعريف العناصر الأساسية من الـ HTML
const modal = document.getElementById('clientModal');
const openModalBtn = document.getElementById('openClientModal');
const closeModalBtn = document.querySelector('.close-btn');
const clientForm = document.getElementById('addClientForm');

// --- الجزء الخاص بالتحكم في النافذة (Modal) ---

// فتح النافذة عند الضغط على زر "Ajouter un client"
openModalBtn.onclick = () => {
    modal.style.display = "block";
};

// إغلاق النافذة عند الضغط على (X)
closeModalBtn.onclick = () => {
    modal.style.display = "none";
};

// إغلاق النافذة إذا ضغط المستخدم في أي مكان خارج الصندوق الأبيض
window.onclick = (event) => {
    if (event.target == modal) {
        modal.style.display = "none";
    }
};

// --- الجزء الخاص بالتعامل مع السيرفر (Backend) ---

// دالة لجلب العملاء وعرضهم (تشتغل عند تحميل الصفحة)
async function fetchClients() {
    try {
        const response = await fetch('http://localhost:3000/api/clients');
        const data = await response.json();
        renderClients(data);
    } catch (error) {
        console.error("Erreur fetching clients:", error);
    }
}

// دالة بناء الكروت (Cards) داخل الصفحة
function renderClients(clients) {
    const grid = document.getElementById('clientGrid');
    grid.innerHTML = clients.map(c => `
        <div class="client-card">
            <div class="card-header">
                <div class="user-info">
                    <div class="user-avatar">👤</div>
                    <div>
                        <strong>${c.nom}</strong>
                        <p style="font-size:12px; color:#94a3b8">ID: #${c.id}</p>
                    </div>
                </div>
            </div>
            <div class="contact-details">
                <p>📞 ${c.contact || 'Non spécifié'}</p>
            </div>
            <div class="card-footer">
                <div class="stat-box">
                    <span>Solde à payer</span>
                    <strong style="color: ${c.total_solde > 0 ? '#ef4444' : '#10b981'}">
                        ${c.total_solde} DA
                    </strong>
                </div>
            </div>
        </div>
    `).join('');
}

// معالجة إرسال الفورم (Submit Form)
clientForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // منع الصفحة من التحديث

    // جلب القيم من الـ Modal
    const newClient = {
        nom: document.getElementById('clientNom').value,
        contact: document.getElementById('clientContact').value,
        total_solde: parseFloat(document.getElementById('clientSolde').value) || 0
    };

    try {
        const response = await fetch('http://localhost:3000/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newClient)
        });

        if (response.ok) {
            alert("Client ajouté avec succès !");
            modal.style.display = "none"; // إغلاق النافذة
            clientForm.reset(); // تفريغ الخانات
            fetchClients(); // تحديث القائمة في الصفحة فوراً
        } else {
            alert("خطأ في إضافة العميل");
        }
    } catch (error) {
        console.error("Erreur lors de l'ajout:", error);
        alert("تعذر الاتصال بالسيرفر");
    }
});

// تشغيل جلب البيانات بمجرد تحميل الصفحة
document.addEventListener('DOMContentLoaded', fetchClients);




// --- وظائف التعديل والحذف (يجب ربطها بـ window لتعمل من الـ HTML) ---

window.deleteClient = async function(id) {
    if (confirm("هل أنت متأكد من حذف هذا الزبون؟")) {
        try {
            const response = await fetch(`http://localhost:3000/api/clients/${id}`, { 
                method: 'DELETE' 
            });
            if (response.ok) {
                fetchClients(); // تحديث القائمة بعد الحذف
            }
        } catch (error) {
            console.error("خطأ في الحذف:", error);
        }
    }
};

window.openEditModal = function(id, nom, contact, solde) {
    const editModal = document.getElementById('editClientModal');
    document.getElementById('editClientId').value = id;
    document.getElementById('editClientNom').value = nom;
    document.getElementById('editClientContact').value = contact;
    document.getElementById('editClientSolde').value = solde;
    editModal.style.display = "block";
};

// --- إغلاق النافذة ---
const editModal = document.getElementById('editClientModal');
const closeEditBtn = document.querySelector('.close-edit-btn');

if (closeEditBtn) {
    closeEditBtn.onclick = () => editModal.style.display = "none";
}

// --- تحديث البيانات (Submit) ---
document.getElementById('editClientForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editClientId').value;
    const updatedData = {
        nom: document.getElementById('editClientNom').value,
        contact: document.getElementById('editClientContact').value,
        total_solde: parseFloat(document.getElementById('editClientSolde').value)
    };

    try {
        const response = await fetch(`http://localhost:3000/api/clients/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        if (response.ok) {
            alert("تم تحديث البيانات بنجاح!");
            editModal.style.display = "none";
            fetchClients();
        }
    } catch (error) {
        console.error("خطأ في التحديث:", error);
    }
});

// دالة عرض الزبائن (تأكد من وجودها كما هي)
function renderClients(clients) {
    const grid = document.getElementById('clientGrid');
    grid.innerHTML = clients.map(c => `
        <div class="client-card">
            <div class="card-header">
                <div class="user-info">
                    <div class="user-avatar">👤</div>
                    <div>
                        <strong>${c.nom}</strong>
                        <p style="font-size:12px; color:#94a3b8">ID: #${c.id}</p>
                    </div>
                </div>
                <div class="actions">
                    <button onclick="openEditModal(${c.id}, '${c.nom}', '${c.contact}', ${c.total_solde})" class="btn-edit">✏️</button>
                    <button onclick="deleteClient(${c.id})" class="btn-delete">🗑️</button>
                </div>
            </div>
            <div class="contact-details">
                <p>📞 ${c.contact || 'Non spécifié'}</p>
            </div>
            <div class="card-footer">
                <div class="stat-box">
                    <span>Solde à payer</span>
                    <strong style="color: ${c.total_solde > 0 ? '#ef4444' : '#10b981'}">${c.total_solde} DA</strong>
                </div>
            </div>
        </div>
    `).join('');
}

