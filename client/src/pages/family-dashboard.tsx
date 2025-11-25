import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Pill, MessageCircle, Calendar, Plus, Check, Phone, Mail, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Activity, Reminder } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Footer } from "@/components/footer";

export default function FamilyDashboard() {
  const { user } = useAuth();

  // Get the assigned elderly user from preferences
  const elderlyUserId = user?.preferences?.elderlyUserId;

  const { data: elderlyUser } = useQuery({
    queryKey: ["/api/users", elderlyUserId],
    enabled: !!elderlyUserId,
  });

  const { data: activities } = useQuery({
    queryKey: ["/api/activities", elderlyUserId],
    enabled: !!elderlyUserId,
  });

  const { data: todayReminders } = useQuery({
    queryKey: ["/api/reminders", elderlyUserId, "today"],
    enabled: !!elderlyUserId,
  });

  const { data: allReminders } = useQuery({
    queryKey: ["/api/reminders", elderlyUserId],
    enabled: !!elderlyUserId,
  });

  const { data: completionStats } = useQuery({
    queryKey: [`/api/reminders/${elderlyUserId}/stats`, { days: 7 }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/reminders/${elderlyUserId}/stats?days=7`);
      return response.json();
    },
    enabled: !!elderlyUserId,
  });

  const { data: todayCompletions } = useQuery({
    queryKey: [`/api/reminders/${elderlyUserId}/completions/today`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/reminders/${elderlyUserId}/completions`);
      return response.json();
    },
    enabled: !!elderlyUserId,
  });

  const getLastActivityText = (lastActivity: string | undefined) => {
    if (!lastActivity) return "Sin actividad registrada";
    const timeDiff = Date.now() - new Date(lastActivity).getTime();
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours < 1) return `Hace ${minutes}m`;
    if (hours === 1) return "Hace 1h";
    return `Hace ${hours}h`;
  };

  const getLastActivity = () => {
    if (!elderlyUser?.familyConsent) return "Información privada";
    return getLastActivityText(elderlyUser?.lastActivity);
  };

  const getCompletedMedicines = () => {
    if (!elderlyUser?.familyConsent) return "Información privada";
    if (!Array.isArray(todayReminders)) return "0/0";
    const medicineReminders = todayReminders.filter((r: any) => r.type === "medicine");
    const completed = medicineReminders.filter((r: any) => r.completedToday).length;
    return `${completed}/${medicineReminders.length}`;
  };

  const getPendingReminders = () => {
    if (!Array.isArray(todayReminders)) return [];
    return todayReminders.filter((r: any) => !r.completedToday && new Date() > new Date(`2024-01-01 ${r.reminderTime}`));
  };

  const getChatCount = () => {
    if (!Array.isArray(activities)) return 0;
    return activities.filter((a: Activity) => a.activityType === "chat").length;
  };

  const getNextAppointment = () => {
    if (!elderlyUser?.familyConsent) return "Información privada";
    if (!Array.isArray(allReminders)) return "Sin citas";
    const appointments = allReminders.filter((r: Reminder) => 
      r.type === "appointment" && !r.isCompleted && r.isActive
    );
    if (appointments.length === 0) return "Sin citas";
    // Simplified for demo, real implementation would sort and find the soonest
    return "2 días"; 
  };

  const getRecentActivities = () => {
    if (!elderlyUser?.familyConsent) return [];
    if (!Array.isArray(activities)) return [];
    return activities.slice(-3).reverse();
  };

  const getUpcomingReminders = () => {
    if (!elderlyUser?.familyConsent) return [];
    if (!Array.isArray(allReminders)) return []; 
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return allReminders
      .filter((r: Reminder) => {
        if (!r.reminderDate) {
          return r.isActive && !r.isCompleted;
        }

        const reminderDate = new Date(r.reminderDate);
        return reminderDate >= today && reminderDate <= nextWeek && r.isActive && !r.isCompleted;
      })
      .sort((a, b) => {
        if (!a.reminderDate && !b.reminderDate) {
          return a.reminderTime.localeCompare(b.reminderTime);
        }
        if (!a.reminderDate) return -1;
        if (!b.reminderDate) return 1;

        const dateComparison = new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime();
        if (dateComparison === 0) {
          return a.reminderTime.localeCompare(b.reminderTime);
        }
        return dateComparison;
      });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "medicine":
        return <Pill className="text-white" size={20} />;
      case "appointment":
        return <Calendar className="text-white" size={20} />;
      case "call":
        return <Phone className="text-white" size={20} />;
      case "message":
        return <Mail className="text-white" size={20} />;
      default:
        return <AlertCircle className="text-white" size={20} />;
    }
  };

  const isUserActive = () => {
    if (!elderlyUser || !elderlyUser.lastActivity) return false;
    const timeDiff = Date.now() - new Date(elderlyUser.lastActivity).getTime();
    return timeDiff < 24 * 60 * 60 * 1000; // Active if last activity was within 24 hours
  };

  // If no family consent, show limited dashboard with only messaging capability
  if (elderlyUser && !elderlyUser.familyConsent) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 md:ml-64" data-testid="page-family-dashboard">
        <div className="max-w-7xl mx-auto space-y-6 mobile-padding">
          <Card className="shadow-lg border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-foreground" data-testid="title">
                    Panel Familiar - {elderlyUser && 'firstName' in elderlyUser ? `${elderlyUser.firstName} ${elderlyUser.lastName}` : 'Usuario'}
                  </h1>
                  <p className="text-muted-foreground">Comunicación familiar</p>
                </div>
                <div className="flex gap-3">
                  <Link href="/messages">
                    <Button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors" data-testid="button-messages">
                      <MessageCircle size={16} className="mr-2" />Enviar Mensaje
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="text-center py-12">
                <AlertCircle className="mx-auto mb-4 text-blue-500" size={48} />
                <h2 className="text-2xl font-bold text-foreground mb-2">Información Privada</h2>
                <p className="text-muted-foreground mb-4">
                  El usuario no ha otorgado consentimiento para compartir su información de actividad con familiares.
                  Sin embargo, puedes enviar mensajes de apoyo.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
                  <h3 className="text-lg font-medium text-blue-800 mb-2">¿Qué puedes hacer?</h3>
                  <ul className="text-blue-700 space-y-2">
                    <li>• Enviar mensajes de apoyo y amor</li>
                    <li>• Compartir fotos y recuerdos familiares</li>
                    <li>• Mantener comunicación regular</li>
                    <li>• Hablar con el usuario para que active el compartir información</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:ml-64" data-testid="page-family-dashboard">
      <div className="max-w-7xl mx-auto space-y-6 mobile-padding">
        <Card className="shadow-lg border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground" data-testid="title">
                  Panel Familiar - {elderlyUser && 'firstName' in elderlyUser ? `${elderlyUser.firstName} ${elderlyUser.lastName}` : 'Usuario'}
                </h1>
                <p className="text-muted-foreground">Monitoreo y cuidado remoto</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  isUserActive() 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }`} data-testid="status-badge">
                  <div className={`w-3 h-3 rounded-full ${
                    isUserActive() ? "bg-green-500 animate-pulse" : "bg-red-500"
                  }`}></div>
                  <span className="font-medium">
                    {isUserActive() ? "Activa hoy" : "Inactiva"}
                  </span>
                </div>
                <div className="flex gap-3">
                  <Link href="/messages">
                    <Button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors" data-testid="button-messages">
                      <MessageCircle size={16} className="mr-2" />Enviar Mensaje
                    </Button>
                  </Link>
                  <Link href="/reminders">
                    <Button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors" data-testid="button-new-reminder">
                      <Plus size={16} className="mr-2" />Nuevo Recordatorio
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            <div className="family-dashboard-stats grid gap-4 md:gap-6 mb-8" data-testid="stats-grid">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium">Última Actividad</p>
                    <p className="text-2xl font-bold text-blue-800" data-testid="stat-last-activity">
                      {getLastActivity()}
                    </p>
                  </div>
                  <Clock className="text-blue-500" size={32} />
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 text-sm font-medium">Medicinas Tomadas</p>
                    <p className="text-2xl font-bold text-green-800" data-testid="stat-medicines">
                      {getCompletedMedicines()}
                    </p>
                  </div>
                  <Pill className="text-green-500" size={32} />
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 text-sm font-medium">Cumplimiento Semanal</p>
                    <p className="text-2xl font-bold text-purple-800" data-testid="stat-compliance">
                      {elderlyUser?.familyConsent ? (completionStats?.percentage || 0) + "%" : "Información privada"}
                    </p>
                  </div>
                  <TrendingUp className="text-purple-500" size={32} />
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-600 text-sm font-medium">Próxima Cita</p>
                    <p className="text-2xl font-bold text-orange-800" data-testid="stat-next-appointment">
                      {getNextAppointment()}
                    </p>
                  </div>
                  <Calendar className="text-orange-500" size={32} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              <div className="lg:col-span-2">
                <h2 className="text-xl font-semibold text-foreground mb-4">Actividad Reciente</h2>
                <div className="space-y-4" data-testid="recent-activities">
                  {!elderlyUser?.familyConsent ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-blue-800 mb-2">Información Privada</h3>
                        <p className="text-blue-700">
                          El usuario no ha dado consentimiento para compartir esta información con familiares.
                          Si deseas ver estos datos, habla con el usuario para que pueda actualizar sus preferencias de privacidad.
                        </p>
                      </div>
                    </div>
                  ) : getRecentActivities().length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay actividades recientes
                    </div>
                  ) : (
                    getRecentActivities().map((activity: Activity) => (
                      <div key={activity.id} className="bg-accent rounded-lg p-4 flex items-center space-x-4" data-testid={`activity-${activity.id}`}>
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                          {activity.activityType === "login" && <Check className="text-white" size={20} />}
                          {activity.activityType === "chat" && <MessageCircle className="text-white" size={20} />}
                          {activity.activityType === "reminder_completed" && <Check className="text-white" size={20} />}
                          {activity.activityType === "message_read" && <Mail className="text-white" size={20} />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-accent-foreground">{activity.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {activity.createdAt ? new Date(activity.createdAt).toLocaleString("es-ES") : ""}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="bg-accent rounded-xl p-6">
              <h2 className="responsive-text-xl font-semibold text-accent-foreground mb-4">Próximos Recordatorios</h2>

              <div className="space-y-3" data-testid="upcoming-reminders">
                {!elderlyUser?.familyConsent ? (
                  <div className="text-center py-8">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="responsive-text-xl font-semibold text-blue-800 mb-2">
                        Información Privada
                      </h3>
                      <p className="responsive-text text-blue-700">
                        El usuario no ha dado consentimiento para compartir los recordatorios con familiares.
                      </p>
                    </div>
                  </div>
                ) : !Array.isArray(getUpcomingReminders()) || getUpcomingReminders().length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar size={48} className="text-muted-foreground mx-auto mb-4" />
                    <h3 className="responsive-text-xl font-semibold text-foreground mb-2">
                      No hay recordatorios próximos
                    </h3>
                    <p className="responsive-text text-muted-foreground">
                      Los recordatorios diarios y de la próxima semana aparecerán aquí
                    </p>
                  </div>
                ) : (
                  Array.isArray(getUpcomingReminders()) && getUpcomingReminders().slice(0, 5).map((reminder: Reminder) => (
                    <div key={reminder.id} className="bg-card rounded-lg p-4 border border-border" data-testid={`upcoming-reminder-${reminder.id}`}>
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                          {getIcon(reminder.type)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground responsive-text" data-testid={`reminder-title-${reminder.id}`}>
                            {reminder.title}
                          </h3>
                          <p className="text-sm text-muted-foreground responsive-text" data-testid={`reminder-time-${reminder.id}`}>
                            {reminder.reminderDate ? 
                              `${reminder.reminderDate} a las ${reminder.reminderTime}` :
                              `Cada día a las ${reminder.reminderTime}`
                            }
                          </p>
                          <span className={`text-xs px-2 py-1 rounded ${
                            reminder.createdBy !== elderlyUserId ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                          }`}>
                            {reminder.createdBy !== elderlyUserId ? "Creado por profesional" : "Creado por familiar"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

                <div className="mt-6 p-4 bg-primary rounded-lg text-center" data-testid="general-status">
                  <p className="text-primary-foreground font-medium">
                    Estado general: {isUserActive() ? "Excelente" : "Necesita atención"}
                  </p>
                  <p className="text-primary-foreground/80 text-sm">
                    {isUserActive() ? "Todos los indicadores normales" : "Considera contactar"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}