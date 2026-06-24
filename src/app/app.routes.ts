import { Routes } from '@angular/router';
import { Home } from './page/home/home';
import { Clients } from './page/clients/clients';
import { AdminSidebar } from './shared/admin-sidebar/admin-sidebar';
import { ProfessionalDetail } from './page/professional-detail/professional-detail';
import { adminAuthGuard } from './guards/admin-auth-guard';
import { Login } from './page/login/login';

export const routes: Routes = [
  {
  path: 'login',
  component: Login
},
     {
    path: '',
    component: Home,
    title: 'KLINIA | Inicio',
      canActivate: [adminAuthGuard],
    data: {
      description: 'Bienvenido a KLINIA, tu app de servicio de salud',
      canonical: '/',
    },

  },
  {
    path: 'clients',
    component: Clients,
    title: 'KLINIA | Clientes',
      canActivate: [adminAuthGuard],
    data: {
      description: 'Bienvenido a KLINIA, tu app de servicio de salud',
      canonical: '/',
    },
  },
  {
    path: 'admin',
    component: AdminSidebar,
      canActivate: [adminAuthGuard],
    title: 'KLINIA | Admin',
    data: {
      description: 'Bienvenido a KLINIA, tu app de servicio de salud',
      canonical: '/',
    },
  },
  {
    path: 'professionals/:id',
    component: ProfessionalDetail,
      canActivate: [adminAuthGuard],
    title: 'KLINIA | Profesional',
    data: {
      description: 'Bienvenido a KLINIA, tu app de servicio de salud',
      canonical: '/',
    },
  }
];
