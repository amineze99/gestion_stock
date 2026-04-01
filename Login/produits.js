// دالة لضمان أن الكود يعمل بعد تحميل الصفحة بالكامل
window.onload = function() {
    
    // 1. جلب العناصر من الصفحة
    const modal = document.getElementById('productModal');
    const btn = document.getElementById('openModal');
    const span = document.getElementById('closeModal');
    const form = document.getElementById('productForm');

    // تأكد في الكونسول أن العناصر موجودة
    console.log("Button:", btn);
    console.log("Modal:", modal);

    // 2. فتح النافذة عند الضغط على الزر
    if (btn) {
        btn.onclick = function() {
            modal.style.display = "block";
            console.log("Modal Opened");
        }
    }

    // 3. إغلاق النافذة عند الضغط على (x)
    if (span) {
        span.onclick = function() {
            modal.style.display = "none";
        }
    }

    // 4. إغلاق النافذة عند الضغط في أي مكان خارجها
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // 5. معالجة حفظ البيانات
    if (form) {
        form.onsubmit = function(e) {
            e.preventDefault();

            // جمع البيانات
            const newProduct = {
                name: document.getElementById('pName').value,
                stock: document.getElementById('pStock').value,
                buyPrice: document.getElementById('pBuyPrice').value,
                sellPrice: document.getElementById('pSellPrice').value,
                category: "General", // قيمة افتراضية
                supplier: "N/A"      // قيمة افتراضية
            };

            // حفظ في المصفوفة والذاكرة
            let products = JSON.parse(localStorage.getItem('myProducts')) || [];
            products.push(newProduct);
            localStorage.setItem('myProducts', JSON.stringify(products));

            // تحديث الرقم للداشبورد
            localStorage.setItem('totalProductsCount', products.length);

            // إغلاق وتحديث
            modal.style.display = "none";
            form.reset();
            location.reload(); // أسهل طريقة لتحديث الجدول حالياً
        }
    }
}
let products = JSON.parse(localStorage.getItem('myProducts')) || [
    { pName: "Produit A", pStock: 100, pBuyPrice: 500, pSellPrice: 750 },
    { pName: "Produit B", pStock: 50, pBuyPrice: 300, pSellPrice: 450,  category: "Électronique", supplier: "Fournisseur X" },
    { pName: "Produit C", pStock: 200, pBuyPrice: 150, pSellPrice: 250, category: "Alimentation", supplier: "Fournisseur Y" }
]
function displayProducts() {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = "";
    products.forEach((product, index) => {
        grid.innerHTML += `
            <div class="product-table-row">
                <div>${product.pName}
                    <p style="font-size:12px; color:#94a3b8">Produit #${index + 1}</p>
                </div>
                <div>${product.pStock}</div>
                <div>${product.pBuyPrice} DA</div>
                <div>${product.pSellPrice} DA</div>
                <div>${product.category || "N/A"}</div>
                <div>${product.supplier || "N/A"}</div>
                <div class="actions">📝
                    <button class="edit-btn" data-index="${index}">Modifier</button>
                    <button class="delete-btn" data-index="${index}">Supprimer</button>
                </div>
            </div>
        `;
    });
}
displayProducts();
