(function(){
    try {
        // Ensure Google Fonts are available for selections
        const fontsHref = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&family=Poppins:wght@300;400;500;700&display=swap';
        if (!document.querySelector(`link[href="${fontsHref}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = fontsHref;
            document.head.appendChild(link);
        }

        const savedTheme = localStorage.getItem('bricaillerie_theme');
        if (savedTheme === 'dark') document.body.classList.add('dark-theme');
        else document.body.classList.remove('dark-theme');

        const savedFont = localStorage.getItem('bricaillerie_font');
        if (savedFont) {
            document.documentElement.style.setProperty('--app-font', savedFont);
            // also set body font-family for pages that use hardcoded font-family
            document.body.style.fontFamily = savedFont;
        }

        // Listen for storage events so changes in one tab propagate to others in real time
        window.addEventListener('storage', (e) => {
            if (e.key === 'bricaillerie_theme') {
                if (e.newValue === 'dark') document.body.classList.add('dark-theme');
                else document.body.classList.remove('dark-theme');
            }
            if (e.key === 'bricaillerie_font') {
                if (e.newValue) {
                    document.documentElement.style.setProperty('--app-font', e.newValue);
                    document.body.style.fontFamily = e.newValue;
                }
            }
        });
    } catch (err) {
        console.warn('theme.js: could not apply theme/font', err);
    }
})();
