import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthPocketbaseService } from '../../services/auth-pocketbase.service';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.html',
  styleUrl: './admin-sidebar.scss',
})
export class AdminSidebar {
 constructor(
    private router: Router,
    private auth: AuthPocketbaseService
  ) {}

  logout(event: Event): void {
    event.preventDefault();

    this.auth.pb.authStore.clear();
    localStorage.clear();

    this.router.navigate(['/login']);
  }
}
