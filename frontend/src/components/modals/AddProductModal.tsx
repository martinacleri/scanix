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
import type { ProductUI, PriceRule } from '@/types';

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
  const isEditing = !!productToEdit;
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        name: productToEdit.name,
        sku: productToEdit.sku,
        category_id: productToEdit.category_id?.toString() || "", 
        description: productToEdit.description || '',
        itemPrice: productToEdit.price.toString()
      });

      // ✅ ARREGLADO: Cargamos las reglas correctamente, manteniendo null cuando corresponde
      setPriceRules(productToEdit.priceRules || []);

      if (productToEdit.image_url) {
        setImagePreviews([productToEdit.image_url]);
      } else {
        setImagePreviews([]);
      }
      setImageFiles([]);
    } else {
      resetForm();
    }
  }, [productToEdit, isOpen]);

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
  }, [isOpen]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddPriceRule = () => {
    setPriceRules(prev => [
      ...prev,
      { from: 1, to: null, price: 0 } // ✅ Por defecto, "hasta" es null (infinito)
    ]);
  };

  const handleRemovePriceRule = (index: number) => {
    setPriceRules(prev => prev.filter((_, i) => i !== index));
  };

  // ✅ MEJORADO: Manejo correcto de null para "infinito"
  const handlePriceRuleChange = (index: number, field: keyof PriceRule, value: string) => {
    setPriceRules(prev => prev.map((rule, i) => {
      if (i !== index) return rule;

      if (field === 'from') {
        const numValue = parseInt(value) || 0;
        return { ...rule, from: numValue };
      }
      
      if (field === 'to') {
        // Si el campo está vacío, guardamos null (infinito)
        const numValue = value === '' ? null : (parseInt(value) || null);
        return { ...rule, to: numValue };
      }
      
      if (field === 'price') {
        const numValue = parseFloat(value) || 0;
        return { ...rule, price: numValue };
      }

      return rule;
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      setImageFiles(fileArray);

      const previewUrls = fileArray.map(file => URL.createObjectURL(file));
      setImagePreviews(previewUrls);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ✅ NUEVA: Validación de rangos
  const validatePriceRules = (): boolean => {
    if (priceRules.length === 0) return true;

    // Ordenamos por "from" para validar
    const sorted = [...priceRules].sort((a, b) => a.from - b.from);

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      
      // Validar que "desde" sea válido
      if (current.from <= 0) {
        toast({
          title: "Error en rangos",
          description: `El rango ${i + 1} tiene un valor "desde" inválido`,
          variant: "destructive"
        });
        return false;
      }

      // Validar que si hay "hasta", sea mayor que "desde"
      if (current.to !== null && current.to <= current.from) {
        toast({
          title: "Error en rangos",
          description: `En el rango ${i + 1}, el valor "hasta" debe ser mayor que "desde"`,
          variant: "destructive"
        });
        return false;
      }

      // Validar que el precio sea válido
      if (current.price <= 0) {
        toast({
          title: "Error en rangos",
          description: `El rango ${i + 1} tiene un precio inválido`,
          variant: "destructive"
        });
        return false;
      }

      // Validar que no se superpongan los rangos
      if (i > 0) {
        const previous = sorted[i - 1];
        if (previous.to !== null && current.from <= previous.to) {
          toast({
            title: "Rangos superpuestos",
            description: `Los rangos ${i} y ${i + 1} se superponen`,
            variant: "destructive"
          });
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.sku || !formData.itemPrice) {
      toast({
        title: "Campos requeridos",
        description: "Debe completar los campos nombre, SKU y precio unitario",
        variant: "destructive"
      });
      return;
    }

    // ✅ NUEVO: Validamos los rangos antes de enviar
    if (!validatePriceRules()) {
      return;
    }

    const dataToSend = new FormData();
    dataToSend.append('name', formData.name);
    dataToSend.append('sku', formData.sku);
    dataToSend.append('price', formData.itemPrice);
    dataToSend.append('description', formData.description);
    dataToSend.append('category_id', formData.category_id);
    dataToSend.append('priceRules', JSON.stringify(priceRules));

    if (imageFiles.length > 0) {
      dataToSend.append('image', imageFiles[0]);
    }

    try {
      const apiUrl = isEditing
        ? `http://localhost:5000/api/products/${productToEdit.id}`
        : 'http://localhost:5000/api/products';

      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(apiUrl, {
        method: method,
        body: dataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ocurrió un error');
      }

      const savedProduct = await response.json();

      toast({
        title: isEditing ? "Producto actualizado" : "Producto agregado",
        description: `${savedProduct.name} se guardó exitosamente`,
      });

      onProductAdded();
      handleClose();

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
            {isEditing ? 'Modificá la información del producto' : 'Completá la información del nuevo producto'}
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
                value={formData.category_id}
                onChange={(e) => handleInputChange("category_id", e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground"
              >
                <option value="">Seleccionar categoría</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="itemPrice">Precio unitario ($)</Label>
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

          {/* Price Rules - MEJORADO */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Precios por volumen</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  💡 Dejá "hasta" vacío para indicar sin límite superior
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddPriceRule} className="gap-1">
                <Plus className="h-4 w-4" />
                Agregar rango
              </Button>
            </div>

            {priceRules.length === 0 ? (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  No hay precios por volumen configurados
                </p>
                <p className="text-xs text-muted-foreground">
                  Se aplicará el precio unitario (${formData.itemPrice || '0.00'}) a todas las cantidades
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {priceRules.map((rule, index) => (
                  <div key={index} className="group relative">
                    <div className="flex items-start gap-3 p-4 border rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-150 transition-all">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm flex-shrink-0 mt-6">
                        {index + 1}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 flex-1">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Desde (unidades)</Label>
                          <Input
                            type="number"
                            value={rule.from}
                            onChange={(e) => handlePriceRuleChange(index, "from", e.target.value)}
                            placeholder="1"
                            min="1"
                            className="h-9"
                          />
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">
                            Hasta (unidades)
                          </Label>
                          <Input
                            type="number"
                            value={rule.to ?? ''}
                            onChange={(e) => handlePriceRuleChange(index, "to", e.target.value)}
                            placeholder="Sin límite"
                            min={rule.from + 1}
                            className="h-9"
                          />
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Precio unitario ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={rule.price}
                            onChange={(e) => handlePriceRuleChange(index, "price", e.target.value)}
                            placeholder="0.00"
                            min="0.01"
                            className="h-9 font-semibold"
                          />
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePriceRule(index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-6 h-9 w-9"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Imagen</Label>
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
                    {isEditing ? 'Editar imagen' : 'Subir imagen'}
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
              {isEditing ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}