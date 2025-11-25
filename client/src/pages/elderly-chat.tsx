import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Volume2, VolumeX } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTTS } from "@/hooks/useTTS";

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ElderlyChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { available: ttsAvailable, speak, stop, speaking } = useTTS("es-ES");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      content: `¡Hola ${user?.firstName}! ¿Cómo te sientes hoy? Podemos charlar o hacer algunos ejercicios de memoria si quieres.`,
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStartTime] = useState(new Date());
  const [sessionTopics, setSessionTopics] = useState<string[]>([]);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(
    null,
  );

  const quickResponses = [
    "¿Qué día es hoy?",
    "Ejercicio de memoria",
    "¿Cómo está el tiempo?",
    "Contar un chiste",
  ];

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: content,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Call AI API with user context and message history
      const messageHistory = messages.map((msg) => ({
        role: msg.isUser ? ("user" as const) : ("assistant" as const),
        content: msg.content,
      }));

      const response = await apiRequest("POST", "/api/chat/ai", {
        userId: user?.id,
        message: content,
        messageHistory: messageHistory,
      });

      const data = await response.json();

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Auto-speak the AI response if TTS is available
      if (ttsAvailable && data.response) {
        setTimeout(() => {
          stop(); // Stop any current speech
          const success = speak(data.response);
          if (success) {
            setSpeakingMessageId(aiMessage.id);
          }
        }, 500); // Small delay to let UI update
      }

      // Show health alert if detected
      if (data.healthAlert) {
        toast({
          title: "⚠️ Alerta de Salud",
          description: data.healthAlert,
          variant: "destructive",
        });
      }

      // Track topics discussed
      const topic = detectTopic(content);
      if (topic && !sessionTopics.includes(topic)) {
        setSessionTopics((prev) => [...prev, topic]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputMessage);
    }
  };

  const detectTopic = (message: string): string | null => {
    const lowerMessage = message.toLowerCase();
    if (
      lowerMessage.includes("medicina") ||
      lowerMessage.includes("medicamento")
    )
      return "Medicación";
    if (lowerMessage.includes("dolor") || lowerMessage.includes("duele"))
      return "Salud";
    if (lowerMessage.includes("memoria") || lowerMessage.includes("recordar"))
      return "Ejercicio cognitivo";
    if (lowerMessage.includes("triste") || lowerMessage.includes("solo"))
      return "Estado emocional";
    if (lowerMessage.includes("familia") || lowerMessage.includes("hijo"))
      return "Familia";
    if (lowerMessage.includes("comida") || lowerMessage.includes("comer"))
      return "Alimentación";
    return null;
  };

  const saveSession = async () => {
    if (!user?.id || messages.length <= 1) return;

    try {
      const duration = Math.round(
        (new Date().getTime() - sessionStartTime.getTime()) / 60000,
      ); // in minutes

      await apiRequest("POST", "/api/chat", {
        userId: user.id,
        messages: JSON.stringify(messages),
        duration: duration,
        topicsDiscussed: sessionTopics,
        emotionalState: detectEmotionalState(),
        sessionSummary: `Conversación de ${duration} minutos sobre: ${sessionTopics.join(", ") || "charla general"}`,
      });

      toast({
        title: "✅ Sesión guardada",
        description: "La conversación ha sido guardada correctamente",
      });
    } catch (error) {
      console.error("Error saving session:", error);
    }
  };

  const detectEmotionalState = (): string => {
    const userMessages = messages
      .filter((m) => m.isUser)
      .map((m) => m.content.toLowerCase());
    const allText = userMessages.join(" ");

    if (
      allText.includes("triste") ||
      allText.includes("solo") ||
      allText.includes("mal")
    ) {
      return "Necesita apoyo emocional";
    }
    if (
      allText.includes("feliz") ||
      allText.includes("bien") ||
      allText.includes("contento")
    ) {
      return "Estado positivo";
    }
    if (allText.includes("dolor") || allText.includes("duele")) {
      return "Preocupación por salud";
    }
    return "Estado neutro";
  };

  return (
    <div
      className="min-h-screen bg-muted/30 p-4 md:ml-64"
      data-testid="page-elderly-chat"
    >
      <div className="max-w-4xl mx-auto mobile-padding">
        <Card className="shadow-lg border-border h-[120vh] flex flex-col">
          <CardContent className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  className="elderly-button bg-secondary hover:bg-secondary/80 text-secondary-foreground px-6"
                  data-testid="button-back"
                  onClick={() => window.history.back()}
                >
                  <ArrowLeft size={20} className="mr-2" /> Volver
                </Button>
                <div>
                  <h2 className="responsive-text-2xl font-bold text-foreground">
                    Asistente Virtual
                  </h2>
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-2 h-2 bg-green-500 rounded-full"
                      data-testid="status-online"
                    ></div>
                    <span className="responsive-text-lg text-muted-foreground">
                      Disponible para ayudarte
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                className="px-6 py-3"
                onClick={saveSession}
                data-testid="button-save-session"
              >
                Guardar Sesión
              </Button>
            </div>
          </CardContent>

          <div
            className="flex-1 p-4 overflow-y-auto min-h-0"
            data-testid="chat-messages"
          >
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`chat-message ${message.isUser ? "chat-user" : "chat-ai"}`}
                  data-testid={`message-${message.isUser ? "user" : "ai"}-${message.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="elderly-text">{message.content}</p>
                      <p className="responsive-text opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {!message.isUser && ttsAvailable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-3 p-2 h-12 w-12 rounded-full bg-white/20 hover:bg-white/30"
                        onClick={() => {
                          if (speaking && speakingMessageId === message.id) {
                            stop();
                            setSpeakingMessageId(null);
                          } else {
                            stop(); // Para cualquier lectura anterior
                            const success = speak(message.content);
                            if (success) {
                              setSpeakingMessageId(message.id);
                            } else {
                              // Fallback al servidor (implementar si es necesario)
                              toast({
                                title: "TTS no disponible",
                                description:
                                  "El navegador no soporta lectura en voz alta",
                                variant: "destructive",
                              });
                            }
                          }
                        }}
                        data-testid={`button-speak-${message.id}`}
                      >
                        {speaking && speakingMessageId === message.id ? (
                          <VolumeX size={20} className="text-primary" />
                        ) : (
                          <Volume2 size={20} className="text-primary" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div
                  className="chat-message chat-ai"
                  data-testid="loading-message"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            className="border-t border-border p-6"
            data-testid="chat-input-area"
          >
            <div className="flex space-x-4 mb-4">
              <Input
                type="text"
                placeholder="Escribe tu mensaje aquí..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 responsive-text-lg py-4 px-6 border border-border rounded-xl bg-input focus:ring-2 focus:ring-ring"
                disabled={isLoading}
                data-testid="input-message"
              />
              <Button
                className="elderly-button bg-primary hover:bg-primary/90 text-primary-foreground px-8"
                onClick={() => sendMessage(inputMessage)}
                disabled={isLoading || !inputMessage.trim()}
                data-testid="button-send"
              >
                <Send size={20} />
              </Button>
            </div>

            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-3"
              data-testid="quick-responses"
            >
              {quickResponses.map((response, index) => (
                <Button
                  key={index}
                  className="elderly-button bg-secondary hover:bg-secondary/80 text-secondary-foreground text-center py-3 h-auto min-h-16 whitespace-normal leading-relaxed"
                  onClick={() => sendMessage(response)}
                  disabled={isLoading}
                  data-testid={`button-quick-${index}`}
                >
                  <span className="elderly-text block text-center">
                    {response}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
