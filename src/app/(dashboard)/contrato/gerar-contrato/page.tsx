// ✅ Página: /contrato/gerar-contrato/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { getStorage, ref, listAll } from "firebase/storage";
import { saveAs } from "file-saver";
import ResumoProjeto from "@/components/ResumoProjeto";

const storage = getStorage();

export default function GerarContratoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const clienteId = searchParams.get("clienteId");
  const projetoId = searchParams.get("projetoId");
  const precificacaoId = searchParams.get("precificacaoId");

  const [cliente, setCliente] = useState<any>(null);
  const [projeto, setProjeto] = useState<any>(null);
  const [dadosPrecificacao, setDadosPrecificacao] = useState<any>(null);
  const [templateSelecionado, setTemplateSelecionado] = useState("");
  const [templatesStorage, setTemplatesStorage] = useState<string[]>([]);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    if (!clienteId || !projetoId || !precificacaoId) return;

    const fetchData = async () => {
      const clienteSnap = await getDoc(doc(db, "clientes", clienteId));
      const projetoSnap = await getDoc(doc(db, "clientes", clienteId, "projetos", projetoId));
      const precSnap = await getDoc(doc(db, "clientes", clienteId, "projetos", projetoId, "precificacao", precificacaoId, "dadosPrecificacao", precificacaoId));

      if (clienteSnap.exists()) setCliente(clienteSnap.data());
      if (projetoSnap.exists()) setProjeto(projetoSnap.data());
      if (precSnap.exists()) setDadosPrecificacao(precSnap.data());
    };

    fetchData();
  }, [clienteId, projetoId, precificacaoId]);

  useEffect(() => {
    const fetchTemplates = async () => {
      const storageRef = ref(storage, "templates/contratos");
      const result = await listAll(storageRef);
      const nomes = result.items.map((item) => item.name);
      setTemplatesStorage(nomes);
    };
    fetchTemplates();
  }, []);

  const montarCampos = () => {
    const qtdPlacas = projeto?.modo === "manual" ? projeto.qtdPlacasManual : projeto.qtdPlacas;
    const geracao = projeto?.modo === "manual" ? projeto.geracaoMensalManual : projeto.geracaoMensal;

    return {
      nome_cliente: cliente?.nomeCliente ?? "---",
      telefone: cliente?.telefone ?? "---",
      cidade: cliente?.cidade ?? "---",
      estado: cliente?.estado ?? "---",
      projeto_nome: projeto?.nomeProjeto ?? "---",
      qtd_placas: qtdPlacas ?? 0,
      potencia_placa: projeto?.potenciaPlaca ?? "---",
      potencia_total: projeto?.potenciaPico ?? "---",
      area_total: projeto?.areaMinimaTotal ?? "---",
      geracao_mensal: geracao ?? "---",
      valor_total: dadosPrecificacao?.totalVenda
        ? `R$ ${dadosPrecificacao.totalVenda.toFixed(2)}`
        : "---",
      data_assinatura: new Date().toLocaleDateString("pt-BR"),
    };
  };

  const handleGerarContrato = async () => {
    if (!templateSelecionado || !cliente || !projeto || !dadosPrecificacao) {
      alert("Preencha todas as informações antes de gerar o contrato.");
      return;
    }

    try {
      setGerando(true);
      const campos = montarCampos();

      const response = await fetch("/api/gerar-contrato-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: templateSelecionado, campos }),
      });

      if (!response.ok) throw new Error("Erro ao gerar contrato");

      const blob = await response.blob();
      const nomeArquivo = `Contrato-${cliente.nomeCliente.replace(/\s+/g, "_")}-${new Date()
        .toISOString()
        .split("T")[0]}.docx`;

      saveAs(blob, nomeArquivo);
    } catch (error) {
      console.error("❌ Erro ao gerar contrato:", error);
      alert("Erro ao gerar contrato. Verifique os dados e tente novamente.");
    } finally {
      setGerando(false);
    }
  };

  if (!cliente || !projeto || !dadosPrecificacao) {
    return <div className="text-white p-10">Carregando contrato...</div>;
  }

  return (
    <section className="text-white px-6 py-6 space-y-8">
      <h1 className="text-3xl font-bold text-center">Gerar Contrato 📄</h1>

      {/* 🔁 Resumo reutilizável */}
      <ResumoProjeto
  cliente={cliente}
  projeto={projeto}
  dadosPrecificacao={dadosPrecificacao}
  variante="contrato"
/>


      {/* 📄 Seletor de template */}
      <div className="max-w-md mx-auto">
        <label htmlFor="template" className="block font-semibold mb-2">
          Escolha o template de contrato:
        </label>
        <select
          id="template"
          className="select select-bordered w-full"
          value={templateSelecionado}
          onChange={(e) => setTemplateSelecionado(e.target.value)}
        >
          <option value="">Selecione um template</option>
          {templatesStorage.map((template) => (
            <option key={template} value={template}>
              {template.replace(".docx", "")}
            </option>
          ))}
        </select>
      </div>

      {/* 🎯 Botões */}
      <div className="flex justify-end gap-4">
        <button onClick={() => router.push("/contrato")} className="btn btn-outline">
          Voltar
        </button>
        <button
          onClick={handleGerarContrato}
          disabled={gerando || !templateSelecionado}
          className="btn btn-primary"
        >
          {gerando ? "Gerando..." : "Gerar Contrato"}
        </button>
      </div>
    </section>
  );
}
