import { Routes } from '@angular/router';
import { Home } from './page/home/home';

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
];
