import { Component, OnInit, OnDestroy } from '@angular/core';
import { ProfessionalsService, Professional } from '../../services/professionals.service';
import { Subscription } from 'rxjs';

import { CommonModule } from '@angular/common';

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
  // Para bloquear botones mientras actualiza
  loadingIds = new Set<string>();

  constructor(private professionalsService: ProfessionalsService) {}

 ngOnInit() {
    this.subscription = this.professionalsService.professionals$.subscribe(
      (professionals) => {
        this.professionals = professionals;
      }
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  getAvatarUrl(professional: Professional): string {
    return this.professionalsService.getAvatarUrl(professional);
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
        providerStatus: 'accepted'
      });

      // Actualización local inmediata para que se refleje sin esperar recarga
      this.professionals = this.professionals.map(p =>
        p.id === professional.id
          ? { ...p, providerStatus: 'accepted' }
          : p
      );

      console.log(`✅ Profesional ${professional.name} aceptado`);
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

      this.professionals = this.professionals.map(p =>
        p.id === professional.id
          ? { ...p, providerStatus: 'rejected' }
          : p
      );

      console.log(`⛔ Profesional ${professional.name} rechazado`);
    } catch (error) {
      console.error('❌ Error al rechazar profesional:', error);
    } finally {
      this.loadingIds.delete(professional.id);
    }
  }
}
