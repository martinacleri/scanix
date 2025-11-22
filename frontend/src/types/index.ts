export interface PriceRule {
  from: number;
  to: number;
  price: number;
}

export interface ProductUI {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  price: number;
  image_url: string | null;
  category_id: number | null;
  category_name: string;
  stock: number;
  priceRules: PriceRule[];
}

export interface PriceRuleFromAPI {
    id: number;
    product_id: number;
    min_quantity: number;
    max_quantity: number | null;
    price: number;
}

export interface ProductFromAPI {
    id: number;
    name: string;
    description: string | null;
    sku: string;
    price: number;
    image_url: string | null;
    category_id: number | null;
    category_name: string | null;
    created_at: string;
    updated_at: string;
    totalStock: number | null;
    priceRules: PriceRuleFromAPI[];
}

export interface CartItem extends ProductUI {
  quantity: number;
}

// Esta función convierte un objeto de la API a un objeto que tu UI entiende.
export const mapProductFromApiToUI = (apiProduct: ProductFromAPI): ProductUI => {
  return {
    id: apiProduct.id.toString(),
    name: apiProduct.name,
    description: apiProduct.description || null,
    sku: apiProduct.sku,
    price: Number(apiProduct.price),
    image_url: apiProduct.image_url || "/placeholder.svg",
    category_id: apiProduct.category_id,
    category_name: apiProduct.category_name || 'Sin categoría',
    stock: Number(apiProduct.totalStock) || 0,
    priceRules: apiProduct.priceRules ? apiProduct.priceRules.map(rule => ({
        from: rule.min_quantity,
        to: rule.max_quantity || 0,
        price: Number(rule.price)
    })) : []
  };
};