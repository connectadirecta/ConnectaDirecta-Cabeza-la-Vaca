
import React from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Heart, MessageCircle } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Message } from "@shared/schema";

export default function ElderlyMessages() {
  const { user } = useAuth();

  const { data: messages, isLoading, refetch } = useQuery({
    queryKey: ["/api/messages", user?.id],
    enabled: !!user?.id,
  });

  // Mark unread messages as read when component loads
  React.useEffect(() => {
    const markMessagesAsRead = async () => {
      if (Array.isArray(messages)) {
        const unreadMessages = messages.filter((msg: Message) => !msg.isRead && msg.toUserId === user?.id);
        for (const message of unreadMessages) {
          try {
            await apiRequest("PATCH", `/api/messages/${message.id}`, { isRead: true });
          } catch (error) {
            console.error("Error marking message as read:", error);
          }
        }
        if (unreadMessages.length > 0) {
          refetch();
        }
      }
    };

    markMessagesAsRead();
  }, [messages, user?.id, refetch]);

  const familyMessages = Array.isArray(messages) 
    ? messages.filter((msg: Message) => msg.toUserId === user?.id)
    : [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Hoy, ${date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Ayer, ${date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      return date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="elderly-text text-muted-foreground">Cargando mensajes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:ml-64" data-testid="page-elderly-messages">
      <div className="max-w-3xl mx-auto mobile-padding">
        <Card className="shadow-lg border-border mobile-card">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <Link href="/">
                  <Button className="elderly-button bg-secondary hover:bg-secondary/80 text-secondary-foreground px-6" data-testid="button-back">
                    <ArrowLeft size={20} className="mr-2" /> Volver
                  </Button>
                </Link>
                <div>
                  <h1 className="responsive-text-3xl font-bold text-foreground" data-testid="title">
                    Mensajes de Familia
                  </h1>
                  <p className="responsive-text-xl text-muted-foreground">
                    Mensajes y fotos de tus seres queridos
                  </p>
                </div>
              </div>
              <Heart className="text-red-500" size={32} />
            </div>

            <div className="space-y-4" data-testid="messages-list">
              {familyMessages.length === 0 ? (
                <div className="text-center py-12">
                  <Mail size={48} className="text-muted-foreground mx-auto mb-4" />
                  <h3 className="responsive-text-2xl font-semibold text-foreground mb-2">
                    No tienes mensajes nuevos
                  </h3>
                  <p className="elderly-text text-muted-foreground">
                    Tu familia te enviará mensajes pronto
                  </p>
                </div>
              ) : (
                familyMessages.map((message: Message) => (
                  <div
                    key={message.id}
                    className={`${
                      message.isRead ? "bg-gray-50" : "bg-blue-50"
                    } border-2 ${
                      message.isRead ? "border-gray-200" : "border-blue-200"
                    } rounded-2xl p-6`}
                    data-testid={`message-${message.id}`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                        <MessageCircle className="text-primary-foreground" size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="responsive-text-xl font-bold text-foreground">
                            Mensaje de Familia
                          </h3>
                          {!message.isRead && (
                            <span className="px-3 py-1 bg-blue-500 text-white responsive-text rounded-full font-medium">
                              Nuevo
                            </span>
                          )}
                        </div>
                        <p className="elderly-text text-foreground mb-3 leading-relaxed">
                          {message.content}
                        </p>
                        {(message.messageType === "image" || message.messageType === "photo") && message.attachments && message.attachments.length > 0 && (
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {message.attachments.map((attachment: string, idx: number) => (
                              <img
                                key={idx}
                                src={attachment}
                                alt="Foto de familia"
                                className="w-full h-40 object-cover rounded-xl border-2 border-primary/20"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ))}
                          </div>
                        )}
                        <p className="responsive-text text-muted-foreground">
                          {formatDate(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {familyMessages.length > 0 && (
              <div className="mt-8 p-6 bg-green-50 border-2 border-green-200 rounded-2xl text-center" data-testid="family-love">
                <Heart className="text-red-500 mx-auto mb-3" size={32} />
                <p className="responsive-text-xl font-semibold text-foreground">
                  Tu familia te quiere mucho
                </p>
                <p className="elderly-text text-muted-foreground mt-2">
                  Siempre están pensando en ti
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
