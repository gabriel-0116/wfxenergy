'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { ReactNode, useEffect, useState } from 'react'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase/firebaseConfig'

export default function NovoClienteLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const clienteId = searchParams.get('clienteId')
  const projetoId = searchParams.get('projetoId')

  const [mediaConsumoMes, setMediaConsumoMes] = useState<number | null>(null)
  const [consumoMedioDia, setConsumoMedioDia] = useState<number | null>(null)
  const [modo, setModo] = useState<string | null>(null)
  const [qtdPlacas, setQtdPlacas] = useState<number | null>(null)
  const [qtdPlacasManual, setQtdPlacasManual] = useState<number | null>(null)
  const [potenciaInversor, setPotenciaInversor] = useState<number | null>(null)
  const [potenciaInversorManual, setPotenciaInversorManual] = useState<number | null>(null)
  const [areaMinima, setAreaMinima] = useState<number | null>(null)
  const [totalComImposto, setTotalComImposto] = useState<number | null>(null)

  useEffect(() => {
    if (!clienteId || !projetoId) return
  
    // 🔄 Escuta em tempo real do documento do projeto
    const unsubscribe = onSnapshot(
      doc(db, 'clientes', clienteId, 'projetos', projetoId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data()
  
          // Atualiza todos os estados conforme os dados
          if (data.consumoMedioMes !== undefined) setMediaConsumoMes(data.consumoMedioMes)
          if (data.consumoMedioDia !== undefined) setConsumoMedioDia(data.consumoMedioDia)
          if (data.modo !== undefined) setModo(data.modo)
          if (data.qtdPlacas !== undefined) setQtdPlacas(data.qtdPlacas)
          if (data.qtdPlacasManual !== undefined) setQtdPlacasManual(data.qtdPlacasManual)
          if (data.potenciaInversor !== undefined) setPotenciaInversor(data.potenciaInversor)
          if (data.potenciaInversorManual !== undefined) setPotenciaInversorManual(data.potenciaInversorManual)
          if (data.areaMinimaTotal !== undefined) setAreaMinima(data.areaMinimaTotal)
          if (data.totalComImposto !== undefined) setTotalComImposto(data.totalSemImposto)
        }
      },
      (error) => {
        console.error('Erro ao escutar projeto em tempo real:', error)
      }
    )
  
    // 🚨 Importante: cancela a escuta quando desmontar
    return () => unsubscribe()
  }, [clienteId, projetoId])
  
  // 🧠 MONTA O RESUMO DE QTD PLACAS + INVERSOR COM BASE NO MODO
  const resumoQtdPlacas =
    modo === 'manual'
      ? [
          qtdPlacasManual !== null ? `${qtdPlacasManual} placas` : '',
          potenciaInversorManual !== null ? `${potenciaInversorManual} kWp` : '',
        ]
          .filter(Boolean)
          .join(' | ')
      : [
          qtdPlacas !== null ? `${qtdPlacas} placas` : '',
          potenciaInversor !== null ? `${potenciaInversor} kWp` : '',
        ]
          .filter(Boolean)
          .join(' | ')

  // 📦 DEFINE OS STEPS COM RESUMOS DINÂMICOS
  const steps = [
    {
      label: 'Consumo',
      path: 'consumo',
      resumo:
        mediaConsumoMes !== null && consumoMedioDia !== null
          ? `${mediaConsumoMes} kWh/mês | ${consumoMedioDia} kWh/dia`
          : mediaConsumoMes !== null
          ? `${mediaConsumoMes} kWh/mês`
          : consumoMedioDia !== null
          ? `${consumoMedioDia} kWh/dia`
          : '',
    },
    {
      label: 'Qtd. Placas',
      path: 'quantidades-placasolar',
      resumo: resumoQtdPlacas,
    },
    {
      label: 'Área Mínima',
      path: 'area-minima',
      resumo: areaMinima !== null ? `${areaMinima.toFixed(2)} m²` : '',
    },
    {
      label: 'Estimativa',
      path: 'estimativa',
      resumo: totalComImposto !== null ? `R$ ${totalComImposto.toFixed(2)}` : '',
    },
    {
      label: 'Resumo',
      path: 'resumo',
      resumo: '',
    },
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
            <div className="flex flex-col items-center">
              <span>{step.label}</span>
              {step.resumo && (
                <span className="text-xs text-gray-400 mt-1">
                  {step.resumo}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Conteúdo da etapa atual */}
      <div className="rounded-xl shadow-2xl">{children}</div>
    </div>
  )
}
