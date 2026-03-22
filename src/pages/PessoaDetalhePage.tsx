import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { ArrowLeft, Plus, Pencil } from "lucide-react";
import { maskCPF, formatDateTime } from "@/lib/masks";

export default function PessoaDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pessoa, setPessoa] = useState<any>(null);
  const [visitas, setVisitas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data: p } = await supabase.from("pessoas").select("*").eq("id", id).single();
      const { data: v } = await supabase.from("visitas").select("*").eq("pessoa_id", id).order("data_hora", { ascending: false });
      setPessoa(p);
      setVisitas(v || []);
      setLoading(false);
    }
    fetch();
  }, [id]);

  if (loading) return <AppLayout><div className="card-section animate-pulse h-40" /></AppLayout>;
  if (!pessoa) return <AppLayout><p className="text-center py-16 text-muted-foreground">Pessoa não encontrada.</p></AppLayout>;

  const InfoRow = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <div className="flex justify-between text-sm py-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-right">{value}</span>
      </div>
    ) : null;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-bold">{pessoa.nome || "Sem nome"}</h2>
        </div>
        <button onClick={() => navigate(`/editar-pessoa/${id}`)} className="p-2 rounded-full hover:bg-muted active:scale-95">
          <Pencil size={18} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Botão editar dados */}
        <button
          onClick={() => navigate(`/editar-pessoa/${id}`)}
          className="w-full card-section flex items-center justify-between active:scale-[0.98] transition-transform"
        >
          <div>
            <p className="text-sm font-semibold">Dados Pessoais e Eleitorais</p>
            <p className="text-xs text-muted-foreground">Toque para visualizar e editar</p>
          </div>
          <Pencil size={16} className="text-muted-foreground" />
        </button>

        <div className="card-section">
          <div className="flex items-center justify-between mb-3">
            <p className="section-title mb-0">Visitas ({visitas.length})</p>
            <button
              onClick={() => navigate(`/nova-visita-existente/${id}`)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline active:scale-95 transition-transform"
            >
              <Plus size={14} />
              Nova Visita
            </button>
          </div>
          {visitas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma visita registrada.</p>
          ) : (
            visitas.map((v) => (
              <button
                key={v.id}
                onClick={() => navigate(`/visita/${v.id}`)}
                className="w-full text-left py-3 border-b border-border last:border-0 active:scale-[0.98] transition-transform"
              >
                <span className="text-sm font-semibold">{v.assunto || "–"}</span>
                <p className="text-xs text-muted-foreground">
                  📅 {formatDateTime(v.data_hora)}
                </p>
                {v.quem_indicou && (
                  <p className="text-xs text-muted-foreground">Indicado por: {v.quem_indicou}</p>
                )}
                {v.descricao_assunto && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{v.descricao_assunto}</p>
                )}
                {v.cadastrado_por && (
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Cadastrado por: {v.cadastrado_por}</p>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
