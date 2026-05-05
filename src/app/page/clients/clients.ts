import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Patient, PatientsService } from '../../services/patients.service';
import { Subscription } from 'rxjs';
import { AuthPocketbaseService } from '../../services/auth-pocketbase.service';
import { AdminSidebar } from '../../shared/admin-sidebar/admin-sidebar';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, AdminSidebar],
  templateUrl: './clients.html',
  styleUrl: './clients.scss',
})
export class Clients implements OnInit {
  patients: any[] = [];
  private subscription: Subscription = new Subscription();
  isReady = false;

  constructor(private patientsService: PatientsService, private cdr: ChangeDetectorRef, private auth: AuthPocketbaseService) { }

  ngOnInit(): void {
    this.subscription = this.patientsService.patients$.subscribe(
      (patients) => {
        this.patients = patients;
        console.log('📦 Pacientes recibidos en Home:', patients);
        this.cdr.detectChanges();
      }
    );
    this.isReady = true;

    setTimeout(() => {
      this.patientsService.loadPatients();
    }, 300);
  }
  formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  trackByPatientId(index: number, item: Patient): string {
    return item.id;
  }
  getAvatarUrl(user: any): string {
    if (!user?.avatarFile) {
      return 'assets/images/resource/session-end-img.png';
    }

    return `${this.auth.pb.baseURL}/api/files/users/${user.id}/${user.avatarFile}`;
  }
}
