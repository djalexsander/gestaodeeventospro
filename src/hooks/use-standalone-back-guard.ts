import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isStandalonePWA } from "@/lib/push";
import { isTauri } from "@/lib/platform";

// Nível de módulo (não um ref) para sobreviver a remounts do componente que
// chama este hook e garantir que a entrada extra seja criada uma única vez
// por sessão do app.
let armed = false;

/**
 * PWA instalado em Android roda sem a barra de navegação do Chrome: se o
 * histórico interno do app se esgotar, o botão/gesto Voltar do sistema pode
 * "vazar" para o que existia antes do app no WebView (ex.: a página do
 * Google que originou a instalação), abandonando o app.
 *
 * Duplicamos a primeira entrada de histórico uma única vez, assim que a
 * primeira tela protegida é exibida, para que o primeiro Voltar a partir de
 * qualquer tela interna sempre aterrisse dentro do app em vez de vazar para
 * fora dele. Não roda no desktop (Tauri) nem fora do modo standalone, então
 * o comportamento em navegador comum permanece inalterado.
 */
export function useStandaloneBackGuard(): void {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (armed) return;
    if (isTauri() || !isStandalonePWA()) return;
    armed = true;
    navigate(location.pathname + location.search, { replace: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
