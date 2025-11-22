import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Download, 
  Calendar,
  Filter,
  FileText,
  DollarSign,
  Clock,
  X
} from "lucide-react";
import Layout from "@/components/Layout";
import SaleDetailsModal from "@/components/modals/SaleDetailsModal";

interface SaleRecord {
  id: string;
  date: string;
  time: string;
  vendor: string;
  warehouse: string;
  total: number;
  status: "confirmada" | "pendiente" | "anulada";
  products: number;
  image?: string;
}

export default function History() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const { toast } = useToast();

  // Mock data
  const salesHistory: SaleRecord[] = [
    {
      id: "VTA-2024-001",
      date: "2024-01-15",
      time: "14:30",
      vendor: "Operario Demo",
      warehouse: "Depósito Central",
      total: 45.60,
      status: "confirmada",
      products: 8,
      image: "/placeholder.svg"
    },
    {
      id: "VTA-2024-002", 
      date: "2024-01-15",
      time: "11:45",
      vendor: "Operario Demo",
      warehouse: "Depósito Central",
      total: 23.40,
      status: "pendiente",
      products: 3
    },
    {
      id: "VTA-2024-003",
      date: "2024-01-14",
      time: "16:20",
      vendor: "Operario Demo", 
      warehouse: "Depósito Central",
      total: 67.80,
      status: "confirmada",
      products: 12,
      image: "/placeholder.svg"
    },
    {
      id: "VTA-2024-004",
      date: "2024-01-14",
      time: "09:15",
      vendor: "María González",
      warehouse: "Depósito Norte",
      total: 89.20,
      status: "anulada",
      products: 5
    }
  ];

  const filteredSales = salesHistory.filter(sale => {
    const matchesSearch = sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.vendor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || sale.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmada": return "success";
      case "pendiente": return "warning";
      case "anulada": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmada": return "Confirmada";
      case "pendiente": return "Pendiente";
      case "anulada": return "Anulada";
      default: return status;
    }
  };

  const getTotalSales = () => {
    return filteredSales
      .filter(sale => sale.status === "confirmada")
      .reduce((sum, sale) => sum + sale.total, 0)
      .toFixed(2);
  };

  const handleViewDetails = (saleId: string) => {
    setSelectedSaleId(saleId);
    setIsDetailsModalOpen(true);
  };

  const handleReprint = (saleId: string) => {
    toast({
      title: "Reimprimiendo ticket",
      description: `Ticket ${saleId} enviado a la impresora`,
    });
  };

  const handleExport = () => {
    toast({
      title: "Exportando datos",
      description: "El archivo se descargará en breve",
    });
  };

  const handleDateFilter = () => {
    toast({
      title: "Filtro de fecha",
      description: "Funcionalidad en desarrollo",
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
    setStatusFilter("all");
    toast({
      title: "Filtros limpiados",
      description: "Se han restablecido todos los filtros",
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Historial de Ventas</h1>
            <p className="text-muted-foreground">
              Revisa todas las transacciones y pedidos generados
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleDateFilter}>
              <Calendar className="h-4 w-4" />
              Filtrar Fecha
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{filteredSales.length}</p>
                  <p className="text-sm text-muted-foreground">Total Pedidos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-success" />
                <div>
                  <p className="text-2xl font-bold">${getTotalSales()}</p>
                  <p className="text-sm text-muted-foreground">Ventas Confirmadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-2xl font-bold">
                    {filteredSales.filter(s => s.status === "pendiente").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">
                    {filteredSales.filter(s => s.status === "anulada").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Anuladas</p>
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
                    placeholder="Buscar por ID de venta o vendedor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-input bg-background rounded-md text-foreground"
                >
                  <option value="all">Todos los estados</option>
                  <option value="confirmada">Confirmadas</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="anulada">Anuladas</option>
                </select>
                
                <Button variant="outline" className="gap-2" onClick={handleMoreFilters}>
                  <Filter className="h-4 w-4" />
                  Más Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales List */}
        <div className="space-y-4">
          {filteredSales.map((sale) => (
            <Card key={sale.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Sale Image (if available) */}
                  {sale.image && (
                    <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={sale.image}
                        alt="Imagen del pedido"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Sale Details */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{sale.id}</h3>
                        <p className="text-sm text-muted-foreground">
                          {sale.date} • {sale.time} • {sale.vendor}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge variant={getStatusColor(sale.status) as any}>
                          {getStatusText(sale.status)}
                        </Badge>
                        <span className="text-lg font-semibold">
                          ${sale.total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div className="text-sm text-muted-foreground">
                        {sale.products} productos • {sale.warehouse}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(sale.id)}>
                          Ver Detalles
                        </Button>
                        {sale.status !== "anulada" && (
                          <Button variant="outline" size="sm" onClick={() => handleReprint(sale.id)}>
                            Reimprimir
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSales.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No se encontraron ventas
                </h3>
                <p className="text-muted-foreground mb-4">
                  No hay ventas que coincidan con los criterios de búsqueda
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
      <SaleDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        saleId={selectedSaleId || ""}
      />
    </Layout>
  );
}