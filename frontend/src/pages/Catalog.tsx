import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Search, 
  Package, 
  Edit, 
  Trash2,
  Filter,
  DollarSign
} from "lucide-react";
import Layout from "@/components/Layout";
import AddProductModal from "@/components/modals/AddProductModal";
import type { ProductUI, ProductFromAPI, PriceRule, PriceRuleFromAPI } from '@/types';
import {mapProductFromApiToUI} from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Category {
  id: number;
  name: string;
}

export default function Catalog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<ProductUI | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();

  const [products, setProducts] = useState<ProductUI[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [productToDelete, setProductToDelete] = useState<ProductUI | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
          // Usamos Promise.all para hacer ambas llamadas en paralelo
          const [productsResponse, categoriesResponse] = await Promise.all([
            fetch('http://localhost:5000/api/products/details'),
            fetch('http://localhost:5000/api/categories')
          ]);
          if (!productsResponse.ok || !categoriesResponse.ok) {
            throw new Error('Error al cargar los datos');
          }
          const productsData: ProductFromAPI[] = await productsResponse.json();
          const categoriesData: Category[] = await categoriesResponse.json();

            // Transformamos los datos del backend al formato que el frontend necesita (ProductUI)
            const formattedProducts = productsData.map(mapProductFromApiToUI);
            setProducts(formattedProducts);
            setCategories(categoriesData);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudieron cargar los datos del servidor", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
  }, [refreshKey]); // Se volverá a ejecutar si refreshKey cambia

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategoryId === "all" || 
                           product.category_id?.toString() === selectedCategoryId;
    return matchesSearch && matchesCategory;
  });

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { color: "destructive", text: "Inexistente" };
    if (stock <= 15) return { color: "default", text: "Bajo" };
    if (stock <= 50) return { color: "warning", text: "Medio" };
    return { color: "success", text: "Alto" };
  };

  const handleAddProduct = () => {
    setProductToEdit(null); // Nos aseguramos de que el modal esté en modo "Agregar"
    setIsAddModalOpen(true);
  };

  const handleEditProduct = (productId: string) => {
    // Buscamos el producto completo en nuestra lista de productos
    const product = products.find(p => p.id === productId);
    if (product) {
        setProductToEdit(product); // Guardamos el producto para pasárselo al modal
        setIsAddModalOpen(true); // Abrimos el modal
    }
  };

const handleDeleteClick = (product: ProductUI) => {
  setProductToDelete(product);
  setIsDeleteAlertOpen(true);
};

const executeDelete = async () => {
  if (!productToDelete) return;

  try {
    const response = await fetch(`http://localhost:5000/api/products/${productToDelete.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('No se pudo eliminar el producto');
    }

    setProducts(currentProducts => 
      currentProducts.filter(p => p.id !== productToDelete.id)
    );

    toast({
      title: "Producto eliminado",
      description: `"${productToDelete.name}" ha sido eliminado`,
    });

  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive"
    });
  }
};

const handleDeleteProduct = async (productId: string, productName: string) => {
    // Pedimos confirmación al usuario
    if (!window.confirm(`¿Estás seguro de que querés eliminar el producto "${productName}" del catálogo?`)) {
      return; // Si el usuario cancela, no hacemos nada
    }

    try {
        // Llamamos a la API para eliminar el producto
        const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            // Si el backend devuelve un error, lo mostramos
            throw new Error('No se pudo eliminar el producto en el servidor');
        }

        // Si todo salió bien, actualizamos la lista de productos en el frontend
        // Creamos una nueva lista que excluye el producto eliminado
        setProducts(currentProducts => 
            currentProducts.filter(product => product.id !== productId)
        );

        toast({
            title: "Producto eliminado",
            description: `"${productName}" ha sido eliminado del catálogo`,
        });

    } catch (error: any) {
        console.error("Error al eliminar:", error);
        toast({
            title: "Error",
            description: error.message || "No se pudo eliminar el producto.",
            variant: "destructive"
        });
    }
};

  const handleMoreFilters = () => {
    toast({
      title: "Más filtros",
      description: "Panel de filtros avanzados en desarrollo",
    });
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedCategoryId("all"); // Reseteamos el ID
    toast({ title: "Filtros limpiados" });
  };

  const handleProductAdded = () => {
    setRefreshKey(prev => prev + 1);
    // Aquí se podría recargar la lista de productos desde la API
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Catálogo de productos</h1>
            <p className="text-muted-foreground">
              Gestiona tu inventario de productos y precios
            </p>
          </div>
          <Button className="gap-2" onClick={handleAddProduct}>
            <Plus className="h-4 w-4" />
            Nuevo producto
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2" onClick={handleMoreFilters}>
                  <Filter className="h-4 w-4" />
                  Filtros
                </Button>
                
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="px-3 py-2 border border-input bg-background rounded-md text-foreground"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            console.log("Datos del producto que se está mostrando:", product);
            const stockStatus = getStockStatus(product.stock);
            
            return (
              <Card key={product.id} className="overflow-hidden">
                <div className="aspect-square bg-muted relative">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge variant={stockStatus.color as any}>
                      Stock: {stockStatus.text}
                    </Badge>
                  </div>
                </div>
                
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg leading-tight truncate">
                        {product.name}
                      </CardTitle>
                      <CardDescription>
                        SKU: {product.sku}
                        {product.category_name && product.category_name !== 'Sin categoría' && ` • ${product.category_name}`}
                      </CardDescription>
                      {/* Solo mostramos la descripción si no es nula o vacía */}
                      {product.description && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Stock and Price */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Stock: {product.stock} unidades
                      </span>
                      <div className="flex items-center gap-1 text-lg font-semibold">
                        <DollarSign className="h-4 w-4" />
                        {product.price.toFixed(2)}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-1"
                        onClick={() => handleEditProduct(product.id)}
                      >
                        <Edit className="h-3 w-3" />
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(product)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No se encontraron productos
                </h3>
                <p className="text-muted-foreground mb-4">
                  Intenta ajustar los criterios de búsqueda
                </p>
                <Button variant="outline" onClick={handleClearFilters}>
                  Limpiar filtros
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modals */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onProductAdded={handleProductAdded}
        productToEdit={productToEdit}
      />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground">
              Esta acción no se puede deshacer. Se eliminará permanentemente el producto
              <span className="font-bold"> "{productToDelete?.name}" </span>
              de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar producto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}