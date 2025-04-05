'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
} from 'firebase/firestore'
import { db, auth } from '@/firebase/firebaseConfig'
import { IMaskInput } from 'react-imask'

export default function PrecificacaoPage() {
  // Estados dos campos
  const [nomeCliente, setNomeCliente] = useState('')
  const [telefone, setTelefone] = useState('')
  const [sugestoes, setSugestoes] = useState<string[]>([])
  const [clientes, setClientes] = useState<
    { nomeCliente: string; telefone: string; id: string }[]
  >([])

  // Estado para controlar se o cliente existe no Firestore
  const [clienteExiste, setClienteExiste] = useState<boolean | null>(null)

  const router = useRouter()

  // Busca clientes no Firestore conforme o nome digitado
  useEffect(() => {
    const buscarClientes = async () => {
      if (nomeCliente.length < 1) {
        setSugestoes([])
        return
      }

      const ref = collection(db, 'clientes')
      const q = query(ref)
      const snapshot = await getDocs(q)

      const encontrados: {
        nomeCliente: string
        telefone: string
        id: string
      }[] = []

      snapshot.forEach((docSnap) => {
        const data = docSnap.data()
        if (
          data.nomeCliente &&
          data.nomeCliente.toLowerCase().includes(nomeCliente.toLowerCase())
        ) {
          encontrados.push({
            nomeCliente: data.nomeCliente,
            telefone: data.telefone,
            id: docSnap.id,
          })
        }
      })

      setClientes(encontrados)
      setSugestoes(encontrados.map((c) => c.nomeCliente))
    }

    buscarClientes()
  }, [nomeCliente])

  // Quando clicar em uma sugestão, preenche nome e telefone
  const handleSelecionarSugestao = (nome: string) => {
    const cliente = clientes.find((c) => c.nomeCliente === nome)

    if (cliente) {
      setNomeCliente(cliente.nomeCliente)
      setTelefone(cliente.telefone)
      setSugestoes([])
    }
  }

  // Verifica se o cliente existe sempre que nome e telefone forem preenchidos
  useEffect(() => {
    const verificarCliente = async () => {
      if (nomeCliente && telefone) {
        const q = query(
          collection(db, 'clientes'),
          where('nomeCliente', '==', nomeCliente),
          where('telefone', '==', telefone)
        )

        const snapshot = await getDocs(q)

        // Define se o cliente existe
        setClienteExiste(!snapshot.empty)
      } else {
        setClienteExiste(null)
      }
    }

    verificarCliente()
  }, [nomeCliente, telefone])

  // Ao clicar em continuar (só se clienteExiste for true)
  const handleIniciarPrecificacao = async () => {
    const user = auth.currentUser

    if (!user) {
      alert('Usuário não autenticado!')
      return
    }

    try {
      // Busca novamente o cliente exato (já foi validado antes)
      const q = query(
        collection(db, 'clientes'),
        where('nomeCliente', '==', nomeCliente),
        where('telefone', '==', telefone)
      )
      const snapshot = await getDocs(q)
      const clienteId = snapshot.docs[0].id

      // Cria a precificação no banco
      const precificacaoRef = await addDoc(collection(db, 'precificacoes'), {
        clienteId,
        clienteNome: nomeCliente,
        criadoEm: Timestamp.now(),
        criadoPor: user.uid,
        status: 'emAndamento',
      })

      // Redireciona para o step 1
      router.push(`/precificacao/resumo?precificacaoId=${precificacaoRef.id}`)
    } catch (error) {
      console.error('Erro ao iniciar precificação:', error)
      alert('Erro ao iniciar precificação.')
    }
  }

  return (
    <div className="text-white flex justify-center items-center h-[620px] shadow-2xl">
      <div className="p-8 rounded-xl shadow-2xl max-w-xl space-y-6 w-full">
        <h2 className="text-2xl font-bold text-center">Nova Precificação</h2>

        {/* Campo de Nome do Cliente com autocomplete */}
        <div className="relative">
          <input
            type="text"
            placeholder="Nome do cliente"
            className="input input-bordered w-full"
            value={nomeCliente}
            onChange={(e) => setNomeCliente(e.target.value)}
            required
          />
          {/* Lista de sugestões (dropdown) */}
          {sugestoes.length > 0 && (
            <ul className="absolute z-10 w-full bg-base-100 shadow-lg rounded-md mt-1 max-h-40 overflow-y-auto">
              {sugestoes.map((nome, index) => (
                <li
                  key={index}
                  className="p-2 hover:bg-base-200 cursor-pointer"
                  onClick={() => handleSelecionarSugestao(nome)}
                >
                  {nome}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Campo de telefone */}
        <IMaskInput
          mask="(00) 00000-0000"
          placeholder="Telefone"
          value={telefone}
          className="input input-bordered w-full"
          onAccept={(value: any) => setTelefone(value)}
          required
        />

        {/* ⚠️ Mensagem caso o cliente não exista */}
        {clienteExiste === false && (
          <div className="text-red-500 text-sm bg-red-100 border border-red-400 rounded-md p-2">
            Cliente não encontrado. Inicie um projeto primeiro na tela de <strong>Novo Projeto</strong>.
          </div>
        )}

        {/* Botão para continuar */}
        <button
          onClick={handleIniciarPrecificacao}
          className="btn btn-primary w-full"
          disabled={!clienteExiste}
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
