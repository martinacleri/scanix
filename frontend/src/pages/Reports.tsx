import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart3, 
  DollarSign, 
  Package, 
  TrendingUp, 
  Users,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Reports() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetch('http://localhost:5000/api/reports/dashboard')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => {
        console.error(err);
        toast({ 
            title: "Error", 
            description: "No se pudieron cargar los reportes", 
            variant: "destructive" 
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
        <Layout>
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        </Layout>
    )
  }

  // Si falla la carga o no hay datos, mostramos 0 para no romper la UI
  const safeStats = stats || { totalSales: 0, totalOrders: 0, totalProducts: 0, topProducts: [], byWarehouse: [] };
  
  const ticketPromedio = safeStats.totalOrders > 0 
    ? Math.round(safeStats.totalSales / safeStats.totalOrders) 
    : 0;

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
            <h1 className="text-3xl font-bold text-foreground">
              Panel de reportes
            </h1>
            <p className="text-muted-foreground">
              Resumen general de rendimiento comercial
            </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas totales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${Number(safeStats.totalSales).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ingresos históricos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Órdenes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{safeStats.totalOrders}</div>
              <p className="text-xs text-muted-foreground mt-1">Tickets generados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Productos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{safeStats.totalProducts}</div>
              <p className="text-xs text-muted-foreground mt-1">Unidades vendidas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket promedio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${ticketPromedio.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Promedio por venta</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Products & Warehouses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* TOP PRODUCTOS */}
            <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Ranking de productos
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                {safeStats.topProducts.length > 0 ? (
                    safeStats.topProducts.map((product: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">#{index + 1}</span>
                            </div>
                            <div>
                            <h4 className="font-medium text-sm">{product.name}</h4>
                            <p className="text-xs text-muted-foreground">{product.quantity} unidades vendidas</p>
                            </div>
                        </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-muted-foreground text-sm py-4">No hay datos de ventas aún.</p>
                )}
                </div>
            </CardContent>
            </Card>

            {/* VENTAS POR DEPÓSITO */}
            <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Rendimiento por depósito
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                {safeStats.byWarehouse.length > 0 ? (
                    safeStats.byWarehouse.map((warehouse: any) => (
                        <div key={warehouse.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                            <h4 className="font-medium">{warehouse.name}</h4>
                            <p className="text-sm text-muted-foreground">{warehouse.orders} órdenes</p>
                        </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-muted-foreground text-sm py-4">No hay datos de depósitos aún.</p>
                )}
                </div>
            </CardContent>
            </Card>
        </div>
      </div>
    </Layout>
  );
}