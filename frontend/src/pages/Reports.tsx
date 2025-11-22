import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  Download, 
  DollarSign, 
  Package, 
  TrendingUp, 
  Users,
  Calendar,
  Filter
} from "lucide-react";

// Mock data for reports
const mockSalesData = [
  { month: "Enero", sales: 150000, orders: 45, products: 320 },
  { month: "Febrero", sales: 180000, orders: 52, products: 387 },
  { month: "Marzo", sales: 220000, orders: 68, products: 445 },
];

const mockTopProducts = [
  { name: "Producto A", sales: 85000, quantity: 150, growth: "+15%" },
  { name: "Producto B", sales: 72000, quantity: 120, growth: "+8%" },
  { name: "Producto C", sales: 68000, quantity: 95, growth: "-3%" },
  { name: "Producto D", sales: 55000, quantity: 87, growth: "+22%" },
];

const mockWarehouses = [
  { id: 1, name: "Depósito Central", sales: 180000, orders: 65 },
  { id: 2, name: "Depósito Norte", sales: 120000, orders: 38 },
  { id: 3, name: "Depósito Sur", sales: 95000, orders: 22 },
];

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const totalSales = mockSalesData.reduce((sum, item) => sum + item.sales, 0);
  const totalOrders = mockSalesData.reduce((sum, item) => sum + item.orders, 0);
  const totalProducts = mockSalesData.reduce((sum, item) => sum + item.products, 0);

  const exportReport = () => {
    // Mock export functionality
    console.log("Exporting report...");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Panel de Reportes y Ventas
            </h1>
            <p className="text-muted-foreground">
              Resumen de ventas filtrado por depósito y período
            </p>
          </div>
          <Button onClick={exportReport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar Reporte
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros de Reporte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="period">Período</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Diario</SelectItem>
                    <SelectItem value="week">Semanal</SelectItem>
                    <SelectItem value="month">Mensual</SelectItem>
                    <SelectItem value="year">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="warehouse">Depósito</Label>
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los Depósitos</SelectItem>
                    {mockWarehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="start-date">Fecha Inicio</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-date">Fecha Fin</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ventas Totales
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalSales.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                <Badge variant="default" className="text-xs">
                  +12.5% vs período anterior
                </Badge>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Órdenes Totales
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalOrders}
              </div>
              <p className="text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  +8.2% vs período anterior
                </Badge>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Productos Vendidos
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalProducts}
              </div>
              <p className="text-xs text-muted-foreground">
                <Badge variant="default" className="text-xs">
                  +15.3% vs período anterior
                </Badge>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ticket Promedio
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${Math.round(totalSales / totalOrders).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                <Badge variant="default" className="text-xs">
                  +4.1% vs período anterior
                </Badge>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Productos Más Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockTopProducts.map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {product.quantity} unidades vendidas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      ${product.sales.toLocaleString()}
                    </div>
                    <Badge 
                      variant={product.growth.startsWith('+') ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {product.growth}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sales by Warehouse */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Ventas por Depósito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockWarehouses.map((warehouse) => (
                <div
                  key={warehouse.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">{warehouse.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {warehouse.orders} órdenes completadas
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      ${warehouse.sales.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ${Math.round(warehouse.sales / warehouse.orders).toLocaleString()} por orden
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}