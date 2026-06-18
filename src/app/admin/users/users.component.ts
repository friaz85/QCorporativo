import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="topbar">
      <h1 class="topbar-title">Usuarios Registrados</h1>
      <div class="topbar-breadcrumb">/ Gestión / <span>Usuarios</span></div>
    </header>

    <div class="page-content">
      <div class="card">
        <div class="card-header">
          <div class="search-bar" style="width: 100%; justify-content: flex-end;">
            <div class="search-input-wrapper">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input type="text" class="form-control" [(ngModel)]="searchQuery" (input)="onSearch()" placeholder="Buscar por nombre, correo..." />
            </div>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Celular</th>
                <th>Fecha Registro</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of filteredUsers">
                <td>{{ u.idUsuario }}</td>
                <td class="font-bold">{{ u.Nombre || '—' }}</td>
                <td>{{ u.Correo }}</td>
                <td>{{ u.Celular || '—' }}</td>
                <td>{{ u.FechaRegistro | date:'medium' }}</td>
              </tr>
              <tr *ngIf="loading">
                <td colspan="5" style="text-align: center; color: var(--gray-400); padding: 30px;">
                  <span class="spinner-sm" style="margin-right: 8px;"></span> Cargando usuarios...
                </td>
              </tr>
              <tr *ngIf="!loading && !filteredUsers.length">
                <td colspan="5" style="text-align: center; color: var(--gray-400); padding: 30px;">
                  No se encontraron usuarios registrados.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class UsersComponent implements OnInit {
  users: any[] = [];
  filteredUsers: any[] = [];
  searchQuery: string = '';
  loading: boolean = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.http.get<any[]>('backend/admin_api.php?action=get_users').subscribe({
      next: data => {
        this.users = data;
        this.filteredUsers = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onSearch() {
    const q = this.searchQuery.toLowerCase();
    this.filteredUsers = this.users.filter(u => {
      return (u.Nombre && u.Nombre.toLowerCase().includes(q)) ||
             (u.Correo && u.Correo.toLowerCase().includes(q)) ||
             (u.Celular && u.Celular.includes(q));
    });
  }
}