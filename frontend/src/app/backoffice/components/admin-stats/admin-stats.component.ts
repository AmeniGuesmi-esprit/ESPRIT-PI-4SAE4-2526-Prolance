import { Component, OnInit } from '@angular/core';
import {
  ApexChart, ApexNonAxisChartSeries, ApexAxisChartSeries,
  ApexXAxis, ApexStroke, ApexFill, ApexTooltip,
  ApexDataLabels, ApexPlotOptions, ApexLegend, ApexYAxis, ApexGrid
} from 'ng-apexcharts';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EventService }   from '../../../frontoffice/GestionEvenement/services/event.service';
import { InscriptionService } from '../../../frontoffice/GestionEvenement/services/inscription.service';
import { Event }          from '../../../frontoffice/GestionEvenement/models/event.model';
import { EventInscriptionResponseDTO, InscriptionStatus } from '../../../frontoffice/GestionEvenement/models/inscription.model';

@Component({
  selector: 'app-admin-stats',
  templateUrl: './admin-stats.component.html',
  styleUrls: ['./admin-stats.component.css']
})
export class AdminStatsComponent implements OnInit {

  // ── State ──
  loading       = true;
  activePeriod  = '30d';
  events:        Event[]                        = [];
  registrations: EventInscriptionResponseDTO[]  = [];

  // ── KPI ──
  totalEvents        = 0;
  totalRegistrations = 0;
  pendingCount       = 0;
  acceptanceRate     = 0;

  // ── Insights ──
  insights: { icon: string; text: string }[] = [];

  // ── Leaderboard ──
  topEvents: { title: string; category: string; location: string; count: number; percent: number }[] = [];

  // ════════════════════════════════
  // CHART OPTIONS
  // ════════════════════════════════

  // Timeline
  timelineSeries: ApexAxisChartSeries = [];
  timelineChart:  ApexChart  = {
    type: 'area', height: 240, background: 'transparent',
    toolbar: { show: false }, fontFamily: 'DM Sans, sans-serif'
  };
  timelineXAxis:  ApexXAxis  = { categories: [], labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } };
  timelineStroke: ApexStroke = { curve: 'smooth', width: 2 };
  timelineFill:   ApexFill   = { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.02 } as any };
  timelineColors  = ['#7c3aed', '#10b981'];
  timelineTooltip: ApexTooltip = { theme: 'dark' };
  timelineGrid:   ApexGrid   = { borderColor: 'rgba(255,255,255,0.04)', strokeDashArray: 3 };

  // Donut
  donutSeries: ApexNonAxisChartSeries = [];
  donutChart:  ApexChart = {
    type: 'donut', height: 240, background: 'transparent', fontFamily: 'DM Sans, sans-serif'
  };
  donutLabels  = ['CONFERENCE','HACKATHON','WORKSHOP','NETWORKING','TRAINING','OTHER'];
  donutColors  = ['#7c3aed','#06b6d4','#f59e0b','#10b981','#f43f5e','#64748b'];
  donutLegend: ApexLegend = { show: true, position: 'bottom', labels: { colors: ['#94a3b8'] }, fontSize: '11px' };

  // Bar (capacity)
  barSeries: ApexAxisChartSeries = [];
  barChart:  ApexChart = {
    type: 'bar', height: 240, background: 'transparent',
    toolbar: { show: false }, fontFamily: 'DM Sans, sans-serif'
  };
  barXAxis:  ApexXAxis = { categories: [], labels: { style: { colors: '#94a3b8', fontSize: '11px' } }, axisBorder: { show: false } };
  barPlot:   ApexPlotOptions = { bar: { borderRadius: 6, horizontal: true, distributed: true, barHeight: '60%' } };
  barDataLabels: ApexDataLabels = {
    enabled: true,
    formatter: (v: any) => v + '%',
    style: { colors: ['#fff'], fontSize: '11px' }
  };

  // Radar
  radarSeries: ApexAxisChartSeries = [{ name: 'Events', data: [4, 7, 12, 14, 11, 8, 3] }];
  radarChart:  ApexChart = {
    type: 'radar', height: 240, background: 'transparent',
    toolbar: { show: false }, fontFamily: 'DM Sans, sans-serif'
  };
  radarXAxis:  ApexXAxis = { categories: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], labels: { style: { colors: '#94a3b8', fontSize: '11px' } } };
  radarFill:   ApexFill  = { opacity: 0.2 };
  radarColors  = ['#06b6d4'];

  // Funnel
  funnelSeries: ApexAxisChartSeries = [];
  funnelChart:  ApexChart = {
    type: 'bar', height: 240, background: 'transparent',
    toolbar: { show: false }, fontFamily: 'DM Sans, sans-serif'
  };
  funnelXAxis:  ApexXAxis = {
    categories: ['Submitted','Reviewed','Accepted','Pending'],
    labels: { style: { colors: '#94a3b8', fontSize: '11px' } },
    axisBorder: { show: false }
  };
  funnelPlot:   ApexPlotOptions = { bar: { borderRadius: 6, horizontal: true, barHeight: '55%', distributed: true } };
  funnelColors  = ['#7c3aed','#8b5cf6','#10b981','#f59e0b'];
  funnelDataLabels: ApexDataLabels = {
    enabled: true,
    style: { colors: ['#fff'], fontSize: '11px' }
  };

  // Heatmap
 heatSeries: any[] = [];
  heatChart:  ApexChart = {
    type: 'heatmap', height: 240, background: 'transparent',
    toolbar: { show: false }, fontFamily: 'DM Sans, sans-serif'
  };
  heatColors = ['#7c3aed'];

  // Registration Status Pie
  regStatusSeries: ApexNonAxisChartSeries = [];
  regStatusChart:  ApexChart = {
    type: 'donut', height: 240, background: 'transparent', fontFamily: 'DM Sans, sans-serif'
  };
  regStatusLabels  = ['Accepted', 'Pending', 'Rejected'];
  regStatusColors  = ['#10b981', '#f59e0b', '#ef4444'];
  regStatusPlot: ApexPlotOptions = {
    pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total', color: '#94a3b8', fontSize: '12px' } } } }
  };

  constructor(
    private eventService: EventService,
    private inscriptionService: InscriptionService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  // ════════════════════════════════
  // DATA LOADING
  // ════════════════════════════════

  loadData(): void {
    this.loading = true;
    this.eventService.getAllEvents().subscribe({
      next: (events) => {
        this.events = events;
        this.totalEvents = events.length;

        const eventIds = events
          .map(e => e.idEvent)
          .filter((id): id is number => id != null);

        if (eventIds.length === 0) { this.loading = false; return; }

        const requests = eventIds.map(id =>
          this.inscriptionService.getInscriptionsByEvent(id)
            .pipe(catchError(() => of([] as EventInscriptionResponseDTO[])))
        );

        forkJoin(requests).subscribe({
          next: (results) => {
           const all: EventInscriptionResponseDTO[] = (results as EventInscriptionResponseDTO[][]).reduce((acc, r) => acc.concat(r), []);
            const seen = new Set<number>();
            this.registrations = all.filter(r => {
              if (seen.has(r.id)) return false;
              seen.add(r.id); return true;
            });
            this.computeStats();
            this.buildAllCharts();
            this.loading = false;
          },
          error: () => { this.loading = false; }
        });
      },
      error: () => { this.loading = false; }
    });
  }

  // ════════════════════════════════
  // STATS COMPUTATION
  // ════════════════════════════════

  computeStats(): void {
    this.totalRegistrations = this.registrations.length;
    this.pendingCount = this.registrations
      .filter(r => r.status === InscriptionStatus.PENDING).length;
    const accepted = this.registrations
      .filter(r => r.status === InscriptionStatus.ACCEPTED).length;
    this.acceptanceRate = this.totalRegistrations
      ? Math.round((accepted / this.totalRegistrations) * 100) : 0;
  }

  buildAllCharts(): void {
    this.buildTimeline();
    this.buildDonut();
    this.buildBar();
    this.buildFunnel();
    this.buildHeatmap();
    this.buildLeaderboard();
    this.buildInsights();
    this.buildRegStatusChart();
  }

  // ── Timeline ──
  buildTimeline(): void {
    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - 29 + i);
      return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    });
    const dayMap = new Map<string, { sub: number; acc: number }>();
    last30.forEach(d => dayMap.set(d, { sub: 0, acc: 0 }));

    this.registrations.forEach(r => {
      const label = new Date(r.registrationDate)
        .toLocaleDateString('en', { month: 'short', day: 'numeric' });
      if (dayMap.has(label)) {
        dayMap.get(label)!.sub++;
        if (r.status === InscriptionStatus.ACCEPTED) dayMap.get(label)!.acc++;
      }
    });

    this.timelineSeries = [
      { name: 'Submitted', data: last30.map(d => dayMap.get(d)!.sub) },
      { name: 'Accepted',  data: last30.map(d => dayMap.get(d)!.acc) }
    ];
    this.timelineXAxis = {
      ...this.timelineXAxis,
      categories: last30,
      labels: { show: false },
      axisBorder: { show: false }
    };
  }

  // ── Donut ──
  buildDonut(): void {
    const cats = ['CONFERENCE','HACKATHON','WORKSHOP','NETWORKING','TRAINING'];
    this.donutSeries = [
      ...cats.map(cat => this.events.filter(e => e.category === cat).length),
      this.events.filter(e => !cats.includes(e.category)).length
    ];
  }

  // ── Bar (capacity) ──
  buildBar(): void {
    const sorted = [...this.events]
      .filter(e => e.capacity && e.capacity > 0)
      .map(e => ({
        title: e.title,
        pct: Math.round(((e.currentParticipants || 0) / e.capacity!) * 100)
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 8);

    this.barSeries = [{ name: 'Fill %', data: sorted.map(e => e.pct) }];
    this.barXAxis  = {
      ...this.barXAxis,
      categories: sorted.map(e =>
        e.title.length > 18 ? e.title.substring(0, 18) + '…' : e.title
      )
    };
  }

  // ── Funnel ──
  buildFunnel(): void {
    const total    = this.registrations.length;
    const accepted = this.registrations.filter(r => r.status === InscriptionStatus.ACCEPTED).length;
    const rejected = this.registrations.filter(r => r.status === InscriptionStatus.REJECTED).length;
    const pending  = this.registrations.filter(r => r.status === InscriptionStatus.PENDING).length;
    this.funnelSeries = [{ name: 'Count', data: [total, total - rejected, accepted, pending] }];
  }

  // ── Heatmap ──
  buildHeatmap(): void {
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const weeks = 12;
    this.heatSeries = days.map((day, di) => ({
      name: day,
      data: Array.from({ length: weeks }, (_, w) => ({
        x: `W${w + 1}`,
        y: this.registrations.filter(r => {
          const d = new Date(r.registrationDate);
          const weekIndex = Math.floor(
            (Date.now() - d.getTime()) / (7 * 24 * 3600 * 1000)
          );
          return d.getDay() === (di + 1) % 7 && weekIndex === w;
        }).length
      }))
    }));
  }

  // ── Leaderboard ──
  buildLeaderboard(): void {
    const counts = new Map<string, number>();
    this.registrations.forEach(r => {
      if (r.eventTitle) counts.set(r.eventTitle, (counts.get(r.eventTitle) || 0) + 1);
    });
    const max = Math.max(...Array.from(counts.values()), 1);
    this.topEvents = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([title, count]) => {
        const ev = this.events.find(e => e.title === title);
        return {
          title, count,
          category: ev?.category || '',
          location: ev?.location || '',
          percent: Math.round((count / max) * 100)
        };
      });
  }

  // ── Registration Status Pie ──
  buildRegStatusChart(): void {
    const accepted = this.registrations.filter(r => r.status === InscriptionStatus.ACCEPTED).length;
    const pending  = this.registrations.filter(r => r.status === InscriptionStatus.PENDING).length;
    const rejected = this.registrations.filter(r => r.status === InscriptionStatus.REJECTED).length;
    this.regStatusSeries = [accepted, pending, rejected];
  }

  // ── Insights ──
  buildInsights(): void {
    const almostFull = this.events.filter(e =>
      e.capacity && ((e.currentParticipants || 0) / e.capacity) >= 0.9
    ).length;

    const soon = this.events.filter(e => {
      const diff = new Date(e.startDate as string).getTime() - Date.now();
      return diff > 0 && diff < 7 * 24 * 3600 * 1000;
    }).length;

    const oldPending = this.registrations.filter(r => {
      const diff = Date.now() - new Date(r.registrationDate).getTime();
      return r.status === InscriptionStatus.PENDING && diff > 3 * 24 * 3600 * 1000;
    }).length;

    const cats = ['CONFERENCE','HACKATHON','WORKSHOP','NETWORKING','TRAINING','OTHER'];
    const topCat = this.donutSeries.length
      ? cats[
          (this.donutSeries as number[]).indexOf(
            Math.max(...(this.donutSeries as number[]))
          )
        ]
      : '—';

    this.insights = [
      { icon: '⚠️', text: `<strong>${almostFull} events</strong> are over 90% capacity` },
      { icon: '📅', text: `<strong>${soon} events</strong> start within the next 7 days` },
      { icon: '🔥', text: `<strong>${topCat}</strong> is the most demanded category` },
      { icon: '⏳', text: `<strong>${oldPending} registrations</strong> pending for 3+ days` },
    ];
  }

  // ════════════════════════════════
  // TEMPLATE HELPERS
  // ════════════════════════════════

  getEventCountByStatus(status: string): number {
    return this.events.filter(e => e.eventStatus === status).length;
  }

  getStatusPercent(status: string): number {
    if (!this.totalEvents) return 0;
    return Math.round((this.getEventCountByStatus(status) / this.totalEvents) * 100);
  }
}