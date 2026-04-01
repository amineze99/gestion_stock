// بيانات وهمية للبدء (مثل التي في الصورة)
let clients = JSON.parse(localStorage.getItem('myClients')) || [
   { name: "Jean Dupont", email: "jean.dupont@email.com", phone: "+33 6 12 34 56 78", total: "2.450 DA", lastDate: "05/03/2026" },
   { name: "Marie Martin", email: "marie.martin@email.com", phone: "+33 6 23 45 67 89", total: "5.890 DA", lastDate: "06/03/2026" }
];

function displayClients() {
    const grid = document.getElementById('clientGrid');
    grid.innerHTML = "";

    clients.forEach((client, index) => {
        grid.innerHTML += `
            <div class="client-card">
                <div class="card-header">
                    <div class="user-info">
                        <div class="user-avatar">👤</div>
                        <div>
                            <strong>${client.name}</strong>
                            <p style="font-size:12px; color:#94a3b8">Client #${index + 1}</p>
                        </div>
                    </div>
                    <div class="actions">📝 🗑️</div>
                </div>
                <div class="contact-details">
                    <p>📞 ${client.phone}</p>
                    <p>📧 ${client.email}</p>
                </div>
                <div class="card-footer">
                    <div class="stat-box">
                        <span>Total achats</span>
                        <strong>${client.total}</strong>
                    </div>
                    <div class="stat-box" style="text-align:right">
                        <span>Dernier achat</span>
                        <strong>${client.lastDate}</strong>
                    </div>
                </div>
                <button class="view-history">Voir l'historique</button>
            </div>
        `;
    });
}

displayClients();
