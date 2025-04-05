"use client";

import React, { useState } from "react";

interface BottomNavButtonsProps {
  onBack: () => void;
  onNext: () => void;
  disableNext?: boolean;
  disableBack?: boolean;
}
export default function BottomNavButtons({
  onBack,
  onNext,
  disableNext = false,
  disableBack = false,
}: BottomNavButtonsProps) {
  const [isLoading, setIsLoading] = useState(false); // ✅ aqui dentro

  const handleContinuar = async () => {
    setIsLoading(true);
    try {
      await onNext(); // espera a ação concluir
    } catch (err) {
      console.error("Erro ao continuar:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-12 right-12 z-50 flex gap-4">
      <button
        onClick={onBack}
        disabled={disableBack}
        className="btn btn-outline w-40"
      >
        Voltar
      </button>

      <button
        onClick={handleContinuar}
        disabled={disableNext || isLoading}
        className="btn btn-primary w-40 flex justify-center items-center"
      >
        {isLoading ? (
          <span className="loading loading-spinner loading-sm text-white" />
        ) : (
          "Continuar"
        )}
      </button>
    </div>
  );
}
