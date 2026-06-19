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
  professionals: any[] = [];
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
  ) { }

  ngOnInit() {
    this.subscription.add(
      this.professionalsService.professionals$.subscribe((professionals) => {
        this.professionals = professionals.map((professional: any) => ({
          ...professional,
          profileCompletion: 0,
          completionStatus: {},
          services: [],
          payments: [],
          workingHours: [],
          loadingProfile: true,
        }));

        this.cdr.detectChanges();

        this.loadProfessionalsExtraData();
      })
    );

    this.subscription.add(
      this.patientsService.patients$.subscribe((patients) => {
        this.patients = patients;
        this.cdr.detectChanges();
      })
    );

    this.isReady = true;

    setTimeout(() => {
      this.professionalsService.loadProfessionals();
      this.patientsService.loadPatients();
    }, 300);
  }
  async loadProfessionalsExtraData() {
    for (const professional of this.professionals) {
      try {
        const [services, payments] = await Promise.all([
  this.auth.pb.collection('services').getFullList({
    filter: `idUser="${professional.id}"`,
  }),

  this.auth.pb.collection('payments').getFullList({
    filter: `idUser="${professional.id}"`,
  }),
]);

let workingHours = await this.auth.pb.collection('working_hours').getFullList({
  filter: `user="${professional.id}"`,
});

if (workingHours.length === 0) {
  workingHours = await this.auth.pb.collection('working_hours').getFullList({
    filter: `user.id="${professional.id}"`,
  });
}

console.log('PRO:', professional.name, professional.id);
console.log('HORARIOS:', workingHours);
const fullProfessional = await this.auth.pb
  .collection('users')
  .getOne(professional.id);

const completion = this.calculateLocalCompletion(
  fullProfessional,
  services,
  payments,
  workingHours
);

Object.assign(professional, {
  ...fullProfessional,
  services,
  payments,
  workingHours,
  profileCompletion: completion.percentage,
  completionStatus: completion.status,
  loadingProfile: false,
});
      

        this.cdr.detectChanges();

      } catch (error) {
        console.error('Error cargando extras de:', professional.name, error);

        professional.loadingProfile = false;
        this.cdr.detectChanges();
      }
    }
  }
  getMissingItems(professional: any): string[] {
  const status = professional?.completionStatus || {};

  const labels: Record<string, string> = {
    avatar: 'Foto',
    name: 'Nombre',
    category: 'Especialidad',
    address: 'Dirección',
    biography: 'Biografía',
    modalidad: 'Modalidad',
    documents: 'Documentos',
    certifications: 'Certificaciones',
    languages: 'Idiomas',
    businessName: 'Nombre del consultorio',
    businessAddress: 'Dirección del consultorio',
    habilitacionNumber: 'Número de habilitación',
    services: 'Servicios',
    paymentMethods: 'Métodos de pago',
    schedule: 'Horario',
  };

  return Object.keys(labels)
    .filter(key => status[key] === false)
    .map(key => labels[key]);
}
parseArray(value: any): any[] {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

parseObject(value: any): any {
  if (!value) return {};

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
}
  calculateLocalCompletion(
    professional: any,
    services: any[],
    payments: any[],
    workingHours: any[]
  ) {
    const modalidad = this.parseArray(professional.modalidadAtencion);
    const languages = this.parseArray(professional.languages);
    const certifications = this.parseArray(professional.certifications);

    const requiereConsultorio = modalidad.includes('consultorio');

    const documents = this.parseObject(professional.documents);

    const hasDocuments =
      !!documents?.rethus?.fileUrl ||
      !!documents?.diploma?.fileUrl ||
      !!documents?.cv?.fileUrl;

    const hasSchedule = workingHours.some((item: any) =>
      item?.is_active === true &&
      this.hasValue(item?.start_time) &&
      this.hasValue(item?.end_time)
    );

   const checks = {
  avatar: this.hasValue(professional.avatarFile),
  name: this.hasValue(professional.name),
  category: this.hasValue(professional.category),
  address: this.hasValue(professional.address),
  biography: this.hasValue(professional.Biography),
  modalidad: modalidad.length > 0,
  documents: hasDocuments,
  certifications: certifications.length > 0 || hasDocuments,
  languages: languages.length > 0,
  businessName: !requiereConsultorio || this.hasValue(professional.businessName),
  businessAddress: !requiereConsultorio || this.hasValue(professional.businessAddress),
  habilitacionNumber: !requiereConsultorio || this.hasValue(professional.habilitacionNumber),
  services: services.length > 0,
  paymentMethods: payments.length > 0,
  schedule: hasSchedule,
};

    const total = Object.keys(checks).length;
    const completed = Object.values(checks).filter(Boolean).length;

    return {
      percentage: Math.round((completed / total) * 100),
      status: checks,
    };
  }
  
  hasValue(value: any): boolean {
    if (value === null || value === undefined) return false;

    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }

    return true;
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

    } catch (error) {
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

    } catch (error) {
    } finally {
      const next = new Set(this.loadingIds);
      next.delete(professional.id);
      this.loadingIds = next;
      this.cdr.detectChanges();
    }
  }


  viewProfessional(professional: any): void {
    this.selectedProfessional = professional;
    this.isModalOpen = true;

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
  }

  getDocumentsArray(professional: any): { label: string; url: string }[] {
    let documents = professional?.documents;

    if (!documents) return [];

    if (typeof documents === 'string') {
      documents = this.safeJsonParse(documents);
    }

    if (Array.isArray(documents)) {
      documents = documents[0];
    }

    if (!documents || typeof documents !== 'object') return [];

    return Object.entries(documents)
      .map(([key, value]: any) => {
        const url = value?.fileUrl || value?.url || value?.file;

        if (!url) return null;

        return {
          label: this.formatDocumentName(key),
          url
        };
      })
      .filter((doc): doc is { label: string; url: string } => !!doc);
  }

  safeJsonParse(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  formatDocumentName(key: string): string {
    const labels: Record<string, string> = {
      cv: 'Hoja de vida',
      diploma: 'Diploma',
      rethus: 'RETHUS',
      doc: 'Documento',
      documento: 'Documento',
      habilitacion: 'Habilitación',
      tarjeta_profesional: 'Tarjeta profesional'
    };

    return labels[key] || key;
  }

  previewUrl = '';

  previewImage(url: string) {
    this.previewUrl = url;
  }
}