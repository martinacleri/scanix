import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Warehouse, 
  Package, 
  AlertTriangle
} from "lucide-react";
import Layout from "@/components/Layout";
import AdjustStockModal from "@/components/modals/AdjustStockModal";
import type { ProductUI, ProductFromAPI } from '@/types';
import { mapProductFromApiToUI } from '@/types';

interface InventoryItem extends ProductUI {
  // Ya tiene todo lo que necesitamos
}

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();

  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Función para obtener el warehouse_id del usuario logueado
  const getUserWarehouseId = (): string | null => {
    const userDataString = localStorage.getItem("scanix_user");
    if (!userDataString) return null;
    
    try {
      const userData = JSON.parse(userDataString);
      return userData.warehouseId?.toString() || null;
    } catch (error) {
      console.error("Error al leer datos del usuario:", error);
      return null;
    }
  };

  const [selectedWarehouseId, setSelectedWarehouseId] = useState(() => {
  return getUserWarehouseId() || "all";
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Determinamos qué depósito cargar
        const [productsResponse, warehousesResponse] = await Promise.all([
          fetch(
            selectedWarehouseId === "all" 
              ? `http://localhost:5000/api/stock/total`
              : `http://localhost:5000/api/products/details?warehouseId=${selectedWarehouseId}`
          ),
          fetch('http://localhost:5000/api/warehouses')
        ]);
        
        if (!productsResponse.ok || !warehousesResponse.ok) {
          throw new Error('Error al cargar los datos');
        }
        
        const productsData: ProductFromAPI[] = await productsResponse.json();
        console.log('Datos de la API:', productsData);
        const warehousesData = await warehousesResponse.json();

        const formattedProducts = productsData.map(mapProductFromApiToUI);
        setProducts(formattedProducts);
        setWarehouses(warehousesData);
        
      } catch (error) {
        console.error(error);
        toast({ 
          title: "Error", 
          description: "No se pudieron cargar los datos", 
          variant: "destructive" 
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [refreshKey, selectedWarehouseId]);

  const filteredInventory = products.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStock = true;
    if (stockFilter === "low") {
      matchesStock = item.stock > 0 && item.stock <= 15;
    } else if (stockFilter === "normal") {
      matchesStock = item.stock > 15 && item.stock <= 50;
    } else if (stockFilter === "high") {
      matchesStock = item.stock > 50;
    } else if (stockFilter === "out") {
      matchesStock = item.stock === 0;
    }
    
    return matchesSearch && matchesStock;
  });

  const getStockStatus = (stock: number) => {
    if (stock === 0) {
      return { 
        status: "Sin stock", 
        color: "destructive",
        textColor: "text-red-600",
        bgColor: "bg-red-500"
      };
    } else if (stock > 0 && stock <= 15) {
      return { 
        status: "Bajo", 
        color: "warning",
        textColor: "text-orange-500",
        bgColor: "bg-orange-500"
      };
    } else if (stock > 15 && stock <= 50) {
      return { 
        status: "Normal", 
        color: "secondary",
        textColor: "text-blue-600",
        bgColor: "bg-blue-500"
      };
    } else {
      return { 
        status: "Alto", 
        color: "success",
        textColor: "text-green-600",
        bgColor: "bg-green-500"
      };
    }
  };

  const getLowStockCount = () => {
    return products.filter(item => item.stock > 0 && item.stock <= 15).length;
  };

  const getOutOfStockCount = () => {
    return products.filter(item => item.stock === 0).length;
  };

  const handleAdjustStock = (item: InventoryItem) => {
    setSelectedProduct(item);
    setIsAdjustModalOpen(true);
  };

  const handleStockAdjusted = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Control de inventario</h1>
          <p className="text-muted-foreground">
            Monitoreá los niveles de stock por depósito
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{products.length}</p>
                  <p className="text-sm text-muted-foreground">Productos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{getLowStockCount()}</p>
                  <p className="text-sm text-muted-foreground">Stock bajo</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{getOutOfStockCount()}</p>
                  <p className="text-sm text-muted-foreground">Sin stock</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
              
              <div className="flex gap-2 flex-wrap">
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="px-3 py-2 border border-input bg-background rounded-md text-foreground"
                >
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                  ))}
                </select>

                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className="px-3 py-2 border border-input bg-background rounded-md text-foreground"
                >
                  <option value="all">Todos los niveles</option>
                  <option value="out">Sin stock</option>
                  <option value="low">Stock bajo</option>
                  <option value="normal">Stock normal</option>
                  <option value="high">Stock alto</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory List */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Cargando inventario...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredInventory.map((item) => {
              const stockInfo = getStockStatus(item.stock);
              const stockPercentage = Math.min((item.stock / 100) * 100, 100);
              
              return (
                <Card key={item.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground text-lg">
                            {item.name}
                          </h3>
                          <p className="text-muted-foreground text-sm">
                            SKU: {item.sku}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`text-3xl font-bold ${stockInfo.textColor}`}>
                              {item.stock}
                            </p>
                            <p className="text-sm text-muted-foreground">unidades</p>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAdjustStock(item)}
                          >
                            Ajustar stock
                          </Button>
                        </div>
                      </div>

                      {/* Stock Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Nivel de stock</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                          <div 
                            className={`${stockInfo.bgColor} h-2.5 rounded-full transition-all`}
                            style={{ width: `${stockPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!isLoading && filteredInventory.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No se encontraron productos
                </h3>
                <p className="text-muted-foreground">
                  Intentá ajustar los criterios de búsqueda
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de ajuste de stock */}
      {selectedProduct && (
        <AdjustStockModal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          currentStock={selectedProduct.stock}
          warehouseId={selectedWarehouseId}
          onStockAdjusted={handleStockAdjusted}
        />
      )}
    </Layout>
  );
}