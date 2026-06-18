import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="topbar">
      <h1 class="topbar-title">Clientes</h1>
      <div class="topbar-breadcrumb">/ Gestión / <span>Clientes</span></div>
      <div class="topbar-right">
        <button class="btn btn-primary" (click)="openNew()">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Nuevo Cliente
        </button>
      </div>
    </header>

    <div class="page-content">
      <div class="card">
        <div class="card-header">
          <div class="search-bar" style="width:100%; justify-content:flex-end;">
            <div class="search-input-wrapper">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input type="text" class="form-control" 
                     [value]="searchQuery" 
                     (input)="searchQuery = $any($event.target).value; onSearch()" 
                     placeholder="Buscar cliente..." />
            </div>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Proyectos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of filteredClients">
                <td>{{ c.idCliente }}</td>
                <td class="font-bold">{{ c.Cliente }}</td>
                <td>
                  <span class="badge" [class.badge-approved]="c.Activo == 1" [class.badge-rejected]="c.Activo != 1">
                    {{ c.Activo == 1 ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>
                  <span style="font-size:12px; color:var(--gray-500);">{{ c.totalProyectos || 0 }} proyecto(s)</span>
                </td>
                <td>
                  <div style="display:flex; gap:6px;">
                    <button class="btn btn-secondary btn-sm" (click)="editClient(c)">✏️ Editar</button>
                    <button class="btn btn-danger btn-sm" (click)="deleteClient(c)">
                      <svg width="14" height="14" fill="none" stroke="#fff" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="!filteredClients.length">
                <td colspan="5" style="text-align:center; color:var(--gray-400); padding:30px;">
                  No hay clientes registrados.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ══ CLIENT EDITOR MODAL ══ -->
    <div class="modal-overlay" *ngIf="clientDialog" (click)="hideDialog()">
      <div class="modal" style="width:min(480px,96vw);" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <span class="modal-title">
            {{ client.idCliente ? '✏️ Editar Cliente' : '➕ Nuevo Cliente' }}
          </span>
          <button class="modal-close" (click)="hideDialog()">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="modal-body" style="padding:22px;">
          <div class="form-group">
            <label class="form-label">Nombre del Cliente <span class="required">*</span></label>
            <input type="text" class="form-control" 
                   [value]="client.Cliente || ''"
                   (input)="client.Cliente = $any($event.target).value"
                   placeholder="Ej. Empresa S.A. de C.V." />
          </div>
          <div class="form-group" style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox" id="cact"
                   [checked]="client.Activo == 1"
                   (change)="client.Activo = $any($event.target).checked ? 1 : 0" />
            <label for="cact" style="font-weight:600; cursor:pointer;">Activo</label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="hideDialog()">Cancelar</button>
          <button class="btn btn-primary" (click)="saveClient()">Guardar</button>
        </div>
      </div>
    </div>
  `
})
export class ClientsComponent implements OnInit {
  clients: any[] = [];
  filteredClients: any[] = [];
  client: any = {};
  clientDialog = false;
  searchQuery = '';

  constructor(private http: HttpClient) {}

  ngOnInit() { this.loadClients(); }

  loadClients() {
    this.http.get<any[]>('backend/admin_api.php?action=get_clients').subscribe(data => {
      this.clients = data;
      this.filteredClients = data;
    });
  }

  onSearch() {
    const q = this.searchQuery.toLowerCase();
    this.filteredClients = this.clients.filter(c =>
      c.Cliente?.toLowerCase().includes(q)
    );
  }

  openNew() {
    this.client = { Activo: 1 };
    this.clientDialog = true;
  }

  editClient(c: any) {
    this.client = { ...c, Activo: parseInt(c.Activo) === 1 ? 1 : 0 };
    this.clientDialog = true;
  }

  hideDialog() { this.clientDialog = false; }

  saveClient() {
    if (!this.client.Cliente?.trim()) {
      Swal.fire('Error', 'El nombre del cliente es requerido.', 'error');
      return;
    }
    this.http.post('backend/admin_api.php?action=save_client', this.client).subscribe({
      next: () => {
        this.clientDialog = false;
        this.loadClients();
        Swal.fire('Guardado', 'Cliente guardado con éxito.', 'success');
      },
      error: () => Swal.fire('Error', 'No se pudo guardar el cliente.', 'error')
    });
  }

  deleteClient(c: any) {
    Swal.fire({
      title: '¿Eliminar cliente?',
      text: `¿Estás seguro de eliminar "${c.Cliente}"? Los proyectos asociados perderán su cliente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e31b23',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.http.get(`backend/admin_api.php?action=delete_client&id=${c.idCliente}`).subscribe({
          next: () => {
            this.loadClients();
            Swal.fire('Eliminado', 'El cliente ha sido borrado.', 'success');
          },
          error: () => Swal.fire('Error', 'No se pudo eliminar el cliente.', 'error')
        });
      }
    });
  }
}
