// 1. تعريف العناصر الأساسية
const modal = document.getElementById('clientModal');
const editModal = document.getElementById('editClientModal');
const openModalBtn = document.getElementById('openClientModal');
const closeModalBtn = document.querySelector('.close-btn');
const closeEditBtn = document.querySelector('.close-edit-btn');
const clientForm = document.getElementById('addClientForm');
const editClientForm = document.getElementById('editClientForm');

// --- التحكم في النوافذ (Modal Control) ---
openModalBtn.onclick = () => { modal.style.display = "block"; };
closeModalBtn.onclick = () => { modal.style.display = "none"; };
if (closeEditBtn) { closeEditBtn.onclick = () => { editModal.style.display = "none"; }; }

window.onclick = (event) => {
    if (event.target == modal) modal.style.display = "none";
    if (event.target == editModal) editModal.style.display = "none";
};

// --- التعامل مع السيرفر (Backend) ---

// دالة جلب العملاء
async function fetchClients() {
    try {
        const response = await fetch('http://localhost:3000/api/clients');
        const data = await response.json();
        renderClients(data);
    } catch (error) {
        console.error("Erreur fetching clients:", error);
    }
}

// دالة عرض العملاء (الممزوجة)
function renderClients(clients) {
    const grid = document.getElementById('clientGrid');
    grid.innerHTML = clients.map(c => {
        // حساب التاريخ إذا كان موجود
        const dateAdded = c.created_at ? new Date(c.created_at).toLocaleString('fr-FR', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        }) : 'تاريخ غير معروف';

        return `
        <div class="client-card">
            <div class="card-header">
                <div class="user-info">
                    <div class="user-avatar">👤</div>
                    <div>
                        <strong>${c.nom}</strong>
                        <p style="font-size:12px; color:#94a3b8">ID: #${c.id}</p>
                        <p style="font-size:11px; color:#64748b">📅 Added on: ${dateAdded}</p>
                    </div>
                </div>
                <div class="actions">
                    <button onclick="openEditModal(${c.id}, '${c.nom}', '${c.contact}', ${c.total_solde}, '${c.rc || ''}', '${c.nif || ''}', '${c.ai || ''}', '${c.nis || ''}')" class="btn-edit">✏️</button>
                    <button onclick="deleteClient(${c.id})" class="btn-delete">🗑️</button>
                </div>
            </div>
            <div class="contact-details">
                <p>📞 ${c.contact || 'Non spécifié'}</p>
            </div>
            <div class="business-info" style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e2e8f0; font-size: 11px; color: #475569;">
                <span><strong>RC:</strong> ${c.rc || '---'}</span>
                <span><strong>NIF:</strong> ${c.nif || '---'}</span>
                <span><strong>AI:</strong> ${c.ai || '---'}</span>
                <span><strong>NIS:</strong> ${c.nis || '---'}</span>
            </div>
            <div class="card-footer">
                <div class="stat-box">
                    <span>Solde à payer</span>
                    <strong style="color: ${c.total_solde > 0 ? '#ef4444' : '#10b981'}">${c.total_solde} DA</strong>
                </div>
            </div>
            <button class="view-history">Voir détails</button>
        </div>`;
    }).join('');
}

// إضافة عميل جديد
clientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newClient = {
        nom: document.getElementById('clientNom').value,
        contact: document.getElementById('clientContact').value,
        rc: document.getElementById('clientRC').value,
        nif: document.getElementById('clientNIF').value,
        ai: document.getElementById('clientAI').value,
        nis: document.getElementById('clientNIS').value,
        total_solde: parseFloat(document.getElementById('clientSolde').value) || 0,
    };

    try {
        const response = await fetch('http://localhost:3000/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newClient)
        });
        if (response.ok) {
            alert("Client ajouté avec succès !");
            modal.style.display = "none";
            clientForm.reset();
            fetchClients();
        }
    } catch (error) {
        console.error("Erreur lors de l'ajout:", error);
    }
});

// وظيفة حذف زبون
window.deleteClient = async function(id) {
    if (confirm("هل أنت متأكد من حذف هذا الزبون؟")) {
        try {
            await fetch(`http://localhost:3000/api/clients/${id}`, { method: 'DELETE' });
            fetchClients();
        } catch (error) { console.error("خطأ في الحذف:", error); }
    }
};

// وظيفة فتح نافذة التعديل
window.openEditModal = function(id, nom, contact, solde, rc = '', nif = '', ai = '', nis = '') {
    document.getElementById('editClientId').value = id;
    document.getElementById('editClientNom').value = nom;
    document.getElementById('editClientContact').value = contact;
    document.getElementById('editClientRC').value = rc;
    document.getElementById('editClientNIF').value = nif;
    document.getElementById('editClientAI').value = ai;
    document.getElementById('editClientNIS').value = nis;
    document.getElementById('editClientSolde').value = solde;
    editModal.style.display = "block";
};

// تحديث البيانات (Submit Update)
editClientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editClientId').value;
    const updatedData = {
        nom: document.getElementById('editClientNom').value,
        contact: document.getElementById('editClientContact').value,
        total_solde: parseFloat(document.getElementById('editClientSolde').value),
        rc: document.getElementById('editClientRC').value,
        nif: document.getElementById('editClientNIF').value,
        ai: document.getElementById('editClientAI').value,
        nis: document.getElementById('editClientNIS').value
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
    } catch (error) { console.error("خطأ في التحديث:", error); }
});

// تشغيل الجلب عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', fetchClients);