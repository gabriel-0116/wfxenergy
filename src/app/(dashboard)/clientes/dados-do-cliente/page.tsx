"use client";

import { IMaskInput } from "react-imask";
import { useState } from "react";
import { useEffect } from "react";
import { doc, updateDoc, getDoc, collection, addDoc } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import { useRouter, useSearchParams } from "next/navigation";
import { estadosBrasil } from "@/utils/estados";
import { validCPF, validCNPJ } from "@/utils/validacoes";

export default function DadosDoClientePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clienteId = searchParams.get("id");

  // Estados dos dados do cliente
  const [tipoPessoa, setTipoPessoa] = useState<"PF" | "PJ">("PF");
  const [situacao, setSituacao] = useState<"Ativo" | "Inativo">("Ativo");
  const [isento, setIsento] = useState(false);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [genero, setGenero] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [observacao, setObservacao] = useState("");
  const [rg, setRg] = useState("");
  const [erroCpf, setErroCpf] = useState<string | null>(null);
  const [erroNome, setErroNome] = useState<string | null>(null);
  const [erroTelefone, setErroTelefone] = useState<string | null>(null);

  // Dados exclusivos para Pessoa Jurídica
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState("");
  const [erroCnpj, setErroCnpj] = useState<string | null>(null);

  // Estado para controle do alerta
  const [showAlerta, setShowAlerta] = useState(false);

  // Estado para o endereço com base no CEP
  const [enderecos, setEnderecos] = useState([
    {
      cep: "",
      endereco: "",
      numero: "",
      bairro: "",
      cidade: "",
      estado: "",
      pais: "Brasil",
      complemento: "",
      referencia: "",
    },
  ]);

  // Função para buscar endereço usando a API do ViaCEP
  const buscarCep = async () => {
    const cepLimpo = enderecos[0].cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) {
      alert("Digite um CEP válido com 8 dígitos.");
      return;
    }

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cepLimpo}/json/`
      );
      const data = await response.json();

      if (data.erro) {
        alert("CEP não encontrado.");
        return;
      }

      // Atualiza os campos do endereço automaticamente
      setEnderecos([
        {
          ...enderecos[0],
          endereco: data.logradouro || "",
          bairro: data.bairro || "",
          cidade: data.localidade || "",
          estado: data.uf || "",
        },
      ]);
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      alert("Erro ao buscar endereço. Tente novamente.");
    }
  };

  const salvarCliente = async () => {
    // Verificações de campos obrigatórios
    if (!nome.trim()) {
      setErroNome("O nome é obrigatório.");
      return;
    }
  
    if (!telefone.trim()) {
      setErroTelefone("O telefone é obrigatório.");
      return;
    }
  
    // Valida CPF apenas se foi preenchido
    if (tipoPessoa === "PF" && cpf.trim() !== "" && !validCPF(cpf)) {
      setErroCpf("CPF inválido. Verifique e tente novamente.");
      return;
    }
  
    // Valida CNPJ apenas se foi preenchido
    if (tipoPessoa === "PJ" && cnpj.trim() !== "" && !validCNPJ(cnpj)) {
      setErroCnpj("CNPJ inválido. Verifique e tente novamente.");
      return;
    }
  
    setErroNome(null);
    setErroCpf(null);
    setErroTelefone(null);
    setErroCnpj(null);
  
    // 🛠️ Cria o objeto de dados que será salvo
    const dados: any = {
      tipoPessoa,
      situacao,
      isento,
      telefone,
      email,
      link,
      observacao,
      rg,
      enderecos, // 🏠 salvando o array de endereço
      ...(clienteId ? {} : { dataCadastro: new Date() }), // adiciona data de cadastro apenas se for novo cliente
    };
  
    if (tipoPessoa === "PF") {
      dados.nomeCliente = nome;
      dados.cpf = cpf;
      dados.dataNascimento = dataNascimento;
      dados.genero = genero;
    
      // Zera os campos de PJ
      dados.razaoSocial = "";
      dados.nomeFantasia = "";
      dados.cnpj = "";
      dados.inscricaoEstadual = "";
      dados.inscricaoMunicipal = "";
    } else {
      dados.razaoSocial = razaoSocial;
      dados.nomeFantasia = nomeFantasia;
      dados.cnpj = cnpj;
      dados.inscricaoEstadual = inscricaoEstadual;
      dados.inscricaoMunicipal = inscricaoMunicipal;
    
      // Zera os campos de PF
      dados.nomeCliente = "";
      dados.cpf = "";
      dados.dataNascimento = "";
      dados.genero = "";
    }
    
  
    try {
      if (clienteId) {
        const ref = doc(db, "clientes", clienteId);
        await updateDoc(ref, dados);
        setShowAlerta(true);
      } else {
        const docRef = await addDoc(collection(db, "clientes"), dados);
        setShowAlerta(true);
        router.push(`/clientes`);
      }
  
      setTimeout(() => setShowAlerta(false), 3000);
    } catch (err) {
      console.error("Erro ao salvar:", err);
      alert("Erro ao salvar dados.");
    }
  };
  

  // Carrega os dados do cliente ao abrir a página
  useEffect(() => {
    const buscarCliente = async () => {
      if (!clienteId) return;
  
      const ref = doc(db, "clientes", clienteId);
      const snap = await getDoc(ref);
  
      if (snap.exists()) {
        const data = snap.data();
  
        setTipoPessoa(data.tipoPessoa || "PF");
        setSituacao(data.situacao || "Ativo");
        setIsento(data.isento || false);
        setTelefone(data.telefone || "");
        setEmail(data.email || "");
        setLink(data.link || "");
        setObservacao(data.observacao || "");
        setRg(data.rg || "");
        setEnderecos(data.enderecos || enderecos);
  
        if (data.tipoPessoa === "PF") {
          setNome(data.nomeCliente || "");
          setCpf(data.cpf || "");
          setDataNascimento(data.dataNascimento || "");
          setGenero(data.genero || "");
        } else {
          setNomeFantasia(data.nomeFantasia || "");
          setRazaoSocial(data.razaoSocial || "");
          setCnpj(data.cnpj || "");
          setInscricaoEstadual(data.inscricaoEstadual || "");
          setInscricaoMunicipal(data.inscricaoMunicipal || "");
          // ⚡ Para segurança: se nomeCliente existir no banco, mas nomeFantasia não, preenche com nomeCliente
          if (!data.nomeFantasia && data.nomeCliente) {
            setNomeFantasia(data.nomeCliente);
          }
        }
      }
    };
  
    buscarCliente();
  }, [clienteId]);
  

  return (
    <div className="p-6">
      <div className="relative mb-8 pb-5">
        {/* Título centralizado */}
        <h1 className="text-3xl font-bold text-center">Dados do Cliente</h1>

        {/* Subtítulo no canto inferior esquerdo */}
        <p
          className={`absolute left-0 bottom-[-20px] text-sm font-bold ${
            clienteId ? "text-green-400" : "text-yellow-400"
          }`}
        >
          {clienteId ? "Cliente Cadastrado" : "Cliente sem Cadastro"}
        </p>

        {/* Alerta no canto inferior direito */}
        {showAlerta && (
          <div className="fixed z-50 top-36 right-6 animate-fade-in">
            <div className="alert alert-success shadow-lg w-fit">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current flex-shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Dados do cliente salvos com sucesso!</span>
            </div>
          </div>
        )}
      </div>

      <form className="space-y-8">
        {/* Dados Gerais */}
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label className="label font-semibold my-2">Tipo de pessoa:</label>
            <select
              className="select select-bordered w-full"
              value={tipoPessoa}
              onChange={(e) => setTipoPessoa(e.target.value as "PF" | "PJ")}
            >
              <option value="PF">Pessoa Física</option>
              <option value="PJ">Pessoa Jurídica</option>
            </select>
          </div>

          <div>
            <label className="label font-semibold flex justify-center my-2">
              Situação do cadastro:
            </label>
            <div className="flex items-center gap-4 justify-center">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  className="radio"
                  value="Ativo"
                  checked={situacao === "Ativo"}
                  onChange={() => setSituacao("Ativo")}
                />
                Ativo
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  className="radio"
                  value="Inativo"
                  checked={situacao === "Inativo"}
                  onChange={() => setSituacao("Inativo")}
                />
                Inativo
              </label>
            </div>
          </div>

          {tipoPessoa === "PF" && (
            <div>
              <label className="label font-semibold my-2">Gênero:</label>
              <select
                className="select select-bordered w-full"
                value={genero}
                onChange={(e) => setGenero(e.target.value)}
              >
                <option value="">Selecione</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          )}
        </div>

        {/* Pessoa Física */}
        {tipoPessoa === "PF" && (
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="label font-semibold mb-2">Nome completo:</label>
              <input
                type="text"
                className={`input input-bordered w-full ${
                  erroNome ? "border-red-500" : ""
                }`}
                placeholder="Nome completo"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  setErroNome(null); // Limpa o erro quando o usuário digita
                }}
              />
              {erroNome && (
                <p className="text-red-500 text-sm mt-1">{erroNome}</p>
              )}
            </div>

            <div className="form-control">
              <label className="label font-semibold mb-2">CPF:</label>
              <IMaskInput
                mask="000.000.000-00"
                className={`input input-bordered w-full ${
                  erroCpf ? "border-red-500" : ""
                }`}
                placeholder="000.000.000-00"
                value={cpf}
                onAccept={(value) => {
                  setCpf(value);
                  setErroCpf(null);
                }}
              />
              {erroCpf && (
                <p className="text-red-500 text-sm mt-1">{erroCpf}</p>
              )}
            </div>

            <div>
              <label className="label font-semibold mb-2">
                Data de nascimento:
              </label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Pessoa Jurídica */}
        {tipoPessoa === "PJ" && (
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="label font-semibold mb-2">Razão Social:</label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
              />
            </div>
            <div>
              <label className="label font-semibold mb-2">Nome Fantasia:</label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
              />
            </div>
            <div>
              <label className="label font-semibold mb-2">CNPJ:</label>
              <IMaskInput
                mask="00.000.000/0000-00"
                className={`input input-bordered w-full ${
                  erroCnpj ? "border-red-500" : ""
                }`}
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onAccept={(value) => {
                  setCnpj(value);
                  setErroCnpj(null); // limpa o erro ao digitar
                }}
              />
              {erroCnpj && (
                <p className="text-red-500 text-sm mt-1">{erroCnpj}</p>
              )}
            </div>
            <div>
              <label className="label font-semibold mb-2">
                Inscrição Estadual:
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={inscricaoEstadual}
                onChange={(e) => setInscricaoEstadual(e.target.value)}
              />
            </div>
            <div>
              <label className="label font-semibold mb-2">
                Inscrição Municipal:
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={inscricaoMunicipal}
                onChange={(e) => setInscricaoMunicipal(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 mt-8">
              <input
                type="checkbox"
                className="checkbox"
                checked={isento}
                onChange={(e) => setIsento(e.target.checked)}
              />
              <span className="label-text">Isento</span>
            </div>
          </div>
        )}

        {/* Contato */}
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label className="label font-semibold mb-2">RG:</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={rg}
              onChange={(e) => setRg(e.target.value)}
            />
          </div>
          <div>
            <label className="label font-semibold mb-2">Telefone:</label>
            <IMaskInput
              mask="(00) 00000-0000"
              className={`input input-bordered w-full ${
                erroTelefone ? "border-red-500" : ""
              }`}
              placeholder="(00) 00000-0000"
              value={telefone}
              onAccept={(value) => {
                setTelefone(value);
                setErroTelefone(null);
              }}
            />
            {erroTelefone && (
              <p className="text-red-500 text-sm mt-1">{erroTelefone}</p>
            )}
          </div>
          <div>
            <label className="label font-semibold mb-2">Email:</label>
            <input
              type="email"
              className="input input-bordered w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label font-semibold mb-2">
              Site ou Perfil (URL):
            </label>
            <input
              type="url"
              className="input input-bordered w-full"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
          <div className="md:col-span-3">
            <label className="label font-semibold mb-2">Observação:</label>
            <textarea
              className="textarea textarea-bordered w-full"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>
        </div>

        <hr className="my-6" />

        <div>
          {/* ENDEREÇO */}
          <h2 className="text-3xl font-bold mb-8">Endereço</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* CEP com botão de busca */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold mb-2">CEP:</span>
              </label>
              <div className="flex">
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="CEP"
                  value={enderecos[0].cep}
                  onChange={(e) =>
                    setEnderecos([{ ...enderecos[0], cep: e.target.value }])
                  }
                />
                <button
                  onClick={buscarCep}
                  className="btn btn-square w-20"
                  type="button"
                >
                  <span className="text-xl">🔍</span>
                </button>
              </div>
            </div>

            {/* Endereço */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold mb-2">Endereço:</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Endereço"
                value={enderecos[0].endereco}
                onChange={(e) =>
                  setEnderecos([{ ...enderecos[0], endereco: e.target.value }])
                }
              />
            </div>

            {/* Número */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold mb-2">Número:</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Número"
                value={enderecos[0].numero}
                onChange={(e) =>
                  setEnderecos([{ ...enderecos[0], numero: e.target.value }])
                }
              />
            </div>

            {/* Bairro */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold mb-2">Bairro:</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Bairro"
                value={enderecos[0].bairro}
                onChange={(e) =>
                  setEnderecos([{ ...enderecos[0], bairro: e.target.value }])
                }
              />
            </div>

            {/* Cidade */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold mb-2">Cidade:</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Cidade"
                value={enderecos[0].cidade}
                onChange={(e) =>
                  setEnderecos([{ ...enderecos[0], cidade: e.target.value }])
                }
              />
            </div>

            {/* Estado */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold mb-2">Estado:</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={enderecos[0].estado}
                onChange={(e) =>
                  setEnderecos([{ ...enderecos[0], estado: e.target.value }])
                }
              >
                <option value="">Selecione o estado</option>
                {estadosBrasil.map((estado) => (
                  <option key={estado.sigla} value={estado.sigla}>
                    {estado.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* País */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold mb-2">País:</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="País"
                value={enderecos[0].pais}
                onChange={(e) =>
                  setEnderecos([{ ...enderecos[0], pais: e.target.value }])
                }
              />
            </div>

            {/* Complemento */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Complemento:
                </span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Complemento"
                value={enderecos[0].complemento}
                onChange={(e) =>
                  setEnderecos([
                    { ...enderecos[0], complemento: e.target.value },
                  ])
                }
              />
            </div>

            {/* Referência */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Referência:
                </span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Referência"
                value={enderecos[0].referencia}
                onChange={(e) =>
                  setEnderecos([
                    { ...enderecos[0], referencia: e.target.value },
                  ])
                }
              />
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end items-center gap-6 mt-10">
          <button
            type="button"
            onClick={salvarCliente}
            className="btn w-40 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md"
          >
            Salvar
          </button>

          <button
            type="button"
            onClick={() => router.push(`/clientes`)}
            className="btn btn-outline w-40"
          >
            Voltar
          </button>
        </div>
      </form>
    </div>
  );
}
