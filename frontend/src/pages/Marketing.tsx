import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, Megaphone, User, Loader2, Send, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Client {
  id: number;
  name: string;
  surname?: string;
  dni: string;
  email?: string; 
}

export default function Marketing() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados para CAMPAÑA MASIVA
  const [isCampaignOpen, setIsCampaignOpen] = useState(false);
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignMessage, setCampaignMessage] = useState("");
  const [isCampaignSending, setIsCampaignSending] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetch('http://localhost:5000/api/clients')
      .then(res => res.json())
      .then(data => setClients(data))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  // Clientes válidos para la campaña (TODOS los que tengan email)
  const validRecipients = clients.filter(c => c.email && c.email.includes('@'));

  // --- ENVÍO MASIVO ---
  const handleSendCampaign = async () => {
    if (validRecipients.length === 0) {
        toast({ title: "Sin destinatarios", description: "No hay clientes con email en la base de datos.", variant: "destructive" });
        return;
    }
    if (!campaignSubject || !campaignMessage) {
        toast({ title: "Faltan datos", description: "Completá el asunto y el mensaje.", variant: "destructive" });
        return;
    }

    setIsCampaignSending(true);
    
    const recipientsList = validRecipients.map(c => ({ 
        email: c.email, 
        name: c.name 
    }));

    try {
        const response = await fetch('http://localhost:5000/api/marketing/send-campaign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipients: recipientsList,
                subject: campaignSubject,
                message: campaignMessage
            })
        });

        if (!response.ok) throw new Error();

        toast({
            title: "¡Campaña enviada!",
            description: `Se envió el correo a ${recipientsList.length} clientes exitosamente.`,
        });
        
        // Limpiar y cerrar
        setCampaignSubject("");
        setCampaignMessage("");
        setIsCampaignOpen(false);

    } catch (error) {
        toast({ title: "Error", description: "Hubo un problema al enviar la campaña.", variant: "destructive" });
    } finally {
        setIsCampaignSending(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Marketing</h1>
            <p className="text-muted-foreground">Gestioná tus clientes y envía promociones masivas</p>
          </div>
          
          <Button 
            className="gap-2 bg-primary hover:bg-primary/90"
            onClick={() => setIsCampaignOpen(true)}
          >
            <Megaphone className="h-4 w-4" />
            Crear campaña masiva
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Audiencia Total</CardTitle>
            <CardDescription>
              {clients.length} clientes registrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        <div className="flex justify-center items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Cargando clientes...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No se encontraron clientes.</TableCell>
                    </TableRow>
                  ) : (
                    clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700">
                              <User className="h-4 w-4" />
                            </div>
                            {client.name} {client.surname}
                          </div>
                        </TableCell>
                        <TableCell>{client.dni}</TableCell>
                        <TableCell>
                          {client.email ? (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Mail className="h-3 w-3" /> {client.email}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No registrado</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* --- MODAL DE CAMPAÑA MASIVA --- */}
        <Dialog open={isCampaignOpen} onOpenChange={setIsCampaignOpen}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Megaphone className="h-5 w-5 text-primary" /> 
                        Nueva campaña masiva
                    </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    {/* Aviso de destinatarios */}
                    <div className="bg-slate-50 p-3 rounded-md border flex items-center gap-3 text-sm text-slate-600">
                        <Users className="h-5 w-5 text-slate-400" />
                        <div>
                            Se enviará a: <span className="font-bold text-slate-900">{validRecipients.length} personas</span>.
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="subject">Asunto del correo</Label>
                        <Input 
                            id="subject" 
                            placeholder="Ejemplo: ¡Descuentos imperdibles este finde!" 
                            value={campaignSubject}
                            onChange={(e) => setCampaignSubject(e.target.value)}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="message">Mensaje</Label>
                        <textarea 
                            id="message" 
                            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Escribí acá el cuerpo del correo..."
                            value={campaignMessage}
                            onChange={(e) => setCampaignMessage(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCampaignOpen(false)} disabled={isCampaignSending}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSendCampaign} disabled={isCampaignSending || validRecipients.length === 0} className="gap-2">
                        {isCampaignSending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" /> Enviar
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}