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
  warehouseId: string | number;
  onStockAdjusted: () => void;
}

export default function AdjustStockModal({ 
  isOpen, 
  onClose, 
  productId, 
  productName, 
  currentStock,
  warehouseId,   
  onStockAdjusted 
}: AdjustStockModalProps) {
  const { toast } = useToast();
  const [adjustmentType, setAdjustmentType] = useState<"entrada" | "salida">("entrada");
  const [quantity, setQuantity] = useState("");

  const calculateNewStock = () => {
    const qty = parseInt(quantity) || 0;
    if (adjustmentType === "entrada") {
      return currentStock + qty;
    } else {
      return Math.max(0, currentStock - qty);
    }
  };

const handleSubmit = async () => {
  const qty = parseInt(quantity);

  if (!qty || qty <= 0) {
    toast({
      title: "Cantidad inválida",
      description: "Ingresa una cantidad válida mayor a 0",
      variant: "destructive"
    });
    return;
  }

  const changeQuantity = adjustmentType === "entrada" ? qty : -qty;

  try {
    const response = await fetch("http://localhost:5000/api/stock/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        warehouseId,
        changeQuantity
      })
    });

    const data = await response.json();

    if (!response.ok) {
      toast({
        title: "Error",
        description: data.error || "No se pudo actualizar el stock",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Stock actualizado",
      description: data.message
    });

    onStockAdjusted();
    handleClose();

  } catch (error) {
    toast({
      title: "Error",
      description: "Error al conectar con el servidor",
      variant: "destructive"
    });
  }
};


  const handleClose = () => {
    setQuantity("");
    setAdjustmentType("entrada");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Ajustar stock
          </DialogTitle>
          <DialogDescription>
            Modificá el inventario de {productName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Stock */}
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Stock actual</p>
            <p className="text-2xl font-bold">{currentStock}</p>
            <p className="text-xs text-muted-foreground">unidades</p>
          </div>

          {/* Adjustment Type */}
          <div className="space-y-3">
            <Label>Tipo de movimiento</Label>
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
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}