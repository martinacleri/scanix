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

interface WarehouseData {
  id: number;
  name: string;
}

export default function LoginForm() {
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Cargar los depósitos al iniciar
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
        setError("No se pudo conectar con el servidor.");
      }
    };
    fetchWarehouses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!selectedWarehouse) {
      setError("Por favor, selecciona el depósito donde vas a trabajar.");
      return;
    }

    setIsLoading(true);
    
    try {
        // LLAMADA REAL A LA API DE LOGIN
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                dni, 
                password 
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error al iniciar sesión');
        }

        // Verificamos el depósito (Opcional: aquí podrías validar si el usuario pertenece al depósito elegido)
        const warehouseObj = warehouses.find(w => w.id.toString() === selectedWarehouse);

        // Guardamos los datos del usuario en localStorage
        const userData = {
          name: data.name,
          surname: data.surname,
          dni: data.dni,
          role: "Operario",
          warehouseId: parseInt(selectedWarehouse),
          warehouseName: warehouseObj?.name,
          loginTime: new Date().toISOString()
        };
        
        localStorage.setItem("scanix_user", JSON.stringify(userData));

        toast({
          title: "Inicio de sesión exitoso",
          description: `Bienvenido/a, ${data.name} ${data.surname}`,
        });
        
        navigate("/");

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
          <CardTitle className="text-2xl font-bold">SCANIX</CardTitle>
          <CardDescription>
            Sistema de reconocimiento de productos
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="dni">DNI (Usuario)</Label>
              <Input
                id="dni"
                type="text"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="Ingrese su DNI"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese su contraseña"
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Depósito de Trabajo</Label>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar depósito..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id.toString()}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>

            {/* Enlace a Registro */}
            <div className="text-center text-sm text-muted-foreground mt-4">
                ¿No tienes una cuenta? <Link to="/register" className="text-primary hover:underline">Regístrate aquí</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}