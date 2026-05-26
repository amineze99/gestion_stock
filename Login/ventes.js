let cart = []; // مصفوفة السلة

document.addEventListener('DOMContentLoaded', () => {
    const saleItemsBody = document.getElementById('saleItemsBody');
    const selectProduct = document.getElementById('selectProduct');
    const selectClient = document.getElementById('selectClient');
    const grandTotalElement = document.getElementById('grandTotal');
    const saleForm = document.getElementById('saleForm');
    const salesTableBody = document.getElementById('salesTableBody');

    // 1. جلب المبيعات الأخيرة وتحديث الجدول
    async function loadRecentSales() {
        if (!salesTableBody) return;

        try {
            const response = await fetch('http://localhost:3000/api/recent-ventes');
            const salesData = await response.json();

            salesTableBody.innerHTML = "";

            if (!Array.isArray(salesData) || salesData.length === 0) {
                salesTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#64748b;">Aucune vente récente trouvée</td></tr>`;
                return;
            }

            salesData.forEach(sale => {
                const dateObj = new Date(sale.date_op || sale.date_vente || sale.date_transaction);
                const dateStr = isNaN(dateObj) ? '-' : dateObj.toLocaleDateString('fr-FR');
                const clientName = sale.client || sale.client_nom || sale.entite_nom || 'Client inconnu';
                const totalAmount = parseFloat(sale.montant_total || sale.total || sale.montant || 0).toFixed(2);

                const statusBadge = `<span class="badge" style="background:#e8fdf4; color:#10b981; padding:6px 12px; border-radius:12px; font-size:13px; font-weight:500;">Payé</span>`;

                const actionButtons = `
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-action-print" onclick="printSale(${sale.id})" style="background: #eef2f6; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; color: #475569;">
                            🖨️
                        </button>
                        <button class="btn-action-delete" onclick="deleteSale(${sale.id})" style="background: #ffeeef; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; color: #ef4444;">
                            🗑️
                        </button>
                    </div>
                `;

                salesTableBody.innerHTML += `
                    <tr>
                        <td>${dateStr}</td>
                        <td><strong>${clientName}</strong></td>
                        <td>${totalAmount} DA</td>
                        <td>${statusBadge}</td>
                        <td>${actionButtons}</td>
                    </tr>`;
            });
        } catch (error) {
            console.error("Erreur de chargement des ventes:", error);
            salesTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Erreur de chargement des ventes</td></tr>`;
        }
    }

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
                loadRecentSales();
            } else {
                const errorData = await response.json();
                alert("Erreur: " + errorData.message);
            }
        } catch (error) { alert("Error connecting to server"); }
    };

    // إعداد الحقول التلقائية (تاريخ اليوم ورقم الفاتورة)
    function setupAutoFields() {
        const dateInput = document.getElementById('saleDate');
        if(dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        
        const factInput = document.getElementById('factureNumber');
        if(factInput) factInput.value = "FAC-" + Math.floor(Math.random() * 10000);
    }

    // تشغيل الدوال الأساسية
    loadClients(); loadProducts(); loadRecentSales(); setupAutoFields();
});

// --- الدوال العالمية (خارج DOMContentLoaded) ---

// دالة الحذف
window.deleteVente = async (id) => {
    if(confirm("Voulez-vous supprimer cette vente ?")) {
        try {
            const response = await fetch(`http://localhost:3000/api/ventes/${id}`, { method: 'DELETE' });
            if (response.ok) {
                loadRecentSales(); 
            } else {
                alert("Error deleting sale");
            }
        } catch (error) { alert("Error connecting to server"); }
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
                    <img src="photos/logo-2.png" alt="Logo" style="max-width: 150px; margin-top: 10px; height: 120px;">
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
    } catch (error) { console.error("Error printing invoice:", error); }
};

window.printSale = function(id) {
    printInvoice(id);
};

window.deleteSale = function(id) {
    deleteVente(id);
};