"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import BottomNavButtons from "@/components/BottomNavButtons";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt, faBell } from "@fortawesome/free-solid-svg-icons";

const sanitizeNumericInput = (value: string) => {
  return value.replace(",", ".").replace(/[^0-9.]/g, "");
};

export default function AreaMinima() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const clienteId = searchParams.get("clienteId");
  const projetoId = searchParams.get("projetoId");

  const [modoManual, setModoManual] = useState(false);
  const [comprimento, setComprimento] = useState(2.43);
  const [largura, setLargura] = useState(1.23);
  const [qtdPlacasManual, setQtdPlacasManual] = useState<number | null>(null);
  const [qtdPlacasRecomendada, setQtdPlacasRecomendada] =
    useState<number | null>(null);
  const [modoSelecionado, setModoSelecionado] =
    useState<"manual" | "recomendado">("recomendado");
  const [loading, setLoading] = useState(true);

  const [estruturaProjeto, setEstruturaProjeto] = useState<string>("");

  useEffect(() => {
    async function fetchProjeto() {
      if (!clienteId || !projetoId) return;

      const ref = doc(db, "clientes", clienteId, "projetos", projetoId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();

        setQtdPlacasManual((data.qtdPlacasManual as number | undefined) ?? null);
        setQtdPlacasRecomendada((data.qtdPlacas as number | undefined) ?? null);

        setModoSelecionado(
          (data.modo as "manual" | "recomendado") || "recomendado"
        );
        setModoManual((data.modoManualDimensao as boolean | undefined) || false);
        setComprimento((data.comprimento as number | undefined) ?? 2.43);
        setLargura((data.largura as number | undefined) ?? 1.23);

        setEstruturaProjeto((data.estruturaProjeto as string | undefined) ?? "");
      }

      setLoading(false);
    }

    fetchProjeto();
  }, [clienteId, projetoId]);

  const handleSubmit = async () => {
    const qtdPlacasUsada =
      modoSelecionado === "manual" ? qtdPlacasManual : qtdPlacasRecomendada;

    if (!clienteId || !projetoId || !qtdPlacasUsada) return;

    if (!estruturaProjeto) {
      alert("Selecione o tipo de estrutura do projeto.");
      return;
    }

    const areaTotal = Math.ceil(largura * comprimento * qtdPlacasUsada);
    const ref = doc(db, "clientes", clienteId, "projetos", projetoId);

    await updateDoc(ref, {
      areaMinimaTotal: areaTotal,
      modoManualDimensao: modoManual,
      comprimento,
      largura,
      estruturaProjeto,
      ultimaModificacao: Timestamp.now(),
    });

    router.push(
      `/projeto/novoprojeto/estimativa?clienteId=${clienteId}&projetoId=${projetoId}`
    );
  };

  if (loading) {
    return (
      <div className="text-white flex justify-center items-center min-h-screen">
        Carregando projeto...
      </div>
    );
  }

  const areaCalculada =
    (qtdPlacasManual || qtdPlacasRecomendada) &&
    Math.ceil(
      comprimento *
        largura *
        (modoSelecionado === "manual"
          ? qtdPlacasManual ?? 0
          : qtdPlacasRecomendada ?? 0)
    );

  return (
    <div className="text-white min-h-screen flex justify-center px-6 py-8">
      <div className="mt-10 w-full max-w-5xl mx-auto">
        <div className="p-6 rounded-xl shadow-2xl space-y-6 bg-[#1a1a1a]">
          <p className="text-2xl font-bold text-center">
            Área mínima necessária
          </p>

          {/* Card com medidas padrão */}
          <div className="card bg-base-100 shadow-2xl text-center">
            <div className="card-body">
              <h2 className="card-title justify-center">
                Dimensões padrão da placa solar
              </h2>
              <p>
                <strong>Comprimento:</strong> 2,43 metros
                <br />
                <strong>Largura:</strong> 1,23 metros
              </p>
            </div>
          </div>

          {/* Modo manual */}
          <div className="text-center">
            <label className="label cursor-pointer justify-center gap-3">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={modoManual}
                onChange={() => setModoManual(!modoManual)}
              />
              <span className="label-text">Editar dimensões manualmente</span>
            </label>
          </div>

          {modoManual && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Comprimento (m)</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={comprimento}
                  step="0.01"
                  onChange={(e) =>
                    setComprimento(parseFloat(e.target.value || "0"))
                  }
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Largura (m)</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={largura}
                  step="0.01"
                  onChange={(e) =>
                    setLargura(parseFloat(e.target.value || "0"))
                  }
                />
              </div>
            </div>
          )}

          {areaCalculada && (
            <div className="mt-6 text-center bg-[#272727] shadow-2xl card p-10">
              <h1 className="mb-4">
                Quantidade de placas selecionadas:{" "}
                <span className="font-bold">
                  {modoSelecionado === "manual"
                    ? qtdPlacasManual
                    : qtdPlacasRecomendada}
                </span>
              </h1>
              <p>Área mínima calculada: </p>
              <p className="font-bold text-xl mt-1">{areaCalculada} m²</p>
            </div>
          )}

          {/* 🔥 AQUI: grid com 2 colunas (cards lado a lado em desktop) */}
          <div className="mt-10">

            {/* CARD: Estrutura */}
            <div className="bg-[#1a1a1a] p-5 rounded-2xl shadow-2xl w-full border border-base-300 flex flex-col">
              <h2 className="font-bold text-white text-lg mb-1 text-center gap-2">
                <span className="text-yellow-400">
                  <FontAwesomeIcon icon={faBolt} />
                </span>{" "}
                Estrutura do Projeto
              </h2>

              <p className="text-gray-500 text-sm font-semibold mb-2">
                <FontAwesomeIcon icon={faBell} className="mr-2" />
                Selecione o tipo de estrutura
              </p>

              <div className="mb-4 w-full flex items-center">
                <label className="block text-sm text-white mb-1 text-center w-32">
                  Estrutura:
                </label>
                <select
                  className="select select-bordered w-full"
                  value={estruturaProjeto}
                  onChange={(e) => setEstruturaProjeto(e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  <option value="Telhado Fibrocimento">Telhado Fibrocimento</option>
                  <option value="Telhado Colonial">Telhado Colonial</option>
                  <option value="Telhado Metal">Telhado Metal</option>
                  <option value="Laje">Laje</option>
                  <option value="Solo">Solo</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <BottomNavButtons
          onBack={() =>
            router.push(
              `/projeto/novoprojeto/quantidades-placasolar?clienteId=${clienteId}&projetoId=${projetoId}`
            )
          }
          onNext={handleSubmit}
        />
      </div>
    </div>
  );
}
