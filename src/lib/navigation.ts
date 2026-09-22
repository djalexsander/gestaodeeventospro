/**
 * Hierarquia de navegação do app: toda tela interna tem uma "rota-pai" para
 * onde o botão Voltar do cabeçalho deve levar. Home ("/" e "/eventos", que
 * renderizam a mesma agenda) fica no topo e não tem pai.
 */
const HOME_PATHS = new Set(["/", "/eventos"]);

export function isHomeRoute(pathname: string): boolean {
  return HOME_PATHS.has(pathname);
}

/** Rota-pai na hierarquia do app, ou null quando `pathname` já é a home. */
export function getParentRoute(pathname: string): string | null {
  if (isHomeRoute(pathname)) return null;
  if (/^\/eventos\/[^/]+$/.test(pathname)) return "/eventos";
  return "/";
}
