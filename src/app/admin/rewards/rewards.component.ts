import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-rewards',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="topbar">
      <h1 class="topbar-title">Recompensas</h1>
      <div class="topbar-breadcrumb">/ Gestión / <span>Recompensas</span></div>
      <div class="topbar-right">
        <button class="btn btn-primary" (click)="openNew()">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Nueva recompensa
        </button>
      </div>
    </header>

    <div class="page-content">
      <div class="rewards-grid" *ngIf="rewards.length">
        <div class="reward-card" *ngFor="let r of rewards">
          <div class="reward-card-img">
            <img *ngIf="r.imagenUrl" [src]="r.imagenUrl" alt="{{ r.Nombre }}"
                 style="width:100%; height:100%; object-fit:cover; border-radius:10px 10px 0 0;" />
            <div *ngIf="!r.imagenUrl" class="no-img">
              🎁 {{ r.TA == 1 ? 'Tiempo Aire' : (r.CuponExterno == 1 ? 'Cupón Externo' : 'Cupón PDF') }}
            </div>
          </div>
          <div class="reward-card-body">
            <div class="reward-card-title">{{ r.Nombre }}</div>
            <div class="reward-card-desc">{{ r.Mensaje || '—' }}</div>
            <div class="reward-card-meta">
              <span class="reward-stock">Monto: {{ r.Monto }}</span>
              <span class="reward-rango"
                    [style.background]="r.TA == 1 ? '#fee2e2' : (r.CuponExterno == 1 ? '#fef3c7' : '#e0f2fe')"
                    [style.color]="r.TA == 1 ? '#991b1b' : (r.CuponExterno == 1 ? '#92400e' : '#075985')">
                {{ r.TA == 1 ? 'Tiempo Aire' : (r.CuponExterno == 1 ? 'Ext.' : 'PDF') }}
              </span>
            </div>
            <div style="font-size:11px; color:var(--gray-500); margin-top:6px; display:flex; flex-wrap:wrap; gap:6px;">
              <span *ngIf="+r.NumeroCodigos > 0">🔑 Límite: {{ r.NumeroCodigos }} cód.</span>
              <span *ngIf="r.CodigoRecarga">📱 SKU: {{ r.CodigoRecarga }}</span>
            </div>
            <div style="font-size:11px; color:var(--gray-400); margin-top:4px;">
              Estado: {{ r.Activo == 1 ? '✅ Activo' : '❌ Inactivo' }}
            </div>
          </div>
          <div style="display:flex; gap:6px; padding:0 14px 14px;">
            <button class="btn btn-secondary btn-sm" style="flex:1" (click)="editReward(r)">✏️ Editar</button>
            <button class="btn btn-secondary btn-sm" (click)="openCodesModal(r)">📋 Códigos</button>
            <button class="btn btn-danger btn-sm" (click)="deleteReward(r)">
              <svg width="16" height="16" fill="none" stroke="#fff" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="!rewards.length">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
        <h3>Sin recompensas</h3>
        <p>Crea la primera recompensa.</p>
      </div>
    </div>

    <!-- ══ REWARD EDITOR MODAL ══ -->
    <div class="modal-overlay" *ngIf="rewardDialog" (click)="hideDialog()">
      <div class="modal" style="width:min(580px,96vw); max-height:90vh; overflow-y:auto;" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <span class="modal-title">
            {{ reward.idRecompensa ? '✏️ Editar Recompensa' : '➕ Nueva Recompensa' }}
          </span>
          <button class="modal-close" (click)="hideDialog()">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="modal-body" style="padding:22px;">

          <!-- Nombre -->
          <div class="form-group">
            <label class="form-label">Nombre <span class="required">*</span></label>
            <input type="text" class="form-control"
                   [value]="reward.Nombre || ''"
                   (input)="reward.Nombre = $any($event.target).value"
                   placeholder="Ej. Tiempo Aire $100" />
          </div>

          <!-- Imagen de Recompensa -->
          <div class="form-group">
            <label class="form-label">Imagen de Recompensa</label>
            <div style="display:flex; gap:12px; align-items:flex-start;">
              <div *ngIf="imagePreview || reward.imagenUrl"
                   style="flex-shrink:0; width:80px; height:80px; border-radius:8px; overflow:hidden; border:1px solid var(--gray-200); background:#f9fafb;">
                <img [src]="imagePreview || reward.imagenUrl" alt="Preview"
                     style="width:100%; height:100%; object-fit:cover;" />
              </div>
              <div style="flex:1;">
                <input type="file" accept="image/*" (change)="onImageChange($event)"
                       class="form-control" style="padding:6px; font-size:13px;" />
                <small style="color:var(--gray-400); font-size:11px;">
                  JPG, PNG o WEBP. Máx 2 MB.
                  <span *ngIf="reward.imagenUrl && !imagePreview" style="color:var(--gray-500);">
                    — URL actual: {{ reward.imagenUrl | slice:0:40 }}…
                  </span>
                </small>
                <div *ngIf="uploadingImage" style="margin-top:6px; font-size:12px; color:var(--info);">
                  ⏳ Subiendo imagen...
                </div>
              </div>
            </div>
          </div>

          <!-- Monto / NumeroCodigos -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div class="form-group">
              <label class="form-label">Monto</label>
              <input type="text" class="form-control"
                     [value]="reward.Monto || ''"
                     (input)="reward.Monto = $any($event.target).value"
                     placeholder="100.00" />
            </div>
            <div class="form-group">
              <label class="form-label">Límite de Códigos por Registro</label>
              <input type="number" class="form-control"
                     [value]="reward.NumeroCodigos || 0"
                     (input)="reward.NumeroCodigos = +$any($event.target).value"
                     min="0" placeholder="0 = sin límite" />
            </div>
          </div>

          <!-- Checkboxes tipo -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
            <div class="form-group" style="display:flex; align-items:center; gap:8px; padding-top:4px;">
              <input type="checkbox" id="ta_{{ dialogKey }}"
                     [checked]="reward.TA == 1"
                     (change)="reward.TA = $any($event.target).checked ? 1 : 0" />
              <label [for]="'ta_' + dialogKey" style="font-weight:600; cursor:pointer;">Es Tiempo Aire</label>
            </div>
            <div class="form-group" style="display:flex; align-items:center; gap:8px; padding-top:4px;">
              <input type="checkbox" id="ext_{{ dialogKey }}"
                     [checked]="reward.CuponExterno == 1"
                     (change)="reward.CuponExterno = $any($event.target).checked ? 1 : 0" />
              <label [for]="'ext_' + dialogKey" style="font-weight:600; cursor:pointer;">Cupón Externo</label>
            </div>
          </div>

          <!-- CodigoRecarga (solo TA) -->
          <div class="form-group" *ngIf="reward.TA == 1">
            <label class="form-label">Código de Recarga (Taecel SKU)</label>
            <input type="text" class="form-control"
                   [value]="reward.CodigoRecarga || ''"
                   (input)="reward.CodigoRecarga = $any($event.target).value"
                   placeholder="Ej. AC100" />
          </div>

          <!-- Mensaje -->
          <div class="form-group">
            <label class="form-label">Mensaje Personalizado</label>
            <textarea class="form-control" rows="3"
                      [value]="reward.Mensaje || ''"
                      (input)="reward.Mensaje = $any($event.target).value"
                      placeholder="Mensaje en el cupón/recarga..."></textarea>
          </div>

          <!-- Activo -->
          <div class="form-group" style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox" id="activo_{{ dialogKey }}"
                   [checked]="reward.Activo == 1"
                   (change)="reward.Activo = $any($event.target).checked ? 1 : 0" />
            <label [for]="'activo_' + dialogKey" style="font-weight:600; cursor:pointer;">Activo</label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="hideDialog()">Cancelar</button>
          <button class="btn btn-primary" (click)="saveReward()" [disabled]="uploadingImage">
            {{ uploadingImage ? 'Subiendo imagen...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══ EXIT CODES MODAL ══ -->
    <div class="modal-overlay" *ngIf="codesDialog" (click)="codesDialog = false">
      <div class="modal" style="width:min(680px,96vw);" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <span class="modal-title">📋 Gestionar Códigos de Salida - {{ activeRewardName }}</span>
          <button class="modal-close" (click)="codesDialog = false">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="modal-body" style="padding:22px;">
          <div class="form-group">
            <label class="form-label">Asociar al Proyecto</label>
            <select class="form-control" [(ngModel)]="selectedProjectId">
              <option [value]="null">Selecciona un Proyecto...</option>
              <option *ngFor="let p of projects" [value]="p.idProyecto">{{ p.Proyecto }}</option>
            </select>
          </div>

          <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:10px; padding:14px; margin-bottom:16px;">
            <label style="font-size:12px; font-weight:700; color:#0369a1; text-transform:uppercase; display:block; margin-bottom:8px;">📄 Cargar desde CSV</label>
            <input type="file" accept=".csv" (change)="onCsvChange($event)" class="form-control" style="padding:6px; font-size:13px;" />
            <small style="color:#0369a1; font-size:11px;">Format: códigos separados por comas, hasta 8 por fila.</small>
          </div>

          <div class="form-group">
            <label class="form-label">Pegar Códigos manualmente (un registro por línea, hasta 8 separados por comas)</label>
            <textarea [(ngModel)]="newCodesText" rows="5" class="form-control" placeholder="Cod1,Cod2&#10;Cod3,Cod4"></textarea>
            <small style="color:var(--gray-400);">{{ countNewCodes() }} filas detectadas</small>
          </div>

          <div style="display:flex; justify-content:flex-end; margin-bottom:20px;">
            <button class="btn btn-primary" (click)="addExitCodes()">Agregar Códigos</button>
          </div>

          <div class="form-group">
            <label class="form-label">Lista de Códigos Registrados (Últimos 1000)</label>
            <div class="table-wrapper" style="max-height:250px; overflow-y:auto;">
              <table>
                <thead>
                  <tr>
                    <th>Código 1</th>
                    <th>Código 2</th>
                    <th>Estado</th>
                    <th>Eliminar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let ec of exitCodes">
                    <td class="font-bold">{{ ec.CodigoSalida }}</td>
                    <td>{{ ec.CodigoSalida2 || '—' }}</td>
                    <td>
                      <span class="badge" [class.badge-approved]="ec.Activo == 1" [class.badge-rejected]="ec.Activo != 1">
                        {{ ec.Activo == 1 ? 'Disponible' : 'Utilizado' }}
                      </span>
                    </td>
                    <td>
                      <button class="btn btn-danger btn-sm btn-icon" (click)="deleteExitCode(ec)">
                        <svg width="14" height="14" fill="none" stroke="#fff" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="!exitCodes.length">
                    <td colspan="4" style="text-align:center; color:var(--gray-400);">Sin códigos registrados.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="codesDialog = false">Cerrar</button>
        </div>
      </div>
    </div>
  `
})
export class RewardsComponent implements OnInit {
  rewards: any[] = [];
  reward: any = {};
  rewardDialog = false;
  dialogKey = 0; // Unique key to force re-render of modal inputs

  // Image upload state
  imageFile: File | null = null;
  imagePreview: string = '';
  uploadingImage = false;

  // Exit codes state
  codesDialog = false;
  activeRewardName = '';
  activeRewardId = 0;
  projects: any[] = [];
  selectedProjectId: any = null;
  newCodesText = '';
  exitCodes: any[] = [];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadRewards();
    this.loadProjects();
  }

  loadRewards() {
    this.http.get<any[]>('backend/admin_api.php?action=get_rewards').subscribe(data => {
      this.rewards = Array.isArray(data) ? data : [];
    });
  }

  loadProjects() {
    this.http.get<any[]>('backend/admin_api.php?action=get_projects').subscribe(data => {
      this.projects = Array.isArray(data) ? data : [];
    });
  }

  openNew() {
    this.reward = { Activo: 1, TA: 0, CuponExterno: 0, NumeroCodigos: 0, Nombre: '', Monto: '', Mensaje: '', CodigoRecarga: '', imagenUrl: '' };
    this.imageFile = null;
    this.imagePreview = '';
    this.dialogKey++;
    this.rewardDialog = true;
    this.cdr.detectChanges();
  }

  editReward(r: any) {
    // Build a clean plain object — avoid reference sharing
    this.reward = {
      idRecompensa: r.idRecompensa,
      Nombre: r.Nombre || '',
      Monto: r.Monto || '',
      NumeroCodigos: parseInt(r.NumeroCodigos) || 0,
      TA: parseInt(r.TA) === 1 ? 1 : 0,
      CuponExterno: parseInt(r.CuponExterno) === 1 ? 1 : 0,
      CodigoRecarga: r.CodigoRecarga || '',
      Mensaje: r.Mensaje || '',
      Activo: parseInt(r.Activo) === 1 ? 1 : 0,
      imagenUrl: r.imagenUrl || ''
    };
    this.imageFile = null;
    this.imagePreview = '';
    this.dialogKey++;       // Force Angular to recreate inputs
    this.rewardDialog = true;
    this.cdr.detectChanges();
  }

  hideDialog() {
    this.rewardDialog = false;
    this.imageFile = null;
    this.imagePreview = '';
  }

  // ── Image handling ────────────────────────────────────────────
  onImageChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      Swal.fire('Imagen muy grande', 'La imagen no debe superar 2 MB.', 'warning');
      return;
    }
    this.imageFile = file;
    const reader = new FileReader();
    reader.onload = e => {
      this.imagePreview = e.target?.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  private uploadImage(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.imageFile) { resolve(this.reward.imagenUrl || ''); return; }
      this.uploadingImage = true;
      const form = new FormData();
      form.append('image', this.imageFile);
      form.append('idRecompensa', this.reward.idRecompensa || '0');
      // Use native fetch to bypass Angular interceptor (binary/multipart)
      fetch('backend/admin_api.php?action=upload_reward_image', { method: 'POST', body: form })
        .then(r => r.json())
        .then((res: any) => {
          this.uploadingImage = false;
          if (res.url) resolve(res.url);
          else reject(res.error || 'Error al subir imagen');
        })
        .catch(() => { this.uploadingImage = false; reject('Error de red al subir imagen'); });
    });
  }

  async saveReward() {
    if (!this.reward.Nombre?.trim()) {
      Swal.fire('Error', 'El nombre de la recompensa es requerido.', 'error');
      return;
    }

    try {
      // Upload image first if a new one was selected
      const imagenUrl = await this.uploadImage();
      const payload = { ...this.reward, imagenUrl };

      this.http.post('backend/admin_api.php?action=save_reward', payload).subscribe({
        next: () => {
          this.rewardDialog = false;
          this.imageFile = null;
          this.imagePreview = '';
          this.loadRewards();
          Swal.fire('Guardado', 'Recompensa guardada con éxito.', 'success');
        },
        error: () => Swal.fire('Error', 'No se pudo guardar la recompensa.', 'error')
      });
    } catch (e: any) {
      Swal.fire('Error', e, 'error');
    }
  }

  deleteReward(reward: any) {
    Swal.fire({
      title: '¿Eliminar recompensa?',
      text: `¿Estás seguro de eliminar "${reward.Nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e31b23',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.http.get(`backend/admin_api.php?action=delete_reward&id=${reward.idRecompensa}`).subscribe({
          next: () => { this.loadRewards(); Swal.fire('Eliminado', 'Recompensa borrada.', 'success'); },
          error: () => Swal.fire('Error', 'No se pudo eliminar.', 'error')
        });
      }
    });
  }

  // ── Exit Codes ────────────────────────────────────────────────
  openCodesModal(reward: any) {
    this.activeRewardId = reward.idRecompensa;
    this.activeRewardName = reward.Nombre;
    this.newCodesText = '';
    this.selectedProjectId = null;
    this.exitCodes = [];
    this.codesDialog = true;
    this.loadExitCodes();
  }

  loadExitCodes() {
    this.http.get<any[]>(`backend/admin_api.php?action=get_exit_codes&idRecompensa=${this.activeRewardId}`).subscribe({
      next: data => { this.exitCodes = Array.isArray(data) ? data : []; }
    });
  }

  countNewCodes(): number {
    return this.newCodesText.split('\n').filter(l => l.trim()).length;
  }

  onCsvChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      this.newCodesText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    };
    reader.readAsText(file);
    (event.target as HTMLInputElement).value = '';
  }

  addExitCodes() {
    if (!this.selectedProjectId || this.selectedProjectId === 'null') {
      Swal.fire('Error', 'Selecciona un proyecto.', 'error'); return;
    }
    if (!this.newCodesText.trim()) {
      Swal.fire('Error', 'Ingresa al menos un código.', 'error'); return;
    }
    const rows = this.newCodesText.split('\n').filter(l => l.trim()).map(l => l.split(',').map(x => x.trim()));
    const payload = { idRecompensa: this.activeRewardId, idProyecto: parseInt(this.selectedProjectId), codes: rows };
    this.http.post('backend/admin_api.php?action=add_exit_codes', payload).subscribe({
      next: (res: any) => {
        Swal.fire('Completado', `Importados: ${res.imported}. Errores/Duplicados: ${res.errors}`, 'success');
        this.newCodesText = '';
        this.loadExitCodes();
      },
      error: () => Swal.fire('Error', 'No se pudieron agregar los códigos.', 'error')
    });
  }

  deleteExitCode(ec: any) {
    Swal.fire({
      title: '¿Eliminar código?',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#e31b23', cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí', cancelButtonText: 'Cancelar'
    }).then(r => {
      if (r.isConfirmed) {
        this.http.get(`backend/admin_api.php?action=delete_exit_code&id=${ec.idCodigoSalida}`).subscribe({
          next: () => { this.loadExitCodes(); Swal.fire('Eliminado', 'Código eliminado.', 'success'); },
          error: () => Swal.fire('Error', 'No se pudo eliminar.', 'error')
        });
      }
    });
  }
}