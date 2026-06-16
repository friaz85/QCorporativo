import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, InputTextModule, DialogModule, CheckboxModule, DropdownModule, FormsModule],
  template: `
    <div class="card shadow-2 p-4 bg-white border-round">
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
            <td>{{ project.nombrePdf || 'Ninguno' }}</td>
            <td>
              <button pButton icon="pi pi-pencil" class="p-button-text p-button-secondary" (click)="editProject(project)"></button>
              <button pButton icon="pi pi-trash" class="p-button-text p-button-danger" (click)="deleteProject(project)"></button>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>

    <!-- Edit/New Dialog -->
    <p-dialog [(visible)]="projectDialog" [header]="'Detalles del Proyecto'" [modal]="true" styleClass="p-fluid" [style]="{width: '750px'}" [draggable]="false" [resizable]="false">
      <ng-template pTemplate="content">
        
        <!-- Premium Custom Tabs -->
        <div class="flex gap-2 mb-4 border-bottom-1 pb-2 surface-border">
          <button pButton type="button" label="General" class="p-button-text p-button-sm px-3 py-2" [ngClass]="{'p-button-danger font-bold': activeTab === 'general'}" (click)="activeTab = 'general'"></button>
          <button pButton type="button" label="Coordenadas PDF" class="p-button-text p-button-sm px-3 py-2" [ngClass]="{'p-button-danger font-bold': activeTab === 'coords'}" (click)="activeTab = 'coords'"></button>
          <button pButton type="button" label="Configuración Montos" class="p-button-text p-button-sm px-3 py-2" [ngClass]="{'p-button-danger font-bold': activeTab === 'montos'}" (click)="activeTab = 'montos'"></button>
          <button pButton type="button" label="Asociar Recompensas" class="p-button-text p-button-sm px-3 py-2" [ngClass]="{'p-button-danger font-bold': activeTab === 'rewards'}" (click)="activeTab = 'rewards'" *ngIf="project.multiRecompensa == 1"></button>
        </div>

        <!-- TAB: GENERAL -->
        <div *ngIf="activeTab === 'general'" class="fade-in">
          <div class="field mb-4">
            <label class="font-bold text-sm">Nombre del Proyecto</label>
            <input type="text" pInputText [(ngModel)]="project.Proyecto" required placeholder="Ej. Campaña Primavera" />
          </div>

          <div class="formgrid grid">
            <div class="field col mb-4">
              <label class="font-bold text-sm">Tipo de Recompensa</label>
              <select class="p-inputtext w-full" [(ngModel)]="project.multiRecompensa" (change)="onTypeChange()">
                <option [value]="0">Individual</option>
                <option [value]="1">Multirecompensa (El usuario elige)</option>
                <option [value]="2">Directo (Viene asignada en código)</option>
              </select>
            </div>
            <div class="field col mb-4 flex align-items-center gap-2 pt-4">
              <p-checkbox [(ngModel)]="project.Activo" [binary]="true" [trueValue]="1" [falseValue]="0" inputId="projActive"></p-checkbox>
              <label for="projActive" class="m-0 font-bold text-sm cursor-pointer">Proyecto Activo</label>
            </div>
          </div>

          <div class="formgrid grid">
            <div class="field col mb-4">
              <label class="font-bold text-sm">Fecha de Inicio</label>
              <input type="date" class="p-inputtext w-full" [(ngModel)]="project.FechaInicio" />
            </div>
            <div class="field col mb-4">
              <label class="font-bold text-sm">Fecha de Fin</label>
              <input type="date" class="p-inputtext w-full" [(ngModel)]="project.FechaFin" />
            </div>
          </div>

          <div class="formgrid grid">
            <div class="field col mb-4">
              <label class="font-bold text-sm">Participaciones Máx por Correo</label>
              <input type="number" pInputText [(ngModel)]="project.numeroParticipaciones" min="1" />
            </div>
            <div class="field col mb-4" *ngIf="project.multiRecompensa != 1">
              <label class="font-bold text-sm">Cantidad de Códigos a Imprimir</label>
              <input type="number" pInputText [(ngModel)]="project.numeroCodigos" min="1" max="4" />
            </div>
          </div>
        </div>

        <!-- TAB: COORDENADAS PDF -->
        <div *ngIf="activeTab === 'coords'" class="fade-in">
          <div class="formgrid grid">
            <div class="field col mb-4">
              <label class="font-bold text-sm">Plantilla PDF (.pdf)</label>
              <input type="text" pInputText [(ngModel)]="project.nombrePdf" placeholder="plantilla_cupon.pdf" />
            </div>
            <div class="field col mb-4">
              <label class="font-bold text-sm">Número de Páginas</label>
              <input type="number" pInputText [(ngModel)]="project.numeroPaginas" min="1" />
            </div>
          </div>

          <div class="formgrid grid">
            <div class="field col-6 mb-4">
              <label class="font-bold text-sm">Tamaño de Fuente Texto</label>
              <input type="number" pInputText [(ngModel)]="project.fuenteTexto" placeholder="12" />
            </div>
            <div class="field col-6 mb-4">
              <label class="font-bold text-sm">Color de Texto (Hex)</label>
              <input type="text" pInputText [(ngModel)]="project.colorTexto" placeholder="#000000" />
            </div>
          </div>

          <!-- Ejes dinámicos -->
          <div class="card p-3 surface-50 border-1 surface-border border-round mb-4">
            <h4 class="m-0 mb-3 text-800 border-bottom-1 surface-border pb-1">Coordenadas de Códigos (Ejes)</h4>
            
            <div class="formgrid grid mb-2">
              <div class="field col">
                <label class="text-xs">Eje X1</label>
                <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="project.ejeX" />
              </div>
              <div class="field col">
                <label class="text-xs">Eje Y1</label>
                <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="project.ejeY" />
              </div>
            </div>

            <div class="formgrid grid mb-2" *ngIf="project.numeroCodigos >= 2 || project.multiRecompensa == 1">
              <div class="field col">
                <label class="text-xs">Eje X2</label>
                <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="project.ejeX2" />
              </div>
              <div class="field col">
                <label class="text-xs">Eje Y2</label>
                <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="project.ejeY2" />
              </div>
            </div>

            <div class="formgrid grid mb-2" *ngIf="project.numeroCodigos >= 3 || project.multiRecompensa == 1">
              <div class="field col">
                <label class="text-xs">Eje X3</label>
                <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="project.ejeX3" />
              </div>
              <div class="field col">
                <label class="text-xs">Eje Y3</label>
                <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="project.ejeY3" />
              </div>
            </div>

            <div class="formgrid grid mb-2" *ngIf="project.numeroCodigos >= 4 || project.multiRecompensa == 1">
              <div class="field col">
                <label class="text-xs">Eje X4</label>
                <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="project.ejeX4" />
              </div>
              <div class="field col">
                <label class="text-xs">Eje Y4</label>
                <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="project.ejeY4" />
              </div>
            </div>
          </div>
        </div>

        <!-- TAB: CONFIGURACIÓN MONTOS -->
        <div *ngIf="activeTab === 'montos'" class="fade-in">
          <div class="formgrid grid align-items-center mb-4">
            <div class="field col-6 mb-0">
              <label class="font-bold text-sm">Monto Recarga / Por Defecto</label>
              <input type="text" pInputText [(ngModel)]="project.MontoRecarga" placeholder="100.00" />
            </div>
            <div class="field col-6 mb-0 flex align-items-center gap-2 pt-4">
              <p-checkbox [(ngModel)]="project.montoVariable" [binary]="true" [trueValue]="'1'" [falseValue]="'0'" inputId="variableAmount"></p-checkbox>
              <label for="variableAmount" class="m-0 font-bold text-sm cursor-pointer">Imprimir Monto Variable en PDF</label>
            </div>
          </div>

          <div class="card p-3 surface-50 border-1 surface-border border-round mb-4" *ngIf="project.montoVariable == '1'">
            <h4 class="m-0 mb-3 text-800 border-bottom-1 surface-border pb-1">Configuración del Monto Impreso</h4>
            <div class="formgrid grid mb-3">
              <div class="field col-6">
                <label class="text-xs">Eje X (Monto)</label>
                <input type="number" pInputText [(ngModel)]="project.ejeXMonto" />
              </div>
              <div class="field col-6">
                <label class="text-xs">Eje Y (Monto)</label>
                <input type="number" pInputText [(ngModel)]="project.ejeYMonto" />
              </div>
            </div>

            <div class="formgrid grid">
              <div class="field col-6">
                <label class="text-xs">Tamaño de Fuente Monto</label>
                <input type="number" pInputText [(ngModel)]="project.fuenteTextoMonto" placeholder="12" />
              </div>
              <div class="field col-6">
                <label class="text-xs">Color de Monto (Hex)</label>
                <input type="text" pInputText [(ngModel)]="project.colorTextoMonto" placeholder="#000000" />
              </div>
            </div>
          </div>
        </div>

        <!-- TAB: RECOMPENSAS ASOCIADAS -->
        <div *ngIf="activeTab === 'rewards' && project.multiRecompensa == 1" class="fade-in">
          <div class="card p-3 border-1 surface-border mb-4 border-round surface-50">
            <h4 class="m-0 mb-3 text-800">Asociar Nueva Recompensa</h4>
            <div class="flex gap-2">
              <p-dropdown [options]="availableRewardsOptions" [(ngModel)]="selectedRewardToAdd" 
                          optionLabel="Nombre" placeholder="Selecciona una Recompensa" class="w-full"></p-dropdown>
              <button pButton label="Agregar" icon="pi pi-plus" class="p-button-danger w-auto" style="width:120px !important" (click)="addRewardRelation()"></button>
            </div>
          </div>

          <h4 class="mb-2">Configuración por Recompensa Asociada</h4>
          <div class="accordion-container flex flex-column gap-3 pr-2" style="max-height: 25rem; overflow-y: auto;">
            <div *ngFor="let rel of associatedRewards; let i = index" class="p-3 border-1 surface-border border-round bg-white shadow-1 relative">
              <button pButton icon="pi pi-times" class="p-button-rounded p-button-danger p-button-text absolute top-0 right-0 m-2" 
                      style="width: 30px !important; height: 30px !important; padding: 0 !important" (click)="removeRewardRelation(i)"></button>
              
              <h5 class="m-0 mb-3 text-red-600 font-bold">{{ rel.Nombre }}</h5>

              <div class="formgrid grid">
                <div class="field col-6 mb-3">
                  <label class="text-xs font-bold">Plantilla PDF</label>
                  <input type="text" pInputText class="p-inputtext-sm" [(ngModel)]="rel.nombrePdf" placeholder="cupon_personalizado.pdf" />
                </div>
                <div class="field col-3 mb-3">
                  <label class="text-xs font-bold">Núm Páginas</label>
                  <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="rel.numeroPaginas" />
                </div>
                <div class="field col-3 mb-3">
                  <label class="text-xs font-bold">Límite Códigos</label>
                  <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="rel.numeroCodigos" />
                </div>
              </div>

              <div class="formgrid grid">
                <div class="field col-3 mb-3">
                  <label class="text-xs font-bold">Eje X1</label>
                  <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="rel.ejeX" />
                </div>
                <div class="field col-3 mb-3">
                  <label class="text-xs font-bold">Eje Y1</label>
                  <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="rel.ejeY" />
                </div>
                <div class="field col-3 mb-3">
                  <label class="text-xs font-bold">Eje X2</label>
                  <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="rel.ejeX2" />
                </div>
                <div class="field col-3 mb-3">
                  <label class="text-xs font-bold">Eje Y2</label>
                  <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="rel.ejeY2" />
                </div>
              </div>

              <div class="formgrid grid">
                <div class="field col-3 mb-3">
                  <label class="text-xs font-bold">Eje X3</label>
                  <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="rel.ejeX3" />
                </div>
                <div class="field col-3 mb-3">
                  <label class="text-xs font-bold">Eje Y3</label>
                  <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="rel.ejeY3" />
                </div>
                <div class="field col-3 mb-3">
                  <label class="text-xs font-bold">Eje X4</label>
                  <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="rel.ejeX4" />
                </div>
                <div class="field col-3 mb-3">
                  <label class="text-xs font-bold">Eje Y4</label>
                  <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="rel.ejeY4" />
                </div>
              </div>

              <div class="formgrid grid">
                <div class="field col-6 mb-3">
                  <label class="text-xs font-bold">Fuente Texto</label>
                  <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="rel.fuenteTexto" />
                </div>
                <div class="field col-6 mb-3">
                  <label class="text-xs font-bold">Color Texto</label>
                  <input type="text" pInputText class="p-inputtext-sm" [(ngModel)]="rel.colorTexto" placeholder="#000000" />
                </div>
              </div>

              <div class="formgrid grid">
                <div class="field col-4 mb-3">
                  <label class="text-xs font-bold">Monto Recarga</label>
                  <input type="text" pInputText class="p-inputtext-sm" [(ngModel)]="rel.MontoRecarga" placeholder="100.00" />
                </div>
                <div class="field col-4 mb-3">
                  <label class="text-xs font-bold">Eje X Monto</label>
                  <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="rel.ejeXMonto" />
                </div>
                <div class="field col-4 mb-3">
                  <label class="text-xs font-bold">Eje Y Monto</label>
                  <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="rel.ejeYMonto" />
                </div>
              </div>

              <div class="formgrid grid align-items-center">
                <div class="field col-6 mb-0 flex align-items-center gap-2 pt-2">
                  <p-checkbox [(ngModel)]="rel.montoVariable" [binary]="true" [trueValue]="1" [falseValue]="0" inputId="variableMonto-{{i}}"></p-checkbox>
                  <label for="variableMonto-{{i}}" class="m-0 text-xs font-bold cursor-pointer">Imprimir Monto</label>
                </div>
                <div class="field col-3 mb-0" *ngIf="rel.montoVariable == 1">
                  <label class="text-xs font-bold">Fuente Monto</label>
                  <input type="number" pInputText class="p-inputtext-sm" [(ngModel)]="rel.fuenteTextoMonto" />
                </div>
                <div class="field col-3 mb-0" *ngIf="rel.montoVariable == 1">
                  <label class="text-xs font-bold">Color Monto</label>
                  <input type="text" pInputText class="p-inputtext-sm" [(ngModel)]="rel.colorTextoMonto" placeholder="#000000" />
                </div>
              </div>
            </div>
            
            <div *ngIf="associatedRewards.length === 0" class="text-center p-4 text-500 surface-100 border-round">
              No hay recompensas asociadas a este proyecto todavía.
            </div>
          </div>
        </div>

      </ng-template>
      <ng-template pTemplate="footer">
        <button pButton label="Cancelar" icon="pi pi-times" class="p-button-text" (click)="hideDialog()"></button>
        <button pButton label="Guardar Proyecto" icon="pi pi-check" class="p-button-danger" (click)="saveProject()"></button>
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
    .fade-in {
      animation: fadeIn 0.35s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ProjectsComponent implements OnInit {
  projects: any[] = [];
  project: any = {};
  allRewards: any[] = [];
  availableRewardsOptions: any[] = [];
  associatedRewards: any[] = [];
  selectedRewardToAdd: any = null;
  projectDialog: boolean = false;
  activeTab: string = 'general';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadProjects();
    this.loadRewards();
  }

  loadProjects() {
    this.http.get<any[]>('backend/admin_api.php?action=get_projects').subscribe(data => {
      this.projects = data;
    });
  }

  loadRewards() {
    this.http.get<any[]>('backend/admin_api.php?action=get_rewards').subscribe(data => {
      this.allRewards = data;
      this.filterAvailableRewards();
    });
  }

  filterAvailableRewards() {
    this.availableRewardsOptions = this.allRewards.filter(rew => {
      return !this.associatedRewards.some(assoc => assoc.idRecompensa === rew.idRecompensa);
    });
  }

  loadProjectRewards(idProyecto: number) {
    this.http.get<any[]>(`backend/admin_api.php?action=get_project_rewards&idProyecto=${idProyecto}`).subscribe(data => {
      this.associatedRewards = data.map(r => ({
        ...r,
        montoVariable: parseInt(r.montoVariable) || 0
      }));
      this.filterAvailableRewards();
    });
  }

  onTypeChange() {
    if (this.project.multiRecompensa == 1 && this.activeTab === 'rewards') {
      // Keep it on rewards tab
    } else if (this.project.multiRecompensa != 1 && this.activeTab === 'rewards') {
      this.activeTab = 'general';
    }
    this.filterAvailableRewards();
  }

  openNew() {
    this.project = {
      multiRecompensa: 0,
      Activo: 1,
      numeroPaginas: 1,
      numeroCodigos: 1,
      numeroParticipaciones: 1,
      montoVariable: '0'
    };
    this.associatedRewards = [];
    this.activeTab = 'general';
    this.filterAvailableRewards();
    this.projectDialog = true;
  }

  editProject(project: any) {
    this.project = { ...project };
    this.associatedRewards = [];
    this.activeTab = 'general';
    this.loadProjectRewards(project.idProyecto);
    this.projectDialog = true;
  }

  hideDialog() {
    this.projectDialog = false;
  }

  addRewardRelation() {
    if (!this.selectedRewardToAdd) return;
    
    const newRelation = {
      idRecompensa: this.selectedRewardToAdd.idRecompensa,
      Nombre: this.selectedRewardToAdd.Nombre,
      Activo: 1,
      numeroCodigos: 1,
      nombrePdf: this.project.nombrePdf || '',
      ejeX: this.project.ejeX || null,
      ejeY: this.project.ejeY || null,
      ejeX2: this.project.ejeX2 || null,
      ejeY2: this.project.ejeY2 || null,
      ejeX3: this.project.ejeX3 || null,
      ejeY3: this.project.ejeY3 || null,
      ejeX4: this.project.ejeX4 || null,
      ejeY4: this.project.ejeY4 || null,
      ejeXMonto: this.project.ejeXMonto || null,
      ejeYMonto: this.project.ejeYMonto || null,
      montoVariable: parseInt(this.project.montoVariable) || 0,
      fuenteTexto: this.project.fuenteTexto || 12,
      colorTexto: this.project.colorTexto || null,
      colorTextoMonto: this.project.colorTextoMonto || null,
      fuenteTextoMonto: this.project.fuenteTextoMonto || 12,
      MontoRecarga: this.project.MontoRecarga || null,
      numeroPaginas: this.project.numeroPaginas || 1
    };

    this.associatedRewards.push(newRelation);
    this.selectedRewardToAdd = null;
    this.filterAvailableRewards();
  }

  removeRewardRelation(index: number) {
    this.associatedRewards.splice(index, 1);
    this.filterAvailableRewards();
  }

  saveProject() {
    if (!this.project.Proyecto) {
      Swal.fire('Error', 'El nombre del proyecto es requerido.', 'error');
      return;
    }

    this.http.post('backend/admin_api.php?action=save_project', this.project).subscribe({
      next: (res: any) => {
        const idProyecto = res.idProyecto;
        
        if (this.project.multiRecompensa == 1) {
          // Guardar asociaciones de recompensas
          const payload = {
            idProyecto: idProyecto,
            rewards: this.associatedRewards
          };
          
          this.http.post('backend/admin_api.php?action=save_project_rewards', payload).subscribe({
            next: () => {
              this.projectDialog = false;
              this.loadProjects();
              Swal.fire('Guardado', 'El proyecto y sus recompensas fueron guardados.', 'success');
            },
            error: () => {
              Swal.fire('Error', 'Se guardó el proyecto pero falló el registro de recompensas.', 'warning');
            }
          });
        } else {
          this.projectDialog = false;
          this.loadProjects();
          Swal.fire('Guardado', 'El proyecto ha sido guardado con éxito.', 'success');
        }
      },
      error: () => {
        Swal.fire('Error', 'No se pudo guardar el proyecto.', 'error');
      }
    });
  }

  deleteProject(project: any) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Esta acción eliminará el proyecto "${project.Proyecto}" y todas sus asociaciones.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e31b23',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.get(`backend/admin_api.php?action=delete_project&id=${project.idProyecto}`).subscribe({
          next: () => {
            this.loadProjects();
            Swal.fire('Eliminado', 'El proyecto ha sido borrado.', 'success');
          },
          error: () => {
            Swal.fire('Error', 'No se pudo eliminar el proyecto.', 'error');
          }
        });
      }
    });
  }
}
