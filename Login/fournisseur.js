document.addEventListener('DOMContentLoaded', () => {
    // جلب البيانات فور التحميل
    fetchSuppliers();

    const modal = document.getElementById('supplierModal');
    const btn = document.getElementById('openSupplierModal');
    const span = document.querySelector('.close-btn');
    const form = document.getElementById('addSupplierForm');

    // فتح وإغلاق النافذة (مع التأكد من وجود العناصر)
    if (btn) {
        btn.onclick = () => modal.style.display = "block";
    }
    if (span) {
        span.onclick = () => modal.style.display = "none";
    }
    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = "none";
    }

    // إرسال البيانات
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const supplierData = {
                nom: document.getElementById('suppNom').value,
                contact: document.getElementById('suppContact').value,
                tel: document.getElementById('suppTel').value,
                email: document.getElementById('suppEmail').value,
                rc: document.getElementById('suppRC').value,
                nif: document.getElementById('suppNIF').value,
                ai: document.getElementById('suppAI').value,
                nis: document.getElementById('suppNIS').value,
                total_solde: parseFloat(document.getElementById('suppTotal').value) || 0
            };

            try {
                const response = await fetch('http://localhost:3000/api/suppliers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(supplierData)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    alert("Fournisseur ajouté avec succès !");
                    modal.style.display = "none";
                    form.reset();
                    fetchSuppliers(); 
                } else {
                    alert("Erreur lors de l'ajout");
                }
            } catch (error) {
                console.error("Erreur de اتصال بالسيرفر:", error);
                alert("Impossible de contacter le serveur");
            }
        });
    }
});

async function fetchSuppliers() {
    try {
        const response = await fetch('http://localhost:3000/api/suppliers');
        if (!response.ok) throw new Error('Network response was not ok');
        const suppliers = await response.json();
        renderSuppliers(suppliers);
    } catch (error) {
        console.error("Erreur fetch:", error);
    }
}

// سنقوم بتخزين البيانات عالمياً ليسهل الوصول إليها عند التعديل
let allSuppliers = []; 

function renderSuppliers(suppliers) {
    allSuppliers = suppliers; // حفظ النسخة الحالية
    const tbody = document.getElementById('supplierTableBody');
    if (!tbody) return;

    tbody.innerHTML = suppliers.map(s => {
        const dateAdded = s.created_at ? new Date(s.created_at).toLocaleString('fr-FR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'تاريخ غير معروف';
        return `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="supp-icon" style="background:#f5f3ff; color:#7c3aed; padding:8px; border-radius:8px;">💜</div> 
                    <div>
                        <strong style="display:block;">${s.nom}</strong>
                        <small style="color:#64748b">RC: ${s.rc || '--'} | NIF: ${s.nif || '--'} | AI: ${s.ai || '--'} | NIS: ${s.nis || '--'}</small>
                        <p style="font-size:11px; color:#64748b">📅 Added on: ${dateAdded}</p>
                    </div>
                </div>
            </td>
            <td>${s.contact || '---'}</td>
            <td>📞 ${s.tel || '---'}</td>
            <td>✉️ ${s.email || '---'}</td>
            <td><span class="badge" style="background:#f1f5f9; padding:4px 8px; border-radius:12px;">0</span></td> 
            <td><strong style="color:#2563eb">${s.total_solde} DA</strong></td>
            <td class="action-btns">
                <button onclick="openEditModal(${s.id})" style="color: #3b82f6; background:none; border:none; cursor:pointer; font-size:18px;">📝</button>
                <button onclick="deleteSupp(${s.id})" style="color: #ef4444; background:none; border:none; cursor:pointer; font-size:18px;">🗑️</button>
            </td>
        </tr>
        `;
    }).join('');

    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        paginationInfo.textContent = `Affichage de ${suppliers.length} fournisseur(s) sur ${suppliers.length} total`;
    }
}
// جعل الدالة عامة ليراها المتصفح عند الضغط على الزر
window.deleteSupp = async function(id) {
    if (confirm("Voulez-vous vraiment supprimer ce fournisseur ?")) {
        try {
            const response = await fetch(`http://localhost:3000/api/suppliers/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // تحديث الجدول فوراً بعد الحذف
                fetchSuppliers(); 
            } else {
                alert("Erreur lors de la suppression");
            }
        } catch (error) {
            console.error("Erreur:", error);
            alert("Impossible de contacter le serveur");
        }
    }
};

// دالة لفتح النافذة وملئها بالبيانات
// 1. فتح النافذة وملء البيانات
window.openEditModal = function(id) {
    const supplier = allSuppliers.find(s => s.id == id);
    if (!supplier) return;

    document.getElementById('editSuppId').value = supplier.id;
    document.getElementById('editSuppNom').value = supplier.nom;
    document.getElementById('editSuppContact').value = supplier.contact || '';
    document.getElementById('editSuppTel').value = supplier.tel || '';
    document.getElementById('editSuppEmail').value = supplier.email || '';
    document.getElementById('editSuppRC').value = supplier.rc || '';
    document.getElementById('editSuppNIF').value = supplier.nif || '';
    document.getElementById('editSuppAI').value = supplier.ai || '';
    document.getElementById('editSuppNIS').value = supplier.nis || '';
    document.getElementById('editSuppTotal').value = supplier.total_solde || 0;
    
    document.getElementById('editSupplierModal').style.display = "block";
};

// 2. إغلاق النافذة
window.closeEditModal = function() {
    document.getElementById('editSupplierModal').style.display = "none";
};

// Handle close edit btn (X)
document.addEventListener('DOMContentLoaded', () => {
    const closeEditBtn = document.querySelector('.close-edit-btn');
    if (closeEditBtn) {
        closeEditBtn.addEventListener('click', closeEditModal);
    }
});

// 3. معالجة إرسال الفورم (Submit)
document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('editSupplierForm');
    if (editForm) {
        editForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('editSuppId').value;
            
            const updatedData = {
                nom: document.getElementById('editSuppNom').value,
                contact: document.getElementById('editSuppContact').value,
                tel: document.getElementById('editSuppTel').value,
                email: document.getElementById('editSuppEmail').value,
                rc: document.getElementById('editSuppRC').value,
                nif: document.getElementById('editSuppNIF').value,
                ai: document.getElementById('editSuppAI').value,
                nis: document.getElementById('editSuppNIS').value,
                total_solde: parseFloat(document.getElementById('editSuppTotal').value) || 0
            };

            try {
                const response = await fetch(`http://localhost:3000/api/suppliers/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData)
                });

                const result = await response.json();
                if (result.success) {
                    alert("Modifié avec succès !");
                    closeEditModal();
                    fetchSuppliers(); // تحديث الجدول فوراً
                }
            } catch (error) {
                console.error("Erreur:", error);
                alert("Erreur lors de la mise à jour");
            }
        };
    }
});