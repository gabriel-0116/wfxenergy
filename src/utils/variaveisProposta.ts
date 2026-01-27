// 📁 utils/variaveisProposta.ts
export const variaveisProposta = [
  // 🔹 CLIENTE
  {
    nome: "[[nome_cliente]]",
    descricao: "Nome completo do cliente (ou razão social, se for PJ)",
    categoria: "cliente",
  },
  {
    nome: "[[cpf]]",
    descricao: "CPF do cliente ou CNPJ (se PJ)",
    categoria: "cliente",
  },
  {
    nome: "[[rg]]",
    descricao: "RG do cliente (apenas pessoa física)",
    categoria: "cliente",
  },
  {
    nome: "[[telefone]]",
    descricao: "Telefone do cliente",
    categoria: "cliente",
  },
  {
    nome: "[[nome_cliente_assinatura]]",
    descricao: "Nome do cliente no campo da assinatura",
    categoria: "cliente",
  },

  // 🔹 ENDEREÇO
  {
    nome: "[[cidade]]",
    descricao: "Cidade do cliente",
    categoria: "endereco",
  },
  {
    nome: "[[estado]]",
    descricao: "Estado do cliente",
    categoria: "endereco",
  },
  {
    nome: "[[logradouro]]",
    descricao: "Endereço (logradouro) do cliente",
    categoria: "endereco",
  },
  {
    nome: "[[numero]]",
    descricao: "Número do endereço do cliente",
    categoria: "endereco",
  },
  {
    nome: "[[cep]]",
    descricao: "CEP do cliente",
    categoria: "endereco",
  },

  // 🔹 PROJETO
  {
    nome: "[[nome_projeto]]",
    descricao: "Nome do projeto",
    categoria: "projeto",
  },
  {
    nome: "[[quantidade_placas]]",
    descricao: "Quantidade de placas solares utilizadas",
    categoria: "projeto",
  },
  {
    nome: "[[qtd_painel_helius]]",
    descricao: "Quantidade de painéis da Helius",
    categoria: "projeto",
  },
  {
    nome: "[[potencia_placas]]",
    descricao: "Potência de cada placa (em Watts)",
    categoria: "projeto",
  },
  {
    nome: "[[potencia_instalada]]",
    descricao: "Potência total instalada do sistema (em kWp)",
    categoria: "projeto",
  },
  {
    nome: "[[estrutura]]",
    descricao: "Tipo de estrutura do projeto (ex: telhado, solo, etc.)",
    categoria: "projeto",
  },
  {
    nome: "[[area_necessaria]]",
    descricao: "Área mínima necessária para instalação",
    categoria: "projeto",
  },
  {
    nome: "[[geracao_media]]",
    descricao: "Geração média mensal estimada (em kWh)",
    categoria: "projeto",
  },
  {
    nome: "[[consumo_medio_mensal]]",
    descricao: "Consumo médio mensal (em kWh)",
    categoria: "projeto",
  },
  {
    nome: "[[consumo_medio_diario]]",
    descricao: "Consumo médio diário (em kWh)",
    categoria: "projeto",
  },
  {
    nome: "[[nome_kit]]",
    descricao: "Nome do Kit",
    categoria: "projeto",
  },

  // 🔹 FINANCEIRO
  {
    nome: "[[valor_a_vista]]",
    descricao: "Valor total à vista",
    categoria: "financeiro",
  },
  {
    nome: "[[forma_pagamento]]",
    descricao: "Forma de pagamento escolhida",
    categoria: "financeiro",
  },

  // 🔹 GERAL
  {
    nome: "[[criado_em]]",
    descricao: "Data de criação da proposta ou contrato",
    categoria: "geral",
  },
  {
    nome: "[[validade]]",
    descricao: "Validade do documento (ex: 7 dias)",
    categoria: "geral",
  },
  {
    nome: "[[data_assinatura]]",
    descricao: "Data de assinatura do contrato",
    categoria: "geral",
  },
];
