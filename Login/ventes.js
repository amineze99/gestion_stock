let loadRecentVentes;
let cart = []; // مصفوفة السلة

document.addEventListener('DOMContentLoaded', () => {
    const saleItemsBody = document.getElementById('saleItemsBody');
    const selectProduct = document.getElementById('selectProduct');
    const selectClient = document.getElementById('selectClient');
    const grandTotalElement = document.getElementById('grandTotal');
    const saleForm = document.getElementById('saleForm');
    const recentSalesTable = document.getElementById('recentSalesTable');

    // 1. جلب المبيعات الأخيرة وتحديث الجدول
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
                            <button class="btn-print-sm" onclick="printInvoice(${v.id})" title="Imprimer">🖨️</button>
                            <button class="btn-remove" onclick="deleteVente(${v.id})" title="Supprimer">🗑️</button>
                        </td>
                    </tr>`;
            });
        } catch (error) { console.error("Erreur:", error); }
    };

    // 2. جلب العملاء
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

    // 3. جلب المنتجات
    async function loadProducts() {
        try {
            const response = await fetch('http://localhost:3000/api/produits');
            const products = await response.json();
            selectProduct.innerHTML = '<option value="">Sélectionner un produit...</option>';
            products.forEach(p => {
                selectProduct.innerHTML += `<option value="${p.id}" data-price="${p.prix_vente}">${p.nom_produit}</option>`;
            });
        } catch (error) { console.error(error); }
    }

    // 4. إضافة منتج للسلة
    selectProduct.addEventListener('change', (e) => {
        const option = e.target.options[e.target.selectedIndex];
        if (!option.value) return;
        cart.push({ id: parseInt(option.value), name: option.text, price: parseFloat(option.dataset.price) || 0, qty: 1 });
        renderCart();
        selectProduct.value = ""; 
    });

    // 5. تحديث عرض السلة
    window.renderCart = function() {
        saleItemsBody.innerHTML = "";
        let grandTotal = 0;
        cart.forEach((item, index) => {
            const total = item.price * item.qty;
            grandTotal += total;
            saleItemsBody.innerHTML += `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.price.toFixed(2)} DA</td>
                    <td><input type="number" value="${item.qty}" min="1" onchange="updateQty(${index}, this.value)" class="qty-input"></td>
                    <td>${total.toFixed(2)} DA</td>
                    <td><button type="button" class="btn-remove" onclick="removeItem(${index})">✕</button></td>
                </tr>`;
        });
        grandTotalElement.innerText = `${grandTotal.toFixed(2)} DA`;
    };

    window.updateQty = (index, val) => { cart[index].qty = parseInt(val) || 1; renderCart(); };
    window.removeItem = (index) => { cart.splice(index, 1); renderCart(); };

    // 6. إرسال المبيعة للسيرفر
    saleForm.onsubmit = async (e) => {
        e.preventDefault();
        if (cart.length === 0) { alert("الرجاء إضافة منتجات أولاً"); return; }

        const data = {
            client_id: parseInt(selectClient.value),
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
                const resData = await response.json();
                alert("Vente validée !");
                
                // الطباعة التلقائية بعد النجاح
                if (confirm("Voulez-vous imprimer la facture ?")) {
                    printInvoice(resData.id);
                }

                cart = []; renderCart(); saleForm.reset();
                setupAutoFields(); // إعادة تعيين التاريخ والرقم العشوائي
                loadRecentVentes();
            } else {
                const errorData = await response.json();
                alert("Erreur: " + errorData.message);
            }
        } catch (error) { alert("خطأ في الاتصال بالسيرفر"); }
    };

    // إعداد الحقول التلقائية (تاريخ اليوم ورقم الفاتورة)
    function setupAutoFields() {
        const dateInput = document.getElementById('saleDate');
        if(dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        
        const factInput = document.getElementById('factureNumber');
        if(factInput) factInput.value = "FAC-" + Math.floor(Math.random() * 10000);
    }

    // تشغيل الدوال الأساسية
    loadClients(); loadProducts(); loadRecentVentes(); setupAutoFields();
});

// --- الدوال العالمية (خارج DOMContentLoaded) ---

// دالة الحذف
window.deleteVente = async (id) => {
    if(confirm("Voulez-vous supprimer cette vente ?")) {
        try {
            const response = await fetch(`http://localhost:3000/api/ventes/${id}`, { method: 'DELETE' });
            if (response.ok) {
                loadRecentVentes(); 
            } else {
                alert("Erreur lors de la suppression");
            }
        } catch (error) { alert("خطأ في الاتصال بالسيرفر"); }
    }
};

// دالة الطباعة الاحترافية
window.printInvoice = async (id) => {
    try {
        const response = await fetch(`http://localhost:3000/api/operation-details/${id}`);
        const data = await response.json();
        const { operation, items } = data;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Facture Vente #${operation.id}</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; direction: ltr; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .total { text-align: right; margin-top: 20px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>FACTURE DE VENTE</h1>
                    <img src="photos/logo.png" alt="Logo" style="max-width: 150px; margin-top: 10px;">
                    <p>N°: ${operation.id} | Date: ${new Date(operation.date_op).toLocaleString()}</p>
                </div>
                <p><strong>Client:</strong> ${operation.client_nom || 'Comptant'}</p>
                <table>
                    <thead>
                        <tr><th>Désignation</th><th>Prix</th><th>Qté</th><th>Total</th></tr>
                    </thead>
                    <tbody>
                        ${items.map(i => `<tr>
                            <td>${i.nom_produit}</td>
                            <td>${i.prix_unitaire} DA</td>
                            <td>${i.quantite}</td>
                            <td>${(i.prix_unitaire * i.quantite).toFixed(2)} DA</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
                <div class="total"><h3>Total: ${operation.montant_total} DA</h3></div>
                <script>window.onload = function() { window.print(); window.close(); };</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    } catch (error) { console.error("Erreur impression:", error); }
};