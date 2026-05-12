// تعريف الدالة بطريقة تضمن أن المتصفح يراها من أي مكان
window.openPaymentModal = function(id, nom, solde, type) {
    console.log("فتح النافذة لـ:", nom, "ID:", id); // سطر للتأكد في الـ Console
    
    const modal = document.getElementById('transactionModal');
    if (!modal) {
        console.error("لم يتم العثور على transactionModal في الـ HTML");
        return;
    }

    document.getElementById('selectedEntityId').value = id;
    document.getElementById('selectedEntityType').value = type;
    document.getElementById('entityDisplayName').value = nom;
    document.getElementById('paymentAmount').value = solde;
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    
    modal.style.display = "block";
};

document.addEventListener('DOMContentLoaded', () => {
    const entitySelector = document.getElementById('entitySelector');
    const entityGrid = document.getElementById('entityGrid');
    const paymentType = document.getElementById('paymentType');
    const chequeDetails = document.getElementById('chequeDetails');
    const transactionModal = document.getElementById('transactionModal');
    const closeModal = document.querySelector('.close-btn');
    const transactionForm = document.getElementById('transactionForm');

    // 1. تحديث البيانات عند تغيير "الزبون/المورد"
    if (entitySelector) {
        entitySelector.addEventListener('change', loadEntities);
    }

    async function loadEntities() {
        const type = entitySelector.value; 
        let endpoint = (type === "fournisseur") ? 
            "http://localhost:3000/api/suppliers" : 
            "http://localhost:3000/api/clients";

        try {
            const response = await fetch(endpoint);
            const data = await response.json();
            renderEntities(data, type);
        } catch (error) {
            console.error("خطأ في جلب البيانات:", error);
            entityGrid.innerHTML = `<p style="color:red">Erreur de connexion au serveur</p>`;
        }
    }
});
    // 2. عرض البطاقات (تعديل بسيط في كود الزر)
    function renderEntities(data, type) {
        if (!data || data.length === 0) {
            entityGrid.innerHTML = `<p>Aucun ${type} trouvé.</p>`;
            return;
        }

        entityGrid.innerHTML = data.map(item => {
            const soldeValue = item.total_solde || 0;
            // تأكد من تمرير الاسم بشكل آمن
            const safeNom = item.nom.replace(/'/g, "\\'");
            
            return `
                <div class="stat-card">
                    <div class="stat-info">
                        <p>${type.toUpperCase()} #${item.id}</p>
                        <h2 style="font-size: 18px;">${item.nom}</h2>
                        <div class="solde-info">
                            Solde: <strong style="color: ${soldeValue > 0 ? '#ef4444' : '#10b981'}">
                                ${soldeValue} DA
                            </strong>
                        </div>
                        <button class="btn-warning" style="margin-top:15px; width:100%; font-size:12px;" 
                            onclick="openPaymentModal(${item.id}, '${safeNom}', ${soldeValue}, 'fournisseur')">
                            Régler Solde
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 3. إرسال البيانات
    // 3. إرسال البيانات (المعدل والمحسن)
if (transactionForm) {
    transactionForm.onsubmit = async (e) => {
        e.preventDefault();

        // جلب العناصر للتأكد من وجودها
        const amountEl = document.getElementById('paymentAmount');
        const entityIdEl = document.getElementById('selectedEntityId');
        const entityTypeEl = document.getElementById('selectedEntityType');

        // التحقق من القيم قبل الإرسال لتجنب Database Error
        if (!amountEl.value || parseFloat(amountEl.value) <= 0) {
            alert("الرجاء إدخال مبلغ صحيح");
            return;
        }

        const payload = {
            type_entite: entityTypeEl.value,
            entite_id: parseInt(entityIdEl.value), // تحويل لعدد صحيح
            type_paiement: document.getElementById('paymentType').value,
            montant: parseFloat(amountEl.value),
            num_cheque: document.getElementById('numCheque').value || null,
            date_transaction: document.getElementById('paymentDate').value
        };

        try {
            const response = await fetch('http://localhost:3000/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // قراءة محتوى الاستجابة حتى لو كان هناك خطأ
            const result = await response.json();

            if (response.ok) {
                alert("✅ " + (result.message || "تم التسجيل بنجاح"));
                
                // إخفاء المودال بطريقة آمنة
                transactionModal.style.display = "none";
                transactionForm.reset();
                
                // تحديث البيانات في الصفحة
                if (typeof loadEntities === "function") {
                    loadEntities();
                }
            } else {
                // إذا أرجع السيرفر Database error، ستظهر هنا التفاصيل
                alert("❌ فشل في السيرفر: " + (result.error || "Database Error"));
                console.error("Server Error Details:", result);
            }
        } catch (error) {
            console.error("Network Error:", error);
            alert("❌ تعذر الاتصال بالسيرفر. تأكد أن السيرفر (Node.js) يعمل.");
        }
    };
}