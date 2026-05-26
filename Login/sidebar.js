class AppSidebar extends HTMLElement {
    connectedCallback() {
        this.style.display = 'contents';
        const currentPage = window.location.pathname.split('/').pop() || 'dashbord.html';
        this.innerHTML = `
        <link rel="stylesheet" href="sidebar.css">
        <nav class="sidebar">
            <div class="sidebar-logo">
                <img src="photos/logo-2.png" alt="Logo">
            </div>

            <ul class="nav-links">
                <li class="${currentPage === 'dashbord.html' ? 'active' : ''}">
                    <a href="dashbord.html">
                        <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        Dashboard
                    </a>
                </li>
                <li class="${currentPage === 'produits.html' ? 'active' : ''}">
                    <a href="produits.html">
                        <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                        Produits
                    </a>
                </li>
                <li class="${currentPage === 'clients.html' ? 'active' : ''}">
                    <a href="clients.html">
                        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        Clients
                    </a>
                </li>
                <li class="${currentPage === 'fournisseur.html' ? 'active' : ''}">
                    <a href="fournisseur.html">
                        <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        Fournisseurs
                    </a>
                </li>
                <li class="${currentPage === 'achats.html' ? 'active' : ''}">
                    <a href="achats.html">
                        <svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                        Achats
                    </a>
                </li>
                <li class="${currentPage === 'ventes.html' ? 'active' : ''}">
                    <a href="ventes.html">
                        <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                        Ventes
                    </a>
                </li>
                <li class="${currentPage === 'caisse.html' ? 'active' : ''}">
                    <a href="caisse.html">
                        <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="12" y1="12" x2="12" y2="12"></line><line x1="16" y1="8" x2="8" y2="8"></line><line x1="16" y1="16" x2="8" y2="16"></line></svg>
                        Caisse
                    </a>
                </li>
                <li class="${currentPage === 'parameters.html' ? 'active' : ''}">
                    <a href="parameters.html">
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        Paramètres
                    </a>
                </li>
            </ul>

            <div class="sidebar-footer">
                
                <a href="login.html" class="logout-btn">
                <svg  xmlns="http://www.w3.org/2000/svg" width="24" height="24"  fill="currentColor" viewBox="0 0 24 24" ><path d="M15 11H8v2h7v4l6-5-6-5z"></path><path d="M5 21h7v-2H5V5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2"></path>
</svg>

                     Déconnexion
                </a>
            </div>
        </nav>
        `;

        // Apply saved theme and font globally (applies night mode across pages)
        try {
            const savedTheme = localStorage.getItem('bricaillerie_theme');
            if (savedTheme === 'dark') {
                document.body.classList.add('dark-theme');
            } else {
                document.body.classList.remove('dark-theme');
            }

            const savedFont = localStorage.getItem('bricaillerie_font');
            if (savedFont) {
                document.documentElement.style.setProperty('--app-font', savedFont);
            }
        } catch (err) {
            // ignore in environments without localStorage
            console.warn('Could not apply theme/font:', err);
        }
    }
}

customElements.define('app-sidebar', AppSidebar);
