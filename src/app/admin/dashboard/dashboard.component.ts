import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

declare const Chart: any;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <header class="topbar">
      <h1 class="topbar-title">Dashboard</h1>
      <div class="topbar-breadcrumb">/ Inicio</div>
      <div class="topbar-right">
        <input type="date" [(ngModel)]="startDate" class="form-control" style="width:140px; font-size:12px;" />
        <span style="color:var(--gray-400); font-size:12px;">a</span>
        <input type="date" [(ngModel)]="endDate" class="form-control" style="width:140px; font-size:12px;" />
        <button class="btn btn-secondary btn-sm" (click)="loadStats()">Filtrar</button>
        <button class="btn btn-secondary btn-sm" (click)="reset()">Restablecer</button>
      </div>
    </header>

    <div class="page-content">
      <div class="kpi-grid">
        <div class="kpi-card slate">
          <div class="kpi-icon">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
          <div class="kpi-value">{{ stats.totalRedemptions }}</div>
          <div class="kpi-label">Canjes Totales</div>
        </div>

        <div class="kpi-card yellow">
          <div class="kpi-icon">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
            </svg>
          </div>
          <div class="kpi-value">{{ stats.availableCodes }}</div>
          <div class="kpi-label">Códigos Libres</div>
        </div>

        <div class="kpi-card green">
          <div class="kpi-icon">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2 2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="kpi-value">{{ stats.activeProjects }}</div>
          <div class="kpi-label">Proyectos Activos</div>
        </div>

        <div class="kpi-card purple">
          <div class="kpi-icon">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div class="kpi-value">{{ stats.totalUsers }}</div>
          <div class="kpi-label">Usuarios Registrados</div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <span class="card-title">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>
              Actividad de Canjes
            </span>
          </div>
          <div class="card-body">
            <div class="chart-container"><canvas #chartCanvas></canvas></div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">Uso de Stock</span>
          </div>
          <div class="card-body">
            <div class="chart-container"><canvas #pieCanvas></canvas></div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pieCanvas') pieCanvas!: ElementRef<HTMLCanvasElement>;

  stats: any = { totalRedemptions: 0, availableCodes: 0, activeProjects: 0, totalUsers: 0, chart: [] };
  startDate = '';
  endDate = '';

  private lineChart: any = null;
  private pieChart: any = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadStats();
    if (!(window as any).Chart) {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      s.onload = () => this.initCharts();
      document.head.appendChild(s);
    } else {
      setTimeout(() => this.initCharts(), 100);
    }
  }

  ngOnDestroy() {
    if (this.lineChart) this.lineChart.destroy();
    if (this.pieChart) this.pieChart.destroy();
  }

  loadStats() {
    let url = 'backend/admin_api.php?action=dashboard_stats';
    if (this.startDate) url += '&start_date=' + this.startDate;
    if (this.endDate) url += '&end_date=' + this.endDate;

    this.http.get<any>(url).subscribe(data => {
      this.stats = data;
      
      if (this.lineChart) {
        const chartData = data.chart || [];
        this.lineChart.data.labels = chartData.map((d: any) => d.fecha);
        this.lineChart.data.datasets[0].data = chartData.map((d: any) => d.total);
        this.lineChart.update();
      }

      if (this.pieChart) {
        this.pieChart.data.datasets[0].data = [this.stats.totalRedemptions, this.stats.availableCodes];
        this.pieChart.update();
      }
    });
  }

  reset() {
    this.startDate = '';
    this.endDate = '';
    this.loadStats();
  }

  initCharts() {
    const ChartJs = (window as any).Chart;
    if (!ChartJs) return;

    if (this.chartCanvas?.nativeElement) {
      const chartData = this.stats.chart || [];
      this.lineChart = new ChartJs(this.chartCanvas.nativeElement, {
        type: 'line',
        data: {
          labels: chartData.map((d: any) => d.fecha),
          datasets: [
            {
              label: 'Canjes',
              data: chartData.map((d: any) => d.total),
              borderColor: '#e31b23',
              backgroundColor: 'rgba(227, 27, 35, 0.1)',
              fill: true,
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    if (this.pieCanvas?.nativeElement) {
      this.pieChart = new ChartJs(this.pieCanvas.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Entregados', 'Disponibles'],
          datasets: [
            {
              data: [this.stats.totalRedemptions || 0, this.stats.availableCodes || 0],
              backgroundColor: ['#e31b23', '#cbd5e1']
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
          cutout: '70%'
        }
      });
    }
  }
}
