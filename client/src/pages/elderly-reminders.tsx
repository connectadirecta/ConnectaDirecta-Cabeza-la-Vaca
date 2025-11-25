import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Clock, Phone, Tv, Pill } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Reminder } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

export default function ElderlyReminders() {
  const { user } = useAuth();

  const { data: upcomingReminders, isLoading } = useQuery({
    queryKey: ["/api/reminders", user?.id, "upcoming"],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest("GET", `/api/reminders/${user.id}/upcoming?days=7`);
      if (!response.ok) {
        throw new Error('Failed to fetch reminders');
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  const markCompleteMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const response = await apiRequest("POST", `/api/reminders/${reminderId}/complete`, {
        userId: user?.id,
        completedBy: user?.id,
        notes: "Completado por el usuario mayor"
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ ¡Bien hecho!",
        description: "Recordatorio marcado como completado",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders", user?.id, "upcoming"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo marcar el recordatorio",
        variant: "destructive",
      });
    },
  });

  const currentTime = new Date().toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const currentDate = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Diario";
    const date = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateObj = new Date(dateStr + "T00:00:00");
    dateObj.setHours(0, 0, 0, 0);
    
    if (dateObj.getTime() === today.getTime()) {
      return "Hoy";
    } else if (dateObj.getTime() === tomorrow.getTime()) {
      return "Mañana";
    } else {
      return date.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long"
      });
    }
  };

  // Group reminders by date
  const groupedReminders = (upcomingReminders as Reminder[] || []).reduce((acc, reminder) => {
    const dateKey = reminder.reminderDate || "recurring";
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(reminder);
    return acc;
  }, {} as Record<string, Reminder[]>);

  // Sort dates
  const sortedDates = Object.keys(groupedReminders).sort((a, b) => {
    if (a === "recurring") return 1;
    if (b === "recurring") return -1;
    return a.localeCompare(b);
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "medicine":
        return <Pill size={24} className="text-white" />;
      case "call":
        return <Phone size={24} className="text-white" />;
      case "appointment":
        return <Clock size={24} className="text-white" />;
      case "activity":
        return <Tv size={24} className="text-white" />;
      default:
        return <Clock size={24} className="text-white" />;
    }
  };

  const getReminderStyle = (reminder: Reminder) => {
    if (reminder.isCompleted) {
      return "bg-green-50 border-2 border-green-200";
    }
    
    const now = new Date();
    const reminderTime = new Date();
    const [hours, minutes] = reminder.reminderTime.split(':');
    reminderTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (reminderTime <= now) {
      return "bg-yellow-50 border-2 border-yellow-200";
    }
    
    return "bg-blue-50 border-2 border-blue-200";
  };

  const getIconStyle = (reminder: Reminder) => {
    if (reminder.isCompleted) {
      return "w-16 h-16 bg-green-500 rounded-full flex items-center justify-center";
    }
    
    const now = new Date();
    const reminderTime = new Date();
    const [hours, minutes] = reminder.reminderTime.split(':');
    reminderTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (reminderTime <= now) {
      return "w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse";
    }
    
    return "w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center";
  };

  const getTimeText = (reminder: Reminder) => {
    if (reminder.isCompleted) {
      return "Completado";
    }
    
    const now = new Date();
    const reminderTime = new Date();
    const [hours, minutes] = reminder.reminderTime.split(':');
    reminderTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (reminderTime <= now) {
      return `${reminder.reminderTime} - ¡Es hora!`;
    }
    
    const diff = reminderTime.getTime() - now.getTime();
    const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
    const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hoursLeft > 0) {
      return `${reminder.reminderTime} - En ${hoursLeft}h ${minutesLeft}min`;
    } else {
      return `${reminder.reminderTime} - En ${minutesLeft} minutos`;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="elderly-text text-muted-foreground">Cargando recordatorios...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:ml-64" data-testid="page-elderly-reminders">
      <div className="max-w-3xl mx-auto mobile-padding">
        <Card className="shadow-lg border-border">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <Link href="/">
                  <Button className="elderly-button bg-secondary hover:bg-secondary/80 text-secondary-foreground px-6" data-testid="button-back">
                    <ArrowLeft size={20} className="mr-2" /> Volver
                  </Button>
                </Link>
                <div>
                  <h1 className="responsive-text-3xl font-bold text-foreground" data-testid="title">
                    Recordatorios Próximos
                  </h1>
                  <p className="responsive-text-xl text-muted-foreground" data-testid="date">
                    {currentDate}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="responsive-text-3xl font-bold text-primary" data-testid="current-time">
                  {currentTime}
                </div>
                <div className="responsive-text-lg text-muted-foreground">Hora actual</div>
              </div>
            </div>

            <div className="space-y-6" data-testid="reminders-list">
              {sortedDates.length === 0 ? (
                <div className="text-center py-12">
                  <Clock size={48} className="text-muted-foreground mx-auto mb-4" />
                  <h3 className="responsive-text-2xl font-semibold text-foreground mb-2">
                    No hay recordatorios próximos
                  </h3>
                  <p className="elderly-text text-muted-foreground">
                    ¡Disfruta de tu tiempo libre!
                  </p>
                </div>
              ) : (
                sortedDates.map((dateKey) => (
                  <div key={dateKey} className="space-y-4">
                    <h2 className="responsive-text-2xl font-bold text-primary bg-primary/10 px-4 py-2 rounded-lg">
                      {formatDate(dateKey === "recurring" ? null : dateKey)}
                    </h2>
                    {groupedReminders[dateKey].map((reminder: Reminder) => (
                      <div
                        key={reminder.id}
                        className={`${getReminderStyle(reminder)} rounded-2xl p-6`}
                        data-testid={`reminder-${reminder.id}`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={getIconStyle(reminder)} data-testid={`reminder-icon-${reminder.id}`}>
                            {reminder.isCompleted ? (
                              <Check size={24} className="text-white" />
                            ) : (
                              getIcon(reminder.type)
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="responsive-text-2xl font-bold mb-1" data-testid={`reminder-title-${reminder.id}`}>
                              {reminder.isCompleted ? "✓ " : ""}{reminder.title}
                            </h3>
                            <p className="responsive-text-lg mb-1" data-testid={`reminder-time-${reminder.id}`}>
                              {reminder.reminderTime}
                            </p>
                            {reminder.description && (
                              <p className="responsive-text-lg mb-2" data-testid={`reminder-description-${reminder.id}`}>
                                {reminder.description}
                              </p>
                            )}
                            {!reminder.isCompleted && (
                              <Button
                                onClick={() => markCompleteMutation.mutate(reminder.id)}
                                disabled={markCompleteMutation.isPending}
                                className="mt-3 elderly-button bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl"
                                data-testid={`button-complete-${reminder.id}`}
                              >
                                <Check size={24} className="mr-2" />
                                Marcar como Completado
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 p-6 bg-accent rounded-2xl" data-testid="status-message">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check size={24} className="text-primary-foreground" />
                </div>
                <p className="responsive-text-xl font-semibold text-accent-foreground">¡Todo está en orden!</p>
                <p className="responsive-text-lg text-muted-foreground">Tu familia está pendiente de ti</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
