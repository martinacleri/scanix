import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import type { ProductUI, CartItem } from '@/types';
import { 
  Receipt,
  Download,
  Mail,
  Check,
  User,
  Calendar,
  Warehouse,
  AlertCircle,
  Scissors,
  Loader2
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import jsPDF from 'jspdf';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: CartItem[];
  onSaleComplete: () => void;
}

interface FoundClient {
    id: number;
    name: string;
    surname: string;
    email?: string;
}

interface TicketHeaderState {
  vendor: string;
  warehouse: string;
  customerEmail: string;
}

export default function TicketModal({ isOpen, onClose, products, onSaleComplete}: TicketModalProps) {
  const { toast } = useToast();
  const ticketRef = useRef(null);
  
  const [ticketHeader, setTicketHeader] = useState<TicketHeaderState>({ 
    vendor: "", 
    warehouse: "",
    customerEmail: "" 
  });

  const [dni, setDni] = useState("");
  const [foundClient, setFoundClient] = useState<FoundClient | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [newClientSurname, setNewClientSurname] = useState("");
  const [isClientLoading, setIsClientLoading] = useState(false);
  const [isEmailSending, setIsEmailSending] = useState(false); // Estado para carga de email
  const [confirmedSaleId, setConfirmedSaleId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      const userStr = localStorage.getItem("scanix_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setTicketHeader(prev => ({
          ...prev,
          vendor: `${user.name} ${user.surname}`,
          warehouse: user.warehouseName,
          customerEmail: "" 
        }));
        setDni("");
        setFoundClient(null);
        setNewClientName("");
        setNewClientSurname("");
        setConfirmedSaleId(null);
        setIsEmailSending(false);
      }
    }
  }, [isOpen]);

 const getCurrentPrice = (product: ProductUI, quantity: number): number => {
    if (!product.priceRules || product.priceRules.length === 0) {
        return product.price;
    }
    const sortedRules = [...product.priceRules].sort((a, b) => b.from - a.from);
    const applicableRule = sortedRules.find(rule => quantity >= rule.from);
    return applicableRule ? applicableRule.price : product.price;
};
  
  const handleDniBlur = async () => {
        if (!dni.trim()) {
            setFoundClient(null);
            setTicketHeader(prev => ({ ...prev, customerEmail: "" }));
            return;
        }

        setIsClientLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/api/clients/dni/${dni}`);
            
            if (response.status === 404) {
                setFoundClient(null);
                setTicketHeader(prev => ({ ...prev, customerEmail: "" }));
                toast({
                    title: "Cliente nuevo",
                    description: "Complete los datos para registrarlo y enviarle ofertas."
                });
                return;
            }

            if (!response.ok) {
                throw new Error('Error al buscar el cliente');
            }

            const clientData = await response.json();
            
            setFoundClient(clientData);
            setNewClientName("");
            setNewClientSurname("");
            
            if (clientData.email) {
                setTicketHeader(prev => ({ ...prev, customerEmail: clientData.email }));
                toast({
                    description: `Cliente encontrado. Email recuperado: ${clientData.email}`,
                });
            } else {
                setTicketHeader(prev => ({ ...prev, customerEmail: "" }));
                toast({
                    title: "Cliente sin email",
                    description: "Este cliente existe pero no tiene email registrado. Por favor ingréselo.",
                    variant: "default"
                });
            }

        } catch (error) {
            console.error(error);
            toast({ title: "Error de red", variant: "destructive" });
        } finally {
            setIsClientLoading(false);
        }
    };

  const getCurrentDateTime = () => {
    const now = new Date();
    return {
      date: now.toLocaleDateString('es-ES'),
      time: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const calculateTotals = () => {
    return products.reduce((acc, product) => {
      const unitPrice = getCurrentPrice(product, product.quantity); 
      const originalPrice = product.price; 
      
      const lineTotal = product.quantity * unitPrice;
      const lineOriginalTotal = product.quantity * originalPrice;
      
      return {
        subtotal: acc.subtotal + lineOriginalTotal,
        total: acc.total + lineTotal,
        savings: acc.savings + (lineOriginalTotal - lineTotal)
      };
    }, { subtotal: 0, total: 0, savings: 0 });
  };

  const { subtotal, total, savings } = calculateTotals();

  const handleConfirmSale = async () => {
        const itemsForApi = products.map(p => ({
            productId: parseInt(p.id),
            quantity: p.quantity,
            price_per_unit: getCurrentPrice(p, p.quantity)
        }));

        const userStr = localStorage.getItem("scanix_user");
        const user = userStr ? JSON.parse(userStr) : null;
        
        if (dni && !foundClient && (!newClientName || !newClientSurname)) {
          toast({ title: "Datos incompletos", description: "Ingrese nombre y apellido del nuevo cliente.", variant: "destructive" });
          return;
        }

        if (dni && !ticketHeader.customerEmail) {
            toast({ 
                title: "Email requerido para ofertas", 
                description: "Para registrar al cliente en el sistema de ofertas, el email es obligatorio.", 
                variant: "destructive" 
            });
            return;
        }

        const body = {
            warehouseId: user?.warehouseId || 2, 
            items: itemsForApi,
            clientDni: dni || undefined,
            clientName: newClientName || undefined,
            clientSurname: newClientSurname || undefined,
            clientEmail: ticketHeader.customerEmail || undefined, 
            sellerId: user?.id
        };
        
        try {
            const response = await fetch('http://localhost:5000/api/sales', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al registrar la venta');
            }

            const result = await response.json();

            setConfirmedSaleId(result.sale.id);
            toast({
                title: "Venta confirmada",
                description: `Ticket #${result.sale.id} generado exitosamente`,
            });

        } catch (error: any) {
            toast({
                title: "Error en la venta",
                variant: "destructive",
                description: (
                  <div className="flex flex-col gap-1">
                    {error.message.split('\n').map((line: string, index: number) => (
                    <p key={index}>{line}</p>
                    ))}
                  </div>
                ),
            });
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
    pdf.text('SISTEMA DE VENTAS', docWidth / 2, y, { align: 'center' });
    y += 8;

    // Info Ticket
    pdf.setFontSize(7);
    pdf.text(`N°: ${displayTicketId}`, margin, y);
    pdf.text(`${dateTime.date} ${dateTime.time}`, docWidth - margin, y, { align: 'right' });
    y += 4;
    pdf.text(`Cajero: ${ticketHeader.vendor}`, margin, y);
    y += 4;
    pdf.text(`Sucursal: ${ticketHeader.warehouse}`, margin, y);
    y += 4;

    if(dni) {
         const cName = foundClient ? `${foundClient.name} ${foundClient.surname}` : `${newClientName} ${newClientSurname}`;
         pdf.text(`Cliente: ${cName}`, margin, y);
         y += 4;
         pdf.text(`DNI: ${dni}`, margin, y);
         y += 4;
         if(ticketHeader.customerEmail) {
            pdf.text(`Email: ${ticketHeader.customerEmail}`, margin, y);
            y += 4;
         }
    }
    
    y += 2;
    pdf.line(margin, y, docWidth - margin, y);
    y += 5;

    // Tabla - Encabezados
    pdf.setFont('courier', 'bold');
    
    // NUEVAS POSICIONES PARA MÁS ESPACIO
    const colProductX = margin;
    const colQtyX = 38; // Movido un poco a la izquierda
    const colPriceX = 60; // Movido a la derecha para separar de Cantidad
    const colTotalX = docWidth - margin;

    pdf.text('PRODUCTO', colProductX, y);
    pdf.text('CANT.', colQtyX, y, { align: 'center' });
    pdf.text('P. UNIT', colPriceX, y, { align: 'right' });
    pdf.text('SUBT.', colTotalX, y, { align: 'right' });
    
    y += 2;
    pdf.line(margin, y, docWidth - margin, y);
    y += 4;

    // Items
    pdf.setFont('courier', 'normal');
    products.forEach(product => {
      const correctPrice = getCurrentPrice(product, product.quantity);
      const subtotal = product.quantity * correctPrice;

      const productNameLines = pdf.splitTextToSize(product.name, 32); 
      
      pdf.text(productNameLines, colProductX, y);
      
      // Alineamos los valores numéricos
      pdf.text(product.quantity.toString(), colQtyX, y, { align: 'center' });
      pdf.text(`$${correctPrice.toFixed(2)}`, colPriceX, y, { align: 'right' });
      pdf.text(`$${subtotal.toFixed(2)}`, colTotalX, y, { align: 'right' });
      
      y += (productNameLines.length * 3) + 2; 
    });

    y += 2;
    pdf.line(margin, y, docWidth - margin, y);
    y += 5;

    // SECCIÓN TOTALES - ALINEADA A LA IZQUIERDA
    if (savings > 0) {
        pdf.setFontSize(8);
        
        // Subtotal
        pdf.text('Subtotal:', margin, y); // Etiqueta a la izquierda
        pdf.text(`$${subtotal.toFixed(2)}`, docWidth - margin, y, { align: 'right' });
        y += 4;
        
        // Descuentos
        pdf.text('Descuentos:', margin, y); // Etiqueta a la izquierda
        pdf.text(`-$${savings.toFixed(2)}`, docWidth - margin, y, { align: 'right' });
        y += 4;
        
        pdf.line(margin, y, docWidth - margin, y);
        y += 4;
    }

    // Total Final
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(10);
    pdf.text('TOTAL:', margin, y); // Etiqueta a la izquierda
    pdf.text(`$${total.toFixed(2)}`, docWidth - margin, y, { align: 'right' }); // Monto a la derecha

    pdf.save(`venta-${confirmedSaleId || 'temp'}.pdf`);

    toast({
        title: "PDF generado",
        description: "El ticket se ha descargado correctamente.",
    });
  };

  // --- NUEVA LÓGICA DE ENVÍO DE EMAIL ---
  const handleSendEmail = async () => {
    if (!ticketHeader.customerEmail || !confirmedSaleId) {
      toast({
        title: "Error",
        description: "Se necesita una venta confirmada y un email.",
        variant: "destructive"
      });
      return;
    }

    setIsEmailSending(true);
    try {
        const response = await fetch('http://localhost:5000/api/sales/send-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                saleId: confirmedSaleId, 
                email: ticketHeader.customerEmail 
            })
        });

        if (!response.ok) throw new Error("Error al enviar email");

        toast({
            title: "Email enviado",
            description: `El ticket fue enviado a ${ticketHeader.customerEmail}`,
        });
    } catch (error) {
        toast({
            title: "Error",
            description: "No se pudo enviar el email. Intente más tarde.",
            variant: "destructive"
        });
    } finally {
        setIsEmailSending(false);
    }
  };

  const date = new Date();
  const datePrefix = `VTA-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const displayTicketId = confirmedSaleId ? `${datePrefix}-${confirmedSaleId}` : 'PENDIENTE';

  const dateTime = getCurrentDateTime();
  
  const handleClose = () => {
    if (confirmedSaleId) {
        onSaleComplete();
    } else {
        onClose();
    }
  };  

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Ticket de venta
          </DialogTitle>
          <DialogDescription>
            {confirmedSaleId ? `Venta #${confirmedSaleId} confirmada` : 'Revisa los detalles antes de confirmar la venta.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            
            {/* COLUMNA IZQUIERDA: VISUALIZACIÓN DEL TICKET */}
            <div className="space-y-4">
                <div className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    <Receipt className="h-4 w-4" /> Vista previa
                </div>
                <div ref={ticketRef} className="printable-ticket bg-white border shadow-md p-6 rounded-sm font-mono text-sm text-slate-800 mx-auto w-full max-w-[380px]">
                    <div className="text-center mb-6">
                        <h3 className="font-bold text-xl tracking-wider">SCANIX</h3>
                        <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Sistema de ventas</p>
                    </div>

                    <Separator className="my-4 border-dashed border-slate-300" />

                    <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-500">N° Ticket:</span>
                        <span className="font-bold">{displayTicketId}</span>
                    </div>
                    <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-500">Fecha:</span>
                        <span>{dateTime.date} {dateTime.time}</span>
                    </div>
                    <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-500">Cajero:</span>
                        <span className="truncate max-w-[150px]">{ticketHeader.vendor}</span>
                    </div>
                    <div className="flex justify-between text-xs mb-1.5">
                         <span className="text-slate-500">Sucursal:</span>
                         <span>{ticketHeader.warehouse}</span>
                    </div>

                    <Separator className="my-4 border-dashed border-slate-300" />

                    {/* Encabezados Tabla */}
                    <div className="grid grid-cols-12 gap-1 text-[11px] font-bold uppercase text-slate-500 mb-2 border-b border-slate-200 pb-1">
                        <span className="col-span-5">Producto</span>
                        <span className="col-span-2 text-center">Cant.</span>
                        <span className="col-span-2 text-right">P. Unit.</span>
                        <span className="col-span-3 text-right">Subt.</span>
                    </div>
                    
                    {/* Lista Productos */}
                    <div className="space-y-3 mb-4 min-h-[120px]">
                    {products.map((product) => {
                        const unitPrice = getCurrentPrice(product, product.quantity);
                        //const hasDiscount = unitPrice < product.price; 
                        
                        return (
                            <div key={product.id} className="grid grid-cols-12 gap-1 text-xs items-center group">
                                <span className="col-span-5 truncate font-medium text-slate-700">{product.name}</span>
                                <span className="col-span-2 text-center text-slate-600">{product.quantity}</span>
                                <span className="col-span-2 text-right text-slate-700">${unitPrice.toFixed(0)}</span>
                                <span className="col-span-3 text-right font-bold text-slate-800">
                                    ${(product.quantity * unitPrice).toFixed(0)}
                                </span>
                            </div>
                        );
                    })}
                    </div>

                    <Separator className="my-4 border-dashed border-slate-300" />

                    {/* SECCIÓN DE RESUMEN Y DESCUENTOS */}
                    {savings > 0 && (
                        <div className="space-y-2 mb-4 text-xs">
                            <div className="flex justify-between text-slate-500">
                                <span>Subtotal</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-green-600 font-medium">
                                <span className="flex items-center gap-1">Descuentos aplicados</span>
                                <span>-${savings.toFixed(2)}</span>
                            </div>
                            <Separator className="my-2 border-dashed border-slate-200" />
                        </div>
                    )}

                    <div className="flex justify-between items-end">
                        <span className="font-bold text-xl">TOTAL</span>
                        <span className="font-bold text-2xl tracking-tight">${total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* COLUMNA DERECHA: DATOS CLIENTE Y ACCIONES */}
            <div className="flex flex-col justify-between h-full">
                <div className="space-y-6">
                     {/* Panel de Cliente */}
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <User className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm text-slate-900">Datos del cliente</h3>
                                    <p className="text-xs text-slate-500">Identificación y contacto</p>
                                </div>
                            </div>
                            {dni && (
                                <span className="text-[10px] bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold tracking-wide uppercase">
                                    Fidelización activa
                                </span>
                            )}
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="dni" className="text-xs font-medium text-slate-600">DNI</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="dni"
                                        value={dni}
                                        onChange={(e) => setDni(e.target.value)}
                                        onBlur={handleDniBlur}
                                        placeholder="Ingrese DNI para buscar o registrar"
                                        className="h-10 border-slate-300 focus-visible:ring-primary/20"
                                        disabled={isClientLoading || !!confirmedSaleId}
                                    />
                                </div>
                                {!dni && <p className="text-[11px] text-slate-400 flex items-center gap-1"><AlertCircle className="h-3 w-3"/> Si se deja vacío, la venta será anónima.</p>}
                            </div>

                            {/* Campos condicionales */}
                            {dni && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-500 border-t border-slate-200 pt-4 mt-2">
                                    {isClientLoading ? (
                                        <div className="py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-3">
                                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                            <span>Buscando cliente en base de datos...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="name" className="text-xs font-medium text-slate-600">Nombre <span className="text-red-500">*</span></Label>
                                                    <Input 
                                                        id="name" 
                                                        value={foundClient ? foundClient.name : newClientName} 
                                                        onChange={(e) => setNewClientName(e.target.value)} 
                                                        disabled={!!foundClient || !!confirmedSaleId}
                                                        className="h-9 text-sm bg-white border-slate-300"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="surname" className="text-xs font-medium text-slate-600">Apellido <span className="text-red-500">*</span></Label>
                                                    <Input 
                                                        id="surname" 
                                                        value={foundClient ? foundClient.surname : newClientSurname} 
                                                        onChange={(e) => setNewClientSurname(e.target.value)} 
                                                        disabled={!!foundClient || !!confirmedSaleId}
                                                        className="h-9 text-sm bg-white border-slate-300"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <div className="flex justify-between items-center">
                                                    <Label htmlFor="email" className="text-xs font-medium text-slate-600">Email <span className="text-red-500">*</span></Label>
                                                    <span className="text-[10px] text-primary font-medium">Requerido para ofertas</span>
                                                </div>
                                                <Input 
                                                    id="email" 
                                                    type="email" 
                                                    value={ticketHeader.customerEmail} 
                                                    onChange={(e) => setTicketHeader(prev => ({ ...prev, customerEmail: e.target.value }))} 
                                                    placeholder="cliente@ejemplo.com" 
                                                    disabled={!!confirmedSaleId} 
                                                    className="h-10 bg-white border-slate-300"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Acciones Finales */}
                <div className="space-y-4 pt-6 mt-auto">
                    <Button 
                        onClick={handleConfirmSale} 
                        className="w-full gap-2 font-bold text-md h-12 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" 
                        size="lg"
                        disabled={!!confirmedSaleId}
                    >
                        <Check className="h-5 w-5" />
                        {confirmedSaleId ? 'Venta registrada' : `Confirmar venta`}
                    </Button>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" onClick={handleDownloadPDF} disabled={!confirmedSaleId} className="gap-2 h-10 border-slate-300 hover:bg-slate-50">
                            <Download className="h-4 w-4" />Descargar PDF
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={handleSendEmail} 
                            disabled={!confirmedSaleId || !ticketHeader.customerEmail || isEmailSending} 
                            className="gap-2 h-10 border-slate-300 hover:bg-slate-50"
                        >
                            {isEmailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                            {isEmailSending ? "Enviando..." : "Enviar por email"}
                        </Button>
                    </div>

                    <div className="text-center pt-2">
                        <Button variant="link" onClick={handleClose} className="text-slate-400 hover:text-slate-600 h-auto p-0 text-xs">
                            {confirmedSaleId ? 'Cerrar' : 'Cancelar'}
                        </Button>
                    </div>
                </div>
            </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}