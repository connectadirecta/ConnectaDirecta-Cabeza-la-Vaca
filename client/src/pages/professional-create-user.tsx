import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, User, Save, Lock, Phone, Heart } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function ProfessionalCreateUser() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    username: "",
    pin: "",
    firstName: "",
    lastName: "",
    age: "",
    cognitiveLevel: "normal",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContact: "",
    medicalConditions: "",
    medications: "",
    // Biographical information for reminiscence
    birthPlace: "",
    childhoodHome: "",
    childhoodMemories: "",
    familyBackground: "",
    siblings: "",
    parents: "",
    significantLife: "",
    profession: "",
    hobbies: "",
    favoriteMemories: "",
    preferences: {
      preferredCallTime: "afternoon",
      likes: [],
      dislikes: [],
      hobbies: []
    },
    personalityTraits: {
      mood: "",
      communicationStyle: "",
      concerns: [],
      strengths: [],
      cognitiveNotes: ""
    }
  });

  const [consents, setConsents] = useState({
    termsAccepted: false,
    familyConsent: false,
    personalConsent: false
  });

  const createElderlyUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const municipalityId = localStorage.getItem("selectedMunicipality");
      if (!municipalityId) {
        throw new Error("No se ha seleccionado un municipio");
      }
      const response = await apiRequest("POST", "/api/professional/create-elderly-user", {
        professionalId: user?.id,
        municipalityId,
        ...userData,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuario creado exitosamente",
        description: "El nuevo usuario se ha registrado en el sistema",
      });
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    },
    onError: () => {
      toast({
        title: "Error al crear usuario",
        description: "No se pudo crear el usuario. Intente nuevamente",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as any,
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.pin || !formData.firstName || !formData.lastName) {
      toast({
        title: "Campos requeridos",
        description: "Por favor complete todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    if (formData.pin.length !== 4 || !/^\d+$/.test(formData.pin)) {
      toast({
        title: "PIN inválido",
        description: "El PIN debe ser exactamente 4 dígitos",
        variant: "destructive",
      });
      return;
    }

    if (!consents.termsAccepted) {
      toast({
        title: "Términos de servicio",
        description: "Debe aceptar los términos de servicio para continuar",
        variant: "destructive",
      });
      return;
    }

    const userData = {
      ...formData,
      age: parseInt(formData.age) || 0,
      familyConsent: consents.familyConsent,
      personalConsent: consents.personalConsent,
      medicalConditions: formData.medicalConditions.split(',').filter(Boolean).map(s => s.trim()),
      medications: formData.medications.split(',').filter(Boolean).map(s => s.trim()),
      preferences: {
        ...formData.preferences,
        likes: typeof formData.preferences.likes === 'string' 
          ? (formData.preferences.likes as string).split(',').filter(Boolean).map((s: string) => s.trim())
          : formData.preferences.likes,
        dislikes: typeof formData.preferences.dislikes === 'string'
          ? (formData.preferences.dislikes as string).split(',').filter(Boolean).map((s: string) => s.trim())
          : formData.preferences.dislikes,
        hobbies: typeof formData.preferences.hobbies === 'string'
          ? (formData.preferences.hobbies as string).split(',').filter(Boolean).map((s: string) => s.trim())
          : formData.preferences.hobbies
      },
      personalityTraits: {
        ...formData.personalityTraits,
        concerns: typeof formData.personalityTraits.concerns === 'string'
          ? (formData.personalityTraits.concerns as string).split(',').filter(Boolean).map((s: string) => s.trim())
          : formData.personalityTraits.concerns,
        strengths: typeof formData.personalityTraits.strengths === 'string'
          ? (formData.personalityTraits.strengths as string).split(',').filter(Boolean).map((s: string) => s.trim())
          : formData.personalityTraits.strengths
      }
    };

    createElderlyUserMutation.mutate(userData);
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <SidebarTrigger className="mr-2" />
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
              Crear Nuevo Usuario Mayor
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información de Acceso */}
            <Card data-testid="card-access-info">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock size={20} className="mr-2 text-blue-500" />
                  Información de Acceso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nombre de Usuario *</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => handleInputChange("username", e.target.value)}
                    placeholder="nombre.apellido"
                    data-testid="input-username"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    El usuario usará este nombre para identificarse
                  </p>
                </div>

                <div>
                  <Label>PIN de Acceso (4 dígitos) *</Label>
                  <Input
                    type="text"
                    maxLength={4}
                    value={formData.pin}
                    onChange={(e) => handleInputChange("pin", e.target.value)}
                    placeholder="1234"
                    data-testid="input-pin"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    PIN de 4 dígitos que el usuario usará para acceder
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Información Personal */}
            <Card data-testid="card-personal-info">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User size={20} className="mr-2 text-green-500" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre *</Label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      placeholder="María"
                      data-testid="input-first-name"
                      required
                    />
                  </div>
                  <div>
                    <Label>Apellidos *</Label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      placeholder="González"
                      data-testid="input-last-name"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Edad</Label>
                    <Input
                      type="number"
                      value={formData.age}
                      onChange={(e) => handleInputChange("age", e.target.value)}
                      placeholder="75"
                      data-testid="input-age"
                    />
                  </div>
                  <div>
                    <Label>Nivel Cognitivo</Label>
                    <Select 
                      value={formData.cognitiveLevel} 
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
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contacto de Emergencia */}
            <Card data-testid="card-emergency-contact">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone size={20} className="mr-2 text-red-500" />
                  Contacto de Emergencia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nombre del Contacto</Label>
                  <Input
                    value={formData.emergencyContactName}
                    onChange={(e) => handleInputChange("emergencyContactName", e.target.value)}
                    placeholder="Ana González"
                    data-testid="input-emergency-name"
                  />
                </div>

                <div>
                  <Label>Teléfono del Contacto</Label>
                  <Input
                    value={formData.emergencyContactPhone}
                    onChange={(e) => handleInputChange("emergencyContactPhone", e.target.value)}
                    placeholder="666-123-456"
                    data-testid="input-emergency-phone"
                  />
                </div>

                <div>
                  <Label>Información Completa</Label>
                  <Input
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange("emergencyContact", e.target.value)}
                    placeholder="Ana González (hija) - 666-123-456"
                    data-testid="input-emergency-full"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Información Médica */}
            <Card data-testid="card-medical-info">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart size={20} className="mr-2 text-orange-500" />
                  Información Médica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Condiciones Médicas</Label>
                  <Textarea
                    value={formData.medicalConditions}
                    onChange={(e) => handleInputChange("medicalConditions", e.target.value)}
                    placeholder="Hipertensión, Diabetes tipo 2, Artritis (separar con comas)"
                    rows={3}
                    data-testid="textarea-medical-conditions"
                  />
                </div>

                <div>
                  <Label>Medicamentos</Label>
                  <Textarea
                    value={formData.medications}
                    onChange={(e) => handleInputChange("medications", e.target.value)}
                    placeholder="Metformina, Enalapril, Paracetamol (separar con comas)"
                    rows={3}
                    data-testid="textarea-medications"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Información Biográfica para Reminiscencia */}
            <Card className="md:col-span-2" data-testid="card-biographical-info">
              <CardHeader>
                <CardTitle>Información Biográfica para Reminiscencia</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Datos importantes de la vida del usuario para ejercicios de memoria y conversaciones significativas
                </p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Lugar de Nacimiento</Label>
                    <Input
                      value={formData.birthPlace}
                      onChange={(e) => handleInputChange("birthPlace", e.target.value)}
                      placeholder="Madrid, España"
                      data-testid="input-birth-place"
                    />
                  </div>

                  <div>
                    <Label>Hogar de Infancia</Label>
                    <Textarea
                      value={formData.childhoodHome}
                      onChange={(e) => handleInputChange("childhoodHome", e.target.value)}
                      placeholder="Casa en el campo con jardín grande..."
                      rows={2}
                      data-testid="textarea-childhood-home"
                    />
                  </div>

                  <div>
                    <Label>Recuerdos de Infancia</Label>
                    <Textarea
                      value={formData.childhoodMemories}
                      onChange={(e) => handleInputChange("childhoodMemories", e.target.value)}
                      placeholder="Jugaba con sus hermanos en el río, ayudaba a su madre en la cocina..."
                      rows={3}
                      data-testid="textarea-childhood-memories"
                    />
                  </div>

                  <div>
                    <Label>Información sobre Hermanos</Label>
                    <Textarea
                      value={formData.siblings}
                      onChange={(e) => handleInputChange("siblings", e.target.value)}
                      placeholder="Dos hermanas mayores (María y Carmen), un hermano menor (José)..."
                      rows={2}
                      data-testid="textarea-siblings"
                    />
                  </div>

                  <div>
                    <Label>Información sobre Padres</Label>
                    <Textarea
                      value={formData.parents}
                      onChange={(e) => handleInputChange("parents", e.target.value)}
                      placeholder="Padre era carpintero, madre costurera, muy cariñosos..."
                      rows={2}
                      data-testid="textarea-parents"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Historia Familiar</Label>
                    <Textarea
                      value={formData.familyBackground}
                      onChange={(e) => handleInputChange("familyBackground", e.target.value)}
                      placeholder="Familia originaria de Valencia, emigraron a Madrid en los años 50..."
                      rows={3}
                      data-testid="textarea-family-background"
                    />
                  </div>

                  <div>
                    <Label>Eventos Significativos de Vida</Label>
                    <Textarea
                      value={formData.significantLife}
                      onChange={(e) => handleInputChange("significantLife", e.target.value)}
                      placeholder="Boda en 1965, nacimiento de hijos, viaje a América..."
                      rows={3}
                      data-testid="textarea-significant-life"
                    />
                  </div>

                  <div>
                    <Label>Profesión/Trabajo</Label>
                    <Textarea
                      value={formData.profession}
                      onChange={(e) => handleInputChange("profession", e.target.value)}
                      placeholder="Maestra de primaria durante 30 años, trabajó en varios colegios..."
                      rows={2}
                      data-testid="textarea-profession"
                    />
                  </div>

                  <div>
                    <Label>Recuerdos Favoritos</Label>
                    <Textarea
                      value={formData.favoriteMemories}
                      onChange={(e) => handleInputChange("favoriteMemories", e.target.value)}
                      placeholder="Veranos en la playa con los nietos, las fiestas del pueblo..."
                      rows={3}
                      data-testid="textarea-favorite-memories"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preferencias y Personalidad (para IA) */}
            <Card className="md:col-span-2" data-testid="card-ai-info">
              <CardHeader>
                <CardTitle>Información para el Asistente de IA</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Esta información ayudará al asistente a personalizar las interacciones
                </p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Horario Preferido de Llamadas</Label>
                    <Select 
                      value={formData.preferences.preferredCallTime} 
                      onValueChange={(value) => handleInputChange("preferences.preferredCallTime", value)}
                    >
                      <SelectTrigger data-testid="select-call-time">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Mañana</SelectItem>
                        <SelectItem value="afternoon">Tarde</SelectItem>
                        <SelectItem value="evening">Noche</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Gustos y Preferencias</Label>
                    <Textarea
                      value={formData.preferences.likes}
                      onChange={(e) => handleInputChange("preferences.likes", e.target.value)}
                      placeholder="Jardinería, cocina, telenovelas (separar con comas)"
                      rows={2}
                      data-testid="textarea-likes"
                    />
                  </div>

                  <div>
                    <Label>Cosas que No Le Gustan</Label>
                    <Textarea
                      value={formData.preferences.dislikes}
                      onChange={(e) => handleInputChange("preferences.dislikes", e.target.value)}
                      placeholder="Ruido fuerte, luces brillantes (separar con comas)"
                      rows={2}
                      data-testid="textarea-dislikes"
                    />
                  </div>

                  <div>
                    <Label>Hobbies</Label>
                    <Textarea
                      value={formData.preferences.hobbies}
                      onChange={(e) => handleInputChange("preferences.hobbies", e.target.value)}
                      placeholder="Tejer, leer, ver televisión (separar con comas)"
                      rows={2}
                      data-testid="textarea-hobbies"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Estado de Ánimo General</Label>
                    <Input
                      value={formData.personalityTraits.mood}
                      onChange={(e) => handleInputChange("personalityTraits.mood", e.target.value)}
                      placeholder="Alegre y sociable"
                      data-testid="input-mood"
                    />
                  </div>

                  <div>
                    <Label>Estilo de Comunicación</Label>
                    <Input
                      value={formData.personalityTraits.communicationStyle}
                      onChange={(e) => handleInputChange("personalityTraits.communicationStyle", e.target.value)}
                      placeholder="Cariñosa y conversadora"
                      data-testid="input-communication"
                    />
                  </div>

                  <div>
                    <Label>Preocupaciones</Label>
                    <Textarea
                      value={formData.personalityTraits.concerns}
                      onChange={(e) => handleInputChange("personalityTraits.concerns", e.target.value)}
                      placeholder="Salud, familia, soledad (separar con comas)"
                      rows={2}
                      data-testid="textarea-concerns"
                    />
                  </div>

                  <div>
                    <Label>Fortalezas</Label>
                    <Textarea
                      value={formData.personalityTraits.strengths}
                      onChange={(e) => handleInputChange("personalityTraits.strengths", e.target.value)}
                      placeholder="Optimista, determinada, cariñosa (separar con comas)"
                      rows={2}
                      data-testid="textarea-strengths"
                    />
                  </div>

                  <div>
                    <Label>Notas Cognitivas</Label>
                    <Textarea
                      value={formData.personalityTraits.cognitiveNotes}
                      onChange={(e) => handleInputChange("personalityTraits.cognitiveNotes", e.target.value)}
                      placeholder="Memoria excelente para eventos pasados, a veces olvida cosas recientes"
                      rows={3}
                      data-testid="textarea-cognitive-notes"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Términos de Servicio y Consentimientos */}
            <Card className="md:col-span-2" data-testid="card-terms-consent">
              <CardHeader>
                <CardTitle>Términos de Servicio y Consentimientos</CardTitle>
                <p className="text-sm text-muted-foreground">
                  De acuerdo con el RGPD, necesitamos obtener consentimientos específicos para el uso de la plataforma
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Términos obligatorios */}
                <div className="space-y-4 p-4 border border-red-200 rounded-lg bg-red-50">
                  <h3 className="font-semibold text-red-800">Consentimiento Obligatorio</h3>
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms-required"
                      checked={consents.termsAccepted}
                      onCheckedChange={(checked) => 
                        setConsents(prev => ({ ...prev, termsAccepted: checked as boolean }))
                      }
                      data-testid="checkbox-terms-required"
                    />
                    <Label htmlFor="terms-required" className="text-sm text-red-800 leading-relaxed">
                      He leído y acepto la Política de Privacidad y los Términos de Servicio para usar la plataforma. 
                      <span className="text-red-600 font-medium"> (Obligatorio)</span>
                    </Label>
                  </div>
                  <p className="text-xs text-red-600 ml-6">
                    Este consentimiento es necesario para poder utilizar el servicio
                  </p>
                </div>

                {/* Consentimientos opcionales */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Consentimientos Opcionales</h3>
                  <p className="text-sm text-muted-foreground">
                    Estos consentimientos son opcionales y pueden modificarse en cualquier momento desde los ajustes
                  </p>

                  <div className="space-y-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="family-consent"
                        checked={consents.familyConsent}
                        onCheckedChange={(checked) => 
                          setConsents(prev => ({ ...prev, familyConsent: checked as boolean }))
                        }
                        data-testid="checkbox-family-consent"
                      />
                      <Label htmlFor="family-consent" className="text-sm text-blue-800 leading-relaxed">
                        Doy mi consentimiento para que la información de mi actividad (citas, estado de ánimo, medicamentos) 
                        sea visible para los familiares que yo autorice.
                        <span className="text-blue-600 font-medium"> (Opcional)</span>
                      </Label>
                    </div>
                    <p className="text-xs text-blue-600 ml-6">
                      Permite a los familiares ver tu progreso y actividad para mejor cuidado
                    </p>
                  </div>

                  <div className="space-y-4 p-4 border border-green-200 rounded-lg bg-green-50">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="personal-consent"
                        checked={consents.personalConsent}
                        onCheckedChange={(checked) => 
                          setConsents(prev => ({ ...prev, personalConsent: checked as boolean }))
                        }
                        data-testid="checkbox-personal-consent"
                      />
                      <Label htmlFor="personal-consent" className="text-sm text-green-800 leading-relaxed">
                        Doy mi consentimiento para que el personal municipal autorizado pueda ver mis datos de 
                        participación y actividad para ayudarme y organizar eventos.
                        <span className="text-green-600 font-medium"> (Opcional)</span>
                      </Label>
                    </div>
                    <p className="text-xs text-green-600 ml-6">
                      Ayuda al personal a organizar mejor los servicios y actividades municipales
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">Información Importante</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>• Estos consentimientos pueden ser modificados en cualquier momento desde los ajustes del usuario</p>
                    <p>• Solo los consentimientos marcados como "Opcional" pueden ser revocados</p>
                    <p>• La revocación de consentimientos no afecta al procesamiento previo realizado con consentimiento</p>
                    <p>• Puedes contactar con el equipo municipal para ejercer tus derechos sobre datos personales</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.href = "/dashboard"}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createElderlyUserMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-submit"
            >
              <Save size={16} className="mr-2" />
              {createElderlyUserMutation.isPending ? "Creando..." : "Crear Usuario"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}