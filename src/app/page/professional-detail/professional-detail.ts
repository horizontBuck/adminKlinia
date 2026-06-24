import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthPocketbaseService } from '../../services/auth-pocketbase.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import Swal from 'sweetalert2';
import { AdminSidebar } from '../../shared/admin-sidebar/admin-sidebar';
@Component({
  selector: 'app-professional-detail',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe,  ],
  templateUrl: './professional-detail.html',
  styleUrl: './professional-detail.scss',
})
export class ProfessionalDetail implements OnInit {
  professionalId = '';
  loading = true;

  activeTab:
    | 'summary'
    | 'documents'
    | 'wallet'
    | 'withdrawals'
    | 'movements' = 'summary';

  professional: any = null;

  banks: any[] = [];
  wallet: any = null;
  transactions: any[] = [];
  withdrawalRequests: any[] = [];

  balance = 0;
  withdrawnTotal = 0;
  totalIncome = 0;
  totalTips = 0;
  totalAdjustments = 0;
  totalWithdrawals = 0;

  pendingWithdrawalTotal = 0;
  approvedWithdrawalTotal = 0;
  paidWithdrawalTotal = 0;

  selectedDocument: { label: string; url: string } | null = null;
  selectedDocumentSafeUrl: SafeResourceUrl | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthPocketbaseService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.professionalId = this.route.snapshot.paramMap.get('id') || '';

    if (!this.professionalId) {
      this.router.navigate(['/home']);
      return;
    }

    await this.loadProfessionalDetail();
  }

  async loadProfessionalDetail() {
    try {
      this.loading = true;

      const [
        professional,
        banks,
        walletList,
        withdrawals
      ] = await Promise.all([
        this.auth.pb.collection('users').getOne(this.professionalId, {
          expand: 'certificationFileUrl',
          requestKey: null
        }),
        this.auth.pb.collection('payments').getFullList({
          filter: `idUser="${this.professionalId}"`,
          sort: '-created',
          requestKey: null
        }),
        this.auth.pb.collection('wallets').getFullList({
          filter: `user="${this.professionalId}"`,
          sort: '-created',
          requestKey: null
        }),
        this.auth.pb.collection('withdrawal_requests').getFullList({
          filter: `professional="${this.professionalId}"`,
          sort: '-created',
          requestKey: null
        })
      ]);

      this.professional = professional;
      this.banks = banks;
      this.wallet = walletList[0] || null;
      this.withdrawalRequests = withdrawals;

      if (this.wallet) {
        this.balance = Number(this.wallet.balance || 0);
        this.withdrawnTotal = Number(this.wallet.withdrawnTotal || 0);

        this.transactions = await this.auth.pb
          .collection('wallet_transactions')
          .getFullList({
            filter: `wallet="${this.wallet.id}"`,
            sort: '-created',
            requestKey: null
          });

        this.calculateWalletSummary();
      }

      this.calculateWithdrawalSummary();

    } catch (error) {
      console.error('Error cargando detalle profesional:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  setTab(tab: ProfessionalDetail['activeTab']) {
    this.activeTab = tab;
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  calculateWalletSummary() {
    this.totalIncome = this.transactions
      .filter(tx => tx.type === 'professional_earning')
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    this.totalTips = this.transactions
      .filter(tx => tx.type === 'payment_received')
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    this.totalWithdrawals = this.transactions
      .filter(tx => tx.type === 'withdrawal')
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);

    this.totalAdjustments = this.transactions
      .filter(tx =>
        ['appointment_cancelled', 'refund', 'adjustment'].includes(tx.type)
      )
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  }

  calculateWithdrawalSummary() {
    this.pendingWithdrawalTotal = this.withdrawalRequests
      .filter(req => req.status === 'pending')
      .reduce((sum, req) => sum + Number(req.amount || 0), 0);

    this.approvedWithdrawalTotal = this.withdrawalRequests
      .filter(req => req.status === 'approved')
      .reduce((sum, req) => sum + Number(req.amount || 0), 0);

    this.paidWithdrawalTotal = this.withdrawalRequests
      .filter(req => req.status === 'paid')
      .reduce((sum, req) => sum + Number(req.amount || 0), 0);
  }

  getAvatarUrl(user: any): string {
    if (!user?.avatarFile) {
      return 'assets/images/resource/session-end-img.png';
    }

    return `${this.auth.pb.baseURL}/api/files/users/${user.id}/${user.avatarFile}`;
  }

  getDocumentsArray(professional: any): { label: string; url: string }[] {
    let documents = professional?.documents;

    if (!documents) return [];

    if (typeof documents === 'string') {
      try {
        documents = JSON.parse(documents);
      } catch {
        return [];
      }
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

  selectDocument(doc: { label: string; url: string }) {
    this.selectedDocument = doc;

    if (this.isPdf(doc.url)) {
      this.selectedDocumentSafeUrl =
        this.sanitizer.bypassSecurityTrustResourceUrl(doc.url);
    } else {
      this.selectedDocumentSafeUrl = null;
    }
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

  getTransactionLabel(type: string): string {
    const labels: Record<string, string> = {
      professional_earning: 'Pago por servicio',
      payment_received: 'Propina',
      withdrawal: 'Retiro',
      appointment_cancelled: 'Ajuste por cancelación',
      refund: 'Reembolso',
      adjustment: 'Ajuste manual'
    };

    return labels[type] || type;
  }

  getWithdrawalStatus(status: string): string {
    const labels: Record<string, string> = {
      pending: 'En revisión',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      paid: 'Pagado'
    };

    return labels[status] || status;
  }
  async approveWithdrawal(request: any) {
  const confirm = await Swal.fire({
    title: '¿Aprobar retiro?',
    text: 'La solicitud quedará aprobada, pero aún no marcada como pagada.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, aprobar',
    cancelButtonText: 'Cancelar'
  });

  if (!confirm.isConfirmed) return;

  await this.auth.pb.collection('withdrawal_requests').update(request.id, {
    status: 'approved',
    note: 'Retiro aprobado por administración'
  }, {
    requestKey: null
  });

  await this.loadProfessionalDetail();
}
async markWithdrawalAsPaid(request: any) {
  const confirm = await Swal.fire({
    title: '¿Marcar como pagado?',
    text: 'Confirma que la transferencia bancaria ya fue realizada.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, marcar pagado',
    cancelButtonText: 'Cancelar'
  });

  if (!confirm.isConfirmed) return;

  await this.auth.pb.collection('withdrawal_requests').update(request.id, {
    status: 'paid',
    paidAt: new Date().toISOString(),
    note: 'Retiro pagado por administración'
  }, {
    requestKey: null
  });

  await this.loadProfessionalDetail();
}
async rejectWithdrawal(request: any) {
  const confirm = await Swal.fire({
    title: '¿Rechazar retiro?',
    input: 'textarea',
    inputPlaceholder: 'Motivo del rechazo',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Rechazar',
    cancelButtonText: 'Cancelar'
  });

  if (!confirm.isConfirmed) return;

  await this.auth.pb.collection('withdrawal_requests').update(request.id, {
    status: 'rejected',
    note: confirm.value || 'Retiro rechazado por administración'
  }, {
    requestKey: null
  });

  await this.loadProfessionalDetail();
}
}
