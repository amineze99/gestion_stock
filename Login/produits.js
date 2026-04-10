document.addEventListener('DOMContentLoaded', function() {
    
    // 1. جلب العناصر من الصفحة
    const modal = document.getElementById('productModal');
    const btnOpen = document.getElementById('openModal');
    const btnClose = document.getElementById('closeModal');
    const form = document.getElementById('productForm');
    const tableBody = document.getElementById('productsTableBody');
    const modalTitle = document.querySelector('.modal-content h2');
    const categorySelect = document.getElementById('pCategory'); // عنصر القائمة المنسدلة

    // متغيرات لإدارة وضع التعديل
    let editMode = false;
    let currentProductId = null;

    // --- دالة جديدة لجلب الفئات ديناميكياً من السيرفر ---
    async function loadCategories() {
        try {
            const response = await fetch('http://localhost:3000/api/categories');
            const categories = await response.json();
            
            // تنظيف القائمة وترك الخيار الأول فقط
            categorySelect.innerHTML = '<option value="">Sélectionner Catégorie</option>';
            
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id; // المعرف الحقيقي من قاعدة البيانات
                option.textContent = cat.libelle;
                categorySelect.appendChild(option);
            });
        } catch (error) {
            console.error("Erreur lors du chargement des catégories:", error);
        }
    }

    // 2. إدارة فتح وإغلاق النافذة (Modal)
    btnOpen.onclick = () => {
        resetModalToAddMode();
        modal.style.display = "block";
    };
    btnClose.onclick = () => {
        modal.style.display = "none";
        resetModalToAddMode();
    };
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
            resetModalToAddMode();
        }
    }

    function resetModalToAddMode() {
        editMode = false;
        currentProductId = null;
        modalTitle.innerText = "Nouveau Produit";
        form.reset();
    }

    // 3. جلب وعرض المنتجات
    async function fetchAndDisplayProducts() {
        try {
            const response = await fetch('http://localhost:3000/api/produits');
            const products = await response.json();

            tableBody.innerHTML = ""; 

            products.forEach((product) => {
                const isLow = product.stock_actuel <= product.quantite_min;
                const statusClass = isLow ? 'status-low-stock' : 'status-in-stock';
                const statusText = isLow ? 'Stock Faible' : 'En Stock';

                tableBody.innerHTML += `
                    <tr>
                        <td>
                            <strong>${product.designation}</strong><br>
                            <small style="color: #94a3b8">${product.referencee}</small>
                        </td>
                        <td>${product.category_name || "Général"}</td>
                        <td>${product.stock_actuel}</td>
                        <td>${product.prix_achat} DA</td>
                        <td>${product.prix_vente} DA</td>
                        <td>N/A</td> 
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                        <td>
                            <button class="btn-action btn-edit" onclick="editProduct(${product.id})">📝</button>
                            <button class="btn-action btn-delete" onclick="deleteProduct(${product.id})">🗑️</button>
                        </td>
                    </tr>
                `;
            });
        } catch (error) {
            console.error("Erreur lors du chargement des produits:", error);
        }
    }

    // 4. إرسال منتج جديد أو تحديث
    form.onsubmit = async function(e) {
        e.preventDefault();
        
        // التأكد من جلب القيمة المختارة بدقة
        const selectedCategory = categorySelect.value;
        
        const productData = {
            referencee: document.getElementById('pRef').value,
            designation: document.getElementById('pName').value,
            prix_achat: parseFloat(document.getElementById('pBuyPrice').value),
            prix_vente: parseFloat(document.getElementById('pSellPrice').value),
            stock_actuel: parseInt(document.getElementById('pStock').value),
            quantite_min: parseInt(document.getElementById('pMinStock').value) || 5,
            // نرسل القيمة كـ null إذا كانت فارغة لتجنب خطأ Foreign Key
            id_categorie: selectedCategory === "" ? null : parseInt(selectedCategory)
        };

        const url = editMode 
            ? `http://localhost:3000/api/produits/${currentProductId}` 
            : 'http://localhost:3000/api/produits';
        
        const method = editMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });

            if (response.ok) {
                modal.style.display = "none";
                resetModalToAddMode();
                fetchAndDisplayProducts();
                alert(editMode ? "Produit modifié !" : "Produit enregistré !");
            } else {
                const errorData = await response.json();
                alert("Erreur : " + errorData.message);
            }
        } catch (error) {
            console.error("Erreur Fetch :", error);
        }
    };

    // 5. وظيفة التعديل
    window.editProduct = async function(id) {
        try {
            const response = await fetch(`http://localhost:3000/api/produits/${id}`);
            const product = await response.json();

            document.getElementById('pRef').value = product.referencee;
            document.getElementById('pName').value = product.designation;
            document.getElementById('pBuyPrice').value = product.prix_achat;
            document.getElementById('pSellPrice').value = product.prix_vente;
            document.getElementById('pStock').value = product.stock_actuel;
            document.getElementById('pMinStock').value = product.quantite_min;
            
            
            // اختيار الفئة الصحيحة في القائمة المنسدلة
            categorySelect.value = product.id_categorie || "";

            editMode = true;
            currentProductId = id;
            modalTitle.innerText = "Modifier le Produit";
            modal.style.display = "block";
        } catch (error) {
            console.error("Erreur:", error);
        }
    };

    // 6. وظيفة الحذف
    window.deleteProduct = async function(id) {
        if (confirm("Voulez-vous vraiment supprimer ce produit ?")) {
            try {
                const response = await fetch(`http://localhost:3000/api/produits/${id}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    fetchAndDisplayProducts();
                }
            } catch (error) {
                console.error("Erreur:", error);
            }
        }
    };

    // --- التشغيل عند تحميل الصفحة ---
    loadCategories(); // جلب الفئات أولاً
    fetchAndDisplayProducts(); // عرض المنتجات
});
