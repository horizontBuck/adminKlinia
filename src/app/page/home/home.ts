import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
    private auth: AuthPocketbaseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.subscription = this.professionalsService.professionals$.subscribe(
      (professionals) => {
        this.professionals = professionals;
        console.log('📦 Profesionales recibidos en Home:', professionals);
        this.cdr.detectChanges();
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
    if (!professional?.id || this.loadingIds.has(professional.id)) return;

    try {
      this.loadingIds = new Set([...this.loadingIds, professional.id]);
      this.cdr.detectChanges();

      const updated = await this.professionalsService.updateProfessionalStatus(professional.id, {
        providerStatus: 'approved'
      });

      this.professionalsService.updateProfessionalInState(professional.id, {
        providerStatus: 'approved'
      });

      console.log(`✅ Profesional ${professional.name} aprobado`, updated);
    } catch (error) {
      console.error('❌ Error al aceptar profesional:', error);
    } finally {
      const next = new Set(this.loadingIds);
      next.delete(professional.id);
      this.loadingIds = next;
      this.cdr.detectChanges();
    }
  }

  async rejectProfessional(professional: Professional): Promise<void> {
    if (!professional?.id || this.loadingIds.has(professional.id)) return;

    try {
      this.loadingIds = new Set([...this.loadingIds, professional.id]);
      this.cdr.detectChanges();

      const updated = await this.professionalsService.updateProfessionalStatus(professional.id, {
        providerStatus: 'rejected'
      });

      this.professionalsService.updateProfessionalInState(professional.id, {
        providerStatus: 'rejected'
      });

      console.log(`⛔ Profesional ${professional.name} rechazado`, updated);
    } catch (error) {
      console.error('❌ Error al rechazar profesional:', error);
    } finally {
      const next = new Set(this.loadingIds);
      next.delete(professional.id);
      this.loadingIds = next;
      this.cdr.detectChanges();
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