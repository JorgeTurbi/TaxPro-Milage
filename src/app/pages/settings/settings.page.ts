/**
 * TaxPro Mileage - Página de Configuración
 * ==========================================
 * Diseño simple estilo lista con secciones
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
    IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem,
    IonLabel, IonIcon, IonNote, AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
    personOutline, walletOutline, colorPaletteOutline, linkOutline,
    peopleOutline, trashOutline, helpCircleOutline, chatboxOutline,
    refreshOutline, chevronForwardOutline
} from 'ionicons/icons';

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
        IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem,
        IonLabel, IonIcon, IonNote
    ],
    templateUrl: './settings.page.html',
    styleUrl: './settings.page.scss'
})
export class SettingsPage {
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

    constructor(
        private router: Router,
        private alertController: AlertController,
        private toastController: ToastController
    ) {
        addIcons({
            personOutline, walletOutline, colorPaletteOutline, linkOutline,
            peopleOutline, trashOutline, helpCircleOutline, chatboxOutline,
            refreshOutline, chevronForwardOutline
        });
    }

    async onItemClick(action: string) {
        switch (action) {
            case 'account':
                this.router.navigate(['/profile']);
                break;
            case 'financial':
                this.showComingSoon('Configuración Financiera');
                break;
            case 'customization':
                this.showComingSoon('Personalización');
                break;
            case 'links':
                this.showComingSoon('Enlaces');
                break;
            case 'switch-account':
                this.showComingSoon('Cambiar Cuenta');
                break;
            case 'delete-account':
                this.confirmDeleteAccount();
                break;
            case 'faq':
                this.showComingSoon('Preguntas Frecuentes');
                break;
            case 'support':
                this.showComingSoon('Contactar Soporte');
                break;
            case 'updates':
                this.checkForUpdates();
                break;
        }
    }

    private async showComingSoon(feature: string) {
        const toast = await this.toastController.create({
            message: `${feature} - Próximamente disponible`,
            duration: 2000,
            position: 'bottom',
            color: 'primary'
        });
        await toast.present();
    }

    private async confirmDeleteAccount() {
        const alert = await this.alertController.create({
            header: 'Eliminar Cuenta',
            message: '¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.',
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                    text: 'Eliminar',
                    role: 'destructive',
                    handler: () => {
                        this.showToast('Funcionalidad en desarrollo', 'warning');
                    }
                }
            ]
        });
        await alert.present();
    }

    private async checkForUpdates() {
        const toast = await this.toastController.create({
            message: 'Tu app está actualizada',
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
