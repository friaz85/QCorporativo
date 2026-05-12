import { Routes } from '@angular/router';
import { RegistrationComponent } from './components/registration/registration.component';

export const routes: Routes = [
  { path: '', component: RegistrationComponent },
  { path: '**', redirectTo: '' }
];
