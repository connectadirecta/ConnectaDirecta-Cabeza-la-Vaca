import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Edit, Save, X, Plus, Clock, AlertTriangle, Heart, Phone } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface ProfessionalUserDetailProps {
  userId: string;
}

export default function ProfessionalUserDetail({ userId }: ProfessionalUserDetailProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<User> | null>(null);

  const { data: elderlyUser, isLoading } = useQuery({
    queryKey: ["/api/users", userId],
    enabled: !!user && !!userId,
  });

  const { data: userReminders } = useQuery({
    queryKey: ["/api/reminders", userId],
    enabled: !!elderlyUser,
  });

  const { data: userActivities } = useQuery({
    queryKey: ["/api/activities", userId],
    enabled: !!elderlyUser,
  });

  const updateUserMutation = useMutation({
    mutationFn: async (updates: Partial<User>) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId] });
      toast({
        title: "Usuario actualizado",
        description: "Los datos del usuario se han guardado correctamente",
      });
      setIsEditing(false);
      setEditData({});
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-muted rounded"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!elderlyUser) {
    return (
      <div className="min-h-screen bg-muted/30 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Usuario no encontrado</h1>
          <Button onClick={() => window.location.href = "/dashboard"}>
            Volver al Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleEdit = () => {
    setEditData({ ...elderlyUser });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editData) {
      updateUserMutation.mutate(editData);
    }
  };

  const handleCancel = () => {
    setEditData(null);
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: any) => {
    setEditData(prev => prev ? ({ ...prev, [field]: value }) : null);
  };

  const getStatusColor = (lastActivity: string | Date) => {
    if (!lastActivity) return "text-red-500";
    const timeDiff = Date.now() - new Date(lastActivity).getTime();
    const hours = timeDiff / (1000 * 60 * 60);
    
    if (hours < 24) return "text-green-500";
    if (hours < 48) return "text-yellow-500";
    return "text-red-500";
  };

  const currentData = isEditing ? (editData || elderlyUser) : elderlyUser;

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
              {elderlyUser.firstName} {elderlyUser.lastName}
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <Button onClick={handleEdit} data-testid="button-edit">
                <Edit size={16} className="mr-2" />
                Editar Información
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button 
                  onClick={handleSave} 
                  disabled={updateUserMutation.isPending}
                  data-testid="button-save"
                >
                  <Save size={16} className="mr-2" />
                  Guardar
                </Button>
                <Button variant="outline" onClick={handleCancel} data-testid="button-cancel">
                  <X size={16} className="mr-2" />
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Información Personal */}
          <Card data-testid="card-personal-info">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart size={20} className="mr-2 text-red-500" />
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre</Label>
                  {isEditing ? (
                    <Input
                      value={currentData?.firstName || ""}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      data-testid="input-first-name"
                    />
                  ) : (
                    <p className="text-foreground font-medium">{elderlyUser.firstName}</p>
                  )}
                </div>
                <div>
                  <Label>Apellidos</Label>
                  {isEditing ? (
                    <Input
                      value={currentData?.lastName || ""}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      data-testid="input-last-name"
                    />
                  ) : (
                    <p className="text-foreground font-medium">{elderlyUser.lastName}</p>
                  )}
                </div>
              </div>
              
              <div>
                <Label>Edad</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={currentData?.age || ""}
                    onChange={(e) => handleInputChange("age", parseInt(e.target.value))}
                    data-testid="input-age"
                  />
                ) : (
                  <p className="text-foreground font-medium">{elderlyUser.age} años</p>
                )}
              </div>

              <div>
                <Label>Nivel Cognitivo</Label>
                {isEditing ? (
                  <Select 
                    value={currentData?.cognitiveLevel || ""} 
                    onValueChange={(value) => handleInputChange("cognitiveLevel", value)}
                  >
                    <SelectTrigger data-testid="select-cognitive-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="mild">Deterioro Leve</SelectItem>
                      <SelectItem value="moderate">Deterioro Moderado</SelectItem>
                      <SelectItem value="severe">Deterioro Severo</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-foreground font-medium">
                    {elderlyUser.cognitiveLevel === "normal" ? "Normal" :
                     elderlyUser.cognitiveLevel === "mild" ? "Deterioro Leve" :
                     elderlyUser.cognitiveLevel === "moderate" ? "Deterioro Moderado" :
                     elderlyUser.cognitiveLevel === "severe" ? "Deterioro Severo" :
                     elderlyUser.cognitiveLevel}
                  </p>
                )}
              </div>

              <div>
                <Label>Estado</Label>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(elderlyUser.lastActivity || "")}`}></div>
                  <span className="text-foreground font-medium">
                    {elderlyUser.isActive ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contacto de Emergencia */}
          <Card data-testid="card-emergency-contact">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone size={20} className="mr-2 text-blue-500" />
                Contacto de Emergencia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nombre</Label>
                {isEditing ? (
                  <Input
                    value={currentData?.emergencyContactName || ""}
                    onChange={(e) => handleInputChange("emergencyContactName", e.target.value)}
                    data-testid="input-emergency-name"
                  />
                ) : (
                  <p className="text-foreground font-medium">{elderlyUser.emergencyContactName || "No especificado"}</p>
                )}
              </div>
              
              <div>
                <Label>Teléfono</Label>
                {isEditing ? (
                  <Input
                    value={currentData?.emergencyContactPhone || ""}
                    onChange={(e) => handleInputChange("emergencyContactPhone", e.target.value)}
                    data-testid="input-emergency-phone"
                  />
                ) : (
                  <p className="text-foreground font-medium">{elderlyUser.emergencyContactPhone || "No especificado"}</p>
                )}
              </div>
              
              <div>
                <Label>Información Completa</Label>
                {isEditing ? (
                  <Textarea
                    value={currentData?.emergencyContact || ""}
                    onChange={(e) => handleInputChange("emergencyContact", e.target.value)}
                    rows={3}
                    data-testid="textarea-emergency-contact"
                  />
                ) : (
                  <p className="text-foreground">{elderlyUser.emergencyContact || "No especificado"}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Condiciones Médicas */}
          <Card data-testid="card-medical-conditions">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle size={20} className="mr-2 text-orange-500" />
                Condiciones Médicas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={currentData?.medicalConditions?.join(", ") || ""}
                  onChange={(e) => handleInputChange("medicalConditions", e.target.value.split(", ").filter(Boolean))}
                  placeholder="Separar condiciones con comas"
                  rows={4}
                  data-testid="textarea-medical-conditions"
                />
              ) : (
                <div className="space-y-2">
                  {elderlyUser.medicalConditions?.length ? (
                    elderlyUser.medicalConditions.map((condition, index) => (
                      <div key={index} className="px-3 py-2 bg-orange-50 text-orange-800 rounded-lg">
                        {condition}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No hay condiciones médicas registradas</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Medicamentos */}
          <Card data-testid="card-medications">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus size={20} className="mr-2 text-green-500" />
                Medicamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={currentData?.medications?.join(", ") || ""}
                  onChange={(e) => handleInputChange("medications", e.target.value.split(", ").filter(Boolean))}
                  placeholder="Separar medicamentos con comas"
                  rows={4}
                  data-testid="textarea-medications"
                />
              ) : (
                <div className="space-y-2">
                  {elderlyUser.medications?.length ? (
                    elderlyUser.medications.map((medication, index) => (
                      <div key={index} className="px-3 py-2 bg-green-50 text-green-800 rounded-lg">
                        {medication}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No hay medicamentos registrados</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recordatorios y Actividades */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card data-testid="card-reminders">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock size={20} className="mr-2 text-purple-500" />
                Recordatorios Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userReminders?.length ? (
                <div className="space-y-3">
                  {userReminders.slice(0, 5).map((reminder: any) => (
                    <div key={reminder.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{reminder.title}</p>
                        <p className="text-sm text-muted-foreground">{reminder.reminderTime}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        reminder.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}>
                        {reminder.isActive ? "Activo" : "Completado"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No hay recordatorios registrados</p>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-activities">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock size={20} className="mr-2 text-blue-500" />
                Actividad Reciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userActivities?.length ? (
                <div className="space-y-3">
                  {userActivities.slice(0, 5).map((activity: any) => (
                    <div key={activity.id} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-medium">{activity.activityType}</p>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No hay actividades registradas</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}