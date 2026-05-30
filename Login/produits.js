document.addEventListener('DOMContentLoaded', function() {
    
    // 1. جلب العناصر من الصفحة
    const modal = document.getElementById('productModal');
    const btnOpen = document.getElementById('openModal');
    const btnClose = document.getElementById('closeModal');
    const form = document.getElementById('productForm');
    const tableBody = document.getElementById('productsTableBody');
    const modalTitle = document.querySelector('.modal-content h2');
    const categorySelect = document.getElementById('pCategory'); // عنصر القائمة المنسدلة
    const supplierSelect = document.getElementById('pSupplier'); // عنصر القائمة المنسدلة للموردين
    
    const fileInput = document.getElementById('pImgInput');
    const imgPreview = document.getElementById('imgPreview');

    // متغيرات لإدارة وضع التعديل والصور
    let editMode = false;
    let currentProductId = null;
    let photoBase64 = null;
    let currentPhotoPath = null;

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

    // --- دالة جديدة لجلب الموردين ديناميكياً من السيرفر ---
    async function loadSuppliers() {
        try {
            const response = await fetch('http://localhost:3000/api/suppliers');
            const suppliers = await response.json();
            
            if (supplierSelect) {
                supplierSelect.innerHTML = '<option value="">Sélectionner Fournisseur</option>';
                suppliers.forEach(sup => {
                    const option = document.createElement('option');
                    option.value = sup.id;
                    option.textContent = sup.nom;
                    supplierSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Erreur lors du chargement des fournisseurs:", error);
        }
    }

    // استماع لمدخل الملفات وتحويل الصورة إلى Base64
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(evt) {
                photoBase64 = evt.target.result;
                if (imgPreview) {
                    imgPreview.src = photoBase64;
                    imgPreview.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // 2. إدارة فتح وإغلاق النافذة (Modal)
    btnOpen.onclick = () => {
        resetModalToAddMode();
        modal.style.display = "flex";
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
        photoBase64 = null;
        currentPhotoPath = null;
        modalTitle.innerText = "Nouveau Produit";
        if (fileInput) fileInput.value = "";
        if (imgPreview) {
            imgPreview.src = "";
            imgPreview.style.display = "none";
        }
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
                
                // تحديد رابط الصورة (افتراضي أو المرفوعة)
                const photoUrl = product.photo 
                    ? `http://localhost:3000/${product.photo}` 
                    : 'https://placehold.co/40x40?text=📦';

                tableBody.innerHTML += `
                    <tr>
                        <td style="display: flex; align-items: center; gap: 12px; border-bottom: none;">
                            <img src="${photoUrl}" style="width: 42px; height: 42px; border-radius: 8px; object-fit: cover; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                            <div>
                                <strong>${product.nom_produit}</strong><br>
                                <small style="color: #94a3b8">${product.referencee}</small>
                            </div>
                        </td>
                        <td>${product.category_name || "Général"}</td>
                        <td>${product.stock_actuel}</td>
                        <td>${product.prix_achat} DA</td>
                        <td>${product.prix_vente} DA</td>
                        <td>${product.fournisseur_name || "N/A"}</td> 
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
        const selectedSupplier = supplierSelect ? supplierSelect.value : "";
        
        const productData = {
            referencee: document.getElementById('pRef').value,
            nom_produit: document.getElementById('pName').value,
            prix_achat: parseFloat(document.getElementById('pBuyPrice').value),
            prix_vente: parseFloat(document.getElementById('pSellPrice').value),
            stock_actuel: parseInt(document.getElementById('pStock').value),
            quantite_min: parseInt(document.getElementById('pMinStock').value) || 5,
            id_categorie: selectedCategory === "" ? null : parseInt(selectedCategory),
            id_fournisseur: selectedSupplier === "" ? null : parseInt(selectedSupplier),
            photoBase64: photoBase64,
            photo: currentPhotoPath
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
            document.getElementById('pName').value = product.nom_produit;
            document.getElementById('pBuyPrice').value = product.prix_achat;
            document.getElementById('pSellPrice').value = product.prix_vente;
            document.getElementById('pStock').value = product.stock_actuel;
            document.getElementById('pMinStock').value = product.quantite_min;
            
            // اختيار الفئة الصحيحة في القائمة المنسدلة
            categorySelect.value = product.id_categorie || "";
            if (supplierSelect) supplierSelect.value = product.id_fournisseur || "";

            // عرض الصورة الحالية إن وجدت
            currentPhotoPath = product.photo;
            if (imgPreview && product.photo) {
                imgPreview.src = `http://localhost:3000/${product.photo}`;
                imgPreview.style.display = 'block';
            } else if (imgPreview) {
                imgPreview.src = "";
                imgPreview.style.display = 'none';
            }

            editMode = true;
            currentProductId = id;
            modalTitle.innerText = "Modifier le Produit";
            modal.style.display = "flex";
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
    loadSuppliers(); // جلب الموردين
    fetchAndDisplayProducts(); // عرض المنتجات
});
p