"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import BottomNavButtons from "@/components/BottomNavButtons";


export default function ConsumoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const clienteId = searchParams.get("clienteId");
  const projetoId = searchParams.get("projetoId");
  
  // Função que gera os nomes "Período 1" até "Período 12"
  const gerar12Periodos = () => {
    return Array.from({ length: 12 }, (_, i) => `Período ${i + 1}`);
  };

  const periodos = gerar12Periodos();
  
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
        `/projeto/novoprojeto/quantidades-placasolar?clienteId=${clienteId}&projetoId=${projetoId}`
      );
    } catch (error) {
      console.error("Erro ao salvar consumo:", error);
      alert("Erro ao salvar os dados. Tente novamente.");
    }
  };

  const replicarValor = () => {
    const primeiroValor = consumoMensal[0];
  
    // Verifica se tem algo pra replicar
    if (!primeiroValor) {
      alert("Digite um valor no Período 1 para replicar.");
      return;
    }
  
    setConsumoMensal(Array(12).fill(primeiroValor));
  };

  const handleVoltar = () => {
    if (clienteId && projetoId) {
      router.push(`/projeto/novoprojeto?clienteId=${clienteId}&projetoId=${projetoId}`)
    } else {
      router.push("/projeto/novoprojeto") // fallback caso esteja vazio
    }
  }

  return (
    <section className="text-white flex justify-center items-center h-[675px] shadow-2xl ">
      <div className="p-6 rounded-xl shadow-2xl max-w-3xl w-full space-y-4 bg-[#1a1a1a]">
        <div onSubmit={handleSubmit}>
          <h2 className="text-2xl font-bold text-center mb-6">
            Informe o consumo dos últimos 12 períodos (kWh)
          </h2>

          {/* Inputs dos meses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {periodos.map((periodo, index) => (
  <div key={index}>
    <label className="block mb-1 text-sm font-medium">{periodo}</label>
    <div className="flex gap-2">
      <input
        type="number"
        min={0}
        className="input input-sm input-bordered w-full"
        value={consumoMensal[index]}
        onChange={(e) => handleChange(index, e.target.value)}
        required
      />

      {/* Botão de replicar só no primeiro período */}
      {index === 0 && (
        <button
          type="button"
          onClick={replicarValor}
          className="btn btn-sm bg-orange-500 text-white font-normal hover:bg-orange-700"
        >
          Replicar
        </button>
      )}
    </div>
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
            onBack={handleVoltar}
            onNext={handleSubmit}
          />
        </div>
      </div>
    </section>
  );
}
