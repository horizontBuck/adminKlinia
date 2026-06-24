import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthPocketbaseService } from '../../services/auth-pocketbase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  email = '';
  password = '';
  loading = false;
  errorMessage = '';

  constructor(
    private auth: AuthPocketbaseService,
    private router: Router
  ) {}
  async ngOnInit() {

  const user = this.auth.pb.authStore.model;

  if (
    this.auth.pb.authStore.isValid &&
    user &&
    user['role'] === 'admin'
  ) {
    this.router.navigate(['/home']);
  }

}
  async login() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Ingresa correo y contraseña.';
      return;
    }

    try {
      this.loading = true;
      this.errorMessage = '';

      const authData = await this.auth.pb
        .collection('users')
        .authWithPassword(this.email, this.password);

      const user = authData.record;

      if (user['role'] !== 'admin') {
        this.auth.pb.authStore.clear();
        this.errorMessage = 'No tienes permisos de administrador.';
        return;
      }

      this.router.navigate(['/home']);

    } catch (error) {
      console.error(error);
      this.errorMessage = 'Credenciales inválidas.';
    } finally {
      this.loading = false;
    }
  }
}