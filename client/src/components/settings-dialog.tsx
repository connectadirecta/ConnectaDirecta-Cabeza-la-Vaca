
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings } from "lucide-react";
import { useSettings } from "@/lib/settings";

export function SettingsDialog() {
  const { fontSize, setFontSize, isSettingsOpen, setIsSettingsOpen } = useSettings();

  const fontSizeOptions = [
    { value: 'small', label: 'Pequeño', description: '14px - Compacto' },
    { value: 'medium', label: 'Mediano', description: '16px - Estándar' },
    { value: 'large', label: 'Grande', description: '18px - Cómodo' },
    { value: 'extra-large', label: 'Muy Grande', description: '20px - Accesible' },
  ];

  return (
    <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="fixed top-4 right-4 z-50">
          <Settings size={20} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configuración de Accesibilidad</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label htmlFor="font-size" className="text-sm font-medium">
              Tamaño de Letra
            </Label>
            <Select value={fontSize} onValueChange={setFontSize}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tamaño" />
              </SelectTrigger>
              <SelectContent>
                {fontSizeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="p-4 bg-muted rounded-lg">
            <p className="responsive-text mb-2">Vista previa del texto:</p>
            <p className="responsive-text-lg font-medium">
              Este es un ejemplo de cómo se verá el texto con el tamaño seleccionado.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
