import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Lock, Eye, EyeOff, Save } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ProfessionalPasswordManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [newPin, setNewPin] = useState("");

  // Get elderly users
  const { data: elderlyUsers } = useQuery({
    queryKey: ["/api/professional", user?.id, "users"],
    enabled: !!user,
  });

  // Get selected user details
  const { data: selectedUserData } = useQuery({
    queryKey: ["/api/users", selectedUser],
    enabled: !!selectedUser,
  });

  const updatePinMutation = useMutation({
    mutationFn: async (data: { userId: string; pin: string }) => {
      const response = await apiRequest("PATCH", `/api/users/${data.userId}/pin`, {
        pin: data.pin
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "PIN actualizado",
        description: "El PIN se ha actualizado exitosamente",
      });
      setNewPin("");
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedUser] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el PIN",
        variant: "destructive",
      });
    },
  });

  const handlePinUpdate = () => {
    if (!selectedUser) {
      toast({
        title: "Seleccione un usuario",
        description: "Debe seleccionar un usuario para actualizar el PIN",
        variant: "destructive",
      });
      return;
    }

    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      toast({
        title: "PIN inválido",
        description: "El PIN debe ser exactamente 4 dígitos",
        variant: "destructive",
      });
      return;
    }

    updatePinMutation.mutate({ userId: selectedUser, pin: newPin });
  };

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = "/dashboard"}
              data-testid="button-back"
            >
              <ArrowLeft size={16} className="mr-2" />
              Volver al Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-foreground">
              Gestión de Contraseñas
            </h1>
          </div>
        </div>

        {/* User Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock size={20} className="mr-2 text-blue-500" />
              Seleccionar Usuario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Usuario</Label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  data-testid="select-user"
                >
                  <option value="">Seleccione un usuario</option>
                  {elderlyUsers?.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName || user.first_name} {user.lastName || user.last_name} - {user.username}
                    </option>
                  ))}
                </select>
              </div>

              {selectedUser && selectedUserData && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-3">Información del Usuario</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Nombre:</span>
                      <p className="font-medium">
                        {selectedUserData.firstName || selectedUserData.first_name} {selectedUserData.lastName || selectedUserData.last_name}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Usuario:</span>
                      <p className="font-medium">{selectedUserData.username}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Edad:</span>
                      <p className="font-medium">{selectedUserData.age} años</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Estado:</span>
                      <p className="font-medium">
                        {selectedUserData.isActive || selectedUserData.is_active ? (
                          <span className="text-green-600">Activo</span>
                        ) : (
                          <span className="text-red-600">Inactivo</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* PIN Management */}
        {selectedUser && (
          <Card>
            <CardHeader>
              <CardTitle>Actualizar PIN de Acceso</CardTitle>
              <p className="text-sm text-muted-foreground">
                El PIN es el código de 4 dígitos que el usuario mayor utiliza para acceder al sistema
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Nuevo PIN (4 dígitos)</Label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Input
                        type={showPin ? "text" : "password"}
                        maxLength={4}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="****"
                        className="pr-10"
                        data-testid="input-new-pin"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPin(!showPin)}
                        data-testid="button-toggle-pin"
                      >
                        {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                      </Button>
                    </div>
                    <Button
                      onClick={handlePinUpdate}
                      disabled={updatePinMutation.isPending || !newPin}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      data-testid="button-update-pin"
                    >
                      <Save size={16} className="mr-2" />
                      {updatePinMutation.isPending ? "Actualizando..." : "Actualizar PIN"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    El PIN debe ser exactamente 4 dígitos numéricos
                  </p>
                </div>

                {/* Security Notes */}
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">Notas de Seguridad</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• El PIN debe ser fácil de recordar para el usuario mayor</li>
                    <li>• Evite usar fechas de nacimiento o secuencias obvias (1234, 0000)</li>
                    <li>• Comunique el nuevo PIN al usuario de forma segura</li>
                    <li>• Considere escribirlo en un lugar seguro para el usuario</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}