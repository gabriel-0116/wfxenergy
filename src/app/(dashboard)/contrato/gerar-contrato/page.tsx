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
    const nomeClienteCampo =
      cliente.tipoPessoa === "pj" ? cliente.razaoSocial : cliente.nomeCliente;
  
    const cpfOuCnpjCampo =
      cliente.tipoPessoa === "pj" ? cliente.cnpj : cliente.cpf;
  
    const nomeClienteAssinaturaCampo =
      cliente.tipoPessoa === "pj" ? cliente.razaoSocial : cliente.nomeCliente;
  
    const qtdPlacasUsadas =
      projeto.modo === "manual"
        ? projeto.qtdPlacasManual || projeto.qtdPlacas || "---"
        : projeto.qtdPlacas || projeto.qtdPlacasManual || "---";
  
    const geracaoMensal =
      projeto.modo === "manual"
        ? projeto.geracaoMensalManual ?? projeto.geracaoMensal ?? "---"
        : projeto.geracaoMensal ?? projeto.geracaoMensalManual ?? "---";
  
    const consumoMedioMensal =
      projeto.modo === "manual"
        ? projeto.consumoMedioMesManual ?? projeto.consumoMedioMes ?? "---"
        : projeto.consumoMedioMes ?? projeto.consumoMedioMesManual ?? "---";
  
    const consumoMedioDiario =
      projeto.modo === "manual"
        ? projeto.consumoMedioDiaManual ?? projeto.consumoMedioDia ?? "---"
        : projeto.consumoMedioDia ?? projeto.consumoMedioDiaManual ?? "---";
  
    const entrada = parseFloat(dadosPrecificacao?.entrada || "0");
    const totalPago = dadosPrecificacao?.financiamentoSelecionado?.totalPago || 0;
    const totalFinanciado = entrada + totalPago;
  
    function gerarFormaPagamento(dadosPrecificacao: any): string {
      const entrada = parseFloat(dadosPrecificacao?.entrada || "0");
      const parcelas = dadosPrecificacao?.parcelaSelecionada;
      const valorParcela = dadosPrecificacao?.financiamentoSelecionado?.valorParcela;
      const totalVenda = dadosPrecificacao?.totalVenda;
  
      if (parcelas === "avista") {
        if (entrada > 0) {
          return `Entrada: R$ ${entrada.toFixed(2)} | Valor à vista: R$ ${totalVenda.toFixed(2)}`;
        } else {
          return `R$ ${totalVenda.toFixed(2)}`;
        }
      }
  
      if (typeof parcelas === "number" && valorParcela) {
        if (entrada > 0) {
          return `Entrada: R$ ${entrada.toFixed(2)} | ${parcelas}x de R$ ${valorParcela.toFixed(2)}`;
        } else {
          return `${parcelas}x de R$ ${valorParcela.toFixed(2)}`;
        }
      }
  
      return "---";
    }
  
    // Objeto base com todos os campos
    const campos: Record<string, string> = {
      nome_cliente: nomeClienteCampo || "---",
      cpf: cpfOuCnpjCampo || "---",
      telefone: cliente.telefone || "---",
      cidade: cliente.cidade || "---",
      estado: cliente.estado || "---",
      criado_em: new Date().toLocaleDateString("pt-BR"),
      validade: "7 dias",
      geracao_media: `${geracaoMensal} kWh/mês`,
      potencia_placas: `${projeto.potenciaPlaca} W`,
      potencia_instalada: `${projeto.potenciaPico} kWp`,
      estrutura: dadosPrecificacao?.estruturaProjeto || "---",
      quantidade_placas: qtdPlacasUsadas,
      qtd_painel_helius: qtdPlacasUsadas,
      inversor_microinversor: dadosPrecificacao?.tipoInversor ?? "---",
      nome_projeto: projeto?.nomeProjeto || "---",
      qtd_inversor_microinversor:
        dadosPrecificacao?.qtd_inversor_microinversor ?? "---",
      area_necessaria: `${projeto.areaMinimaTotal} m²`,
      potencia_inversor_microinversor: dadosPrecificacao?.potenciaInversorDigitada
        ? `${dadosPrecificacao.potenciaInversorDigitada} kWp`
        : "---",
      valor_a_vista: dadosPrecificacao?.totalVenda
        ? `R$ ${dadosPrecificacao.totalVenda.toFixed(2)}`
        : "---",
      total_financiado: `R$ ${totalFinanciado.toFixed(2)}`,
      forma_pagamento: gerarFormaPagamento(dadosPrecificacao),
      data_assinatura: new Date().toLocaleDateString("pt-BR"),
      nome_cliente_assinatura: nomeClienteAssinaturaCampo || "---",
      consumo_medio_mensal: consumoMedioMensal,
      consumo_medio_diario: consumoMedioDiario,
    };
  
    // ✅ Se for pessoa física, adiciona o RG
    if (cliente.tipoPessoa === "pf") {
      campos.rg = cliente.rg ?? "";
    }
  
    return campos;
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
