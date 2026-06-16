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
  selector: 'app-rewards',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, InputTextModule, DialogModule, CheckboxModule, DropdownModule, FormsModule],
  template: `
    <div class="card shadow-1 p-4 bg-white border-round">
      <div class="flex justify-content-between align-items-center mb-4">
        <h2 class="m-0">Recompensas</h2>
        <button pButton label="Nueva Recompensa" icon="pi pi-plus" class="p-button-danger" (click)="openNew()"></button>
      </div>

      <p-table [value]="rewards" [paginator]="true" [rows]="10" [responsiveLayout]="'scroll'"
               [globalFilterFields]="['Nombre']" #dt>
        <ng-template pTemplate="caption">
          <div class="flex justify-content-end">
            <span class="p-input-icon-left">
              <i class="pi pi-search"></i>
              <input pInputText type="text" (input)="dt.filterGlobal($any($event.target).value, 'contains')" placeholder="Buscar recompensa..." />
            </span>
          </div>
        </ng-template>
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="idRecompensa">ID <p-sortIcon field="idRecompensa"></p-sortIcon></th>
            <th pSortableColumn="Nombre">Nombre <p-sortIcon field="Nombre"></p-sortIcon></th>
            <th>Monto</th>
            <th>Tipo</th>
            <th pSortableColumn="Activo">Estado <p-sortIcon field="Activo"></p-sortIcon></th>
            <th>Acciones</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-reward>
          <tr>
            <td>{{ reward.idRecompensa }}</td>
            <td>{{ reward.Nombre }}</td>
            <td>{{ reward.Monto | currency }}</td>
            <td>
              <span [class]="'badge ' + (reward.TA == 1 ? 'type-ta' : 'type-pdf')">
                {{ reward.TA == 1 ? 'Tiempo Aire' : 'Cupón PDF' }}
              </span>
            </td>
            <td>
              <span [class]="'status-badge ' + (reward.Activo == 1 ? 'active' : 'inactive')">
                {{ reward.Activo == 1 ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td>
              <button pButton icon="pi pi-pencil" class="p-button-text p-button-secondary" (click)="editReward(reward)"></button>
              <button pButton icon="pi pi-ticket" class="p-button-text p-button-success" (click)="openCodesModal(reward)" title="Gestionar Códigos de Salida"></button>
              <button pButton icon="pi pi-trash" class="p-button-text p-button-danger" (click)="deleteReward(reward)"></button>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>

    <!-- Codes Management Dialog -->
    <p-dialog [(visible)]="codesDialog" [header]="'Gestionar Códigos de Salida - ' + activeRewardName" [modal]="true" styleClass="p-fluid" [style]="{width: '650px'}">
      <ng-template pTemplate="content">
        <div class="field mb-4">
          <label class="font-bold">Asociar al Proyecto</label>
          <p-dropdown [options]="projects" [(ngModel)]="selectedProject" optionLabel="Proyecto" placeholder="Selecciona un Proyecto"></p-dropdown>
        </div>

        <div class="field mb-4">
          <label class="font-bold">Carga Masiva por CSV</label>
          <input type="file" (change)="onCsvChange($event)" accept=".csv" class="p-inputtext" style="padding: 0.5rem;" />
          <small class="text-secondary block mt-1">Formato: códigos separados por coma, hasta 8 por fila.</small>
        </div>

        <div class="field mb-4">
          <label class="font-bold">Pegar Códigos de Salida (un registro por línea, hasta 8 por fila separados por comas)</label>
          <textarea pInputTextarea [(ngModel)]="newCodesText" rows="6" class="w-full p-inputtext" style="height: auto;" placeholder="Cod1,Cod2,Cod3&#10;Cod4,Cod5"></textarea>
          <div class="text-sm text-secondary mt-1">{{ countNewCodes() }} filas detectadas</div>
        </div>

        <div class="flex justify-content-end mb-4">
          <button pButton label="Agregar Códigos" icon="pi pi-plus" class="p-button-danger w-auto" (click)="addExitCodes()"></button>
        </div>

        <div class="field">
          <label class="font-bold mb-2 block">Lista de Códigos Registrados (Últimos 1000)</label>
          <p-table [value]="exitCodes" [paginator]="true" [rows]="10" [responsiveLayout]="'scroll'" class="text-sm">
            <ng-template pTemplate="header">
              <tr>
                 <th>Código 1</th>
                 <th>Código 2</th>
                 <th>Estado</th>
                 <th>Acciones</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-ec>
              <tr>
                 <td>{{ ec.CodigoSalida }}</td>
                 <td>{{ ec.CodigoSalida2 || '—' }}</td>
                 <td>
                   <span [class]="'status-badge ' + (ec.Activo == 1 ? 'active' : 'inactive')">
                     {{ ec.Activo == 1 ? 'Disponible' : 'Utilizado' }}
                   </span>
                 </td>
                 <td>
                   <button pButton icon="pi pi-trash" class="p-button-text p-button-danger p-0" style="width: 24px; height: 24px" (click)="deleteExitCode(ec)"></button>
                 </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      </ng-template>
      <ng-template pTemplate="footer">
        <button pButton label="Cerrar" icon="pi pi-times" class="p-button-text" (click)="codesDialog = false"></button>
      </ng-template>
    </p-dialog>

    <!-- Edit Dialog -->
    <p-dialog [(visible)]="rewardDialog" [header]="'Detalles de Recompensa'" [modal]="true" styleClass="p-fluid" [style]="{width: '550px'}">
      <ng-template pTemplate="content">
        <div class="field mb-4">
          <label for="name">Nombre</label>
          <input type="text" pInputText id="name" [(ngModel)]="reward.Nombre" required />
        </div>
        
        <div class="formgrid grid">
          <div class="field col mb-4">
            <label>Monto</label>
            <input type="text" pInputText [(ngModel)]="reward.Monto" placeholder="0.00" />
          </div>
          <div class="field col mb-4 flex align-items-center gap-2" style="padding-top: 1.5rem">
            <p-checkbox [(ngModel)]="reward.TA" [binary]="true" inputId="ta"></p-checkbox>
            <label for="ta" class="m-0">Es Tiempo Aire</label>
          </div>
        </div>

        <div class="field mb-4" *ngIf="reward.TA">
          <label>Código de Recarga (Taecel SKU)</label>
          <input type="text" pInputText [(ngModel)]="reward.CodigoRecarga" />
        </div>

        <div class="field mb-4">
          <label>Mensaje Personalizado</label>
          <textarea pInputTextarea [(ngModel)]="reward.Mensaje" rows="3" class="w-full p-inputtext" style="height: auto;"></textarea>
        </div>

        <div class="field-checkbox mb-4">
          <p-checkbox [(ngModel)]="reward.Activo" [binary]="true" [trueValue]="1" [falseValue]="0" inputId="active"></p-checkbox>
          <label for="active">Activo</label>
        </div>
      </ng-template>
      <ng-template pTemplate="footer">
        <button pButton label="Cancelar" icon="pi pi-times" class="p-button-text" (click)="hideDialog()"></button>
        <button pButton label="Guardar" icon="pi pi-check" class="p-button-danger" (click)="saveReward()"></button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 700; }
    .type-ta { background: #fee2e2; color: #991b1b; }
    .type-pdf { background: #e0f2fe; color: #075985; }
    .status-badge { padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
    .active { background: #dcfce7; color: #166534; }
    .inactive { background: #f1f5f9; color: #64748b; }
  `]
})
export class RewardsComponent implements OnInit {
  rewards: any[] = [];
  reward: any = {};
  rewardDialog: boolean = false;

  // Exit codes state
  codesDialog: boolean = false;
  activeRewardName: string = '';
  activeRewardId: number = 0;
  projects: any[] = [];
  selectedProject: any = null;
  newCodesText: string = '';
  exitCodes: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadRewards();
    this.loadProjects();
  }

  loadRewards() {
    this.http.get<any[]>('backend/admin_api.php?action=get_rewards').subscribe(data => {
      this.rewards = data;
    });
  }

  loadProjects() {
    this.http.get<any[]>('backend/admin_api.php?action=get_projects').subscribe(data => {
      this.projects = data;
    });
  }

  openNew() {
    this.reward = { Activo: 1, TA: false };
    this.rewardDialog = true;
  }

  editReward(reward: any) {
    this.reward = { ...reward, TA: !!reward.TA };
    this.rewardDialog = true;
  }

  hideDialog() {
    this.rewardDialog = false;
  }

  saveReward() {
    const rewardPayload = {
      ...this.reward,
      TA: this.reward.TA ? 1 : 0
    };

    this.http.post('backend/admin_api.php?action=save_reward', rewardPayload).subscribe({
      next: (res: any) => {
        this.rewardDialog = false;
        this.loadRewards();
        Swal.fire('Guardado', 'Recompensa guardada con éxito.', 'success');
      },
      error: (err) => {
        Swal.fire('Error', 'No se pudo guardar la recompensa.', 'error');
      }
    });
  }

  deleteReward(reward: any) {
    Swal.fire({
      title: '¿Eliminar recompensa?',
      text: `¿Estás seguro de que deseas eliminar la recompensa "${reward.Nombre}"? Esto también eliminará sus asociaciones en proyectos.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e31b23',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.get(`backend/admin_api.php?action=delete_reward&id=${reward.idRecompensa}`).subscribe({
          next: () => {
            this.loadRewards();
            Swal.fire('Eliminado', 'La recompensa ha sido borrada.', 'success');
          },
          error: (err) => {
            Swal.fire('Error', 'No se pudo eliminar la recompensa.', 'error');
          }
        });
      }
    });
  }

  // --- EXIT CODES METHODS ---
  openCodesModal(reward: any) {
    this.activeRewardId = reward.idRecompensa;
    this.activeRewardName = reward.Nombre;
    this.newCodesText = '';
    this.selectedProject = null;
    this.exitCodes = [];
    this.codesDialog = true;
    this.loadExitCodes();
  }

  loadExitCodes() {
    this.http.get<any[]>(`backend/admin_api.php?action=get_exit_codes&idRecompensa=${this.activeRewardId}`).subscribe({
      next: data => {
        this.exitCodes = data;
      }
    });
  }

  countNewCodes(): number {
    return this.newCodesText.split('\n').filter(line => line.trim()).length;
  }

  onCsvChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      this.newCodesText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    };
    reader.readAsText(file);
    (event.target as HTMLInputElement).value = '';
  }

  addExitCodes() {
    if (!this.selectedProject) {
      Swal.fire('Error', 'Por favor selecciona un proyecto al cual asociar los códigos.', 'error');
      return;
    }
    if (!this.newCodesText.trim()) {
      Swal.fire('Error', 'Por favor ingresa o carga al menos un código.', 'error');
      return;
    }

    const rows = this.newCodesText.split('\n')
      .filter(line => line.trim())
      .map(line => line.split(',').map(x => x.trim()));

    const payload = {
      idRecompensa: this.activeRewardId,
      idProyecto: this.selectedProject.idProyecto,
      codes: rows
    };

    this.http.post('backend/admin_api.php?action=add_exit_codes', payload).subscribe({
      next: (res: any) => {
        Swal.fire('Completado', `Se importaron ${res.imported} registros. Errores/Duplicados: ${res.errors}`, 'success');
        this.newCodesText = '';
        this.loadExitCodes();
      },
      error: () => {
        Swal.fire('Error', 'No se pudieron agregar los códigos.', 'error');
      }
    });
  }

  deleteExitCode(ec: any) {
    Swal.fire({
      title: '¿Eliminar código?',
      text: '¿Estás seguro de que deseas eliminar este código de salida de la base de datos?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e31b23',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.http.get(`backend/admin_api.php?action=delete_exit_code&id=${ec.idCodigoSalida}`).subscribe({
          next: () => {
            this.loadExitCodes();
            Swal.fire('Eliminado', 'El código ha sido eliminado.', 'success');
          },
          error: () => {
            Swal.fire('Error', 'No se pudo eliminar el código.', 'error');
          }
        });
      }
    });
  }
}