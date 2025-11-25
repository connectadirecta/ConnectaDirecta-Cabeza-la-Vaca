
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Footer } from "@/components/footer";

export default function Landing() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Set municipality ID for Cabeza la Vaca
    localStorage.setItem("selectedMunicipality", "cabeza-la-vaca");
  }, []);

  const handleClick = () => {
    setLocation("/select-user-type");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Lado Izquierdo - Imagen Fija (50%) */}
      <div className="md:w-1/2 md:h-screen md:fixed md:left-0 md:top-0 h-64 md:h-full">
        <div className="relative w-full h-full">
          <img
            src="/Cabeza la Vaca.jpg"
            alt="Cabeza la Vaca"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent"></div>
        </div>
      </div>

      {/* Lado Derecho - Contenido Scrolleable (50%) */}
      <div className="md:w-1/2 md:ml-[50%] flex flex-col">
        <div className="flex-1 bg-background p-8 md:p-12 lg:p-16 flex flex-col justify-center min-h-screen">
          <div className="max-w-xl mx-auto w-full space-y-8">
            {/* Logo/Título Principal */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground animate-fade-in">
                Connecta Directa
              </h1>
              <div className="h-1 w-24 bg-primary rounded-full"></div>
            </div>

            {/* Bienvenida */}
            <div className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                Bienvenido a Cabeza la Vaca
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                Una plataforma diseñada para conectar y cuidar a nuestra comunidad, 
                uniendo a personas mayores, familias y profesionales del municipio.
              </p>
            </div>

            {/* Botón de Acceso */}
            <button
              onClick={handleClick}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-lg"
            >
              Acceder a la Plataforma
            </button>

            {/* Características */}
            <div className="space-y-6 pt-8">
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Asistencia Virtual</h3>
                  <p className="text-muted-foreground">
                    Conversaciones naturales con inteligencia artificial adaptada a personas mayores
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Conexión Familiar</h3>
                  <p className="text-muted-foreground">
                    Mantén el contacto con tus seres queridos de forma sencilla y segura
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Apoyo Profesional</h3>
                  <p className="text-muted-foreground">
                    Acompañamiento continuo de los servicios sociales municipales
                  </p>
                </div>
              </div>
            </div>

            {/* Indicador de scroll para móvil */}
            <div className="flex justify-center gap-2 pt-4 md:hidden">
              <div className="w-2 h-2 bg-primary/30 rounded-full"></div>
              <div className="w-2 h-2 bg-primary/50 rounded-full"></div>
              <div className="w-2 h-2 bg-primary rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Footer en el lado derecho */}
        <Footer />
      </div>
    </div>
  );
}
