import { useState, useRef, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Upload, ArrowRight, Package, FileText, X, Plus, Minus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ProductUI, ProductFromAPI, CartItem } from '@/types';
import { mapProductFromApiToUI } from '@/types';

// Interfaz para los depósitos que vienen de la API
interface Warehouse {
  id: number;
  name: string;
  location: string;
}

export default function Transfers() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [fromWarehouse, setFromWarehouse] = useState<string>("");
  const [toWarehouse, setToWarehouse] = useState<string>("");
  
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  // Usamos CartItem porque necesitamos la propiedad quantity
  const [detectedProducts, setDetectedProducts] = useState<CartItem[]>([]);
  
  const [isScanning, setIsScanning] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  
  const { toast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. Cargar Depósitos al iniciar
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/warehouses');
        if (response.ok) {
          const data = await response.json();
          setWarehouses(data);
        }
      } catch (error) {
        console.error("Error cargando depósitos:", error);
      }
    };
    fetchWarehouses();
  }, []);

  // 2. Lógica de Procesamiento de Imagen (Igual a ProductScanner)
  const processImage = async (file: File) => {
    setIsScanning(true);
    setDetectedProducts([]);

    try {
      const formData = new FormData();
      formData.append('image', file);

      // Usamos el mismo endpoint de reconocimiento
      const response = await fetch('http://localhost:5000/api/recognize', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en el reconocimiento');
      }
      
      const dataFromApi: ProductFromAPI[] = await response.json();
      const formattedProducts = dataFromApi.map(mapProductFromApiToUI);

      // Convertimos a CartItem (agregando quantity: 1)
      const itemsWithQuantity: CartItem[] = formattedProducts.map(p => ({ ...p, quantity: 1 }));
      
      setDetectedProducts(itemsWithQuantity);
      
      toast({
        title: "Productos detectados",
        description: `Se encontraron ${itemsWithQuantity.length} productos.`,
      });

    } catch (error: any) {
      console.error(error);
      toast({
        title: "No se reconoció nada",
        description: "Intenta con otra imagen o carga los productos manualmente.",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Error", description: "Máximo 5MB", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setScannedImage(e.target?.result as string);
        processImage(file); // Llamamos a la API
      };
      reader.readAsDataURL(file);
    }
  };

  const updateQuantity = (id: string, change: number) => {
    setDetectedProducts(products =>
      products.map(p => 
        p.id === id ? { ...p, quantity: Math.max(1, p.quantity + change) } : p
      )
    );
  };

  const removeProduct = (id: string) => {
    setDetectedProducts(products => products.filter(p => p.id !== id));
  };

  // 3. Generar la Transferencia (Remito)
  const generateTransferOrder = async () => {
    if (!fromWarehouse || !toWarehouse) {
      toast({ title: "Faltan datos", description: "Selecciona depósito de origen y destino.", variant: "destructive" });
      return;
    }
    if (fromWarehouse === toWarehouse) {
      toast({ title: "Error", description: "El origen y destino no pueden ser iguales.", variant: "destructive" });
      return;
    }
    if (detectedProducts.length === 0) {
      toast({ title: "Vacío", description: "No hay productos para transferir.", variant: "destructive" });
      return;
    }

    setIsTransferring(true);

    try {
        // Como nuestra API de transferencias procesa UN producto a la vez (según lo que hicimos en transferController),
        // vamos a hacer un bucle para transferir todos los items.
        // (Idealmente el backend aceptaría un array, pero esto funciona con lo que ya tenés).
        
        const promises = detectedProducts.map(item => {
            return fetch('http://localhost:5000/api/transfers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: parseInt(item.id),
                    sourceWarehouseId: parseInt(fromWarehouse),
                    destinationWarehouseId: parseInt(toWarehouse),
                    quantity: item.quantity
                })
            }).then(async res => {
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || `Error al transferir ${item.name}`);
                }
                return res.json();
            });
        });

        await Promise.all(promises);

        toast({
            title: "Transferencia Exitosa",
            description: `Se generó el remito y se movió el stock correctamente.`,
        });

        // Limpiamos todo
        setDetectedProducts([]);
        setScannedImage(null);
        if (fileInputRef.current) fileInputRef.current.value = "";

    } catch (error: any) {
        console.error(error);
        toast({
            title: "Error en la transferencia",
            description: error.message,
            variant: "destructive"
        });
    } finally {
        setIsTransferring(false);
    }
  };

  // ... (Funciones de Cámara: Igual que en ProductScanner) ...
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, audio: false,
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch (error) {
      toast({ title: "Error de cámara", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (isCameraOpen && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraOpen, cameraStream]);

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        
        // Convertir a File
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], "transfer_capture.jpg", { type: "image/jpeg" });

        setScannedImage(dataUrl);
        closeCamera();
        processImage(file);
      }
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Transferencias entre Depósitos</h1>
          <p className="text-muted-foreground">Genera remitos de transferencia escaneando productos</p>
        </div>

        {/* Warehouse Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" /> Seleccionar Depósitos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="from-warehouse">Depósito Origen</Label>
                <Select value={fromWarehouse} onValueChange={setFromWarehouse}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar origen" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="to-warehouse">Depósito Destino</Label>
                <Select value={toWarehouse} onValueChange={setToWarehouse}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar destino" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.filter(w => w.id.toString() !== fromWarehouse).map((w) => (
                      <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Scanning */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" /> Escanear Productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!scannedImage ? (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <div className="space-y-4">
                  <div className="flex justify-center"><Upload className="h-12 w-12 text-muted-foreground" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">Sube una imagen o toma una foto</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button onClick={openCamera} className="flex items-center gap-2"><Camera className="h-4 w-4" /> Abrir Cámara</Button>
                      <div className="relative">
                        <Button variant="outline" className="flex items-center gap-2"><Upload className="h-4 w-4" /> Subir Imagen</Button>
                        <Input ref={fileInputRef} type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <img src={scannedImage} alt="Escaneo" className="max-w-md max-h-64 object-contain rounded-lg border" />
                </div>
                {isScanning && (
                  <div className="text-center py-4 flex justify-center gap-2 items-center text-primary font-medium">
                    <Loader2 className="h-4 w-4 animate-spin" /> Procesando imagen...
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detected Products */}
        {detectedProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" /> Productos a Transferir ({detectedProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {detectedProducts.map((product) => (
                  <div key={product.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <img src={product.image_url} alt={product.name} className="w-16 h-16 object-cover rounded" />
                    <div className="flex-1">
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => updateQuantity(product.id, -1)}><Minus className="h-4 w-4" /></Button>
                      <span className="w-12 text-center font-medium">{product.quantity}</span>
                      <Button variant="outline" size="sm" onClick={() => updateQuantity(product.id, 1)}><Plus className="h-4 w-4" /></Button>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => removeProduct(product.id)}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={generateTransferOrder} disabled={isTransferring} className="flex items-center gap-2">
                  {isTransferring ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  {isTransferring ? "Procesando..." : "Confirmar Transferencia"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Camera Modal */}
      <Dialog open={isCameraOpen} onOpenChange={closeCamera}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Capturar Foto</DialogTitle></DialogHeader>
          <div className="relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg" />
          </div>
          <div className="flex justify-center gap-3">
            <Button onClick={capturePhoto}><Camera className="mr-2 h-4 w-4"/> Capturar</Button>
            <Button variant="outline" onClick={closeCamera}>Cancelar</Button>
          </div>
        </DialogContent>
      </Dialog>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </Layout>
  );
}