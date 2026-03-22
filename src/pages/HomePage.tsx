import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Plus, Search, Calendar, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const PERIOD_FILTERS = ["Hoje", "Esta semana", "Este mês", "Todas"];

function groupByDate(visitas: any[]) {
  const groups: Record<string, any[]> = {};
  for (const v of visitas) {
    const date = v.data_hora
      ? new Date(v.data_hora).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
      : "Sem data";
    if (!groups[date]) groups[date] = [];
    groups[date].push(v);
  }
  return Object.entries(groups);
}

export default function HomePage() {
  const navigate = useNavigate();
  const [visitas, setVisitas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState("Hoje");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchVisitas();
  }, [periodFilter]);

  async function fetchVisitas() {
    setLoading(true);
    let query = supabase
      .from("visitas")
      .select("*, pessoas(nome, cpf)")
      .order("data_hora", { ascending: false });

    const now = new Date();
    if (periodFilter === "Hoje") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      query = query.gte("data_hora", start);
    } else if (periodFilter === "Esta semana") {
      const day = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - day);
      start.setHours(0, 0, 0, 0);
      query = query.gte("data_hora", start.toISOString());
    } else if (periodFilter === "Este mês") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      query = query.gte("data_hora", start);
    }

    const { data } = await query;
    setVisitas(data || []);
    setLoading(false);
  }

  const filtered = visitas.filter((v) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.pessoas?.nome?.toLowerCase().includes(q) ||
      v.assunto?.toLowerCase().includes(q) ||
      v.quem_indicou?.toLowerCase().includes(q)
    );
  });

  const grouped = groupByDate(filtered);

  return (
    <AppLayout>
      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nome ou assunto…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 rounded-xl bg-card border border-border pl-10 pr-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
        />
      </div>

      {/* Period filter */}
      <div className="flex gap-1.5 mb-5">
        {PERIOD_FILTERS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriodFilter(p)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-lg transition-colors active:scale-95",
              periodFilter === p
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-muted text-muted-foreground"
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Counter */}
      {!loading && (
        <p className="text-xs text-muted-foreground mb-3">
          {filtered.length} visita{filtered.length !== 1 ? "s" : ""}
          {periodFilter !== "Todas" ? ` — ${periodFilter.toLowerCase()}` : ""}
        </p>
      )}

      {/* Visits list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-section animate-pulse h-20" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-base mb-1">Nenhuma visita encontrada</p>
          <p className="text-sm">
            {searchQuery
              ? "Tente outro termo de busca."
              : "Nenhuma visita neste período."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([date, items]) => (
            <div key={date}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 first-letter:capitalize">
                {date}
              </p>
              <div className="space-y-2">
                {items.map((v: any) => (
                  <button
                    key={v.id}
                    onClick={() => navigate(`/visita/${v.id}`)}
                    className="w-full text-left card-section flex items-center gap-3 hover:shadow-md transition-shadow active:scale-[0.98]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-semibold text-sm truncate">{v.pessoas?.nome || "Sem nome"}</p>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {v.data_hora ? new Date(v.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{v.assunto || "–"}</p>
                      {v.quem_indicou && (
                        <p className="text-[10px] text-muted-foreground/70 truncate">Indicado por: {v.quem_indicou}</p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground/40 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => navigate("/nova-visita")}
        className="fixed bottom-20 right-4 z-40 gradient-primary text-white rounded-2xl px-5 h-12 shadow-lg shadow-pink-500/25 flex items-center gap-2 font-semibold active:scale-95 transition-transform"
      >
        <Plus size={20} />
        Nova visita
      </button>
    </AppLayout>
  );
}
