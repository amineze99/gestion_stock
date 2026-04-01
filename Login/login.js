document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 

    // تأكد أن هذه الـ IDs (email و password) مطابقة تماماً لما هو موجود في ملف HTML
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (!emailInput || !passwordInput) {
        console.error("خطأ: لم يتم العثور على حقول الإدخال في الـ HTML. تأكد من وجود id='email' و id='password'");
        return;
    }

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            // تخزين البيانات للترحيب والحماية
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('userName', data.message);

            alert("مرحباً بك: " + data.message);
            
            // الانتقال للداشبورد
            window.location.href = 'dashbord.html'; 
        } else {
            // عرض رسالة "المستخدم غير متوفر..." المرسلة من السيرفر
            alert(data.message);
        }
    } catch (error) {
        console.error("خطأ في الاتصال بالسيرفر:", error);
        alert("السيرفر غير متصل، تأكد من تشغيل Node.js");
    }
});