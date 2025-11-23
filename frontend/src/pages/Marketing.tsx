import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, MessageCircle, Mail, Megaphone, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: number;
  name: string;
  surname?: string;
  dni: string;
  phone?: string;
  email?: string;
}

export default function Marketing() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetch('http://localhost:5000/api/clients')
      .then(res => res.json())
      .then(data => setClients(data))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.surname && client.surname.toLowerCase().includes(searchTerm.toLowerCase())) ||
    client.dni.includes(searchTerm)
  );

  const handleSendWhatsApp = (phone: string | undefined, name: string) => {
    if (!phone) {
      toast({ title: "Sin teléfono", description: "Este cliente no tiene número registrado.", variant: "destructive" });
      return;
    }

    // Mensaje promocional pre-armado
    const message = `Hola ${name}! 👋 En SCANIX tenemos nuevas ofertas pensadas para vos. Pasá por nuestra sucursal y aprovechá los descuentos en bebidas y snacks. ¡Te esperamos!`;
    
    // Abrir API de WhatsApp
    // Eliminamos caracteres no numéricos del teléfono por si acaso
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    window.open(url, '_blank');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Marketing y Ofertas</h1>
            <p className="text-muted-foreground">Gestiona tus clientes y envía promociones</p>
          </div>
          <Button className="gap-2">
            <Megaphone className="h-4 w-4" />
            Crear Campaña Masiva
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cartera de Clientes</CardTitle>
            <CardDescription>
              Total: {clients.length} clientes registrados
            </CardDescription>
            <div className="pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por nombre o DNI..." 
                  className="pl-10 max-w-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">Cargando clientes...</TableCell>
                    </TableRow>
                  ) : filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No se encontraron clientes.</TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                              <User className="h-4 w-4" />
                            </div>
                            {client.name} {client.surname}
                          </div>
                        </TableCell>
                        <TableCell>{client.dni}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                            {client.phone ? <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3"/> {client.phone}</span> : <span className="text-muted-foreground italic">Sin teléfono</span>}
                            {client.email ? <span className="flex items-center gap-1"><Mail className="h-3 w-3"/> {client.email}</span> : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                            onClick={() => handleSendWhatsApp(client.phone, client.name)}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Enviar Oferta
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}