/**
 * TaxPro Mileage - Página de Configuración
 * ==========================================
 * Diseño simple estilo lista con secciones
 * Incluye personalización y soporte funcionales
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
    IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem,
    IonLabel, IonIcon, IonNote, IonToggle, IonSelect, IonSelectOption,
    AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
    personOutline, walletOutline, colorPaletteOutline, linkOutline,
    peopleOutline, trashOutline, helpCircleOutline, chatboxOutline,
    refreshOutline, chevronForwardOutline, moonOutline, sunnyOutline,
    notificationsOutline, languageOutline, textOutline, mailOutline,
    callOutline, logoWhatsapp, documentTextOutline
} from 'ionicons/icons';
import { Preferences } from '@capacitor/preferences';
import { Browser } from '@capacitor/browser';

interface SettingsItem {
    icon: string;
    label: string;
    action: string;
    badge?: string;
    avatar?: string;
}

interface SettingsSection {
    title: string;
    items: SettingsItem[];
}

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem,
        IonLabel, IonIcon, IonNote, IonToggle, IonSelect, IonSelectOption
    ],
    templateUrl: './settings.page.html',
    styleUrl: './settings.page.scss'
})
export class SettingsPage implements OnInit {
    sections: SettingsSection[] = [
        {
            title: 'Configuración',
            items: [
                { icon: 'person-outline', label: 'Cuenta', action: 'account' },
                { icon: 'wallet-outline', label: 'Financiero', action: 'financial' },
                { icon: 'color-palette-outline', label: 'Personalización', action: 'customization' },
                { icon: 'link-outline', label: 'Enlaces', action: 'links' }
            ]
        },
        {
            title: 'Gestión de Cuenta',
            items: [
                { icon: 'people-outline', label: 'Cambiar Cuenta', action: 'switch-account' },
                { icon: 'trash-outline', label: 'Eliminar Cuenta', action: 'delete-account' }
            ]
        },
        {
            title: 'Soporte y FAQ',
            items: [
                { icon: 'help-circle-outline', label: 'Buscar FAQ', action: 'faq' },
                { icon: 'chatbox-outline', label: 'Contactar Soporte', action: 'support' }
            ]
        },
        {
            title: 'App',
            items: [
                { icon: 'refresh-outline', label: 'Actualizaciones', action: 'updates' }
            ]
        }
    ];

    // Configuración de personalización
    darkMode = false;
    notificationsEnabled = true;
    language = 'es';
    fontSize = 'medium';

    // Información de soporte
    supportEmail = 'soporte@taxprosuite.com';
    supportPhone = '+1 (555) 123-4567';
    supportWhatsApp = '+15551234567';
    faqUrl = 'https://taxprosuite.com/faq';

    constructor(
        private router: Router,
        private alertController: AlertController,
        private toastController: ToastController
    ) {
        addIcons({
            personOutline, walletOutline, colorPaletteOutline, linkOutline,
            peopleOutline, trashOutline, helpCircleOutline, chatboxOutline,
            refreshOutline, chevronForwardOutline, moonOutline, sunnyOutline,
            notificationsOutline, languageOutline, textOutline, mailOutline,
            callOutline, logoWhatsapp, documentTextOutline
        });
    }

    async ngOnInit() {
        await this.loadSettings();
    }

    async loadSettings() {
        try {
            const darkMode = await Preferences.get({ key: 'darkMode' });
            this.darkMode = darkMode.value === 'true';

            const notifications = await Preferences.get({ key: 'notificationsEnabled' });
            this.notificationsEnabled = notifications.value !== 'false';

            const language = await Preferences.get({ key: 'language' });
            this.language = language.value || 'es';

            const fontSize = await Preferences.get({ key: 'fontSize' });
            this.fontSize = fontSize.value || 'medium';

            // Aplicar modo oscuro si está habilitado
            this.applyDarkMode();
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async onItemClick(action: string) {
        switch (action) {
            case 'account':
                this.router.navigate(['/tabs/profile']);
                break;
            case 'financial':
                this.showFinancialSettings();
                break;
            case 'customization':
                this.showCustomizationSettings();
                break;
            case 'links':
                this.showLinksSettings();
                break;
            case 'switch-account':
                this.showSwitchAccountAlert();
                break;
            case 'delete-account':
                this.confirmDeleteAccount();
                break;
            case 'faq':
                this.openFAQ();
                break;
            case 'support':
                this.showSupportOptions();
                break;
            case 'updates':
                this.checkForUpdates();
                break;
        }
    }

    // ===========================================
    // PERSONALIZACIÓN
    // ===========================================

    private async showCustomizationSettings() {
        const alert = await this.alertController.create({
            header: 'Personalización',
            cssClass: 'settings-alert',
            inputs: [
                {
                    name: 'darkMode',
                    type: 'checkbox',
                    label: 'Modo Oscuro',
                    checked: this.darkMode,
                    value: 'darkMode'
                },
                {
                    name: 'notifications',
                    type: 'checkbox',
                    label: 'Notificaciones',
                    checked: this.notificationsEnabled,
                    value: 'notifications'
                }
            ],
            buttons: [
                {
                    text: 'Cancelar',
                    role: 'cancel'
                },
                {
                    text: 'Más opciones',
                    handler: () => {
                        this.showAdvancedCustomization();
                        return false;
                    }
                },
                {
                    text: 'Guardar',
                    handler: async (data) => {
                        this.darkMode = data.includes('darkMode');
                        this.notificationsEnabled = data.includes('notifications');

                        await Preferences.set({ key: 'darkMode', value: this.darkMode.toString() });
                        await Preferences.set({ key: 'notificationsEnabled', value: this.notificationsEnabled.toString() });

                        this.applyDarkMode();
                        this.showToast('Configuración guardada');
                    }
                }
            ]
        });

        await alert.present();
    }

    private async showAdvancedCustomization() {
        // Primero mostrar opciones de idioma
        const languageAlert = await this.alertController.create({
            header: 'Seleccionar Idioma',
            cssClass: 'settings-alert',
            inputs: [
                {
                    name: 'language',
                    type: 'radio',
                    label: 'Español',
                    value: 'es',
                    checked: this.language === 'es'
                },
                {
                    name: 'language',
                    type: 'radio',
                    label: 'English',
                    value: 'en',
                    checked: this.language === 'en'
                }
            ],
            buttons: [
                {
                    text: 'Cancelar',
                    role: 'cancel'
                },
                {
                    text: 'Siguiente',
                    handler: async (selectedLanguage) => {
                        if (selectedLanguage) {
                            this.language = selectedLanguage;
                            await Preferences.set({ key: 'language', value: selectedLanguage });
                        }
                        // Mostrar opciones de tamaño de fuente
                        setTimeout(() => this.showFontSizeOptions(), 300);
                    }
                }
            ]
        });

        await languageAlert.present();
    }

    private async showFontSizeOptions() {
        const fontAlert = await this.alertController.create({
            header: 'Tamaño de Texto',
            cssClass: 'settings-alert',
            inputs: [
                {
                    name: 'fontSize',
                    type: 'radio',
                    label: 'Pequeño',
                    value: 'small',
                    checked: this.fontSize === 'small'
                },
                {
                    name: 'fontSize',
                    type: 'radio',
                    label: 'Normal',
                    value: 'medium',
                    checked: this.fontSize === 'medium'
                },
                {
                    name: 'fontSize',
                    type: 'radio',
                    label: 'Grande',
                    value: 'large',
                    checked: this.fontSize === 'large'
                }
            ],
            buttons: [
                {
                    text: 'Cancelar',
                    role: 'cancel'
                },
                {
                    text: 'Guardar',
                    handler: async (selectedSize) => {
                        if (selectedSize) {
                            this.fontSize = selectedSize;
                            await Preferences.set({ key: 'fontSize', value: selectedSize });
                            this.applyFontSize();
                        }
                        this.showToast('Configuración guardada');
                    }
                }
            ]
        });

        await fontAlert.present();
    }

    private applyDarkMode() {
        document.body.classList.toggle('dark', this.darkMode);
    }

    private applyFontSize() {
        document.body.classList.remove('font-small', 'font-medium', 'font-large');
        document.body.classList.add(`font-${this.fontSize}`);
    }

    async toggleDarkMode() {
        this.darkMode = !this.darkMode;
        await Preferences.set({ key: 'darkMode', value: this.darkMode.toString() });
        this.applyDarkMode();
        this.showToast(this.darkMode ? 'Modo oscuro activado' : 'Modo claro activado');
    }

    // ===========================================
    // SOPORTE
    // ===========================================

    private async showSupportOptions() {
        const alert = await this.alertController.create({
            header: 'Contactar Soporte',
            message: '¿Cómo deseas contactarnos?',
            cssClass: 'support-alert',
            buttons: [
                {
                    text: 'Email',
                    handler: () => {
                        this.sendEmail();
                    }
                },
                {
                    text: 'WhatsApp',
                    handler: () => {
                        this.openWhatsApp();
                    }
                },
                {
                    text: 'Llamar',
                    handler: () => {
                        this.makeCall();
                    }
                },
                {
                    text: 'Cancelar',
                    role: 'cancel'
                }
            ]
        });

        await alert.present();
    }

    private async sendEmail() {
        const subject = encodeURIComponent('Soporte TaxPro Mileage');
        const body = encodeURIComponent('Hola, necesito ayuda con...\n\n[Describe tu problema aquí]');
        window.open(`mailto:${this.supportEmail}?subject=${subject}&body=${body}`, '_system');
        this.showToast('Abriendo aplicación de correo...');
    }

    private async openWhatsApp() {
        const message = encodeURIComponent('Hola, necesito ayuda con TaxPro Mileage');
        try {
            await Browser.open({ url: `https://wa.me/${this.supportWhatsApp}?text=${message}` });
        } catch {
            window.open(`https://wa.me/${this.supportWhatsApp}?text=${message}`, '_blank');
        }
    }

    private makeCall() {
        window.open(`tel:${this.supportPhone}`, '_system');
        this.showToast('Iniciando llamada...');
    }

    private async openFAQ() {
        try {
            await Browser.open({ url: this.faqUrl });
        } catch {
            window.open(this.faqUrl, '_blank');
        }
    }

    // ===========================================
    // OTRAS FUNCIONES
    // ===========================================

    private async showFinancialSettings() {
        const alert = await this.alertController.create({
            header: 'Configuración Financiera',
            message: 'Configura tu tarifa de millas para deducciones fiscales.',
            inputs: [
                {
                    name: 'mileageRate',
                    type: 'number',
                    placeholder: 'Tarifa por milla ($)',
                    value: '0.70',
                    min: 0,
                    max: 2
                }
            ],
            buttons: [
                {
                    text: 'Cancelar',
                    role: 'cancel'
                },
                {
                    text: 'Guardar',
                    handler: async (data) => {
                        if (data.mileageRate) {
                            await Preferences.set({ key: 'mileageRate', value: data.mileageRate });
                            this.showToast(`Tarifa actualizada: $${data.mileageRate}/milla`);
                        }
                    }
                }
            ]
        });

        await alert.present();
    }

    private async showLinksSettings() {
        const alert = await this.alertController.create({
            header: 'Enlaces Útiles',
            message: 'Accede a recursos adicionales',
            buttons: [
                {
                    text: 'Sitio Web',
                    handler: async () => {
                        try {
                            await Browser.open({ url: 'https://taxprosuite.com' });
                        } catch {
                            window.open('https://taxprosuite.com', '_blank');
                        }
                    }
                },
                {
                    text: 'Términos de Servicio',
                    handler: async () => {
                        try {
                            await Browser.open({ url: 'https://taxprosuite.com/terms' });
                        } catch {
                            window.open('https://taxprosuite.com/terms', '_blank');
                        }
                    }
                },
                {
                    text: 'Política de Privacidad',
                    handler: async () => {
                        try {
                            await Browser.open({ url: 'https://taxprosuite.com/privacy' });
                        } catch {
                            window.open('https://taxprosuite.com/privacy', '_blank');
                        }
                    }
                },
                {
                    text: 'Cerrar',
                    role: 'cancel'
                }
            ]
        });

        await alert.present();
    }

    private async showSwitchAccountAlert() {
        const alert = await this.alertController.create({
            header: 'Cambiar Cuenta',
            message: '¿Deseas cerrar sesión y cambiar a otra cuenta?',
            buttons: [
                {
                    text: 'Cancelar',
                    role: 'cancel'
                },
                {
                    text: 'Cambiar',
                    handler: () => {
                        this.router.navigate(['/login'], { replaceUrl: true });
                    }
                }
            ]
        });

        await alert.present();
    }

    private async confirmDeleteAccount() {
        const alert = await this.alertController.create({
            header: 'Eliminar Cuenta',
            message: '¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer y perderás todos tus datos.',
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                    text: 'Eliminar',
                    role: 'destructive',
                    handler: () => {
                        this.showDeleteConfirmation();
                    }
                }
            ]
        });
        await alert.present();
    }

    private async showDeleteConfirmation() {
        const alert = await this.alertController.create({
            header: 'Confirmar Eliminación',
            message: 'Escribe "ELIMINAR" para confirmar que deseas eliminar tu cuenta permanentemente.',
            inputs: [
                {
                    name: 'confirmation',
                    type: 'text',
                    placeholder: 'ELIMINAR'
                }
            ],
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                    text: 'Confirmar',
                    role: 'destructive',
                    handler: (data) => {
                        if (data.confirmation === 'ELIMINAR') {
                            this.showToast('Solicitud de eliminación enviada. Te contactaremos pronto.', 'warning');
                        } else {
                            this.showToast('Texto de confirmación incorrecto', 'danger');
                            return false;
                        }
                        return true;
                    }
                }
            ]
        });
        await alert.present();
    }

    private async checkForUpdates() {
        const toast = await this.toastController.create({
            message: 'Tu app está actualizada (v1.0.0)',
            duration: 2000,
            position: 'bottom',
            color: 'success'
        });
        await toast.present();
    }

    private async showToast(message: string, color: string = 'primary') {
        const toast = await this.toastController.create({
            message,
            duration: 2000,
            position: 'bottom',
            color
        });
        await toast.present();
    }
}
