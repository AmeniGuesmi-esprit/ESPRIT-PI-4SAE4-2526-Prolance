import { Injectable } from '@angular/core';

declare var emailjs: any;

export interface EmailPayload {
  to_email: string;
  to_name: string;
  event_title: string;
  badge_image?: string; // base64 data URL
  rejection_reason?: string;
}

@Injectable({ providedIn: 'root' })
export class EmailService {

  // ⚠️ Remplacez ces valeurs par vos vraies clés EmailJS
  private readonly SERVICE_ID  = 'service_3d4iage';   // ex: 'service_abc123'
  private readonly ACCEPT_TEMPLATE_ID  = 'template_md5sn32';  // template pour acceptation
  private readonly REJECT_TEMPLATE_ID  = 'template_u8oom3n';  // template pour refus
  private readonly PUBLIC_KEY  = 'uo8rbIj37BtEt2dIX';   // clé publique EmailJS

  constructor() {
    // Initialiser EmailJS
    if (typeof emailjs !== 'undefined') {
      emailjs.init(this.PUBLIC_KEY);
    }
  }

  /**
   * Envoie un email d'acceptation avec le badge en pièce jointe (image inline)
   */
  async sendAcceptanceEmail(payload: EmailPayload): Promise<void> {
    const templateParams = {
      to_email:    payload.to_email,
      to_name:     payload.to_name,
      event_title: payload.event_title,
      badge_image: payload.badge_image || '',
      from_email:  'prolance2026@gmail.com',
      from_name:   'Équipe ProLance Events',
    };

    try {
      await emailjs.send(this.SERVICE_ID, this.ACCEPT_TEMPLATE_ID, templateParams);
    } catch (err) {
      console.error('EmailJS acceptance error:', err);
      throw err;
    }
  }

  /**
   * Envoie un email de refus avec la raison personnalisée
   */
  async sendRejectionEmail(payload: EmailPayload): Promise<void> {
    const templateParams = {
      to_email:         payload.to_email,
      to_name:          payload.to_name,
      event_title:      payload.event_title,
      rejection_reason: payload.rejection_reason || 'Votre demande n\'a pas pu être acceptée.',
      from_email:       'prolance2026@gmail.com',
      from_name:        'Équipe ProLance Events',
    };

    try {
      await emailjs.send(this.SERVICE_ID, this.REJECT_TEMPLATE_ID, templateParams);
    } catch (err) {
      console.error('EmailJS rejection error:', err);
      throw err;
    }
  }
}