import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { ArrowLeft, Pencil, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatusColor } from "@/lib/constants";
import { maskCPF, formatDateTime } from "@/lib/masks";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DetalheVisita() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [visita, setVisita] = useState<any>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdate, setStatusUpdate] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchVisita();
  }, [id]);

  async function fetchVisita() {
    const { data } = await supabase
      .from("visitas")
      .select("*, pessoas(*)")
      .eq("id", id)
      .single();

    if (data) {
      setVisita(data);
      setStatusUpdate(data.status);

      // Fetch history
      if (data.pessoa_id) {
        const { data: hist } = await supabase
          .from("visitas")
          .select("id, data_hora, assunto, status")
          .eq("pessoa_id", data.pessoa_id)
          .neq("id", id!)
          .order("data_hora", { ascending: false });
        setHistorico(hist || []);
      }
    }
    setLoading(false);
  }

  const handleStatusUpdate = async () => {
    setUpdatingStatus(true);
    await supabase.from("visitas").update({ status: statusUpdate, atualizado_em: new Date().toISOString() }).eq("id", id);
    setVisita((prev: any) => ({ ...prev, status: statusUpdate }));
    toast({ title: "Status atualizado!" });
    setUpdatingStatus(false);
  };

  const handleDelete = async () => {
    await supabase.from("visitas").delete().eq("id", id);
    toast({ title: "Visita excluída" });
    navigate("/");
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="card-section animate-pulse h-32" />)}
        </div>
      </AppLayout>
    );
  }

  if (!visita) {
    return (
      <AppLayout>
        <p className="text-center py-16 text-muted-foreground">Visita não encontrada.</p>
      </AppLayout>
    );
  }

  const p = visita.pessoas;

  const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
    value ? (
      <div className="flex justify-between text-sm py-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-right">{value}</span>
      </div>
    ) : null
  );

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-bold">{p?.nome || "Visitante"}</h2>
        </div>
        <button onClick={() => navigate(`/editar-visita/${id}`)} className="p-2 rounded-full hover:bg-muted active:scale-95">
          <Pencil size={18} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Dados Pessoais */}
        <div className="card-section animate-fade-in">
          <p className="section-title">Dados Pessoais</p>
          <InfoRow label="Nome" value={p?.nome} />
          <InfoRow label="CPF" value={p?.cpf && !p.cpf.startsWith("TEMP") ? maskCPF(p.cpf) : "–"} />
          <InfoRow label="Telefone" value={p?.telefone} />
          <InfoRow label="E-mail" value={p?.email} />
          <InfoRow label="Instagram" value={p?.instagram} />
          <InfoRow label="WhatsApp" value={p?.whatsapp} />
        </div>

        {/* Dados Eleitorais */}
        {(p?.titulo_eleitor || p?.zona_eleitoral || p?.secao_eleitoral) && (
          <div className="card-section animate-fade-in" style={{ animationDelay: "60ms" }}>
            <p className="section-title">Dados Eleitorais</p>
            <InfoRow label="Título" value={p?.titulo_eleitor} />
            <InfoRow label="Zona" value={p?.zona_eleitoral} />
            <InfoRow label="Seção" value={p?.secao_eleitoral} />
            <InfoRow label="Município/UF" value={[p?.municipio, p?.uf].filter(Boolean).join("/")} />
          </div>
        )}

        {/* Dados da Visita */}
        <div className="card-section animate-fade-in" style={{ animationDelay: "120ms" }}>
          <p className="section-title">Dados da Visita</p>
          <InfoRow label="Data/hora" value={formatDateTime(visita.data_hora)} />
          <InfoRow label="Assunto" value={visita.assunto} />
          <InfoRow label="Descrição" value={visita.descricao_assunto} />
          <InfoRow label="Quem indicou" value={visita.quem_indicou} />
          <InfoRow label="Como chegou" value={visita.origem_visita} />
        </div>

        {/* Tratativa */}
        <div className="card-section animate-fade-in" style={{ animationDelay: "180ms" }}>
          <p className="section-title">Tratativa</p>
          <div className="flex items-center gap-2 mb-2">
            <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", getStatusColor(visita.status))}>
              ● {visita.status}
            </span>
          </div>
          <InfoRow label="Responsável" value={visita.responsavel_tratativa} />
          <InfoRow label="Observações" value={visita.observacoes} />
          <InfoRow label="Cadastrado por" value={visita.cadastrado_por} />

          <div className="flex gap-2 mt-3">
            <select
              value={statusUpdate}
              onChange={(e) => setStatusUpdate(e.target.value)}
              className="flex-1 h-10 rounded-xl bg-card border border-border px-3 text-sm appearance-none"
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={handleStatusUpdate}
              disabled={updatingStatus || statusUpdate === visita.status}
              className="h-10 px-4 rounded-xl font-semibold text-white gradient-primary active:scale-[0.98] transition-transform disabled:opacity-50 text-sm"
            >
              {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : "Alterar"}
            </button>
          </div>
        </div>

        {/* Histórico */}
        {historico.length > 0 && (
          <div className="card-section animate-fade-in" style={{ animationDelay: "240ms" }}>
            <p className="section-title">Histórico de Visitas</p>
            {historico.map((h) => (
              <button
                key={h.id}
                onClick={() => navigate(`/visita/${h.id}`)}
                className="w-full text-left py-2 border-b border-border last:border-0"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm">{h.assunto || "–"}</span>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full", getStatusColor(h.status))}>
                    {h.status}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">{formatDateTime(h.data_hora)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Delete */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="w-full h-10 rounded-xl text-destructive border border-destructive/30 text-sm font-medium active:scale-95 transition-transform flex items-center justify-center gap-2">
              <Trash2 size={16} />
              Excluir visita
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir visita?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
