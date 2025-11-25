import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, AlertTriangle, Calendar, Download, Plus, Clock, Lock, BarChart3, X, Brain } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Activity } from "@shared/schema";
import MetricsDashboard from "@/components/metrics-dashboard";
import { SidebarTrigger, SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Footer } from "@/components/footer";

export default function ProfessionalDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAlertsDialog, setShowAlertsDialog] = useState(false);
  const [showActiveUsersDialog, setShowActiveUsersDialog] = useState(false);
  const [showAppointmentsDialog, setShowAppointmentsDialog] = useState(false);
  const [showActivitiesDialog, setShowActivitiesDialog] = useState(false);
  const [showCreateActivityDialog, setShowCreateActivityDialog] = useState(false);
  const [newActivity, setNewActivity] = useState({
    title: "",
    description: "",
    activityType: "cognitive_exercise",
    instructions: "",
    difficulty: "medium",
    scheduledDate: "",
    scheduledTime: "",
    recurrence: "once"
  });
  const usersPerPage = 4;

  const { data: elderlyUsers, isLoading } = useQuery({
    queryKey: ["/api/professional", user?.id, "users"],
    queryFn: async () => {
      const response = await fetch(`/api/professional/${user?.id}/users`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
    enabled: !!user,
  });

  // Get activities for all users to calculate stats
  const { data: allActivities } = useQuery({
    queryKey: ["/api/activities/all"],
    enabled: !!user && !!elderlyUsers,
  });

  // Get program activities created by this professional
  const { data: programActivities } = useQuery({
    queryKey: ["/api/professional", user?.id, "program-activities"],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest("GET", `/api/professional/${user.id}/program-activities`);
      return response.json();
    },
    enabled: !!user,
  });

  // Get alerts for this professional
  const { data: alerts } = useQuery({
    queryKey: ["/api/professional", user?.id, "alerts"],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest("GET", `/api/professional/${user.id}/alerts`);
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 30000, // Check for new alerts every 30 seconds
  });

  // Get appointments for this week
  const { data: weeklyAppointments } = useQuery({
    queryKey: ["/api/professional", user?.id, "appointments"],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest("GET", `/api/professional/${user.id}/appointments`);
      return response.json();
    },
    enabled: !!user,
  });

  const isUserActive = (lastActivity: string | Date | null) => {
    if (!lastActivity) return false;
    const now = new Date();
    const activityDate = new Date(lastActivity);
    const timeDiff = now.getTime() - activityDate.getTime();
    return timeDiff < 24 * 60 * 60 * 1000; // Active if last activity was within 24 hours
  };

  const isUserInactive = (lastActivity: string | Date) => {
    if (!lastActivity) return true;
    const timeDiff = Date.now() - new Date(lastActivity).getTime();
    return timeDiff > 48 * 60 * 60 * 1000; // Inactive if no activity for 48+ hours
  };

  const getActiveUsersToday = () => {
    if (!Array.isArray(elderlyUsers)) return { active: 0, total: 0 };

    // Debug logging
    console.log("[DEBUG] getActiveUsersToday - All users:", elderlyUsers.map(u => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      personalConsent: u.personalConsent,
      familyConsent: u.familyConsent,
      personalConsentType: typeof u.personalConsent,
      familyConsentType: typeof u.familyConsent
    })));

    // Detailed logging for each user
    elderlyUsers.forEach((u: User) => {
      const hasConsent = u.personalConsent === true;
      console.log(`[DEBUG] User ${u.firstName} ${u.lastName}: personalConsent=${u.personalConsent} (${typeof u.personalConsent}), hasConsent=${hasConsent}`);
    });

    // Only count users with personalConsent = true for municipal statistics
    const consentedUsers = elderlyUsers.filter((u: User) => u.personalConsent === true);
    console.log("[DEBUG] getActiveUsersToday - Consented users:", consentedUsers.length, "out of", elderlyUsers.length);
    console.log("[DEBUG] getActiveUsersToday - Consented user names:", consentedUsers.map(u => `${u.firstName} ${u.lastName}`));

    const active = consentedUsers.filter((u: User) => {
      return isUserActive(u.lastActivity);
    }).length;
    return { active, total: consentedUsers.length };
  };

  const getPendingAlerts = () => {
    if (!Array.isArray(alerts)) return 0;
    return alerts.length;
  };

  const dismissAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await apiRequest("PATCH", `/api/alerts/${alertId}/dismiss`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professional", user?.id, "alerts"] });
      toast({
        title: "Alerta eliminada",
        description: "La alerta ha sido marcada como atendida",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la alerta",
        variant: "destructive",
      });
    },
  });

  const createActivityMutation = useMutation({
    mutationFn: async (activityData: any) => {
      const response = await apiRequest("POST", "/api/professional/program-activities", {
        ...activityData,
        professionalId: user?.id,
        userIds: elderlyUsers?.map((u: User) => u.id) || []
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professional", user?.id, "program-activities"] });
      setShowCreateActivityDialog(false);
      setNewActivity({
        title: "",
        description: "",
        activityType: "cognitive_exercise",
        instructions: "",
        difficulty: "medium",
        scheduledDate: "",
        scheduledTime: "",
        recurrence: "once"
      });
      toast({
        title: "Actividad creada",
        description: "La actividad ha sido asignada a todos los usuarios",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la actividad",
        variant: "destructive",
      });
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const response = await apiRequest("DELETE", `/api/professional/program-activities/${activityId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professional", user?.id, "program-activities"] });
      toast({
        title: "Actividad eliminada",
        description: "La actividad ha sido eliminada para todos los usuarios",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la actividad",
        variant: "destructive",
      });
    },
  });

  const getAppointmentsThisWeek = () => {
    if (!Array.isArray(weeklyAppointments) || !Array.isArray(elderlyUsers)) return 0;
    // Only count appointments for users with personalConsent = true
    const consentedUserIds = elderlyUsers.filter((u: User) => u.personalConsent === true).map(u => u.id);
    return weeklyAppointments.filter((appointment: any) => 
      consentedUserIds.includes(appointment.userId)
    ).length;
  };

  const getProgramActivities = () => {
    // Count program activities created by this professional
    if (!Array.isArray(programActivities)) return 0;
    return programActivities.length;
  };

  const getCognitiveExercisesCompleted = () => {
    if (!Array.isArray(allActivities)) return 0;
    return allActivities.filter((activity: Activity) => 
      activity.activityType === 'cognitive_exercise'
    ).length;
  };

  const exportReport = () => {
    try {
      const reportData = {
        fecha: new Date().toLocaleDateString('es-ES'),
        profesional: `${user?.firstName} ${user?.lastName}`,
        totalUsuarios: elderlyUsers?.length || 0,
        usuariosActivos: activeStats.active,
        alertasPendientes: getPendingAlerts(),
        citasSemana: getAppointmentsThisWeek(),
        ejerciciosCognitivos: getCognitiveExercisesCompleted(),
        usuarios: elderlyUsers?.map((u: User) => ({
          nombre: `${u.firstName} ${u.lastName}`,
          edad: u.age,
          ultimaActividad: getLastActivityText(u.lastActivity || ""),
          estado: getUserStatusStyle(u).statusText,
          condicionesMedicas: u.medicalConditions?.length || 0
        })) || []
      };

      // Create CSV content
      const csvContent = [
        ['REPORTE PROFESIONAL MUNICIPAL'],
        [`Fecha: ${reportData.fecha}`],
        [`Profesional: ${reportData.profesional}`],
        [''],
        ['RESUMEN GENERAL'],
        [`Total de usuarios: ${reportData.totalUsuarios}`],
        [`Usuarios activos hoy: ${reportData.usuariosActivos}`],
        [`Alertas pendientes: ${reportData.alertasPendientes}`],
        [`Citas esta semana: ${reportData.citasSemana}`],
        [`Ejercicios cognitivos: ${reportData.ejerciciosCognitivos}`],
        [''],
        ['DETALLE DE USUARIOS'],
        ['Nombre', 'Edad', 'Última Actividad', 'Estado', 'Condiciones Médicas'],
        ...reportData.usuarios.map((u: { nombre: string; edad: number; ultimaActividad: string; estado: string; condicionesMedicas: number }) => [u.nombre, u.edad, u.ultimaActividad, u.estado, u.condicionesMedicas])
      ].map(row => Array.isArray(row) ? row.join(',') : row).join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `reporte_municipal_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Reporte exportado",
        description: "El reporte ha sido descargado exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo exportar el reporte",
        variant: "destructive",
      });
    }
  };

  const getFilteredUsers = () => {
    if (!Array.isArray(elderlyUsers)) return [];

    let filtered = elderlyUsers.filter((u: User) => {
      // Ensure we have valid name fields
      const firstName = u.firstName || "";
      const lastName = u.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim();

      const matchesSearch = searchTerm === "" || 
        fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && isUserActive(u.lastActivity || "")) ||
        (statusFilter === "inactive" && !isUserActive(u.lastActivity || "")) ||
        (statusFilter === "alerts" && isUserInactive(u.lastActivity || ""));

      return matchesSearch && matchesStatus;
    });

    return filtered;
  };

  const getPaginatedUsers = () => {
    const filtered = getFilteredUsers();
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(getFilteredUsers().length / usersPerPage);
  };

  const getLastActivityText = (lastActivity: string | Date) => {
    if (!lastActivity) return "Sin actividad";

    const timeDiff = Date.now() - new Date(lastActivity).getTime();
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `Hace ${days} día${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    } else {
      return "Hace menos de 1h";
    }
  };

  const getUserInitials = (firstName: string, lastName: string) => {
    const firstInitial = (firstName || '').charAt(0);
    const lastInitial = (lastName || '').charAt(0);
    const initials = `${firstInitial}${lastInitial}`.toUpperCase();
    return initials || 'UN';
  };

  const getUserStatusStyle = (u: User) => {
    if (isUserInactive(u.lastActivity || "")) {
      return {
        cardClass: "border-yellow-200",
        avatarClass: "bg-yellow-500",
        statusBadge: "px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded",
        statusText: "Alerta",
        buttonClass: "bg-yellow-500 hover:bg-yellow-600",
        buttonText: "Revisar Alerta"
      };
    } else if (isUserActive(u.lastActivity || "")) {
      return {
        cardClass: "border-border",
        avatarClass: "bg-primary",
        statusBadge: "px-2 py-1 bg-green-100 text-green-800 text-xs rounded",
        statusText: "Activa",
        buttonClass: "bg-primary hover:bg-primary/90",
        buttonText: "Ver Detalles"
      };
    } else {
      return {
        cardClass: "border-border",
        avatarClass: "bg-primary",
        statusBadge: "px-2 py-1 bg-green-100 text-green-800 text-xs rounded",
        statusText: "Activa",
        buttonClass: "bg-primary hover:bg-primary/90",
        buttonText: "Ver Detalles"
      };
    }
  };

  const handleCreateActivity = () => {
    if (!newActivity.title || !newActivity.description) {
      toast({
        title: "Error",
        description: "El título y descripción son obligatorios",
        variant: "destructive",
      });
      return;
    }
    createActivityMutation.mutate(newActivity);
  };

  const handleDeleteActivity = (activityId: string) => {
    if (window.confirm("¿Estás seguro de eliminar esta actividad? Se eliminará para todos los usuarios.")) {
      deleteActivityMutation.mutate(activityId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Cargando datos...</p>
          </div>
        </div>
      </div>
    );
  }

  const activeStats = getActiveUsersToday();

  return (
    <div className="flex-1 p-4 bg-muted/30" data-testid="page-professional-dashboard">
      <div className="flex items-center mb-6">
        <SidebarTrigger className="mr-4" />
        <h1 className="text-3xl font-bold text-foreground" data-testid="title">
          Panel Municipal - Supervisión
        </h1>
      </div>
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Card */}
            <Card className="shadow-lg border-border">
              <CardContent className="p-6">
                <div className="professional-header">
                  <div>
                    <p className="text-muted-foreground">Coordinación y monitoreo de usuarios del programa</p>
                    <p className="text-sm text-muted-foreground">
                      Profesional: <span className="font-medium">{user?.firstName} {user?.lastName}</span>
                    </p>
                  </div>
                  <div className="professional-actions">
                    <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg" data-testid="active-users-badge">
                      <span className="font-medium">{activeStats.active} usuarios activos</span>
                    </div>

                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs Section */}
            <Tabs defaultValue="users" className="w-full">
              <TabsList variant="professional" className="w-full mb-6">
                <TabsTrigger value="users" variant="professional" className="flex items-center space-x-2">
                  <Users size={16} className="hidden sm:block" />
                  <Users size={20} className="block sm:hidden" />
                  <span className="hidden sm:inline">Gestión de Usuarios</span>
                  <span className="sm:hidden">Usuarios</span>
                </TabsTrigger>
                <TabsTrigger value="metrics" variant="professional" className="flex items-center space-x-2">
                  <BarChart3 size={16} className="hidden sm:block" />
                  <BarChart3 size={20} className="block sm:hidden" />
                  <span className="hidden sm:inline">Métricas y Análisis</span>
                  <span className="sm:hidden">Métricas</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users" variant="mobile">
                <Card className="shadow-lg border-border mobile-card">
                  <CardContent className="mobile-card-content p-6">

                    {/* Action Buttons */}
                    <div className="professional-actions mb-6">
                      <Button
                        onClick={() => window.location.href = '/professional/create-user'}
                        className="mobile-button bg-green-600 hover:bg-green-700 text-white"
                        data-testid="button-create-user"
                      >
                        <Plus size={16} className="mr-2" />
                        Crear Nuevo Usuario
                      </Button>
                      <Button
                        onClick={() => window.location.href = '/professional/reminders'}
                        className="mobile-button bg-blue-600 hover:bg-blue-700 text-white"
                        data-testid="button-manage-reminders"
                      >
                        <Clock size={16} className="mr-2" />
                        Gestionar Recordatorios
                      </Button>
                      <Button
                        onClick={() => window.location.href = '/professional/passwords'}
                        className="mobile-button bg-purple-600 hover:bg-purple-700 text-white"
                        data-testid="button-manage-passwords"
                      >
                        <Lock size={16} className="mr-2" />
                        Gestionar PINs
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" data-testid="stats-grid">
                      <div 
                        className="bg-blue-50 border border-blue-200 rounded-xl p-4 cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() => setShowActiveUsersDialog(true)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-blue-600 text-sm font-medium">Usuarios Activos Hoy</p>
                            <p className="text-2xl font-bold text-blue-800" data-testid="stat-active-users">
                              {activeStats.active}/{activeStats.total}
                            </p>
                          </div>
                          <Users className="text-blue-500" size={32} />
                        </div>
                      </div>

                      <div 
                        className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 cursor-pointer hover:bg-yellow-100 transition-colors"
                        onClick={() => setShowAlertsDialog(true)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-yellow-600 text-sm font-medium">Alertas Pendientes</p>
                            <p className="text-2xl font-bold text-yellow-800" data-testid="stat-alerts">
                              {getPendingAlerts()}
                            </p>
                          </div>
                          <AlertTriangle className="text-yellow-500" size={32} />
                        </div>
                      </div>

                      <div 
                        className="bg-green-50 border border-green-200 rounded-xl p-4 cursor-pointer hover:bg-green-100 transition-colors"
                        onClick={() => setShowAppointmentsDialog(true)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-green-600 text-sm font-medium">Citas Esta Semana</p>
                            <p className="text-2xl font-bold text-green-800" data-testid="stat-appointments">
                              {getAppointmentsThisWeek()}
                            </p>
                          </div>
                          <Calendar className="text-green-500" size={32} />
                        </div>
                      </div>

                      <div 
                        className="bg-purple-50 border border-purple-200 rounded-xl p-4 cursor-pointer hover:bg-purple-100 transition-colors"
                        onClick={() => setShowActivitiesDialog(true)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-purple-600 text-sm font-medium">Actividades del Programa</p>
                            <p className="text-2xl font-bold text-purple-800" data-testid="stat-program-activities">
                              {getProgramActivities()}
                            </p>
                          </div>
                          <Brain className="text-purple-500" size={32} />
                        </div>
                      </div>
                    </div>

                    <div className="bg-accent rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-accent-foreground">Lista de Usuarios</h2>
                        <div className="flex items-center space-x-3" data-testid="filters">
                          <Input
                            type="text"
                            placeholder="Buscar usuario..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-64"
                            data-testid="input-search"
                          />
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-48" data-testid="select-status-filter">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos los estados</SelectItem>
                              <SelectItem value="active">Activos</SelectItem>
                              <SelectItem value="inactive">Inactivos</SelectItem>
                              <SelectItem value="alerts">Con alertas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-3" data-testid="users-list">
                        {getPaginatedUsers().length === 0 ? (
                          <div className="text-center py-12">
                            <Users size={48} className="text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">
                              No se encontraron usuarios
                            </h3>
                            <p className="text-muted-foreground">
                              {searchTerm || statusFilter !== "all" 
                                ? "Intenta ajustar los filtros de búsqueda" 
                                : "No hay usuarios registrados en el sistema"}
                            </p>
                          </div>
                        ) : (
                          getPaginatedUsers().map((u: User) => {
                            const style = getUserStatusStyle(u);
                            return (
                              <div 
                                key={u.id} 
                                className={`bg-card rounded-lg p-4 border ${style.cardClass} hover:shadow-md transition-shadow`}
                                data-testid={`user-card-${u.id}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <div className={`w-12 h-12 ${style.avatarClass} rounded-full flex items-center justify-center`} data-testid={`user-avatar-${u.id}`}>
                                      <span className="text-primary-foreground font-semibold">
                                        {getUserInitials(u.firstName || "", u.lastName || "")}
                                      </span>
                                    </div>
                                    <div>
                                      <h3 className="font-semibold text-foreground" data-testid={`user-name-${u.id}`}>
                                        {(u.firstName || "Sin")} {(u.lastName || "Nombre")}
                                      </h3>
                                      <p className="text-sm text-muted-foreground" data-testid={`user-details-${u.id}`}>
                                        {u.age || "N/A"} años • {u.medicalConditions?.length || 0} condiciones médicas
                                      </p>
                                      <div className="flex items-center space-x-2 mt-1">
                                        <span className={style.statusBadge} data-testid={`user-status-${u.id}`}>
                                          {style.statusText}
                                        </span>
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                          Familiar asignado
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Última actividad</p>
                                    <p className="font-medium text-foreground" data-testid={`user-last-activity-${u.id}`}>
                                      {getLastActivityText(u.lastActivity || "")}
                                    </p>
                                    <Button 
                                      className={`mt-2 px-3 py-1 text-xs rounded transition-colors ${style.buttonClass} text-white`}
                                      data-testid={`button-user-action-${u.id}`}
                                      onClick={() => window.location.href = `/professional/user/${u.id}`}
                                    >
                                      Ver Detalles
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {getFilteredUsers().length > usersPerPage && (
                        <div className="mt-6 flex items-center justify-between" data-testid="pagination">
                          <p className="text-sm text-muted-foreground">
                            Mostrando {Math.min(getPaginatedUsers().length, usersPerPage)} de {getFilteredUsers().length} usuarios
                          </p>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              data-testid="button-previous-page"
                            >
                              Anterior
                            </Button>
                            {Array.from({ length: Math.min(3, getTotalPages()) }, (_, i) => {
                              const pageNum = currentPage <= 2 ? i + 1 : currentPage - 1 + i;
                              if (pageNum > getTotalPages()) return null;
                              return (
                                <Button
                                  key={pageNum}
                                  variant={pageNum === currentPage ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(pageNum)}
                                  data-testid={`button-page-${pageNum}`}
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(Math.min(getTotalPages(), currentPage + 1))}
                              disabled={currentPage === getTotalPages()}
                              data-testid="button-next-page"
                            >
                              Siguiente
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="metrics" variant="mobile">
                <MetricsDashboard elderlyUsers={elderlyUsers || []} professionalId={user?.id} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Alerts Dialog */}
          <Dialog open={showAlertsDialog} onOpenChange={setShowAlertsDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <AlertTriangle className="text-yellow-500 mr-2" size={24} />
                  Alertas Pendientes ({alerts?.length || 0})
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {!Array.isArray(alerts) || alerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No hay alertas pendientes</p>
                  </div>
                ) : (
                  alerts.map((alert: any) => (
                    <div key={alert.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-yellow-800 mb-2">
                            Alerta de Ayuda Urgente
                          </p>
                          <p className="text-sm text-yellow-700 mb-2">
                            {alert.content}
                          </p>
                          <p className="text-xs text-yellow-600">
                            Recibida: {new Date(alert.createdAt).toLocaleString("es-ES")}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => dismissAlertMutation.mutate(alert.id)}
                          disabled={dismissAlertMutation.isPending}
                        >
                          <X size={14} className="mr-1" />
                          Atendida
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Active Users Dialog */}
          <Dialog open={showActiveUsersDialog} onOpenChange={setShowActiveUsersDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Users className="text-blue-500 mr-2" size={24} />
                  Usuarios Activos Hoy ({activeStats.active}/{activeStats.total})
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {!Array.isArray(elderlyUsers) || elderlyUsers.filter(u => u.personalConsent === true && isUserActive(u.lastActivity || "")).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No hay usuarios activos hoy con consentimiento municipal</p>
                  </div>
                ) : (
                  elderlyUsers.filter(u => u.personalConsent === true && isUserActive(u.lastActivity || "")).map((user: any) => (
                    <div key={user.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-blue-800">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-blue-600">
                            Última actividad: {getLastActivityText(user.lastActivity)}
                          </p>
                        </div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Appointments Dialog */}
          <Dialog open={showAppointmentsDialog} onOpenChange={setShowAppointmentsDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Calendar className="text-green-500 mr-2" size={24} />
                  Citas Esta Semana ({weeklyAppointments?.length || 0})
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {!Array.isArray(weeklyAppointments) || weeklyAppointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No hay citas programadas esta semana</p>
                  </div>
                ) : (
                  weeklyAppointments.map((appointment: any) => (
                    <div key={appointment.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-green-800">
                            {appointment.title}
                          </p>
                          <p className="text-sm text-green-600">
                            Paciente: {appointment.userName}
                          </p>
                          <p className="text-sm text-green-600">
                            Fecha: {new Date(appointment.date).toLocaleDateString("es-ES", {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          <p className="text-xs text-green-500">
                            Hora: {appointment.time}
                          </p>
                          {appointment.description && (
                            <p className="text-xs text-green-500 mt-1">
                              {appointment.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Activities Dialog */}
          <Dialog open={showActivitiesDialog} onOpenChange={setShowActivitiesDialog}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Brain className="text-purple-500 mr-2" size={24} />
                    Actividades del Programa
                  </div>
                  <Button
                    onClick={() => setShowCreateActivityDialog(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    data-testid="button-add-activity"
                  >
                    <Plus size={16} className="mr-2" />
                    Añadir Actividad
                  </Button>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {!Array.isArray(programActivities) || programActivities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No hay actividades del programa creadas</p>
                    <p className="text-sm mt-2">Usa el botón "Añadir Actividad" para crear la primera</p>
                  </div>
                ) : (
                  programActivities.map((activity: any) => (
                    <div key={activity.id} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-purple-800">
                            {activity.title}
                          </h4>
                          <p className="text-sm text-purple-600 mt-1">
                            {activity.description}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-xs text-purple-500">
                              Tipo: {activity.activityType}
                            </span>
                            <span className="text-xs text-purple-500">
                              Creada: {new Date(activity.createdAt).toLocaleDateString("es-ES")}
                            </span>
                            <span className="text-xs text-purple-500">
                              Usuarios asignados: {activity.assignedUsers || elderlyUsers?.length || 0}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteActivity(activity.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Create Activity Dialog */}
          <Dialog open={showCreateActivityDialog} onOpenChange={setShowCreateActivityDialog}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
              <DialogHeader className="flex-shrink-0 pb-4 border-b">
                <DialogTitle className="flex items-center">
                  <Plus className="text-purple-500 mr-2" size={24} />
                  Crear Nueva Actividad
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-1">
                <div className="space-y-6 py-4">
                  {/* Información básica */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Información Básica</h3>

                    <div>
                      <Label className="text-sm font-medium">Título de la Actividad *</Label>
                      <Input
                        value={newActivity.title}
                        onChange={(e) => setNewActivity({...newActivity, title: e.target.value})}
                        placeholder="Ej: Ejercicio de Memoria Visual"
                        className="mt-1"
                        data-testid="input-activity-title"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Descripción *</Label>
                      <Textarea
                        value={newActivity.description}
                        onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
                        placeholder="Describe la actividad y sus objetivos"
                        rows={3}
                        className="mt-1"
                        data-testid="textarea-activity-description"
                      />
                    </div>
                  </div>

                  {/* Configuración de actividad */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Configuración</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Tipo de Actividad</Label>
                        <Select 
                          value={newActivity.activityType} 
                          onValueChange={(value) => setNewActivity({...newActivity, activityType: value})}
                        >
                          <SelectTrigger className="mt-1" data-testid="select-activity-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cognitive_exercise">Ejercicio Cognitivo</SelectItem>
                            <SelectItem value="physical_activity">Actividad Física</SelectItem>
                            <SelectItem value="social_activity">Actividad Social</SelectItem>
                            <SelectItem value="creative_activity">Actividad Creativa</SelectItem>
                            <SelectItem value="memory_exercise">Ejercicio de Memoria</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Dificultad</Label>
                        <Select 
                          value={newActivity.difficulty} 
                          onValueChange={(value) => setNewActivity({...newActivity, difficulty: value})}
                        >
                          <SelectTrigger className="mt-1" data-testid="select-activity-difficulty">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Fácil</SelectItem>
                            <SelectItem value="medium">Medio</SelectItem>
                            <SelectItem value="hard">Difícil</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Programación temporal */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Programación Temporal</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Fecha de la Actividad</Label>
                        <Input
                          type="date"
                          value={newActivity.scheduledDate || ""}
                          onChange={(e) => setNewActivity({...newActivity, scheduledDate: e.target.value})}
                          className="mt-1"
                          data-testid="input-activity-date"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Fecha en que la actividad estará disponible
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Hora de la Actividad</Label>
                        <Input
                          type="time"
                          value={newActivity.scheduledTime || ""}
                          onChange={(e) => setNewActivity({...newActivity, scheduledTime: e.target.value})}
                          className="mt-1"
                          data-testid="input-activity-time"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Hora específica para la actividad
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Recurrencia</Label>
                        <Select 
                          value={newActivity.recurrence || "once"} 
                          onValueChange={(value) => setNewActivity({...newActivity, recurrence: value})}
                        >
                          <SelectTrigger className="mt-1" data-testid="select-activity-recurrence">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="once">Una vez</SelectItem>
                            <SelectItem value="daily">Diaria</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="monthly">Mensual</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Frecuencia de repetición de la actividad
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Instrucciones */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Instrucciones</h3>

                    <div>
                      <Label className="text-sm font-medium">Instrucciones para el Usuario</Label>
                      <Textarea
                        value={newActivity.instructions}
                        onChange={(e) => setNewActivity({...newActivity, instructions: e.target.value})}
                        placeholder="Instrucciones paso a paso para realizar la actividad..."
                        rows={4}
                        className="mt-1"
                        data-testid="textarea-activity-instructions"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Proporciona instrucciones claras y detalladas
                      </p>
                    </div>
                  </div>

                  {/* Información adicional */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Información Importante</h4>
                    <div className="space-y-2 text-sm text-blue-700">
                      <p>• Esta actividad se asignará automáticamente a todos los usuarios ({elderlyUsers?.length || 0}) que gestionas</p>
                      <p>• Los usuarios podrán ver la actividad en su dashboard según la fecha programada</p>
                      <p>• Las actividades recurrentes se crearán automáticamente según la frecuencia seleccionada</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 flex justify-end space-x-3 pt-4 border-t bg-background">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateActivityDialog(false)}
                  data-testid="button-cancel-activity"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateActivity}
                  disabled={createActivityMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  data-testid="button-save-activity"
                >
                  {createActivityMutation.isPending ? "Creando..." : "Crear Actividad"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        <Footer />
      </div>
    );
  }