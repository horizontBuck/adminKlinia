import { Injectable, signal } from '@angular/core';
import { from, map, Observable, of } from 'rxjs';
import { pb } from '../core/pocketbase.client';
import { Category } from '../interfaces/category.interface';
import { AuthPocketbaseService } from './auth-pocketbase.service';
import { inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private collection = 'categories';
  private auth = inject(AuthPocketbaseService);
  isLoadingCategories = signal(false);
  categories = signal<Category[] | null>(null);
  private categoriesCache: Category[] | null = null;

  // helper normalizeSubs dentro del servicio
  private normalizeSubs(raw: any): Array<{ id: string; name?: string }> {
    if (!raw) return [];

    if (Array.isArray(raw)) {
      return raw.map((s: any) => {
        if (typeof s === 'string') return { id: s, name: s };
        if (typeof s === 'number') return { id: String(s), name: String(s) };
        if (s && typeof s === 'object') {
          return { id: (s.id ?? s.value ?? s.key ?? ''), name: s.name ?? s.label ?? undefined };
        }
        return { id: String(s) };
      }).filter(x => !!x.id);
    }

    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return this.normalizeSubs(parsed);
      } catch {
        // csv fallback "a,b,c"
        return raw.split(',').map((p: string) => ({ id: p.trim(), name: p.trim() })).filter(x => !!x.id);
      }
    }

    if (typeof raw === 'object') {
      // object map { key: 'label' }
      return Object.entries(raw).map(([k, v]) => ({ id: k, name: typeof v === 'string' ? v : undefined }));
    }

    return [];
  }

  // ✅ Listar categorías principales con imagen y subcategorías normalizadas

  listTop() {
    if (this.categoriesCache) {
      return of(this.categoriesCache);
    }

    return from(this.auth.pb.collection(this.collection).getList(1, 20, {  // El número 1000 es solo un ejemplo, dependiendo de cuántas categorías tengas
      sort: 'order,name',
      expand: 'image',
      fields: 'id,collectionId,collectionName,name,slug,order,active,image,expand.image,subs'
    })).pipe(
      map((res: any) => {
  const items = res?.items ?? [];
  return items.map((cat: any) => {
    cat.subs = this.normalizeSubs(cat.subs);
    return cat as Category;
  });
})

    );
  }


  // ✅ Obtener una sola categoría y normalizar subs
  async getOne(id: string) {
    const record = await this.auth.pb.collection(this.collection).getOne(id, {
      expand: 'image',
      fields: 'id,name,subs,image,expand.image'
    });
    record['subs'] = this.normalizeSubs(record['subs']);
    return record;
  }

  // ✅ Icono de la categoría (nuevo método pb.files.getURL)
  buildIconUrl(cat: any): string {
    const rel = cat?.expand?.image;
    const imgRec = Array.isArray(rel) ? rel[0] : rel;
    const fileName = imgRec?.image;
    if (!imgRec || !fileName) return 'assets/img/placeholder-cat.png';
    return this.auth.pb.files.getURL(imgRec, fileName, { thumb: '96x96' });
  }

  // ✅ Subscripciones en tiempo real
  async subscribe(onChange: () => void) {
    await this.auth.pb.collection(this.collection).subscribe('*', onChange);
  }

  async unsubscribe() {
    await this.auth.pb.collection(this.collection).unsubscribe('*');
  }
  async listAll(): Promise<Category[]> {
    const items = await this.auth.pb.collection(this.collection).getFullList({
      sort: 'order,name',
      expand: 'image',
      fields: 'id,name,slug,order,active,image,expand.image,subs'
    });

    return items.map((cat: any) => {
      cat.subs = this.normalizeSubs(cat.subs);
      return cat;
    });
  }

  async loadCategories() {
    this.isLoadingCategories.set(true);
    try {
      this.categories.set(await this.listAll());
    } catch (e) {
      console.error(e);
      this.categories.set([]); // Asegúrate de manejar correctamente el error
    } finally {
      this.isLoadingCategories.set(false);
    }
  }


}
