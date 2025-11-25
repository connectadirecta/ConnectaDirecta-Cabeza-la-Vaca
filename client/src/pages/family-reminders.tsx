
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pill, Calendar, Phone, Heart, Plus, Edit, Trash2, X, ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Reminder } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function FamilyReminders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get the assigned elderly user from preferences
  const elderlyUserId = user?.preferences?.elderlyUserId;
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [newReminder, setNewReminder] = useState({
    title: "",
    description: "",
    reminderTime: "",
    reminderDate: "",
    type: "medicine" as const,
    recurrence: "daily" as "daily" | "once"
  });

  const { data: reminders, isLoading } = useQuery({
    queryKey: ["/api/reminders", elderlyUserId],
    enabled: !!elderlyUserId,
  });

  const createReminderMutation = useMutation({
    mutationFn: async (reminderData: any) => {
      const response = await apiRequest("POST", "/api/reminders", {
        ...reminderData,
        userId: elderlyUserId,
        createdBy: user?.id,
        isActive: true,
        reminderDate: reminderData.recurrence === "daily" ? null : reminderData.reminderDate,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders", elderlyUserId] });
      toast({
        title: "Recordatorio creado",
        description: "El recordatorio ha sido creado correctamente",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el recordatorio",
        variant: "destructive",
      });
    },
  });

  const updateReminderMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await apiRequest("PATCH", `/api/reminders/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders", elderlyUserId] });
      toast({
        title: "Recordatorio actualizado",
        description: "El recordatorio ha sido actualizado correctamente",
      });
      setEditingReminder(null);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el recordatorio",
        variant: "destructive",
      });
    },
  });

  const deleteReminderMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/reminders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders", elderlyUserId] });
      toast({
        title: "Recordatorio eliminado",
        description: "El recordatorio ha sido eliminado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el recordatorio",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNewReminder({
      title: "",
      description: "",
      reminderTime: "",
      reminderDate: "",
      type: "medicine",
      recurrence: "daily"
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newReminder.title || !newReminder.reminderTime) {
      toast({
        title: "Campos requeridos",
        description: "El título y la hora son obligatorios",
        variant: "destructive",
      });
      return;
    }

    if (newReminder.recurrence === "once" && !newReminder.reminderDate) {
      toast({
        title: "Fecha requerida",
        description: "Para recordatorios únicos es necesario especificar la fecha",
        variant: "destructive",
      });
      return;
    }

    if (editingReminder) {
      updateReminderMutation.mutate({
        id: editingReminder.id,
        ...newReminder,
        reminderDate: newReminder.recurrence === "daily" ? null : newReminder.reminderDate,
      });
    } else {
      createReminderMutation.mutate(newReminder);
    }
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setNewReminder({
      title: reminder.title,
      description: reminder.description || "",
      reminderTime: reminder.reminderTime,
      reminderDate: reminder.reminderDate || "",
      type: reminder.type as any,
      recurrence: reminder.reminderDate ? "once" : "daily"
    });
    setIsCreateDialogOpen(true);
  };

  const handleDeleteReminder = (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este recordatorio?")) {
      deleteReminderMutation.mutate(id);
    }
  };

  const getRemindersByType = (type: string) => {
    if (!Array.isArray(reminders)) return [];
    return reminders.filter((r: Reminder) => r.type === type && r.isActive);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "medicine":
        return <Pill className="text-blue-500" size={24} />;
      case "appointment":
        return <Calendar className="text-green-500" size={24} />;
      case "call":
        return <Phone className="text-purple-500" size={24} />;
      case "activity":
        return <Heart className="text-orange-500" size={24} />;
      default:
        return <Calendar className="text-gray-500" size={24} />;
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "medicine":
        return "bg-blue-50 hover:bg-blue-100 border-2 border-blue-200";
      case "appointment":
        return "bg-green-50 hover:bg-green-100 border-2 border-green-200";
      case "call":
        return "bg-purple-50 hover:bg-purple-100 border-2 border-purple-200";
      case "activity":
        return "bg-orange-50 hover:bg-orange-100 border-2 border-orange-200";
      default:
        return "bg-gray-50 hover:bg-gray-100 border-2 border-gray-200";
    }
  };

  const getTypeCount = (type: string) => {
    return getRemindersByType(type).length;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 md:ml-64">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="responsive-text-lg text-muted-foreground">Cargando recordatorios...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:ml-64" data-testid="page-family-reminders">
      <div className="max-w-6xl mx-auto space-y-6 mobile-padding">
        <Card className="shadow-lg border-border mobile-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = "/dashboard"}
                  data-testid="button-back"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Volver
                </Button>
                <div>
                  <h1 className="responsive-text-3xl font-bold text-foreground" data-testid="title">
                    Gestión de Recordatorios
                  </h1>
                  <p className="responsive-text text-muted-foreground">Administra citas, medicinas y actividades</p>
                </div>
              </div>
              
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium responsive-text" 
                    data-testid="button-new-reminder"
                    onClick={() => {
                      setEditingReminder(null);
                      resetForm();
                    }}
                  >
                    <Plus size={16} className="mr-2" />Nuevo Recordatorio
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="sm:max-w-md dialog-mobile" data-testid="create-reminder-dialog">
                  <DialogHeader>
                    <DialogTitle className="responsive-text-xl">
                      {editingReminder ? "Editar Recordatorio" : "Crear Nuevo Recordatorio"}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="title" className="responsive-text">Título *</Label>
                      <Input
                        id="title"
                        value={newReminder.title}
                        onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                        placeholder="Ej: Tomar medicamento"
                        required
                        data-testid="input-title"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="type" className="responsive-text">Tipo</Label>
                      <Select 
                        value={newReminder.type} 
                        onValueChange={(value: any) => setNewReminder({ ...newReminder, type: value })}
                      >
                        <SelectTrigger data-testid="select-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="medicine">💊 Medicina</SelectItem>
                          <SelectItem value="appointment">📅 Cita médica</SelectItem>
                          <SelectItem value="call">📞 Llamada</SelectItem>
                          <SelectItem value="activity">❤️ Actividad</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="reminderTime" className="responsive-text">Hora *</Label>
                      <Input
                        id="reminderTime"
                        type="time"
                        value={newReminder.reminderTime}
                        onChange={(e) => setNewReminder({ ...newReminder, reminderTime: e.target.value })}
                        required
                        data-testid="input-time"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="recurrence" className="responsive-text">Frecuencia</Label>
                      <Select 
                        value={newReminder.recurrence} 
                        onValueChange={(value: any) => setNewReminder({ ...newReminder, recurrence: value })}
                      >
                        <SelectTrigger data-testid="select-recurrence">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">🔄 Diario</SelectItem>
                          <SelectItem value="once">📅 Una vez</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {newReminder.recurrence === "once" && (
                      <div>
                        <Label htmlFor="reminderDate" className="responsive-text">Fecha *</Label>
                        <Input
                          id="reminderDate"
                          type="date"
                          value={newReminder.reminderDate}
                          onChange={(e) => setNewReminder({ ...newReminder, reminderDate: e.target.value })}
                          required
                          data-testid="input-date"
                        />
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="description" className="responsive-text">Descripción</Label>
                      <Textarea
                        id="description"
                        value={newReminder.description}
                        onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })}
                        placeholder="Información adicional..."
                        data-testid="textarea-description"
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCreateDialogOpen(false);
                          setEditingReminder(null);
                          resetForm();
                        }}
                        data-testid="button-cancel"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={createReminderMutation.isPending || updateReminderMutation.isPending}
                        data-testid="button-save"
                      >
                        {editingReminder ? "Actualizar" : "Crear"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="family-reminder-types grid gap-4 md:gap-6 mb-8" data-testid="reminder-types">
              <div className={`${getTypeStyle("medicine")} rounded-xl p-4 transition-colors text-left`} data-testid="filter-medicine">
                <Pill className="text-blue-500 mb-2" size={24} />
                <p className="font-semibold text-blue-800 responsive-text">Medicinas</p>
                <p className="text-sm text-blue-600">{getTypeCount("medicine")} activos</p>
              </div>

              <div className={`${getTypeStyle("appointment")} rounded-xl p-4 transition-colors text-left`} data-testid="filter-appointments">
                <Calendar className="text-green-500 mb-2" size={24} />
                <p className="font-semibold text-green-800 responsive-text">Citas Médicas</p>
                <p className="text-sm text-green-600">{getTypeCount("appointment")} próximas</p>
              </div>

              <div className={`${getTypeStyle("call")} rounded-xl p-4 transition-colors text-left`} data-testid="filter-calls">
                <Phone className="text-purple-500 mb-2" size={24} />
                <p className="font-semibold text-purple-800 responsive-text">Llamadas</p>
                <p className="text-sm text-purple-600">{getTypeCount("call")} programadas</p>
              </div>

              <div className={`${getTypeStyle("activity")} rounded-xl p-4 transition-colors text-left`} data-testid="filter-activities">
                <Heart className="text-orange-500 mb-2" size={24} />
                <p className="font-semibold text-orange-800 responsive-text">Actividades</p>
                <p className="text-sm text-orange-600">{getTypeCount("activity")} semanales</p>
              </div>
            </div>

            <div className="bg-accent rounded-xl p-6">
              <h2 className="responsive-text-xl font-semibold text-accent-foreground mb-4">Recordatorios Activos</h2>
              
              <div className="space-y-4" data-testid="reminders-list">
                {!Array.isArray(reminders) || reminders.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar size={48} className="text-muted-foreground mx-auto mb-4" />
                    <h3 className="responsive-text-xl font-semibold text-foreground mb-2">
                      No hay recordatorios configurados
                    </h3>
                    <p className="responsive-text text-muted-foreground mb-4">
                      Comienza creando el primer recordatorio
                    </p>
                    <Button 
                      className="bg-primary text-primary-foreground responsive-text" 
                      onClick={() => {
                        setEditingReminder(null);
                        resetForm();
                        setIsCreateDialogOpen(true);
                      }}
                      data-testid="button-create-first"
                    >
                      <Plus size={16} className="mr-2" />Crear Recordatorio
                    </Button>
                  </div>
                ) : (
                  Array.isArray(reminders) && reminders
                    .filter((r: Reminder) => r.isActive)
                    .map((reminder: Reminder) => (
                      <div key={reminder.id} className="bg-card rounded-lg p-4 border border-border" data-testid={`reminder-item-${reminder.id}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                              {getIcon(reminder.type)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground responsive-text" data-testid={`reminder-title-${reminder.id}`}>
                                {reminder.title}
                              </h3>
                              <p className="text-sm text-muted-foreground responsive-text" data-testid={`reminder-schedule-${reminder.id}`}>
                                {reminder.reminderDate ? 
                                  `${reminder.reminderDate} a las ${reminder.reminderTime}` :
                                  `Cada día a las ${reminder.reminderTime}`
                                }
                              </p>
                              {reminder.description && (
                                <p className="text-sm text-muted-foreground mt-1 responsive-text" data-testid={`reminder-description-${reminder.id}`}>
                                  {reminder.description}
                                </p>
                              )}
                              <div className="flex items-center space-x-2 mt-1">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  reminder.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                                }`}>
                                  {reminder.isActive ? "Activo" : "Inactivo"}
                                </span>
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                  {reminder.reminderDate ? "Una vez" : "Diario"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-2 text-muted-foreground hover:text-primary transition-colors"
                              onClick={() => handleEdit(reminder)}
                              data-testid={`button-edit-${reminder.id}`}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                              onClick={() => handleDeleteReminder(reminder.id)}
                              disabled={deleteReminderMutation.isPending}
                              data-testid={`button-delete-${reminder.id}`}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>

              {Array.isArray(reminders) && reminders.length > 0 && (
                <div className="mt-6 p-4 bg-muted rounded-lg" data-testid="suggestions">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">💡</span>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground responsive-text">Sugerencia</p>
                      <p className="text-sm text-muted-foreground responsive-text">
                        Considera agregar recordatorios para ejercicio ligero y hidratación.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
