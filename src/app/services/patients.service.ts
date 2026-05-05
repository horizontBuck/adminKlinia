import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthPocketbaseService } from './auth-pocketbase.service';

export interface Patient {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  avatarFile?: string;
  phone?: string;
  created?: string;
}

@Injectable({ providedIn: 'root' })
export class PatientsService {
  private collection = 'users';

  private _patients$ = new BehaviorSubject<Patient[]>([]);
  public patients$ = this._patients$.asObservable();

  private _totalPatients$ = new BehaviorSubject<number>(0);
  public totalPatients$ = this._totalPatients$.asObservable();

  private loading = false;

  constructor(private auth: AuthPocketbaseService) {}

  async loadPatients(): Promise<void> {
    if (this.loading) return;

    this.loading = true;

    try {
      const records = await this.auth.pb.collection(this.collection).getFullList<Patient>({
        filter: 'role = "cliente"',
        sort: '-created',
        requestKey: null,
        fields: 'id,name,email,role,avatarFile,phone,created'
      });

      this._patients$.next(records);
      this._totalPatients$.next(records.length);

      console.log('✅ Pacientes cargados:', records.length);
    } catch (error: any) {
      console.error('❌ Error cargando pacientes:', error);
      console.error('📋 response:', error?.response);
    } finally {
      this.loading = false;
    }
  }

  getAllPatients(): Patient[] {
    return this._patients$.value;
  }

  getTotalPatients(): number {
    return this._totalPatients$.value;
  }
}