import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CardModule, ChartModule, TableModule],
  template: `
    <div class="dashboard-wrapper">
      <!-- KPI Cards -->
      <div class="grid mb-4">
        <div class="col-12 md:col-6 lg:col-3">
          <div class="kpi-card shadow-1 p-4 bg-white border-round">
            <div class="flex justify-content-between mb-3">
              <div>
                <span class="block text-500 font-medium mb-3">Canjes Totales</span>
                <div class="text-900 font-bold text-3xl">{{ stats.totalRedemptions }}</div>
              </div>
              <div class="flex align-items-center justify-content-center bg-blue-100 border-round" style="width:2.5rem;height:2.5rem">
                <i class="pi pi-shopping-cart text-blue-500 text-xl"></i>
              </div>
            </div>
            <span class="text-green-500 font-medium">Registrados </span>
            <span class="text-500">en total</span>
          </div>
        </div>

        <div class="col-12 md:col-6 lg:col-3">
          <div class="kpi-card shadow-1 p-4 bg-white border-round">
            <div class="flex justify-content-between mb-3">
              <div>
                <span class="block text-500 font-medium mb-3">Códigos Libres</span>
                <div class="text-900 font-bold text-3xl">{{ stats.availableCodes }}</div>
              </div>
              <div class="flex align-items-center justify-content-center bg-orange-100 border-round" style="width:2.5rem;height:2.5rem">
                <i class="pi pi-ticket text-orange-500 text-xl"></i>
              </div>
            </div>
            <span class="text-orange-500 font-medium">Listos </span>
            <span class="text-500">para canje</span>
          </div>
        </div>

        <div class="col-12 md:col-6 lg:col-3">
          <div class="kpi-card shadow-1 p-4 bg-white border-round">
            <div class="flex justify-content-between mb-3">
              <div>
                <span class="block text-500 font-medium mb-3">Proyectos</span>
                <div class="text-900 font-bold text-3xl">{{ stats.activeProjects }}</div>
              </div>
              <div class="flex align-items-center justify-content-center bg-cyan-100 border-round" style="width:2.5rem;height:2.5rem">
                <i class="pi pi-briefcase text-cyan-500 text-xl"></i>
              </div>
            </div>
            <span class="text-green-500 font-medium">Activos </span>
            <span class="text-500">actualmente</span>
          </div>
        </div>

        <div class="col-12 md:col-6 lg:col-3">
          <div class="kpi-card shadow-1 p-4 bg-white border-round">
            <div class="flex justify-content-between mb-3">
              <div>
                <span class="block text-500 font-medium mb-3">Usuarios</span>
                <div class="text-900 font-bold text-3xl">{{ stats.totalUsers }}</div>
              </div>
              <div class="flex align-items-center justify-content-center bg-purple-100 border-round" style="width:2.5rem;height:2.5rem">
                <i class="pi pi-users text-purple-500 text-xl"></i>
              </div>
            </div>
            <span class="text-green-500 font-medium">Participantes </span>
            <span class="text-500">únicos</span>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="grid mb-4">
        <div class="col-12 lg:col-8">
          <div class="card shadow-1 p-4 bg-white border-round h-full">
            <h5 class="m-0 mb-4 font-bold">Actividad de Canjes (Últimos 7 días)</h5>
            <p-chart type="line" [data]="lineData" [options]="lineOptions"></p-chart>
          </div>
        </div>
        <div class="col-12 lg:col-4">
          <div class="card shadow-1 p-4 bg-white border-round h-full">
            <h5 class="m-0 mb-4 font-bold">Uso de Stock</h5>
            <p-chart type="doughnut" [data]="pieData" [options]="pieOptions"></p-chart>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="card shadow-1 p-4 bg-white border-round">
        <h5 class="m-0 mb-4 font-bold">Últimos Canjes Realizados</h5>
        <p-table [value]="recentRedemptions" [rows]="5" [responsiveLayout]="'scroll'">
          <ng-template pTemplate="header">
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Código</th>
              <th>Recompensa</th>
              <th>Usuario</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-reg>
            <tr>
              <td>{{ reg.idRegistro }}</td>
              <td>{{ reg.FechaRegistro | date:'short' }}</td>
              <td><span class="font-bold text-red-600">{{ reg.idCodigoEntrada }}</span></td>
              <td>Premio #{{ reg.idRecompensa }}</td>
              <td>User ID {{ reg.idUsuario }}</td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-wrapper { padding: 0.5rem; }
    .card { height: 100%; }
  `]
})
export class DashboardComponent implements OnInit {
  stats: any = { totalRedemptions: 0, availableCodes: 0, activeProjects: 0, totalUsers: 0 };
  lineData: any;
  lineOptions: any;
  pieData: any;
  pieOptions: any;
  recentRedemptions: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadStats();
    this.initCharts();
  }

  loadStats() {
    this.http.get<any>('backend/admin_api.php?action=dashboard_stats').subscribe(data => {
      this.stats = data;
    });
  }

  initCharts() {
    this.lineData = {
      labels: ['22 Abr', '23 Abr', '24 Abr', '25 Abr', '26 Abr', '27 Abr', '28 Abr'],
      datasets: [
        {
          label: 'Canjes Diarios',
          data: [45, 52, 38, 65, 48, 70, 85],
          fill: true,
          borderColor: '#e31b23',
          backgroundColor: 'rgba(227, 27, 35, 0.1)',
          tension: 0.4
        }
      ]
    };

    this.lineOptions = {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    };

    this.pieData = {
      labels: ['Utilizados', 'Disponibles'],
      datasets: [
        {
          data: [1234, 5678],
          backgroundColor: ['#e31b23', '#f1f5f9']
        }
      ]
    };

    this.pieOptions = {
      plugins: { legend: { position: 'bottom' } },
      cutout: '70%'
    };
  }
}
