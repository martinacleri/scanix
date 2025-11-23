import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Camera, 
  Upload, 
  Loader2, 
  Package, 
  Plus, 
  Minus, 
  X,
  ShoppingCart
} from "lucide-react";
import heroImage from "@/assets/hero-scanning.jpg";
import TicketModal from "@/components/modals/TicketModal";
import type { CartItem, ProductUI, ProductFromAPI } from '@/types';
import {mapProductFromApiToUI} from '@/types';

export default function ProductScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Si la cámara está abierta y tenemos una referencia al elemento de video...
    if (isCameraOpen && videoRef.current) {
      // ...le asignamos el stream.
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraOpen, cameraStream]);

const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validaciones de tipo y tamaño (sin cambios)
    const validTypes = ['image/jpeg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; 

    if (!validTypes.includes(file.type)) {
      toast({ title: "Error", description: "Solo archivos JPG y PNG", variant: "destructive" });
      return;
    }
    if (file.size > maxSize) {
      toast({ title: "Error", description: "Máximo 5MB", variant: "destructive" });
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      // --- CAMBIO AQUÍ: Pasamos el archivo real a la función ---
      processImage(file); 
    };
    reader.readAsDataURL(file);
  };

// --- CAMBIO: Ahora recibe el archivo como parámetro ---
  const processImage = async (file: File) => {
    setIsScanning(true);
    setCart([]);

    try {
      // 1. Preparamos el formulario con la imagen
      const formData = new FormData();
      formData.append('image', file); // 'image' debe coincidir con lo que espera Multer en el backend

      // 2. Llamamos al endpoint de RECONOCIMIENTO (ya no al de details)
      const response = await fetch('http://localhost:5000/api/recognize', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en el reconocimiento');
      }
      
      const dataFromApi: ProductFromAPI[] = await response.json();

      // 3. Transformamos los datos
      const formattedProducts = dataFromApi.map(mapProductFromApiToUI);
      
      setCart(formattedProducts.map(p => ({ ...p, quantity: 1 })));

      toast({
        title: "¡Productos identificados!",
        description: `La IA encontró ${formattedProducts.length} productos.`,
      });

    } catch (error: any) {
      console.error(error);
      toast({
        title: "La IA no pudo reconocer los productos",
        description: "Intentá sacar otra foto con mejor iluminación, desde otro ángulo o acercándote más.",
        variant: "destructive"
      });
      // Si falla, limpiamos la imagen seleccionada para que pueda intentar de nuevo
      setSelectedImage(null);
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddToCart = (productToAdd: ProductUI) => {
    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.id === productToAdd.id);
      if (existingItem) {
        // Si ya existe, incrementamos la cantidad
        return currentCart.map(item =>
          item.id === productToAdd.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // Si no existe, lo agregamos al carrito
        return [...currentCart, { ...productToAdd, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart(currentCart =>
      currentCart.map(item =>
        item.id === productId
          ? { ...item, quantity: item.quantity + change }
          : item
      ).filter(item => item.quantity > 0)
    );
  };

  const removeProduct = (productId: string) => {
    setCart(currentCart =>
      currentCart.filter(item => item.id !== productId)
    );
  };

  const getCurrentPrice = (product: ProductUI, quantity: number): number => {
    if (!product.priceRules || product.priceRules.length === 0) {
      return product.price;
    }
    const sortedRules = [...product.priceRules].sort((a, b) => b.from - a.from);
    const applicableRule = sortedRules.find(rule => quantity >= rule.from);
    return applicableRule ? applicableRule.price : product.price;
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => {
      // Usamos la función para obtener el precio correcto para la cantidad del carrito
      const correctPrice = getCurrentPrice(item, item.quantity);
      return total + (item.quantity * correctPrice);
    }, 0).toFixed(2);
  };

  const handleGenerateOrder = () => {
    if (cart.length === 0) {
      toast({
        title: "No hay productos",
        description: "Subí una foto para detectar productos primero",
        variant: "destructive"
      });
      return;
    }
    setIsTicketModalOpen(true);
  };

  const handleOrderGenerated = () => {
    // Limpiar el scanner después de generar el pedido
    setCart([]);
    setSelectedImage(null);
    
    toast({
      title: "¡Pedido generado!",
      description: "El pedido se ha procesado correctamente",
    });
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Usar cámara trasera en móviles
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setCameraStream(stream);
      setIsCameraOpen(true);

    } catch (error) {
      toast({
        title: "Error al acceder a la cámara",
        description: "Asegúrate de dar permisos de cámara al navegador",
        variant: "destructive"
      });
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

const capturePhoto = async () => { // <-- Agregamos async aquí
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Configurar dimensiones
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Dibujar la foto en el canvas
    ctx.drawImage(video, 0, 0);
    
    // Obtener la imagen en formato base64 para la vista previa
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    // --- LA SOLUCIÓN: Convertir ese base64 a un objeto File real ---
    const res = await fetch(photoDataUrl);
    const blob = await res.blob();
    const file = new File([blob], "captura_camara.jpg", { type: "image/jpeg" });
    // -------------------------------------------------------------
    
    closeCamera();
    setSelectedImage(photoDataUrl);
    
    // Ahora sí llamamos a la función pasándole el archivo que creamos
    processImage(file); 
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="overflow-hidden">
        <div className="relative h-48 bg-gradient-to-r from-primary/10 to-primary/5">
          <img 
            src={heroImage} 
            alt="Scanning Interface" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Package className="h-16 w-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Escaneador de productos
              </h2>
              <p className="text-muted-foreground">
                Identificá productos automáticamente con Inteligencia Artificial
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Scanning Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Cargar productos</CardTitle>
          <CardDescription>
            Sacá una foto o subí una imagen para armar el pedido automáticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              size="lg"
              className="h-24 flex-col gap-2"
              onClick={openCamera}
              disabled={isScanning}
            >
              <Camera className="h-8 w-8" />
              Sacar foto
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="h-24 flex-col gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
            >
              <Upload className="h-8 w-8" />
              Subir foto
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileUpload}
            className="hidden"
          />

          {selectedImage && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Foto:</p>
              <img
                src={selectedImage}
                alt="Selected"
                className="max-w-xs h-32 object-cover rounded-lg border"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing State */}
      {isScanning && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
              <h3 className="text-lg font-semibold">Procesando imagen...</h3>
              <p className="text-muted-foreground">
                La IA está identificando los productos
              </p>
              <Progress value={75} className="w-full max-w-sm mx-auto" />
            </div>
          </CardContent>
        </Card>
      )}

{/* Current Order View */}
    {!isScanning && cart.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle>Pedido actual</CardTitle>
          <CardDescription>{cart.length} productos en el pedido</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cart.map((product) => (
                <Card key={product.id} className="p-3">
                  <div className="flex items-center gap-4">
                    <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded-md bg-muted"/>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{product.name}</h4>
                      <p className="text-xs text-muted-foreground">${getCurrentPrice(product, product.quantity).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(product.id, -1)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{product.quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(product.id, 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeProduct(product.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              <div className="flex flex-col items-end pt-4 border-t">
                <div className="font-bold text-lg mb-4">
                  Total: ${getTotalAmount()}
                </div>
                <Button size="lg" className="gap-2 w-full md:w-auto" onClick={handleGenerateOrder}>
                  <ShoppingCart className="h-5 w-5" />
                  Generar pedido
                </Button>
              </div>
          </div>
        </CardContent>
      </Card>
)}

      {/* Camera Modal */}
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

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Modals */}
      <TicketModal
        isOpen={isTicketModalOpen}
        onClose={() => {
          setIsTicketModalOpen(false)
          setCart([]);
          setSelectedImage(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }}
        products={cart}
      />
    </div>
  );
}