import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, InputTextModule, DialogModule, FormsModule],
  template: `
    <div class="card shadow-1 p-4 bg-white border-round">
      <div class="flex justify-content-between align-items-center mb-4">
        <h2 class="m-0">Proyectos</h2>
        <button pButton label="Nuevo Proyecto" icon="pi pi-plus" class="p-button-danger" (click)="openNew()"></button>
      </div>

      <p-table [value]="projects" [paginator]="true" [rows]="10" [responsiveLayout]="'scroll'"
               [globalFilterFields]="['Proyecto']" #dt>
        <ng-template pTemplate="caption">
          <div class="flex justify-content-end">
            <span class="p-input-icon-left">
              <i class="pi pi-search"></i>
              <input pInputText type="text" (input)="dt.filterGlobal($any($event.target).value, 'contains')" placeholder="Buscar proyecto..." />
            </span>
          </div>
        </ng-template>
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="idProyecto">ID <p-sortIcon field="idProyecto"></p-sortIcon></th>
            <th pSortableColumn="Proyecto">Nombre <p-sortIcon field="Proyecto"></p-sortIcon></th>
            <th>Tipo</th>
            <th>PDF Template</th>
            <th>Acciones</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-project>
          <tr>
            <td>{{ project.idProyecto }}</td>
            <td>{{ project.Proyecto }}</td>
            <td>
              <span [class]="'badge status-' + project.multiRecompensa">
                {{ project.multiRecompensa == 1 ? 'Multi' : (project.multiRecompensa == 2 ? 'Directo' : 'Individual') }}
              </span>
            </td>
            <td>{{ project.nombrePdf }}</td>
            <td>
              <button pButton icon="pi pi-pencil" class="p-button-text p-button-secondary" (click)="editProject(project)"></button>
              <button pButton icon="pi pi-trash" class="p-button-text p-button-danger" (click)="deleteProject(project)"></button>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>

    <!-- Edit/New Dialog -->
    <p-dialog [(visible)]="projectDialog" [header]="'Detalles del Proyecto'" [modal]="true" styleClass="p-fluid" [style]="{width: '550px'}">
      <ng-template pTemplate="content">
        <div class="field mb-4">
          <label for="name">Nombre del Proyecto</label>
          <input type="text" pInputText id="name" [(ngModel)]="project.Proyecto" required autofocus />
        </div>
        <div class="formgrid grid">
          <div class="field col mb-4">
            <label>Tipo de Recompensa</label>
            <select class="p-inputtext" [(ngModel)]="project.multiRecompensa">
              <option [value]="0">Individual</option>
              <option [value]="1">Multirecompensa</option>
              <option [value]="2">Directo</option>
            </select>
          </div>
        </div>
        <div class="field mb-4">
          <label>Plantilla PDF</label>
          <input type="text" pInputText [(ngModel)]="project.nombrePdf" />
        </div>
        <div class="formgrid grid">
          <div class="field col">
            <label>Eje X</label>
            <input type="number" pInputText [(ngModel)]="project.ejeX" />
          </div>
          <div class="field col">
            <label>Eje Y</label>
            <input type="number" pInputText [(ngModel)]="project.ejeY" />
          </div>
        </div>
      </ng-template>
      <ng-template pTemplate="footer">
        <button pButton label="Cancelar" icon="pi pi-times" class="p-button-text" (click)="hideDialog()"></button>
        <button pButton label="Guardar" icon="pi pi-check" class="p-button-danger" (click)="saveProject()"></button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .status-0 { background: #dcfce7; color: #166534; }
    .status-1 { background: #fef9c3; color: #854d0e; }
    .status-2 { background: #dbeafe; color: #1e40af; }
  `]
})
export class ProjectsComponent implements OnInit {
  projects: any[] = [];
  project: any = {};
  projectDialog: boolean = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.http.get<any[]>('backend/admin_api.php?action=get_projects').subscribe(data => {
      this.projects = data;
    });
  }

  openNew() {
    this.project = { multiRecompensa: 0 };
    this.projectDialog = true;
  }

  editProject(project: any) {
    this.project = { ...project };
    this.projectDialog = true;
  }

  hideDialog() {
    this.projectDialog = false;
  }

  saveProject() {
    // Logic to call API
    this.projectDialog = false;
    Swal.fire('Guardado', 'El proyecto ha sido actualizado.', 'success');
  }

  deleteProject(project: any) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e31b23',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire('Eliminado', 'El proyecto ha sido borrado.', 'success');
      }
    });
  }
}
