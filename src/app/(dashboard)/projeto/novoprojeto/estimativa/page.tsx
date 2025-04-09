"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import BottomNavButtons from "@/components/BottomNavButtons";
import { faDollarSign } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function EstimativaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clienteId = searchParams.get("clienteId");
  const projetoId = searchParams.get("projetoId");

  // estados convertidos para string para permitir apagar input sem erro
  const [tipoLigacao, setTipoLigacao] = useState("");
  const [valorKWh, setValorKWh] = useState("0.7");
  const [fioB, setFioB] = useState("0.2");
  const [percentualFioB, setPercentualFioB] = useState("45");
  const [percentualImposto, setPercentualImposto] = useState("35");
  const [percentualInjecao, setPercentualInjecao] = useState("40");

  const [consumoMedio, setConsumoMedio] = useState(0);
  const [geracaoMedia, setGeracaoMedia] = useState(0);

  const [tarifaMinima, setTarifaMinima] = useState(0);
  const [iluminacaoPublica, setIluminacaoPublica] = useState(0);

  const valorKWhNum = parseFloat(valorKWh || "0");
  const fioBNum = parseFloat(fioB || "0");
  const percentualFioBNum = parseFloat(percentualFioB || "0");
  const percentualImpostoNum = parseFloat(percentualImposto || "0");
  const percentualInjecaoNum = parseFloat(percentualInjecao || "0");

  const handleSubmit = async () => {
    if (!clienteId || !projetoId) return;

    const ref = doc(db, "clientes", clienteId, "projetos", projetoId);

    const estimativaData = {
      tipoLigacao,
      valorKWh: valorKWhNum,
      tarifaMinima,
      iluminacaoPublica,
      injecaoEstimada,
      percentualInjecao: percentualInjecaoNum,
      consumoTempoReal,
      fioB: fioBNum,
      percentualFioB: percentualFioBNum,
      fioBCalculado,
      fioBaPagar,
      consumoAPagar,
      totalSemImposto,
      percentualImposto: percentualImpostoNum,
      totalComImposto,
    };

    try {
      await updateDoc(ref, estimativaData);
      router.push(
        `/projeto/novoprojeto/resumo?clienteId=${clienteId}&projetoId=${projetoId}`
      );
    } catch (error) {
      console.error("Erro ao salvar estimativa:", error);
    }
  };

  useEffect(() => {
    const fetchProjeto = async () => {
      if (!clienteId || !projetoId) return;

      const ref = doc(db, "clientes", clienteId, "projetos", projetoId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setConsumoMedio(data.consumoMedioMes || 0);
        setGeracaoMedia(data.geracaoMensal || 0);
        setTipoLigacao(data.tipoLigacao || "");
        setValorKWh((data.valorKWh || 0.7).toString());
        setFioB((data.fioB || 0.2).toString());
        setPercentualFioB((data.percentualFioB || 45).toString());
        setPercentualImposto((data.percentualImposto || 35).toString());
        setPercentualInjecao((data.percentualInjecao || 40).toString());
      }
    };

    fetchProjeto();
  }, [clienteId, projetoId]);

  useEffect(() => {
    const fator =
      tipoLigacao === "Monofásico"
        ? 30
        : tipoLigacao === "Bifásico"
        ? 50
        : tipoLigacao === "Trifásico"
        ? 100
        : 0;
    const calculo = fator * valorKWhNum;
    setTarifaMinima(calculo);
    setIluminacaoPublica(calculo);
  }, [tipoLigacao, valorKWhNum]);

  const injecaoEstimada = geracaoMedia * (percentualInjecaoNum / 100);
  const consumoTempoReal = geracaoMedia - injecaoEstimada;
  const fioBCalculado = fioBNum * (percentualFioBNum / 100);
  const fioBaPagar = injecaoEstimada * fioBCalculado;
  const consumoConcessionaria = (consumoMedio - consumoTempoReal);
  const consumoAPagar = consumoConcessionaria * valorKWhNum;
  const injecaoPaga = (valorKWhNum - fioBCalculado) * injecaoEstimada;
  const totalSemImposto = (consumoAPagar + fioBaPagar + iluminacaoPublica) - injecaoPaga;
  const totalComImposto = totalSemImposto + totalSemImposto * (percentualImpostoNum / 100);

  return (
    <section className="text-white h-[850px]">
      <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl border border-base-300 p-8 max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center text-white">
          <span className="text-emerald-500">
            <FontAwesomeIcon icon={faDollarSign} className="mr-2" />
          </span>
          Quanto vou pagar ?
        </h1>
        <div className="flex flex-wrap justify-center gap-6">
          <div className="form-control w-44">
            <label className="label text-sm text-white mb-2">Tipo de Ligação:</label>
            <select
              className="select select-sm select-bordered bg-base-200 text-white"
              value={tipoLigacao}
              onChange={(e) => setTipoLigacao(e.target.value)}
            >
              <option disabled value="">
                Selecione
              </option>
              <option>Monofásico</option>
              <option>Bifásico</option>
              <option>Trifásico</option>
            </select>
          </div>

          <div className="form-control w-44">
            <label className="label text-sm text-white mb-2">
              Valor do kWh (TUSD + TE):
            </label>
            <input
              type="number"
              step="0.01"
              className="input input-sm input-bordered bg-base-200 text-white"
              value={valorKWh}
              onChange={(e) => setValorKWh(e.target.value)}
            />
          </div>

          <div className="form-control w-44">
            <label className="label text-sm text-white mb-2">Fio B (R$/kWh):</label>
            <input
              type="number"
              step="0.01"
              className="input input-sm input-bordered bg-base-200 text-white"
              value={fioB}
              onChange={(e) => setFioB(e.target.value)}
            />
          </div>

          <div className="form-control w-44">
            <label className="label text-sm text-white mb-2">
              Fio B % (Ano Atual):
            </label>
            <input
              type="number"
              step="1"
              className="input input-sm input-bordered bg-base-200 text-white"
              value={percentualFioB}
              onChange={(e) => setPercentualFioB(e.target.value)}
            />
          </div>

          <div className="form-control w-44">
            <label className="label text-sm text-white mb-2">
              Injeção Estimada (%):
            </label>
            <input
              type="number"
              step="1"
              className="input input-sm input-bordered bg-base-200 text-white"
              value={percentualInjecao}
              onChange={(e) => setPercentualInjecao(e.target.value)}
            />
          </div>


          <div className="form-control w-44">
            <label className="label text-sm text-white mb-2">Imposto (%):</label>
            <input
              type="number"
              step="1"
              className="input input-sm input-bordered bg-base-200 text-white"
              value={percentualImposto}
              onChange={(e) => setPercentualImposto(e.target.value)}
            />
          </div>
        </div>

        {/* Cards lado a lado responsivos */}
        <div className="grid grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className="bg-[#272727] shadow-2xl rounded-xl p-5">
            <h2 className="text-xl font-bold mb-2 text-[#63a2e9] border-b border-gray-400 pb-2">
              Dados de Consumo e Geração
            </h2>
            <div className="grid ">
              <ul className="text-sm space-y-2">
                <li>Consumo Médio: {consumoMedio} kWh/mês</li>
                <li>Geração Média: {geracaoMedia} kWh/mês</li>
                <li>Injeção Estimada: {injecaoEstimada.toFixed(2)} kWh/mês</li>
                <li>
                  Consumo em Tempo Real: {consumoTempoReal.toFixed(2)} kWh/mês
                </li>
              </ul>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#272727] shadow-2xl rounded-xl p-5">
            <h2 className="text-xl font-bold mb-2 text-[#63a2e9] border-b border-gray-400 pb-2">
              Tarifas e Encargos
            </h2>
            <ul className="text-sm space-y-2">
              <li className="mt-2">
                Tarifa Mínima: R$ {tarifaMinima.toFixed(2)}
              </li>
              <li>CIP (Iluminação Pública): R$ {iluminacaoPublica.toFixed(2)}</li>
            </ul>
          </div>

          {/* Card 3 */}
          <div className="bg-[#272727] shadow-2xl rounded-xl  p-5">
            <h2 className="text-xl font-bold mb-2 text-[#63a2e9] border-b border-gray-400 pb-2">
              Cálculo do Fio B
            </h2>
            <ul className="text-sm space-y-2">
              <li>Fio B Calculado por kWh: R$ {fioBCalculado.toFixed(4)}</li>
              <li>Fio B (Distribuição): R$ {fioBaPagar.toFixed(2)}</li>
            </ul>
          </div>

         {/* Card 4 - Conta Final Estimada */}
<div className="bg-[#272727] shadow-2xl rounded-xl p-5 space-y-4">
  <h2 className="text-xl font-bold mb-2 text-[#63a2e9] border-b border-gray-400 pb-2">
    Cálculo da Conta Estimada
  </h2>

  <p className="text-sm text-gray-300">
    <span className="font-semibold">Fórmula:</span> <br />
    (Consumo da Concessionária + Fio B + CIP) – Crédito por Injeção
  </p>

  <hr className="border-gray-600" />

  <ul className="text-sm space-y-2">
    <li>
      <span className="text-white font-normal">Consumo da Concessionária:</span>{" "}
      <span className="text-white font-medium">+ R$ {consumoAPagar.toFixed(2)}</span>
    </li>
    <li>
      <span className="text-white font-normal">Fio B (Distribuição):</span>{" "}
      <span className="text-white font-medium">+ R$ {fioBaPagar.toFixed(2)}</span>
    </li>
    <li>
      <span className="text-white font-normal">CIP (Iluminação Pública):</span>{" "}
      <span className="text-white font-medium">+ R$ {iluminacaoPublica.toFixed(2)}</span>
    </li>
    <li>
      <span className="text-white font-normal">Crédito por Energia Injetada:</span>{" "}
      <span className="text-white font-medium">– R$ {injecaoPaga.toFixed(2)}</span>
    </li>
  </ul>

  <hr className="border-gray-600" />
<div className="flex text-center">
  <div className="text-lg font-semibold text-yellow-400 flex items-center gap-2 mr-5">
    Total Sem Imposto:{" "}
    <span className="text-white">R$ {totalSemImposto.toFixed(2)}</span>
  </div>
  <div className="text-lg font-semibold text-yellow-400 flex items-center gap-2">
    Total Com Imposto:{" "}
    <span className="text-white">R$ {totalComImposto.toFixed(2)}</span>
  </div>
  </div>
</div>

        </div>

        <BottomNavButtons
          onBack={() =>
            router.push(
              `/projeto/novoprojeto/area-minima?clienteId=${clienteId}&projetoId=${projetoId}`
            )
          }
          onNext={handleSubmit}
        />
      </div>
    </section>
  );
}
