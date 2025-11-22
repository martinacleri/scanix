import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus,
  Upload,
  X,
  Minus
} from "lucide-react";
import type { ProductUI, ProductFromAPI, PriceRule, PriceRuleFromAPI, mapProductFromApiToUI } from '@/types';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: () => void;
  productToEdit: ProductUI | null;
}

export default function AddProductModal({ isOpen, onClose, onProductAdded, productToEdit }: AddProductModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category_id: "",
    description: "",
    itemPrice: ""
  });
  const [priceRules, setPriceRules] = useState<PriceRule[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  // Determinamos si estamos en modo "Edición" o "Creación"
    // Si 'productToEdit' tiene un objeto, isEditing será true. Si es null, será false.
    const isEditing = !!productToEdit;
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);

    useEffect(() => {
    if (productToEdit) {
      // Si estamos editando, llenamos el formulario con los datos del producto
      setFormData({
        name: productToEdit.name,
        sku: productToEdit.sku,
        category_id: productToEdit.category_id?.toString() || "", 
        description: productToEdit.description || '',
        itemPrice: productToEdit.price.toString()
      });

      // Cargamos las reglas de precio existentes
      setPriceRules(productToEdit.priceRules || []);

      if (productToEdit.image_url) {
        setImagePreviews([productToEdit.image_url]);
      } else {
        setImagePreviews([]);
      }
      // Limpiamos cualquier archivo nuevo que haya quedado seleccionado
      setImageFiles([]);
    } else {
      // Si estamos agregando, nos aseguramos de que el formulario esté vacío
      resetForm();
    }
  }, [productToEdit, isOpen]); // Se ejecuta cuando cambia el producto o cuando se abre el modal

  useEffect(() => {
    const fetchCategories = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/categories');
            const data = await response.json();
            setCategories(data);
        } catch (error) {
            console.error("Error al cargar categorías", error);
        }
    };

    if (isOpen) {
        fetchCategories();
    }
}, [isOpen]); // Se ejecuta cada vez que el modal se abre

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddPriceRule = () => {
    setPriceRules(prev => [
      ...prev,
      { from: 0, to: 0, price: 0 }
    ]);
  };

  const handleRemovePriceRule = (index: number) => {
    setPriceRules(prev => prev.filter((_, i) => i !== index));
  };

  const handlePriceRuleChange = (index: number, field: keyof PriceRule, value: number) => {
    setPriceRules(prev => prev.map((rule, i) => 
      i === index ? { ...rule, [field]: value } : rule
    ));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
        const fileArray = Array.from(files);
        // Guardamos los archivos para el envío
        setImageFiles(fileArray);

        // Creamos URLs temporales para la vista previa
        const previewUrls = fileArray.map(file => URL.createObjectURL(file));
        setImagePreviews(previewUrls);
    }
};

  const handleRemoveImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));

    if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }};

  const handleSubmit = async () => {
    // Validaciones básicas
    if (!formData.name || !formData.sku || !formData.itemPrice) {
      toast({
        title: "Campos requeridos",
        description: "Debe completar los campos nombre, SKU y precio unitario",
        variant: "destructive"
      });
      return;
    }

    // Creamos el objeto FormData
    const dataToSend = new FormData();

    // Agregamos los campos de texto del formulario
    dataToSend.append('name', formData.name);
    dataToSend.append('sku', formData.sku);
    dataToSend.append('price', formData.itemPrice);
    dataToSend.append('description', formData.description);
    dataToSend.append('category_id', formData.category_id);

    // Convertimos el array de priceRules a un string JSON para enviarlo
    dataToSend.append('priceRules', JSON.stringify(priceRules));

    // Agregamos la imagen SOLO si el usuario seleccionó una nueva.
    // Si estamos editando y no se selecciona una nueva foto, no se envía ninguna
    // y el backend mantendrá la foto anterior.
    if (imageFiles.length > 0) {
        dataToSend.append('image', imageFiles[0]); // El nombre 'image' coincide con el del backend
    }

    // Nota: Ignoramos 'priceRules' por ahora, ya que el backend no los maneja todavía.

    // Hacemos la llamada a la API
    try {
        // Definimos la URL y el Método dinámicamente
        const apiUrl = isEditing
            ? `http://localhost:5000/api/products/${productToEdit.id}` // URL para actualizar
            : 'http://localhost:5000/api/products';                   // URL para crear

        const method = isEditing ? 'PUT' : 'POST';

        const response = await fetch(apiUrl, {
            method: method,
            body: dataToSend,
        });

        if (!response.ok) {
            // Si el servidor devuelve un error, lo mostramos
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ocurrió un error');
        }

        const savedProduct = await response.json();

        // Mostramos una notificación de éxito personalizada
        toast({
            title: isEditing ? "Producto actualizado" : "Producto agregado",
            description: `${savedProduct.name} se guardó exitosamente`,
        });

        onProductAdded(); // Refresca la lista en la pantalla de catálogo
        handleClose(); // Cierra y resetea el modal

    } catch (error: any) {
        console.error(error);
        toast({
            title: "Error",
            description: error.message || "No se pudo conectar con el servidor",
            variant: "destructive"
        });
    }
};

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      category_id: "",
      description: "",
      itemPrice: "",
    });
    setPriceRules([]);
    setImageFiles([]);
    setImagePreviews([]);
  };

  const handleClose = () => {
    setImageFiles([]);
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {isEditing ? 'Editar producto' : 'Agregar producto'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifica la información del producto' : 'Completa la información del nuevo producto'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Ingrese el nombre del producto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleInputChange("sku", e.target.value)}
                placeholder="Ingrese el SKU del producto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <select
                id="category"
                value={formData.category_id} // El valor seleccionado es el ID
                onChange={(e) => handleInputChange("category_id", e.target.value)} // Guardamos el ID en el estado
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground"
              >
                <option value="">Seleccionar categoría</option>
                {/* Mapeamos el estado 'categories' que viene de la API */}
                {categories.map(category => (
                  // Importante: el 'value' de la opción es el ID, 
                  // pero el texto que ve el usuario es el nombre.
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="itemPrice">Precio unitario</Label>
              <Input
                id="itemPrice"
                type="number"
                step="0.01"
                value={formData.itemPrice}
                onChange={(e) => handleInputChange("itemPrice", e.target.value)}
                placeholder="Ingrese el precio unitario del producto"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Ingrese una descripción para el producto"
              rows={3}
            />
          </div>

          {/* Price Rules */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Precios por volumen</Label>
              <Button variant="outline" size="sm" onClick={handleAddPriceRule}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>

            <div className="space-y-3">
              {priceRules.map((rule, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    <div>
                      <Label className="text-xs">Desde</Label>
                      <Input
                        type="number"
                        value={rule.from}
                        onChange={(e) => handlePriceRuleChange(index, "from", parseInt(e.target.value) || 0)}
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Hasta</Label>
                      <Input
                        type="number"
                        value={rule.to}
                        onChange={(e) => handlePriceRuleChange(index, "to", parseInt(e.target.value) || 0)}
                        placeholder="9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Precio</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={rule.price}
                        onChange={(e) => handlePriceRuleChange(index, "price", parseFloat(e.target.value) || 0)}
                        placeholder="8.50"
                      />
                    </div>
                  </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePriceRule(index)}
                      className="text-destructive"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Imágenes</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
                ref={fileInputRef}
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <div className="text-center">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Haz clic para subir imágenes
                  </p>
                </div>
              </label>
            </div>

            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mt-4">
                {imagePreviews.map((previewUrl, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={previewUrl}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-20 object-cover rounded border"
                    />
                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="flex-1">
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}