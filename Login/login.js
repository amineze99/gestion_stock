document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 

    // تأكد أن هذه الـ IDs (email و password) مطابقة تماماً لما هو موجود في ملف HTML
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (!emailInput || !passwordInput) {
        console.error("Data not found please enter data !! id='email' و id='password'");
        return;
    }

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        const response = await fetch('https://gestion-stock-qpds.onrender.com/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            // تخزين البيانات للترحيب والحماية
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('userName', data.message);

            alert("Welcome " + data.message);
            
            // الانتقال للداشبورد
            window.location.href = 'dashbord.html'; 
        } else {
            // عرض رسالة "المستخدم غير متوفر..." المرسلة من السيرفر
            alert(data.message);
        }
    } catch (error) {
        console.error("Error connecting to server:", error);
        alert("Server is not connected, make sure Node.js is running");
    }
});
