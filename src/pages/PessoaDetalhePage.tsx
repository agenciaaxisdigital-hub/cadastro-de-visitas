import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { ArrowLeft, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { maskCPF, formatDateTime } from "@/lib/masks";
import { getStatusColor } from "@/lib/constants";

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
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold">{pessoa.nome || "Sem nome"}</h2>
      </div>

      <div className="space-y-4">
        <div className="card-section">
          <p className="section-title">Dados Pessoais</p>
          <InfoRow label="CPF" value={pessoa.cpf && !pessoa.cpf.startsWith("TEMP") ? maskCPF(pessoa.cpf) : "–"} />
          <InfoRow label="Telefone" value={pessoa.telefone} />
          <InfoRow label="E-mail" value={pessoa.email} />
          <InfoRow label="Instagram" value={pessoa.instagram} />
          <InfoRow label="WhatsApp" value={pessoa.whatsapp} />
          <InfoRow label="Data nasc." value={pessoa.data_nascimento ? new Date(pessoa.data_nascimento).toLocaleDateString("pt-BR") : undefined} />
        </div>

        {(pessoa.titulo_eleitor || pessoa.zona_eleitoral) && (
          <div className="card-section">
            <p className="section-title">Dados Eleitorais</p>
            <InfoRow label="Título" value={pessoa.titulo_eleitor} />
            <InfoRow label="Zona" value={pessoa.zona_eleitoral} />
            <InfoRow label="Seção" value={pessoa.secao_eleitoral} />
            <InfoRow label="Município/UF" value={[pessoa.municipio, pessoa.uf].filter(Boolean).join("/")} />
          </div>
        )}

        <div className="card-section">
          <p className="section-title">Visitas ({visitas.length})</p>
          {visitas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma visita registrada.</p>
          ) : (
            visitas.map((v) => (
              <button
                key={v.id}
                onClick={() => navigate(`/visita/${v.id}`)}
                className="w-full text-left py-2 border-b border-border last:border-0 active:scale-[0.98] transition-transform"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm">{v.assunto || "–"}</span>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full", getStatusColor(v.status))}>
                    {v.status}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">{formatDateTime(v.data_hora)}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
