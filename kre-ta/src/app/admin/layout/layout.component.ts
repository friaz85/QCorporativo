import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ButtonModule } from 'primeng/button';
import { SidebarModule } from 'primeng/sidebar';
import { RippleModule } from 'primeng/ripple';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, SidebarModule, RippleModule],
  template: `
    <div class="admin-container">
      <!-- Sidebar -->
      <div class="sidebar shadow-4">
        <div class="sidebar-header">
          <img src="assets/logo.webp" alt="Logo" class="logo">
          <span>ADMIN PANEL</span>
        </div>
        
        <div class="sidebar-content">
          <ul class="nav-list">
            <li [routerLinkActive]="'active'">
              <a routerLink="/admin/dashboard" pRipple>
                <i class="pi pi-chart-bar"></i>
                <span>Dashboard</span>
              </a>
            </li>
            <li [routerLinkActive]="'active'">
              <a routerLink="/admin/projects" pRipple>
                <i class="pi pi-briefcase"></i>
                <span>Proyectos</span>
              </a>
            </li>
            <li [routerLinkActive]="'active'">
              <a routerLink="/admin/rewards" pRipple>
                <i class="pi pi-gift"></i>
                <span>Recompensas</span>
              </a>
            </li>
            <li [routerLinkActive]="'active'">
              <a routerLink="/admin/codes" pRipple>
                <i class="pi pi-ticket"></i>
                <span>Códigos</span>
              </a>
            </li>
            <li [routerLinkActive]="'active'">
              <a routerLink="/admin/users" pRipple>
                <i class="pi pi-users"></i>
                <span>Usuarios</span>
              </a>
            </li>
          </ul>
        </div>

        <div class="sidebar-footer">
          <button pButton icon="pi pi-sign-out" label="Cerrar Sesión" 
                  class="p-button-text p-button-secondary w-full" (click)="logout()"></button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="main-content">
        <div class="topbar shadow-2">
          <div class="flex align-items-center gap-3">
            <h1 class="page-title">{{ getPageTitle() }}</h1>
          </div>
          <div class="user-info">
            <i class="pi pi-user-circle text-2xl"></i>
            <span>{{ authService.currentUserValue?.name || 'Admin' }}</span>
          </div>
        </div>

        <div class="content-wrapper">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-container {
      display: flex;
      min-height: 100vh;
      background: #f8fafc;
    }
    .sidebar {
      width: 280px;
      background: #fff;
      display: flex;
      flex-direction: column;
      z-index: 100;
    }
    .sidebar-header {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .sidebar-header .logo {
      height: 50px;
    }
    .sidebar-header span {
      font-weight: 700;
      color: #e31b23;
      letter-spacing: 2px;
      font-size: 0.8rem;
    }
    .sidebar-content {
      flex: 1;
      padding: 1rem;
    }
    .nav-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .nav-list li a {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      color: #64748b;
      text-decoration: none;
      border-radius: 12px;
      transition: all 0.2s ease;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }
    .nav-list li.active a {
      background: #fef2f2;
      color: #e31b23;
    }
    .nav-list li a:hover {
      background: #f1f5f9;
      color: #1e293b;
    }
    .sidebar-footer {
      padding: 1.5rem;
      border-top: 1px solid #f1f5f9;
    }
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .topbar {
      height: 70px;
      background: #fff;
      padding: 0 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .page-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: #1e293b;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: #475569;
      font-weight: 600;
    }
    .content-wrapper {
      padding: 2rem;
      flex: 1;
      overflow-y: auto;
    }
  `]
})
export class LayoutComponent {
  constructor(public authService: AuthService, private router: Router) {}

  getPageTitle(): string {
    const url = this.router.url;
    if (url.includes('dashboard')) return 'Dashboard';
    if (url.includes('projects')) return 'Gestión de Proyectos';
    if (url.includes('rewards')) return 'Gestión de Recompensas';
    if (url.includes('codes')) return 'Gestión de Códigos';
    if (url.includes('users')) return 'Gestión de Usuarios';
    return 'Administración';
  }

  logout() {
    this.authService.logout();
  }
}
