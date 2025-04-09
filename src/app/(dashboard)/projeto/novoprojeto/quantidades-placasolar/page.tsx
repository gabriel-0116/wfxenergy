"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import BottomNavButtons from "@/components/BottomNavButtons";

export default function QuantidadePlacasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const clienteId = searchParams.get("clienteId");
  const projetoId = searchParams.get("projetoId");

  // Estados principais
  const [potenciaPlaca, setPotenciaPlaca] = useState("");
  const [qtdManual, setQtdManual] = useState(0);
  const [consumoMedioDia, setConsumoMedioDia] = useState(0);
  const [consumoMedioMes, setConsumoMedioMes] = useState(0);
  const [modoSelecionado, setModoSelecionado] = useState<
    "recomendado" | "manual"
  >("recomendado");
  const [usarIrradiacaoPersonalizada, setUsarIrradiacaoPersonalizada] =
    useState(false);
  const [valorIrradiacao, setValorIrradiacao] = useState(4.42);

  const irradiacaoSolar = valorIrradiacao;

  // Busca os dados do projeto
  useEffect(() => {
    const buscarDados = async () => {
      if (!clienteId || !projetoId) return;
  
      const projetoRef = doc(db, "clientes", clienteId, "projetos", projetoId);
      const projetoSnap = await getDoc(projetoRef);
  
      if (projetoSnap.exists()) {
        const data = projetoSnap.data();
  
        // Consumo
        setConsumoMedioDia(data.consumoMedioDia || 0);
        setConsumoMedioMes(data.consumoMedioMes || 0);
  
        // Dados do projeto (modo anterior)
        if (data.potenciaPlaca) setPotenciaPlaca(data.potenciaPlaca.toString());
        if (data.qtdPlacasManual) setQtdManual(data.qtdPlacasManual); // usado nos dois modos
        if (data.modo) setModoSelecionado(data.modo);
        if (data.valorIrradiacao) {
          setUsarIrradiacaoPersonalizada(true);
          setValorIrradiacao(data.valorIrradiacao);
        }
      }
    };
  
    buscarDados();
  }, [clienteId, projetoId]);

  // Conversão e validação da potência
  const potenciaNumerica = parseFloat(potenciaPlaca);
  const potenciaValida = !isNaN(potenciaNumerica) && potenciaNumerica > 0;

  // Cálculos automáticos (Recomendado)
const producaoMensalPorModulo =
  potenciaValida
    ? (potenciaNumerica / 1000) * irradiacaoSolar * 30 * 0.8
    : 0;

const qtdPlacas = potenciaValida
  ? Math.ceil(consumoMedioMes / producaoMensalPorModulo)
  : 0;

const geracaoMensal = potenciaValida
  ? producaoMensalPorModulo * qtdPlacas
  : 0;

const potenciaPico = potenciaValida
  ? (qtdPlacas * potenciaNumerica) / 1000
  : 0;

const excedente =
  potenciaValida && consumoMedioMes > 0
    ? ((geracaoMensal - consumoMedioMes) / consumoMedioMes) * 100
    : 0;

const potenciaInversor = potenciaValida
  ? potenciaPico / 1.2
  : 0;

  const excedenteUnidade = 
    geracaoMensal - consumoMedioMes

  // Cálculos manuais
  const geracaoMensalManual = potenciaValida
    ? ((qtdManual * potenciaNumerica * 30 * irradiacaoSolar) / 1000) * 0.8
    : 0;

  const potenciaPicoManual = potenciaValida
    ? (qtdManual * potenciaNumerica) / 1000
    : 0;

  const excedenteManual =
    potenciaValida && consumoMedioMes > 0
      ? ((geracaoMensalManual - consumoMedioMes) / consumoMedioMes) * 100
      : 0;

  const potenciaInversorManual = potenciaValida
      ? (((qtdManual * potenciaNumerica) / 1000) / 1.2)
      : 0;
      
      const excedenteUnidadeMensal = 
      geracaoMensalManual - consumoMedioMes

  // Envia os dados salvos com base no modo selecionado
  const handleSubmit = async () => {
    if (!potenciaValida || !clienteId || !projetoId) {
      alert("Preencha todos os dados obrigatórios.");
      return;
    }

    const projetoRef = doc(db, "clientes", clienteId, "projetos", projetoId);

    try {
      if (modoSelecionado === "manual") {
        await updateDoc(projetoRef, {
          modo: "manual",
          qtdPlacasManual: qtdManual, 
          potenciaPlaca: potenciaNumerica,
          geracaoMensal: parseFloat(geracaoMensalManual.toFixed(2)),
          potenciaPico: parseFloat(potenciaPicoManual.toFixed(2)),
          excedente: parseFloat(excedenteManual.toFixed(2)),
          potenciaInversorManual: parseFloat(potenciaInversorManual.toFixed(2)),
        });
      } else {
        await updateDoc(projetoRef, {
          modo: "recomendado",
          qtdPlacas,
          potenciaPlaca: potenciaNumerica,
          geracaoMensal: parseFloat(geracaoMensal.toFixed(2)),
          potenciaPico: parseFloat(potenciaPico.toFixed(2)),
          excedente: parseFloat(excedente.toFixed(2)),
          potenciaInversor: parseFloat(potenciaInversor.toFixed(2)),
        });
      }

      router.push(
        `/projeto/novoprojeto/area-minima?clienteId=${clienteId}&projetoId=${projetoId}`
      );
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar os dados.");
    }
  };

  return (
    <section className="text-white h-[675px] px-6 py-4">
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col lg:flex-row gap-8 mt-10">
          {/* Card: Potência da placa solar + irradiação personalizada */}
          <div className="p-6 rounded-xl shadow-2xl space-y-6 bg-[#1a1a1a]">
            <p className="text-sm text-gray-400 text-center">
              Insira a potência de uma única placa solar que será utilizada no
              projeto (em Watts).
            </p>

            <h2 className="text-2xl font-bold text-center">
              Potência da placa solar
            </h2>

            {/* Input da potência */}
            <input
              type="number"
              min={0}
              className="input input-bordered input-md w-full"
              placeholder="Ex: 600"
              value={potenciaPlaca}
              onChange={(e) => setPotenciaPlaca(e.target.value)}
              required
            />

            {/* Toggle de personalização */}
            <div className="form-control mt-4">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={usarIrradiacaoPersonalizada}
                  onChange={() =>
                    setUsarIrradiacaoPersonalizada(!usarIrradiacaoPersonalizada)
                  }
                />
                <span className="label-text text-white">
                  Deseja personalizar o valor de irradiação solar?
                </span>
              </label>
            </div>

            {/* Input de irradiação (só aparece se ativado) */}
            {usarIrradiacaoPersonalizada ? (
              <input
                type="number"
                min={0}
                step="0.01"
                className="input input-bordered w-full"
                value={valorIrradiacao === 0 ? "" : valorIrradiacao.toString()}
                onChange={(e) => {
                  const valor = parseFloat(e.target.value);
                  if (isNaN(valor)) {
                    setValorIrradiacao(0);
                  } else {
                    setValorIrradiacao(valor);
                  }
                }}
                placeholder="Ex: 5.10"
              />
            ) : (
              <div className="bg-[#0A478F]/20 border border-[#0A478F] text-white text-sm p-3 rounded-lg mt-2">
                💡 Índice de irradiação solar usado nos cálculos:{" "}
                <strong className="text-center justify-center flex">
                  4,42 kWh/m².dia
                </strong>
              </div>
            )}
          </div>

          {/* Resultados */}
          <div className="flex flex-col gap-4 w-full">
            {/* Card do Plano Básico */}
            <div
              className={`relative p-4 rounded-lg shadow-md border-l-4 transition-all duration-200 ${
                modoSelecionado === "recomendado"
                  ? "bg-gray-600 border-green-500"
                  : "bg-[#1a1a1a] border-gray-700"
              }`}
            >
              {/* check */}
              <label className="cursor-pointer flex items-center gap-2">
                <input
                  type="radio"
                  name="modo"
                  value="recomendado"
                  checked={modoSelecionado === "recomendado"}
                  onChange={() => setModoSelecionado("recomendado")}
                  className="radio radio-sm"
                />
                Recomendado
              </label>

              {/* Título */}
              <h3
                className={`font-semibold text-xl mb-10 text-center ${
                  modoSelecionado === "recomendado"
                    ? "text-green-400"
                    : "text-amber-600"
                }`}
              >
                Dimensionamento Recomendado
              </h3>

              {/* Badge de seleção no canto direito */}
              {modoSelecionado === "recomendado" && (
                <span className="absolute top-2 right-4 text-xs font-semibold bg-green-600 px-3 py-1 rounded-full text-white shadow">
                  Selecionado ✅
                </span>
              )}

              {/* Dados */}
              <div className="grid grid-cols-3 gap-4 font-normal">
                <p>
                  Quantidade:{" "}
                  <span className="font-semibold">{qtdPlacas} Unidades</span>
                </p>
                <p>
                  Geração mensal:{" "}
                  <span className="font-semibold">
                    {geracaoMensal.toFixed(0)} kWh
                  </span>
                </p>
                <p>
                  Potência mínima do Inversor:{" "}
                  <span className="font-semibold">{potenciaInversor.toFixed(1)} kW</span>
                </p>
                <p>
                  Pot. Pico Sistema:{" "}
                  <span className="font-semibold">
                    {potenciaPico.toFixed(2)} kW
                  </span>
                </p>
                <p>
                  Excedente (%):{" "}
                  <span className="font-semibold">{excedente.toFixed(1)}%</span>
                </p>

                <p>
                  Excedente (kWh):{" "}
                  <span className="font-semibold">{excedenteUnidade.toFixed(1)} kWh</span>
                </p>

              </div>
            </div>

            {/* Card do Plano Manual */}
            <div
              className={`relative p-4 rounded-lg shadow-md border-l-4 transition-all duration-200 ${
                modoSelecionado === "manual"
                  ? "bg-gray-600 border-green-500"
                  : "bg-[#1a1a1a] border-gray-700"
              }`}
            >
              {/* check */}
              <label className="cursor-pointer flex items-center gap-2">
                <input
                  type="radio"
                  name="modo"
                  value="manual"
                  checked={modoSelecionado === "manual"}
                  onChange={() => setModoSelecionado("manual")}
                  className="radio radio-sm"
                />
                Manual
              </label>
              {/* Título */}
              <h3
                className={`font-semibold text-xl mb-10 text-center ${
                  modoSelecionado === "manual"
                    ? "text-green-400"
                    : "text-amber-600"
                }`}
              >
                Dimensionamento Manual
              </h3>

              {/* Badge de seleção no canto direito */}
              {modoSelecionado === "manual" && (
                <span className="absolute top-2 right-4 text-xs font-semibold bg-green-600 px-3 py-1 rounded-full text-white shadow">
                  Selecionado ✅
                </span>
              )}

              {/* Input de quantidade */}
              <div className="flex items-center gap-2 mb-4">
                <label className="font-normal">Qtd. de placas:</label>
                <input
                  type="number"
                  min={0}
                  value={qtdManual === 0 ? "" : qtdManual.toString()}
                  onChange={(e) => {
                    const valor = parseInt(e.target.value);
                    if (isNaN(valor)) {
                      setQtdManual(0); // ou você pode usar null
                    } else {
                      setQtdManual(valor);
                    }
                  }}
                  className="input input-sm text-sm text-center input-bordered w-20"
                />
              </div>

              {/* Dados */}
              <div className="grid grid-cols-3 gap-4 font-normal">
                <p>
                  Quantidade:{" "}
                  <span className="font-semibold">{qtdManual} Unidades</span>
                </p>
                <p>
                  Geração mensal:{" "}
                  <span className="font-semibold">
                    {geracaoMensalManual.toFixed(0)} kWh
                  </span>
                </p>
                <p>
                  Potência mínima do inversor:{" "}
                  <span className="font-semibold">
                    {potenciaInversorManual.toFixed(1)} kW
                  </span>
                </p>
                <p>
                  Pot. Pico Sistema:{" "}
                  <span className="font-semibold">
                    {potenciaPicoManual.toFixed(2)} kW
                  </span>
                </p>
                <p>
                  Excedente (%):{" "}
                  <span className="font-semibold">
                    {excedenteManual.toFixed(1)}%
                  </span>
                </p>
                <p>
                  Excedente (kWh):{" "}
                  <span className="font-semibold">{excedenteUnidadeMensal.toFixed(1)} kWh</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Botões */}
      <BottomNavButtons
  onBack={() =>
    router.push(
      `/projeto/novoprojeto/consumo?clienteId=${clienteId}&projetoId=${projetoId}`
    )
  }
  onNext={handleSubmit}
/>
    </section>
  );
}
