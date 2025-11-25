
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/footer";

export default function AdditionalInfo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary">
              Información Adicional del Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                NOMBRE DE LA OPERACIÓN/PROYECTO
              </h2>
              <p className="text-muted-foreground">
                TRIRURALTECH – Plataforma municipal de asistencia virtual y estimulación cognitiva para personas mayores en entornos rurales
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                DESCRIPCIÓN DE LA OPERACIÓN/PROYECTO
              </h2>
              <p className="text-muted-foreground">
                Desarrollo e implantación de una plataforma en la nube, con asistente virtual basado en IA y una interfaz accesible (web y pantallas táctiles municipales), para coordinar a personas mayores, familiares y personal municipal; registrar información básica, proponer ejercicios cognitivos y reducir la brecha digital mediante formación y puntos de acceso en casas de cultura, bibliotecas y centros sociales. Incluye base de datos cifrada, gestión de roles y despliegue en 6 meses (análisis, desarrollo, piloto y despliegue).
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                OBJETIVOS
              </h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Unificar la comunicación y coordinación entre mayores, familias y profesionales municipales/sociosanitarios.</li>
                <li>Fomentar la autonomía y el envejecimiento activo con recordatorios y ejercicios de estimulación cognitiva.</li>
                <li>Reducir la brecha digital con una interfaz adaptada y programas de formación locales.</li>
                <li>Mejorar la eficacia de la atención municipal mediante registros y paneles de seguimiento.</li>
                <li>Garantizar privacidad y seguridad (RGPD, control de acceso y cifrado TLS/HTTPS).</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                RESULTADOS PREVISTOS
              </h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Plataforma operativa multiespacio municipal (web + pantallas táctiles) con roles para mayor, familiar y profesional.</li>
                <li>Adopción objetivo: alcanzar al menos al 60% de la población mayor en los municipios piloto y mejora de competencias digitales en un 50% de participantes tras los talleres.</li>
                <li>Calendario de talleres de formación (mayores, familiares y personal municipal) y plan de difusión local y digital.</li>
                <li>Despliegue en 4 fases en ~6 meses: análisis/diseño, desarrollo, piloto y despliegue final con ajustes.</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">PRESUPUESTO</h2>
                <p className="text-muted-foreground">100.000 euros</p>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">AYUDA RECIBIDA</h2>
                <p className="text-muted-foreground">100.000 euros</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold text-foreground mb-1">FONDO/PROGRAMA</h3>
              <p className="text-muted-foreground">
                AYUDAS DESTINADAS A ECOSISTEMAS EMPRENDEDORES PARA UN TERRITORIO RURAL Y MARINO INTELIGENTE (TRIRURALTECH), MEDIANTE EL DESARROLLO E IMPLEMENTACIÓN DE SOLUCIONES TECNOLÓGICAS INNOVADORAS EN EL ÁMBITO DE LA ECONOMÍA PLATEADA
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
