import { Injectable } from '@angular/core';
import PocketBase, { RecordModel } from 'pocketbase';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { signal } from '@angular/core';
import { globalUser } from '../state/global-user.signal';
import { HttpClient } from '@angular/common/http';

const PB_URL = 'https://db.buckapi.site:8070';


export type Role = 'cliente' | 'proveedor';

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  agree: boolean;
  type: 'cliente' | 'proveedor';
  businessName?: string;
  docType: string;
  docNumber: string;
  phone: string;
  avatarFile?: File;
}

@Injectable({ providedIn: 'root' })
export class AuthPocketbaseService {
  public pb = new PocketBase(PB_URL);
  /*   currentUser$ = new BehaviorSubject<any>(null);
   */
  private STORAGE_KEY = 'pocketbase_auth';
  private REMEMBER_KEY = 'pb_remember'; // '1' | '0'

  private listeners: Array<(loggedIn: boolean) => void> = [];
  user: any = null;
  client: any = null;

  private currentUserSubject = new BehaviorSubject<any>(null);
  currentUser$ = this.currentUserSubject.asObservable();
  constructor(private router: Router, private http: HttpClient) {
    this.pb = new PocketBase(PB_URL);

    // Restaurar sesión desde localStorage o sessionStorage
    const saved =
      localStorage.getItem(this.STORAGE_KEY) ??
      sessionStorage.getItem(this.STORAGE_KEY) ??
      '';
    if (saved) {
      this.pb.authStore.loadFromCookie(saved);
      this.loadUser(); // 🔥 EMITIR USUARIO AL ARRANCAR
    }
    // Persistir el token según preferencia "Recordarme"
    this.pb.authStore.onChange(() => {
      const cookie = this.pb.authStore.exportToCookie();
      const remember = (localStorage.getItem(this.REMEMBER_KEY) ?? '1') === '1';
      if (remember) {
        localStorage.setItem(this.STORAGE_KEY, cookie);
        sessionStorage.removeItem(this.STORAGE_KEY);
      } else {
        sessionStorage.setItem(this.STORAGE_KEY, cookie);
        localStorage.removeItem(this.STORAGE_KEY);
      }
    });
    // Listen to auth changes
    this.pb.authStore.onChange(() => {
      this.loadUser();
      this.listeners.forEach(cb => cb(this.isLoggedIn));
    });
  }

  get currentUser() {
    return this.currentUserSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.pb.authStore.model;
  }
  private loadUser() {
    const user = this.pb.authStore.model;

    this.currentUserSubject.next(user ? { ...user } : null);

    if (user) {
      globalUser.set(user);
    } else {
      globalUser.set(null);
    }
  }


  emitUser(u: any) {
    this.currentUserSubject.next(u);
  }


  logout() {
    this.pb.authStore.clear();
    globalUser.set(null);  // 🔥 Limpia el estado global
    localStorage.removeItem(this.STORAGE_KEY);
    sessionStorage.removeItem(this.STORAGE_KEY);
    this.router.navigate(['/login']);
  }
 
 /*  async initPushAfterLogin(user: any) {
    console.log('🔔 Iniciando push para usuario:', user.id);
    const token = await this.pushService.initPushOnce();
    if (token) {
      // Envía token + userId real al backend
      this.pushService.sendTokenToBackend(token).subscribe({
        next: () => console.log('✅ Token registrado en backend con userId:', user.id),
        error: (err) => console.error('❌ Error al registrar token', err)
      });
    }
  } */


  /** Iniciar sesión */

 /*  async login(email: string, password: string, remember = true) {
  localStorage.setItem(this.REMEMBER_KEY, remember ? '1' : '0');

  const res = await this.pb.collection('users').authWithPassword(email, password);

  const user = res.record;

  globalUser.set(user);
  this.currentUserSubject.next(user ? { ...user } : null);

  // persistir inmediatamente
  const cookie = this.pb.authStore.exportToCookie();
  if (remember) {
    localStorage.setItem(this.STORAGE_KEY, cookie);
    sessionStorage.removeItem(this.STORAGE_KEY);
  } else {
    sessionStorage.setItem(this.STORAGE_KEY, cookie);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  this.initPushAfterLogin(user).catch(err =>
    console.warn('Push init error:', err)
  );

  return user;
} */
async login(email: string, password: string, remember = true) {
  localStorage.setItem(this.REMEMBER_KEY, remember ? '1' : '0');

  const res = await this.pb.collection('users').authWithPassword(email, password);
  const user = res.record;

  globalUser.set(user);
  this.currentUserSubject.next(user ? { ...user } : null);

  const cookie = this.pb.authStore.exportToCookie();

  if (remember) {
    localStorage.setItem(this.STORAGE_KEY, cookie);
    sessionStorage.removeItem(this.STORAGE_KEY);
  } else {
    sessionStorage.setItem(this.STORAGE_KEY, cookie);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /* this.initPushAfterLogin(user).catch(err =>
    console.warn('Push init error:', err)
  ); */

  return user;
}
  async register(dto: RegisterDto, avatarFile?: File): Promise<RecordModel> {
    if (!dto.agree) throw new Error('Debes aceptar los Términos y Condiciones.');
    if (dto.password !== dto.passwordConfirm) throw new Error('Las contraseñas no coinciden.');
    if (dto.password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');

    const username = this.buildUsername(dto.email, dto.name);
    const form = new FormData();

    form.append('username', username);
    form.append('name', dto.name);
    form.append('email', dto.email);
    form.append('emailVisibility', 'true');
    form.append('password', dto.password);
    form.append('passwordConfirm', dto.passwordConfirm);
    form.append('role', dto.type);
    form.append('termsAccepted', 'true');
    form.append('docType', dto.docType);
    form.append('docNumber', dto.docNumber);
    form.append('phone', dto.phone);

    if (dto.type === 'proveedor') {
      form.append('providerStatus', 'pending');
      if (dto.businessName) form.append('businessName', dto.businessName);
    }

    if (avatarFile) {
      console.log('🖼️ avatarFile info:', avatarFile.name, avatarFile.type, avatarFile.size);
      form.append('avatarFile', avatarFile, avatarFile.name);
    }

    for (const [k, v] of form.entries()) console.log(`📦 ${k}:`, v);

    try {
      const record = await this.pb.collection('users').create(form);
      try { await this.pb.collection('users').authWithPassword(dto.email, dto.password); } catch { }
      return await this.pb.collection('users').getOne(record.id);
    } catch (err: any) {
      console.error('❌ PocketBase raw error:', err);
      console.error('❌ PocketBase data error:', err?.data);
      throw this.mapPocketbaseError(err);
    }
  }


  async registerViaFetch(dto: any, avatarFile: File) {
    const form = new FormData();

    // Llenamos el FormData igual que PocketBase espera
    form.append("username", this.buildUsername(dto.email, dto.name));
    form.append("name", dto.name);
    form.append("email", dto.email);
    form.append("emailVisibility", "true");
    form.append("password", dto.password);
    form.append("passwordConfirm", dto.passwordConfirm);
    form.append("role", dto.type);
    form.append("termsAccepted", "true");
    form.append("docType", dto.docType);
    form.append("docNumber", dto.docNumber);
    form.append("phone", dto.phone);

    if (dto.type === "proveedor" && dto.businessName) {
      form.append("businessName", dto.businessName);
      form.append("providerStatus", "pending");
    }

    if (avatarFile) {
      form.append("avatarFile", avatarFile, avatarFile.name);
    }

    // 🚀 REGISTRO SIN SDK
    const url = "https://db.buckapi.site:8070/api/collections/users/records";

    const res = await fetch(url, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error("❌ Error PB:", errorData);
      throw new Error(errorData?.message || "Error creando usuario");
    }

    const record = await res.json();
    return record;
  }


  /** Subir/actualizar avatar en cualquier momento */
  async uploadAvatar(userId: string, file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      await this.pb.collection('users').update(userId, formData);
      // refrescar el modelo en authStore si corresponde
      if (this.currentUser?.id === userId) {
        const rec = await this.pb.collection('users').getOne(userId);
        this.pb.authStore.save(this.pb.authStore.token, rec as any);
      }
    } catch (err) {
      throw this.mapPocketbaseError(err);
    }
  }

  /** Inicializar/renovar sesión si existe */
async initSession(): Promise<boolean> {
  try {
    const saved =
      localStorage.getItem(this.STORAGE_KEY) ??
      sessionStorage.getItem(this.STORAGE_KEY) ??
      '';

    console.log('initSession saved =>', !!saved);

    if (!saved) {
      this.pb.authStore.clear();
      this.currentUserSubject.next(null);
      globalUser.set(null);
      return false;
    }

    // 1) Restaurar desde storage
    this.pb.authStore.loadFromCookie(saved);

    console.log('after loadFromCookie model =>', this.pb.authStore.model);
    console.log('after loadFromCookie valid =>', this.pb.authStore.isValid);

    // 2) Si no es válido, sí limpiar
    if (!this.pb.authStore.isValid) {
      this.pb.authStore.clear();
      this.currentUserSubject.next(null);
      globalUser.set(null);
      return false;
    }

    // 3) Emitir usuario restaurado antes del refresh
    const restoredUser = this.pb.authStore.model;
    this.currentUserSubject.next(restoredUser ? { ...restoredUser } : null);
    globalUser.set(restoredUser ?? null);

    // 4) Intentar refresh, pero NO matar la sesión si falla y el store sigue válido
    try {
      await this.pb.collection('users').authRefresh();

      const refreshedUser = this.pb.authStore.model;
      this.currentUserSubject.next(refreshedUser ? { ...refreshedUser } : null);
      globalUser.set(refreshedUser ?? null);

      console.log('authRefresh OK =>', refreshedUser);
      return !!refreshedUser;
    } catch (refreshError) {
      console.warn('⚠️ authRefresh falló, se conserva sesión local:', refreshError);
      console.log('fallback model =>', this.pb.authStore.model);
      console.log('fallback valid =>', this.pb.authStore.isValid);

      // si el store aún está válido, conservar sesión
      if (this.pb.authStore.isValid && this.pb.authStore.model) {
        return true;
      }

      this.pb.authStore.clear();
      this.currentUserSubject.next(null);
      globalUser.set(null);
      localStorage.removeItem(this.STORAGE_KEY);
      sessionStorage.removeItem(this.STORAGE_KEY);
      return false;
    }
  } catch (error) {
    console.error('❌ Error en initSession:', error);
    this.pb.authStore.clear();
    this.currentUserSubject.next(null);
    globalUser.set(null);
    localStorage.removeItem(this.STORAGE_KEY);
    sessionStorage.removeItem(this.STORAGE_KEY);
    return false;
  }
}
  async loginWithGoogle(response: any) {
    try {
      const idToken = response.credential;
      console.log('Google ID Token:', idToken);

      // Enviar el token al backend y obtener los datos del usuario
      const authData = await this.pb.collection('users').authWithOAuth2({
        provider: 'google',
        token: idToken, // El token de Google se pasa al servidor
      });

      const user = authData.record;
      globalUser.set(user);  // Guardar el usuario en el estado global
      this.currentUserSubject.next(user);
      // Forzar actualización del estado de autenticación
      this.pb.authStore.save(this.pb.authStore.token, user as any);

      // Registrar push si es necesario
/*       await this.initPushAfterLogin(user);
 */
      return user;
    } catch (err) {
      console.error('Error en login con Google:', err);
      throw new Error('Error al autenticar con Google');
    }
  }
  onAuthChange(cb: (loggedIn: boolean) => void) {
    this.listeners.push(cb);
  }

  getCurrentUserId(): string | null {
    return this.pb.authStore.model?.id ?? null;
  }
  getCurrentUser() {
    return this.pb.authStore.model;
  }
  get userId() {
    return this.pb.authStore.model?.id;
  }

  get role() {
    return this.pb.authStore.model?.['role'];
  }

  async updateMyFields(patch: Partial<RecordModel>): Promise<RecordModel> {
    const id = this.getCurrentUserId();
    if (!id) throw new Error('No hay usuario autenticado.');
    const rec = await this.pb.collection('users').update(id, patch);
    // Forzar actualización del estado de autenticación
    this.pb.authStore.save(this.pb.authStore.token, rec as any);
    globalUser.set(rec);
    return rec;
  }

  async updateMyLocation(lat: number, long: number): Promise<RecordModel> {
    return this.updateMyFields({ lat, long } as any);
  }

  /** Helper: construir username legible y único */
  private buildUsername(email: string, name: string): string {
    const base = (name || email.split('@')[0] || 'user')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')     // elimina diacríticos
      .replace(/[^a-z0-9]+/g, '')          // solo alfanumérico
      .slice(0, 16);
    const suffix = Math.random().toString(36).slice(2, 6);
    return `${base || 'user'}_${suffix}`;
  }
  getAvatarUrl(user: any): string {
    if (!user?.avatarFile) return 'assets/img/default-avatar.png';
    return this.pb.files.getURL(user, user.avatarFile);
  }

  /** Normaliza errores de PB a mensajes claros */
  private mapPocketbaseError(err: unknown): Error {
    const e = err as any;
    const payload = (e?.data ?? e?.response ?? {}) as {
      code?: number;
      message?: string;
      data?: Record<string, { code?: string; message?: string }>;
    };

    const status: number = e?.status ?? 0;
    const message: string = e?.message ?? payload?.message ?? 'Error';
    const fields = (payload?.data ?? {}) as Record<string, { code?: string; message?: string }>;

    if (status === 400) {
      if (fields['email']?.code === 'validation_invalid_email') return new Error('El email no es válido.');
      if (fields['email']?.code === 'validation_value_already_in_use') return new Error('Este email ya está registrado.');
      if (fields['username']?.code === 'validation_value_already_in_use') return new Error('El username ya está en uso.');
      if (fields['password']?.code) return new Error('La contraseña no cumple los requisitos.');
      if (fields['role']?.code) return new Error('Rol no permitido.');
      if (message.includes('Failed to create record')) return new Error('Este email ya está registrado.');
    }

    const lower = (message || '').toLowerCase();
    if (lower.includes('failed to authenticate')) {
      return new Error('Credenciales inválidas o usuario no verificado.');
    }

    return new Error(message || 'No se pudo completar la operación.');
  }
  async saveUserLocation(): Promise<void> {
    if (!navigator.geolocation) return;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      // Guarda temporalmente en memoria o localStorage
      localStorage.setItem('user_location', JSON.stringify(coords));

    } catch (err) {
      console.warn('No se pudo obtener ubicación del paciente:', err);
    }
  }

}
