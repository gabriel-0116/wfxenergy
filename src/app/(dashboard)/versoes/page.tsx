// 📁 app/versoes/page.tsx
"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClockRotateLeft, faCircleInfo } from "@fortawesome/free-solid-svg-icons";
import { versoes } from "@/utils/versoes";

export default function VersoesPage() {
  return (
    <section className="max-w-4xl mx-auto p-8 text-white">
      <h1 className="text-3xl font-bold mb-8 items-center text-center">
        <FontAwesomeIcon icon={faClockRotateLeft} className="text-yellow-400 mr-4" />
        Histórico de Versões
      </h1>

      {versoes.map((versao) => (
        <div
          key={versao.numero}
          className="mb-6 border border-gray-700 rounded-xl p-5 bg-zinc-900 shadow-md"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Versão {versao.numero}</h2>
            <span className="text-sm text-gray-400">{versao.data}</span>
          </div>

          <ul className="list-disc ml-6 mt-3 text-gray-300 space-y-1">
            {versao.alteracoes.map((texto, idx) => (
              <li key={idx}>{texto}</li>
            ))}
          </ul>
        </div>
      ))}

      <div className="mt-12 text-center text-gray-500 text-sm">
        <FontAwesomeIcon icon={faCircleInfo} className="mr-1 text-blue-400" />
        Última versão publicada: <strong>v{versoes[0].numero}</strong>
      </div>
    </section>
  );
}
