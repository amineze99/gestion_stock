// نضع هذه المتغيرة في الأعلى لضمان الوصول إليها من أي مكان في الملف
let loadRecentAchats;

document.addEventListener('DOMContentLoaded', () => {
    const purchaseItemsBody = document.getElementById('purchaseItemsBody');
    const selectProduct = document.getElementById('selectProduct');
    const selectFournisseur = document.getElementById('selectFournisseur');
    const grandTotalElement = document.getElementById('grandTotal');
    const purchaseForm = document.getElementById('purchaseForm');
    const recentPurchasesTable = document.getElementById('recentPurchasesTable');
    
    let cart = [];

    // تعريف الدالة وتخزينها في المتغيرة العالمية
    loadRecentAchats = async function() {
        try {
            console.log("Tentative de chargement des achats...");
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
                            <button class="btn-remove" onclick="deleteAchat(${achat.id})">🗑️</button>
                        </td>
                    </tr>
                `;
            });
        } catch (error) {
            console.error("Erreur chargement achats:", error);
        }
    };

    // جلب الموردين والمنتجات (الأكواد القديمة صحيحة)
    async function loadSuppliers() {
        try {
            const response = await fetch('http://localhost:3000/api/fournisseurs'); 
            const suppliers = await response.json();
            selectFournisseur.innerHTML = '<option value="">Sélectionner un fournisseur</option>';
            suppliers.forEach(sup => {
                selectFournisseur.innerHTML += `<option value="${sup.id}">${sup.nom}</option>`;
            });
        } catch (error) { console.error("Erreur suppliers:", error); }
    }

    async function loadProducts() {
        try {
            const response = await fetch('http://localhost:3000/api/produits');
            const products = await response.json();
            selectProduct.innerHTML = '<option value="">Sélectionner un produit...</option>';
            products.forEach(prod => {
                selectProduct.innerHTML += `<option value="${prod.id}" data-price="${prod.prix_achat}">${prod.designation}</option>`;
            });
        } catch (error) { console.error("Erreur produits:", error); }
    }

    // إدارة السلة (إضافة/تحديث/حذف)
    selectProduct.addEventListener('change', (e) => {
        const option = e.target.options[e.target.selectedIndex];
        if (!option.value) return;
        cart.push({ id: parseInt(option.value), name: option.text, price: parseFloat(option.dataset.price) || 0, qty: 1 });
        renderCart();
        selectProduct.value = ""; 
    });

    function renderCart() {
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
    }

    window.updateQty = (index, val) => { cart[index].qty = parseInt(val) || 1; renderCart(); };
    window.removeItem = (index) => { cart.splice(index, 1); renderCart(); };

    // إرسال النموذج
    purchaseForm.onsubmit = async (e) => {
        e.preventDefault();
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
                alert("Achat enregistré !");
                cart = []; renderCart(); purchaseForm.reset();
                loadRecentAchats(); // تحديث الجدول
            }
        } catch (error) { alert("Erreur serveur"); }
    };

    // التشغيل الأولي
    loadSuppliers();
    loadProducts();
    loadRecentAchats();
});

// دالة الحذف (عالمية تماماً)
window.deleteAchat = async (id) => {
    if(confirm("Voulez-vous vraiment supprimer cet achat ?")) {
        try {
            const response = await fetch(`http://localhost:3000/api/achats/${id}`, { method: 'DELETE' });
            if(response.ok) {
                alert("Achat supprimé !");
                // استدعاء الدالة العالمية لتحديث الجدول
                if (typeof loadRecentAchats === 'function') loadRecentAchats();
            }
        } catch (error) { alert("Erreur lors de la suppression"); }
    }
};