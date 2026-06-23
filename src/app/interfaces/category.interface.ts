
export interface SubCategory {
  id: string;
  name?: string;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  order?: number;
  active?: boolean;
  image?: any;
  subs?: SubCategory[];
}
