import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Clock, Calendar, Pill, Activity, Bell, Trash2, Edit } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ProfessionalReminders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState("");
  const [reminderType, setReminderType] = useState("medicine");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    time: "",
    date: "",
    frequency: "daily",
    priority: "medium",
    endDate: ""
  });

  // Get elderly users
  const { data: elderlyUsers } = useQuery({
    queryKey: ["/api/professional", user?.id, "users"],
    enabled: !!user,
  });

  // Get reminders for selected user
  const { data: reminders, isLoading: remindersLoading } = useQuery({
    queryKey: ["/api/reminders", selectedUser, "upcoming"],
    queryFn: async () => {
      if (!selectedUser) return [];
      const response = await apiRequest("GET", `/api/reminders/${selectedUser}/upcoming`);
      if (!response.ok) {
        throw new Error('Failed to fetch reminders');
      }
      return response.json();
    },
    enabled: !!selectedUser,
  });

  const createReminderMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/reminders", {
        ...data,
        userId: selectedUser,
        type: reminderType,
        createdBy: user?.id
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Recordatorio creado",
        description: "El recordatorio se ha creado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders", selectedUser] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders", selectedUser, "upcoming"] });
      setShowCreateForm(false);
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
      const response = await apiRequest("PATCH", `/api/reminders/${id}`, {
        ...data,
        type: reminderType
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Recordatorio actualizado",
        description: "El recordatorio se ha actualizado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders", selectedUser] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders", selectedUser, "upcoming"] });
      setShowCreateForm(false);
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
    mutationFn: async (reminderId: string) => {
      const response = await apiRequest("DELETE", `/api/reminders/${reminderId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Recordatorio eliminado",
        description: "El recordatorio se ha eliminado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders", selectedUser] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders", selectedUser, "upcoming"] });
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
    setFormData({
      title: "",
      description: "",
      time: "",
      date: "",
      frequency: "daily",
      priority: "medium",
      endDate: ""
    });
    setEditingReminder(null);
  };

  const handleEditReminder = (reminder: any) => {
    setEditingReminder(reminder);
    setReminderType(reminder.type);
    setFormData({
      title: reminder.title,
      description: reminder.description || "",
      time: reminder.reminderTime,
      date: reminder.reminderDate || "",
      frequency: reminder.recurrence?.pattern || "daily",
      priority: reminder.priority || "medium",
      endDate: ""
    });
    setShowCreateForm(true);
  };

  const handleDeleteReminder = (reminderId: string) => {
    if (window.confirm("¿Está seguro de que desea eliminar este recordatorio?")) {
      deleteReminderMutation.mutate(reminderId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) {
      toast({
        title: "Seleccione un usuario",
        description: "Debe seleccionar un usuario para crear el recordatorio",
        variant: "destructive",
      });
      return;
    }

    const reminderData = {
      title: formData.title,
      description: formData.description,
      reminderTime: formData.time,
      reminderDate: formData.date,
      isActive: true,
      recurrence: formData.frequency === "daily" ? { pattern: "daily" } : 
                 formData.frequency === "weekly" ? { pattern: "weekly" } :
                 formData.frequency === "monthly" ? { pattern: "monthly" } : null
    };

    if (editingReminder) {
      updateReminderMutation.mutate({
        id: editingReminder.id,
        ...reminderData
      });
    } else {
      createReminderMutation.mutate(reminderData);
    }
  };

  const getReminderIcon = (type: string) => {
    switch (type) {
      case "medicine":
        return <Pill className="text-blue-500" size={20} />;
      case "appointment":
        return <Calendar className="text-green-500" size={20} />;
      case "activity":
        return <Activity className="text-orange-500" size={20} />;
      case "call":
        return <Bell className="text-purple-500" size={20} />;
      default:
        return <Bell className="text-gray-500" size={20} />;
    }
  };

  const getReminderTypeLabel = (type: string) => {
    switch (type) {
      case "medicine":
        return "Medicación";
      case "appointment":
        return "Cita Médica";
      case "activity":
        return "Actividad";
      case "call":
        return "Llamada";
      default:
        return "Recordatorio";
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case "once":
        return "Una vez";
      case "daily":
        return "Diario";
      case "weekly":
        return "Semanal";
      case "monthly":
        return "Mensual";
      default:
        return frequency;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600 bg-red-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "low":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6">
      <div className="max-w-6xl mx-auto mobile-padding">
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
              Gestión de Recordatorios
            </h1>
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={!selectedUser}
            data-testid="button-new-reminder"
          >
            <Plus size={16} className="mr-2" />
            Nuevo Recordatorio
          </Button>
        </div>

        {/* User Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Seleccionar Usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger data-testid="select-user">
                <SelectValue placeholder="Seleccione un usuario para gestionar sus recordatorios" />
              </SelectTrigger>
              <SelectContent>
                {elderlyUsers?.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {(user.firstName || user.first_name || "Sin")} {(user.lastName || user.last_name || "Nombre")} - {user.age || "N/A"} años
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Create Reminder Form */}
        {showCreateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingReminder ? "Editar Recordatorio" : "Crear Nuevo Recordatorio"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="professional-form-grid grid gap-4">
                  <div>
                    <Label>Tipo de Recordatorio</Label>
                    <Select value={reminderType} onValueChange={setReminderType}>
                      <SelectTrigger data-testid="select-reminder-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="medicine">Medicación</SelectItem>
                        <SelectItem value="appointment">Cita Médica</SelectItem>
                        <SelectItem value="activity">Actividad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Prioridad</Label>
                    <Select 
                      value={formData.priority} 
                      onValueChange={(value) => setFormData({...formData, priority: value})}
                    >
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="low">Baja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Título *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder={reminderType === "medication" ? "Tomar Metformina" : "Título del recordatorio"}
                    required
                    data-testid="input-title"
                  />
                </div>

                <div>
                  <Label>Descripción</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Detalles adicionales del recordatorio"
                    rows={3}
                    data-testid="textarea-description"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Fecha de Inicio *</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      required
                      data-testid="input-date"
                    />
                  </div>

                  <div>
                    <Label>Hora *</Label>
                    <Input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({...formData, time: e.target.value})}
                      required
                      data-testid="input-time"
                    />
                  </div>

                  <div>
                    <Label>Frecuencia</Label>
                    <Select 
                      value={formData.frequency} 
                      onValueChange={(value) => setFormData({...formData, frequency: value})}
                    >
                      <SelectTrigger data-testid="select-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">Una vez</SelectItem>
                        <SelectItem value="daily">Diario</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.frequency !== "once" && (
                  <div>
                    <Label>Fecha de Finalización (opcional)</Label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      data-testid="input-end-date"
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      resetForm();
                    }}
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createReminderMutation.isPending || updateReminderMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="button-submit"
                  >
                    {editingReminder 
                      ? (updateReminderMutation.isPending ? "Actualizando..." : "Actualizar Recordatorio")
                      : (createReminderMutation.isPending ? "Creando..." : "Crear Recordatorio")
                    }
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Reminders List */}
        {selectedUser && (
          <Card>
            <CardHeader>
              <CardTitle>Recordatorios Activos</CardTitle>
            </CardHeader>
            <CardContent>
              {remindersLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p>Cargando recordatorios...</p>
                </div>
              ) : reminders && reminders.length > 0 ? (
                <div className="space-y-3">
                  {reminders.map((reminder: any) => (
                    <div 
                      key={reminder.id}
                      className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                        reminder.isCompleted ? 'bg-green-50 border-green-200' : 'bg-white'
                      }`}
                      data-testid={`reminder-${reminder.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          {getReminderIcon(reminder.type)}
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-semibold text-foreground">
                                {reminder.title}
                              </h4>
                              {reminder.isCompleted && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  Completado
                                </span>
                              )}
                            </div>
                            {reminder.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {reminder.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-xs text-muted-foreground flex items-center">
                                <Clock size={14} className="mr-1" />
                                {reminder.reminderTime}
                              </span>
                              {reminder.reminderDate && (
                                <span className="text-xs text-muted-foreground flex items-center">
                                  <Calendar size={14} className="mr-1" />
                                  {format(new Date(reminder.reminderDate), "dd/MM/yyyy", { locale: es })}
                                </span>
                              )}
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                {getReminderTypeLabel(reminder.type)}
                              </span>
                              {reminder.recurrence && (
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                  {getFrequencyLabel(reminder.recurrence.pattern || 'once')}
                                </span>
                              )}
                              {!reminder.reminderDate && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                  Diario
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditReminder(reminder)}
                            data-testid={`button-edit-${reminder.id}`}
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteReminder(reminder.id)}
                            disabled={deleteReminderMutation.isPending}
                            data-testid={`button-delete-${reminder.id}`}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No hay recordatorios para este usuario</p>
                  <p className="text-sm mt-2">Haga clic en "Nuevo Recordatorio" para crear uno</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}