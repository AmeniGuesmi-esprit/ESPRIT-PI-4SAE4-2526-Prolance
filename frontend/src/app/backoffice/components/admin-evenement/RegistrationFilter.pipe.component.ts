import { Pipe, PipeTransform } from '@angular/core';
import { EventInscriptionResponseDTO } from '../../../frontoffice/GestionEvenement/models/inscription.model';

/**
 * Usage in template:
 *   {{ registrations | registrationFilter:'PENDING' }}
 *
 * Returns the count of inscriptions matching the given status.
 * Register this pipe in your AdminModule (or SharedModule).
 */
@Pipe({ name: 'registrationFilter' })
export class RegistrationFilterPipe implements PipeTransform {
  transform(registrations: EventInscriptionResponseDTO[], status: string): number {
    if (!registrations) return 0;
    return registrations.filter(r => r.status === status).length;
  }
}