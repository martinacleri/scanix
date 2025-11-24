import React, { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  ArrowRight, 
  Download, 
  Check, 
  Package, 
  Warehouse,
  MapPin,
  Loader2,
  User // Importé el icono de usuario
} from "lucide-react";
import jsPDF from "jspdf";

interface ProductItem {
  barcode: string;
  title: string;
  quantity: number;
}

interface TransferModalProps {
  open: boolean;
  onClose: (isSuccess?: boolean) => void;
  onConfirm: () => Promise<void>;
  origin: string;
  destination: string;
  products: ProductItem[];
}

const TransferModal: React.FC<TransferModalProps> = ({ open, onClose, onConfirm, origin, destination, products }) => {
  const { toast } = useToast();
  const ticketRef = useRef(null);
  
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [operatorName, setOperatorName] = useState(""); // Nuevo estado para el operario

  // Cargar datos al abrir
  useEffect(() => {
    if (open) {
      setIsConfirmed(false);
      setIsLoading(false);

      // LEER USUARIO (Igual que en TicketModal)
      const userStr = localStorage.getItem("scanix_user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          // Armamos el nombre completo
          setOperatorName(`${user.name} ${user.surname}`);
        } catch (error) {
          console.error("Error leyendo usuario", error);
          setOperatorName("Desconocido");
        }
      }
    }
  }, [open]);

  const getCurrentDateTime = () => {
    const now = new Date();
    return {
      date: now.toLocaleDateString('es-ES'),
      time: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const dateTime = getCurrentDateTime();
  const totalItems = products.reduce((acc, p) => acc + p.quantity, 0);

  const handleConfirmProcess = async () => {
    setIsLoading(true);
    try {
        await onConfirm(); 
        setIsConfirmed(true); 
    } catch (error) {
        console.error("Error en confirmación", error);
    } finally {
        setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isConfirmed) {
        onClose(true);
    } else {
        onClose(false);
    }
  };

  const handleDownloadPDF = () => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200] 
    });

    const margin = 5;
    const docWidth = pdf.internal.pageSize.getWidth();
    let y = 10; 

    // Header
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(12);
    pdf.text('SCANIX', docWidth / 2, y, { align: 'center' });
    y += 5;
    
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(8);
    pdf.text('LOGÍSTICA INTERNA', docWidth / 2, y, { align: 'center' });
    y += 8;

    // Info Transferencia
    pdf.setFontSize(7);
    pdf.text(`Fecha: ${dateTime.date} ${dateTime.time}`, margin, y);
    y += 4;
    // --- NUEVO: Nombre del Operario en PDF ---
    pdf.text(`Operario: ${operatorName}`, margin, y);
    y += 4;
    // -----------------------------------------
    pdf.text(`Origen: ${origin}`, margin, y);
    y += 4;
    pdf.text(`Destino: ${destination}`, margin, y);
    y += 2;
    pdf.line(margin, y, docWidth - margin, y);
    y += 5;

    // Tabla - Encabezados
    pdf.setFont('courier', 'bold');
    const colProductX = margin;
    const colQtyX = docWidth - margin;

    pdf.text('PRODUCTO', colProductX, y);
    pdf.text('CANT.', colQtyX, y, { align: 'right' });
    
    y += 2;
    pdf.line(margin, y, docWidth - margin, y);
    y += 4;

    // Items
    pdf.setFont('courier', 'normal');
    products.forEach(product => {
      const productNameLines = pdf.splitTextToSize(product.title, 45); 
      
      pdf.text(productNameLines, colProductX, y);
      pdf.text(product.quantity.toString(), colQtyX, y, { align: 'right' });
      
      const nextY = y + (productNameLines.length * 3);
      pdf.setFontSize(6);
      pdf.setTextColor(100);
      pdf.text(product.barcode, colProductX, nextY);
      pdf.setTextColor(0);
      pdf.setFontSize(7);
      
      y = nextY + 4; 
    });

    y += 2;
    pdf.line(margin, y, docWidth - margin, y);
    y += 5;

    // Total Final
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(9);
    pdf.text('TOTAL UNIDADES:', margin, y); 
    pdf.text(totalItems.toString(), docWidth - margin, y, { align: 'right' });

    pdf.save(`remito_transferencia_${Date.now()}.pdf`);

    toast({
        title: "PDF generado",
        description: "El remito se ha descargado correctamente.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Remito de transferencia
          </DialogTitle>
          <DialogDescription>
            {isConfirmed 
                ? "Operación exitosa. Descargá el comprobante." 
                : "Confirmá los detalles del movimiento de stock antes de confirmar."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            
            {/* COLUMNA IZQUIERDA: VISTA PREVIA REMITO */}
            <div className="space-y-4">
                <div className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Vista previa
                </div>
                
                <div ref={ticketRef} className="bg-white border shadow-md p-6 rounded-sm font-mono text-sm text-slate-800 mx-auto w-full max-w-[380px] min-h-[400px]">
                    <div className="text-center mb-6">
                        <h3 className="font-bold text-xl tracking-wider">SCANIX</h3>
                        <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Logística Interna</p>
                    </div>

                    <Separator className="my-4 border-dashed border-slate-300" />

                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Fecha:</span>
                            <span>{dateTime.date} {dateTime.time}</span>
                        </div>
                        {/* ------------------------------------------------ */}
                        <div className="flex justify-between">
                            <span className="text-slate-500">Estado:</span>
                            {isConfirmed ? (
                                <span className="font-bold uppercase text-green-600">CONFIRMADO</span>
                            ) : (
                                <span className="font-bold uppercase text-slate-600">PENDIENTE</span>
                            )}
                        </div>
                    </div>

                    <Separator className="my-4 border-dashed border-slate-300" />

                    <div className="grid grid-cols-12 gap-1 text-[11px] font-bold uppercase text-slate-500 mb-2 border-b border-slate-200 pb-1">
                        <span className="col-span-8">Producto</span>
                        <span className="col-span-4 text-right">Cant.</span>
                    </div>
                    
                    <div className="space-y-3 mb-4">
                    {products.map((product) => (
                        <div key={product.barcode} className="grid grid-cols-12 gap-1 text-xs items-center">
                            <div className="col-span-8 pr-2">
                                <div className="truncate font-medium text-slate-700">{product.title}</div>
                                <div className="text-[10px] text-slate-400">{product.barcode}</div>
                            </div>
                            <span className="col-span-4 text-right font-bold text-slate-800 text-sm">
                                {product.quantity}
                            </span>
                        </div>
                    ))}
                    </div>

                    <Separator className="my-4 border-dashed border-slate-300" />

                    <div className="flex justify-between items-end">
                        <span className="font-bold">TOTAL UNIDADES</span>
                        <span className="font-bold text-xl tracking-tight">{totalItems}</span>
                    </div>
                </div>
            </div>

            {/* COLUMNA DERECHA: DATOS Y ACCIONES */}
            <div className="flex flex-col h-full">
                
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-5 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm text-slate-900">Ruta de transferencia</h3>
                            <p className="text-xs text-slate-500">Movimiento entre depósitos</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
                         <div className="text-center">
                            <div className="bg-blue-100 text-blue-700 p-2 rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2">
                                <Warehouse className="h-5 w-5" />
                            </div>
                            <p className="text-xs font-bold text-slate-700 max-w-[100px] truncate">{origin}</p>
                         </div>

                         <div className="flex flex-col items-center text-slate-400">
                             {isConfirmed ? (
                                <Check className="h-6 w-6 text-green-500" />
                             ) : (
                                <>
                                    <div className="border-t-2 border-dashed border-slate-300 w-16 mb-1"></div>
                                    <ArrowRight className="h-4 w-4" />
                                </>
                             )}
                         </div>

                         <div className="text-center">
                            <div className="bg-green-100 text-green-700 p-2 rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2">
                                <Warehouse className="h-5 w-5" />
                            </div>
                            <p className="text-xs font-bold text-slate-700 max-w-[100px] truncate">{destination}</p>
                         </div>
                    </div>

                    {/* Mostrar Operario también en el panel derecho para confirmar */}
                    <div className="flex items-center gap-3 p-3 bg-white text-slate-600 rounded-md border border-slate-100">
                        <User className="h-4 w-4 text-slate-400" />
                        <div className="text-xs">
                            Operación a cargo de: <span className="font-bold text-slate-800">{operatorName}</span>
                        </div>
                    </div>
                </div>

{/* Acciones Finales */}
                <div className="space-y-4 pt-6 mt-auto border-t">
                    {/* Botón Principal: Confirmar -> Registrado */}
                    <Button 
                        onClick={handleConfirmProcess} 
                        className="w-full gap-2 font-bold text-md h-12 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" 
                        size="lg"
                        disabled={isLoading || isConfirmed} // Se bloquea al terminar
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" /> Procesando...
                            </>
                        ) : (
                            <>
                                <Check className="h-5 w-5" />
                                {isConfirmed ? 'Transferencia registrada' : 'Confirmar transferencia'}
                            </>
                        )}
                    </Button>
                    
                    {/* Botones Secundarios: PDF y Cancelar */}
                    <div className="grid grid-cols-2 gap-3">
                        <Button 
                            variant="outline" 
                            onClick={handleDownloadPDF} 
                            disabled={!isConfirmed} // Deshabilitado hasta confirmar (estilo TicketModal)
                            className="gap-2 h-10"
                        >
                            <Download className="h-4 w-4" /> Descargar PDF
                        </Button>

                        <Button 
                            variant="outline" 
                            onClick={handleClose} 
                            className="w-full h-10" 
                            disabled={isLoading}
                        >
                            {isConfirmed ? 'Cerrar' : 'Cancelar'}
                        </Button>
                    </div>
                </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransferModal;