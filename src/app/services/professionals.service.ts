import { Injectable } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { pb } from '../core/pocketbase.client';
import { ReviewsService } from './reviews.service';
import { AuthPocketbaseService } from './auth-pocketbase.service';
export interface Professional {
  id: string;
  name: string;
  email: string;
  avatarFile?: string;
  profession?: string;
  businessName?: string;
  providerStatus?: string;
  rating?: number;
  price?: number;
  modalidadAtencion?: any[];
  zonaAtencion?: any[];
  especialidades?: any[];
  phone?: string;
  Biography?: string;
  category?: string;
  subcategory?: string;
  gender?: string;
  isOnline?: boolean;
  lat?: number;
  lng?: number;
  description?: string;
  created?: string;
  birthdate?: string;
  habilitacionNumber?: string;
  docNumber?: string;
}

@Injectable({ providedIn: 'root' })
export class ProfessionalsService {
  /** 🔹 Colección (usa 'approved_providers' si creaste la vista pública) */
  private collection = 'users';
private loadingProfessionals = false;
  private _professionals$ = new BehaviorSubject<Professional[]>([]);
  public professionals$ = this._professionals$.asObservable();

 
  constructor(private reviewsService: ReviewsService, private auth: AuthPocketbaseService) {
  console.log('🩺 ProfessionalsService inicializado');
  this.subscribeRealtime();
  this.listenAppointmentsRealtime();

  this.auth.pb.authStore.onChange((token, model) => {
    if (model) {
      this.listenAppointmentsRealtime();
    }
  });
}
  getCurrentUserId(): string | undefined {
    return this.auth.pb.authStore.model?.id;
  }
updateProfessionalInState(id: string, changes: Partial<Professional>) {
  const updated = this._professionals$.value.map(item =>
    item.id === id ? { ...item, ...changes } : item
  );

  this._professionals$.next(updated);
}

async loadProfessionals(): Promise<void> {
  if (this.loadingProfessionals) {
    console.log('⏳ loadProfessionals cancelado: ya hay una carga en curso');
    return;
  }

  this.loadingProfessionals = true;
  console.log('🔍 Cargando profesionales...');
  console.log('👤 Usuario autenticado actual:', this.auth.pb.authStore.model);

  try {
    const records = await this.auth.pb.collection(this.collection).getFullList<Professional>({
      filter: '(role = "proveedor" || role = "experto")',
      sort: '-created',
      requestKey: null,
      fields: 'id,name,email,avatarFile,profession,businessName,providerStatus,phone,especialidades,modalidadAtencion,zonaAtencion,description,category,lat,lng,isOnline,Biography,gender,created,habilitacionNumber,docNumber,birthdate'
    });

    console.log('✅ Registros encontrados:', records);

    const processed = records.map((u: any) => ({
      id: u.id,
      name: u.name || 'Profesional',
      email: u.email,
      avatarFile: u.avatarFile,
      profession: u.profession,
      businessName: u.businessName,
      providerStatus: u.providerStatus,
      phone: u.phone,
      category: u.category,
      especialidades: this.parseJson(u.especialidades),
      modalidadAtencion: this.parseJson(u.modalidadAtencion),
      zonaAtencion: this.parseJson(u.zonaAtencion),
      rating: 0,
      price: u.price || Math.floor(Math.random() * 30) + 20,
      lat: Number(u.lat),
      lng: Number(u.lng),
      isOnline: !!u.isOnline,
      description: u.description,
      Biography: u.Biography,
      gender: u.gender,
      created: u.created,
      habilitacionNumber: u.habilitacionNumber,
      docNumber: u.docNumber,
      birthdate: u.birthdate
    }));

    console.log('✅ Profesionales procesados:', processed);
    this._professionals$.next(processed);
  } catch (error: any) {
    console.error('❌ Error cargando profesionales:', error);
    console.error('📋 response:', error?.response);
    console.error('📋 data:', error?.data);
  } finally {
    this.loadingProfessionals = false;
  }
}

  getAllProfessionals() {
    return this._professionals$.value;
  }

  getProfessionalById(id: string) {
    return this._professionals$.value.find(p => p.id === id) || null;
  }


  /** 🔹 Convertir campos JSON de PocketBase en arrays seguros */
  private parseJson(value: any): any[] {
    if (!value) return [];
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return [];
    }
  }

  /* getAvatarUrl(user: any): string {
    try {
      if (!user || !user.avatarFile) {
        return 'assets/img/avatar.png';
      }

      return pb.files.getURL(
        {
          collectionId: 'users',
          id: user.id
        },
        user.avatarFile
      );

    } catch (e) {
      return 'assets/img/avatar.png';
    }
  } */


  /** 🔹 Suscripción realtime (Server-Sent Events) */
  async subscribeRealtime(): Promise<void> {
    
    try {
      await this.auth.pb.collection(this.collection).subscribe('*', (e) => {
        console.log('👀 Cambio detectado en profesionales:', e.action, e.record);
        // recarga datos tras crear/editar/eliminar
/*         this.loadProfessionals();
 */      });
      console.log('🔁 Suscripción realtime activa en:', this.collection);
    } catch (err) {
      console.error('❌ Error en suscripción realtime:', err);
    }
  }

  /** 🔹 Cancelar suscripción realtime */
  async unsubscribeRealtime(): Promise<void> {
    try {
      await this.auth.pb.collection(this.collection).unsubscribe('*');
      console.log('🛑 Suscripción realtime cancelada');
    } catch (err) {
      console.error('⚠️ Error al cancelar suscripción realtime:', err);
    }
  }


  /* async updateProfessionalStatus(id: string, data: Partial<Professional>) {
    try {
      const userId = id || pb.authStore.model?.id;
      if (!userId) throw new Error('No se encontró el ID del usuario autenticado');

      console.log('📝 Actualizando usuario con ID:', userId);
      return await this.auth.pb.collection('users').update(userId, data);
    } catch (err) {
      console.error('❌ Error en updateProfessionalStatus:', err);
      throw err;
    }
  }

  async updateProfessional(id: string, data: any) {
    try {
      const userId = id || pb.authStore.model?.id;
      if (!userId) throw new Error('No se encontró el ID del usuario autenticado');

      console.log('📝 Actualizando profesional con ID:', userId, 'Datos:', data);
      return await this.auth.pb.collection('users').update(userId, data);
    } catch (err) {
      console.error('❌ Error en updateProfessional:', err);
      throw err;
    }
  } */

 async updateProfessionalStatus(id: string, data: Partial<Professional>) {
  try {
    if (!id) {
      throw new Error('No se recibió el ID del profesional');
    }

    console.log('📝 Actualizando usuario con ID:', id, 'Datos:', data);

    const updated = await this.auth.pb.collection('users').update(id, data);

    console.log('✅ Usuario actualizado:', updated);

    return updated;
  } catch (err) {
    console.error('❌ Error en updateProfessionalStatus:', err);
    throw err;
  }
}

async updateProfessional(id: string, data: any) {
  try {
    if (!id) {
      throw new Error('No se recibió el ID del profesional');
    }

    console.log('📝 Actualizando profesional con ID:', id, 'Datos:', data);

    const updated = await this.auth.pb.collection('users').update(id, data);

    console.log('✅ Profesional actualizado:', updated);

    return updated;
  } catch (err) {
    console.error('❌ Error en updateProfessional:', err);
    throw err;
  }
}
    getNearbyProfessionals(lat: number, lng: number, radiusKm: number) {
    const professionals = this._professionals$.value;

    console.log('📦 Total de profesionales en memoria:', professionals.length);

    if (!professionals?.length) return of([]);

    const activePros = professionals.filter(
      (p) => p.isOnline && p.lat != null && p.lng != null
    );

    console.log('🟢 Profesionales activos con coordenadas:', activePros.length);
    console.table(
      activePros.map((p) => ({
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        typeLat: typeof p.lat,
        typeLng: typeof p.lng,
        isOnline: p.isOnline,
        avatarFile: p.avatarFile,
      }))
    );

    const R = 6371;
    const toRad = (v: number) => (v * Math.PI) / 180;

    const nearby = activePros.filter((pro) => {
      // ✅ Asegurar que sean numéricos
      const plat = Number(pro.lat);
      const plng = Number(pro.lng);

      if (isNaN(plat) || isNaN(plng)) {
        console.warn(`⚠️ Coordenadas inválidas para ${pro.name}:`, pro.lat, pro.lng);
        return false;
      }

      const dLat = toRad(plat - lat);
      const dLng = toRad(plng - lng);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat)) *
        Math.cos(toRad(plat)) *
        Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      console.log(`🧭 ${pro.name} → distancia: ${distance.toFixed(2)} km`);

      return distance <= radiusKm;
    });

    console.log('✅ Profesionales dentro del rango:', nearby.length);
    console.table(nearby);

    return of(nearby);
  }


  // Función Haversine para calcular distancia entre coordenadas
  public haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // ✅ Obtener usuario autenticado (para el mapa o solicitudes)
  getCurrentUser() {
    return this.auth.pb.authStore.model;
  }

  // ✅ Verificar si el paciente tiene una solicitud pendiente
  async hasPendingRequest(patientId: string): Promise<boolean> {
    const list = await this.auth.pb.collection('appointments').getList(1, 1, {
      filter: `patient="${patientId}" && (status="pendiente" || status="enproceso")`,
    });
    return list?.items?.length > 0;
  }
  /** 🔥 Escucha en tiempo real las actualizaciones de citas */
  async listenAppointmentsRealtime() {
    try {
      await this.auth.pb.collection('appointments').subscribe('*', (e) => {
        console.log('📡 Evento realtime recibido:', e);

        if (e.action === 'create') {
          const appointment = e.record;
          // Si el profesional autenticado es el asignado:
          if (appointment['professional'] === this.auth.pb.authStore.model?.id) {
            console.log('🆕 Nueva solicitud recibida:', appointment);
            // Aquí puedes emitir un EventEmitter o signal para actualizar UI
          }
        }

        if (e.action === 'update') {
          const appointment = e.record;
          if (appointment['patient'] === this.auth.pb.authStore.model?.id) {
            console.log('📢 Tu solicitud cambió de estado:', appointment['status']);
            // Puedes lanzar una notificación o cambiar vista
          }
        }
      });

    } catch (err) {
      console.error('❌ Error al suscribirse a realtime:', err);
    }
  }

  /** 🧩 Crear una solicitud de cita */
  async createRequest(data: {
    patient: string;
    professional: string;
    location: any;
    distanceKm: number;
    status: string;
  }): Promise<any> {
    try {
      console.log('📤 Enviando solicitud:', data);

      const payload = {
        patient: data.patient,
        professional: data.professional,
        // 👇 Enviar objeto, no string
        location: data.location || {},
        distanceKm: data.distanceKm || 0,
        status: data.status || 'pendiente',
        details: 'Solicitud generada desde mapa'
      };

      const record = await this.auth.pb.collection('appointments').create(payload);
      console.log('✅ Solicitud creada:', record);

      // Marcar profesional como ocupado
      await this.auth.pb.collection('users').update(data.professional, { isOnline: false });

      return record;
    } catch (error: any) {
      console.error('❌ Error creando solicitud:', error);
      if (error.data) console.error('📋 Detalle del error:', error.data);
      throw error;
    }
  }

  /** 🔍 Obtiene la solicitud activa del paciente (pending / accepted) */
  async getActiveRequest(patientId: string) {
    try {
      const res = await this.auth.pb.collection('appointments').getList(1, 1, {
        filter: `patient = "${patientId}" && (status = "pendiente" || status = "aceptado")`,
        sort: '-created'
      });

      if (res.items.length > 0) {
        return res.items[0]; // la más reciente
      }

      return null;

    } catch (err) {
      console.error("❌ Error buscando solicitud activa:", err);
      return null;
    }
  }


  /** 🔥 Obtiene ubicación del paciente + calcula distancia al profesional */
  async getDistanceToProfessional(proId: string) {
    const user = this.auth.pb.authStore.model;

    if (!user) throw new Error("Usuario no autenticado");

    // Traer profesional
    const professional = this.getProfessionalById(proId);
    if (!professional) throw new Error("Profesional no encontrado");

    const proLat = Number(professional.lat);
    const proLng = Number(professional.lng);

    // No se puede calcular si faltan coordenadas
    if (!proLat || !proLng) {
      return {
        userLat: 0,
        userLng: 0,
        proLat,
        proLng,
        distanciaKm: null
      };
    }

    // Obtener ubicación del paciente
    const userLocation = await this.getUserLocation();

    const userLat = userLocation.lat;
    const userLng = userLocation.lng;

    // Guardar ubicación del usuario en PB
    await this.auth.pb.collection("users").update(user.id, {
      lat: userLat,
      lng: userLng
    });

    // Calcular distancia usando Haversine del servicio
    const distancia = this.haversineDistance(userLat, userLng, proLat, proLng);

    return {
      userLat,
      userLng,
      proLat,
      proLng,
      distanciaKm: Number(distancia.toFixed(2))
    };
  }
  /** 📍 Obtener ubicación del usuario con fallback */
  async getUserLocation(): Promise<{ lat: number; lng: number }> {
    const user = this.auth.pb.authStore.model;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        () => {
          console.warn("⚠ No se pudo obtener geolocalización. Usando datos del usuario.");
          resolve({
            lat: Number(user?.['lat']) || 0,
            lng: Number(user?.['lng']) || 0
          });
        }
      );
    });
  }



}
