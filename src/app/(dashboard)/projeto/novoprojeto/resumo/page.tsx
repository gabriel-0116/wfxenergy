"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/firebase/firebaseConfig";
import { addDoc, doc, getDoc, collection, Timestamp } from "firebase/firestore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faFileInvoice,
  faFolderOpen,
  faPerson,
  faRulerCombined,
  faSackDollar,
  faSolarPanel,
} from "@fortawesome/free-solid-svg-icons";
import { nomesLegiveisProjeto } from "@/utils/nomesLegiveis";

export default function ResumoProjetoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clienteId = searchParams.get("clienteId");
  const projetoId = searchParams.get("projetoId");

  const [projeto, setProjeto] = useState<any>(null);
  const [clientes, setClientes] = useState<any>(null);

  // Estado para controle do alerta
  const [showAlerta, setShowAlerta] = useState(false);

  useEffect(() => {
    const fetchProjeto = async () => {
      if (!clienteId || !projetoId) return;

      // Buscar dados do projeto
      const projetoRef = doc(db, "clientes", clienteId, "projetos", projetoId);
      const projetoSnap = await getDoc(projetoRef);

      if (projetoSnap.exists()) {
        setProjeto(projetoSnap.data());
      }

      // Buscar dados do cliente (nome, telefone)
      const clienteRef = doc(db, "clientes", clienteId);
      const clienteSnap = await getDoc(clienteRef);

      if (clienteSnap.exists()) {
        setClientes(clienteSnap.data());
      }
    };

    fetchProjeto();
  }, [clienteId, projetoId]);

  if (!projeto) {
    return (
      <div className="text-white p-10">Carregando dados do projeto...</div>
    );
  }

  const handleSalvar = async () => {
    if (!projeto) return;

    // ✅ Verifica se usuário está logado
    const user = auth.currentUser;
    if (!user) {
      alert("Usuário não autenticado!");
      return;
    }

    // 👉 Salva o alerta no localStorage (para exibir na home)
    localStorage.setItem("alertaHome", "Projeto salvo com sucesso");

    // 📌 Lista de campos obrigatórios para validação
    const camposObrigatorios = [
      "consumoMedioMes",
      "consumoMedioDia",
      "potenciaPlaca",
      "potenciaPico",
      "excedente",
      "areaMinimaTotal",
      "totalComImposto",
      "totalSemImposto",
      projeto?.modo === "manual"
        ? "potenciaInversorManual"
        : "potenciaInversor",
      projeto?.modo === "manual"
        ? "excedenteUnidadeManual"
        : "excedenteUnidade",
      projeto?.modo === "manual" ? "qtdPlacasManual" : "qtdPlacas",
      projeto?.modo === "manual" ? "geracaoMensalManual" : "geracaoMensal",
      projeto?.modo === "manual" ? "geracaoDiariaManual" : "geracaoDiaria",
    ];

    // 🚨 Filtra os campos faltando
    const camposFaltando = camposObrigatorios.filter(
      (campo) => projeto[campo] === undefined || projeto[campo] === null
    );

    if (camposFaltando.length > 0) {
      const nomesFaltando = camposFaltando.map(
        (campo) => nomesLegiveisProjeto[campo] || campo
      );
      alert(
        `Existem campos não preenchidos no projeto:\n- ${nomesFaltando.join(
          "\n- "
        )}`
      );
      return;
    }

    try {
      // ✅ Cria nova precificação em subcoleção do projeto
      const precificacaoRef = await addDoc(
        collection(
          db,
          `clientes/${clienteId}/projetos/${projetoId}/precificacao`
        ),
        {
          clienteId,
          projetoId,
          clienteNome: projeto.nomeCliente || "Sem nome",
          criadoEm: Timestamp.now(),
          criadoPor: user.uid,
          status: "emAndamento",
        }
      );

      const precificacaoId = precificacaoRef.id;

      setShowAlerta(true); // mostra alerta de sucesso

      // ✅ Redireciona para a tela de dados da precificação com IDs
      router.push(
        `/precificacao/dados-precificacao?clienteId=${clienteId}&projetoId=${projetoId}&precificacaoId=${precificacaoId}`
      );
    } catch (error) {
      console.error("Erro ao criar precificação:", error);
      alert("Erro ao criar precificação. Tente novamente.");
    }
  };

  return (
    <section className="text-white h-[700px] px-6 py-6 space-y-8">
      <h1 className="text-3xl font-bold text-center">
        Resumo do Projeto Solar
        <span className="text-3xl ml-5 text-orange-500">
          <FontAwesomeIcon icon={faFolderOpen} />
        </span>
      </h1>
      <div className="">
        <div className="grid grid-cols-2 gap-6">
          {/* Dados do Cliente */}
          <div className="bg-[#1a1a1a] rounded-xl shadow-2xl p-6 space-y-2">
            <h2 className="text-lg font-semibold text-amber-400 mb-3 border-b border-gray-600 pb-2">
              <span className="mr-2 text-zinc-200 text-xl">
                <FontAwesomeIcon icon={faPerson} />
              </span>
              Dados do Cliente
            </h2>
            <div>
              <strong>Nome:</strong> {clientes?.nomeCliente}
            </div>
            <div>
              <strong>Telefone:</strong> {clientes?.telefone}
            </div>
            <div>
              <strong>Projeto:</strong> {projeto.nomeProjeto || "Não informado"}
            </div>

            <h2 className="text-lg font-semibold text-amber-400 mb-3 border-b border-gray-600 pb-2">
              <span className="mr-2 text-zinc-200 text-xl">
                <FontAwesomeIcon icon={faBolt} />
              </span>
              Consumo
            </h2>
            <div>
              <strong>Consumo médio mensal:</strong> {projeto.consumoMedioMes}{" "}
              kWh
            </div>
            <div>
              <strong>Consumo médio diário:</strong> {projeto.consumoMedioDia}{" "}
              kWh
            </div>

            <h2 className="text-lg font-semibold text-amber-400 mb-3 border-b border-gray-600 pb-2">
              <span className="mr-2 text-zinc-200 text-xl">
                <FontAwesomeIcon icon={faRulerCombined} />
              </span>
              Área Mínima Requerida
            </h2>
            <div>
              <strong>Área mínima total:</strong> {projeto.areaMinimaTotal} m²
            </div>
            <div>
              <strong>Dimensão da placa:</strong> {projeto.comprimento}m x{" "}
              {projeto.largura}m
            </div>
          </div>

          {/* Sistema Solar */}
          <div className="bg-[#1a1a1a] rounded-xl shadow-xl p-6 space-y-2">
            <h2 className="text-lg font-semibold text-amber-400 mb-3 border-b border-gray-600 pb-2">
              <span className="mr-2 text-zinc-200 text-xl">
                <FontAwesomeIcon icon={faSolarPanel} />
              </span>
              Sistema Solar
            </h2>
            <div>
              <strong>Modo:</strong>{" "}
              {projeto.modo === "manual" ? "Manual" : "Recomendado"}
            </div>
            <div>
              <strong>Qtd. de placas:</strong>{" "}
              {projeto.modo === "manual"
                ? projeto.qtdPlacasManual ?? "---"
                : projeto.qtdPlacas ?? "---"}
            </div>
            <div>
              <strong>Geração mensal:</strong>{" "}
              {projeto.modo === "manual"
                ? projeto.geracaoMensalManual ?? "---"
                : projeto.geracaoMensal ?? "---"}{" "}
              kWh
            </div>
            <div>
              <strong>Geração diária:</strong>{" "}
              {projeto.modo === "manual"
                ? projeto.geracaoDiariaManual ?? "---"
                : projeto.geracaoDiaria ?? "---"}{" "}
              kWh
            </div>
            <div>
              <strong>Excedente:</strong> {projeto.excedente}%
            </div>
            <div>
              <strong>Excedente Unidade:</strong>{" "}
              {projeto.modo === "manual"
                ? `${projeto.excedenteUnidadeManual?.toFixed(1) ?? "---"} kWh`
                : `${projeto.excedenteUnidade?.toFixed(1) ?? "---"} kWh`}
            </div>
            <div>
              <strong>Potência da placa:</strong> {projeto.potenciaPlaca} W
            </div>
            <div>
              <strong>Potência pico:</strong> {projeto.potenciaPico} kW
            </div>
            <div>
              <strong>Potência mínima do inversor:</strong>{" "}
              {projeto.potenciaInversor || projeto.potenciaInversorManual} kW
            </div>

            <h2 className="text-lg font-semibold text-amber-400 my-3 border-b border-gray-600 pb-2">
              <span className="mr-2 text-zinc-200 text-xl">
                <FontAwesomeIcon icon={faSackDollar} />
              </span>
              Quanto vou pagar ?
            </h2>
            <div>
              <strong>Total com imposto:</strong> R${" "}
              {projeto.totalComImposto.toFixed(2)}
            </div>
            <div>
              <strong>Total sem imposto:</strong> R${" "}
              {projeto.totalSemImposto.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end items-center gap-6 mt-10">
        <button
          type="button"
          onClick={() =>
            router.push(
              `/projeto/novoprojeto/estimativa?clienteId=${clienteId}&projetoId=${projetoId}`
            )
          }
          className="btn btn-outline w-40"
        >
          Voltar
        </button>

        <button
          onClick={handleSalvar}
          type="button"
          className="btn w-40 bg-emerald-500 hover:bg-emerald-600 transition-colors duration-200 shadow-md hover:shadow-lg"
        >
          <span className="text-white font-semibold">Salvar</span>
        </button>
      </div>
    </section>
  );
}
