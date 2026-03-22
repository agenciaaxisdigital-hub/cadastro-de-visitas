import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Moon, Sun } from "lucide-react";

export default function ConfigPage() {
  const { user, signOut } = useAuth();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
  }, []);

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setDarkMode(!darkMode);
    localStorage.setItem("theme", !darkMode ? "dark" : "light");
  };

  return (
    <AppLayout>
      <h2 className="text-xl font-bold mb-6">Configurações</h2>

      <div className="space-y-4">
        <div className="card-section">
          <p className="section-title">Conta</p>
          <div className="flex justify-between text-sm py-1">
            <span className="text-muted-foreground">E-mail</span>
            <span className="font-medium">{user?.email}</span>
          </div>
        </div>

        <div className="card-section">
          <p className="section-title">Aparência</p>
          <button
            onClick={toggleDark}
            className="w-full flex items-center justify-between py-2"
          >
            <span className="text-sm">Modo escuro</span>
            <div className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors ${darkMode ? "bg-primary" : "bg-muted"}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform ${darkMode ? "translate-x-5" : ""}`}>
                {darkMode ? <Moon size={12} /> : <Sun size={12} />}
              </div>
            </div>
          </button>
        </div>

        <div className="card-section">
          <p className="section-title">Sobre</p>
          <div className="flex justify-between text-sm py-1">
            <span className="text-muted-foreground">Versão</span>
            <span className="font-medium">1.0.0</span>
          </div>
        </div>

        <button
          onClick={signOut}
          className="w-full h-12 rounded-xl border border-destructive/30 text-destructive font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </AppLayout>
  );
}
