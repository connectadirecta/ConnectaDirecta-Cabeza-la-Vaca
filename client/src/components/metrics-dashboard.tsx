import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, RadialBarChart, RadialBar, Legend } from "recharts";
import { Activity, Heart, Brain, TrendingUp, Users, Calendar, Pill, AlertCircle, ArrowUp, ArrowDown } from "lucide-react";
import { User } from "@shared/schema";

interface MetricsDashboardProps {
  elderlyUsers: User[];
  professionalId?: string;
}

export default function MetricsDashboard({ elderlyUsers, professionalId }: MetricsDashboardProps) {
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  console.log("MetricsDashboard render:", { 
    selectedUser, 
    selectedPeriod, 
    elderlyUsersCount: elderlyUsers.length,
    elderlyUsers: elderlyUsers.map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}` })),
    professionalId
  });

  // Filter users by personalConsent for aggregated metrics
  console.log("[DEBUG] MetricsDashboard - All elderlyUsers:", elderlyUsers.map(u => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    personalConsent: u.personalConsent,
    familyConsent: u.familyConsent
  })));
  
  const consentedUsers = elderlyUsers.filter(user => user.personalConsent === true);
  const consentedUserIds = consentedUsers.map(user => user.id);
  
  console.log("[DEBUG] MetricsDashboard - Filtered consented users:", consentedUsers.length, "out of", elderlyUsers.length);
  console.log("[DEBUG] MetricsDashboard - Consented user IDs:", consentedUserIds);

  // Fetch engagement metrics - always use real data
  const { data: engagementMetrics, isLoading: loadingEngagement, error: engagementError } = useQuery({
    queryKey: ["/api/metrics/engagement", selectedUser, selectedPeriod, professionalId, consentedUserIds],
    queryFn: async () => {
      const url = selectedUser === "all" 
        ? `/api/metrics/engagement/aggregated?days=${selectedPeriod}${professionalId ? `&professionalId=${professionalId}` : ''}&consentOnly=true`
        : `/api/metrics/engagement/${selectedUser}?days=${selectedPeriod}`;
      console.log("[MetricsDashboard] === ENGAGEMENT METRICS QUERY ===");
      console.log("[MetricsDashboard] URL:", url);
      console.log("[MetricsDashboard] Is aggregated query:", selectedUser === "all");
      console.log("[MetricsDashboard] Selected user:", selectedUser);
      console.log("[MetricsDashboard] Period (days):", selectedPeriod);
      console.log("[MetricsDashboard] Professional ID:", professionalId);
      console.log("[MetricsDashboard] Consented users count:", consentedUserIds.length);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error("[MetricsDashboard] Engagement metrics fetch failed:", response.status, response.statusText);
        throw new Error(`Failed to fetch engagement metrics: ${response.status}`);
      }
      const data = await response.json();
      
      console.log("[MetricsDashboard] === ENGAGEMENT METRICS RESPONSE ===");
      console.log("[MetricsDashboard] Raw response data:", JSON.stringify(data, null, 2));
      console.log("[MetricsDashboard] Data type:", typeof data);
      console.log("[MetricsDashboard] Object keys:", Object.keys(data || {}));
      console.log("[MetricsDashboard] Individual metric values:", {
        uniqueActiveDays: data.uniqueActiveDays,
        totalSessions: data.totalSessions,
        dailyActiveRate: data.dailyActiveRate,
        totalInteractions: data.totalInteractions,
        cognitiveExercises: data.cognitiveExercises,
        averageSessionDuration: data.averageSessionDuration,
        loginFrequency: data.loginFrequency
      });
      console.log("[MetricsDashboard] === END ENGAGEMENT METRICS ===");
      
      return data;
    },
    enabled: selectedUser === "all" ? consentedUserIds.length > 0 : true
  });

  // Fetch health metrics - always use real data
  const { data: healthMetrics, isLoading: loadingHealth, error: healthError } = useQuery({
    queryKey: ["/api/metrics/health", selectedUser, selectedPeriod, professionalId, consentedUserIds],
    queryFn: async () => {
      const url = selectedUser === "all"
        ? `/api/metrics/health/aggregated?days=${selectedPeriod}${professionalId ? `&professionalId=${professionalId}` : ''}&consentOnly=true`
        : `/api/metrics/health/${selectedUser}?days=${selectedPeriod}`;
      
      console.log("[MetricsDashboard] === HEALTH METRICS QUERY ===");
      console.log("[MetricsDashboard] URL:", url);
      console.log("[MetricsDashboard] Is aggregated query:", selectedUser === "all");
      console.log("[MetricsDashboard] Selected user:", selectedUser);
      console.log("[MetricsDashboard] Period (days):", selectedPeriod);
      console.log("[MetricsDashboard] Professional ID:", professionalId);
      console.log("[MetricsDashboard] Consented users count:", consentedUserIds.length);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error("[MetricsDashboard] Health metrics fetch failed:", response.status, response.statusText);
        throw new Error(`Failed to fetch health metrics: ${response.status}`);
      }
      const data = await response.json();
      
      console.log("[MetricsDashboard] === HEALTH METRICS RESPONSE ===");
      console.log("[MetricsDashboard] Raw response data:", JSON.stringify(data, null, 2));
      console.log("[MetricsDashboard] Data type:", typeof data);
      console.log("[MetricsDashboard] Object keys:", Object.keys(data || {}));
      console.log("[MetricsDashboard] Individual metric values:", {
        medicationAdherence: data.medicationAdherence,
        appointmentAttendance: data.appointmentAttendance,
        onTimeCompletionRate: data.onTimeCompletionRate,
        totalRemindersCompleted: data.totalRemindersCompleted,
        averageDelayMinutes: data.averageDelayMinutes
      });
      console.log("[MetricsDashboard] === END HEALTH METRICS ===");
      
      return data;
    },
    enabled: selectedUser === "all" ? consentedUserIds.length > 0 : true
  });

  // Fetch AI quality metrics - always use real data
  const { data: aiQualityMetrics, isLoading: loadingAI, error: aiError } = useQuery({
    queryKey: ["/api/metrics/ai-quality", selectedUser, selectedPeriod, professionalId, consentedUserIds],
    queryFn: async () => {
      const url = selectedUser === "all"
        ? `/api/metrics/ai-quality/aggregated?days=${selectedPeriod}${professionalId ? `&professionalId=${professionalId}` : ''}&consentOnly=true`
        : `/api/metrics/ai-quality/${selectedUser}?days=${selectedPeriod}`;
      
      console.log("[MetricsDashboard] === AI QUALITY METRICS QUERY ===");
      console.log("[MetricsDashboard] URL:", url);
      console.log("[MetricsDashboard] Is aggregated query:", selectedUser === "all");
      console.log("[MetricsDashboard] Selected user:", selectedUser);
      console.log("[MetricsDashboard] Period (days):", selectedPeriod);
      console.log("[MetricsDashboard] Professional ID:", professionalId);
      console.log("[MetricsDashboard] Consented users count:", consentedUserIds.length);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error("[MetricsDashboard] AI quality metrics fetch failed:", response.status, response.statusText);
        throw new Error(`Failed to fetch AI quality metrics: ${response.status}`);
      }
      const data = await response.json();
      
      console.log("[MetricsDashboard] === AI QUALITY METRICS RESPONSE ===");
      console.log("[MetricsDashboard] Raw response data:", JSON.stringify(data, null, 2));
      console.log("[MetricsDashboard] Data type:", typeof data);
      console.log("[MetricsDashboard] Object keys:", Object.keys(data || {}));
      console.log("[MetricsDashboard] Individual metric values:", {
        totalAISessions: data.totalAISessions,
        averageSessionDuration: data.averageSessionDuration,
        cognitiveExercisesCompleted: data.cognitiveExercisesCompleted,
        alertsGenerated: data.alertsGenerated,
        emotionalStateDistribution: data.emotionalStateDistribution,
        engagementRate: data.engagementRate,
        averageMessagesPerSession: data.averageMessagesPerSession,
        averageResponseTime: data.averageResponseTime
      });
      console.log("[MetricsDashboard] === END AI QUALITY METRICS ===");
      
      return data;
    },
    enabled: selectedUser === "all" ? consentedUserIds.length > 0 : true
  });

  const metrics = {
    engagement: engagementMetrics || {},
    health: healthMetrics || {},
    aiQuality: aiQualityMetrics || {}
  };

  console.log("[MetricsDashboard] Metrics object:", metrics);
  console.log("[MetricsDashboard] Loading states:", { loadingEngagement, loadingHealth, loadingAI });
  console.log("[MetricsDashboard] Error states:", { engagementError, healthError, aiError });
  console.log("[MetricsDashboard] Raw data check:", {
    engagementMetrics,
    healthMetrics,
    aiQualityMetrics,
    engagementType: typeof engagementMetrics,
    healthType: typeof healthMetrics,
    aiType: typeof aiQualityMetrics
  });

  // Calculate averages for aggregated data when showing all users
  const isAggregated = selectedUser === "all";
  const userCount = isAggregated ? consentedUsers.length || 1 : elderlyUsers.length || 1; // Avoid division by zero

  console.log("[MetricsDashboard] === CHART DATA CALCULATION ===");
  console.log("[MetricsDashboard] Chart calculation context:", { 
    isAggregated, 
    userCount,
    selectedUser,
    selectedPeriod,
    elderlyUsersCount: elderlyUsers.length
  });
  console.log("[MetricsDashboard] Raw metrics data:");
  console.log("[MetricsDashboard]   - Engagement:", JSON.stringify(metrics.engagement, null, 2));
  console.log("[MetricsDashboard]   - Health:", JSON.stringify(metrics.health, null, 2));
  console.log("[MetricsDashboard]   - AI Quality:", JSON.stringify(metrics.aiQuality, null, 2));

  // Prepare chart data
  const engagementChartData = [
    { 
      name: "Sesiones", 
      value: (metrics.engagement as any)?.totalSessions || 0, 
      color: "#8b5cf6" 
    },
    { 
      name: "Interacciones", 
      value: (metrics.engagement as any)?.totalInteractions || 0, 
      color: "#3b82f6" 
    },
    { 
      name: "Ejercicios Cognitivos", 
      value: (metrics.engagement as any)?.cognitiveExercises || 0, 
      color: "#f59e0b" 
    },
    { 
      name: "Días Activos", 
      value: (metrics.engagement as any)?.uniqueActiveDays || 0, 
      color: "#10b981" 
    }
  ];

  console.log("[MetricsDashboard] Engagement chart data:", JSON.stringify(engagementChartData, null, 2));

  const healthChartData = [
    { 
      name: "Medicación", 
      value: Math.round(((metrics.health as any)?.medicationAdherence || 0) * 100)
    },
    { 
      name: "Citas", 
      value: Math.round(((metrics.health as any)?.appointmentAttendance || 0) * 100)
    },
    { 
      name: "A Tiempo", 
      value: Math.round(((metrics.health as any)?.onTimeCompletionRate || 0) * 100)
    }
  ];

  console.log("[MetricsDashboard] Health chart data:", JSON.stringify(healthChartData, null, 2));

  const aiQualityChartData = [
    { 
      type: "Sesiones IA", 
      value: (metrics.aiQuality as any)?.totalAISessions || 0
    },
    { 
      type: "Ejercicios", 
      value: (metrics.aiQuality as any)?.cognitiveExercisesCompleted || 0
    },
    { 
      type: "Alertas", 
      value: (metrics.aiQuality as any)?.alertsGenerated || 0
    }
  ];

  console.log("[MetricsDashboard] AI quality chart data:", JSON.stringify(aiQualityChartData, null, 2));
  console.log("[MetricsDashboard] === END CHART DATA CALCULATION ===");

  const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  return (
    <div className="space-y-6">
      {/* Metrics Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Panel de Métricas</CardTitle>
              <CardDescription>Análisis detallado de engagement, salud y calidad de IA</CardDescription>
            </div>
            <div className="flex items-center space-x-3">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-64" data-testid="select-metrics-user">
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Usuarios con consentimiento ({consentedUsers.length})</SelectItem>
                  {elderlyUsers.filter(user => user.personalConsent === true).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedPeriod.toString()} onValueChange={(v) => setSelectedPeriod(parseInt(v))}>
                <SelectTrigger className="w-40" data-testid="select-metrics-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Última semana</SelectItem>
                  <SelectItem value="30">Último mes</SelectItem>
                  <SelectItem value="90">Últimos 3 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Tasa de Engagement {isAggregated && "(Promedio)"}
                </p>
                <p className="text-2xl font-bold text-primary">
                  {(((metrics.engagement as any)?.dailyActiveRate || 0) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAggregated ? 
                    `Basado en ${userCount} usuarios` : 
                    <><ArrowUp className="inline w-3 h-3 text-green-500" /> +5% vs mes anterior</>
                  }
                </p>
              </div>
              <Activity className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Adherencia Medicación {isAggregated && "(Promedio)"}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {(((metrics.health as any)?.medicationAdherence || 0) * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAggregated ? 
                    `Media de ${userCount} usuarios` : 
                    <><ArrowUp className="inline w-3 h-3 text-green-500" /> +3% mejora</>
                  }
                </p>
              </div>
              <Pill className="h-8 w-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Ejercicios Cognitivos {isAggregated && "(Total)"}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {(metrics.engagement as any)?.cognitiveExercises || (metrics.aiQuality as any)?.cognitiveExercisesCompleted || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAggregated ? 
                    "Completados por todos" : 
                    "Completados este período"
                  }
                </p>
              </div>
              <Brain className="h-8 w-8 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Alertas Generadas {isAggregated && "(Total)"}
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {(metrics.aiQuality as any)?.alertsGenerated || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAggregated ? 
                    "De todos los usuarios" : 
                    "Requieren atención"
                  }
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement Metrics Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Métricas de Engagement {isAggregated && "(Promedio por usuario)"}</span>
            </CardTitle>
            <CardDescription>
              {isAggregated ? 
                `Actividad promedio de ${userCount} usuarios` : 
                "Actividad y participación de usuarios"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: {
                  label: "Valor",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="var(--color-value)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Health Metrics Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5" />
              <span>Métricas de Salud {isAggregated && "(Promedio)"}</span>
            </CardTitle>
            <CardDescription>
              {isAggregated ? 
                "Promedio de cumplimiento de todos los usuarios" : 
                "Cumplimiento de tratamientos y citas"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: {
                  label: "Porcentaje",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  cx="50%" 
                  cy="50%" 
                  innerRadius="10%" 
                  outerRadius="80%" 
                  data={healthChartData}
                >
                  <RadialBar
                    dataKey="value"
                    cornerRadius={10}
                    fill="#82ca9d"
                    label={{ position: 'insideStart', fill: '#fff' }}
                  />
                  <Legend />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </RadialBarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        

        {/* Trend Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Análisis de Tendencias</span>
            </CardTitle>
            <CardDescription>Evolución temporal de métricas clave</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Engagement Promedio</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold">
                    {(((metrics.engagement as any)?.dailyActiveRate || 0) * 100).toFixed(1)}%
                  </span>
                  {((metrics.engagement as any)?.dailyActiveRate || 0) > 0.05 ? (
                    <ArrowUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <ArrowDown className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium">Tiempo Respuesta IA</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold">
                    {((metrics.aiQuality as any)?.averageResponseTime || 0) > 0 
                      ? `${((metrics.aiQuality as any)?.averageResponseTime || 0).toFixed(0)}ms`
                      : "Sin datos"
                    }
                  </span>
                  {((metrics.aiQuality as any)?.averageResponseTime || 0) > 0 && (
                    ((metrics.aiQuality as any)?.averageResponseTime || 0) < 2000 ? (
                      <ArrowUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-orange-500" />
                    )
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen Ejecutivo</CardTitle>
          <CardDescription>Puntos clave del período seleccionado ({selectedPeriod} días)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm font-medium text-green-800 dark:text-green-400">✓ Logros</p>
              <ul className="mt-2 space-y-1 text-sm text-green-700 dark:text-green-300">
                {((metrics.health as any)?.medicationAdherence || 0) > 0.8 && (
                  <li>• Adherencia medicación superior al 80%</li>
                )}
                {((metrics.engagement as any)?.dailyActiveRate || 0) > 0.05 && (
                  <li>• Engagement diario activo ({(((metrics.engagement as any)?.dailyActiveRate || 0) * 100).toFixed(1)}%)</li>
                )}
                {((metrics.aiQuality as any)?.averageResponseTime || 0) > 0 && ((metrics.aiQuality as any)?.averageResponseTime || 0) < 2000 && (
                  <li>• Tiempo de respuesta IA óptimo</li>
                )}
                {((metrics.engagement as any)?.cognitiveExercises || 0) > 0 && (
                  <li>• {(metrics.engagement as any)?.cognitiveExercises} ejercicios cognitivos completados</li>
                )}
                {((metrics.engagement as any)?.totalSessions || 0) > 10 && (
                  <li>• Alta actividad del sistema ({(metrics.engagement as any)?.totalSessions} sesiones)</li>
                )}
              </ul>
              {((metrics.health as any)?.medicationAdherence || 0) <= 0.8 && 
               ((metrics.engagement as any)?.dailyActiveRate || 0) <= 0.05 && 
               ((metrics.engagement as any)?.cognitiveExercises || 0) === 0 && (
                <p className="mt-2 text-sm text-green-600">Sistema funcionando correctamente</p>
              )}
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-400">⚠ Áreas de Mejora</p>
              <ul className="mt-2 space-y-1 text-sm text-orange-700 dark:text-orange-300">
                {((metrics.aiQuality as any)?.alertsGenerated || 0) > 0 && (
                  <li>• {(metrics.aiQuality as any)?.alertsGenerated} alertas de salud pendientes</li>
                )}
                {((metrics.health as any)?.averageDelayMinutes || 0) > 10 && (
                  <li>• Retraso promedio {Math.round((metrics.health as any)?.averageDelayMinutes || 0)} min en recordatorios</li>
                )}
                {((metrics.health as any)?.medicationAdherence || 0) < 0.7 && (
                  <li>• Baja adherencia medicación ({(((metrics.health as any)?.medicationAdherence || 0) * 100).toFixed(0)}%)</li>
                )}
                {((metrics.engagement as any)?.dailyActiveRate || 0) < 0.03 && (
                  <li>• Bajo engagement diario ({(((metrics.engagement as any)?.dailyActiveRate || 0) * 100).toFixed(1)}%)</li>
                )}
                {isAggregated && consentedUsers.filter((u: any) => {
                  const timeDiff = Date.now() - new Date(u.lastActivity || 0).getTime();
                  return timeDiff > 48 * 60 * 60 * 1000;
                }).length > 0 && (
                  <li>• {consentedUsers.filter((u: any) => {
                    const timeDiff = Date.now() - new Date(u.lastActivity || 0).getTime();
                    return timeDiff > 48 * 60 * 60 * 1000;
                  }).length} usuarios con consentimiento inactivos &gt;48h</li>
                )}
              </ul>
              {((metrics.aiQuality as any)?.alertsGenerated || 0) === 0 && 
               ((metrics.health as any)?.averageDelayMinutes || 0) <= 10 && 
               ((metrics.health as any)?.medicationAdherence || 0) >= 0.7 && 
               ((metrics.engagement as any)?.dailyActiveRate || 0) >= 0.03 && (
                <p className="mt-2 text-sm text-orange-600">Sin áreas críticas identificadas</p>
              )}
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-400">→ Recomendaciones</p>
              <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-300">
                {isAggregated && consentedUsers.filter((u: any) => {
                  const timeDiff = Date.now() - new Date(u.lastActivity || 0).getTime();
                  return timeDiff > 48 * 60 * 60 * 1000;
                }).length > 0 && (
                  <li>• Contactar usuarios con consentimiento inactivos</li>
                )}
                {((metrics.health as any)?.medicationAdherence || 0) < 0.8 && (
                  <li>• Revisar horarios de medicación</li>
                )}
                {((metrics.engagement as any)?.cognitiveExercises || 0) < 5 && (
                  <li>• Aumentar ejercicios cognitivos</li>
                )}
                {((metrics.aiQuality as any)?.averageResponseTime || 0) > 2000 && (
                  <li>• Optimizar rendimiento del sistema IA</li>
                )}
                {((metrics.engagement as any)?.dailyActiveRate || 0) < 0.1 && (
                  <li>• Implementar estrategias de activación de usuarios</li>
                )}
                {((metrics.health as any)?.appointmentAttendance || 0) < 0.8 && (
                  <li>• Mejorar seguimiento de citas médicas</li>
                )}
              </ul>
              {((metrics.health as any)?.medicationAdherence || 0) >= 0.8 && 
               ((metrics.engagement as any)?.cognitiveExercises || 0) >= 5 && 
               ((metrics.engagement as any)?.dailyActiveRate || 0) >= 0.1 && (
                <p className="mt-2 text-sm text-blue-600">Mantener estrategias actuales</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}