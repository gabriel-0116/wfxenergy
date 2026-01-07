"use client";

import { useEffect, useState } from "react";

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

import { db } from "@/firebase/firebaseConfig";
import { getAuth } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import AdminRoute from "@/components/AdminRoute";

export default function ProdutosNovoPage() {
  // --------------------------------------------------------
  // helpers
  // --------------------------------------------------------
  const parseDecimal = (valor: unknown): number => {
    if (valor === null || valor === undefined) return 0;
    const normalizado = String(valor).replace(",", ".").trim();
    const numero = parseFloat(normalizado);
    return Number.isNaN(numero) ? 0 : numero;
  };

  const sanitizeNumericInput = (value: string): string =>
    value.replace(/[^\d.,]/g, "").replace(/,/g, ".");

  // --------------------------------------------------------
  // router / auth / search params
  // --------------------------------------------------------
  const router = useRouter();
  const auth = getAuth();
  const searchParams = useSearchParams();
  const produtoId = searchParams.get("id");

  // --------------------------------------------------------
  // estados (custos)
  // --------------------------------------------------------
  const [nomeProduto, setNomeProduto] = useState("");

  const [kitFotovoltaico, setKitFotovoltaico] = useState("0");
  const [valorProjeto, setValorProjeto] = useState("62.7");
  const [valorPlacaAdvertencia, setValorPlacaAdvertencia] = useState("60");
  const [valorEletricista, setValorEletricista] = useState("200");
  const [valorInfra, setValorInfra] = useState("62.5");

  // Comissão externa
  const [custoComissaoExterna, setCustoComissaoExterna] = useState("0");

  // ✅ Custo adicional (agora é uma linha na tabela)
  const [custoAdicional, setCustoAdicional] = useState("0");

  // Desconto máximo (%)
  const [descontoInternaMaxima, setDescontoInternaMaxima] = useState("0");

  // Comissão interna (%)
  const [comissaoInternaPercent, setComissaoInternaPercent] = useState("0");

  // --------------------------------------------------------
  // estados (vendas)
  // --------------------------------------------------------
  const [vendaKit, setVendaKit] = useState("0");
  const [vendaProjeto, setVendaProjeto] = useState("0");
  const [vendaPlacaAdvertencia, setVendaPlacaAdvertencia] = useState("0");
  const [vendaEletricista, setVendaEletricista] = useState("0");
  const [vendaInfra, setVendaInfra] = useState("0");

  // venda da comissão externa
  const [vendaComissaoExterna, setVendaComissaoExterna] = useState("0");

  // ✅ venda do custo adicional
  const [vendaAdicional, setVendaAdicional] = useState("0");

  const [salvando, setSalvando] = useState(false);

  // --------------------------------------------------------
  // carregar dados se estiver editando
  // --------------------------------------------------------
  useEffect(() => {
    if (!produtoId) return;

    const carregarDados = async () => {
      const ref = doc(db, "produtos", produtoId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data() as any;

        setNomeProduto(data.nomeProduto || "");

        setKitFotovoltaico(String(data.custoKitFotovoltaico ?? "0"));
        setValorProjeto(String(data.custoProjeto ?? "0"));
        setValorPlacaAdvertencia(String(data.custoPlacaAdvertencia ?? "0"));
        setValorEletricista(String(data.custoEletricista ?? "0"));
        setValorInfra(String(data.custoInfraestrutura ?? "0"));

        setCustoComissaoExterna(String(data.custoComissaoExterna ?? "0"));

        setCustoAdicional(String(data.custoAdicional ?? "0"));

        setVendaKit(String(data.vendaKitFotovoltaico ?? "0"));
        setVendaProjeto(String(data.vendaProjeto ?? "0"));
        setVendaPlacaAdvertencia(String(data.vendaPlacaAdvertencia ?? "0"));
        setVendaEletricista(String(data.vendaEletricista ?? "0"));
        setVendaInfra(String(data.vendaInfraestrutura ?? "0"));

        setVendaComissaoExterna(String(data.vendaComissaoExterna ?? "0"));

        // ✅ novo (compatível com produtos antigos: cai em 0)
        setVendaAdicional(String(data.vendaAdicional ?? "0"));

        setDescontoInternaMaxima(String(data.descontoInternaMaxima ?? "0"));
        setComissaoInternaPercent(String(data.comissaoInternaPercent ?? "0"));
      }
    };

    carregarDados();
  }, [produtoId]);

  // --------------------------------------------------------
  // cálculos
  // --------------------------------------------------------
  const custoKit = parseDecimal(kitFotovoltaico);
  const custoProjeto = parseDecimal(valorProjeto);
  const custoPlaca = parseDecimal(valorPlacaAdvertencia);
  const custoEletricistaNum = parseDecimal(valorEletricista);
  const custoInfraNum = parseDecimal(valorInfra);

  const custoComissaoExternaNum = parseDecimal(custoComissaoExterna);

  const custoExtra = parseDecimal(custoAdicional);

  const vendaKitNum = parseDecimal(vendaKit);
  const vendaProjetoNum = parseDecimal(vendaProjeto);
  const vendaPlacaNum = parseDecimal(vendaPlacaAdvertencia);
  const vendaEletricistaNum = parseDecimal(vendaEletricista);
  const vendaInfraNum = parseDecimal(vendaInfra);

  const vendaComissaoExternaNum = parseDecimal(vendaComissaoExterna);

  const vendaAdicionalNum = parseDecimal(vendaAdicional);

  // lucros por linha (sem desconto/comissão interna)
  const lucroKit = vendaKitNum - custoKit;
  const lucroProjeto = vendaProjetoNum - custoProjeto;
  const lucroPlaca = vendaPlacaNum - custoPlaca;
  const lucroEletricista = vendaEletricistaNum - custoEletricistaNum;
  const lucroInfra = vendaInfraNum - custoInfraNum;

  const lucroComissaoExterna = vendaComissaoExternaNum - custoComissaoExternaNum;

  // ✅ lucro do custo adicional (agora é item normal)
  const lucroAdicional = vendaAdicionalNum - custoExtra;

  // ✅ AGORA inclui custoExtra porque virou linha normal
  const totalCusto =
    custoKit +
    custoProjeto +
    custoPlaca +
    custoEletricistaNum +
    custoInfraNum +
    custoComissaoExternaNum +
    custoExtra;

  // ✅ inclui vendaAdicional
  const totalVenda =
    vendaKitNum +
    vendaProjetoNum +
    vendaPlacaNum +
    vendaEletricistaNum +
    vendaInfraNum +
    vendaComissaoExternaNum +
    vendaAdicionalNum;

  // ---------------------------
  // comissão interna (%)
  // ---------------------------
  const comissaoNum = parseDecimal(comissaoInternaPercent);
  const comissaoClamp = Math.min(100, Math.max(0, comissaoNum)); 
const totalCustoFinal = totalVenda;
  // ---------------------------
  // desconto máximo (%)
  // ---------------------------
  const descontoNum = parseDecimal(descontoInternaMaxima);
  const descontoClamp = Math.min(100, Math.max(0, descontoNum));
  const fatorDescMax = 1 - descontoClamp / 100;

  // receita pior caso
  const receitaComDescMax = totalCustoFinal * fatorDescMax;

  // custo real total (já inclui adicional)
  const custoTotalReal = totalCusto;

  // comissão paga ao vendedor (% da receita já com desconto)
  const comissaoPaga = receitaComDescMax * (comissaoClamp / 100);

  // lucro total pior caso
  const totalLucro = receitaComDescMax - custoTotalReal - comissaoPaga;

  // --------------------------------------------------------
  // duplicidade por nome
  // --------------------------------------------------------
  const existeOutroKitComMesmoNome = async (
    nomeNormalizado: string
  ): Promise<boolean> => {
    const produtosRef = collection(db, "produtos");
    const q = query(produtosRef, where("nomeProduto", "==", nomeNormalizado));
    const snap = await getDocs(q);

    if (snap.empty) return false;
    if (!produtoId) return true;

    const docsDiferentes = snap.docs.filter((docSnap) => docSnap.id !== produtoId);
    return docsDiferentes.length > 0;
  };

  // --------------------------------------------------------
  // salvar
  // --------------------------------------------------------
  const salvarProduto = async () => {
    if (salvando) return;

    const user = auth.currentUser;
    if (!user) {
      alert("Você precisa estar logado para salvar.");
      return;
    }

    const nomeNormalizado = nomeProduto.trim();
    if (!nomeNormalizado) {
      alert("Informe um nome para o produto.");
      return;
    }

    setSalvando(true);

    try {
      const jaExiste = await existeOutroKitComMesmoNome(nomeNormalizado);
      if (jaExiste) {
        alert("Já existe um kit/produto cadastrado com esse nome.");
        return;
      }

      const payload = {
        nomeProduto: nomeNormalizado,

        custoKitFotovoltaico: custoKit,
        custoProjeto,
        custoPlacaAdvertencia: custoPlaca,
        custoEletricista: custoEletricistaNum,
        custoInfraestrutura: custoInfraNum,

        custoComissaoExterna: custoComissaoExternaNum,

        // ✅ adicional virou item completo
        custoAdicional: custoExtra,
        vendaAdicional: vendaAdicionalNum,
        lucroAdicional,

        vendaKitFotovoltaico: vendaKitNum,
        vendaProjeto: vendaProjetoNum,
        vendaPlacaAdvertencia: vendaPlacaNum,
        vendaEletricista: vendaEletricistaNum,
        vendaInfraestrutura: vendaInfraNum,

        vendaComissaoExterna: vendaComissaoExternaNum,

        lucroKitFotovoltaico: lucroKit,
        lucroProjeto,
        lucroPlacaAdvertencia: lucroPlaca,
        lucroEletricista,
        lucroInfraestrutura: lucroInfra,

        lucroComissaoExterna,

        totalVenda,

        // usado como valor final do kit no resto do sistema
        totalCusto: totalCustoFinal,

        totalLucro,

        descontoInternaMaxima: descontoClamp,
        comissaoInternaPercent: comissaoClamp,

        criadoPor: user.uid,
        atualizadoEm: Timestamp.now(),
      };

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
  // UI
  // --------------------------------------------------------
  return (
    <AdminRoute>
      <div className="p-6 mx-auto max-w-6xl text-white">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {produtoId ? "Editar Produto" : "Cadastrar Produto"}
        </h1>

        <div className="mb-8">
          <label className="block mb-1 font-semibold text-sm">Nome do Produto</label>
          <input
            type="text"
            value={nomeProduto}
            onChange={(e) => setNomeProduto(e.target.value)}
            className="input input-bordered w-full bg-base-100"
            placeholder="Ex: KIT 3,6KWP | 380KWH | 6M 600W | 2 MICRO"
          />
        </div>

        <div className="flex rounded-2xl shadow-2xl overflow-x-auto mt-6 border border-base-300">
          {/* Descrição */}
          <table className="table w-full">
            <thead>
              <tr className="bg-base-100 text-white">
                <th className="text-center">Descrição</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr><th>Kit Fotovoltaico</th></tr>
              <tr><th>Projeto</th></tr>
              <tr><th>Placa de advertência</th></tr>
              <tr><th>Eletricista / Instalador</th></tr>
              <tr><th>Infraestrutura</th></tr>
              <tr><th>Comissão externa</th></tr>

              {/* ✅ NOVO: custo adicional como linha */}
              <tr><th>Custo adicional</th></tr>
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
                    onChange={(e) => setKitFotovoltaico(sanitizeNumericInput(e.target.value))}
                  />
                </td>
              </tr>

              <tr>
                <td className="text-center">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-28 text-center bg-base-100"
                    value={valorProjeto}
                    onChange={(e) => setValorProjeto(sanitizeNumericInput(e.target.value))}
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
                      setValorPlacaAdvertencia(sanitizeNumericInput(e.target.value))
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
                    onChange={(e) => setValorEletricista(sanitizeNumericInput(e.target.value))}
                  />
                </td>
              </tr>

              <tr>
                <td className="text-center">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-28 text-center bg-base-100"
                    value={valorInfra}
                    onChange={(e) => setValorInfra(sanitizeNumericInput(e.target.value))}
                  />
                </td>
              </tr>

              <tr>
                <td className="text-center">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-28 text-center bg-base-100"
                    value={custoComissaoExterna}
                    onChange={(e) =>
                      setCustoComissaoExterna(sanitizeNumericInput(e.target.value))
                    }
                    placeholder="R$"
                  />
                </td>
              </tr>

              {/* ✅ NOVO */}
              <tr>
                <td className="text-center">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-28 text-center bg-base-100"
                    value={custoAdicional}
                    onChange={(e) => setCustoAdicional(sanitizeNumericInput(e.target.value))}
                    placeholder="R$"
                  />
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-orange-500 text-base font-semibold">
                <td className="text-center text-white">R$ {totalCusto.toFixed(2)}</td>
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
                    onChange={(e) => setVendaKit(sanitizeNumericInput(e.target.value))}
                  />
                </td>
              </tr>

              <tr>
                <td className="text-center">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-28 text-center bg-base-100"
                    value={vendaProjeto}
                    onChange={(e) => setVendaProjeto(sanitizeNumericInput(e.target.value))}
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
                      setVendaPlacaAdvertencia(sanitizeNumericInput(e.target.value))
                    }
                  />
                </td>
              </tr>

              <tr>
                <td className="text-center">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-28 text-center bg-base-100"
                    value={vendaEletricista}
                    onChange={(e) => setVendaEletricista(sanitizeNumericInput(e.target.value))}
                  />
                </td>
              </tr>

              <tr>
                <td className="text-center">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-28 text-center bg-base-100"
                    value={vendaInfra}
                    onChange={(e) => setVendaInfra(sanitizeNumericInput(e.target.value))}
                  />
                </td>
              </tr>

              <tr>
                <td className="text-center">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-28 text-center bg-base-100"
                    value={vendaComissaoExterna}
                    onChange={(e) =>
                      setVendaComissaoExterna(sanitizeNumericInput(e.target.value))
                    }
                    placeholder="R$"
                  />
                </td>
              </tr>

              {/* ✅ NOVO */}
              <tr>
                <td className="text-center">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-28 text-center bg-base-100"
                    value={vendaAdicional}
                    onChange={(e) => setVendaAdicional(sanitizeNumericInput(e.target.value))}
                    placeholder="R$"
                  />
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-green-500 text-base font-semibold">
                <td className="text-center text-white">R$ {totalVenda.toFixed(2)}</td>
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
              <tr><td className="text-center">R$ {lucroKit.toFixed(2)}</td></tr>
              <tr><td className="text-center">R$ {lucroProjeto.toFixed(2)}</td></tr>
              <tr><td className="text-center">R$ {lucroPlaca.toFixed(2)}</td></tr>
              <tr><td className="text-center">R$ {lucroEletricista.toFixed(2)}</td></tr>
              <tr><td className="text-center">R$ {lucroInfra.toFixed(2)}</td></tr>
              <tr><td className="text-center">R$ {lucroComissaoExterna.toFixed(2)}</td></tr>

              {/* ✅ NOVO */}
              <tr><td className="text-center">R$ {lucroAdicional.toFixed(2)}</td></tr>

              {/* Total lucro (pior caso) */}
              <tr className="bg-blue-300 text-base font-semibold h-10">
                <td className="text-center text-white">R$ {totalLucro.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Ajustes (sem custo adicional aqui) */}
        <div className="flex flex-col lg:flex-row justify-between gap-6 mb-8 mt-10">
          <div className="bg-[#1a1a1a] p-5 rounded-2xl shadow-2xl w-full lg:max-w-md border border-base-300">
            <h2 className="font-bold text-white text-lg mb-4 text-center gap-2">
              Ajustes de Custos Variáveis (Lucro)
            </h2>

            <div className="mt-6">
              <label className="text-sm font-semibold block text-white">
                Comissão interna (%)
              </label>
              <input
                value={comissaoInternaPercent}
                onChange={(e) =>
                  setComissaoInternaPercent(sanitizeNumericInput(e.target.value))
                }
                className="input input-sm input-bordered w-full bg-base-100"
                placeholder="Ex: 10"
              />
            </div>

            <div className="mt-6">
              <label className="text-sm font-semibold block text-white">
                Desconto máximo (%)
              </label>
              <input
                value={descontoInternaMaxima}
                onChange={(e) =>
                  setDescontoInternaMaxima(sanitizeNumericInput(e.target.value))
                }
                className="input input-sm input-bordered w-full bg-base-100"
                placeholder="Ex: 3"
              />
            </div>
          </div>

          <div className="w-full lg:max-w-xl rounded-2xl overflow-hidden ">
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
