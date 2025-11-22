import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar,
  User,
  Warehouse,
  Package,
  DollarSign,
  Download,
  Printer
} from "lucide-react";

interface SaleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: string;
}

interface SaleDetail {
  id: string;
  date: string;
  time: string;
  vendor: string;
  warehouse: string;
  total: number;
  status: "confirmada" | "pendiente" | "anulada";
  products: {
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  image?: string;
}

export default function SaleDetailsModal({ isOpen, onClose, saleId }: SaleDetailsModalProps) {
  // Mock data - en producción vendría de una API
  const saleDetails: SaleDetail = {
    id: saleId,
    date: "2024-01-15",
    time: "14:30",
    vendor: "Operario Demo",
    warehouse: "Depósito Central",
    total: 45.60,
    status: "confirmada",
    image: "/placeholder.svg",
    products: [
      {
        name: "Aceite de Oliva Extra Virgen 500ml",
        sku: "AOL-500",
        quantity: 3,
        unitPrice: 8.50,
        total: 25.50
      },
      {
        name: "Arroz Integral 1kg",
        sku: "ARR-1000",
        quantity: 2,
        unitPrice: 3.20,
        total: 6.40
      },
      {
        name: "Pasta Italiana 500g",
        sku: "PAS-500",
        quantity: 5,
        unitPrice: 2.90,
        total: 14.50
      }
    ]
  };

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

  const handlePrint = () => {
    // Implementar lógica de impresión
    console.log("Imprimiendo ticket:", saleId);
  };

  const handleDownload = () => {
    // Implementar lógica de descarga
    console.log("Descargando PDF:", saleId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Detalles de Venta
          </DialogTitle>
          <DialogDescription>
            Información completa de la transacción {saleId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sale Header */}
          <div className="flex flex-col md:flex-row gap-4">
            {saleDetails.image && (
              <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden">
                <img
                  src={saleDetails.image}
                  alt="Imagen del pedido"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">{saleDetails.id}</h3>
                <Badge variant={getStatusColor(saleDetails.status) as any}>
                  {getStatusText(saleDetails.status)}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{saleDetails.date} • {saleDetails.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{saleDetails.vendor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Warehouse className="h-4 w-4 text-muted-foreground" />
                  <span>{saleDetails.warehouse}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">${saleDetails.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Products List */}
          <div className="space-y-4">
            <h4 className="font-medium">Productos ({saleDetails.products.length})</h4>
            <div className="space-y-3">
              {saleDetails.products.map((product, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <h5 className="font-medium">{product.name}</h5>
                    <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      {product.quantity} x ${product.unitPrice.toFixed(2)}
                    </div>
                    <div className="font-semibold">
                      ${product.total.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total:</span>
              <span>${saleDetails.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1 gap-2" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Descargar PDF
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}