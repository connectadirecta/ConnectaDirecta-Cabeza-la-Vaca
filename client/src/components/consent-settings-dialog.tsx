
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Shield, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ConsentSettingsDialogProps {
  userId: string;
  children?: React.ReactNode;
}

export default function ConsentSettingsDialog({ userId, children }: ConsentSettingsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [consents, setConsents] = useState({
    familyConsent: false,
    personalConsent: false
  });

  // Fetch current consent status
  const { data: currentConsents, isLoading } = useQuery({
    queryKey: ["/api/users/me/consents", userId],
    queryFn: async () => {
      console.log("[ConsentSettings] Fetching consents for userId:", userId);
      const response = await apiRequest("GET", `/api/users/me/consents/${userId}`);
      const data = await response.json();
      console.log("[ConsentSettings] Raw API response:", data);
      return data;
    },
    enabled: isOpen && !!userId,
  });

  // Set initial values when data is loaded
  useEffect(() => {
    console.log("[ConsentSettings] useEffect triggered with:", { 
      currentConsents, 
      isOpen, 
      isLoading,
      userId 
    });

    if (currentConsents) {
      console.log("[ConsentSettings] Setting consents from API data:");
      console.log("  - familyConsent from API:", currentConsents.familyConsent, typeof currentConsents.familyConsent);
      console.log("  - personalConsent from API:", currentConsents.personalConsent, typeof currentConsents.personalConsent);
      
      const newConsents = {
        familyConsent: currentConsents.familyConsent === true,
        personalConsent: currentConsents.personalConsent === true
      };
      
      console.log("[ConsentSettings] Setting local state to:", newConsents);
      setConsents(newConsents);
    } else if (isOpen && !isLoading) {
      console.log("[ConsentSettings] No consent data available, using defaults");
      setConsents({
        familyConsent: false,
        personalConsent: false
      });
    }
  }, [currentConsents, isOpen, isLoading]);

  // Log current state for debugging
  useEffect(() => {
    console.log("[ConsentSettings] Current local state:", consents);
  }, [consents]);

  const updateConsentsMutation = useMutation({
    mutationFn: async (newConsents: { familyConsent: boolean; personalConsent: boolean }) => {
      console.log("[ConsentSettings] Updating consents:", { userId, ...newConsents });
      const response = await apiRequest("PUT", "/api/users/me/consents", {
        userId,
        familyConsent: newConsents.familyConsent,
        personalConsent: newConsents.personalConsent
      });
      return response.json();
    },
    onSuccess: (data) => {
      console.log("[ConsentSettings] Consents updated successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/consents", userId] });
      toast({
        title: "Ajustes guardados",
        description: "Tus preferencias de consentimiento han sido actualizadas",
      });
      setIsOpen(false);
    },
    onError: (error) => {
      console.error("[ConsentSettings] Error updating consents:", error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los ajustes",
        variant: "destructive",
      });
    },
  });

  const handleConsentChange = (type: 'familyConsent' | 'personalConsent', checked: boolean) => {
    console.log(`[ConsentSettings] Changing ${type} to:`, checked);
    setConsents(prev => ({
      ...prev,
      [type]: checked
    }));
  };

  const handleSave = () => {
    updateConsentsMutation.mutate(consents);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Settings size={16} className="mr-2" />
            Ajustes de Consentimiento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shield size={20} className="mr-2 text-blue-500" />
            Ajustes de Consentimiento
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-20 bg-muted rounded mb-4"></div>
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <Users size={16} className="mr-2 text-green-500" />
                  Consentimiento Familiar
                </CardTitle>
                <CardDescription className="text-sm">
                  Permite que tu familia vea tu información de salud y reciba alertas
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <Label htmlFor="familyConsent" className="text-sm font-medium leading-none">
                    Autorizar acceso familiar
                  </Label>
                  <Switch
                    id="familyConsent"
                    checked={consents.familyConsent}
                    onCheckedChange={(checked) => handleConsentChange('familyConsent', checked)}
                    data-testid="switch-family-consent"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <Shield size={16} className="mr-2 text-blue-500" />
                  Consentimiento Personal
                </CardTitle>
                <CardDescription className="text-sm">
                  Permite que los profesionales accedan a tu información personal y recordatorios
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <Label htmlFor="personalConsent" className="text-sm font-medium leading-none">
                    Autorizar acceso profesional
                  </Label>
                  <Switch
                    id="personalConsent"
                    checked={consents.personalConsent}
                    onCheckedChange={(checked) => handleConsentChange('personalConsent', checked)}
                    data-testid="switch-personal-consent"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex space-x-2">
              <Button 
                onClick={handleSave} 
                disabled={updateConsentsMutation.isPending}
                className="flex-1"
                data-testid="button-save-consents"
              >
                {updateConsentsMutation.isPending ? "Guardando..." : "Guardar Ajustes"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                className="flex-1"
                data-testid="button-cancel-consents"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
