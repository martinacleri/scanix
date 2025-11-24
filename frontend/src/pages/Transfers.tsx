import { useState, useRef, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Camera, Upload, ArrowRight, Package, FileText, X, Plus, Minus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ProductUI, ProductFromAPI, CartItem } from '@/types';
import { mapProductFromApiToUI } from '@/types';
import TransferModal from "@/components/modals/TransferModal";

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
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const { toast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

const getUserWarehouseId = (): string | null => {
  const userDataString = localStorage.getItem("scanix_user");
  if (!userDataString) return null;
  
  try {
    const userData = JSON.parse(userDataString);
    return userData.warehouseId?.toString() || null;
  } catch (error) {
    console.error("Error al leer datos del usuario:", error);
    return null;
  }
};

  // 1. Cargar Depósitos al iniciar
useEffect(() => {
  const fetchWarehouses = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/warehouses');
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data);
        
        // Pre-seleccionar el depósito del usuario logueado
        const userWarehouseId = getUserWarehouseId();
        if (userWarehouseId) {
          setFromWarehouse(userWarehouseId);
        }
      }
    } catch (error) {
      console.error("Error cargando depósitos:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los depósitos",
        variant: "destructive"
      });
    }
  };
  fetchWarehouses();
}, []);

  // 2. Lógica de Procesamiento de Imagen (Igual a ProductScanner)
const processImage = async (file: File) => {
  if (!fromWarehouse || !toWarehouse) {
    toast({
      title: "Faltan depósitos",
      description: "Selecciona el depósito de origen y destino antes de escanear",
      variant: "destructive"
    });
    return;
  }

  setIsScanning(true);
  setDetectedProducts([]);

  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('http://localhost:5000/api/recognize', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error en el reconocimiento');
    }
    
    const dataFromApi: ProductFromAPI[] = await response.json();
    
    // ✅ NUEVO: Obtenemos el stock de cada producto en el depósito de origen
    const productsWithStock = await Promise.all(
      dataFromApi.map(async (product) => {
        try {
          const stockResponse = await fetch(
            `http://localhost:5000/api/products/details?warehouseId=${fromWarehouse}`
          );
          
          if (stockResponse.ok) {
            const stockData: ProductFromAPI[] = await stockResponse.json();
            const productWithStock = stockData.find(p => p.id === product.id);
            
            if (productWithStock) {
              return mapProductFromApiToUI(productWithStock);
            }
          }
          
          // Si no encontramos el stock, usamos 0
          const mapped = mapProductFromApiToUI(product);
          return { ...mapped, stock: 0 };
        } catch (error) {
          console.error(`Error obteniendo stock de producto ${product.id}:`, error);
          const mapped = mapProductFromApiToUI(product);
          return { ...mapped, stock: 0 };
        }
      })
    );

    const itemsWithQuantity: CartItem[] = productsWithStock.map(p => ({ 
      ...p, 
      quantity: 1 
    }));
    
    setDetectedProducts(itemsWithQuantity);
    
    toast({
      title: "Productos detectados",
      description: `Se encontraron ${itemsWithQuantity.length} productos.`,
    });

  } catch (error: any) {
    console.error(error);
    toast({
      title: "No se reconoció nada",
      description: "Intentá con otra imagen o carga los productos manualmente.",
      variant: "destructive"
    });
    setScannedImage(null); // Limpiar la imagen para poder intentar de nuevo
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Resetear el input file
    }
  } finally {
    setIsScanning(false);
  }
};

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
  
    // Validar antes de procesar
    if (!fromWarehouse || !toWarehouse) {
      toast({
        title: "Faltan depósitos",
        description: "Selecciona el depósito de origen y destino antes de subir una imagen",
        variant: "destructive"
      });
      event.target.value = ""; // Resetear el input
      return;
    }

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
    products.map(p => {
      if (p.id === id) {
        const newQuantity = p.quantity + change;
        
        // Validar que no exceda el stock disponible
        if (newQuantity > p.stock) {
          toast({
            title: "Stock insuficiente",
            description: `Solo hay ${p.stock} unidades disponibles en el depósito de origen`,
            variant: "destructive"
          });
          return p;
        }
        
        // Validar mínimo de 1
        if (newQuantity < 1) {
          return p;
        }
        
        return { ...p, quantity: newQuantity };
      }
      return p;
    })
  );
};

  const removeProduct = (id: string) => {
    setDetectedProducts(products => products.filter(p => p.id !== id));
  };

  // 3. Generar la Transferencia (Remito)
const generateTransferOrder = async () => {
  // Validaciones básicas
  if (!fromWarehouse || !toWarehouse) {
    toast({ 
      title: "Faltan datos", 
      description: "Selecciona depósito de origen y destino.", 
      variant: "destructive" 
    });
    return;
  }
  
  if (fromWarehouse === toWarehouse) {
    toast({ 
      title: "Error", 
      description: "El origen y destino no pueden ser iguales.", 
      variant: "destructive" 
    });
    return;
  }
  
  if (detectedProducts.length === 0) {
    toast({ 
      title: "Vacío", 
      description: "No hay productos para transferir.", 
      variant: "destructive" 
    });
    return;
  }

  // ✅ NUEVO: Validar que no se exceda el stock disponible
  const invalidProducts = detectedProducts.filter(p => p.quantity > p.stock);
  if (invalidProducts.length > 0) {
    const productNames = invalidProducts.map(p => p.name).join(', ');
    toast({
      title: "Stock insuficiente",
      description: `Los siguientes productos exceden el stock disponible: ${productNames}`,
      variant: "destructive"
    });
    return;
  }

  setIsTransferring(true);

  try {
    const results = [];
    const errors = [];

    // Procesamos cada producto
    for (const item of detectedProducts) {
      try {
        const response = await fetch('http://localhost:5000/api/transfers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: parseInt(item.id),
            sourceWarehouseId: parseInt(fromWarehouse),
            destinationWarehouseId: parseInt(toWarehouse),
            quantity: item.quantity
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || `Error al transferir ${item.name}`);
        }

        const result = await response.json();
        results.push({ product: item.name, success: true });
      } catch (error: any) {
        errors.push({ product: item.name, error: error.message });
      }
    }

    // Mostrar resultados
    if (errors.length === 0) {
      toast({
        title: "Transferencia exitosa",
        description: `Se transfirieron ${results.length} productos correctamente.`,
      });
      
    } else {
      // Algunas transferencias fallaron
      toast({
        title: "Transferencia parcial",
        description: `${results.length} productos transferidos, ${errors.length} fallaron. Revisa los detalles.`,
        variant: "destructive"
      });
      console.error("Errores en transferencia:", errors);
    }

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
    // Validación de depósitos (la que agregamos antes)
    if (!fromWarehouse || !toWarehouse) {
      toast({
        title: "Faltan depósitos",
        description: "Por favor, seleccioná origen y destino antes de abrir la cámara.",
        variant: "destructive"
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Prioriza cámara trasera en móviles
          width: { ideal: 1920 },    // Intenta HD
          height: { ideal: 1080 }
        }
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
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Configurar dimensiones exactas del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Dibujar la foto
    ctx.drawImage(video, 0, 0);
    
    // Obtener imagen base64
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    // Convertir a File real (Igual que en ProductScanner)
    const res = await fetch(photoDataUrl);
    const blob = await res.blob();
    const file = new File([blob], "transfer_capture.jpg", { type: "image/jpeg" });

    setScannedImage(photoDataUrl); // Mostramos preview
    closeCamera(); // Cerramos modal
    processImage(file); // Procesamos
  };

  const mappedProductsForModal = detectedProducts.map(p => ({
  barcode: p.sku,   
  title: p.name,
  quantity: p.quantity
  }));

  const handleUploadClick = () => {
  if (!fromWarehouse || !toWarehouse) {
    toast({
      title: "Faltan depósitos",
      description: "Por favor, seleccioná los depósitos origen y destino antes de subir una imagen.",
      variant: "destructive"
    });
    return;
  }
  // Si pasó la validación, abrir el selector de archivos
  fileInputRef.current?.click();
};

// Función para limpiar todo SOLO cuando terminamos
  const clearScannerData = () => {
    setDetectedProducts([]);
    setScannedImage(null);
    setToWarehouse("");   // Opcional: si querés que resetee el destino
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transferencia entre depósitos</h1>
          <p className="text-muted-foreground">
            Generá remitos de transferencia escaneando productos
          </p>
        </div>

        {/* Warehouse Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" /> Seleccionar depósitos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="from-warehouse">Depósito origen</Label>
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
                <Label htmlFor="to-warehouse">Depósito destino</Label>
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
            <CardTitle className="flex items-center gap-2">Cargar productos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* 1. Botones SIEMPRE visibles (sin condición) */}
            {/* Botones Grandes Estilo ProductScanner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                size="lg"
                onClick={openCamera} 
                className="h-24 flex-col gap-2 w-full"
                disabled={isScanning}
              >
                <Camera className="h-8 w-8" /> 
                Sacar foto
              </Button>
              
              <Button 
                size="lg"
                variant="outline" 
                onClick={handleUploadClick} 
                className="h-24 flex-col gap-2 w-full cursor-pointer"
                disabled={isScanning}
              >
                <Upload className="h-8 w-8" /> 
                Subir foto
              </Button>

              <Input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload} 
              />
            </div>

            {/* 2. Miniatura de la foto (Igual a ProductScanner: max-w-xs h-32) */}
            {scannedImage && (
              <div className="mt-4 flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <p className="text-sm font-medium mb-2 self-center">Foto:</p>
                <img 
                  src={scannedImage} 
                  alt="Escaneo" 
                  className="max-w-xs h-32 object-cover rounded-lg border shadow-sm" 
                />
              </div>
            )}

          </CardContent>
        </Card>

        {/* Loading State (Estilo ProductScanner) */}
        {isScanning && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
                <h3 className="text-lg font-semibold">Procesando imagen...</h3>
                <p className="text-muted-foreground">
                  La IA está identificando los productos
                </p>
                {/* Barra de progreso simulada al 75% como en Scanner */}
                <Progress value={75} className="w-full max-w-sm mx-auto" />
              </div>
            </CardContent>
          </Card>
        )}

{/* Detected Products (Estilo ProductScanner) */}
        {detectedProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Transferencia actual</CardTitle>
              <CardDescription>{detectedProducts.length} productos a transferir</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {detectedProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden border-muted-foreground/20">
                    <div className="p-3 flex items-center gap-4">
                      {/* Imagen pequeña tipo thumbnail */}
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="w-12 h-12 object-cover rounded-md bg-muted" 
                      />
                      
                      {/* Info del producto (Sin stock visible, solo SKU y nombre) */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{product.name}</h4>
                        <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                      </div>
                      
                      {/* Controles de cantidad (Botones cuadrados pequeños) */}
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={() => updateQuantity(product.id, -1)}
                          disabled={product.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        
                        <span className="w-8 text-center font-medium text-sm">{product.quantity}</span>
                        
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={() => updateQuantity(product.id, 1)}
                          /* El botón se deshabilita si llega al tope, pero no mostramos el texto */
                          disabled={product.quantity >= product.stock}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-destructive ml-1" 
                          onClick={() => removeProduct(product.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Botón de Acción Final */}
                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={() => setIsTransferModalOpen(true)}
                    disabled={isTransferring}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Generar transferencia
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Camera Modal (Estilo ProductScanner) */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Sacar foto</h3>
              <Button variant="ghost" size="sm" onClick={closeCamera}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="relative bg-muted rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-video object-cover rounded-lg bg-black"
                />
              </div>
              
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={closeCamera}>
                  Cancelar
                </Button>
                <Button onClick={capturePhoto}>
                  <Camera className="h-4 w-4 mr-2" />
                  Sacar foto
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <TransferModal
        open={isTransferModalOpen}
        onClose={(isSuccess) => {
          setIsTransferModalOpen(false); // Siempre cerramos el modal
          if (isSuccess) {
            clearScannerData(); // Solo limpiamos si la transferencia fue exitosa
          }
        }}
        onConfirm={async () => {
          await generateTransferOrder();
        }}
        origin={warehouses.find(w => w.id.toString() === fromWarehouse)?.name || ""}
        destination={warehouses.find(w => w.id.toString() === toWarehouse)?.name || ""}
        products={mappedProductsForModal}
      />
    </Layout>
  );
}