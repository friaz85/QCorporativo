import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, PasswordModule, ButtonModule, MessageModule],
  template: `
    <div class="login-wrapper">
      <div class="login-card glass-panel" @fadeInUp>
        <div class="login-header">
          <img src="assets/logo.webp" alt="CQ Logo" class="logo">
          <h2>Panel Administrativo</h2>
          <p>Ingresa tus credenciales para continuar</p>
        </div>

        <form (ngSubmit)="onLogin()" #loginForm="ngForm">
          <div class="form-group">
            <label>Usuario</label>
            <span class="p-input-icon-left w-full">
              <i class="pi pi-user"></i>
              <input type="text" pInputText name="username" [(ngModel)]="credentials.username" 
                     class="w-full" placeholder="Usuario" required>
            </span>
          </div>

          <div class="form-group">
            <label>Contraseña</label>
            <span class="p-input-icon-left w-full">
              <i class="pi pi-lock"></i>
              <p-password name="password" [(ngModel)]="credentials.password" 
                          [toggleMask]="true" [feedback]="false" styleClass="w-full"
                          placeholder="••••••••" required></p-password>
            </span>
          </div>

          <button pButton type="submit" label="ACCEDER AL PANEL" 
                  [loading]="loading" class="w-full p-button-danger mt-4"></button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: url('/assets/background.png') no-repeat center center fixed;
      background-size: cover;
      padding: 20px;
    }
    .login-card {
      padding: 3rem;
      width: 100%;
      max-width: 450px;
      text-align: center;
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    }
    .glass-panel {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }
    .login-header .logo {
      height: 80px;
      margin-bottom: 1.5rem;
    }
    .login-header h2 {
      margin: 0;
      color: #1e293b;
      font-size: 1.8rem;
    }
    .login-header p {
      color: #64748b;
      margin-top: 0.5rem;
      margin-bottom: 2rem;
    }
    .form-group {
      text-align: left;
      margin-bottom: 1.5rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #334155;
    }
  `]
})
export class LoginComponent {
  credentials = { username: '', password: '' };
  loading = false;

  constructor(private authService: AuthService, private router: Router) {}

  onLogin() {
    this.loading = true;
    this.authService.login(this.credentials).subscribe({
      next: (res) => {
        this.loading = false;
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        Swal.fire('Error de Acceso', 'Usuario o contraseña incorrectos.', 'error');
      }
    });
  }
}
