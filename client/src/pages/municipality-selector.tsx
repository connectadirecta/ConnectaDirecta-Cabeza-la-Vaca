
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, MapPin, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Footer } from "@/components/footer";

export default function MunicipalitySelector() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingMunicipalityId, setEditingMunicipalityId] = useState<string | null>(null);
  const [municipalityName, setMunicipalityName] = useState("");
  const [municipalityPhotoFile, setMunicipalityPhotoFile] = useState<File | null>(null);
  const [municipalityPhotoPreview, setMunicipalityPhotoPreview] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Get all municipalities
  const { data: municipalities, isLoading } = useQuery({
    queryKey: ["/api/municipalities"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/municipalities");
      return response.json();
    },
  });

  // Create/Update municipality mutation
  const createMunicipalityMutation = useMutation({
    mutationFn: async (data: { id?: string; name: string; photoData?: string }) => {
      const endpoint = data.id ? `/api/municipalities/${data.id}` : "/api/municipalities";
      const method = data.id ? "PUT" : "POST";
      const response = await apiRequest(method, endpoint, data);
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/municipalities"] });
      setShowCreateDialog(false);
      setMunicipalityName("");
      setMunicipalityPhotoFile(null);
      setMunicipalityPhotoPreview("");
      setEditingMunicipalityId(null);
      toast({
        title: variables.id ? "Municipio actualizado" : "Municipio creado",
        description: variables.id ? "El municipio se ha actualizado correctamente" : "El municipio se ha creado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar el municipio",
        variant: "destructive",
      });
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Error",
          description: "La foto no puede ser mayor a 5MB",
          variant: "destructive",
        });
        return;
      }
      setMunicipalityPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMunicipalityPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateMunicipality = async () => {
    if (!municipalityName.trim()) {
      toast({
        title: "Error",
        description: "El nombre del municipio es obligatorio",
        variant: "destructive",
      });
      return;
    }

    let photoData = municipalityPhotoPreview;
    
    createMunicipalityMutation.mutate({
      id: editingMunicipalityId || undefined,
      name: municipalityName,
      photoData: photoData || undefined,
    });
  };

  const handleEditMunicipality = (municipality: any) => {
    setEditingMunicipalityId(municipality.id);
    setMunicipalityName(municipality.name);
    setMunicipalityPhotoPreview(municipality.photoUrl || "");
    setShowCreateDialog(true);
  };

  const handleSelectMunicipality = (municipalityId: string) => {
    // Guardar el municipio seleccionado en localStorage
    localStorage.setItem("selectedMunicipality", municipalityId);
    // Redirigir a la página de selección de tipo de usuario
    setLocation("/select-user-type");
  };

  const deleteMunicipalityMutation = useMutation({
    mutationFn: async (municipalityId: string) => {
      const response = await apiRequest("DELETE", `/api/municipalities/${municipalityId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/municipalities"] });
      toast({
        title: "Municipio eliminado",
        description: "El municipio y todos sus datos han sido eliminados correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el municipio",
        variant: "destructive",
      });
    },
  });

  const handleDeleteMunicipality = (municipalityId: string, municipalityName: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el municipio "${municipalityName}"?\n\nEsta acción es irreversible y eliminará:\n- Todos los usuarios asociados\n- Todos los profesionales asociados\n- Todos los datos relacionados`)) {
      if (window.confirm(`CONFIRMACIÓN FINAL: ¿Realmente deseas eliminar "${municipalityName}" y TODOS sus datos?`)) {
        deleteMunicipalityMutation.mutate(municipalityId);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando municipios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Bienvenido</h1>
          <p className="text-xl text-muted-foreground">Selecciona tu municipio para continuar</p>
        </div>

        {/* Botón para crear municipio */}
        <div className="flex justify-end mb-6">
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus size={20} className="mr-2" />
            Crear Municipio
          </Button>
        </div>

        {/* Grid de municipios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {municipalities?.map((municipality: any) => (
            <Card
              key={municipality.id}
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
              onClick={() => handleSelectMunicipality(municipality.id)}
            >
              <CardContent className="p-6">
                {municipality.photoUrl ? (
                  <img
                    src={municipality.photoUrl}
                    alt={municipality.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                ) : (
                  <div className="w-full h-48 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <MapPin size={64} className="text-primary" />
                  </div>
                )}
                <h3 className="text-2xl font-bold text-foreground mb-3">{municipality.name}</h3>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditMunicipality(municipality);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMunicipality(municipality.id, municipality.name);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {municipalities?.length === 0 && (
          <div className="text-center py-12">
            <MapPin size={64} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No hay municipios</h3>
            <p className="text-muted-foreground mb-4">Crea el primer municipio para comenzar</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus size={20} className="mr-2" />
              Crear Municipio
            </Button>
          </div>
        )}

        {/* Dialog para crear/editar municipio */}
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          if (!open) {
            setEditingMunicipalityId(null);
            setMunicipalityName("");
            setMunicipalityPhotoFile(null);
            setMunicipalityPhotoPreview("");
          }
          setShowCreateDialog(open);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMunicipalityId ? "Editar Municipio" : "Crear Nuevo Municipio"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nombre del Municipio *</Label>
                <Input
                  value={municipalityName}
                  onChange={(e) => setMunicipalityName(e.target.value)}
                  placeholder="Ej: Madrid"
                />
              </div>
              <div>
                <Label>Foto del Municipio (opcional)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="cursor-pointer"
                />
                {municipalityPhotoPreview && (
                  <div className="mt-2">
                    <img
                      src={municipalityPhotoPreview}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => {
                  setShowCreateDialog(false);
                  setEditingMunicipalityId(null);
                  setMunicipalityName("");
                  setMunicipalityPhotoFile(null);
                  setMunicipalityPhotoPreview("");
                }}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateMunicipality}
                  disabled={createMunicipalityMutation.isPending}
                >
                  {createMunicipalityMutation.isPending ? "Guardando..." : editingMunicipalityId ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Footer />
    </div>
  );
}
