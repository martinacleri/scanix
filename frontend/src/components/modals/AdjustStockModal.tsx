import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Package,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown
} from "lucide-react";

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  currentStock: number;
  onStockAdjusted: () => void;
}

export default function AdjustStockModal({ 
  isOpen, 
  onClose, 
  productId, 
  productName, 
  currentStock,
  onStockAdjusted 
}: AdjustStockModalProps) {
  const { toast } = useToast();
  const [adjustmentType, setAdjustmentType] = useState<"entrada" | "salida">("entrada");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const reasons = {
    entrada: [
      "Compra nueva",
      "Devolución cliente",
      "Transferencia entre depósitos",
      "Ajuste de inventario",
      "Producción interna"
    ],
    salida: [
      "Venta",
      "Producto dañado",
      "Producto vencido",
      "Transferencia entre depósitos",
      "Ajuste de inventario",
      "Muestra gratuita"
    ]
  };

  const calculateNewStock = () => {
    const qty = parseInt(quantity) || 0;
    if (adjustmentType === "entrada") {
      return currentStock + qty;
    } else {
      return Math.max(0, currentStock - qty);
    }
  };

  const handleSubmit = () => {
    const qty = parseInt(quantity);
    
    if (!qty || qty <= 0) {
      toast({
        title: "Cantidad inválida",
        description: "Ingresa una cantidad válida mayor a 0",
        variant: "destructive"
      });
      return;
    }

    if (!reason) {
      toast({
        title: "Motivo requerido",
        description: "Selecciona un motivo para el ajuste",
        variant: "destructive"
      });
      return;
    }

    if (adjustmentType === "salida" && qty > currentStock) {
      toast({
        title: "Stock insuficiente",
        description: "No puedes retirar más stock del disponible",
        variant: "destructive"
      });
      return;
    }

    // Simular actualización del stock
    console.log("Ajustando stock:", {
      productId,
      type: adjustmentType,
      quantity: qty,
      reason,
      notes,
      newStock: calculateNewStock()
    });

    toast({
      title: "Stock actualizado",
      description: `Se ${adjustmentType === "entrada" ? "agregaron" : "retiraron"} ${qty} unidades`,
    });

    onStockAdjusted();
    handleClose();
  };

  const handleClose = () => {
    setQuantity("");
    setReason("");
    setNotes("");
    setAdjustmentType("entrada");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Ajustar Stock
          </DialogTitle>
          <DialogDescription>
            Modifica el inventario de {productName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Stock */}
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Stock Actual</p>
            <p className="text-2xl font-bold">{currentStock}</p>
            <p className="text-xs text-muted-foreground">unidades</p>
          </div>

          {/* Adjustment Type */}
          <div className="space-y-3">
            <Label>Tipo de Movimiento</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={adjustmentType === "entrada" ? "default" : "outline"}
                onClick={() => setAdjustmentType("entrada")}
                className="gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Entrada
              </Button>
              <Button
                variant={adjustmentType === "salida" ? "default" : "outline"}
                onClick={() => setAdjustmentType("salida")}
                className="gap-2"
              >
                <TrendingDown className="h-4 w-4" />
                Salida
              </Button>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ingresa la cantidad"
              min="1"
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo</Label>
            <select
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground"
            >
              <option value="">Seleccionar motivo</option>
              {reasons[adjustmentType].map(reasonOption => (
                <option key={reasonOption} value={reasonOption}>
                  {reasonOption}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Información adicional..."
              rows={2}
            />
          </div>

          {/* Preview */}
          {quantity && (
            <div className="p-3 border rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span>Nuevo stock:</span>
                <span className="font-semibold text-lg">
                  {calculateNewStock()} unidades
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {adjustmentType === "entrada" ? "+" : "-"}{quantity} unidades
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="flex-1">
              Confirmar Ajuste
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}