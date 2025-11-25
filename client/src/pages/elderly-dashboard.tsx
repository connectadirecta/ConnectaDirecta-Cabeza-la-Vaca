import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Clock, Mail, Brain, Settings } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Footer } from "@/components/footer";

// Helper function to check if user is active
const isUserActive = () => {
  // Placeholder for actual active status check
  return true;
};

export default function ElderlyDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [helpCooldown, setHelpCooldown] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [consents, setConsents] = useState({ familyConsent: false, personalConsent: false });

  // Log consent state changes for debugging
  useEffect(() => {
    console.log("[ElderlyDashboard] Local consents state updated:", consents);
  }, [consents]);

  // Fetch user consents if user exists
  const { data: userConsents, isLoading: isLoadingConsents } = useQuery({
    queryKey: ["/api/users/me/consents", user?.id],
    queryFn: async () => {
      console.log("[ElderlyDashboard] Fetching consents for user:", user?.id);
      const response = await apiRequest("GET", `/api/users/me/consents/${user?.id}`);
      const data = await response.json();
      console.log("[ElderlyDashboard] Raw API response from server:", data);
      console.log("[ElderlyDashboard] Response type:", typeof data);
      console.log("[ElderlyDashboard] Response keys:", Object.keys(data));
      return data;
    },
    enabled: !!user?.id,
  });

  // Update local state when data is fetched
  useEffect(() => {
    console.log("[ElderlyDashboard] useEffect triggered - userConsents changed:", userConsents);
    console.log("[ElderlyDashboard] useEffect triggered - isLoadingConsents:", isLoadingConsents);
    console.log("[ElderlyDashboard] useEffect triggered - userConsents type:", typeof userConsents);
    console.log("[ElderlyDashboard] useEffect triggered - userConsents is object:", typeof userConsents === 'object');
    console.log("[ElderlyDashboard] useEffect triggered - userConsents is null:", userConsents === null);

    if (userConsents && typeof userConsents === 'object') {
      console.log("[ElderlyDashboard] Processing consent data from API:");
      console.log("[ElderlyDashboard] Complete userConsents object:", JSON.stringify(userConsents, null, 2));
      console.log("  - familyConsent:", userConsents.familyConsent, "- type:", typeof userConsents.familyConsent, "- boolean check:", userConsents.familyConsent === true);
      console.log("  - personalConsent:", userConsents.personalConsent, "- type:", typeof userConsents.personalConsent, "- boolean check:", userConsents.personalConsent === true);

      const newConsents = {
        familyConsent: userConsents.familyConsent === true,
        personalConsent: userConsents.personalConsent === true,
      };

      console.log("[ElderlyDashboard] Setting local consents to:", newConsents);
      setConsents(newConsents);
    } else if (!isLoadingConsents) {
      console.log("[ElderlyDashboard] No valid consent data available, setting defaults");
      setConsents({
        familyConsent: false,
        personalConsent: false
      });
    }
  }, [userConsents, isLoadingConsents]);

  // Mutation to update user consents
  const { mutate: updateConsents, isPending: isUpdatingConsents } = useMutation({
    mutationFn: (updatedConsents) => apiRequest("PUT", "/api/users/me/consents", updatedConsents),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/consents"] });
      toast({
        title: "Consentimientos actualizados",
        description: "Tus preferencias de privacidad se han guardado correctamente.",
        className: "bg-green-50 border-green-200",
      });
      setShowSettingsDialog(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron guardar tus preferencias. Intenta de nuevo.",
        variant: "destructive",
      });
    },
  });

  const handleSaveConsents = () => {
    if (!isUpdatingConsents && user?.id) {
      updateConsents({
        userId: user.id,
        familyConsent: consents.familyConsent,
        personalConsent: consents.personalConsent
      });
    }
  };

  // Get today's reminders count
  const { data: todayReminders } = useQuery({
    queryKey: ["/api/reminders", user?.id, "today"],
    enabled: !!user?.id,
  });

  // Get unread messages count
  const { data: messages } = useQuery({
    queryKey: ["/api/messages", user?.id],
    enabled: !!user?.id,
  });

  const unreadCount = Array.isArray(messages) ? messages.filter((msg: any) => !msg.isRead && msg.toUserId === user?.id).length : 0;
  const reminderCount = Array.isArray(todayReminders) ? todayReminders.length : 0;

  // Help alert mutation
  const { mutate: sendHelpAlert, isPending: isHelpAlertPending } = useMutation({
    mutationFn: () => apiRequest("POST", "/api/help/alert", { userId: user?.id }),
    onSuccess: () => {
      toast({
        title: "Ayuda enviada",
        description: "El personal ha sido avisado y se pondrá en contacto pronto.",
        className: "bg-green-50 border-green-200",
      });
      // Set 10 second cooldown
      setHelpCooldown(true);
      setTimeout(() => setHelpCooldown(false), 10000);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo enviar la alerta. Intente de nuevo.",
        variant: "destructive",
      });
    },
  });

  const handleHelpAlert = () => {
    if (!helpCooldown && !isHelpAlertPending) {
      sendHelpAlert();
    }
  };

  const currentTime = new Date().toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Determine if family-related content should be visible
  const isFamilyContentVisible = consents.familyConsent;
  const isPersonalContentVisible = consents.personalConsent;

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:ml-64" data-testid="page-elderly-dashboard">
      <div className="max-w-6xl mx-auto mobile-padding">
        <Card className="shadow-lg border-border mb-6">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="flex justify-between items-start mb-8">
              <div className="text-center flex-1">
                <h1 className="responsive-text-3xl font-bold text-foreground mb-2" data-testid="greeting">
                  Hola, {user?.firstName}
                </h1>
                <p className="responsive-text-xl text-muted-foreground">¿Qué te gustaría hacer hoy?</p>
              </div>

              <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="px-4 py-2 rounded-lg hover:bg-accent/80 transition-colors"
                    data-testid="button-settings"
                  >
                    <Settings size={16} className="mr-2" />
                    Ajustes
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center">
                      <Settings className="text-gray-500 mr-2" size={24} />
                      Ajustes de Privacidad
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                      Puedes cambiar estos consentimientos en cualquier momento. Los cambios se aplicarán inmediatamente.
                    </p>

                    <div className="space-y-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <Label htmlFor="family-consent-settings" className="text-sm text-blue-800 leading-relaxed font-medium">
                            Permitir que mis familiares vean mi información de actividad (citas, estado de ánimo, medicamentos)
                          </Label>
                          <p className="text-xs text-blue-600 mt-1">
                            Si está desactivado, tus familiares no podrán ver tu progreso detallado
                          </p>
                        </div>
                        <Switch
                          id="family-consent-settings"
                          checked={consents.familyConsent}
                          onCheckedChange={(checked) =>
                            setConsents(prev => ({ ...prev, familyConsent: checked }))
                          }
                          data-testid="switch-family-consent-settings"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 p-4 border border-green-200 rounded-lg bg-green-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <Label htmlFor="personal-consent-settings" className="text-sm text-green-800 leading-relaxed font-medium">
                            Permitir que el personal municipal vea mis datos para organizar servicios y actividades
                          </Label>
                          <p className="text-xs text-green-600 mt-1">
                            Si está desactivado, no aparecerás en las estadísticas del personal municipal
                          </p>
                        </div>
                        <Switch
                          id="personal-consent-settings"
                          checked={consents.personalConsent}
                          onCheckedChange={(checked) =>
                            setConsents(prev => ({ ...prev, personalConsent: checked }))
                          }
                          data-testid="switch-personal-consent-settings"
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-2">Información sobre tus derechos</h4>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p>• Tienes derecho a acceder, rectificar y suprimir tus datos personales</p>
                        <p>• Puedes revocar estos consentimientos en cualquier momento</p>
                        <p>• Para ejercer tus derechos, contacta con el personal municipal</p>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowSettingsDialog(false)}
                        data-testid="button-cancel-settings"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSaveConsents}
                        disabled={isUpdatingConsents}
                        data-testid="button-save-settings"
                      >
                        {isUpdatingConsents ? "Guardando..." : "Guardar Cambios"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mobile-grid-2">
              <Link href="/chat">
                <Button className="elderly-large-button bg-primary hover:bg-primary/90 text-primary-foreground w-full group h-auto" data-testid="button-chat">
                  <div className="flex flex-col items-center space-y-4 py-4">
                    <MessageCircle size={48} className="group-hover:scale-110 transition-transform" />
                    <div className="text-center space-y-1">
                      <span className="responsive-text-2xl font-bold block">Hablar con Asistente</span>
                      <p className="responsive-text-lg opacity-90">Conversa conmigo</p>
                    </div>
                  </div>
                </Button>
              </Link>

              <Link href="/memory-exercises">
                <Button className="elderly-large-button bg-purple-500 hover:bg-purple-600 text-white w-full group h-auto" data-testid="button-memory">
                  <div className="flex flex-col items-center space-y-4 py-4">
                    <Brain size={48} className="group-hover:scale-110 transition-transform" />
                    <div className="text-center space-y-1">
                      <span className="responsive-text-2xl font-bold block">Ejercicios Memoria</span>
                      <p className="responsive-text-lg opacity-90">Entrena tu mente</p>
                    </div>
                  </div>
                </Button>
              </Link>

              <Link href="/reminders">
                <Button className="elderly-large-button bg-accent hover:bg-accent/80 text-accent-foreground w-full group h-auto" data-testid="button-reminders">
                  <div className="flex flex-col items-center space-y-4 relative py-4">
                    <Clock size={48} className="text-primary group-hover:scale-110 transition-transform" />
                    <div className="text-center space-y-1">
                      <span className="responsive-text-2xl font-bold block">Recordatorios</span>
                      <p className="responsive-text-lg opacity-75">Ver citas y medicinas</p>
                    </div>
                    {reminderCount > 0 && (
                      <div className="absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full w-10 h-10 flex items-center justify-center responsive-text-lg font-bold" data-testid="reminder-badge">
                        {reminderCount}
                      </div>
                    )}
                  </div>
                </Button>
              </Link>

              <Link href="/messages">
                <Button className="elderly-large-button bg-secondary hover:bg-secondary/80 text-secondary-foreground w-full group h-auto" data-testid="button-messages">
                <div className="flex flex-col items-center space-y-4 relative py-4">
                  <Mail size={48} className="text-primary group-hover:scale-110 transition-transform" />
                  <div className="text-center space-y-1">
                    <span className="responsive-text-2xl font-bold block">Mensajes Familia</span>
                    <p className="responsive-text-lg opacity-75">Lee mensajes y fotos</p>
                  </div>
                  {unreadCount > 0 && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center responsive-text-lg font-bold" data-testid="message-badge">
                      {unreadCount}
                    </div>
                  )}
                </div>
              </Button>
              </Link>

              <Button
                className="elderly-large-button bg-orange-500 hover:bg-orange-600 text-white w-full group h-auto"
                onClick={handleHelpAlert}
                disabled={isHelpAlertPending || helpCooldown}
                data-testid="button-help"
              >
                <div className="flex flex-col items-center space-y-4 py-4">
                  <Clock size={48} className="group-hover:scale-110 transition-transform" />
                  <div className="text-center space-y-1">
                    <span className="responsive-text-2xl font-bold block">
                      {helpCooldown ? "Ayuda enviada" : "Ayuda profesional"}
                    </span>
                    <p className="responsive-text-lg opacity-90">
                      {helpCooldown ? "Personal avisado" : "Avisar al personal"}
                    </p>
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
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
              <span className="elderly-text text-muted-foreground" data-testid="current-time">
                Hoy, {currentTime}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}