import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { SettingsProvider } from "@/lib/settings";
import { SettingsDialog } from "@/components/settings-dialog";
import { Navigation } from "@/components/navigation";
import NotFound from "@/pages/not-found";

// Import pages
import ElderlyLogin from "@/pages/elderly-login";
import ElderlyDashboard from "@/pages/elderly-dashboard";
import ElderlyChat from "@/pages/elderly-chat";
import ElderlyReminders from "@/pages/elderly-reminders";
import ElderlyMemoryExercises from "@/pages/elderly-memory-exercises";
import FamilyLogin from "@/pages/family-login";
import FamilyDashboard from "@/pages/family-dashboard";
import FamilyReminders from "@/pages/family-reminders";
import ProfessionalLogin from "@/pages/professional-login";
import ProfessionalDashboard from "@/pages/professional-dashboard";

function Router() {
  const { user, isLoading } = useAuth();

  // Show loading while authentication is being verified OR during login transitions
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // User not authenticated - show login pages only
  if (!user) {
    const Landing = lazy(() => import("@/pages/landing"));
    const UserTypeSelector = lazy(() => import("@/pages/user-type-selector"));
    const AdditionalInfo = lazy(() => import("@/pages/additional-info"));
    
    return (
      <Switch>
        <Route path="/" component={() => (
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
            <Landing />
          </Suspense>
        )} />
        <Route path="/select-user-type" component={() => (
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
            <UserTypeSelector />
          </Suspense>
        )} />
        <Route path="/additional-info" component={() => (
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
            <AdditionalInfo />
          </Suspense>
        )} />
        <Route path="/elderly" component={ElderlyLogin} />
        <Route path="/elderly-name" component={ElderlyLogin} />
        <Route path="/elderly-login" component={ElderlyLogin} />
        <Route path="/family-login" component={FamilyLogin} />
        <Route path="/professional" component={ProfessionalLogin} />
        <Route path="/professional-login" component={ProfessionalLogin} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // User authenticated but role not valid OR in transition - show loading
  if (!user.role || !["elderly", "family", "professional"].includes(user.role)) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Professional users get special layout with sidebar - return immediately without any Switch/Route logic
  if (user.role === "professional") {
    return <Navigation />;
  }

  // Regular users (elderly and family) get standard layout
  return (
    <>
      <Navigation />
      <Switch>
        {/* Public route accessible to all authenticated users */}
        <Route path="/additional-info">
          {() => {
            const AdditionalInfo = lazy(() => import("@/pages/additional-info"));
            return (
              <Suspense fallback={<div>Cargando...</div>}>
                <AdditionalInfo />
              </Suspense>
            );
          }}
        </Route>

        {/* Elderly user routes - only render if user is elderly */}
        {user.role === "elderly" && (
          <>
            <Route path="/" component={ElderlyDashboard} />
            <Route path="/elderly" component={ElderlyDashboard} />
            <Route path="/dashboard" component={ElderlyDashboard} />
            <Route path="/chat" component={ElderlyChat} />
            <Route path="/reminders" component={ElderlyReminders} />
            <Route path="/memory-exercises" component={ElderlyMemoryExercises} />
            <Route path="/messages">
              {() => {
                const ElderlyMessages = lazy(() => import("@/pages/elderly-messages"));
                return (
                  <Suspense fallback={<div>Cargando...</div>}>
                    <ElderlyMessages />
                  </Suspense>
                );
              }}
            </Route>
          </>
        )}

        {/* Family user routes - only render if user is family */}
        {user.role === "family" && (
          <>
            <Route path="/" component={FamilyDashboard} />
            <Route path="/dashboard" component={FamilyDashboard} />
            <Route path="/family" component={FamilyDashboard} />
            <Route path="/reminders" component={FamilyReminders} />
            <Route path="/messages">
              {() => {
                const FamilyMessages = lazy(() => import("@/pages/family-messages"));
                return (
                  <Suspense fallback={<div>Cargando...</div>}>
                    <FamilyMessages />
                  </Suspense>
                );
              }}
            </Route>
          </>
        )}

        {/* Catch-all route - only for elderly and family users who are on wrong paths */}
        <Route>
          {() => {
            // If elderly or family user is on wrong path, redirect to dashboard
            if (user && ["elderly", "family"].includes(user.role)) {
              window.location.replace("/dashboard");
              return (
                <div className="min-h-screen w-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Redirigiendo...</p>
                  </div>
                </div>
              );
            }
            // Only show 404 for truly invalid routes (no user or invalid role)
            return <NotFound />;
          }}
        </Route>
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SettingsProvider>
          <AuthProvider>
            <Toaster />
            <SettingsDialog />
            <Router />
          </AuthProvider>
        </SettingsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;