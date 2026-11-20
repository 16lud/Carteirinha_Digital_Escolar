import { Routes } from '@angular/router';
import { CadastroComponent } from './cadastro/cadastro';
import { AdminComponent } from './admin/admin';

export const routes: Routes = [
  { path: '', redirectTo: 'cadastro', pathMatch: 'full' },
  { path: 'cadastro', component: CadastroComponent },
  { path: 'admin', component: AdminComponent }
];