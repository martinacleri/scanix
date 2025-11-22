import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Camera, Eye, EyeOff, AlertTriangle } from "lucide-react";

interface WarehouseData { id: number; name: string; }

export default function RegisterForm() {
  // Nuevos estados
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    dni: "",
    password: "",
    warehouse_id: ""
  });
  
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetch('http://localhost:5000/api/warehouses')
      .then(res => res.json())
      .then(data => setWarehouses(data))
      .catch(err => console.error(err));
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!formData.warehouse_id) {
      setError("Selecciona un depósito.");
      return;
    }

    setIsLoading(true);
    
    try {
        const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...formData,
                warehouse_id: parseInt(formData.warehouse_id)
            })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Error al registrarse');

        toast({ title: "Registro exitoso", description: "Ya puedes iniciar sesión con tu DNI." });
        navigate("/login");

    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
              <Camera className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Alta de Operario</CardTitle>
          <CardDescription>Registrar nuevo personal en SCANIX</CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={formData.name} onChange={(e) => handleChange("name", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Apellido</Label>
                  <Input value={formData.surname} onChange={(e) => handleChange("surname", e.target.value)} required />
                </div>
            </div>

            <div className="space-y-2">
              <Label>DNI (Usuario)</Label>
              <Input type="number" placeholder="Sin puntos" value={formData.dni} onChange={(e) => handleChange("dni", e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Contraseña</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  required
                />
                <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Depósito Asignado</Label>
              <Select value={formData.warehouse_id} onValueChange={(val) => handleChange("warehouse_id", val)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar depósito..." /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Registrando..." : "Registrar Operario"}
            </Button>
            
            <div className="text-center text-sm text-muted-foreground mt-4">
                ¿Ya tenés cuenta? <Link to="/login" className="text-primary hover:underline">Iniciar Sesión</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}