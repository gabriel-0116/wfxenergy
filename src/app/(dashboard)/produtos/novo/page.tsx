"use client"; 
// 🔹 Indica que este componente é um Client Component do Next.js (necessário para usar hooks).

import { useEffect, useState } from "react";
// 🔹 Hooks do React:
//    - useState: estados locais.
//    - useEffect: efeitos colaterais (carregar dados ao montar).

import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore";
// 🔹 Funções do Firestore:
//    - collection: referência para coleção ("produtos").
//    - addDoc: cria novo doc.
//    - doc: referência para doc específico.
//    - getDoc: busca um doc.
//    - updateDoc: atualiza um doc existente.
//    - Timestamp: data/hora Firestore.
//    - getDocs: busca vários docs (usado para checar duplicado).
//    - query, where: montar consulta filtrando por nomeProduto.

import { db } from "@/firebase/firebaseConfig";
// 🔹 Instância do Firestore configurada no projeto.

import { getAuth } from "firebase/auth";
// 🔹 Pegar o usuário atual logado.

import { useRouter, useSearchParams } from "next/navigation";
// 🔹 Navegação (router) e leitura de query string (searchParams).

import AdminRoute from "@/components/AdminRoute";
// 🔹 Protege a página para acesso somente admin.

export default function ProdutosNovoPage() {
  // --------------------------------------------------------
  // helpers (funções utilitárias para tratar números)
  // --------------------------------------------------------

  const parseDecimal = (valor: unknown): number => {
    // 🔹 Converte qualquer coisa em número decimal.
    if (valor === null || valor === undefined) return 0;
    const normalizado = String(valor).replace(",", ".").trim();
    const numero = parseFloat(normalizado);
    return Number.isNaN(numero) ? 0 : numero;
  };

  const sanitizeNumericInput = (value: string): string =>
    // 🔹 Mantém só dígitos, ponto e vírgula. Converte vírgula para ponto.
    value
      .replace(/[^\d.,]/g, "")
      .replace(/,/g, ".");

  // --------------------------------------------------------
  // router / auth / search params
  // --------------------------------------------------------

  const router = useRouter();
  // 🔹 Para voltar para /produtos depois de salvar/cancelar.

  const auth = getAuth();
  // 🔹 Para pegar usuário logado (auth.currentUser).

  const searchParams = useSearchParams();
  // 🔹 Para ler parâmetros da URL: ?id=...

  const produtoId = searchParams.get("id");
  // 🔹 Se existir, estamos editando um produto. Se não, criando um novo.

  // --------------------------------------------------------
  // estados principais (inputs de custo)
  // --------------------------------------------------------

  const [nomeProduto, setNomeProduto] = useState("");
  // 🔹 Nome do kit/produto.

  const [kitFotovoltaico, setKitFotovoltaico] = useState("0");
  const [valorProjeto, setValorProjeto] = useState("62.7");
  const [valorPlacaAdvertencia, setValorPlacaAdvertencia] =
    useState("60");
  const [valorEletricista, setValorEletricista] = useState("200");
  const [valorInfra, setValorInfra] = useState("62.5");
  // 🔹 Todos esses são custos base (custo real, sem lucro).

  const [custoAdicional, setCustoAdicional] = useState("0");
  // 🔹 Custo extra fixo.

  const [comissaoInternaMaxima, setComissaoInternaMaxima] =
    useState("0");
  // 🔹 Comissão interna máxima (%) que será usada em outra tela.

  // --------------------------------------------------------
  // estados das vendas (inputs manuais de venda)
  // --------------------------------------------------------

  const [vendaKit, setVendaKit] = useState("0");
  const [vendaProjeto, setVendaProjeto] = useState("0");
  const [vendaPlacaAdvertencia, setVendaPlacaAdvertencia] =
    useState("0");
  const [vendaEletricista, setVendaEletricista] = useState("0");
  const [vendaInfra, setVendaInfra] = useState("0");
  // 🔹 Valores de VENDA de cada item.

  // 🔹 Estado para evitar double-submit e dar feedback se estiver checando duplicado/salvando.
  const [salvando, setSalvando] = useState(false);

  // --------------------------------------------------------
  // carregar dados se estiver editando (modo edição)
  // --------------------------------------------------------

  useEffect(() => {
    if (!produtoId) return;
    // 🔹 Se não tem produtoId, é criação. Não precisa carregar nada.

    const carregarDados = async () => {
      const ref = doc(db, "produtos", produtoId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data() as any;

        setNomeProduto(data.nomeProduto || "");

        setKitFotovoltaico(String(data.custoKitFotovoltaico ?? "0"));
        setValorProjeto(String(data.custoProjeto ?? "0"));
        setValorPlacaAdvertencia(
          String(data.custoPlacaAdvertencia ?? "0")
        );
        setValorEletricista(String(data.custoEletricista ?? "0"));
        setValorInfra(String(data.custoInfraestrutura ?? "0"));

        setVendaKit(String(data.vendaKitFotovoltaico ?? "0"));
        setVendaProjeto(String(data.vendaProjeto ?? "0"));
        setVendaPlacaAdvertencia(
          String(data.vendaPlacaAdvertencia ?? "0")
        );
        setVendaEletricista(String(data.vendaEletricista ?? "0"));
        setVendaInfra(String(data.vendaInfraestrutura ?? "0"));

        setCustoAdicional(String(data.custoAdicional ?? "0"));
        setComissaoInternaMaxima(
          String(data.comissaoInternaMaxima ?? "0")
        );
      }
    };

    carregarDados();
  }, [produtoId]);

  // --------------------------------------------------------
  // cálculos derivados (custos, vendas, lucros e totais)
  // --------------------------------------------------------

  const custoKit = parseDecimal(kitFotovoltaico);
  const custoProjeto = parseDecimal(valorProjeto);
  const custoPlaca = parseDecimal(valorPlacaAdvertencia);
  const custoEletricistaNum = parseDecimal(valorEletricista);
  const custoInfraNum = parseDecimal(valorInfra);
  const custoExtra = parseDecimal(custoAdicional);

  const vendaKitNum = parseDecimal(vendaKit);
  const vendaProjetoNum = parseDecimal(vendaProjeto);
  const vendaPlacaNum = parseDecimal(vendaPlacaAdvertencia);
  const vendaEletricistaNum = parseDecimal(vendaEletricista);
  const vendaInfraNum = parseDecimal(vendaInfra);

  const lucroKit = vendaKitNum - custoKit;
  const lucroProjeto = vendaProjetoNum - custoProjeto;
  const lucroPlaca = vendaPlacaNum - custoPlaca;
  const lucroEletricista = vendaEletricistaNum - custoEletricistaNum;
  const lucroInfra = vendaInfraNum - custoInfraNum;

  const totalCusto =
    custoKit +
    custoProjeto +
    custoPlaca +
    custoEletricistaNum +
    custoInfraNum;

  const totalVenda =
    vendaKitNum +
    vendaProjetoNum +
    vendaPlacaNum +
    vendaEletricistaNum +
    vendaInfraNum;

  const totalLucro = totalVenda - totalCusto - custoExtra;

  const totalCustoFinal = totalVenda + custoExtra;
  // 🔹 Esse "CUSTO FINAL" está sendo usado como VALOR DE VENDA do kit em outras telas.

  const comissaoInternaMaximaNum =
    parseDecimal(comissaoInternaMaxima);

  // --------------------------------------------------------
  // verificação de kit duplicado (nomeProduto)
  // --------------------------------------------------------

  const existeOutroKitComMesmoNome = async (
    nomeNormalizado: string
  ): Promise<boolean> => {
    // 🔹 Checa se já existe algum outro documento em "produtos"
    //    com o mesmo nomeProduto (trim exato).
    //    - Na criação: qualquer doc encontrado já é conflito.
    //    - Na edição: ignoramos o próprio documento (mesmo id).

    const produtosRef = collection(db, "produtos");
    const q = query(
      produtosRef,
      where("nomeProduto", "==", nomeNormalizado)
    );
    // 🔹 Monta uma query onde nomeProduto é exatamente igual ao nome informado.

    const snap = await getDocs(q);
    // 🔹 Executa a query.

    if (snap.empty) {
      // 🔹 Não existe nenhum com esse nome -> não é duplicado.
      return false;
    }

    // 🔹 Se estamos criando (não tem produtoId), qualquer doc encontrado é duplicado.
    if (!produtoId) {
      return true;
    }

    // 🔹 Se estamos editando, precisamos ver se o único encontrado é o próprio doc ou outro.
    const docsDiferentes = snap.docs.filter(
      (docSnap) => docSnap.id !== produtoId
    );
    // 🔹 Se sobrou algum com id diferente, é duplicado.
    return docsDiferentes.length > 0;
  };

  // --------------------------------------------------------
  // salvar produto (create/update) no Firestore
  // --------------------------------------------------------

  const salvarProduto = async () => {
    if (salvando) return;
    // 🔹 Evita duplo clique enquanto ainda está salvando.

    const user = auth.currentUser;
    if (!user) {
      alert("Você precisa estar logado para salvar.");
      return;
    }

    const nomeNormalizado = nomeProduto.trim();
    // 🔹 Remove espaços extras no começo/fim.

    if (!nomeNormalizado) {
      alert("Informe um nome para o produto.");
      return;
    }

    setSalvando(true);

    try {
      // 🔹 1) Checar se já existe kit com o mesmo nome
      const jaExiste = await existeOutroKitComMesmoNome(
        nomeNormalizado
      );

      if (jaExiste) {
        // 🔹 Se já existir outro kit com o mesmo nome, bloqueamos.
        alert(
          "Já existe um kit/produto cadastrado com esse nome. Escolha outro nome para evitar duplicidade."
        );
        return;
      }

      // 🔹 2) Montar payload com os dados calculados
      const payload = {
        nomeProduto: nomeNormalizado,

        custoKitFotovoltaico: custoKit,
        custoProjeto,
        custoPlacaAdvertencia: custoPlaca,
        custoEletricista: custoEletricistaNum,
        custoInfraestrutura: custoInfraNum,
        custoAdicional: custoExtra,

        vendaKitFotovoltaico: vendaKitNum,
        vendaProjeto: vendaProjetoNum,
        vendaPlacaAdvertencia: vendaPlacaNum,
        vendaEletricista: vendaEletricistaNum,
        vendaInfraestrutura: vendaInfraNum,

        lucroKitFotovoltaico: lucroKit,
        lucroProjeto,
        lucroPlacaAdvertencia: lucroPlaca,
        lucroEletricista,
        lucroInfraestrutura: lucroInfra,

        totalCusto: totalCustoFinal,
        totalVenda,
        totalLucro,

        comissaoInternaMaxima: comissaoInternaMaximaNum,

        criadoPor: user.uid,
        atualizadoEm: Timestamp.now(),
      };

      // 🔹 3) Create ou Update dependendo se existe produtoId ou não
      if (produtoId) {
        const ref = doc(db, "produtos", produtoId);
        await updateDoc(ref, payload);
        alert("Produto atualizado!");
      } else {
        await addDoc(collection(db, "produtos"), {
          ...payload,
          criadoEm: Timestamp.now(),
        });
        alert("Produto criado!");
      }

      router.push("/produtos");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar produto.");
    } finally {
      setSalvando(false);
    }
  };

  // --------------------------------------------------------
  // UI (interface visual)
  // --------------------------------------------------------

  return (
    <AdminRoute>
      {/* 🔹 Protege a página: só admin acessa. */}
      <div className="p-6 mx-auto max-w-6xl text-white">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {produtoId ? "Editar Produto" : "Cadastrar Produto"}
        </h1>

        {/* Nome do produto */}
        <div className="mb-8">
          <label className="block mb-1 font-semibold text-sm">
            Nome do Produto
          </label>
          <input
            type="text"
            value={nomeProduto}
            onChange={(e) => setNomeProduto(e.target.value)}
            className="input input-bordered w-full bg-base-100"
            placeholder="Ex: KIT 3,6KWP | 380KWH | 6M 600W | 2 MICRO"
          />
        </div>

        {/* Tabela principal Custo / Venda / Lucro */}
        <div className="flex rounded-2xl shadow-2xl overflow-x-auto mt-6 border border-base-300">
          {/* Descrição */}
          <table className="table w-full">
            <thead>
              <tr className="bg-base-100 text-white">
                <th className="text-center">Descrição</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr>
                <th>Kit Fotovoltaico</th>
              </tr>
              <tr>
                <th>Projeto</th>
              </tr>
              <tr>
                <th>Placa de advertência</th>
              </tr>
              <tr>
                <th>Eletricista / Instalador</th>
              </tr>
              <tr>
                <th>Infraestrutura</th>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-base-100 text-white">
                <th className="text-center">Total</th>
              </tr>
            </tfoot>
          </table>

          {/* Valor Custo */}
          <table className="table w-full border-x border-base-300">
            <thead>
              <tr className="bg-orange-500 text-white text-sm">
                <th className="text-center">Valor Custo</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr>
                <td className="text-center">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-28 text-center bg-base-100"
                    value={kitFotovoltaico}
                    onChange={(e) =>
                      setKitFotovoltaico(
                        sanitizeNumericInput(e.target.value)
                      )
                    }
                    placeholder="R$"
                  />
                </td>
              </tr>

              <tr>
                <td className="text-center">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-28 text-center bg-base-100"
                    value={valorProjeto}
                    onChange={(e) =>
                      setValorProjeto(
                        sanitizeNumericInput(e.target.value)
                      )
                    }
                  />
                </td>
              </tr>

              <tr>
                <td className="text-center">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-28 text-center bg-base-100"
                    value={valorPlacaAdvertencia}
                    onChange={(e) =>
                      setValorPlacaAdvertencia(
                        sanitizeNumericInput(e.target.value)
                      )
                    }
                  />
                </td>
              </tr>

              <tr>
                <td className="text-center">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-28 text-center bg-base-100"
                    value={valorEletricista}
                    onChange={(e) =>
                      setValorEletricista(
                        sanitizeNumericInput(e.target.value)
                      )
                    }
                    placeholder="R$"
                  />
                </td>
              </tr>

              <tr>
                <td className="text-center">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-28 text-center bg-base-100"
                    value={valorInfra}
                    onChange={(e) =>
                      setValorInfra(
                        sanitizeNumericInput(e.target.value)
                      )
                    }
                    placeholder="R$"
                  />
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-orange-500 text-base font-semibold">
                <td className="text-center text-white">
                  R$ {totalCusto.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Valor Venda */}
          <table className="table w-full border-x border-base-300">
            <thead>
              <tr className="bg-green-500 text-white text-sm">
                <th className="text-center">Valor Venda</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr>
                <td className="text-center">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-28 text-center bg-base-100"
                    value={vendaKit}
                    onChange={(e) =>
                      setVendaKit(
                        sanitizeNumericInput(e.target.value)
                      )
                    }
                    placeholder="R$"
                  />
                </td>
              </tr>

              <tr>
                <td className="text-center">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-28 text-center bg-base-100"
                    value={vendaProjeto}
                    onChange={(e) =>
                      setVendaProjeto(
                        sanitizeNumericInput(e.target.value)
                      )
                    }
                    placeholder="R$"
                  />
                </td>
              </tr>

              <tr>
                <td className="text-center">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-28 text-center bg-base-100"
                    value={vendaPlacaAdvertencia}
                    onChange={(e) =>
                      setVendaPlacaAdvertencia(
                        sanitizeNumericInput(e.target.value)
                      )
                    }
                    placeholder="R$"
                  />
                </td>
              </tr>

              <tr>
                <td className="text-center">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-28 text-center bg-base-100"
                    value={vendaEletricista}
                    onChange={(e) =>
                      setVendaEletricista(
                        sanitizeNumericInput(e.target.value)
                      )
                    }
                    placeholder="R$"
                  />
                </td>
              </tr>

              <tr>
                <td className="text-center">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-28 text-center bg-base-100"
                    value={vendaInfra}
                    onChange={(e) =>
                      setVendaInfra(
                        sanitizeNumericInput(e.target.value)
                      )
                    }
                    placeholder="R$"
                  />
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-green-500 text-base font-semibold">
                <td className="text-center text-white">
                  R$ {totalVenda.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Lucro */}
          <table className="table w-full border-x border-base-300">
            <thead>
              <tr className="bg-blue-300 text-white text-sm">
                <th className="text-center">Lucro</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr>
                <td className="text-center">
                  R$ {lucroKit.toFixed(2)}
                </td>
              </tr>

              <tr>
                <td className="text-center">
                  R$ {lucroProjeto.toFixed(2)}
                </td>
              </tr>

              <tr>
                <td className="text-center">
                  R$ {lucroPlaca.toFixed(2)}
                </td>
              </tr>

              <tr>
                <td className="text-center">
                  R$ {lucroEletricista.toFixed(2)}
                </td>
              </tr>

              <tr>
                <td className="text-center">
                  R$ {lucroInfra.toFixed(2)}
                </td>
              </tr>

              <tr className="bg-blue-300 text-base font-semibold h-10">
                <td className="text-center text-white">
                  R$ {totalLucro.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Ajustes: custo adicional + comissão interna máxima + CUSTO FINAL */}
        <div className="flex flex-col lg:flex-row justify-between gap-6 mb-8 mt-10">
          <div className="bg-[#1a1a1a] p-5 rounded-2xl shadow-2xl w-full lg:max-w-md border border-base-300">
            <h2 className="font-bold text-white text-lg mb-4 text-center gap-2">
              Ajustes de Custos Variáveis
            </h2>

            <div className="mt-6">
              <label className="text-sm font-semibold block text-white">
                Custo adicional (valor fixo R$)
              </label>
              <input
                value={custoAdicional}
                onChange={(e) =>
                  setCustoAdicional(
                    sanitizeNumericInput(e.target.value)
                  )
                }
                className="input input-sm input-bordered w-full bg-base-100"
                placeholder="Ex: 200.00"
              />
            </div>

            <div className="mt-6">
              <label className="text-sm font-semibold block text-white">
                Comissão interna máxima (%)
              </label>
              <input
                value={comissaoInternaMaxima}
                onChange={(e) =>
                  setComissaoInternaMaxima(
                    sanitizeNumericInput(e.target.value)
                  )
                }
                className="input input-sm input-bordered w-full bg-base-100"
                placeholder="Ex: 3"
              />
            </div>
          </div>

          <div className="w-full lg:max-w-xl rounded-2xl overflow-hidden shadow-2xl">
            <h2 className="bg-base-100 text-white text-center font-bold py-2">
              CUSTO FINAL
            </h2>
            <div>
              <p className="py-9 text-2xl text-center bg-amber-300 text-[#1a1a1a] font-semibold">
                R$ {totalCustoFinal.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-4 mt-10">
          <button
            className="btn btn-outline w-40"
            onClick={() => router.push("/produtos")}
            disabled={salvando}
          >
            Cancelar
          </button>
          <button
            className="btn w-40 bg-emerald-500 hover:bg-emerald-600 transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-60"
            onClick={salvarProduto}
            disabled={salvando}
          >
            {salvando
              ? "Salvando..."
              : produtoId
              ? "Salvar Alterações"
              : "Cadastrar Produto"}
          </button>
        </div>
      </div>
    </AdminRoute>
  );
}
