// --- Parameters Interactivity & State Management ---

document.addEventListener('DOMContentLoaded', () => {
    
    // --- DOM Elements ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const settingsPanels = document.querySelectorAll('.settings-panel');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    // Form Elements
    const generalForm = document.getElementById('general-settings-form');
    const profileForm = document.getElementById('profile-settings-form');
    const securityPasswordForm = document.getElementById('security-password-form');
    
    // Action Buttons
    const saveNotificationsBtn = document.getElementById('save-notifications-btn');
    const btnExportData = document.getElementById('btn-export-data');
    const importDataFile = document.getElementById('import-data-file');
    const btnResetSettings = document.getElementById('btn-reset-settings');
    const btnClearCache = document.getElementById('btn-clear-cache');

    // --- Tab Switching Logic ---
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons and panels
            tabButtons.forEach(b => b.classList.remove('active'));
            settingsPanels.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Show corresponding panel
            const tabId = btn.getAttribute('data-tab');
            const targetPanel = document.getElementById(`panel-${tabId}`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });

    // --- LocalStorage Keys ---
    const GENERAL_SETTINGS_KEY = 'bricaillerie_general_settings';
    const PROFILE_SETTINGS_KEY = 'bricaillerie_profile_settings';
    const NOTIF_SETTINGS_KEY = 'bricaillerie_notification_settings';
    const SECURITY_SETTINGS_KEY = 'bricaillerie_security_settings';

    // Default Values
    const defaultGeneralSettings = {
        storeName: 'BRICALLERIE',
        storeAddress: 'Rue Amir Abdelkader, Oran, Algérie',
        storePhone: '+213 666 66 66 66',
        storeEmail: 'contact@bricaillerie.com',
        storeCurrency: 'DZD',
        storeTax: '20'
    };

    const defaultProfileSettings = {
        profileName: 'Admin Bricaillerie',
        profileEmail: 'admin@bricaillerie.com'
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

    // --- Load Settings on Init ---
    function loadAllSettings() {
        // 1. Load General Settings
        const savedGeneral = localStorage.getItem(GENERAL_SETTINGS_KEY);
        const general = savedGeneral ? JSON.parse(savedGeneral) : defaultGeneralSettings;
        
        document.getElementById('store-name').value = general.storeName;
        document.getElementById('store-address').value = general.storeAddress;
        document.getElementById('store-phone').value = general.storePhone;
        document.getElementById('store-email').value = general.storeEmail;
        document.getElementById('store-currency').value = general.storeCurrency;
        document.getElementById('store-tax').value = general.storeTax;

        // 2. Load Profile Settings
        const savedProfile = localStorage.getItem(PROFILE_SETTINGS_KEY);
        const profile = savedProfile ? JSON.parse(savedProfile) : defaultProfileSettings;
        
        document.getElementById('profile-name').value = profile.profileName;
        document.getElementById('profile-email').value = profile.profileEmail;

        // 3. Load Notification Settings
        const savedNotifs = localStorage.getItem(NOTIF_SETTINGS_KEY);
        const notifs = savedNotifs ? JSON.parse(savedNotifs) : defaultNotifSettings;
        
        document.getElementById('notif-stock').checked = notifs.notifStock;
        document.getElementById('notif-reports').checked = notifs.notifReports;
        document.getElementById('notif-clients').checked = notifs.notifClients;
        document.getElementById('notif-backups').checked = notifs.notifBackups;

        // 4. Load Security Settings
        const savedSecurity = localStorage.getItem(SECURITY_SETTINGS_KEY);
        const security = savedSecurity ? JSON.parse(savedSecurity) : defaultSecuritySettings;
        
        document.getElementById('session-timeout').value = security.sessionTimeout;
        document.getElementById('security-2fa').checked = security.enable2fa;
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

    // --- Form Submissions ---

    // General Settings Save
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

    // Profile Settings Save
    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const profileData = {
            profileName: document.getElementById('profile-name').value.trim(),
            profileEmail: document.getElementById('profile-email').value.trim()
        };

        localStorage.setItem(PROFILE_SETTINGS_KEY, JSON.stringify(profileData));
        showToast('Profil utilisateur mis à jour !', 'success');
    });

    // Notifications Preferences Save
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

    // Security Settings (Change Password Simulation)
    securityPasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const currentPass = document.getElementById('current-password').value;
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

    // Security settings drop down / switches auto-save
    document.getElementById('session-timeout').addEventListener('change', autoSaveSecurity);
    document.getElementById('security-2fa').addEventListener('change', autoSaveSecurity);

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
    btnExportData.addEventListener('click', () => {
        const fullBackup = {
            backupDate: new Date().toISOString(),
            general: JSON.parse(localStorage.getItem(GENERAL_SETTINGS_KEY)) || defaultGeneralSettings,
            profile: JSON.parse(localStorage.getItem(PROFILE_SETTINGS_KEY)) || defaultProfileSettings,
            notifications: JSON.parse(localStorage.getItem(NOTIF_SETTINGS_KEY)) || defaultNotifSettings,
            security: JSON.parse(localStorage.getItem(SECURITY_SETTINGS_KEY)) || defaultSecuritySettings
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

    // Import Data (JSON Load)
    importDataFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);
                
                // Verify imported format has keys
                if (importedData.general && importedData.profile) {
                    localStorage.setItem(GENERAL_SETTINGS_KEY, JSON.stringify(importedData.general));
                    localStorage.setItem(PROFILE_SETTINGS_KEY, JSON.stringify(importedData.profile));
                    if (importedData.notifications) localStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(importedData.notifications));
                    if (importedData.security) localStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify(importedData.security));
                    
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

    // Reset settings
    btnResetSettings.addEventListener('click', () => {
        if (confirm('Êtes-vous sûr de vouloir réinitialiser les réglages aux valeurs par défaut ? Cette action est irréversible.')) {
            localStorage.removeItem(GENERAL_SETTINGS_KEY);
            localStorage.removeItem(PROFILE_SETTINGS_KEY);
            localStorage.removeItem(NOTIF_SETTINGS_KEY);
            localStorage.removeItem(SECURITY_SETTINGS_KEY);
            loadAllSettings();
            showToast('Réinitialisation terminée !', 'info');
        }
    });

    // Clear Cache
    btnClearCache.addEventListener('click', () => {
        if (confirm('Êtes-vous sûr de vouloir effacer le cache local de ce navigateur ? Tous vos paramètres seront effacés.')) {
            localStorage.clear();
            loadAllSettings();
            showToast('Cache effacé avec succès !', 'info');
        }
    });

    // --- Initialize ---
    loadAllSettings();
});
