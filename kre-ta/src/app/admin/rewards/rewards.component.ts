import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-rewards',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, InputTextModule, DialogModule, CheckboxModule, FormsModule],
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
              <button pButton icon="pi pi-trash" class="p-button-text p-button-danger" (click)="deleteReward(reward)"></button>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>

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

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadRewards();
  }

  loadRewards() {
    // Call backend API (to be implemented)
    this.http.get<any[]>('backend/admin_api.php?action=get_rewards').subscribe(data => {
      this.rewards = data;
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
    this.rewardDialog = false;
    Swal.fire('Guardado', 'Recompensa actualizada con éxito.', 'success');
  }

  deleteReward(reward: any) {
    Swal.fire({
      title: '¿Eliminar recompensa?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e31b23'
    });
  }
}