import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Validate user has required properties
        if (parsedUser && parsedUser.id && parsedUser.role) {
          setUser(parsedUser);
        } else {
          // Invalid user data, clear it
          localStorage.removeItem("user");
        }
      } catch (error) {
        // Corrupted data, clear it
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData: User) => {
    // Ensure user data is valid before setting
    if (userData && userData.id && userData.role) {
      // Set user state synchronously to prevent intermediate renders
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      // Set loading to false after successful login
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear everything immediately and synchronously
    localStorage.removeItem("user");
    setUser(null);
    // Force immediate redirect to prevent intermediate states
    window.location.replace("/");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
