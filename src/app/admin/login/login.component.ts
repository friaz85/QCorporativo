import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <div class="login-box">
        <div class="login-logo">
          <div class="logo-mark"><span>CQ</span></div>
          <h1>Corporativo</h1>
          <p>Panel de Administración</p>
        </div>

        <div class="login-error" [class.visible]="error">{{ error }}</div>

        <form (ngSubmit)="onLogin()">
          <div class="form-group">
            <label class="form-label">Usuario</label>
            <input class="form-control" type="text" [(ngModel)]="credentials.username" name="username"
              placeholder="usuario" autocomplete="username" required>
          </div>
          <div class="form-group">
            <label class="form-label">Contraseña</label>
            <input class="form-control" type="password" [(ngModel)]="credentials.password" name="password"
              placeholder="••••••••" autocomplete="current-password" required>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:8px;" [disabled]="loading">
            <span *ngIf="!loading">Iniciar sesión</span>
            <span *ngIf="loading" class="spinner" style="width:18px;height:18px;border-width:2px;color:white;"></span>
          </button>
        </form>
      </div>
    </div>
  `
})
export class LoginComponent {
  credentials = { username: '', password: '' };
  loading = false;
  error = '';

  constructor(private authService: AuthService, private router: Router) {}

  onLogin() {
    if (!this.credentials.username || !this.credentials.password) return;
    this.loading = true;
    this.error = '';
    this.authService.login(this.credentials).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Usuario o contraseña incorrectos.';
      }
    });
  }
}
