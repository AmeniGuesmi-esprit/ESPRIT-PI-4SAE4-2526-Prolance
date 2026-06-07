import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EmailNotificationService {
private apiUrl = 'http://localhost:8080/api/emails';
  // ✅ Remplace ces 3 valeurs avec tes IDs EmailJS
  // Obtenus sur https://www.emailjs.com après avoir créé ton compte
  private readonly SERVICE_ID  = 'service_6wd6yld';   // ex: service_abc123
  private readonly TEMPLATE_ID = 'template_0dkuola';  // ex: template_xyz456
  private readonly PUBLIC_KEY  = '0ty1N2DwIobb_bQtJ';    // ex: aBcDeFgHiJkLmNoPq

  private readonly EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send';
  private formspreeId = 'f/mnjblqgy';

   constructor(private http: HttpClient) {}

   /**
   * ✅ Envoyer email de création (IN_PROGRESS)
   */
  sendProjectCreatedEmail(projectId: number, clientEmail: string, projectTitle: string): Observable<any> {
    
    const message = `
Bonjour,

Votre projet "${projectTitle}" a été créé avec succès!

📋 Statut: EN COURS DE TRAITEMENT

Votre projet est actuellement traité par nos administrateurs.
Nous vous contacterons dès qu'il sera validé et publié.

ID du projet: ${projectId}

Cordialement,
L'équipe ProLance
    `;

    const emailData = {
      email: clientEmail,
      subject: 'Votre projet est en cours de traitement ⏳',
      message: message
    };

    return this.http.post(`https://formspree.io/${this.formspreeId}`, emailData);
  }

   /**
   * ✅ Envoyer email d'approbation (COMPLETED)
   */
  

   sendProjectApprovedEmail(projectId: number, clientEmail: string, projectTitle: string): Observable<any> {
  const message = `
Bonjour,

Votre projet "${projectTitle}" a été approuvé avec succès !

📋 Statut: APPROUVÉ ✅

Votre projet est maintenant visible par tous les freelancers sur la plateforme.

ID du projet: ${projectId}

Cordialement,
L'équipe ProLance
  `;

  const emailData = {
    email: clientEmail,
    subject: `Votre projet "${projectTitle}" a été approuvé ✅`,
    message: message
  };

  return this.http.post(`https://formspree.io/${this.formspreeId}`, emailData);
}
  sendValidationEmail(adminEmail: string, projectTitle: string, projectId: number): Observable<any> {
  const message = `
Bonjour Admin,

Un nouveau projet nécessite votre validation sur ProLance.

📋 Projet: "${projectTitle}"
🆔 ID: ${projectId}

Veuillez vous connecter à la plateforme pour valider ou rejeter ce projet.

Cordialement,
L'équipe ProLance
  `;

  const emailData = {
    email: adminEmail,
    subject: `Nouveau projet à valider: "${projectTitle}" 🔔`,
    message: message
  };

  return this.http.post(`https://formspree.io/${this.formspreeId}`, emailData);
}
  sendDeleteNotification(params: {
    clientName:    string;
    clientEmail:   string;
    projectTitle:  string;
    projectBudget: number;
    projectCategory: string;
  }): void {

    const templateParams = {
      client_name:      params.clientName,
      client_email:     params.clientEmail,
      project_title:    params.projectTitle,
      project_budget:   params.projectBudget + ' TND',
      project_category: params.projectCategory,
      delete_date:      new Date().toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'long', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        }),
      admin_email:      'prolance2026@gmail.com'
    };

    const body = {
      service_id:  this.SERVICE_ID,
      template_id: this.TEMPLATE_ID,
      user_id:     this.PUBLIC_KEY,
      template_params: templateParams
    };

    // Envoi en arrière-plan — pas de blocage de l'UI
    fetch(this.EMAILJS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(res => {
        if (res.ok) {
          console.log('✅ Email de notification envoyé à l\'admin.');
        } else {
          res.text().then(t => console.warn('⚠️ EmailJS error:', t));
        }
      })
      .catch(err => console.error('❌ EmailJS network error:', err));
  }
  sendProjectApprovedEmailToFreelancer(freelancerEmail: string, projectTitle: string, projectId: number): Observable<any> {
  const message = `
Bonjour,

Bonne nouvelle ! Le projet "${projectTitle}" auquel vous avez postulé a été approuvé !

📋 Statut: APPROUVÉ ✅

Votre candidature est en cours d'examen par le client.
Connectez-vous à la plateforme pour voir les détails.

ID du projet: ${projectId}

Cordialement,
L'équipe ProLance
  `;

  const emailData = {
    email: freelancerEmail,
    subject: `Le projet "${projectTitle}" a été approuvé ✅`,
    message: message
  };

  return this.http.post(`https://formspree.io/${this.formspreeId}`, emailData);
}
}