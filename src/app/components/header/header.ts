import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthPocketbaseService } from '../../services/auth-pocketbase.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  constructor (private auth: AuthPocketbaseService,
    public router: Router
  ){}
logout() {
  this.auth.pb.authStore.clear();
  this.router.navigate(['/login']);
}
}
