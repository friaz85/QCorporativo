import { Routes } from '@angular/router';
import { RegistrationComponent } from './components/registration/registration.component';
import { authGuard } from './admin/guards/auth.guard';

export const routes: Routes = [
  { path: '', component: RegistrationComponent },
  { 
    path: 'admin/login', 
    loadComponent: () => import('./admin/login/login.component').then(m => m.LoginComponent) 
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { 
        path: 'dashboard', 
        loadComponent: () => import('./admin/dashboard/dashboard.component').then(m => m.DashboardComponent) 
      },
      { 
        path: 'projects', 
        loadComponent: () => import('./admin/projects/projects.component').then(m => m.ProjectsComponent) 
      },
      { 
        path: 'rewards', 
        loadComponent: () => import('./admin/rewards/rewards.component').then(m => m.RewardsComponent) 
      },
      { 
        path: 'codes', 
        loadComponent: () => import('./admin/codes/codes.component').then(m => m.CodesComponent) 
      },
      { 
        path: 'users', 
        loadComponent: () => import('./admin/users/users.component').then(m => m.UsersComponent) 
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
