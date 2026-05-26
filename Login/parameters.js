// --- Parameters Interactivity & State Management ---

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const settingsPanels = document.querySelectorAll('.settings-panel');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Form Elements
    const generalForm = document.getElementById('general-settings-form');
    const securityPasswordForm = document.getElementById('security-password-form');

    // Action Buttons
    const saveNotificationsBtn = document.getElementById('save-notifications-btn');
    const btnExportData = document.getElementById('btn-export-data');
    const importDataFile = document.getElementById('import-data-file');
    const btnResetSettings = document.getElementById('btn-reset-settings');
    const btnClearCache = document.getElementById('btn-clear-cache');

    // Theme & Font controls
    const themeToggle = document.getElementById('theme-toggle');
    const fontSelect = document.getElementById('font-select');

    // --- LocalStorage Keys ---
    const GENERAL_SETTINGS_KEY = 'bricaillerie_general_settings';
    const NOTIF_SETTINGS_KEY = 'bricaillerie_notification_settings';
    const SECURITY_SETTINGS_KEY = 'bricaillerie_security_settings';
    const THEME_KEY = 'bricaillerie_theme';
    const FONT_KEY = 'bricaillerie_font';

    // Default Values
    const defaultGeneralSettings = {
        storeName: 'BRICALLERIE',
        storeAddress: 'Rue Amir Abdelkader, Oran, Algérie',
        storePhone: '+213 666 66 66 66',
        storeEmail: 'contact@bricaillerie.com',
        storeCurrency: 'DZD',
        storeTax: '20'
    };

    const defaultNotifSettings = {
        notifStock: true,
        notifReports: true,
        notifClients: false,
        notifBackups: true
    };

    const defaultSecuritySettings = {
        sessionTimeout: '30',
        enable2fa: false
    };

    const defaultTheme = 'light';
    const defaultFont = 'Inter, sans-serif';

    // --- Load Settings on Init ---
    function loadAllSettings() {
        // 1. Load General Settings
        const savedGeneral = localStorage.getItem(GENERAL_SETTINGS_KEY);
        const general = savedGeneral ? JSON.parse(savedGeneral) : defaultGeneralSettings;

        if (document.getElementById('store-name')) document.getElementById('store-name').value = general.storeName;
        if (document.getElementById('store-address')) document.getElementById('store-address').value = general.storeAddress;
        if (document.getElementById('store-phone')) document.getElementById('store-phone').value = general.storePhone;
        if (document.getElementById('store-email')) document.getElementById('store-email').value = general.storeEmail;
        if (document.getElementById('store-currency')) document.getElementById('store-currency').value = general.storeCurrency;
        if (document.getElementById('store-tax')) document.getElementById('store-tax').value = general.storeTax;

        // 2. Load Notification Settings
        const savedNotifs = localStorage.getItem(NOTIF_SETTINGS_KEY);
        const notifs = savedNotifs ? JSON.parse(savedNotifs) : defaultNotifSettings;

        if (document.getElementById('notif-stock')) document.getElementById('notif-stock').checked = notifs.notifStock;
        if (document.getElementById('notif-reports')) document.getElementById('notif-reports').checked = notifs.notifReports;
        if (document.getElementById('notif-clients')) document.getElementById('notif-clients').checked = notifs.notifClients;
        if (document.getElementById('notif-backups')) document.getElementById('notif-backups').checked = notifs.notifBackups;

        // 3. Load Security Settings
        const savedSecurity = localStorage.getItem(SECURITY_SETTINGS_KEY);
        const security = savedSecurity ? JSON.parse(savedSecurity) : defaultSecuritySettings;

        if (document.getElementById('session-timeout')) document.getElementById('session-timeout').value = security.sessionTimeout;
        if (document.getElementById('security-2fa')) document.getElementById('security-2fa').checked = security.enable2fa;

        // 4. Load Theme & Font
        const savedTheme = localStorage.getItem(THEME_KEY) || defaultTheme;
        applyTheme(savedTheme);
        if (themeToggle) themeToggle.checked = (savedTheme === 'dark');

        const savedFont = localStorage.getItem(FONT_KEY) || defaultFont;
        applyFont(savedFont);
        if (fontSelect) fontSelect.value = savedFont;

        // 5. Ensure all panels are visible in the unified page
        settingsPanels.forEach(p => p.classList.add('active'));
    }

    // --- Toast Notification helper ---
    function showToast(message, type = 'success') {
        toastMessage.textContent = message;

        const iconSpan = toast.querySelector('.toast-icon');
        if (type === 'success') {
            iconSpan.textContent = '✓';
            iconSpan.style.backgroundColor = '#22c55e';
        } else if (type === 'error') {
            iconSpan.textContent = '✕';
            iconSpan.style.backgroundColor = '#ef4444';
        } else {
            iconSpan.textContent = 'ℹ';
            iconSpan.style.backgroundColor = '#3b82f6';
        }

        toast.classList.add('show');

        // Hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // --- Theme & Font Handlers ---
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        localStorage.setItem(THEME_KEY, theme);
    }

    function applyFont(fontValue) {
        // set CSS variable used by the stylesheet
        document.documentElement.style.setProperty('--app-font', fontValue);
        // also apply inline to body for pages that set font-family directly
        document.body.style.fontFamily = fontValue;
        localStorage.setItem(FONT_KEY, fontValue);
    }

    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            applyTheme(e.target.checked ? 'dark' : 'light');
            showToast('Préférence de thème mise à jour !', 'success');
        });
    }

    if (fontSelect) {
        fontSelect.addEventListener('change', (e) => {
            applyFont(e.target.value);
            showToast('Police enregistrée !', 'success');
        });
    }

    // --- Form Submissions ---
    // General Settings Save
    if (generalForm) {
        generalForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const generalData = {
                storeName: document.getElementById('store-name').value.trim(),
                storeAddress: document.getElementById('store-address').value.trim(),
                storePhone: document.getElementById('store-phone').value.trim(),
                storeEmail: document.getElementById('store-email').value.trim(),
                storeCurrency: document.getElementById('store-currency').value,
                storeTax: document.getElementById('store-tax').value
            };

            localStorage.setItem(GENERAL_SETTINGS_KEY, JSON.stringify(generalData));
            showToast('Paramètres généraux enregistrés avec succès !', 'success');
        });
    }

    // Notifications Preferences Save
    if (saveNotificationsBtn) {
        saveNotificationsBtn.addEventListener('click', () => {
            const notifData = {
                notifStock: document.getElementById('notif-stock').checked,
                notifReports: document.getElementById('notif-reports').checked,
                notifClients: document.getElementById('notif-clients').checked,
                notifBackups: document.getElementById('notif-backups').checked
            };

            localStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(notifData));
            showToast('Préférences de notifications enregistrées !', 'success');
        });
    }

    // Security Settings (Change Password Simulation)
    if (securityPasswordForm) {
        securityPasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const newPass = document.getElementById('new-password').value;
            const confirmPass = document.getElementById('confirm-password').value;

            if (newPass.length < 6) {
                showToast('Le nouveau mot de passe doit comporter au moins 6 caractères.', 'error');
                return;
            }

            if (newPass !== confirmPass) {
                showToast('Les nouveaux mots de passe ne correspondent pas.', 'error');
                return;
            }

            // Faux succès pour la démo frontend
            showToast('Mot de passe mis à jour avec succès !', 'success');
            securityPasswordForm.reset();
        });
    }

    // Security settings drop down / switches auto-save
    if (document.getElementById('session-timeout')) document.getElementById('session-timeout').addEventListener('change', autoSaveSecurity);
    if (document.getElementById('security-2fa')) document.getElementById('security-2fa').addEventListener('change', autoSaveSecurity);

    function autoSaveSecurity() {
        const securityData = {
            sessionTimeout: document.getElementById('session-timeout').value,
            enable2fa: document.getElementById('security-2fa').checked
        };
        localStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify(securityData));
        showToast('Paramètres de sécurité mis à jour !', 'success');
    }

    // --- Data Management Actions ---
    // Export Data (JSON Download)
    if (btnExportData) {
        btnExportData.addEventListener('click', () => {
            const fullBackup = {
                backupDate: new Date().toISOString(),
                general: JSON.parse(localStorage.getItem(GENERAL_SETTINGS_KEY)) || defaultGeneralSettings,
                notifications: JSON.parse(localStorage.getItem(NOTIF_SETTINGS_KEY)) || defaultNotifSettings,
                security: JSON.parse(localStorage.getItem(SECURITY_SETTINGS_KEY)) || defaultSecuritySettings,
                theme: localStorage.getItem(THEME_KEY) || defaultTheme,
                font: localStorage.getItem(FONT_KEY) || defaultFont
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackup, null, 4));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `bricaillerie_settings_backup_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            showToast('Exportation des données réussie !', 'success');
        });
    }

    // Import Data (JSON Load)
    if (importDataFile) {
        importDataFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const importedData = JSON.parse(event.target.result);

                    // Verify imported format has keys
                    if (importedData.general) {
                        localStorage.setItem(GENERAL_SETTINGS_KEY, JSON.stringify(importedData.general));
                        if (importedData.notifications) localStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(importedData.notifications));
                        if (importedData.security) localStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify(importedData.security));
                        if (importedData.theme) localStorage.setItem(THEME_KEY, importedData.theme);
                        if (importedData.font) localStorage.setItem(FONT_KEY, importedData.font);

                        loadAllSettings();
                        showToast('Données restaurées avec succès !', 'success');
                    } else {
                        showToast('Format de fichier de sauvegarde invalide.', 'error');
                    }
                } catch (err) {
                    showToast('Erreur lors de la lecture du fichier JSON.', 'error');
                }
            };
            reader.readAsText(file);
            // Clear input to allow uploading same file again
            importDataFile.value = '';
        });
    }

    // Reset settings
    if (btnResetSettings) {
        btnResetSettings.addEventListener('click', () => {
            if (confirm('Êtes-vous sûr de vouloir réinitialiser les réglages aux valeurs par défaut ? Cette action est irréversible.')) {
                localStorage.removeItem(GENERAL_SETTINGS_KEY);
                localStorage.removeItem(NOTIF_SETTINGS_KEY);
                localStorage.removeItem(SECURITY_SETTINGS_KEY);
                localStorage.removeItem(THEME_KEY);
                localStorage.removeItem(FONT_KEY);
                loadAllSettings();
                showToast('Réinitialisation terminée !', 'info');
            }
        });
    }

    // Clear Cache
    if (btnClearCache) {
        btnClearCache.addEventListener('click', () => {
            if (confirm('Êtes-vous sûr de vouloir effacer le cache local de ce navigateur ? Tous vos paramètres seront effacés.')) {
                localStorage.clear();
                loadAllSettings();
                showToast('Cache effacé avec succès !', 'info');
            }
        });
    }

    // --- Initialize ---
    loadAllSettings();
});
