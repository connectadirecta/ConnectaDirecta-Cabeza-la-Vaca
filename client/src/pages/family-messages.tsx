
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageCircle, Send, Heart, Mail, Image, X, ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Message } from "@shared/schema";

export default function FamilyMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get the assigned elderly user from preferences
  const elderlyUserId = user?.preferences?.elderlyUserId;
  
  const [newMessage, setNewMessage] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["/api/messages", elderlyUserId],
    enabled: !!elderlyUserId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, images }: { content: string; images: File[] }) => {
      let attachments: string[] = [];
      
      // Convert images to base64 for display
      if (images.length > 0) {
        for (const image of images) {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result) {
                resolve(e.target.result as string);
              } else {
                reject(new Error('No se pudo leer la imagen'));
              }
            };
            reader.onerror = () => reject(new Error('Error al leer la imagen'));
            reader.readAsDataURL(image);
          });
          attachments.push(base64);
        }
      }
      
      const messageData = {
        fromUserId: user?.id || "",
        toUserId: elderlyUserId,
        content: content,
        messageType: images.length > 0 ? "image" : "text",
        attachments: attachments.length > 0 ? attachments : undefined
      };

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messageData),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", elderlyUserId] });
      toast({
        title: "Mensaje enviado",
        description: "Tu mensaje ha sido enviado correctamente",
      });
      setNewMessage("");
      setSelectedImages([]);
      setPreviews([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length > 5) {
      toast({
        title: "Límite de imágenes",
        description: "Puedes enviar máximo 5 imágenes por mensaje",
        variant: "destructive",
      });
      return;
    }

    setSelectedImages(prev => [...prev, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviews(prev => [...prev, e.target?.result as string]);
        }
      };
      reader.onerror = () => {
        toast({
          title: "Error",
          description: "No se pudo cargar la imagen",
          variant: "destructive",
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && selectedImages.length === 0) return;
    
    sendMessageMutation.mutate({ 
      content: newMessage || (selectedImages.length > 0 ? "📷 Imagen compartida" : ""), 
      images: selectedImages 
    });
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "Fecha no disponible";
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 md:ml-64">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="responsive-text-lg text-muted-foreground">Cargando mensajes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:ml-64" data-testid="page-family-messages">
      <div className="max-w-4xl mx-auto space-y-6 mobile-padding">
        <Card className="shadow-lg border-border mobile-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
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
                    Mensajes Familiares
                  </h1>
                  <p className="responsive-text text-muted-foreground">Envía mensajes de amor y apoyo</p>
                </div>
              </div>
              <Heart className="text-red-500" size={32} />
            </div>

            {/* Send message form */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <h2 className="responsive-text-xl font-semibold mb-4">Enviar Nuevo Mensaje</h2>
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <Textarea
                    placeholder="Escribe tu mensaje aquí... Comparte noticias, fotos o simplemente dile que lo quieres"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="min-h-24 responsive-text"
                    data-testid="message-input"
                  />
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-4">
                      <Label htmlFor="image-upload" className="responsive-text font-medium">
                        Agregar Fotos (máximo 5):
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        className="responsive-text"
                        onClick={() => document.getElementById('image-upload')?.click()}
                      >
                        <Image size={16} className="mr-2" />
                        Seleccionar Fotos
                      </Button>
                    </div>
                    
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />

                    {previews.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {previews.map((preview, index) => (
                          <div key={index} className="relative">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                              onClick={() => removeImage(index)}
                            >
                              <X size={12} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={(!newMessage.trim() && selectedImages.length === 0) || sendMessageMutation.isPending}
                    className="bg-primary text-primary-foreground responsive-text"
                    data-testid="send-button"
                  >
                    <Send size={16} className="mr-2" />
                    {sendMessageMutation.isPending ? "Enviando..." : "Enviar Mensaje"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Messages history */}
            <div className="space-y-4" data-testid="messages-history">
              <h2 className="responsive-text-xl font-semibold">Historial de Mensajes</h2>
              
              {!Array.isArray(messages) || messages.length === 0 ? (
                <div className="text-center py-12">
                  <Mail size={48} className="text-muted-foreground mx-auto mb-4" />
                  <h3 className="responsive-text-xl font-semibold text-foreground mb-2">
                    No hay mensajes aún
                  </h3>
                  <p className="responsive-text text-muted-foreground">
                    Envía el primer mensaje para comenzar
                  </p>
                </div>
              ) : (
                Array.isArray(messages) && messages.map((message: Message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg border-2 ${
                      message.fromUserId === user?.id
                        ? "bg-blue-50 border-blue-200 ml-8"
                        : "bg-gray-50 border-gray-200 mr-8"
                    }`}
                    data-testid={`message-${message.id}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        message.fromUserId === user?.id ? "bg-blue-500" : "bg-gray-500"
                      }`}>
                        <MessageCircle className="text-white" size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium responsive-text">
                            {message.fromUserId === user?.id ? "Tú" : "Respuesta"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(message.createdAt)}
                          </span>
                        </div>
                        <p className="responsive-text text-foreground leading-relaxed">
                          {message.content}
                        </p>
                        {message.messageType === "image" && message.attachments && message.attachments.length > 0 && (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {message.attachments.map((attachment: string, idx: number) => (
                              <img
                                key={idx}
                                src={attachment}
                                alt="Imagen compartida"
                                className="w-full h-32 object-cover rounded-lg border"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ))}
                          </div>
                        )}
                        {message.isRead && message.fromUserId === user?.id && (
                          <span className="text-sm text-green-600 mt-1 block">
                            ✓ Leído
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 p-4 bg-green-50 border-2 border-green-200 rounded-lg" data-testid="tips">
              <h3 className="font-semibold text-green-800 mb-2 responsive-text">💡 Consejos para mensajes</h3>
              <ul className="text-sm text-green-700 space-y-1 responsive-text">
                <li>• Comparte momentos especiales y fotos familiares</li>
                <li>• Pregunta cómo se siente y escucha sus respuestas</li>
                <li>• Recuerda eventos importantes y fechas especiales</li>
                <li>• Envía mensajes regulares para mantener el contacto</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
