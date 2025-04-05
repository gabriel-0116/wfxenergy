'use client'

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

export default function PrecificacaoLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // Etapas reais do processo de precificação
  const steps = [
    { label: 'Resumo', path: 'resumo' },
    { label: 'Custos e Venda', path: 'custos' }, // já inclui Comissão Interna
    { label: 'Financiamento', path: 'financiamento' },
    { label: 'Pagamento Fornecedor', path: 'pagamento' },
  ]

  // Detecta o índice da etapa atual com base na rota
  const currentStep = steps.findIndex(step => pathname.includes(step.path))

  return (
    <div className="text-white mt-5">
      {/* Barra de progresso dos steps usando DaisyUI */}
      <ul className="steps w-full mb-5 overflow-x-auto">
        {steps.map((step, index) => (
          <li
            key={step.path}
            className={`step whitespace-nowrap ${index <= currentStep ? 'step-primary' : ''}`}
          >
            {step.label}
          </li>
        ))}
      </ul>

      {/* Conteúdo da etapa atual */}
      <div className="rounded-xl shadow-2xl p-4">
        {children}
      </div>
    </div>
  )
}
