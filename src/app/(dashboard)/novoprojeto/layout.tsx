'use client'

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

export default function NovoClienteLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // define a etapa ativa com base na rota atual
  const steps = [
    { label: 'Consumo', path: 'consumo' },
    { label: 'Qtd. Placas', path: 'quantidades-placasolar' },
    { label: 'Área Mínima', path: 'area-minima' },
    { label: 'Estimativa', path: 'estimativa' },
    { label: 'Resumo', path: 'resumo' },
  ]

  const currentStep = steps.findIndex(step => pathname.includes(step.path))

  return (
    <div className="text-white mt-5">
      {/* Steps */}
      <ul className="steps w-full mb-5">
        {steps.map((step, index) => (
          <li
            key={step.path}
            className={`step ${index <= currentStep ? 'step-primary' : ''}`}
          >
            {step.label}
          </li>
        ))}
      </ul>

      {/* Conteúdo da etapa atual */}
      <div className="rounded-xl shadow-2xl">
        {children}
      </div>
    </div>
  )
}
