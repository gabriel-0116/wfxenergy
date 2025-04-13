// ✅ Página: /gerar-proposta/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { getStorage, ref, listAll, getDownloadURL } from "firebase/storage";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faFileInvoice,
  faPerson,
  faRulerCombined,
  faSackDollar,
  faSolarPanel,
} from "@fortawesome/free-solid-svg-icons";

const storage = getStorage();

export default function GerarPropostaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clienteId = searchParams.get("clienteId");
  const projetoId = searchParams.get("projetoId");

  const [projeto, setProjeto] = useState<any>(null);
  const [cliente, setCliente] = useState<any>(null);
  const [templateSelecionado, setTemplateSelecionado] = useState<string>("");
  const [templatesStorage, setTemplatesStorage] = useState<string[]>([]);
  const [gerando, setGerando] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    
    const fetchData = async () => {
      if (!clienteId || !projetoId) return;

      const projetoSnap = await getDoc(doc(db, "clientes", clienteId, "projetos", projetoId));
      if (projetoSnap.exists()) setProjeto(projetoSnap.data());

      const clienteSnap = await getDoc(doc(db, "clientes", clienteId));
      if (clienteSnap.exists()) setCliente(clienteSnap.data());
    };
    fetchData();
  }, [clienteId, projetoId]);

  // 🔄 Busca templates diretamente do Firebase Storage
  useEffect(() => {
    const fetchTemplates = async () => {
      const storageRef = ref(storage, "templates");
      const result = await listAll(storageRef);
      const nomes = result.items.map((item) => item.name);
      setTemplatesStorage(nomes);
    };
    fetchTemplates();
  }, []);

  const handleGerarProposta = async () => {
    if (!cliente || !projeto || !templateSelecionado) {
      alert("Preencha todas as informações e selecione um template.");
      return;
    }
  
    setGerando(true);
  
    try {
      const campos = {
        nomeCliente: cliente.nomeCliente,
        cpf: cliente.cpf || "---",
        telefone: cliente.telefone || "---",
        cidade: cliente.cidade || "---",
        estado: cliente.estado || "---",
        dataCriacao: new Date().toLocaleDateString("pt-BR"),
        validade: "7 dias",
        geracaoMedia: `${projeto.geracaoMensal} kWh/mês`,
        potenciaPlacas: `${projeto.potenciaPlaca} W`,
        potenciaInstalada: `${projeto.potenciaPico} kWp`,
        estrutura: "Telhado colonial",
        quantidadePlacas: projeto.qtdPlacas,
        areaNecessaria: `${projeto.areaMinimaTotal} m²`,
        qtdPainelHelius: projeto.qtdPlacas,
        qtdMicroInversor: 2,
        formaPagamento: "R$ 3.000,00 na assinatura do contrato\n20 parcelas de R$ 445,00 com periodicidade de 30 dias",
        nomeClienteAssinatura: cliente.nomeCliente,
        dataAssinatura: `Suzano, ${new Date().toLocaleDateString("pt-BR")}`,
      };
  
      const response = await fetch("/api/gerar-pdf-from-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: templateSelecionado,
          campos,
        }),
      });
  
      if (!response.ok) {
        const error = await response.json();
        console.error("Erro ao gerar PDF:", error);
        alert("Erro ao gerar proposta: " + error.error);
        return;
      }
  
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Proposta-${cliente.nomeCliente}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("Erro inesperado:", err);
      alert("Erro inesperado ao gerar proposta.");
    } finally {
      setGerando(false);
    }
  };

  if (!projeto || !cliente) {
    return <div className="text-white p-10">Carregando proposta...</div>;
  }

  return (
    <section className="text-white px-6 py-6 space-y-8">
      <h1 className="text-3xl font-bold text-center">
        <span className="text-3xl mr-2 text-[#ffc400]">
          <FontAwesomeIcon icon={faFileInvoice} />
        </span>
        Proposta Comercial
      </h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Resumo Cliente/Projeto */}
        <div className="bg-[#1a1a1a] rounded-xl shadow-2xl p-6 space-y-2">
          <h2 className="text-lg font-semibold text-amber-400 mb-3 border-b border-gray-600 pb-2">
            <FontAwesomeIcon icon={faPerson} className="mr-2 text-xl text-[#d3b793]" />
            Dados do Cliente
          </h2>
          <p><strong>Nome:</strong> {cliente.nomeCliente}</p>
          <p><strong>Telefone:</strong> {cliente.telefone}</p>
          <p><strong>Projeto:</strong> {projeto.nomeProjeto || "Não informado"}</p>

          <h2 className="text-lg font-semibold text-amber-400 mb-3 border-b border-gray-600 pb-2">
            <FontAwesomeIcon icon={faBolt} className="mr-2 text-xl text-yellow-400" />
            Consumo
          </h2>
          <p><strong>Consumo médio mensal:</strong> {projeto.consumoMedioMes} kWh</p>
          <p><strong>Consumo médio diário:</strong> {projeto.consumoMedioDia} kWh</p>

          <h2 className="text-lg font-semibold text-amber-400 mb-3 border-b border-gray-600 pb-2">
            <FontAwesomeIcon icon={faRulerCombined} className="mr-2 text-xl text-blue-400" />
            Área Mínima Requerida
          </h2>
          <p><strong>Área mínima total:</strong> {projeto.areaMinimaTotal} m²</p>
          <p><strong>Dimensão da placa:</strong> {projeto.comprimento}m x {projeto.largura}m</p>
        </div>

        {/* Resumo Sistema Solar */}
        <div className="bg-[#1a1a1a] rounded-xl shadow-xl p-6 space-y-2">
          <h2 className="text-lg font-semibold text-amber-400 mb-3 border-b border-gray-600 pb-2">
            <FontAwesomeIcon icon={faSolarPanel} className="mr-2 text-xl text-indigo-400" />
            Sistema Solar
          </h2>
          <p><strong>Modo:</strong> {projeto.modo === "manual" ? "Manual" : "Recomendado"}</p>
          <p><strong>Qtd. de placas:</strong> {projeto.qtdPlacas}</p>
          <p><strong>Potência da placa:</strong> {projeto.potenciaPlaca} W</p>
          <p><strong>Geração mensal:</strong> {projeto.geracaoMensal} kWh</p>
          <p><strong>Potência pico:</strong> {projeto.potenciaPico} kW</p>
          <p><strong>Excedente:</strong> {projeto.excedente}%</p>
          <p><strong>Potência mínima do inversor:</strong> {projeto.potenciaInversor || projeto.potenciaInversorManual} kW</p>
          <p><strong>Excedente Unidade:</strong> {projeto.modo === "manual" ? projeto.excedenteUnidadeManual?.toFixed(1) : projeto.excedenteUnidade?.toFixed(1)} kWh</p>

          <h2 className="text-lg font-semibold text-amber-400 my-3 border-b border-gray-600 pb-2">
            <FontAwesomeIcon icon={faSackDollar} className="mr-2 text-xl text-yellow-200" />
            Quanto vou pagar?
          </h2>
          <p><strong>Total com imposto:</strong> R$ {projeto.totalComImposto.toFixed(2)}</p>
          <p><strong>Total sem imposto:</strong> R$ {projeto.totalSemImposto.toFixed(2)}</p>
        </div>
      </div>

      {/* 🔽 Seletor de template do Storage */}
      <div className="max-w-md mx-auto text-center">
        <label htmlFor="template" className="block font-semibold text-white mb-2 mt-8">
          Escolher Template (Storage)
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

      <div className="flex justify-end items-center gap-6 mt-12">
        <button
          type="button"
          onClick={() => router.push("/proposta")}
          className="btn btn-outline w-40"
        >
          Voltar
        </button>

        <button
  onClick={handleGerarProposta}
  type="button"
  className="btn w-40 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-md"
  disabled={gerando || !templateSelecionado}
>
  {gerando ? "Gerando..." : "Gerar Proposta"}
</button>
      </div>
      <div
  ref={printRef}
  className="absolute top-0 left-0 opacity-0 -z-10 pointer-events-none"
></div>
    </section>
  );
}
