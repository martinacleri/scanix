import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Warehouse, 
  Package, 
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Filter,
  Download
} from "lucide-react";
import Layout from "@/components/Layout";
import AdjustStockModal from "@/components/modals/AdjustStockModal";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  price: number;
  lastMovement: string;
  movementType: "entrada" | "salida";
  warehouse: string;
}

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();

  const warehouses = ["Todos", "Depósito Central", "Depósito Norte", "Depósito Sur"];

  // Mock inventory data
  const inventory: InventoryItem[] = [
    {
      id: "1",
      name: "Aceite de Oliva Extra Virgen 500ml",
      sku: "AOL-500",
      category: "Aceites",
      currentStock: 45,
      minStock: 20,
      maxStock: 100,
      price: 8.50,
      lastMovement: "2024-01-15",
      movementType: "salida",
      warehouse: "Depósito Central"
    },
    {
      id: "2",
      name: "Arroz Integral 1kg",
      sku: "ARR-1000", 
      category: "Granos",
      currentStock: 8,
      minStock: 15,
      maxStock: 80,
      price: 3.20,
      lastMovement: "2024-01-14",
      movementType: "salida",
      warehouse: "Depósito Central"
    },
    {
      id: "3",
      name: "Pasta Italiana 500g",
      sku: "PAS-500",
      category: "Pastas",
      currentStock: 67,
      minStock: 25,
      maxStock: 120,
      price: 2.90,
      lastMovement: "2024-01-13",
      movementType: "entrada",
      warehouse: "Depósito Norte"
    },
    {
      id: "4",
      name: "Conserva de Tomate 400g",
      sku: "CON-400",
      category: "Conservas",
      currentStock: 2,
      minStock: 10,
      maxStock: 60,
      price: 1.80,
      lastMovement: "2024-01-12",
      movementType: "salida", 
      warehouse: "Depósito Central"
    }
  ];

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWarehouse = selectedWarehouse === "all" || 
                           item.warehouse === selectedWarehouse;
    
    let matchesStock = true;
    if (stockFilter === "low") {
      matchesStock = item.currentStock <= item.minStock;
    } else if (stockFilter === "normal") {
      matchesStock = item.currentStock > item.minStock && item.currentStock < item.maxStock * 0.8;
    } else if (stockFilter === "high") {
      matchesStock = item.currentStock >= item.maxStock * 0.8;
    }
    
    return matchesSearch && matchesWarehouse && matchesStock;
  });

  const getStockStatus = (current: number, min: number, max: number) => {
    const percentage = (current / max) * 100;
    
    if (current <= min) {
      return { 
        status: "Crítico", 
        color: "destructive", 
        percentage,
        bgColor: "bg-destructive"
      };
    } else if (current <= min * 1.5) {
      return { 
        status: "Bajo", 
        color: "warning", 
        percentage,
        bgColor: "bg-warning"
      };
    } else if (current >= max * 0.8) {
      return { 
        status: "Alto", 
        color: "success", 
        percentage,
        bgColor: "bg-success"
      };
    } else {
      return { 
        status: "Normal", 
        color: "secondary", 
        percentage,
        bgColor: "bg-primary"
      };
    }
  };

  const getLowStockCount = () => {
    return inventory.filter(item => item.currentStock <= item.minStock).length;
  };

  const getTotalValue = () => {
    return filteredInventory.reduce((total, item) => 
      total + (item.currentStock * item.price), 0
    ).toFixed(2);
  };

  const handleAdjustStock = (item: InventoryItem) => {
    setSelectedProduct(item);
    setIsAdjustModalOpen(true);
  };

  const handleViewHistory = (productId: string, productName: string) => {
    toast({
      title: "Historial de movimientos",
      description: `Mostrando historial de ${productName}`,
    });
  };

  const handleExport = () => {
    toast({
      title: "Exportando inventario",
      description: "El archivo se descargará en breve",
    });
  };

  const handleMoreFilters = () => {
    toast({
      title: "Más filtros",
      description: "Panel de filtros avanzados en desarrollo",
    });
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedWarehouse("all");
    setStockFilter("all");
    toast({
      title: "Filtros limpiados",
      description: "Se han restablecido todos los filtros",
    });
  };

  const handleStockAdjusted = () => {
    setRefreshKey(prev => prev + 1);
    // Aquí se podría recargar la lista de inventario desde la API
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Control de Inventario</h1>
            <p className="text-muted-foreground">
              Monitorea los niveles de stock por depósito
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{filteredInventory.length}</p>
                  <p className="text-sm text-muted-foreground">Productos Total</p>
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
                  <p className="text-sm text-muted-foreground">Stock Bajo</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">3</p>
                  <p className="text-sm text-muted-foreground">Depósitos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                <div>
                  <p className="text-2xl font-bold">${getTotalValue()}</p>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
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
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="px-3 py-2 border border-input bg-background rounded-md text-foreground"
                >
                  <option value="all">Todos los depósitos</option>
                  {warehouses.slice(1).map(warehouse => (
                    <option key={warehouse} value={warehouse}>{warehouse}</option>
                  ))}
                </select>

                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className="px-3 py-2 border border-input bg-background rounded-md text-foreground"
                >
                  <option value="all">Todos los niveles</option>
                  <option value="low">Stock bajo</option>
                  <option value="normal">Stock normal</option>
                  <option value="high">Stock alto</option>
                </select>

                <Button variant="outline" className="gap-2" onClick={handleMoreFilters}>
                  <Filter className="h-4 w-4" />
                  Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory List */}
        <div className="space-y-4">
          {filteredInventory.map((item) => {
            const stockInfo = getStockStatus(item.currentStock, item.minStock, item.maxStock);
            
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
                        <p className="text-muted-foreground">
                          SKU: {item.sku} • {item.category} • {item.warehouse}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Badge variant={stockInfo.color as any}>
                          {stockInfo.status}
                        </Badge>
                        <div className="text-right">
                          <p className="text-2xl font-bold">
                            {item.currentStock}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            de {item.maxStock}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Stock Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Mínimo: {item.minStock}
                        </span>
                        <span className="text-muted-foreground">
                          Máximo: {item.maxStock}
                        </span>
                      </div>
                      <Progress 
                        value={stockInfo.percentage} 
                        className="h-2"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Precio: ${item.price}</span>
                        <span>Valor: ${(item.currentStock * item.price).toFixed(2)}</span>
                        <div className="flex items-center gap-1">
                          {item.movementType === "entrada" ? (
                            <TrendingUp className="h-4 w-4 text-success" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-destructive" />
                          )}
                          <span>Último: {item.lastMovement}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleAdjustStock(item)}>
                          Ajustar Stock
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleViewHistory(item.id, item.name)}>
                          Ver Historial
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredInventory.length === 0 && (
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
      {selectedProduct && (
        <AdjustStockModal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          currentStock={selectedProduct.currentStock}
          onStockAdjusted={handleStockAdjusted}
        />
      )}
    </Layout>
  );
}