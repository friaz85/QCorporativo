import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-codes',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, InputTextModule, DropdownModule, TagModule, DialogModule, FileUploadModule, FormsModule],
  template: `
    <div class="card shadow-1 p-4 bg-white border-round">
      <div class="flex justify-content-between align-items-center mb-4">
        <h2 class="m-0">Gestión de Códigos</h2>
        <div class="flex gap-2">
          <button pButton label="Descargar Layout" icon="pi pi-download" class="p-button-outlined p-button-secondary" (click)="downloadLayout()"></button>
          <button pButton label="Carga Masiva" icon="pi pi-upload" class="p-button-danger" (click)="showUploadDialog = true"></button>
        </div>
      </div>

      <p-table [value]="codes" [paginator]="true" [rows]="10" [responsiveLayout]="'scroll'"
               [globalFilterFields]="['Codigo']" #dt [loading]="loading">
        <ng-template pTemplate="caption">
          <div class="flex justify-content-between">
            <p-dropdown [options]="projects" [(ngModel)]="selectedProject" optionLabel="Proyecto" 
                        placeholder="Filtrar por Proyecto" (onChange)="onProjectChange()"></p-dropdown>
            <span class="p-input-icon-left">
              <i class="pi pi-search"></i>
              <input pInputText type="text" (input)="dt.filterGlobal($any($event.target).value, 'contains')" placeholder="Buscar código..." />
            </span>
          </div>
        </ng-template>
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="idCodigoEntrada">ID <p-sortIcon field="idCodigoEntrada"></p-sortIcon></th>
            <th pSortableColumn="Codigo">Código <p-sortIcon field="Codigo"></p-sortIcon></th>
            <th>Proyecto</th>
            <th pSortableColumn="Activo">Estado <p-sortIcon field="Activo"></p-sortIcon></th>
            <th>Acciones</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-code>
          <tr>
            <td>{{ code.idCodigoEntrada }}</td>
            <td class="font-bold">{{ code.Codigo }}</td>
            <td>{{ getProjectName(code.idProyecto) }}</td>
            <td>
              <p-tag [severity]="code.Activo == 1 ? 'success' : 'danger'" 
                     [value]="code.Activo == 1 ? 'Disponible' : 'Utilizado'"></p-tag>
            </td>
            <td>
              <button pButton icon="pi pi-trash" class="p-button-text p-button-danger" (click)="deleteCode(code)"></button>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>

    <!-- Upload Dialog -->
    <p-dialog header="Carga Masiva de Códigos" [(visible)]="showUploadDialog" [modal]="true" [style]="{width: '500px'}">
      <div class="p-fluid">
        <div class="field mb-4">
          <label class="block mb-2 font-bold">Tipo de Carga</label>
          <div class="flex gap-4">
            <div class="flex align-items-center">
              <input type="radio" id="entrada" name="type" [(ngModel)]="uploadType" value="entrada" class="mr-2">
              <label for="entrada">Entrada</label>
            </div>
            <div class="flex align-items-center">
              <input type="radio" id="salida" name="type" [(ngModel)]="uploadType" value="salida" class="mr-2">
              <label for="salida">Salida</label>
            </div>
          </div>
        </div>

        <p-fileUpload name="file" [url]="'backend/admin_api.php?action=upload_codes&type=' + uploadType" 
                      [auto]="true" accept=".csv" (onUpload)="onUploadSuccess($event)"
                      [maxFileSize]="1000000" label="Seleccionar CSV" chooseLabel="Subir Archivo CSV"
                      class="w-full">
        </p-fileUpload>
        
        <p class="mt-3 text-sm text-secondary">Asegúrate de que el archivo CSV siga el formato del layout descargable.</p>
      </div>
    </p-dialog>
  `
})
export class CodesComponent implements OnInit {
  codes: any[] = [];
  projects: any[] = [];
  selectedProject: any = null;
  loading: boolean = false;
  showUploadDialog: boolean = false;
  uploadType: string = 'entrada';

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
    this.http.get<any[]>('backend/admin_api.php?action=get_codes').subscribe(data => {
      this.codes = data;
      this.loading = false;
    });
  }

  onProjectChange() {
    // Filter codes logic...
  }

  downloadLayout() {
    window.open(`backend/admin_api.php?action=download_layout&type=${this.uploadType}`, '_blank');
  }

  onUploadSuccess(event: any) {
    const res = event.originalEvent.body;
    this.showUploadDialog = false;
    Swal.fire({
      title: 'Carga Completada',
      text: `Se importaron ${res.imported} registros. Errores/Duplicados: ${res.errors}`,
      icon: 'success'
    });
    this.loadCodes();
  }

  getProjectName(id: number) {
    return this.projects.find(p => p.idProyecto === id)?.Proyecto || 'Desconocido';
  }

  deleteCode(code: any) {
    // Logic for delete...
  }
}