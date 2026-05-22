document.addEventListener('DOMContentLoaded', () => {
    // Top stats
    const statEncaissements = document.getElementById('stat-encaissements');
    const statDecaissements = document.getElementById('stat-decaissements');

    // Left form
    const entityTypeSelector = document.getElementById('entityTypeSelector');
    const entitySelector = document.getElementById('entitySelector');
    const currentSolde = document.getElementById('currentSolde');
    const paymentType = document.getElementById('paymentType');
    const chequeDetails = document.getElementById('chequeDetails');
    const paymentAmount = document.getElementById('paymentAmount');
    const numCheque = document.getElementById('numCheque');
    const paymentDate = document.getElementById('paymentDate');
    const transactionForm = document.getElementById('transactionForm');

    // Right table
    const transactionsTableBody = document.getElementById('transactionsTableBody');

    let currentEntities = [];

    // 1. Initial Setup
    paymentDate.value = new Date().toISOString().split('T')[0];
    loadEntities(entityTypeSelector.value);
    loadTransactions();

    // 2. Event Listeners
    entityTypeSelector.addEventListener('change', (e) => {
        loadEntities(e.target.value);
    });

    entitySelector.addEventListener('change', (e) => {
        const selectedId = parseInt(e.target.value);
        const entity = currentEntities.find(ent => ent.id === selectedId);
        if (entity) {
            currentSolde.value = (entity.total_solde || 0) + ' DA';
        } else {
            currentSolde.value = '0 DA';
        }
    });

    paymentType.addEventListener('change', (e) => {
        if (e.target.value === 'Chèque' || e.target.value === 'Virement') {
            chequeDetails.style.display = 'block';
        } else {
            chequeDetails.style.display = 'none';
        }
    });

    // 3. Load Entities (Clients or Fournisseurs)
    async function loadEntities(type) {
        let endpoint = (type === "fournisseur") ? 
            "http://localhost:3000/api/suppliers" : 
            "http://localhost:3000/api/clients";

        try {
            const response = await fetch(endpoint);
            currentEntities = await response.json();
            
            entitySelector.innerHTML = '<option value="">Sélectionnez une entité...</option>';
            currentEntities.forEach(item => {
                entitySelector.innerHTML += `<option value="${item.id}">${item.nom}</option>`;
            });
            currentSolde.value = '0 DA'; // Reset solde
        } catch (error) {
            console.error("Erreur de chargement des entités:", error);
            entitySelector.innerHTML = '<option value="">Erreur de chargement</option>';
        }
    }

    // 4. Load Transactions History & Stats
    async function loadTransactions() {
        try {
            const response = await fetch('http://localhost:3000/api/transactions');
            const data = await response.json();

            let totalEncaissements = 0;
            let totalDecaissements = 0;

            transactionsTableBody.innerHTML = "";
            
            data.forEach(t => {
                // Calculate Stats
                if (t.type_entite === 'client') {
                    totalEncaissements += parseFloat(t.montant) || 0;
                } else if (t.type_entite === 'fournisseur') {
                    totalDecaissements += parseFloat(t.montant) || 0;
                }

                // Render Row
                const dateObj = new Date(t.date_transaction);
                const dateStr = dateObj.toLocaleDateString('fr-FR');
                
                const typeBadge = t.type_entite === 'client' 
                    ? '<span class="badge" style="background:#dcfce7; color:#166534; padding:4px 8px; border-radius:12px; font-size:12px;">Entrée (Client)</span>'
                    : '<span class="badge" style="background:#fee2e2; color:#991b1b; padding:4px 8px; border-radius:12px; font-size:12px;">Sortie (Fourn.)</span>';

                const amountColor = t.type_entite === 'client' ? '#10b981' : '#ef4444';
                const amountPrefix = t.type_entite === 'client' ? '+' : '-';

                transactionsTableBody.innerHTML += `
                    <tr>
                        <td>${dateStr}</td>
                        <td>${typeBadge}</td>
                        <td><strong>${t.entite_nom || 'Inconnu'}</strong></td>
                        <td>${t.type_paiement}</td>
                        <td>${t.num_cheque || '--'}</td>
                        <td><strong style="color: ${amountColor};">${amountPrefix}${t.montant} DA</strong></td>
                    </tr>
                `;
            });

            // Update Top Stats Cards
            if(statEncaissements) statEncaissements.innerText = totalEncaissements.toFixed(2) + ' DA';
            if(statDecaissements) statDecaissements.innerText = totalDecaissements.toFixed(2) + ' DA';

            if (data.length === 0) {
                transactionsTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#64748b;">Aucune transaction trouvée</td></tr>`;
            }

        } catch (error) {
            console.error("Erreur de chargement des transactions:", error);
            transactionsTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Erreur de connexion</td></tr>`;
        }
    }

    // 5. Submit Transaction
    transactionForm.onsubmit = async (e) => {
        e.preventDefault();

        if (!entitySelector.value) {
            alert("Veuillez sélectionner une entité.");
            return;
        }

        if (!paymentAmount.value || parseFloat(paymentAmount.value) <= 0) {
            alert("Veuillez entrer un montant valide.");
            return;
        }

        const payload = {
            type_entite: entityTypeSelector.value,
            entite_id: parseInt(entitySelector.value),
            type_paiement: paymentType.value,
            montant: parseFloat(paymentAmount.value),
            num_cheque: numCheque.value || null,
            date_transaction: paymentDate.value
        };

        try {
            const response = await fetch('http://localhost:3000/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                alert("✅ Règlement enregistré avec succès!");
                
                // Reset form partially
                paymentAmount.value = '';
                numCheque.value = '';
                
                // Reload data to reflect new balances and history
                loadEntities(entityTypeSelector.value); // Will also reset currentSolde
                loadTransactions();
            } else {
                alert("❌ Erreur serveur: " + (result.error || result.message || "Erreur inconnue"));
            }
        } catch (error) {
            console.error("Network Error:", error);
            alert("❌ Impossible de contacter le serveur.");
        }
    };
});