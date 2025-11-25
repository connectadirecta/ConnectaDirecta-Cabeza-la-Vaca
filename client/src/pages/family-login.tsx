import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Trash2, Pencil } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Link, useRouter } from "wouter";
import { Footer } from "@/components/footer";

export default function FamilyLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [elderlyUserName, setElderlyUserName] = useState("");
  const { login } = useAuth();
  const { toast } = useToast();
  const router = useRouter(); // Import useRouter

  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null); // State to hold the selected municipality

  // Mock data for municipalities - replace with actual data fetching
  const municipalities = [
    { id: "1", name: "Municipio A" },
    { id: "2", name: "Municipio B" },
    { id: "3", name: "Municipio C" },
  ];

  const handleMunicipalitySelect = (municipalityName: string) => {
    setSelectedMunicipality(municipalityName);
    router.push("/select-user-type"); // Navigate to select-user-type
  };

  const handleDeleteMunicipality = async (municipalityId: string) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este municipio y toda su información?")) {
      if (window.confirm("Esta acción no se puede deshacer. ¿Estás absolutamente seguro?")) {
        try {
          await apiRequest("DELETE", `/api/municipalities/${municipalityId}`);
          toast({
            title: "Municipio eliminado",
            description: "Toda la información del municipio ha sido borrada.",
            variant: "success",
          });
          // Re-fetch or update list of municipalities
        } catch (error) {
          toast({
            title: "Error al eliminar",
            description: "No se pudo eliminar el municipio. Inténtalo de nuevo.",
            variant: "destructive",
          });
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isRegistering) {
      if (!firstName || !lastName || !username || !password || !elderlyUserName) {
        toast({
          title: "Campos requeridos",
          description: "Por favor complete todos los campos",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);
      try {
        const response = await apiRequest("POST", "/api/family/register", {
          firstName,
          lastName,
          username,
          password,
          elderlyUserName
        });
        const data = await response.json();

        // Set user state and redirect immediately without allowing router to render
        login(data.user);
        // Use href instead of replace to ensure immediate navigation
        window.location.href = "/dashboard";
      } catch (error) {
        toast({
          title: "Error de registro",
          description: "No se pudo crear la cuenta. Verifique que el nombre de usuario o nombre del anciano sea correcto.",
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

        if (data.user.role !== "family") {
          toast({
            title: "Acceso denegado",
            description: "Esta cuenta no tiene permisos de familiar",
            variant: "destructive",
          });
          return;
        }

        // Set user state and redirect immediately without allowing router to render
        login(data.user);
        // Use href instead of replace to ensure immediate navigation
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

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-border" data-testid="card-family-login">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4" data-testid="icon-family">
                <Users className="text-primary-foreground" size={24} />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Portal Familiar</h1>
              <p className="text-muted-foreground">Acceso para familiares y cuidadores</p>
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
                        placeholder="Ana"
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
                        placeholder="González"
                        disabled={isLoading}
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="elderlyUserName" className="block text-sm font-medium text-foreground mb-2">
                      Nombre de usuario del anciano
                    </Label>
                    <Input
                      id="elderlyUserName"
                      type="text"
                      value={elderlyUserName}
                      onChange={(e) => setElderlyUserName(e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="maria.gonzalez o María"
                      disabled={isLoading}
                      data-testid="input-elderly-user"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Puede usar el nombre de usuario (email) o el nombre de pila del anciano
                    </p>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
                  Correo electrónico
                </Label>
                <Input
                  id="username"
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="tu@email.com"
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
                className="text-primary hover:underline mb-4"
                onClick={() => setIsRegistering(!isRegistering)}
                data-testid="button-toggle-register"
              >
                {isRegistering ? (
                  <>← Volver al inicio de sesión</>
                ) : (
                  <><UserPlus size={16} className="mr-2" />¿Nuevo familiar? Crear cuenta</>
                )}
              </Button>

              <div className="flex justify-center">
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

// Component to display municipalities and handle selection/deletion
function MunicipalitySelection() {
  const [municipalities, setMunicipalities] = useState<Array<{ id: string; name: string }>>([
    { id: "1", name: "Municipio A" },
    { id: "2", name: "Municipio B" },
    { id: "3", name: "Municipio C" },
  ]);
  const { toast } = useToast();
  const router = useRouter();

  const handleSelectMunicipality = (municipalityName: string) => {
    router.push(`/select-user-type?municipality=${encodeURIComponent(municipalityName)}`);
  };

  const handleDeleteMunicipality = async (municipalityId: string) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este municipio y toda su información?")) {
      if (window.confirm("Esta acción no se puede deshacer. ¿Estás absolutamente seguro?")) {
        try {
          await apiRequest("DELETE", `/api/municipalities/${municipalityId}`);
          setMunicipalities(municipalities.filter(m => m.id !== municipalityId));
          toast({
            title: "Municipio eliminado",
            description: "Toda la información del municipio ha sido borrada.",
            variant: "success",
          });
        } catch (error) {
          toast({
            title: "Error al eliminar",
            description: "No se pudo eliminar el municipio. Inténtalo de nuevo.",
            variant: "destructive",
          });
        }
      }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Selecciona tu Municipio</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {municipalities.map((municipality) => (
          <Card key={municipality.id} className="relative cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="absolute top-2 right-2 flex space-x-2">
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleSelectMunicipality(municipality.name); }}>
                  <Pencil className="h-4 w-4 text-blue-500" />
                </Button>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteMunicipality(municipality.id); }}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
              <div onClick={() => handleSelectMunicipality(municipality.name)}>
                <h2 className="text-xl font-semibold mb-2 text-center">{municipality.name}</h2>
                <p className="text-muted-foreground text-center">Información del municipio...</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Footer />
    </div>
  );
}

// Placeholder for SelectUserType component - implement actual logic
function SelectUserType() {
  const router = useRouter();
  const [searchParams] = router.location.search.substring(1).split('&').reduce((params, param) => {
    const [key, value] = param.split('=');
    params[key] = decodeURIComponent(value);
    return params;
  }, {} as Record<string, string>);

  const municipalityName = searchParams.municipality || "Municipio Desconocido";

  const handleElderlyLogin = () => {
    router.push("/elderly-login"); // Navigate to elderly login
  };

  const handleProfessionalLogin = () => {
    router.push("/professional-login"); // Navigate to professional login
  };

  const handleFamilyLogin = () => {
    router.push("/family-login"); // Navigate to family login
  };

  const handleBackToSelection = () => {
    router.push("/select-user-type"); // Navigate back to select user type
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-muted/30 p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Bienvenido usuario de {municipalityName}</h1>
        <p className="text-muted-foreground">Por favor, selecciona tu tipo de usuario:</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl">
        <Button onClick={handleElderlyLogin} className="h-32 text-lg font-semibold bg-blue-500 hover:bg-blue-600">
          Usuario Mayor
        </Button>
        <Button onClick={handleProfessionalLogin} className="h-32 text-lg font-semibold bg-green-500 hover:bg-green-600">
          Profesional
        </Button>
        <Button onClick={handleFamilyLogin} className="h-32 text-lg font-semibold bg-yellow-500 hover:bg-yellow-600">
          Familiar
        </Button>
      </div>

      <div className="mt-8">
        <Button variant="outline" onClick={handleBackToSelection} data-testid="link-back-to-roles">
          ← Volver a Selección de Roles
        </Button>
      </div>
      <Footer />
    </div>
  );
}