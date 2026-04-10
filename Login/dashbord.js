async function updateDashboardStats() {
    try {
        const response = await fetch('http://localhost:3000/api/stats/clients-trend');
        const data = await response.json();

        if (data.success) {
            // تحديث الرقم الكبير
            const countEl = document.getElementById('totalClientsCount');
            if (countEl) countEl.innerText = data.total;

            // تحديث النسبة المئوية
            const trendEl = document.getElementById('clientTrend');
            if (trendEl) {
                const val = parseFloat(data.trend);
                trendEl.innerText = val > 0 ? `+${val}%` : `0%`;
                
                // تغيير الألوان حسب القيمة
                trendEl.style.color = val > 0 ? "#10b981" : "#64748b";
                trendEl.style.backgroundColor = val > 0 ? "#dcfce7" : "#f1f5f9";
            }
        }
    } catch (error) {
        console.error("Connection Error:", error);
    }
}

document.addEventListener('DOMContentLoaded', updateDashboardStats);