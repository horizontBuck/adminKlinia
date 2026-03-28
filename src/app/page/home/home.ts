import { Component, OnInit, OnDestroy } from '@angular/core';
import { ProfessionalsService, Professional } from '../../services/professionals.service';
import { Subscription } from 'rxjs';

import { CommonModule } from '@angular/common';
import { AuthPocketbaseService } from '../../services/auth-pocketbase.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class Home implements OnInit, OnDestroy {
  professionals: Professional[] = [];
  private subscription: Subscription = new Subscription();
  loadingIds = new Set<string>();
  isReady = false;
  selectedProfessional: Professional | null = null;
  isModalOpen = false;
  constructor(
    private professionalsService: ProfessionalsService,
    private auth: AuthPocketbaseService
  ) {
    
  }


ngOnInit() {
  this.subscription = this.professionalsService.professionals$.subscribe(
    (professionals) => {
      this.professionals = professionals;
      console.log('📦 Profesionales recibidos en Home:', professionals);
          }
  );
  this.isReady = true;

  setTimeout(() => {
    this.professionalsService.loadProfessionals();
  }, 300);
}


trackByProfessionalId(index: number, item: Professional): string {
  return item.id;
}
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  getAvatarUrl(user: any): string {
  if (!user?.avatarFile) {
    return 'assets/images/resource/session-end-img.png';
  }

  return `${this.auth.pb.baseURL}/api/files/users/${user.id}/${user.avatarFile}`;
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

async acceptProfessional(professional: Professional): Promise<void> {
  if (!professional?.id) return;

  try {
    this.loadingIds.add(professional.id);

    await this.professionalsService.updateProfessionalStatus(professional.id, {
      providerStatus: 'approved'
    });

    console.log(`✅ Profesional ${professional.name} aprobado`);
  } catch (error) {
    console.error('❌ Error al aceptar profesional:', error);
  } finally {
    this.loadingIds.delete(professional.id);
  }
}
 async rejectProfessional(professional: Professional): Promise<void> {
  if (!professional?.id) return;

  try {
    this.loadingIds.add(professional.id);

    await this.professionalsService.updateProfessionalStatus(professional.id, {
      providerStatus: 'rejected'
    });

    console.log(`⛔ Profesional ${professional.name} rechazado`);
  } catch (error) {
    console.error('❌ Error al rechazar profesional:', error);
  } finally {
    this.loadingIds.delete(professional.id);
  }
}

viewProfessional(professional: Professional): void {
    this.selectedProfessional = professional;
    this.isModalOpen = true;
    console.log('👁️ Ver detalles del profesional:', professional);
  }

  closeProfessionalModal(): void {
    this.isModalOpen = false;
    this.selectedProfessional = null;
  }
}
