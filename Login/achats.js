// المتغيرات العالمية لضمان الوصول إليها من دوال الحذف والطباعة
let loadRecentAchats;
let cart = [];

document.addEventListener('DOMContentLoaded', () => {
    const purchaseItemsBody = document.getElementById('purchaseItemsBody');
    const selectProduct = document.getElementById('selectProduct');
    const selectFournisseur = document.getElementById('selectFournisseur');
    const grandTotalElement = document.getElementById('grandTotal');
    const purchaseForm = document.getElementById('purchaseForm');
    const recentPurchasesTable = document.getElementById('recentPurchasesTable');

    // دالة تحميل المشتريات الأخيرة
    loadRecentAchats = async function() {
        try {
            const response = await fetch('http://localhost:3000/api/recent-achats');
            const achats = await response.json();
            
            if (!recentPurchasesTable) return;
            recentPurchasesTable.innerHTML = "";

            if (achats.length === 0) {
                recentPurchasesTable.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Aucun achat enregistré</td></tr>";
                return;
            }

            achats.forEach(achat => {
                const dateStr = new Date(achat.date_op).toLocaleDateString('fr-FR');
                recentPurchasesTable.innerHTML += `
                    <tr>
                        <td>${dateStr}</td>
                        <td>${achat.fournisseur}</td>
                        <td>${achat.montant_total} DA</td>
                        <td><span class="status-badge status-in-stock">Reçu</span></td>
                        <td>
                            <button class="btn-print-sm" onclick="printInvoice(${achat.id})">🖨️</button>
                            <button class="btn-remove" onclick="deleteAchat(${achat.id})">🗑️</button>
                        </td>
                    </tr>`;
            });
        } catch (error) { console.error("Erreur chargement achats:", error); }
    };

    // جلب الموردين
    async function loadSuppliers() {
        try {
            const response = await fetch('http://localhost:3000/api/suppliers'); 
            const suppliers = await response.json();
            selectFournisseur.innerHTML = '<option value="">Sélectionner un fournisseur</option>';
            suppliers.forEach(sup => {
                selectFournisseur.innerHTML += `<option value="${sup.id}">${sup.nom}</option>`;
            });
        } catch (error) { console.error("Erreur suppliers:", error); }
    }

    // جلب المنتجات
    async function loadProducts() {
        try {
            const response = await fetch('http://localhost:3000/api/produits');
            const products = await response.json();
            selectProduct.innerHTML = '<option value="">Sélectionner un produit...</option>';
            products.forEach(prod => {
                selectProduct.innerHTML += `<option value="${prod.id}" data-price="${prod.prix_achat}">${prod.nom_produit}</option>`;
            });
        } catch (error) { console.error("Erreur produits:", error); }
    }

    // إضافة منتج للسلة
    selectProduct.addEventListener('change', (e) => {
        const option = e.target.options[e.target.selectedIndex];
        if (!option.value) return;
        cart.push({ id: parseInt(option.value), name: option.text, price: parseFloat(option.dataset.price) || 0, qty: 1 });
        renderCart();
        selectProduct.value = ""; 
    });

    // تحديث شكل السلة
    window.renderCart = function() {
        purchaseItemsBody.innerHTML = "";
        let grandTotal = 0;
        cart.forEach((item, index) => {
            const total = item.price * item.qty;
            grandTotal += total;
            purchaseItemsBody.innerHTML += `
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

    // إرسال النموذج وحفظ الشراء
    purchaseForm.onsubmit = async (e) => {
        e.preventDefault();
        if (cart.length === 0) { alert("Ajoutez des produits d'abord"); return; }
        
        const data = {
            fournisseur_id: parseInt(selectFournisseur.value),
            montant_total: cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
            items: cart.map(item => ({ id: item.id, qty: item.qty, price: item.price }))
        };

        try {
            const response = await fetch('http://localhost:3000/api/achats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (response.ok) {
                const resData = await response.json();
                alert("Achat enregistré !");
                cart = []; renderCart(); purchaseForm.reset();
                loadRecentAchats(); // تحديث الجدول فوراً
                
                if (confirm("Voulez-vous imprimer la facture ?")) {
                    printInvoice(resData.id);
                }
            }
        } catch (error) { console.error("Erreur save achat:", error); }
    };

    // تشغيل الدوال عند التحميل
    loadSuppliers(); loadProducts(); loadRecentAchats();
});

// دالة الحذف - عالمية
window.deleteAchat = async (id) => {
    if(confirm("Voulez-vous vraiment supprimer cet achat ?")) {
        try {
            const response = await fetch(`http://localhost:3000/api/achats/${id}`, { method: 'DELETE' });
            if(response.ok) {
                alert("Achat supprimé !");
                if (typeof loadRecentAchats === 'function') loadRecentAchats();
            }
        } catch (error) { alert("Erreur lors de la suppression"); }
    }
};

// دالة الطباعة - عالمية
window.printInvoice = async (id) => {
    try {
        const response = await fetch(`http://localhost:3000/api/operation-details/${id}`);
        const data = await response.json();
        const { operation, items } = data;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Facture Achat #${operation.id}</title>
                
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
                    <h1>BON D'ACHAT</h1>
                    <img src="photos/logo.png" alt="Logo" style="max-width: 150px; margin-top: 10px;">
                    <p>N°: ${operation.id} | Date: ${new Date(operation.date_op).toLocaleString()}</p>
                </div>
                <p><strong>Fournisseur:</strong> ${operation.fournisseur_nom || 'Inconnu'}</p>
                <table>
                    <thead>
                        <tr>
                            <th>Désignation</th>
                            <th>Prix Unitaire</th>
                            <th>Quantité</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td>${item.nom_produit}</td>
                                <td>${item.prix_unitaire} DA</td>
                                <td>${item.quantite}</td>
                                <td>${(item.prix_unitaire * item.quantite).toFixed(2)} DA</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="total">
                    <h3>Total Général: ${operation.montant_total} DA</h3>
                </div>
                <script>window.onload = function() { window.print(); window.close(); };</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    } catch (error) { console.error("Erreur impression:", error); }
};