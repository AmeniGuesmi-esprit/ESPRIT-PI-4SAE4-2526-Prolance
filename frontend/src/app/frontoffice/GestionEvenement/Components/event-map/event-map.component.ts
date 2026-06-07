import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  SimpleChanges,
  ElementRef,
  ViewChild
} from '@angular/core';
import * as L from 'leaflet';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

// ── Fix bug icônes Leaflet avec Webpack ──
const iconDefault = L.icon({
  iconUrl:     'assets/marker-icon.png',
  shadowUrl:   'assets/marker-shadow.png',
  iconSize:    [25, 41],
  iconAnchor:  [12, 41],
  popupAnchor: [1, -34],
  shadowSize:  [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-event-map',
  templateUrl: './event-map.component.html',
  styleUrls:   ['./event-map.component.css']
})
export class EventMapComponent implements AfterViewInit, OnChanges, OnDestroy {

  // ── Inputs ──
  @Input() set lat(value: number | undefined) {
    this._lat = value;
  }

  @Input() set lng(value: number | undefined) {
    this._lng = value;
  }

  @Input() set locationName(value: string) {
    this._locationName = value;
    // Fallback : si pas de coordonnées fournies par le backend → géocoder côté frontend
    if (!this._lat && !this._lng && value) {
      this.geocodeLocation(value);
    }
  }

  @Input() eventTitle: string = '';

  // ── Champs internes ──
  _lat?:         number;
  _lng?:         number;
  _locationName: string = '';
  isGeocoding =  false;
  mapReady =     false;

  @ViewChild('mapEl') mapEl!: ElementRef;

  private map:    L.Map    | null = null;
  private marker: L.Marker | null = null;

  constructor(private http: HttpClient) {}

  // ── Lifecycle ──

  ngAfterViewInit(): void {
  this.mapReady = true;
  if (this._lat && this._lng) {
    setTimeout(() => this.initMap(this._lat!, this._lng!), 350); // ← 100 → 350
  }
}

ngOnChanges(changes: SimpleChanges): void {
  if ((changes['lat'] || changes['lng']) && this._lat && this._lng && this.mapReady) {
    this.destroyMap();
    setTimeout(() => this.initMap(this._lat!, this._lng!), 350); // ← 100 → 350
  }
}

  ngOnDestroy(): void {
    this.destroyMap();
  }

  // ══════════════════════════════════════════════════
  //  GÉOCODAGE AVEC FALLBACK MULTI-VARIANTES
  // ══════════════════════════════════════════════════

  private geocodeLocation(address: string): void {
    this.isGeocoding = true;
    const variants = this.buildAddressVariants(address);
    this.tryGeocodeVariants(variants, 0);
  }

  private buildAddressVariants(address: string): string[] {
    const parts    = address.split(',').map(p => p.trim());
    const variants: string[] = [address]; // original en premier

    // Ajouter "Tunisie" si absent
    if (!address.toLowerCase().includes('tunisie') &&
        !address.toLowerCase().includes('tunisia')) {
      variants.push(address + ', Tunisie');
    }

    // Essayer uniquement la ville (dernier segment)
    if (parts.length > 1) {
      variants.push(parts[parts.length - 1] + ', Tunisie');

      // Avant-dernier + dernier
      if (parts.length > 2) {
        variants.push(
          parts[parts.length - 2] + ', ' + parts[parts.length - 1] + ', Tunisie'
        );
      }
    }

    return [...new Set(variants)]; // dédoublonner
  }

  private tryGeocodeVariants(variants: string[], index: number): void {
    if (index >= variants.length) {
      // Toutes les variantes épuisées
      this.isGeocoding = false;
      console.warn('⚠️ Aucune coordonnée trouvée pour :', variants);
      return;
    }

    const current = variants[index];
    console.log(`🔍 Essai [${index + 1}/${variants.length}] : ${current}`);

    const url = `https://nominatim.openstreetmap.org/search`
              + `?q=${encodeURIComponent(current)}&format=json&limit=1`;

    this.http.get<any[]>(url, {
      headers: { 'Accept-Language': 'fr' }
    }).pipe(
      map(results => {
        console.log(`📍 Résultats pour "${current}" :`, results);
        return results.length > 0
          ? { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) }
          : null;
      }),
      catchError(err => {
        console.error('❌ Erreur géocodage :', err);
        return of(null);
      })
    ).subscribe(coords => {
      if (coords) {
        console.log(`✅ Trouvé avec "${current}" :`, coords);
        this.isGeocoding = false;
        this._lat = coords.lat;
        this._lng = coords.lng;
        setTimeout(() => {
  this.map?.invalidateSize(true); // ← true = avec animation
}, 300);
      } else {
        // Essayer la variante suivante après 1.1s (rate limit Nominatim)
        setTimeout(() => this.tryGeocodeVariants(variants, index + 1), 1100);
      }
    });
  }

  // ══════════════════════════════════════════════════
  //  INITIALISATION DE LA CARTE
  // ══════════════════════════════════════════════════

  private initMap(lat: number, lng: number): void {
    if (!this.mapEl?.nativeElement) {
      console.error('❌ mapEl non disponible');
      return;
    }

    console.log('🗺️ Initialisation carte :', lat, lng);

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.map = L.map(this.mapEl.nativeElement, {
      center:          [lat, lng],
      zoom:            15,
      scrollWheelZoom: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(this.map);

    this.marker = L.marker([lat, lng])
      .addTo(this.map)
      .bindPopup(`
        <div style="text-align:center; padding:4px">
          <strong>${this.eventTitle}</strong><br/>
          <small><i>${this._locationName}</i></small>
        </div>
      `)
      .openPopup();

    // Force le recalcul de la taille (utile dans un modal)
    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  // ══════════════════════════════════════════════════
  //  DESTRUCTION PROPRE
  // ══════════════════════════════════════════════════

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map   = null;
      this.marker = null;
    }
  }
}