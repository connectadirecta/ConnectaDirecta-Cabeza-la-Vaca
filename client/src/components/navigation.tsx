import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut, User, Users, Shield, Menu, X, Home, UserPlus, Clock, Lock, BarChart3, MessageCircle } from "lucide-react";
import { Link, useLocation, Switch, Route } from "wouter";
import { useState, lazy, Suspense } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";

// Import professional pages
import ProfessionalDashboard from "@/pages/professional-dashboard";
import NotFound from "@/pages/not-found";

function ProfessionalSidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    // Clear auth state and redirect immediately
    localStorage.removeItem("user");
    window.location.replace("/");
  };

  return (
    <Sidebar side="left" variant="inset">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Shield className="text-primary-foreground" size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-sidebar-foreground/70">Panel Profesional</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location === "/" || location === "/dashboard"}
            >
              <Link href="/dashboard">
                <Home size={16} />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location === "/professional/create-user"}
            >
              <Link href="/professional/create-user">
                <UserPlus size={16} />
                <span>Crear Usuario</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location === "/professional/reminders"}
            >
              <Link href="/professional/reminders">
                <Clock size={16} />
                <span>Recordatorios</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location === "/professional/passwords"}
            >
              <Link href="/professional/passwords">
                <Lock size={16} />
                <span>Gestión PINs</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="w-full text-destructive hover:text-destructive">
              <LogOut size={16} />
              <span>Cerrar Sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function ProfessionalLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <ProfessionalSidebar />
        <SidebarInset className="flex-1">
          <Switch>
            <Route path="/" component={ProfessionalDashboard} />
            <Route path="/dashboard" component={ProfessionalDashboard} />
            <Route path="/professional/user/:userId">
              {({ userId }) => {
                const ProfessionalUserDetail = lazy(() => import("@/pages/professional-user-detail"));
                return (
                  <Suspense fallback={<div className="p-6">Cargando...</div>}>
                    <ProfessionalUserDetail userId={userId} />
                  </Suspense>
                );
              }}
            </Route>
            <Route path="/professional/create-user">
              {() => {
                const ProfessionalCreateUser = lazy(() => import("@/pages/professional-create-user"));
                return (
                  <Suspense fallback={<div className="p-6">Cargando...</div>}>
                    <ProfessionalCreateUser />
                  </Suspense>
                );
              }}
            </Route>
            <Route path="/professional/reminders">
              {() => {
                const ProfessionalReminders = lazy(() => import("@/pages/professional-reminders"));
                return (
                  <Suspense fallback={<div className="p-6">Cargando...</div>}>
                    <ProfessionalReminders />
                  </Suspense>
                );
              }}
            </Route>
            <Route path="/professional/passwords">
              {() => {
                const ProfessionalPasswordManager = lazy(() => import("@/pages/professional-password-manager"));
                return (
                  <Suspense fallback={<div className="p-6">Cargando...</div>}>
                    <ProfessionalPasswordManager />
                  </Suspense>
                );
              }}
            </Route>
            <Route>
              {() => (
                <div className="flex-1 p-4 bg-muted/30">
                  <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Cargando dashboard...</p>
                    </div>
                  </div>
                </div>
              )}
            </Route>
          </Switch>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export function Navigation() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    // Clear auth state and redirect immediately
    localStorage.removeItem("user");
    window.location.replace("/");
  };

  if (!user) return null;

  // Professional users get the full sidebar layout with routing
  if (user.role === "professional") {
    return <ProfessionalLayout />;
  }

  // For elderly and family users, show simple navigation
  return (
    <nav className="bg-background border-b border-border p-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            {user.role === "elderly" ? <User className="text-primary-foreground" size={16} /> :
             user.role === "family" ? <Users className="text-primary-foreground" size={16} /> :
             <Shield className="text-primary-foreground" size={16} />}
          </div>
          <div>
            <p className="font-medium text-foreground">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut size={16} className="mr-2" />
          Cerrar Sesión
        </Button>
      </div>
    </nav>
  );
}