import { Routes } from '@angular/router';
import { Home } from './page/home/home';
import { Clients } from './page/clients/clients';
import { AdminSidebar } from './shared/admin-sidebar/admin-sidebar';
import { ProfessionalDetail } from './page/professional-detail/professional-detail';
import { adminAuthGuard } from './guards/admin-auth-guard';
import { Login } from './page/login/login';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: 'login',
    component: Login,
    title: 'KLINIA | Login Admin'
  },

  {
    path: 'home',
    component: Home,
    canActivate: [adminAuthGuard],
    title: 'KLINIA | Inicio',
     data: {
      description: 'Bienvenido a KLINIA, tu app de servicio de salud'
     }
  },

  {
    path: 'clients',
    component: Clients,
    canActivate: [adminAuthGuard],
    title: 'KLINIA | Clientes'
  },

  {
    path: 'admin',
    component: AdminSidebar,
    canActivate: [adminAuthGuard],
    title: 'KLINIA | Admin'
  },

  {
    path: 'professionals/:id',
    component: ProfessionalDetail,
    canActivate: [adminAuthGuard],
    title: 'KLINIA | Profesional'
  },

  {
    path: '**',
    redirectTo: 'login'
  }
];
