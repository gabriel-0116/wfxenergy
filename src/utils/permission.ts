// src/utils/roleBlocks.ts

/**
 * Aqui você controla quais rotas cada role NÃO PODE acessar.
 * 
 * Se amanhã você quiser bloquear qualquer outra tela,
 * basta adicionar na lista correspondente.
 */

export const blockedRoutesByRole: Record<string, string[]> = {
  admin: [], // admin não tem bloqueio NENHUM
  vendas: [
    "/admin",         // bloqueia Painel Admin
    "/produtos",      // bloqueia lista de produtos
  ],
  auxiliar: [], // hoje auxiliar pode tudo, mas você pode alterar quando quiser
};

/**
 * Função simples pra verificar se uma rota está bloqueada pra uma role.
 */
export function isRouteBlocked(role: string | null | undefined, pathname: string) {
  if (!role) return false;

  const blockedList = blockedRoutesByRole[role] || [];

  // protege sub-rotas também:
  // "/produtos" bloqueia "/produtos/alguma-coisa"
  return blockedList.some((route) => pathname.startsWith(route));
}
