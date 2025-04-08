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
import { format } from 'date-fns'

export default function PrecificacaoPage() {
  // Estados dos campos de entrada
  const [nomeCliente, setNomeCliente] = useState('')
  const [telefone, setTelefone] = useState('')
  const [sugestoes, setSugestoes] = useState<string[]>([])

  // Lista de clientes encontrados
  const [clientes, setClientes] = useState<
    { nomeCliente: string; telefone: string; id: string }[]
  >([])

  // Estado para saber se o cliente existe no banco
  const [clienteExiste, setClienteExiste] = useState<boolean | null>(null)

  // ID do cliente encontrado no Firestore
  const [clienteIdSelecionado, setClienteIdSelecionado] = useState<string>('')

  // Lista de projetos do cliente
  const [projetosDoCliente, setProjetosDoCliente] = useState<
    { id: string; nomeProjeto: string; criadoEm: Timestamp }[]
  >([])

  // ID do projeto selecionado no dropdown
  const [projetoSelecionado, setProjetoSelecionado] = useState<string>('')

  const router = useRouter()

  // Busca clientes no Firestore conforme o nome digitado (para autocomplete)
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

  // Ao selecionar uma sugestão do nome, preenche os campos e limpa sugestões
  const handleSelecionarSugestao = (nome: string) => {
    const cliente = clientes.find((c) => c.nomeCliente === nome)

    if (cliente) {
      setNomeCliente(cliente.nomeCliente)
      setTelefone(cliente.telefone)
      setSugestoes([])
    }
  }

  // Verifica se o cliente existe e busca seus projetos
  useEffect(() => {
    const verificarCliente = async () => {
      if (nomeCliente && telefone) {
        const q = query(
          collection(db, 'clientes'),
          where('nomeCliente', '==', nomeCliente),
          where('telefone', '==', telefone)
        )

        const snapshot = await getDocs(q)

        const existe = !snapshot.empty
        setClienteExiste(existe)

        // Se cliente encontrado, salva o ID e busca os projetos
        if (existe) {
          const clienteDoc = snapshot.docs[0]
          const clienteId = clienteDoc.id
          setClienteIdSelecionado(clienteId)

          const projetosRef = collection(db, `clientes/${clienteId}/projetos`)
          const projetosSnap = await getDocs(projetosRef)

          const projetos = projetosSnap.docs.map((doc) => {
            const data = doc.data()
            return {
              id: doc.id,
              nomeProjeto: data.nomeProjeto || 'Sem nome',
              criadoEm: data.criadoEm || Timestamp.now(),
            }
          })

          setProjetosDoCliente(projetos)
        } else {
          setProjetosDoCliente([])
          setClienteIdSelecionado('')
        }
      } else {
        setClienteExiste(null)
        setProjetosDoCliente([])
        setClienteIdSelecionado('')
      }
    }

    verificarCliente()
  }, [nomeCliente, telefone])

  // Ao clicar em continuar
  const handleIniciarPrecificacao = async () => {
    const user = auth.currentUser

    if (!user) {
      alert('Usuário não autenticado!')
      return
    }

    if (!projetoSelecionado) {
      alert('Selecione um projeto antes de continuar.')
      return
    }

    try {
      const precificacaoRef = await addDoc(
        collection(db, `clientes/${clienteIdSelecionado}/projetos/${projetoSelecionado}/precificacao`),
        {
          clienteId: clienteIdSelecionado,
          projetoId: projetoSelecionado,
          clienteNome: nomeCliente,
          criadoEm: Timestamp.now(),
          criadoPor: user.uid,
          status: 'emAndamento',
      })

      router.push(
        `/precificacao/dados-precificacao?clienteId=${clienteIdSelecionado}&projetoId=${projetoSelecionado}&precificacaoId=${precificacaoRef.id}`
      )
    } catch (error) {
      console.error('Erro ao iniciar precificação:', error)
      alert('Erro ao iniciar precificação.')
    }
  }

  return (
    <div className="text-white flex justify-center items-center h-[780px] shadow-2xl">
      <div className="p-8 rounded-xl shadow-2xl max-w-xl space-y-6 w-full">
        <h2 className="text-2xl font-bold text-center">Nova Precificação</h2>

        {/* Campo de nome com autocomplete */}
        <div className="relative">
          <p className="mb-1">Nome do Cliente:</p>
          <input
            type="text"
            placeholder="Nome do cliente"
            className="input input-bordered w-full"
            value={nomeCliente}
            onChange={(e) => setNomeCliente(e.target.value)}
            required
          />
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

        {/* Campo de telefone com máscara */}
        <div>
        <p className="mb-1">Telefone:</p>
        <IMaskInput
          mask="(00) 00000-0000"
          placeholder="Telefone"
          value={telefone}
          className="input input-bordered w-full"
          onAccept={(value: any) => setTelefone(value)}
          required
        />
        </div>
        
        {/* ⚠️ Mensagem caso o cliente não exista */}
        {clienteExiste === false && (
          <div className="text-red-500 text-sm bg-red-100 border border-red-400 rounded-md p-2">
            Cliente não encontrado. Inicie um projeto primeiro na tela de{' '}
            <strong>Novo Projeto</strong>.
          </div>
        )}

        {/* Dropdown de seleção de projeto (se houver projetos) */}
        {clienteExiste && (
          <div>
            <label className="block mb-1">Selecione o projeto</label>
            {projetosDoCliente.length > 0 ? (
              <select
                className="select select-bordered w-full"
                value={projetoSelecionado}
                onChange={(e) => setProjetoSelecionado(e.target.value)}
              >
                <option value="">Selecione um projeto</option>
                {projetosDoCliente.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.nomeProjeto} - {format(proj.criadoEm.toDate(), 'dd/MM/yyyy')}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-red-500 bg-red-100 border border-red-300 p-2 rounded">
                Este cliente ainda não possui nenhum projeto registrado.
              </p>
            )}
          </div>
        )}

        {/* Botão de continuar */}
        <button
          onClick={handleIniciarPrecificacao}
          className="btn btn-primary w-full"
          disabled={!clienteExiste || projetosDoCliente.length === 0 || !projetoSelecionado}
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
