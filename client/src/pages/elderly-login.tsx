import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User, ArrowLeft, Users, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Footer } from "@/components/footer";

type UserType = "elderly" | "family" | "professional" | null;

export default function ElderlyLogin() {
  const [location, setLocation] = useLocation();
  // Fix: use window.location.search to get query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const step = searchParams.get('step');

  console.log('[ElderlyLogin] Component rendered with:', { location, windowSearch: window.location.search, step });

  // If step=name, go directly to elderly name input, otherwise show role selection
  const initialUserType = step === 'name' ? 'elderly' : null;
  console.log('[ElderlyLogin] Initial userType:', initialUserType);
  
  const [userType, setUserType] = useState<UserType>(initialUserType);
  const [userName, setUserName] = useState("");
  const [pin, setPin] = useState("");
  const [showPinInput, setShowPinInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  console.log('[ElderlyLogin] Current state:', { userType, userName, showPinInput, step });

  const addDigit = (digit: string) => {
    if (pin.length < 4) {
      setPin(pin + digit);
    }
  };

  const removeDigit = () => {
    setPin(pin.slice(0, -1));
  };

  const handleUserTypeSelection = (type: UserType) => {
    if (type === "elderly") {
      // For elderly users, we need a name first, then PIN
      setUserType(type);
      setShowPinInput(false);
    } else {
      // For family and professional, redirect immediately without setting state
      window.location.href = type === "family" ? "/family-login" : "/professional";
    }
  };

  const handleNameSubmit = () => {
    if (!userName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Por favor ingrese su nombre",
        variant: "destructive",
      });
      return;
    }
    setShowPinInput(true);
  };

  const handleLogin = async () => {
    if (pin.length !== 4) {
      toast({
        title: "PIN incompleto",
        description: "Por favor ingrese los 4 dígitos de su PIN",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const municipalityId = localStorage.getItem("selectedMunicipality");
      const response = await apiRequest("POST", "/api/auth/login-pin", { 
        pin, 
        username: userName.trim(),
        municipalityId
      });
      const data = await response.json();

      login(data.user);
      toast({
        title: `¡Bienvenido/a ${userName}!`,
        description: "Acceso correcto",
      });
    } catch (error) {
      const errorMessage = error?.message || "PIN incorrecto. Por favor intente nuevamente.";
      toast({
        title: "Error de acceso",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // User type selection screen - only show if userType is null AND step is not 'name'
  console.log('[ElderlyLogin] Checking role selection condition:', { userType, step, showRoleSelection: !userType && step !== 'name' });
  
  if (!userType && step !== 'name') {
    console.log('[ElderlyLogin] Rendering role selection panel');
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md flex-1 flex items-center justify-center">
          <Card className="shadow-lg border-border" data-testid="card-user-type-selection">
            <CardContent className="pt-8 pb-8 px-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-4">¿Quién eres?</h1>
                <p className="text-muted-foreground">Selecciona tu tipo de usuario</p>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={() => handleUserTypeSelection("elderly")}
                  className="w-full p-6 h-auto bg-blue-500 hover:bg-blue-600 text-white"
                  data-testid="button-elderly"
                >
                  <div className="flex flex-col items-center space-y-2">
                    <User size={32} />
                    <span className="text-xl font-bold">Persona Mayor</span>
                    <span className="text-sm opacity-90">Acceso con PIN</span>
                  </div>
                </Button>

                <Button
                  onClick={() => handleUserTypeSelection("family")}
                  className="w-full p-6 h-auto bg-green-500 hover:bg-green-600 text-white"
                  data-testid="button-family"
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Users size={32} />
                    <span className="text-xl font-bold">Familiar</span>
                    <span className="text-sm opacity-90">Acceso con usuario y contraseña</span>
                  </div>
                </Button>

                <Button
                  onClick={() => handleUserTypeSelection("professional")}
                  className="w-full p-6 h-auto bg-purple-500 hover:bg-purple-600 text-white"
                  data-testid="button-professional"
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Shield size={32} />
                    <span className="text-xl font-bold">Personal</span>
                    <span className="text-sm opacity-90">Acceso profesional</span>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // Name input for elderly users
  console.log('[ElderlyLogin] Checking name input condition:', { userType, showPinInput, showNameInput: userType === "elderly" && !showPinInput });
  
  if (userType === "elderly" && !showPinInput) {
    console.log('[ElderlyLogin] Rendering name input screen');
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md flex-1 flex items-center justify-center">
          <Card className="shadow-lg border-border" data-testid="card-name-input">
            <CardContent className="pt-8 pb-8 px-8">
              <div className="text-center mb-8">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setUserType(null);
                    setUserName("");
                    setLocation("/select-user-type");
                  }}
                  className="mb-4"
                  data-testid="button-back-to-selection"
                >
                  <ArrowLeft size={20} className="mr-2" /> Volver
                </Button>
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="text-primary-foreground" size={32} />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">¡Hola!</h1>
                <p className="elderly-text text-muted-foreground">¿Cuál es tu nombre?</p>
              </div>

              <div className="space-y-6">
                <Input
                  type="text"
                  placeholder="Escribe tu nombre"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-6 py-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-primary text-center"
                  data-testid="input-name"
                />

                <Button
                  onClick={handleNameSubmit}
                  className="w-full elderly-button bg-primary hover:bg-primary/90 text-primary-foreground py-4 text-xl"
                  disabled={!userName.trim()}
                  data-testid="button-continue"
                >
                  Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // PIN input screen (existing code with modifications)
  console.log('[ElderlyLogin] Rendering PIN input screen');
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md flex-1 flex items-center justify-center">
        <Card className="shadow-lg border-border" data-testid="card-elderly-login">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="text-center mb-8">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowPinInput(false);
                  setLocation("/select-user-type"); // Navigate back to select-user-type
                }}
                className="mb-4"
                data-testid="button-back-to-name"
              >
                <ArrowLeft size={20} className="mr-2" /> Volver
              </Button>
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4" data-testid="icon-user">
                <User className="text-primary-foreground" size={32} />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Bienvenido/a {userName}</h1>
              <p className="elderly-text text-muted-<bos>">Ingrese su PIN para acceder</p>
            </div>

            <div className="mb-6">
              <div className="flex justify-center mb-6" data-testid="pin-display">
                <div className="flex space-x-2">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className={`pin-dot ${index < pin.length ? 'filled' : 'empty'}`}
                      data-testid={`pin-dot-${index}`}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4" data-testid="keypad">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <Button
                    key={digit}
                    className="elderly-button bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                    onClick={() => addDigit(digit.toString())}
                    disabled={isLoading}
                    data-testid={`button-digit-${digit}`}
                  >
                    {digit}
                  </Button>
                ))}

                <Button
                  className="elderly-button bg-muted hover:bg-muted/80 text-muted-foreground"
                  onClick={removeDigit}
                  disabled={isLoading || pin.length === 0}
                  data-testid="button-backspace"
                >
                  <ArrowLeft size={24} />
                </Button>

                <Button
                  className="elderly-button bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                  onClick={() => addDigit("0")}
                  disabled={isLoading}
                  data-testid="button-digit-0"
                >
                  0
                </Button>

                <Button
                  className="elderly-button bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={handleLogin}
                  disabled={isLoading || pin.length !== 4}
                  data-testid="button-enter"
                >
                  ✓
                </Button>
              </div>
            </div>

            <Button
              className="w-full elderly-button bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleLogin}
              disabled={isLoading || pin.length !== 4}
              data-testid="button-login"
            >
              {isLoading ? "Verificando..." : "Acceder"}
            </Button>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}