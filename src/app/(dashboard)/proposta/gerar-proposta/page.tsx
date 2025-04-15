// ✅ Página: /gerar-proposta/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/firebase/firebaseConfig";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { getStorage, ref, listAll, getDownloadURL } from "firebase/storage";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faFileInvoice,
  faPerson,
  faRulerCombined,
  faSackDollar,
  faSolarPanel,
} from "@fortawesome/free-solid-svg-icons";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

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
  const [dadosPrecificacao, setDadosPrecificacao] = useState<any>(null);

  const printRef = useRef<HTMLDivElement>(null);
  

  useEffect(() => {
    const fetchData = async () => {
      if (!clienteId || !projetoId) return;

      const projetoSnap = await getDoc(
        doc(db, "clientes", clienteId, "projetos", projetoId)
      );
      if (projetoSnap.exists()) setProjeto(projetoSnap.data());

      const clienteSnap = await getDoc(doc(db, "clientes", clienteId));
      if (clienteSnap.exists()) {
        setCliente(clienteSnap.data());
        await fetchPrecificacao(); // <- Adiciona isso aqui
      }
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

  const fetchPrecificacao = async () => {

    const precificacaoRef = collection(
      db,
      "clientes",
      clienteId!,
      "projetos",
      projetoId!,
      "precificacao"
    );
    const precificacoes = await getDocs(precificacaoRef);

    if (precificacoes.empty) return;

    const primeiro = precificacoes.docs[0];
    const precificacaoId = primeiro.id;

    const dadosPrecificacaoSnap = await getDoc(
      doc(
        db,
        "clientes",
        clienteId!,
        "projetos",
        projetoId!,
        "precificacao",
        precificacaoId,
        "dadosPrecificacao",
        precificacaoId
      )
    );

    if (dadosPrecificacaoSnap.exists()) {
      const dados = dadosPrecificacaoSnap.data();
      setDadosPrecificacao(dados); // novo estado
    }
  };

  function gerarFormaPagamento(
    parcelaSelecionada: string,
    entrada?: number,
    financiamentoSelecionado?: {
      parcelas: number;
      valorParcela: number;
      totalPago: number;
      valorFinalProjeto: number;
    }
  ): string {
    if (parcelaSelecionada === "avista") {
      return "Pagamento à vista";
    }

    if (!financiamentoSelecionado) return "---";

    const { parcelas, valorParcela, totalPago, valorFinalProjeto } =
      financiamentoSelecionado;

    const format = (valor: number) =>
      valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

    let texto = "";

    if (entrada && entrada > 0) {
      texto += `Entrada de ${format(entrada)} + `;
    }

    texto += `${parcelas}x de ${format(valorParcela)} = ${format(totalPago)}\n`;
    texto += `Total do Projeto: ${format(valorFinalProjeto)}`;

    return texto;
  }

  const handleGerarProposta = async () => {
    if (!cliente || !projeto || !templateSelecionado || !dadosPrecificacao) {
      alert("Ainda carregando dados da precificação. Tente novamente em alguns segundos.");
      return;
    }
  
    setGerando(true);
    try {
      // 🔁 Monta os campos no formato snake_case conforme o template
      const campos = {
        nome_cliente: cliente.nomeCliente,
        cpf: cliente.cpf || "---",
        telefone: cliente.telefone || "---",
        cidade: cliente.cidade || "---",
        estado: cliente.estado || "---",
        criado_em: new Date().toLocaleDateString("pt-BR"),
        validade: "7 dias",
        geracao_media: `${projeto.geracaoMensal} kWh/mês`,
        potencia_placas: `${projeto.potenciaPlaca} W`,
        potencia_instalada: `${projeto.potenciaPico} kWp`,
        estrutura: "Telhado colonial",
        quantidade_placas: projeto.qtdPlacas,
        area_necessaria: `${projeto.areaMinimaTotal} m²`,
        qtd_painel_helius: projeto.qtdPlacas,
        qtd_microinversor: 2,
        total_venda: dadosPrecificacao?.totalVenda
          ? `R$${dadosPrecificacao.totalVenda.toFixed(2)}`
          : "---",
        forma_pagamento: gerarFormaPagamento(
          dadosPrecificacao?.parcelaSelecionada,
          dadosPrecificacao?.entrada,
          dadosPrecificacao?.financiamentoSelecionado
        ),
        data_assinatura: `${new Date().toLocaleDateString("pt-BR")}`,
        nome_cliente_assinatura: cliente.nomeCliente,
      };
  
      // 🔽 Baixa o template do Firebase Storage
      const url = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/templates%2F${encodeURIComponent(
        templateSelecionado
      )}?alt=media`;
  
      console.log("🔗 URL gerada para o template:", url);

      const response = await fetch("/api/download-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: templateSelecionado }),
      });
      
      // 📦 Verifica se a resposta é válida
      if (!response.ok) {
        console.error("❌ Erro ao baixar o template:", response.status, response.statusText);
        throw new Error("Não foi possível baixar o template do Firebase Storage.");
      }
      
      // 📎 Verifica o tipo de conteúdo retornado
      console.log("📄 Content-Type:", response.headers.get("Content-Type"));
      
      // ⬇️ Transforma em blob
      const blob = await response.blob();
      console.log("📦 Blob size:", blob.size, "type:", blob.type);
      
      // 💾 Transforma em ArrayBuffer para leitura binária
      const arrayBuffer = await blob.arrayBuffer();
      console.log("🔍 ArrayBuffer byteLength:", arrayBuffer.byteLength);
      
      // 🧪 Teste adicional: verificar se os primeiros bytes são válidos (arquivo zip começa com 0x50 0x4B)
      const bytes = new Uint8Array(arrayBuffer.slice(0, 4));
      console.log("📊 First 4 bytes of file:", bytes);
      
      // Agora tenta carregar no PizZip
      let zip;
      try {
        zip = new PizZip(arrayBuffer);
      } catch (e) {
        console.error("❌ Erro ao criar PizZip. O arquivo é realmente um .docx válido?", e);
        throw e;
      }
      
  
      // 🧩 Preenche o template com os campos
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: "[[", end: "]]" }, // 👈 isso é essencial
      });
  
      doc.setData(campos);
  
      try {
        doc.render();
      } catch (error) {
        console.error("Erro ao renderizar o .docx:", error);
        alert("Erro ao preencher os campos do template.");
        return;
      }
  
      // 💾 Gera o novo .docx preenchido
      const out = doc.getZip().generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
  
      const nomeArquivo = `Proposta-${cliente.nomeCliente}-${new Date().getTime()}.docx`;
saveAs(out, nomeArquivo);
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
            <FontAwesomeIcon
              icon={faPerson}
              className="mr-2 text-xl text-[#d3b793]"
            />
            Dados do Cliente
          </h2>
          <p>
            <strong>Nome:</strong> {cliente.nomeCliente}
          </p>
          <p>
            <strong>Telefone:</strong> {cliente.telefone}
          </p>
          <p>
            <strong>Projeto:</strong> {projeto.nomeProjeto || "Não informado"}
          </p>

          <h2 className="text-lg font-semibold text-amber-400 mb-3 border-b border-gray-600 pb-2">
            <FontAwesomeIcon
              icon={faBolt}
              className="mr-2 text-xl text-yellow-400"
            />
            Consumo
          </h2>
          <p>
            <strong>Consumo médio mensal:</strong> {projeto.consumoMedioMes} kWh
          </p>
          <p>
            <strong>Consumo médio diário:</strong> {projeto.consumoMedioDia} kWh
          </p>

          <h2 className="text-lg font-semibold text-amber-400 mb-3 border-b border-gray-600 pb-2">
            <FontAwesomeIcon
              icon={faRulerCombined}
              className="mr-2 text-xl text-blue-400"
            />
            Área Mínima Requerida
          </h2>
          <p>
            <strong>Área mínima total:</strong> {projeto.areaMinimaTotal} m²
          </p>
          <p>
            <strong>Dimensão da placa:</strong> {projeto.comprimento}m x{" "}
            {projeto.largura}m
          </p>
        </div>

        {/* Resumo Sistema Solar */}
        <div className="bg-[#1a1a1a] rounded-xl shadow-xl p-6 space-y-2">
          <h2 className="text-lg font-semibold text-amber-400 mb-3 border-b border-gray-600 pb-2">
            <FontAwesomeIcon
              icon={faSolarPanel}
              className="mr-2 text-xl text-indigo-400"
            />
            Sistema Solar
          </h2>
          <p>
            <strong>Modo:</strong>{" "}
            {projeto.modo === "manual" ? "Manual" : "Recomendado"}
          </p>
          <p>
            <strong>Qtd. de placas:</strong> {projeto.qtdPlacas}
          </p>
          <p>
            <strong>Potência da placa:</strong> {projeto.potenciaPlaca} W
          </p>
          <p>
            <strong>Geração mensal:</strong> {projeto.geracaoMensal} kWh
          </p>
          <p>
            <strong>Potência pico:</strong> {projeto.potenciaPico} kW
          </p>
          <p>
            <strong>Excedente:</strong> {projeto.excedente}%
          </p>
          <p>
            <strong>Potência mínima do inversor:</strong>{" "}
            {projeto.potenciaInversor || projeto.potenciaInversorManual} kW
          </p>
          <p>
            <strong>Excedente Unidade:</strong>{" "}
            {projeto.modo === "manual"
              ? projeto.excedenteUnidadeManual?.toFixed(1)
              : projeto.excedenteUnidade?.toFixed(1)}{" "}
            kWh
          </p>

          <h2 className="text-lg font-semibold text-amber-400 my-3 border-b border-gray-600 pb-2">
            <FontAwesomeIcon
              icon={faSackDollar}
              className="mr-2 text-xl text-yellow-200"
            />
            Quanto vou pagar?
          </h2>
          <p>
            <strong>Total com imposto:</strong> R${" "}
            {projeto.totalComImposto.toFixed(2)}
          </p>
          <p>
            <strong>Total sem imposto:</strong> R${" "}
            {projeto.totalSemImposto.toFixed(2)}
          </p>
        </div>
      </div>

      {/* 🔽 Seletor de template do Storage */}
      <div className="max-w-md mx-auto text-center">
        <label
          htmlFor="template"
          className="block font-semibold text-white mb-2 mt-8"
        >
          Escolher Template (Storage)
        </label>
        <select
          id="template"
          className="select select-bordered w-full"
          value={templateSelecionado}
          onChange={(e) => setTemplateSelecionado(e.target.value)}
        >
          <option value="">Selecione um template</option>
          {templatesStorage
  .filter((t) => t.endsWith(".docx"))
  .map((template) => (
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
