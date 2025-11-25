import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Shield, UserPlus, Trash2, Pencil, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Footer } from "@/components/footer";

export default function ProfessionalLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [municipalityName, setMunicipalityName] = useState(""); // Renamed to avoid conflict
  const { login } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleDeleteMunicipality = async (id: string) => {
    toast({
      title: "Confirmación necesaria",
      description: `¿Estás seguro de que deseas eliminar este municipio y toda su información asociada?`,
      action: (
        <Button
          variant="destructive"
          onClick={async () => {
            try {
              await apiRequest("DELETE", `/api/municipalities/${id}`);
              setMunicipalities(municipalities.filter((m: any) => m.id !== id));
              toast({
                title: "Municipio eliminado",
                description: "Toda la información asociada ha sido borrada.",
              });
            } catch (error) {
              toast({
                title: "Error al eliminar",
                description: "No se pudo eliminar el municipio.",
                variant: "destructive",
              });
            }
          }}
        >
          Eliminar
        </Button>
      ),
      duration: Infinity, // Keep the toast open until action is taken
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isRegistering) {
      if (!firstName || !lastName || !username || !password) {
        toast({
          title: "Campos requeridos",
          description: "Por favor complete todos los campos.",
          variant: "destructive",
        });
        return;
      }

      const municipalityId = localStorage.getItem("selectedMunicipality");
      if (!municipalityId) {
        toast({
          title: "Error",
          description: "No se ha seleccionado un municipio. Por favor, vuelva a la página principal.",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);
      try {
        const response = await apiRequest("POST", "/api/professional/register", {
          firstName,
          lastName,
          username,
          password,
          municipalityId,
        });
        const data = await response.json();

        login(data.user);
        window.location.href = "/dashboard";
      } catch (error) {
        toast({
          title: "Error de registro",
          description: "No se pudo crear la cuenta. Intente nuevamente.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!username || !password) {
        toast({
          title: "Campos requeridos",
          description: "Por favor complete todos los campos",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);
      try {
        const municipalityId = localStorage.getItem("selectedMunicipality");
        const response = await apiRequest("POST", "/api/auth/login", {
          username,
          password,
          municipalityId
        });
        const data = await response.json();

        if (data.user.role !== "professional") {
          toast({
            title: "Acceso denegado",
            description: "Esta cuenta no tiene permisos profesionales",
            variant: "destructive",
          });
          return;
        }

        login(data.user);
        window.location.href = "/dashboard";
      } catch (error) {
        const errorMessage = error?.message || "Credenciales incorrectas. Intente nuevamente.";
        toast({
          title: "Error de acceso",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBackToRoleSelection = () => {
    setLocation("/select-user-type");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-border" data-testid="card-professional-login">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4" data-testid="icon-professional">
                <Shield className="text-primary-foreground" size={24} />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Portal Profesional</h1>
              <p className="text-muted-foreground">Acceso para personal municipal y sanitario</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-login">
              {isRegistering && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-2">
                        Nombre
                      </Label>
                      <Input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-4 py-3 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Carlos"
                        disabled={isLoading}
                        data-testid="input-first-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-2">
                        Apellidos
                      </Label>
                      <Input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-4 py-3 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Martínez"
                        disabled={isLoading}
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
                  {isRegistering ? "Correo electrónico" : "Usuario"}
                </Label>
                <Input
                  id="username"
                  type={isRegistering ? "email" : "text"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={isRegistering ? "carlos@municipio.es" : "profesional1"}
                  disabled={isLoading}
                  data-testid="input-username"
                />
              </div>

              <div>
                <Label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="••••••••"
                  disabled={isLoading}
                  data-testid="input-password"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center" data-testid="checkbox-remember">
                  <Checkbox
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="w-4 h-4 text-primary border-border rounded focus:ring-ring"
                  />
                  <span className="ml-2 text-sm text-muted-foreground">Recordarme</span>
                </label>
                <a href="#" className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-lg transition-colors"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? (isRegistering ? "Registrando..." : "Verificando...") : (isRegistering ? "Crear Cuenta" : "Iniciar Sesión")}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                className="text-primary hover:underline"
                onClick={() => setIsRegistering(!isRegistering)}
                data-testid="button-toggle-register"
              >
                {isRegistering ? (
                  <>← Volver al inicio de sesión</>
                ) : (
                  <><UserPlus size={16} className="mr-2" />¿Nuevo profesional? Crear cuenta</>
                )}
              </Button>

              <div className="flex justify-center mt-4">
                <Link href="/select-user-type">
                  <Button variant="outline" size="sm" data-testid="link-back">
                    ← Volver a Selección de Roles
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
        <Footer />
      </div>
    </div>
  );
}