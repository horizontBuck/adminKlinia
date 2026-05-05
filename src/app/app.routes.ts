import { Routes } from '@angular/router';
import { Home } from './page/home/home';
import { Clients } from './page/clients/clients';
import { AdminSidebar } from './shared/admin-sidebar/admin-sidebar';

export const routes: Routes = [
     {
    path: '',
    component: Home,
    title: 'KLINIA | Inicio',
    data: {
      description: 'Bienvenido a KLINIA, tu app de servicio de salud',
      canonical: '/',
    },

  },
  {
    path: 'home',
    component: Home,
    title: 'KLINIA | Inicio',
    data: {
      description: 'Bienvenido a KLINIA, tu app de servicio de salud',
      canonical: '/',
    },
  },
  {
    path: 'clients',
    component: Clients,
    title: 'KLINIA | Clientes',
    data: {
      description: 'Bienvenido a KLINIA, tu app de servicio de salud',
      canonical: '/',
    },
  },
  {
    path: 'admin',
    component: AdminSidebar,
    title: 'KLINIA | Admin',
    data: {
      description: 'Bienvenido a KLINIA, tu app de servicio de salud',
      canonical: '/',
    },
  },
];
