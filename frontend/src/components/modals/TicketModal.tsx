import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { ProductUI, ProductFromAPI, PriceRule, PriceRuleFromAPI, CartItem } from '@/types';
import { 
  Receipt,
  Download,
  Printer,
  Mail,
  MessageSquare,
  Check,
  User,
  Calendar,
  Warehouse
} from "lucide-react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: CartItem[]; 
}

interface FoundClient {
    id: number;
    name: string;
    surname: string;
}


export default function TicketModal({ isOpen, onClose, products}: TicketModalProps) {
  const { toast } = useToast();
  const ticketRef = useRef(null);
  const [ticketData, setTicketData] = useState({
    vendor: "Andrés Scocco",
    warehouse: "Central",
    customerEmail: "",
    customerPhone: ""
  });

  const [dni, setDni] = useState("");
  const [foundClient, setFoundClient] = useState<FoundClient | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [newClientSurname, setNewClientSurname] = useState("");
  const [isClientLoading, setIsClientLoading] = useState(false);
  const [confirmedSaleId, setConfirmedSaleId] = useState<number | null>(null);

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
            return;
        }

        setIsClientLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/api/clients/dni/${dni}`);
            
            if (response.status === 404) {
                // Cliente no encontrado, preparamos para crear uno nuevo
                setFoundClient(null);
                toast({
                    title: "Cliente nuevo",
                    description: "Ingresa el nombre para registrar al nuevo cliente."
                });
                return;
            }

            if (!response.ok) {
                throw new Error('Error al buscar el cliente');
            }

            const clientData = await response.json();
            setFoundClient(clientData);
            setNewClientName(""); // Limpiamos el campo de nuevo nombre

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

  const calculateTotal = () => {
    return products.reduce((total, product) => {
      const correctPrice = getCurrentPrice(product, product.quantity);
      return total + (product.quantity * correctPrice);
    }, 0);
  };

const handleConfirmSale = async () => {
        // Transformamos los productos al formato que espera la API
        const itemsForApi = products.map(p => ({
            productId: parseInt(p.id),
            quantity: p.quantity,
            price_per_unit: getCurrentPrice(p, p.quantity)
        }));

        // Preparamos el cuerpo de la petición
        const body = {
            warehouseId: 2, // Esto debería venir de un estado global, por ahora lo dejamos fijo
            items: itemsForApi,
            clientDni: dni || undefined,
            clientName: newClientName || undefined,
            clientSurname: newClientSurname || undefined,
        };
        
        // Validación: si se ingresó un DNI de un cliente nuevo, se debe ingresar un nombre y apellido
        if (dni && !foundClient && (!newClientName || !newClientSurname)) {
        toast({ title: "Datos requeridos", description: "Ingrese el nombre y apellido para el nuevo cliente.", variant: "destructive" });
        return;
    }

        // Hacemos la llamada a la API
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
    // Creamos un PDF con el tamaño de un ticket de impresora térmica (80mm de ancho)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200] // Ancho: 100mm, Alto: 150mm (ajustable)
    });

    const margin = 5;
    const docWidth = pdf.internal.pageSize.getWidth();
    let y = 10; // Posición vertical inicial

    // --- ENCABEZADO ---
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(12);
    pdf.text('SCANIX', docWidth / 2, y, { align: 'center' });
    y += 5;
    
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(8);
    pdf.text('Sistema de ventas', docWidth / 2, y, { align: 'center' });
    y += 8;

    // --- INFORMACIÓN DEL TICKET ---
    pdf.setFontSize(7);
    pdf.text(`N°: ${displayTicketId}`, margin, y);
    pdf.text(`${dateTime.date} ${dateTime.time}`, docWidth - margin, y, { align: 'right' });
    y += 4;
    pdf.text(`Operario: ${ticketData.vendor}`, margin, y);
    y += 4;
    pdf.text(`Depósito: ${ticketData.warehouse}`, margin, y);
    y += 6;

    // --- LÍNEA SEPARADORA ---
    pdf.line(margin, y, docWidth - margin, y);
    y += 5;

    // --- CABECERA DE LA TABLA DE PRODUCTOS ---
    pdf.setFont('courier', 'bold');
    pdf.text('PRODUCTO', margin, y);
    pdf.text('CANT', 46, y, { align: 'center' });
    pdf.text('PRECIO', 60, y, { align: 'right' });
    pdf.text('SUBTOTAL', docWidth - margin, y, { align: 'right' });
    y += 2;
    pdf.line(margin, y, docWidth - margin, y);
    y += 4;

    // --- LISTA DE PRODUCTOS ---
    pdf.setFont('courier', 'normal');
    products.forEach(product => {
      const correctPrice = getCurrentPrice(product, product.quantity);
      const subtotal = product.quantity * correctPrice;

      // jsPDF puede manejar el texto que ocupa varias líneas
      const productNameLines = pdf.splitTextToSize(product.name, 38); // Ancho máximo para el nombre
      
      pdf.text(productNameLines, margin, y);
      pdf.text(product.quantity.toString(), 46, y, { align: 'center' });
      pdf.text(`$${correctPrice.toFixed(2)}`, 60, y, { align: 'right' });
      pdf.text(`$${subtotal.toFixed(2)}`, docWidth - margin, y, { align: 'right' });
      
      y += (productNameLines.length * 3) + 3; 
    });

    // --- LÍNEA FINAL ---
    y += 2;
    pdf.line(margin, y, docWidth - margin, y);
    y += 5;

    // --- TOTAL FINAL ---
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(10);
    pdf.text('TOTAL:', 45, y, { align: 'right' });
    pdf.text(`$${total.toFixed(2)}`, docWidth - margin, y, { align: 'right' });

    // --- DESCARGAR EL PDF ---
    pdf.save(`venta-${confirmedSaleId || 'temp'}.pdf`);

    toast({
        title: "PDF generado",
        description: `Se ha descargado el ticket de venta.`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    if (!ticketData.customerEmail) {
      toast({
        title: "Email requerido",
        description: "Ingresa el email del cliente",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Email enviado",
      description: `Ticket enviado a ${ticketData.customerEmail}`,
    });
  };

  const handleSendWhatsApp = () => {
    if (!ticketData.customerPhone) {
      toast({
        title: "Teléfono requerido",
        description: "Ingresa el teléfono del cliente",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "WhatsApp enviado",
      description: `Ticket enviado a ${ticketData.customerPhone}`,
    });
  };

  const date = new Date();
  const datePrefix = `VTA-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const displayTicketId = confirmedSaleId ? `${datePrefix}-${confirmedSaleId}` : 'PENDIENTE';

  const dateTime = getCurrentDateTime();
  const total = calculateTotal();

  const resetState = () => {
    setDni("");
    setFoundClient(null);
    setNewClientName("");
    setNewClientSurname("");
    setConfirmedSaleId(null);
    setTicketData(prev => ({ ...prev, customerEmail: "", customerPhone: "" }));
  };

  const handleClose = () => {
    resetState(); // Primero, reseteamos el estado interno
    onClose();    // Luego, llamamos a la función del padre para cerrar el modal
  };  

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Ticket de venta
          </DialogTitle>
          <DialogDescription>
            {confirmedSaleId ? `Venta #${confirmedSaleId} confirmada` : 'Revisa los detalles antes de confirmar la venta.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ticket Preview */}
          <div ref={ticketRef} className="printable-ticket bg-muted/30 p-4 rounded-lg font-mono text-sm">
            <div className="text-center mb-4">
              <h3 className="font-bold text-lg">SCANIX</h3>
              <p className="text-xs">Sistema de ventas</p>
            </div>

            <Separator className="my-3" />

            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
              <div className="flex items-center gap-1">
                <Receipt className="h-3 w-3" />
                <span>N°: {displayTicketId}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{dateTime.date} {dateTime.time}</span>
              </div>
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>Operario: {ticketData.vendor}</span>
              </div>
              <div className="flex items-center gap-1">
                <Warehouse className="h-3 w-3" />
                <span>Depósito: {ticketData.warehouse}</span>
              </div>
            </div>

            <Separator className="my-3" />

            {/* Products */}
            <div className="space-y-2 mb-4">
              <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
                <span>Producto</span>
                <span className="text-center">Cantidad</span>
                <span className="text-right">Precio unitario</span>
                <span className="text-right">Subtotal</span>
              </div>
              
              {products.map((product) => (
                <div key={product.id} className="space-y-1">
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <span className="col-span-1 truncate">{product.name}</span>
                    <span className="text-center">{product.quantity}</span>
                    <span className="text-right">${getCurrentPrice(product, product.quantity).toFixed(2)}</span>
                    <span className="text-right font-semibold">
                      ${(product.quantity * getCurrentPrice(product, product.quantity)).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-3" />

            <div className="text-right font-bold">
              TOTAL: ${total.toFixed(2)}
            </div>
          </div>

          {/* Customer Info */}
          <div className="space-y-4">
            <Label>Cliente</Label>
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="dni" className="text-xs">DNI</Label>
                  <Input
                    id="dni"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    onBlur={handleDniBlur}
                    placeholder="Buscar por DNI"
                    disabled={isClientLoading || !!confirmedSaleId}
                  />
            </div>


                {dni && !foundClient && (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs">Nombre</Label>
                            <Input id="name" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Nombre del nuevo cliente" disabled={!!confirmedSaleId}/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="surname" className="text-xs">Apellido</Label>
                            <Input id="surname" value={newClientSurname} onChange={(e) => setNewClientSurname(e.target.value)} placeholder="Apellido del nuevo cliente" disabled={!!confirmedSaleId}/>
                        </div>
                    </>
                )}
                {foundClient && (
                    <div className="md:col-span-2 flex items-center gap-2 pt-6 text-green-600">
                        <Check className="h-4 w-4" />
                        <span className="font-semibold">{foundClient.name} {foundClient.surname}</span>
                    </div>
                )}
            </div>
          </div>

          {/* Campos de contacto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="email">Email (opcional)</Label>
                  <Input id="email" type="email" value={ticketData.customerEmail} onChange={(e) => setTicketData(prev => ({ ...prev, customerEmail: e.target.value }))} placeholder="cliente@email.com" disabled={!!confirmedSaleId} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp (opcional)</Label>
                  <Input id="phone" value={ticketData.customerPhone} onChange={(e) => setTicketData(prev => ({ ...prev, customerPhone: e.target.value }))} placeholder="+54 11 1234 5678" disabled={!!confirmedSaleId} />
              </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={!confirmedSaleId} className="gap-1">
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={!confirmedSaleId} className="gap-1">
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
              <Button variant="outline" size="sm" onClick={handleSendEmail} disabled={!confirmedSaleId} className="gap-1">
                <Mail className="h-4 w-4" />
                Email
              </Button>
              <Button variant="outline" size="sm" onClick={handleSendWhatsApp} disabled={!confirmedSaleId} className="gap-1">
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                {confirmedSaleId ? 'Cerrar' : 'Cancelar'}
              </Button>
              <Button onClick={handleConfirmSale} className="flex-1 gap-2">
                <Check className="h-4 w-4" />
                Confirmar venta
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}