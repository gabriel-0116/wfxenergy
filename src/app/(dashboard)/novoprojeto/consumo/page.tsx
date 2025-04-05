"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import BottomNavButtons from "@/components/BottomNavButtons";

// Função que gera os nomes dos últimos 12 meses
const gerarUltimos12Meses = () => {
  const meses: string[] = [];
  const dataAtual = new Date();

  for (let i = 0; i < 12; i++) {
    const data = new Date(dataAtual.getFullYear(), dataAtual.getMonth() - i, 1);
    const nomeMes = data.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
    meses.push(nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1));
  }

  return meses.reverse();
};

export default function ConsumoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const clienteId = searchParams.get("clienteId");
  const projetoId = searchParams.get("projetoId");

  const meses = gerarUltimos12Meses();

  // Estado para armazenar o consumo mensal digitado
  const [consumoMensal, setConsumoMensal] = useState<string[]>(
    Array(12).fill("")
  );

  // 🔄 Quando a página carregar, busca os dados do Firestore e preenche os campos
  useEffect(() => {
    const carregarConsumo = async () => {
      if (!clienteId || !projetoId) return;

      const projetoRef = doc(db, "clientes", clienteId, "projetos", projetoId);
      const projetoSnap = await getDoc(projetoRef);

      if (projetoSnap.exists()) {
        const data = projetoSnap.data();
        // Se já existe o array consumoMensal salvo, preenche os inputs
        if (data.consumoMensal && Array.isArray(data.consumoMensal)) {
          setConsumoMensal(data.consumoMensal.map((v: number) => v.toString()));
        }
      }
    };

    carregarConsumo();
  }, [clienteId, projetoId]);

  // Atualiza o valor digitado em cada campo mensal
  const handleChange = (index: number, value: string) => {
    const novoConsumo = [...consumoMensal];
    novoConsumo[index] = value;
    setConsumoMensal(novoConsumo);
  };

  // Calcula total e médias
  const valoresNumericos = consumoMensal.map((val) => parseFloat(val) || 0);
  const total = valoresNumericos.reduce((acc, val) => acc + val, 0);
  const media = total / 12;
  const mediaDia = media / 30;

  // Quando o usuário clicar em "Continuar"
  const handleSubmit = async () => {
    if (!clienteId || !projetoId) {
      alert("Cliente ou projeto não encontrados.");
      return;
    }
  
    const algumInvalido = consumoMensal.some(
      (val) => val === "" || isNaN(parseFloat(val))
    );
    if (algumInvalido) {
      alert("Por favor, preencha todos os meses com valores válidos.");
      return;
    }
  
    try {
      const valoresNumericos = consumoMensal.map((val) => parseFloat(val) || 0);
      const total = valoresNumericos.reduce((acc, val) => acc + val, 0);
      const media = total / 12;
      const mediaDia = media / 30;
  
      const projetoRef = doc(db, "clientes", clienteId, "projetos", projetoId);
      await updateDoc(projetoRef, {
        consumoMensal: valoresNumericos,
        consumoMedioMes: parseFloat(media.toFixed(2)),
        consumoMedioDia: parseFloat(mediaDia.toFixed(2)),
      });
  
      // 🔄 Redireciona corretamente após salvar
      router.push(
        `/novoprojeto/quantidades-placasolar?clienteId=${clienteId}&projetoId=${projetoId}`
      );
    } catch (error) {
      console.error("Erro ao salvar consumo:", error);
      alert("Erro ao salvar os dados. Tente novamente.");
    }
  };  

  return (
    <section className="text-white flex justify-center items-center h-[675px] shadow-2xl ">
      <div className="p-6 rounded-xl shadow-2xl max-w-3xl w-full space-y-4 bg-[#1a1a1a]">
        <div onSubmit={handleSubmit}>
          <h2 className="text-2xl font-bold text-center mb-6">
            Informe o consumo dos últimos 12 meses (kWh)
          </h2>

          {/* Inputs dos meses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {meses.map((mes, index) => (
              <div key={index}>
                <label className="block mb-1 text-sm font-medium">{mes}</label>
                <input
                  type="number"
                  min={0}
                  className="input input-sm input-bordered w-full"
                  value={consumoMensal[index]}
                  onChange={(e) => handleChange(index, e.target.value)}
                  required
                />
              </div>
            ))}
          </div>

          {/* Totais calculados */}
          <div className="flex justify-between font-semibold text-sm px-1 mt-4">
            <p>Total: {total.toFixed(2)} kWh</p>
            <p>Média Mês: {media.toFixed(2)} kWh/mês</p>
            <p>Média Dia: {mediaDia.toFixed(2)} kWh/dia</p>
          </div>

          {/* Botões */}
          <BottomNavButtons
            onBack={() =>
              router.push("/novoprojeto")
            }
            onNext={handleSubmit}
          />
        </div>
      </div>
    </section>
  );
}
