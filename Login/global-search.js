document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.search-bar input');
    if (!searchInput) return;

    // Create results dropdown
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'search-results-dropdown';
    searchInput.parentElement.style.position = 'relative';
    searchInput.parentElement.appendChild(resultsContainer);

    let debounceTimer;

    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = searchInput.value.trim();

        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            resultsContainer.classList.remove('active');
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const response = await fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(query)}`);
                const data = await response.json();
                renderResults(data);
            } catch (error) {
                console.error("Search fetch error:", error);
            }
        }, 300);
    });

    function renderResults(results) {
        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="search-no-result">Aucun résultat trouvé</div>';
        } else {
            resultsContainer.innerHTML = results.map(item => {
                const icon = item.type === 'produit' ? '📦' : (item.type === 'client' ? '👤' : '🏢');
                const page = item.type === 'produit' ? 'produits.html' : (item.type === 'client' ? 'clients.html' : 'fournisseur.html');
                return `
                    <div class="search-item" onclick="window.location.href='${page}?highlight=${item.id}'">
                        <span class="search-icon">${icon}</span>
                        <div class="search-info">
                            <span class="search-name">${item.name}</span>
                            <span class="search-detail">${item.detail || ''}</span>
                        </div>
                        <span class="search-type">${item.type}</span>
                    </div>
                `;
            }).join('');
        }
        resultsContainer.classList.add('active');
    }

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.classList.remove('active');
        }
    });
});