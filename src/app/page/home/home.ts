import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ProfessionalsService, Professional } from '../../services/professionals.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AuthPocketbaseService } from '../../services/auth-pocketbase.service';
import { PatientsService } from '../../services/patients.service';
import { AdminSidebar } from '../../shared/admin-sidebar/admin-sidebar';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, AdminSidebar],
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
  patients: any[] = [];
  imageCache: Record<string, any> = {};
imageUrlCache: Record<string, string> = {};
  constructor(
    private professionalsService: ProfessionalsService,
    private auth: AuthPocketbaseService,
    private patientsService: PatientsService,
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

    this.subscription = this.patientsService.patients$.subscribe(
      (patients) => {
        this.patients = patients;
        console.log('📦 Pacientes recibidos en Home:', patients);
        this.cdr.detectChanges();
      }
    );
    this.isReady = true;

    setTimeout(() => {
      this.professionalsService.loadProfessionals();
      this.patientsService.loadPatients();
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

  /* viewProfessional(professional: Professional): void {
    this.selectedProfessional = professional;
    this.isModalOpen = true;
    console.log('👁️ Ver detalles del profesional:', professional);
  } */
viewProfessional(professional: any): void {
  this.selectedProfessional = professional;
  this.isModalOpen = true;

  console.log('👁️ Profesional completo:', professional);
  console.log('📄 certifications:', professional.certifications);
  console.log('📄 certificationFileUrl:', professional.certificationFileUrl);
}
  closeProfessionalModal(): void {
    this.isModalOpen = false;
    this.selectedProfessional = null;
  }
  getProfessionalFileUrl(professional: any, fileName: string): string {
  return `${this.auth.pb.baseURL}/api/files/users/${professional.id}/${fileName}`;
}

getProfessionalDocuments(professional: any): { label: string; fileName: string; url: string }[] {
  if (!professional) return [];

  const docs: { label: string; fileName: string; url: string }[] = [];

  const addImageRecord = (label: string, imageRecord: any) => {
    if (!imageRecord?.id || !imageRecord?.image) return;

    docs.push({
      label,
      fileName: imageRecord.image,
      url: `${this.auth.pb.baseURL}/api/files/images/${imageRecord.id}/${imageRecord.image}`
    });
  };

  const addUserFile = (label: string, fileName: string) => {
    if (!fileName) return;

    docs.push({
      label,
      fileName,
      url: fileName.startsWith('http')
        ? fileName
        : `${this.auth.pb.baseURL}/api/files/users/${professional.id}/${fileName}`
    });
  };

  if (professional.certificationFile) {
    addImageRecord('Certificación profesional', professional.certificationFile);
  }

  if (Array.isArray(professional.certifications)) {
    professional.certifications.forEach((cert: any, index: number) => {
      const label =
        cert.name ||
        cert.title ||
        cert.certificationName ||
        cert.institution ||
        `Certificación ${index + 1}`;

      const fileName =
        cert.file ||
        cert.fileName ||
        cert.document ||
        cert.archivo ||
        cert.certificado ||
        cert.image;

      if (fileName) {
        addUserFile(label, fileName);
      }
    });
  }

  return docs;
}
hasProfessionalCertifications(professional: any): boolean {
  return (
    this.getProfessionalDocuments(professional).length > 0 ||
    (Array.isArray(professional?.certifications) && professional.certifications.length > 0)
  );
}

getCertificationJsonUrl(professional: any, cert: any): string | null {
  if (!professional || !cert) return null;

  const fileName =
    cert.file ||
    cert.fileName ||
    cert.document ||
    cert.archivo ||
    cert.certificado ||
    cert.image ||
    cert.url;

  if (!fileName) return null;

  if (typeof fileName === 'string' && fileName.startsWith('http')) {
    return fileName;
  }

  return `${this.auth.pb.baseURL}/api/files/users/${professional.id}/${fileName}`;
}
async loadCertificationImage(imageId: string): Promise<void> {
  if (!imageId || this.imageUrlCache[imageId]) return;

  try {
    const imageRecord = await this.auth.pb.collection('images').getOne(imageId);

    this.imageCache[imageId] = imageRecord;

    this.imageUrlCache[imageId] =
      `${this.auth.pb.baseURL}/api/files/images/${imageRecord.id}/${imageRecord['image']}`;

    this.cdr.detectChanges();
  } catch (error) {
    console.error('❌ Error cargando imagen de certificación:', error);
  }
}
getCertificationFileUrl(cert: any): string {
  const imageId = cert?.certificationFileUrl;

  if (!imageId) return '';

  if (!this.imageUrlCache[imageId]) {
    this.loadCertificationImage(imageId);
    return '';
  }

  return this.imageUrlCache[imageId];
}}