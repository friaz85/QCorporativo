import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-codes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="topbar">
      <h1 class="topbar-title">Gestión de Códigos de Entrada</h1>
      <div class="topbar-breadcrumb">/ Gestión / <span>Códigos</span></div>
      <div class="topbar-right">
        <button class="btn btn-secondary" (click)="downloadLayout()">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Descargar Layout
        </button>
        <button class="btn btn-primary" (click)="showUploadDialog = true">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
          Carga Masiva
        </button>
      </div>
    </header>

    <div class="page-content">
      <div class="card">
        <div class="card-header">
          <div class="search-bar" style="width: 100%; justify-content: space-between;">
            <select class="form-control" style="width: auto; min-width: 200px;" [(ngModel)]="selectedProjectId" (change)="onProjectChange()">
              <option [value]="null">Filtrar por Proyecto...</option>
              <option *ngFor="let p of projects" [value]="p.idProyecto">{{ p.Proyecto }}</option>
            </select>

            <div class="search-input-wrapper">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input type="text" class="form-control" [(ngModel)]="searchQuery" (input)="onSearch()" placeholder="Buscar código..." />
            </div>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Código</th>
                <th>Proyecto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of filteredCodes">
                <td>{{ c.idCodigoEntrada }}</td>
                <td class="font-bold" style="color: var(--3m-red);">{{ c.CodigoEntrada }}</td>
                <td>{{ getProjectName(c.idProyecto) }}</td>
                <td>
                  <span class="badge" [class.badge-approved]="c.Activo == 1" [class.badge-rejected]="c.Activo != 1">
                    {{ c.Activo == 1 ? 'Disponible' : 'Utilizado' }}
                  </span>
                </td>
              </tr>
              <tr *ngIf="loading">
                <td colspan="4" style="text-align: center; color: var(--gray-400); padding: 30px;">
                  <span class="spinner-sm" style="margin-right: 8px;"></span> Cargando códigos...
                </td>
              </tr>
              <tr *ngIf="!loading && !filteredCodes.length">
                <td colspan="4" style="text-align: center; color: var(--gray-400); padding: 30px;">
                  No se encontraron códigos registrados.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ══ UPLOAD MODAL ══ -->
    <div class="modal-overlay" *ngIf="showUploadDialog" (click)="showUploadDialog = false">
      <div class="modal" style="width: min(500px, 96vw);" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <span class="modal-title">Carga Masiva de Códigos</span>
          <button class="modal-close" (click)="showUploadDialog = false">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="modal-body" style="padding: 22px;">
          <div class="form-group">
            <label class="form-label" style="margin-bottom: 12px;">Tipo de Carga</label>
            <div style="display: flex; gap: 20px;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 600;">
                <input type="radio" name="uploadType" [(ngModel)]="uploadType" value="entrada" />
                Códigos de Entrada
              </label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 600;">
                <input type="radio" name="uploadType" [(ngModel)]="uploadType" value="salida" />
                Códigos de Salida
              </label>
            </div>
          </div>

          <div style="background:#f8fafc; border:2px dashed var(--gray-200); border-radius:10px; padding:30px; text-align:center; margin-bottom:16px;">
            <svg width="32" height="32" fill="none" stroke="var(--gray-400)" viewBox="0 0 24 24" style="margin:0 auto 12px; display:block;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            <input type="file" accept=".csv" (change)="onFileSelected($event)" style="font-size:13px;" />
          </div>

          <p style="font-size: 12px; color: var(--gray-400);">Asegúrate de que el archivo CSV siga el formato del layout descargable.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="showUploadDialog = false">Cancelar</button>
          <button class="btn btn-primary" [disabled]="uploading || !selectedFile" (click)="uploadFile()">
            {{ uploading ? 'Subiendo...' : 'Subir Archivo' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class CodesComponent implements OnInit {
  codes: any[] = [];
  filteredCodes: any[] = [];
  projects: any[] = [];
  selectedProjectId: any = null;
  searchQuery: string = '';
  loading: boolean = false;
  showUploadDialog: boolean = false;
  uploadType: string = 'entrada';

  selectedFile: File | null = null;
  uploading: boolean = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadProjects();
    this.loadCodes();
  }

  loadProjects() {
    this.http.get<any[]>('backend/admin_api.php?action=get_projects').subscribe(data => {
      this.projects = data;
    });
  }

  loadCodes() {
    this.loading = true;
    this.http.get<any[]>('backend/admin_api.php?action=get_codes').subscribe({
      next: data => {
        this.codes = data;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onProjectChange() {
    this.applyFilters();
  }

  onSearch() {
    this.applyFilters();
  }

  applyFilters() {
    this.filteredCodes = this.codes.filter(c => {
      const matchProject = !this.selectedProjectId || this.selectedProjectId === 'null' || c.idProyecto == this.selectedProjectId;
      const matchQuery = !this.searchQuery || c.CodigoEntrada.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchProject && matchQuery;
    });
  }

  downloadLayout() {
    window.open(`backend/admin_api.php?action=download_layout&type=${this.uploadType}`, '_blank');
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.selectedFile = input.files[0];
    }
  }

  uploadFile() {
    if (!this.selectedFile) return;
    this.uploading = true;
    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.http.post(`backend/admin_api.php?action=upload_codes&type=${this.uploadType}`, formData).subscribe({
      next: (res: any) => {
        this.uploading = false;
        this.showUploadDialog = false;
        this.selectedFile = null;
        Swal.fire({
          title: 'Carga Completada',
          text: `Se importaron ${res.imported} registros. Errores/Duplicados: ${res.errors}`,
          icon: 'success'
        });
        this.loadCodes();
      },
      error: () => {
        this.uploading = false;
        Swal.fire('Error', 'No se pudo subir el archivo.', 'error');
      }
    });
  }

  getProjectName(id: number) {
    return this.projects.find(p => p.idProyecto == id)?.Proyecto || 'Desconocido';
  }
}