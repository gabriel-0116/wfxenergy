"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import BottomNavButtons from "@/components/BottomNavButtons";

export default function AreaMinima() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const clienteId = searchParams.get("clienteId");
  const projetoId = searchParams.get("projetoId");

  const [modoManual, setModoManual] = useState(false);
  const [comprimento, setComprimento] = useState(2.36);
  const [largura, setLargura] = useState(1.14);
  const [qtdPlacas, setQtdPlacas] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Buscar dados do projeto
  useEffect(() => {
    async function fetchProjeto() {
      if (!clienteId || !projetoId) return;
  
      const ref = doc(db, "clientes", clienteId, "projetos", projetoId);
      const snap = await getDoc(ref);
  
      if (snap.exists()) {
        const data = snap.data();
  
        const qtd = data.qtdPlacas ?? data.qtdPlacasManual;
        setQtdPlacas(qtd);
  
        // 🟩 Sempre tenta restaurar os valores salvos (mesmo se estiver no modo padrão)
        setModoManual(data.modoManualDimensao || false);
        setComprimento(data.comprimento ?? 2.36);
        setLargura(data.largura ?? 1.14);
      }
  
      setLoading(false);
    }
  
    fetchProjeto();
  }, [clienteId, projetoId]);

  const handleSubmit = async () => {
    if (!clienteId || !projetoId || !qtdPlacas) return;

    const areaTotal = Number((largura * comprimento * qtdPlacas).toFixed(2));

    const ref = doc(db, "clientes", clienteId, "projetos", projetoId);

    await updateDoc(ref, {
      areaMinimaTotal: areaTotal,
      modoManualDimensao: modoManual,
      comprimento,
      largura,
    });

    console.log("✅ Área mínima salva:", areaTotal, "m²");

    router.push(
      `/projeto/novoprojeto/estimativa?clienteId=${clienteId}&projetoId=${projetoId}`
    );
  };

  return (
    <div className="text-white h-[675px] flex justify-center px-6 py-4">
      <div className="lg:flex-row gap-8 mt-10">
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
                <strong>Comprimento:</strong> 2,36 metros
                <br />
                <strong>Largura:</strong> 1,14 metros
              </p>
            </div>
          </div>

          {/* Checkbox para ativar modo manual */}
          <div className="text-center">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={modoManual}
                onChange={() => setModoManual(!modoManual)}
              />
              <span className="label-text">Editar dimensões manualmente</span>
            </label>
          </div>

          {/* Inputs aparecem apenas se modo manual estiver ativado */}
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
                  onChange={(e) => setComprimento(parseFloat(e.target.value))}
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
                  onChange={(e) => setLargura(parseFloat(e.target.value))}
                />
              </div>
            </div>
          )}

          {/* Mostrar área calculada (opcional) */}
          {qtdPlacas && (
            <div className="mt-6 text-center bg-[#272727] shadow-2xl card p-10">
              <h1 className="mb-4">
                Quantidade de placas selecionadas: <span className="font-bold">{qtdPlacas}</span>
              </h1>
              <p>Área mínima calculada: </p>
              <p className="font-bold text-xl mt-1">
                {(comprimento * largura * qtdPlacas).toFixed(2)} m²
              </p>
            </div>
          )}
        </div>

        {/* Botões */}
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
