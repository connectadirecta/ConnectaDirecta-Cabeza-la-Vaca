
import { Button } from "@/components/ui/button";
import { Users, Heart, Shield } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Footer } from "@/components/footer";

export default function UserTypeSelector() {
  const [, setLocation] = useLocation();
  const selectedMunicipalityId = "cabeza-la-vaca";

  useEffect(() => {
    // Ensure municipality is set
    localStorage.setItem("selectedMunicipality", selectedMunicipalityId);
  }, []);

  const { data: municipality } = useQuery({
    queryKey: ["/api/municipalities", selectedMunicipalityId],
    queryFn: async () => {
      if (!selectedMunicipalityId) return null;
      const response = await apiRequest("GET", `/api/municipalities/${selectedMunicipalityId}`);
      return response.json();
    },
    enabled: !!selectedMunicipalityId,
  });

  const handleSelectUserType = (type: string) => {
    switch (type) {
      case "elderly":
        setLocation("/elderly-login?step=name");
        break;
      case "family":
        setLocation("/family-login");
        break;
      case "professional":
        setLocation("/professional-login");
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-purple-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          {/* Título */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
              Bienvenido a {municipality?.name || "..."}
            </h1>
            <p className="text-xl text-muted-foreground">
              Selecciona cómo deseas acceder
            </p>
          </div>

          {/* Contenedor principal con imagen central */}
          <div className="relative flex flex-col items-center justify-center gap-12">
            {/* Imagen central emotiva - más pequeña */}
            <div className="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-200/30 via-purple-200/30 to-pink-200/30 rounded-full blur-3xl animate-pulse"></div>
              <div className="relative w-full h-full rounded-full overflow-hidden shadow-2xl border-4 border-white">
                <img
                  src="/Cabeza la Vaca.jpg"
                  alt="Comunidad unida"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
            </div>

            {/* Botones circulares flotantes - más grandes */}
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 max-w-3xl">
              {/* Usuario Mayor */}
              <div className="group flex flex-col items-center">
                <Button
                  onClick={() => handleSelectUserType("elderly")}
                  className="w-40 h-40 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 border-4 border-white"
                  data-testid="button-elderly"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Users size={48} className="md:w-16 md:h-16" />
                    <span className="text-base md:text-lg font-bold">Usuarios</span>
                  </div>
                </Button>
                <p className="mt-3 text-sm text-muted-foreground text-center max-w-[160px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Acceso para personas mayores
                </p>
              </div>

              {/* Familiar */}
              <div className="group flex flex-col items-center">
                <Button
                  onClick={() => handleSelectUserType("family")}
                  className="w-40 h-40 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 border-4 border-white"
                  data-testid="button-family"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Heart size={48} className="md:w-16 md:h-16" />
                    <span className="text-base md:text-lg font-bold">Apoyo</span>
                  </div>
                </Button>
                <p className="mt-3 text-sm text-muted-foreground text-center max-w-[160px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Acceso para familiares
                </p>
              </div>

              {/* Profesional */}
              <div className="group flex flex-col items-center">
                <Button
                  onClick={() => handleSelectUserType("professional")}
                  className="w-40 h-40 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 border-4 border-white"
                  data-testid="button-professional"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Shield size={48} className="md:w-16 md:h-16" />
                    <span className="text-base md:text-lg font-bold">Administración</span>
                  </div>
                </Button>
                <p className="mt-3 text-sm text-muted-foreground text-center max-w-[160px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Acceso para profesionales
                </p>
              </div>
            </div>

            {/* Mensaje adicional */}
            <div className="text-center mt-8">
              <p className="text-base text-muted-foreground italic">
                Una plataforma hecha por y para personas
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
