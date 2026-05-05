let loadRecentVentes;

document.addEventListener('DOMContentLoaded', () => {
    const saleItemsBody = document.getElementById('saleItemsBody');
    const selectProduct = document.getElementById('selectProduct');
    const selectClient = document.getElementById('selectClient');
    const grandTotalElement = document.getElementById('grandTotal');
    const saleForm = document.getElementById('saleForm');
    const recentSalesTable = document.getElementById('recentSalesTable');
    
    let cart = [];

    /// جلب المبيعات الأخيرة وتحديث الجدول
loadRecentVentes = async function() {
    try {
        const response = await fetch('http://localhost:3000/api/recent-ventes');
        const ventes = await response.json();
        if (!recentSalesTable) return;
        
        recentSalesTable.innerHTML = "";
        ventes.forEach(v => {
            const dateStr = new Date(v.date_op).toLocaleDateString('fr-FR');
            recentSalesTable.innerHTML += `
                <tr>
                    <td>${dateStr}</td>
                    <td>${v.client}</td>
                    <td>${v.montant_total} DA</td>
                    <td><span class="status-badge status-in-stock">Payé</span></td>
                    <td>
                        <button class="btn-print-sm" onclick="printExistingSale(${v.id})" title="Imprimer">🖨️</button>
                        <button class="btn-remove" onclick="deleteVente(${v.id})" title="Supprimer">🗑️</button>
                    </td>
                </tr>`;
        });
    } catch (error) { console.error("Erreur:", error); }
};

// دالة الحذف (تأكد أنها خارج DOMContentLoaded لتكون Global)
window.deleteVente = async (id) => {
    if(confirm("Voulez-vous supprimer cette vente ?")) {
        try {
            const response = await fetch(`http://localhost:3000/api/ventes/${id}`, { 
                method: 'DELETE' 
            });
            if (response.ok) {
                loadRecentVentes(); // تحديث الجدول فوراً
            } else {
                alert("Erreur lors de la suppression");
            }
        } catch (error) { alert("خطأ في الاتصال بالسيرفر"); }
    }
};

// دالة لطباعة مبيعة قديمة (اختياري: يمكنك برمجتها لجلب البيانات وطباعتها)
window.printExistingSale = (id) => {
    alert("تحتاج هذه الخاصية إلى جلب بيانات الفاتورة رقم " + id + " لطباعتها");
    // هنا يمكنك توجيه المستخدم لصفحة factures.html أو فتح نافذة طباعة
};
    // جلب العملاء
    async function loadClients() {
        try {
            const response = await fetch('http://localhost:3000/api/clients'); 
            const clients = await response.json();
            selectClient.innerHTML = '<option value="">Sélectionner un client</option>';
            clients.forEach(c => {
                selectClient.innerHTML += `<option value="${c.id}">${c.nom}</option>`;
            });
        } catch (error) { console.error(error); }
    }

    // جلب المنتجات (نستخدم سعر البيع هنا)
    async function loadProducts() {
        try {
            const response = await fetch('http://localhost:3000/api/produits');
            const products = await response.json();
            selectProduct.innerHTML = '<option value="">Sélectionner un produit...</option>';
            products.forEach(p => {
                // نستخدم p.prix_vente بدلاً من p.prix_achat
                selectProduct.innerHTML += `<option value="${p.id}" data-price="${p.prix_vente}">${p.designation}</option>`;
            });
        } catch (error) { console.error(error); }
    }

    selectProduct.addEventListener('change', (e) => {
        const option = e.target.options[e.target.selectedIndex];
        if (!option.value) return;
        cart.push({ id: parseInt(option.value), name: option.text, price: parseFloat(option.dataset.price) || 0, qty: 1 });
        renderCart();
        selectProduct.value = ""; 
    });

    function renderCart() {
        saleItemsBody.innerHTML = "";
        let grandTotal = 0;
        cart.forEach((item, index) => {
            const total = item.price * item.qty;
            grandTotal += total;
            saleItemsBody.innerHTML += `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.price.toFixed(2)} DA</td>
                    <td><input type="number" value="${item.qty}" min="1" onchange="updateQty(${index}, this.value)"></td>
                    <td>${total.toFixed(2)} DA</td>
                    <td><button type="button" class="btn-remove" onclick="removeItem(${index})">✕</button></td>
                </tr>`;
        });
        grandTotalElement.innerText = `${grandTotal.toFixed(2)} DA`;
    }

    window.updateQty = (index, val) => { cart[index].qty = parseInt(val) || 1; renderCart(); };
    window.removeItem = (index) => { cart.splice(index, 1); renderCart(); };

    saleForm.onsubmit = async (e) => {
    e.preventDefault();

    // تأكد أن cart ليست فارغة
    if (cart.length === 0) {
        alert("الرجاء إضافة منتجات أولاً");
        return;
    }

    const data = {
        client_id: parseInt(document.getElementById('selectClient').value),
        // تأكد من جلب قيمة التاريخ ورقم الفاتورة
        date_op: document.getElementById('saleDate').value,
        num_facture: document.getElementById('factureNumber').value,
        montant_total: cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
        items: cart.map(item => ({ id: item.id, qty: item.qty, price: item.price }))
    };

    try {
        const response = await fetch('http://localhost:3000/api/ventes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert("Vente validée !");
            cart = []; 
            renderCart(); 
            saleForm.reset();
            if(typeof loadRecentVentes === 'function') loadRecentVentes();
        } else {
            const errorData = await response.json();
            alert("Erreur: " + errorData.message);
        }
    } catch (error) {
        console.error("Erreur serveur:", error);
        alert("تعذر الاتصال بالسيرفر، تأكد من تشغيل Node.js");
    }
};


    loadClients(); loadProducts(); loadRecentVentes();
});

// دالة حذف عملية بيع من الجدول السفلي


document.addEventListener('DOMContentLoaded', () => {
    // ... الكود السابق ...

    // تعيين تاريخ اليوم تلقائياً
    const dateInput = document.getElementById('saleDate');
    if(dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // توليد رقم فاتورة عشوائي مؤقت (FAC-XXXX)
    const factInput = document.getElementById('factureNumber');
    if(factInput) {
        factInput.value = "FAC-" + Math.floor(Math.random() * 10000);
    }
});



window.deleteVente = async (id) => {
    if (confirm("Voulez-vous Supprimer cette vente ?")) {
        try {
            const response = await fetch(`http://localhost:3000/api/ventes/${id}`, { 
                method: 'DELETE' 
            });
            
            if (response.ok) {
                loadRecentVentes(); // تحديث الجدول بعد الحذف
            } else {
                alert("Erreur lors de la suppression");
            }
        } catch (error) {
            console.error("Erreur:", error);
        }
    }
};

// دالة حذف سطر من الجدول أثناء التعبئة (الزر الأحمر X)
window.removeItem = (index) => {
    cart.splice(index, 1);
    renderCart();
};
window.printExistingSale = () => {
    window.print();
};