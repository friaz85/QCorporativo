import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="topbar">
      <h1 class="topbar-title">Proyectos</h1>
      <div class="topbar-breadcrumb">/ Gestión / <span>Proyectos</span></div>
      <div class="topbar-right">
        <button class="btn btn-primary" (click)="openNew()">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Nuevo Proyecto
        </button>
      </div>
    </header>

    <div class="page-content">
      <div class="card">
        <div class="card-header">
          <div class="search-bar" style="width: 100%; justify-content: flex-end;">
            <div class="search-input-wrapper">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input type="text" class="form-control" [(ngModel)]="searchQuery" (input)="onSearch()" placeholder="Buscar proyecto..." />
            </div>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>PDF Template</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of filteredProjects">
                <td>{{ p.idProyecto }}</td>
                <td class="font-bold">{{ p.Proyecto }}</td>
                <td>
                  <span class="badge" [style.background]="p.multiRecompensa == 1 ? '#e3f2fd' : '#f1f5f9'" [style.color]="p.multiRecompensa == 1 ? '#0d47a1' : '#475569'">
                    {{ p.multiRecompensa == 1 ? 'Multi' : (p.multiRecompensa == 2 ? 'Directo' : 'Individual') }}
                  </span>
                </td>
                <td>{{ p.nombrePdf || 'Ninguno' }}</td>
                <td>
                  <div style="display:flex; gap:6px;">
                    <button class="btn btn-secondary btn-sm" (click)="editProject(p)">✏️ Editar</button>
                    <button class="btn btn-danger btn-sm" (click)="deleteProject(p)">
                      <svg width="14" height="14" fill="none" stroke="#fff" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="!filteredProjects.length">
                <td colspan="5" style="text-align: center; color: var(--gray-400); padding: 30px;">
                  No hay proyectos registrados.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ══ PROJECT EDITOR MODAL ══ -->
    <div class="modal-overlay" *ngIf="projectDialog" (click)="hideDialog()">
      <div class="modal" style="width:min(750px,96vw); max-height:85vh; overflow-y:auto;" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <span class="modal-title">Detalles del Proyecto</span>
          <button class="modal-close" (click)="hideDialog()">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="modal-body" style="padding: 22px;">
          <!-- Custom Premium Tabs -->
          <div style="display:flex; gap:10px; border-bottom:1px solid var(--gray-200); padding-bottom:12px; margin-bottom:20px;">
            <button class="filter-tab" [class.active]="activeTab === 'general'" (click)="activeTab = 'general'">General</button>
            <button class="filter-tab" [class.active]="activeTab === 'coords'" (click)="activeTab = 'coords'">Coordenadas PDF</button>
            <button class="filter-tab" [class.active]="activeTab === 'montos'" (click)="activeTab = 'montos'">Montos</button>
            <button class="filter-tab" [class.active]="activeTab === 'rewards'" (click)="activeTab = 'rewards'" *ngIf="project.multiRecompensa == 1">Asociar Recompensas</button>
          </div>

          <!-- TAB: GENERAL -->
          <div *ngIf="activeTab === 'general'">
            <div class="form-group">
              <label class="form-label">Nombre del Proyecto <span class="required">*</span></label>
              <input type="text" class="form-control" [(ngModel)]="project.Proyecto" placeholder="Ej. Campaña Navidad" />
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="form-group">
                <label class="form-label">Tipo de Recompensa</label>
                <select class="form-control" [(ngModel)]="project.multiRecompensa" (change)="onTypeChange()">
                  <option [value]="0">Individual</option>
                  <option [value]="1">Multirecompensa (El usuario elige)</option>
                  <option [value]="2">Directo (Viene asignada en código)</option>
                </select>
              </div>
              <div class="form-group" style="display:flex; align-items:center; gap:8px; padding-top:24px;">
                <input type="checkbox" id="pact" [(ngModel)]="project.Activo" [checked]="project.Activo == 1" (change)="project.Activo = project.Activo == 1 ? 0 : 1" />
                <label for="pact" style="font-weight:600; cursor:pointer;">Proyecto Activo</label>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="form-group">
                <label class="form-label">Fecha de Inicio</label>
                <input type="date" class="form-control" [(ngModel)]="project.FechaInicio" />
              </div>
              <div class="form-group">
                <label class="form-label">Fecha de Fin</label>
                <input type="date" class="form-control" [(ngModel)]="project.FechaFin" />
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="form-group">
                <label class="form-label">Participaciones Máx por Correo</label>
                <input type="number" class="form-control" [(ngModel)]="project.numeroParticipaciones" min="1" />
              </div>
              <div class="form-group" *ngIf="project.multiRecompensa != 1">
                <label class="form-label">Cantidad de Códigos a Imprimir</label>
                <input type="number" class="form-control" [(ngModel)]="project.numeroCodigos" min="1" max="4" />
              </div>
            </div>
          </div>

          <!-- TAB: COORDENADAS PDF -->
          <div *ngIf="activeTab === 'coords'">
            <div style="display:grid; grid-template-columns:2fr 1fr; gap:12px;">
              <div class="form-group">
                <label class="form-label">Plantilla PDF (.pdf)</label>
                <input type="text" class="form-control" [(ngModel)]="project.nombrePdf" placeholder="plantilla_cupon.pdf" />
              </div>
              <div class="form-group">
                <label class="form-label">Número de Páginas</label>
                <input type="number" class="form-control" [(ngModel)]="project.numeroPaginas" min="1" />
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="form-group">
                <label class="form-label">Tamaño de Fuente Texto</label>
                <input type="number" class="form-control" [(ngModel)]="project.fuenteTexto" placeholder="12" />
              </div>
              <div class="form-group">
                <label class="form-label">Color de Texto (Hex)</label>
                <input type="text" class="form-control" [(ngModel)]="project.colorTexto" placeholder="#000000" />
              </div>
            </div>

            <div style="border:1px solid var(--gray-200); border-radius:10px; padding:16px; margin-bottom:16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--gray-200); padding-bottom:8px; margin-bottom:12px;">
                <h4 style="margin:0;">Coordenadas de Códigos (Ejes)</h4>
                <button class="btn btn-secondary btn-sm" (click)="openVisualEditor()">Diseñador Visual de PDF</button>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:8px;">
                <div class="form-group" style="margin:0;">
                  <label class="form-label" style="font-size:11px;">Eje X1</label>
                  <input type="number" class="form-control" [(ngModel)]="project.ejeX" />
                </div>
                <div class="form-group" style="margin:0;">
                  <label class="form-label" style="font-size:11px;">Eje Y1</label>
                  <input type="number" class="form-control" [(ngModel)]="project.ejeY" />
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:8px;" *ngIf="project.numeroCodigos >= 2 || project.multiRecompensa == 1">
                <div class="form-group" style="margin:0;">
                  <label class="form-label" style="font-size:11px;">Eje X2</label>
                  <input type="number" class="form-control" [(ngModel)]="project.ejeX2" />
                </div>
                <div class="form-group" style="margin:0;">
                  <label class="form-label" style="font-size:11px;">Eje Y2</label>
                  <input type="number" class="form-control" [(ngModel)]="project.ejeY2" />
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:8px;" *ngIf="project.numeroCodigos >= 3 || project.multiRecompensa == 1">
                <div class="form-group" style="margin:0;">
                  <label class="form-label" style="font-size:11px;">Eje X3</label>
                  <input type="number" class="form-control" [(ngModel)]="project.ejeX3" />
                </div>
                <div class="form-group" style="margin:0;">
                  <label class="form-label" style="font-size:11px;">Eje Y3</label>
                  <input type="number" class="form-control" [(ngModel)]="project.ejeY3" />
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:8px;" *ngIf="project.numeroCodigos >= 4 || project.multiRecompensa == 1">
                <div class="form-group" style="margin:0;">
                  <label class="form-label" style="font-size:11px;">Eje X4</label>
                  <input type="number" class="form-control" [(ngModel)]="project.ejeX4" />
                </div>
                <div class="form-group" style="margin:0;">
                  <label class="form-label" style="font-size:11px;">Eje Y4</label>
                  <input type="number" class="form-control" [(ngModel)]="project.ejeY4" />
                </div>
              </div>
            </div>
          </div>

          <!-- TAB: MONTOS -->
          <div *ngIf="activeTab === 'montos'">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="form-group">
                <label class="form-label">Monto Recarga / Por Defecto</label>
                <input type="text" class="form-control" [(ngModel)]="project.MontoRecarga" placeholder="100.00" />
              </div>
              <div class="form-group" style="display:flex; align-items:center; gap:8px; padding-top:24px;">
                <input type="checkbox" id="mva" [(ngModel)]="project.montoVariable" [checked]="project.montoVariable == '1'" (change)="project.montoVariable = project.montoVariable == '1' ? '0' : '1'" />
                <label for="mva" style="font-weight:600; cursor:pointer;">Imprimir Monto en PDF</label>
              </div>
            </div>

            <div style="border:1px solid var(--gray-200); border-radius:10px; padding:16px;" *ngIf="project.montoVariable == '1'">
              <h4 style="margin:0; border-bottom:1px solid var(--gray-200); padding-bottom:8px; margin-bottom:12px;">Configuración del Monto Impreso</h4>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                <div class="form-group" style="margin:0;">
                  <label class="form-label" style="font-size:11px;">Eje X (Monto)</label>
                  <input type="number" class="form-control" [(ngModel)]="project.ejeXMonto" />
                </div>
                <div class="form-group" style="margin:0;">
                  <label class="form-label" style="font-size:11px;">Eje Y (Monto)</label>
                  <input type="number" class="form-control" [(ngModel)]="project.ejeYMonto" />
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-group" style="margin:0;">
                  <label class="form-label" style="font-size:11px;">Fuente Monto</label>
                  <input type="number" class="form-control" [(ngModel)]="project.fuenteTextoMonto" />
                </div>
                <div class="form-group" style="margin:0;">
                  <label class="form-label" style="font-size:11px;">Color Monto (Hex)</label>
                  <input type="text" class="form-control" [(ngModel)]="project.colorTextoMonto" placeholder="#000000" />
                </div>
              </div>
            </div>
          </div>

          <!-- TAB: RECOMPENSAS ASOCIADAS -->
          <div *ngIf="activeTab === 'rewards' && project.multiRecompensa == 1">
            <div style="border:1px solid var(--gray-200); border-radius:10px; padding:16px; margin-bottom:20px; background:#f9fafb;">
              <h4 style="margin:0; margin-bottom:12px;">Asociar Nueva Recompensa</h4>
              <div style="display:flex; gap:10px;">
                <select class="form-control" style="flex:1;" [(ngModel)]="selectedRewardToAdd">
                  <option [value]="null">Selecciona una Recompensa...</option>
                  <option *ngFor="let rew of availableRewardsOptions" [ngValue]="rew">{{ rew.Nombre }}</option>
                </select>
                <button class="btn btn-primary" (click)="addRewardRelation()">Agregar</button>
              </div>
            </div>

            <h4 style="margin-bottom:12px;">Configuración por Recompensa Asociada</h4>
            <div style="display:flex; flex-direction:column; gap:14px; max-height:22rem; overflow-y:auto; padding-right:6px;">
              <div *ngFor="let rel of associatedRewards; let i = index" style="border:1px solid var(--gray-200); border-radius:10px; padding:16px; background:white; position:relative; box-shadow:var(--shadow);">
                <button style="position:absolute; top:12px; right:12px; background:none; border:none; color:var(--danger); cursor:pointer; font-size:16px;" (click)="removeRewardRelation(i)">✕</button>

                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--gray-200); padding-bottom:8px; margin-bottom:12px;">
                  <h4 style="margin:0; color:var(--3m-red);">{{ rel.Nombre }}</h4>
                  <button class="btn btn-secondary btn-sm" (click)="openVisualEditor(rel, i)">Diseño Visual de PDF</button>
                </div>

                <div style="display:grid; grid-template-columns:2fr 1fr 1fr; gap:12px; margin-bottom:12px;">
                  <div class="form-group" style="margin:0;">
                    <label class="form-label" style="font-size:11px;">Plantilla PDF</label>
                    <input type="text" class="form-control" [(ngModel)]="rel.nombrePdf" />
                  </div>
                  <div class="form-group" style="margin:0;">
                    <label class="form-label" style="font-size:11px;">Páginas</label>
                    <input type="number" class="form-control" [(ngModel)]="rel.numeroPaginas" />
                  </div>
                  <div class="form-group" style="margin:0;">
                    <label class="form-label" style="font-size:11px;">Límite Códigos</label>
                    <input type="number" class="form-control" [(ngModel)]="rel.numeroCodigos" />
                  </div>
                </div>

                <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; margin-bottom:12px;">
                  <div class="form-group" style="margin:0;"><label class="form-label" style="font-size:10px;">Eje X1</label><input type="number" class="form-control" [(ngModel)]="rel.ejeX" /></div>
                  <div class="form-group" style="margin:0;"><label class="form-label" style="font-size:10px;">Eje Y1</label><input type="number" class="form-control" [(ngModel)]="rel.ejeY" /></div>
                  <div class="form-group" style="margin:0;"><label class="form-label" style="font-size:10px;">Eje X2</label><input type="number" class="form-control" [(ngModel)]="rel.ejeX2" /></div>
                  <div class="form-group" style="margin:0;"><label class="form-label" style="font-size:10px;">Eje Y2</label><input type="number" class="form-control" [(ngModel)]="rel.ejeY2" /></div>
                </div>

                <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; margin-bottom:12px;">
                  <div class="form-group" style="margin:0;"><label class="form-label" style="font-size:10px;">Eje X3</label><input type="number" class="form-control" [(ngModel)]="rel.ejeX3" /></div>
                  <div class="form-group" style="margin:0;"><label class="form-label" style="font-size:10px;">Eje Y3</label><input type="number" class="form-control" [(ngModel)]="rel.ejeY3" /></div>
                  <div class="form-group" style="margin:0;"><label class="form-label" style="font-size:10px;">Eje X4</label><input type="number" class="form-control" [(ngModel)]="rel.ejeX4" /></div>
                  <div class="form-group" style="margin:0;"><label class="form-label" style="font-size:10px;">Eje Y4</label><input type="number" class="form-control" [(ngModel)]="rel.ejeY4" /></div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:12px;">
                  <div class="form-group" style="margin:0;"><label class="form-label" style="font-size:11px;">Monto Recarga</label><input type="text" class="form-control" [(ngModel)]="rel.MontoRecarga" /></div>
                  <div class="form-group" style="margin:0;"><label class="form-label" style="font-size:11px;">Eje X Monto</label><input type="number" class="form-control" [(ngModel)]="rel.ejeXMonto" /></div>
                  <div class="form-group" style="margin:0;"><label class="form-label" style="font-size:11px;">Eje Y Monto</label><input type="number" class="form-control" [(ngModel)]="rel.ejeYMonto" /></div>
                </div>

                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="checkbox" id="mva-{{i}}" [(ngModel)]="rel.montoVariable" [checked]="rel.montoVariable == 1" (change)="rel.montoVariable = rel.montoVariable == 1 ? 0 : 1" />
                  <label for="mva-{{i}}" style="font-weight:600; cursor:pointer;">Imprimir Monto</label>
                </div>
              </div>

              <div *ngIf="associatedRewards.length === 0" style="text-align:center; padding:30px; color:var(--gray-400);">
                No hay recompensas asociadas a este proyecto todavía.
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="hideDialog()">Cancelar</button>
          <button class="btn btn-primary" (click)="saveProject()">Guardar Proyecto</button>
        </div>
      </div>
    </div>

    <!-- ══ VISUAL PDF EDITOR MODAL ══ -->
    <div class="modal-overlay" *ngIf="visualEditorDialog" (click)="visualEditorDialog = false">
      <div class="modal" style="width:min(1100px, 98vw); height:90vh; display:grid; grid-template-rows: auto 1fr auto;" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <span class="modal-title">📍 Diseñador Visual de PDF - {{ visualEditorTitle }}</span>
          <button class="modal-close" (click)="visualEditorDialog = false">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div class="editor-columns">
          <!-- Left settings panel -->
          <div class="editor-left">
            <h4 style="margin-bottom:12px;">Posicionamiento</h4>
            <p style="font-size:11.5px; color:var(--gray-600); margin-bottom:16px;">Arrastra las cajas en el PDF a la derecha o escribe sus posiciones en milímetros (mm).</p>

            <div class="form-group">
              <label class="form-label">Plantilla PDF</label>
              <input type="text" class="form-control" [(ngModel)]="visualTarget.nombrePdf" readonly />
            </div>

            <!-- Fuente y Color -->
            <div style="border:1px solid var(--gray-200); border-radius:8px; padding:12px; margin-bottom:12px; background:#f9fafb;">
              <span style="font-weight:700; font-size:11.5px; display:block; margin-bottom:8px;">Tipografía</span>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div class="form-group" style="margin:0;">
                  <label class="form-label" style="font-size:10px;">Tamaño Fuente (pt)</label>
                  <input type="number" class="form-control" [(ngModel)]="visualTarget.fuenteTexto" (ngModelChange)="syncVisualBoxes()" min="6" max="72" placeholder="12" />
                </div>
                <div class="form-group" style="margin:0;">
                  <label class="form-label" style="font-size:10px;">Color Texto</label>
                  <input type="text" class="form-control" [(ngModel)]="visualTarget.colorTexto" placeholder="#000000" />
                </div>
              </div>
            </div>

            <!-- Ejes inputs -->
            <div style="border:1px solid var(--gray-200); border-radius:8px; padding:12px; margin-bottom:12px;">
              <span style="font-weight:700; color:var(--3m-red); font-size:11.5px; display:block; margin-bottom:8px;">Código 1</span>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div class="form-group" style="margin:0;"><label class="form-label" style="font-size:10px;">X (mm)</label><input type="number" class="form-control" [(ngModel)]="visualTarget.ejeX" (change)="syncVisualBoxes()" /></div>
                <div class="form-group" style="margin:0;"><label class="form-label" style="font-size:10px;">Y (mm)</label><input type="number" class="form-control" [(ngModel)]="visualTarget.ejeY" (change)="syncVisualBoxes()" /></div>
              </div>
            </div>

            <div style="border:1px solid var(--gray-200); border-radius:8px; padding:12px; margin-bottom:12px;" *ngIf="showBox2()">
              <span style="font-weight:700; color:var(--3m-red); font-size:11.5px; display:block; margin-bottom:8px;">Código 2</span>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div class="form-group" style="margin:0;"><label class="form-label" style="font-size:10px;">X2 (mm)</label><input type="number" class="form-control" [(ngModel)]="visualTarget.ejeX2" (change)="syncVisualBoxes()" /></div>
                <div class="form-group" style="margin:0;"><label class="form-label" style="font-size:10px;">Y2 (mm)</label><input type="number" class="form-control" [(ngModel)]="visualTarget.ejeY2" (change)="syncVisualBoxes()" /></div>
              </div>
            </div>

            <div style="border:1px solid var(--gray-200); border-radius:8px; padding:12px; margin-bottom:12px;" *ngIf="showBox3()">
              <span style="font-weight:700; color:var(--3m-red); font-size:11.5px; display:block; margin-bottom:8px;">Código 3</span>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div class="form-group" style="margin:0;"><label class="form-label" style="font-size:10px;">X3 (mm)</label><input type="number" class="form-control" [(ngModel)]="visualTarget.ejeX3" (change)="syncVisualBoxes()" /></div>
                <div class="form-group" style="margin:0;"><label class="form-label" style="font-size:10px;">Y3 (mm)</label><input type="number" class="form-control" [(ngModel)]="visualTarget.ejeY3" (change)="syncVisualBoxes()" /></div>
              </div>
            </div>

            <div style="border:1px solid var(--gray-200); border-radius:8px; padding:12px; margin-bottom:12px;" *ngIf="showBox4()">
              <span style="font-weight:700; color:var(--3m-red); font-size:11.5px; display:block; margin-bottom:8px;">Código 4</span>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div class="form-group" style="margin:0;"><label class="form-label" style="font-size:10px;">X4 (mm)</label><input type="number" class="form-control" [(ngModel)]="visualTarget.ejeX4" (change)="syncVisualBoxes()" /></div>
                <div class="form-group" style="margin:0;"><label class="form-label" style="font-size:10px;">Y4 (mm)</label><input type="number" class="form-control" [(ngModel)]="visualTarget.ejeY4" (change)="syncVisualBoxes()" /></div>
              </div>
            </div>

            <div style="border:1px solid var(--gray-200); border-radius:8px; padding:12px;" *ngIf="showMontoBox()">
              <span style="font-weight:700; color:var(--info); font-size:11.5px; display:block; margin-bottom:8px;">Monto Variable</span>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div class="form-group" style="margin:0;"><label class="form-label" style="font-size:10px;">X (mm)</label><input type="number" class="form-control" [(ngModel)]="visualTarget.ejeXMonto" (change)="syncVisualBoxes()" /></div>
                <div class="form-group" style="margin:0;"><label class="form-label" style="font-size:10px;">Y (mm)</label><input type="number" class="form-control" [(ngModel)]="visualTarget.ejeYMonto" (change)="syncVisualBoxes()" /></div>
              </div>
            </div>
          </div>

          <!-- Right preview panel -->
          <div class="editor-right">
            <div class="editor-right-header">
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              Vista previa PDF — Arrastra los elementos para posicionar
            </div>
            
            <div class="pdf-scroll-area">
              <div *ngIf="pdfLoading" style="text-align:center; padding:40px;">
                <div class="spinner-sm" style="margin-bottom:8px;"></div>
                <div>Cargando PDF...</div>
              </div>
              <div *ngIf="pdfError" style="background:#fef2f2; color:#dc2626; border:1px solid #fca5a5; padding:20px; border-radius:10px; text-align:center;">
                No se pudo cargar la plantilla PDF: <strong>{{ visualTarget.nombrePdf }}</strong>. Asegúrate de que exista en el servidor.
              </div>

              <div class="pdf-canvas-wrap" [style.visibility]="(!pdfLoading && !pdfError) ? 'visible' : 'hidden'" #pdfCanvasWrap>
                <canvas #pdfCanvas></canvas>

                <!-- Draggable overlays inside canvas wrap -->
                <div *ngFor="let box of draggableBoxes" class="zone-box"
                     [style.left.px]="box.x" [style.top.px]="box.y"
                     [style.width.px]="box.w" [style.height.px]="box.h"
                     (mousedown)="startDragBox($event, box)"
                     [style.border-color]="box.type === 'monto' ? '#0369a1' : '#1e1e2e'"
                     [style.background]="box.type === 'monto' ? 'rgba(3,105,161,.08)' : 'rgba(30,30,46,.08)'">
                  <div class="zone-label" [style.background]="box.type === 'monto' ? '#0369a1' : '#1e1e2e'">{{ box.label }}</div>
                  <div class="zone-demo">{{ box.mmX }}x{{ box.mmY }} mm</div>
                  <div class="zone-resize"
                       [style.background]="box.type === 'monto' ? '#0369a1' : '#1e1e2e'"
                       (mousedown)="startResizeBox($event, box)"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="visualEditorDialog = false">Cancelar</button>
          <button class="btn btn-primary" (click)="applyVisualCoordinates()">Aplicar Coordenadas</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .editor-columns {
      display: grid;
      grid-template-columns: 320px 1fr;
      overflow: hidden;
      min-height: 0;
    }
    .editor-left {
      overflow-y: auto;
      padding: 20px;
      border-right: 1px solid var(--gray-200);
      background: #fafafb;
    }
    .editor-right {
      display: flex;
      flex-direction: column;
      background: #f1f5f9;
      overflow: hidden;
    }
    .editor-right-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--gray-200);
      background: #fff;
      font-size: 13px;
      font-weight: 600;
      color: var(--gray-600);
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .pdf-scroll-area {
      flex: 1;
      overflow: auto;
      padding: 20px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      min-height: 0;
    }
    .pdf-canvas-wrap {
      position: relative;
      display: inline-block;
      box-shadow: 0 4px 20px rgba(0,0,0,.12);
      border-radius: 4px;
      background: white;
      user-select: none;
      flex-shrink: 0;
      overflow: visible;
    }
    .pdf-canvas-wrap canvas { display: block; }
    .zone-box {
      position: absolute;
      border: 2px dashed #1e1e2e;
      background: rgba(30,30,46,.08);
      cursor: move;
      box-sizing: border-box;
      min-width: 40px;
      min-height: 20px;
    }
    .zone-resize {
      position: absolute;
      bottom: 0; right: 0;
      width: 14px; height: 14px;
      background: #1e1e2e;
      cursor: nwse-resize;
      border-radius: 0 0 3px 0;
      z-index: 10;
    }
    .zone-label {
      position: absolute;
      top: -22px; left: 0;
      background: #1e1e2e;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px 3px 0 0;
      white-space: nowrap;
    }
    .zone-demo {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; color: var(--gray-800);
      font-size: 10px; pointer-events: none;
      overflow: hidden; white-space: nowrap;
    }
    .filter-tab {
      padding: 7px 14px;
      border-radius: 8px;
      border: 1.5px solid var(--gray-200);
      background: white;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      color: var(--gray-700);
      transition: all var(--transition);
    }
    .filter-tab:hover { border-color: var(--3m-red); color: var(--3m-red); }
    .filter-tab.active { background: var(--3m-red); color: white; border-color: var(--3m-red); }
  `]
})
export class ProjectsComponent implements OnInit {
  projects: any[] = [];
  filteredProjects: any[] = [];
  project: any = {};
  allRewards: any[] = [];
  availableRewardsOptions: any[] = [];
  associatedRewards: any[] = [];
  selectedRewardToAdd: any = null;
  projectDialog: boolean = false;
  activeTab: string = 'general';
  searchQuery: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadProjects();
    this.loadRewards();
  }

  loadProjects() {
    this.http.get<any[]>('backend/admin_api.php?action=get_projects').subscribe(data => {
      this.projects = data;
      this.filteredProjects = data;
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

  onSearch() {
    const q = this.searchQuery.toLowerCase();
    this.filteredProjects = this.projects.filter(p => {
      return p.Proyecto.toLowerCase().includes(q) || (p.nombrePdf && p.nombrePdf.toLowerCase().includes(q));
    });
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

  // --- VISUAL EDITOR STATE & METHODS ---
  @ViewChild('pdfCanvas') pdfCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pdfCanvasWrap') pdfCanvasWrapRef!: ElementRef<HTMLElement>;

  pdfLoading = false;
  pdfError = false;
  pdfScale = 1;
  visualTarget: any = {};
  visualEditorDialog = false;
  visualEditorTitle = '';
  isEditingRelation = false;
  editingRelationIndex: number = -1;
  draggableBoxes: any[] = [];

  // Dragging state
  draggedBox: any = null;
  dragStartX: number = 0;
  dragStartY: number = 0;
  boxStartX: number = 0;
  boxStartY: number = 0;

  showBox2() {
    const num = this.isEditingRelation ? (this.visualTarget.numeroCodigos || 1) : (this.project.numeroCodigos || 1);
    return num >= 2;
  }
  showBox3() {
    const num = this.isEditingRelation ? (this.visualTarget.numeroCodigos || 1) : (this.project.numeroCodigos || 1);
    return num >= 3;
  }
  showBox4() {
    const num = this.isEditingRelation ? (this.visualTarget.numeroCodigos || 1) : (this.project.numeroCodigos || 1);
    const mainNum = this.project.numeroCodigos || 1;
    return (this.isEditingRelation ? num : mainNum) >= 4;
  }
  showMontoBox() {
    return this.visualTarget.montoVariable == 1 || this.visualTarget.montoVariable === '1';
  }

  loadPdfJs(): Promise<any> {
    return new Promise((resolve) => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(pdfjsLib);
      };
      document.head.appendChild(script);
    });
  }

  async openVisualEditor(relation?: any, index?: number) {
    if (relation) {
      this.isEditingRelation = true;
      this.editingRelationIndex = index!;
      this.visualTarget = { ...relation };
      this.visualEditorTitle = `Recompensa: ${relation.Nombre}`;
    } else {
      this.isEditingRelation = false;
      this.visualTarget = { ...this.project };
      this.visualEditorTitle = `Proyecto: ${this.project.Proyecto}`;
    }

    if (!this.visualTarget.nombrePdf) {
      Swal.fire('Error', 'Por favor especifica primero el nombre de la plantilla PDF.', 'error');
      return;
    }

    this.visualEditorDialog = true;
    this.pdfLoading = true;
    this.pdfError = false;
    this.draggableBoxes = [];

    try {
      const pdfjsLib = await this.loadPdfJs();
      const pdfUrl = 'backend/admin_api.php?action=get_pdf&file=' + encodeURIComponent(this.visualTarget.nombrePdf);
      
      this.http.get(pdfUrl, { responseType: 'arraybuffer' }).subscribe({
        next: async (arrayBuffer: ArrayBuffer) => {
          try {
            const data = new Uint8Array(arrayBuffer);
            const doc = await pdfjsLib.getDocument({ data }).promise;
            const page = await doc.getPage(1);
            
            setTimeout(async () => {
              const canvas = this.pdfCanvasRef.nativeElement;
              const ctx = canvas.getContext('2d')!;
              const viewportNative = page.getViewport({ scale: 1 });
              
              const scale = Math.min(650 / viewportNative.width, 1.5);
              this.pdfScale = scale;
              
              const viewport = page.getViewport({ scale });
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              
              await page.render({ canvasContext: ctx, viewport }).promise;
              
              this.pdfLoading = false;
              this.syncVisualBoxes();
            }, 300);
          } catch (e) {
            console.error('Error parsing PDF data:', e);
            this.pdfLoading = false;
            this.pdfError = true;
          }
        },
        error: (err) => {
          console.error('Error downloading PDF:', err);
          this.pdfLoading = false;
          this.pdfError = true;
        }
      });

    } catch (e) {
      console.error(e);
      this.pdfLoading = false;
      this.pdfError = true;
    }
  }

  syncVisualBoxes() {
    const scale = this.pdfScale;
    const toPx = (mm: number) => (mm || 50) / (25.4 / 72) * scale;

    // Compute box dimensions based on fuenteTexto (pt) scaled to the canvas
    // In PDF pts: text height ≈ fontPt, approx 12 chars wide for typical code
    const fontPt = parseFloat(this.visualTarget.fuenteTexto) || 12;
    const boxH = Math.round(fontPt * scale * 1.25);          // height: line-height factor
    const boxW = Math.round(fontPt * scale * 0.55 * 12);     // width: ~12 chars wide (each char ~0.55 of font size)
    const montoW = Math.round(fontPt * scale * 0.55 * 7);    // monto box narrower

    const boxes: any[] = [];
    
    boxes.push({
      id: 'box1',
      label: 'Código 1',
      type: 'codigo',
      w: boxW,
      h: boxH,
      x: toPx(this.visualTarget.ejeX),
      y: toPx(this.visualTarget.ejeY),
      mmX: this.visualTarget.ejeX || 50,
      mmY: this.visualTarget.ejeY || 50
    });

    if (this.showBox2()) {
      boxes.push({
        id: 'box2',
        label: 'Código 2',
        type: 'codigo',
        w: boxW,
        h: boxH,
        x: toPx(this.visualTarget.ejeX2),
        y: toPx(this.visualTarget.ejeY2),
        mmX: this.visualTarget.ejeX2 || 50,
        mmY: this.visualTarget.ejeY2 || 50
      });
    }

    if (this.showBox3()) {
      boxes.push({
        id: 'box3',
        label: 'Código 3',
        type: 'codigo',
        w: boxW,
        h: boxH,
        x: toPx(this.visualTarget.ejeX3),
        y: toPx(this.visualTarget.ejeY3),
        mmX: this.visualTarget.ejeX3 || 50,
        mmY: this.visualTarget.ejeY3 || 50
      });
    }

    if (this.showBox4()) {
      boxes.push({
        id: 'box4',
        label: 'Código 4',
        type: 'codigo',
        w: boxW,
        h: boxH,
        x: toPx(this.visualTarget.ejeX4),
        y: toPx(this.visualTarget.ejeY4),
        mmX: this.visualTarget.ejeX4 || 50,
        mmY: this.visualTarget.ejeY4 || 50
      });
    }

    if (this.showMontoBox()) {
      const montoFontPt = parseFloat(this.visualTarget.fuenteTextoMonto) || fontPt;
      const montoH = Math.round(montoFontPt * scale * 1.6);
      boxes.push({
        id: 'boxMonto',
        label: 'Monto',
        type: 'monto',
        w: montoW,
        h: montoH,
        x: toPx(this.visualTarget.ejeXMonto),
        y: toPx(this.visualTarget.ejeYMonto),
        mmX: this.visualTarget.ejeXMonto || 50,
        mmY: this.visualTarget.ejeYMonto || 50
      });
    }

    this.draggableBoxes = boxes;
  }

  startDragBox(event: MouseEvent, box: any) {
    // Don't initiate drag if clicking the resize handle
    const target = event.target as HTMLElement;
    if (target.classList.contains('zone-resize')) return;

    event.preventDefault();
    event.stopPropagation();
    this.draggedBox = box;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.boxStartX = box.x;
    this.boxStartY = box.y;

    const mouseMoveHandler = (e: MouseEvent) => {
      if (!this.draggedBox) return;
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      
      let newX = this.boxStartX + dx;
      let newY = this.boxStartY + dy;

      const canvas = this.pdfCanvasRef?.nativeElement;
      if (canvas) {
        newX = Math.max(0, Math.min(newX, canvas.width - box.w));
        newY = Math.max(0, Math.min(newY, canvas.height - box.h));
      }

      this.draggedBox.x = newX;
      this.draggedBox.y = newY;

      this.draggedBox.mmX = Math.round(newX / this.pdfScale * (25.4 / 72));
      this.draggedBox.mmY = Math.round(newY / this.pdfScale * (25.4 / 72));
    };

    const mouseUpHandler = () => {
      this.draggedBox = null;
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  }

  startResizeBox(event: MouseEvent, box: any) {
    event.preventDefault();
    event.stopPropagation();

    const startMouseX = event.clientX;
    const startMouseY = event.clientY;
    const startW = box.w;
    const startH = box.h;

    const mouseMoveHandler = (e: MouseEvent) => {
      box.w = Math.max(40, startW + (e.clientX - startMouseX));
      box.h = Math.max(20, startH + (e.clientY - startMouseY));
    };

    const mouseUpHandler = () => {
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  }

  applyVisualCoordinates() {
    this.draggableBoxes.forEach(box => {
      if (box.id === 'box1') {
        this.visualTarget.ejeX = box.mmX;
        this.visualTarget.ejeY = box.mmY;
      } else if (box.id === 'box2') {
        this.visualTarget.ejeX2 = box.mmX;
        this.visualTarget.ejeY2 = box.mmY;
      } else if (box.id === 'box3') {
        this.visualTarget.ejeX3 = box.mmX;
        this.visualTarget.ejeY3 = box.mmY;
      } else if (box.id === 'box4') {
        this.visualTarget.ejeX4 = box.mmX;
        this.visualTarget.ejeY4 = box.mmY;
      } else if (box.id === 'boxMonto') {
        this.visualTarget.ejeXMonto = box.mmX;
        this.visualTarget.ejeYMonto = box.mmY;
      }
    });

    if (this.isEditingRelation) {
      this.associatedRewards[this.editingRelationIndex] = { ...this.visualTarget };
    } else {
      this.project = { ...this.visualTarget };
    }

    this.visualEditorDialog = false;
    Swal.fire('Coordenadas Aplicadas', 'Presiona "Guardar Proyecto" para guardar los cambios de forma definitiva.', 'info');
  }
}
