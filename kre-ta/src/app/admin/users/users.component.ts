import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, InputTextModule],
  template: `
    <div class="card shadow-1 p-4 bg-white border-round">
      <div class="flex justify-content-between align-items-center mb-4">
        <h2 class="m-0">Usuarios Registrados</h2>
      </div>

      <p-table [value]="users" [paginator]="true" [rows]="10" [responsiveLayout]="'scroll'"
               [globalFilterFields]="['Nombre', 'Correo', 'Celular']" #dt>
        <ng-template pTemplate="caption">
          <div class="flex justify-content-end">
            <span class="p-input-icon-left">
              <i class="pi pi-search"></i>
              <input pInputText type="text" (input)="dt.filterGlobal($any($event.target).value, 'contains')" placeholder="Buscar por nombre, correo..." />
            </span>
          </div>
        </ng-template>
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="idUsuario">ID <p-sortIcon field="idUsuario"></p-sortIcon></th>
            <th pSortableColumn="Nombre">Nombre <p-sortIcon field="Nombre"></p-sortIcon></th>
            <th pSortableColumn="Correo">Correo <p-sortIcon field="Correo"></p-sortIcon></th>
            <th>Celular</th>
            <th pSortableColumn="FechaRegistro">Fecha Registro <p-sortIcon field="FechaRegistro"></p-sortIcon></th>
            <th>Acciones</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-user>
          <tr>
            <td>{{ user.idUsuario }}</td>
            <td>{{ user.Nombre || 'N/A' }}</td>
            <td>{{ user.Correo }}</td>
            <td>{{ user.Celular || 'N/A' }}</td>
            <td>{{ user.FechaRegistro | date:'medium' }}</td>
            <td>
              <button pButton icon="pi pi-eye" class="p-button-text p-button-secondary" title="Ver Canjes"></button>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `
})
export class UsersComponent implements OnInit {
  users: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.http.get<any[]>('backend/admin_api.php?action=get_users').subscribe(data => {
      this.users = data;
    });
  }
}