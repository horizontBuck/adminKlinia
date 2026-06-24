import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ProfessionalsService, Professional } from '../../services/professionals.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AuthPocketbaseService } from '../../services/auth-pocketbase.service';
import { PatientsService } from '../../services/patients.service';
import { AdminSidebar } from '../../shared/admin-sidebar/admin-sidebar';
import { Category } from '../../interfaces/category.interface';
import { CategoriesService } from '../../services/categories.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Route, Router } from '@angular/router';
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
  categories: Category[] = [];
  selectedDocument: { label: string; url: string } | null = null;
  selectedDocumentSafeUrl: SafeResourceUrl | null = null;
  currentPage = 1;
  pageSize = 20;
  selectedProfessionalBanks: any[] = [];
  selectedProfessionalWallet: any = null;
  selectedProfessionalTransactions: any[] = [];
  walletLoading = false;
  bankLoading = false;
  professionalBalance = 0;
  professionalWithdrawnTotal = 0;
  professionalTotalIncome = 0;
  professionalTotalWithdrawals = 0;
  professionalTotalAdjustments = 0;
  professionalTotalTips = 0;
  selectedProfessionalWithdrawalRequests: any[] = [];
  professionalPendingWithdrawalTotal = 0;
  professionalPaidWithdrawalTotal = 0;
  professionalApprovedWithdrawalTotal = 0;
  constructor(
    private professionalsService: ProfessionalsService,
    private auth: AuthPocketbaseService,
    private patientsService: PatientsService,
    private cdr: ChangeDetectorRef,
    private categoriesService: CategoriesService,
    private sanitizer: DomSanitizer,
    public router: Router
  ) { }

 ngOnInit() {
  this.loadCategories();

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
    this.professionalsService.loadProfessionals(1);
    this.patientsService.loadPatients();
  }, 300);
}
  loadCategories() {
    this.categoriesService.listTop().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando categorías:', error);
        this.categories = [];
      },
    });
  }

  getCategoryName(categoryId: string): string {
    if (!categoryId) return 'Sin categoría';

    return (
      this.categories.find(c => c.id === categoryId)?.name ||
      categoryId
    );
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
  getModalidades(professional: any): string {
  const modalidades = this.parseArray(professional?.modalidadAtencion);

  if (!modalidades.length) {
    return 'No disponible';
  }

  return modalidades.join(', ');
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

  /*  viewProfessional(professional: any): void {
     this.selectedProfessional = professional;
     this.isModalOpen = true;
 
     const docs = this.getDocumentsArray(professional);
     if (docs.length > 0) {
       this.selectDocument(docs[0]);
     } else {
       this.clearSelectedDocument();
     }
   } */
  async viewProfessional(professional: any): Promise<void> {
    this.selectedProfessional = professional;
    this.isModalOpen = true;

    this.bankLoading = true;
    this.walletLoading = true;
    
    const docs = this.getDocumentsArray(professional);

    if (docs.length > 0) {
      this.selectDocument(docs[0]);
    } else {
      this.clearSelectedDocument();
    }

    await Promise.allSettled([
  this.loadProfessionalBankData(professional.id),
  this.loadProfessionalWalletData(professional.id),
  this.loadProfessionalWithdrawalRequests(professional.id)
]);
  }

  /*  closeProfessionalModal(): void {
     this.isModalOpen = false;
     this.selectedProfessional = null;
     this.clearSelectedDocument();
   } */
  closeProfessionalModal(): void {
    this.isModalOpen = false;
    this.selectedProfessional = null;
    this.clearSelectedDocument();

    this.selectedProfessionalBanks = [];
    this.selectedProfessionalWallet = null;
    this.selectedProfessionalTransactions = [];
    this.resetProfessionalWalletSummary();
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
  isPdf(url: string): boolean {
    return /\.pdf(\?|#|$)/i.test(url);
  }

  isImage(url: string): boolean {
    return /\.(jpg|jpeg|png|webp)(\?|#|$)/i.test(url);
  }

  getFileName(url: string): string {
    return decodeURIComponent(url.split('/').pop() || 'Documento');
  }
  selectDocument(doc: { label: string; url: string }) {
    this.selectedDocument = doc;

    if (this.isPdf(doc.url)) {
      this.selectedDocumentSafeUrl =
        this.sanitizer.bypassSecurityTrustResourceUrl(doc.url);
    } else {
      this.selectedDocumentSafeUrl = null;
    }
  }

  clearSelectedDocument() {
    this.selectedDocument = null;
    this.selectedDocumentSafeUrl = null;
  }
  get paginatedProfessionals() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.professionals.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.professionals.length / this.pageSize);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number) {
    this.currentPage = page;
  }

  get pages(): number[] {
    return Array.from(
      { length: this.totalPages },
      (_, i) => i + 1
    );
  }
  async loadProfessionalBankData(professionalId: string) {
    this.bankLoading = true;
    this.selectedProfessionalBanks = [];

    try {
      const banks = await this.auth.pb.collection('payments').getFullList({
        filter: `idUser="${professionalId}"`,
        sort: '-created',
        requestKey: null
      });

      this.selectedProfessionalBanks = banks;
    } catch (error) {
      console.error('Error cargando bancos del profesional:', error);
      this.selectedProfessionalBanks = [];
    } finally {
      this.bankLoading = false;
      this.cdr.detectChanges();
    }
  }
  async loadProfessionalWalletData(professionalId: string) {
    this.walletLoading = true;
    this.selectedProfessionalWallet = null;
    this.selectedProfessionalTransactions = [];
    this.resetProfessionalWalletSummary();

    try {
      const wallets = await this.auth.pb.collection('wallets').getFullList({
        filter: `user="${professionalId}"`,
        sort: '-created',
        requestKey: null
      });

      this.selectedProfessionalWallet = wallets[0] || null;

      if (!this.selectedProfessionalWallet) {
        return;
      }

      this.professionalBalance = Number(this.selectedProfessionalWallet.balance || 0);
      this.professionalWithdrawnTotal = Number(this.selectedProfessionalWallet.withdrawnTotal || 0);

      const transactions = await this.auth.pb.collection('wallet_transactions').getFullList({
        filter: `wallet="${this.selectedProfessionalWallet.id}"`,
        sort: '-created',
        requestKey: null
      });

      this.selectedProfessionalTransactions = transactions;
      this.calculateProfessionalWalletSummary();

    } catch (error) {
      console.error('Error cargando wallet del profesional:', error);
      this.selectedProfessionalWallet = null;
      this.selectedProfessionalTransactions = [];
      this.resetProfessionalWalletSummary();
    } finally {
      this.walletLoading = false;
      this.cdr.detectChanges();
    }
  }
  async loadProfessionalWithdrawalRequests(professionalId: string) {
  try {
    const requests = await this.auth.pb
      .collection('withdrawal_requests')
      .getFullList({
        filter: `professional="${professionalId}"`,
        sort: '-created',
        requestKey: null
      });

    this.selectedProfessionalWithdrawalRequests = requests;

    this.professionalPendingWithdrawalTotal = requests
      .filter(req => req['status'] === 'pending')
      .reduce((sum, req) => sum + Number(req['amount'] || 0), 0);

    this.professionalApprovedWithdrawalTotal = requests
      .filter(req => req['status'] === 'approved')
      .reduce((sum, req) => sum + Number(req['amount'] || 0), 0);

    this.professionalPaidWithdrawalTotal = requests
      .filter(req => req['status'] === 'paid')
      .reduce((sum, req) => sum + Number(req['amount'] || 0), 0);

  } catch (error) {
    console.error('Error cargando solicitudes de retiro:', error);
    this.selectedProfessionalWithdrawalRequests = [];
    this.professionalPendingWithdrawalTotal = 0;
    this.professionalApprovedWithdrawalTotal = 0;
    this.professionalPaidWithdrawalTotal = 0;
  } finally {
    this.cdr.detectChanges();
  }
}
  calculateProfessionalWalletSummary() {

    this.professionalTotalIncome = this.selectedProfessionalTransactions
      .filter(tx => tx.type === 'professional_earning')
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    this.professionalTotalTips = this.selectedProfessionalTransactions
      .filter(tx => tx.type === 'payment_received')
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    this.professionalTotalWithdrawals = this.selectedProfessionalTransactions
      .filter(tx => tx.type === 'withdrawal')
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);

    this.professionalTotalAdjustments = this.selectedProfessionalTransactions
      .filter(tx =>
        ['appointment_cancelled', 'refund', 'adjustment']
          .includes(tx.type)
      )
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  }

  resetProfessionalWalletSummary() {
    this.professionalBalance = 0;
    this.professionalWithdrawnTotal = 0;
    this.professionalTotalIncome = 0;
    this.professionalTotalTips = 0;
    this.professionalTotalWithdrawals = 0;
    this.professionalTotalAdjustments = 0;
  }
goToProfessionalDetail(professional: any) {
  if (!professional?.id) return;

  this.closeProfessionalModal();

  this.router.navigate(['/professionals', professional.id]);
}
}