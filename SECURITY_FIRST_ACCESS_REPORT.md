# Primeiro Acesso — relatório de segurança

## Causa confirmada
A função pública `first-access` recebia e-mail e senha, procurava usuários com a API administrativa e executava `updateUserById` sem sessão, convite ou prova de propriedade do e-mail. Quando não encontrava usuário, provisionava um administrador de empresa apenas por correspondência do e-mail. A página antiga `/set-password` também aceitava qualquer sessão existente como autorização para definir senha.

## Correção aplicada
- O caminho vulnerável foi inicialmente bloqueado e a função segura foi implantada no Lovable Cloud, junto às duas funções de criação de usuários.
- Nenhuma definição de senha é autorizada por e-mail. O servidor exige token aleatório individual de 256 bits, armazenado somente como hash SHA-256, válido por 24 horas.
- A reivindicação do token é uma operação atômica no banco: somente estado pendente com token correto e prazo válido pode passar para ativado. O token é consumido antes da alteração de senha; falha posterior não reabre ativação e deve ser tratada por recuperação segura.
- As 12 contas existentes receberam estado `legacy_locked`, independentemente de existência de senha, histórico de login ou navegador. Nenhum usuário foi excluído/recriado; nenhuma senha existente foi alterada; papéis e dados existentes foram preservados.
- Clientes públicos e autenticados não têm privilégios na tabela de ativação nem podem executar a função de reivindicação. RLS permanece habilitada sem políticas de acesso cliente. O gatilho impede reabrir estados ativados/legados.
- Administradores autorizados emitem convites ao criar empresas/usuários; recebem o link para entrega privada ao responsável. O link não é enviado automaticamente por e-mail. Um convite não comprova quem recebeu o link: o administrador deve entregá-lo somente ao destinatário correto.
- As duas funções de provisionamento verificam sessão, papéis protegidos e empresa no servidor; não permitem criação entre empresas por administradores locais nem atribuição de papel master.
- O gatilho de novos usuários agora cria somente papel comum e perfil sem empresa. A atribuição de empresa/papel ocorre explicitamente após validação do administrador, nunca por metadados editáveis. Contas existentes não foram reclassificadas.
- `/primeiro-acesso` e `/set-password` usam a mesma validação no servidor; sessões existentes não liberam o formulário. Respostas de convite inválido, desconhecido ou consumido são genéricas.
- O fluxo “Esqueci minha senha” não foi alterado, nem planos, pagamentos, notificações, versões ou atualizadores.
- O teste real identificou que a senha temporária anterior possuía 76 bytes, acima do limite de 72 bytes aceito pelo Auth. Corrigida para 68 bytes com 256 bits de aleatoriedade; senhas de ativação acima do limite são rejeitadas antes de consumir o convite.

## Resultados verificados
- 64 testes passaram em quatro arquivos, incluindo 12 testes de segurança: conta nova convidada, conta legada, uso repetido, token inválido, token expirado, e-mail sem autorização, falha após consumo, isolamento entre empresas, autorização de papéis e limites de senha.
- Chamadas reais à função implantada com somente e-mail/senha e com token desconhecido retornaram 403 e a mesma mensagem genérica.
- Navegador: sem convite, token desconhecido, rota antiga e conta existente autenticada não exibem formulário de senha; administrador existente continua acessando Usuários da Empresa.
- Banco: 12 contas `legacy_locked`; `anon` sem leitura, `authenticated` sem atualização nem execução da reivindicação.
- Aplicação compilou sem erros; verificação de diferenças sem erros de whitespace.
- Uma conta nova de teste foi criada pelo formulário de Usuários da Empresa usando um alias Gmail da caixa indicada pelo usuário. O endereço original indicado já pertencia a uma conta legada e não foi modificado.
- Convite real validado, senha definida somente para a conta nova, redirecionamento para login e login real por e-mail/senha concluídos. A agenda abriu com as permissões de usuário comum. Reutilização do token pelo navegador e chamada direta ao servidor foi rejeitada (403).
- Criação de convite sem autenticação foi rejeitada (401). As 12 contas legadas continuam presentes e permanentemente bloqueadas para Primeiro Acesso; o total agora é 13, incluindo a conta de teste ativada, com hash do token removido.
- Recuperação solicitada pelo botão Esqueceu sua senha na conta de teste: HTTP 200 e recovery_sent_at registrado. Site URL de produção e allowlist de produção/preview confirmados pela leitura das configurações hospedadas. A requisição do navegador local usa localhost, que não está na allowlist; a abertura real do e-mail e destino ainda precisam ser conferidos no preview/produção pelo destinatário.

## Limites da verificação
- A expiração foi exercitada por teste isolado; não foi alterado o prazo de uma conta real para simular expiração.
- A entrega/abertura do e-mail de recuperação e redefinição final dependem do destinatário da caixa indicada. O pedido foi aceito pelo servidor, mas HTTP 200 não comprova recebimento. Nenhuma senha legada foi alterada.
- Acesso de administrador existente foi verificado por sessão gerenciada validada, não por digitação da senha real; não foram solicitadas nem alteradas credenciais existentes. A conta nova teve login por senha verificado.
- Não foram publicados frontend nem nova versão desktop/PWA. As funções de segurança e migrations já estão aplicadas no backend compartilhado, protegendo também clientes antigos.
- Convites expirados ou provisionamentos interrompidos não são reabertos por e-mail nem recriam usuários; uma conta criada sem convite utilizável deve usar recuperação por e-mail. Não foi incluído reenviar convite para contas existentes.
- Prontidão: ativação inicial real verificada, mas a publicação permanece suspensa até confirmar recebimento/abertura da recuperação e login com senha de uma conta existente pelo próprio usuário.

## Verificação pré-publicação — 2026-11-09
- O titular autorizou publicar exclusivamente a correção de Primeiro Acesso, sem alterar outras funcionalidades ou senhas.
- Reexecutados os quatro arquivos de testes: 64 testes passaram, incluindo os 12 de segurança da ativação.
- Conferência atual do banco compartilhado com produção: todas as 12 contas originais continuam presentes, com perfil, senha cadastrada e papéis; estado `legacy_locked`, sem token. A conta adicional de teste continua ativada, sem token. Nenhuma senha ou dado foi alterado nesta verificação.
- Confirmados RLS ativo e ausência de políticas cliente na tabela de ativação; `anon`/`authenticated` não podem ler a tabela nem executar a reivindicação; `authenticated` não pode atualizar a tabela.
- A função implantada rejeitou e-mail/senha sem convite e validação de token desconhecido com HTTP 403. A função de reivindicação exige estado pendente, hash correspondente e prazo válido; a proteção de reabertura continua definida no banco.
- Navegador local: `/primeiro-acesso` sem token, com token desconhecido e `/set-password` não exibem campos de senha; nenhuma exceção de página foi observada.
- A ativação real e o login por senha da conta nova foram verificados anteriormente; não foram repetidos criando outra conta nesta publicação.
- O log inicialmente vazio foi atualizado pelo ambiente: `build OK` em 2026-11-09 às 19:03:27 UTC confirma a compilação atual sem erros.
- A verificação básica de segurança encontrou oito alertas críticos ativos fora do Primeiro Acesso, em empresas, assinaturas, pagamentos, configurações, solicitações de plano e arquivos de riders. Não foram corrigidos nem ignorados para preservar o escopo autorizado. A decisão do titular será solicitada antes de pedir publicação.
- Nenhum deploy foi solicitado nesta etapa; conclusão e proteção do frontend publicado ainda não estão confirmadas. Permanecem pendentes a confirmação pelo titular do recebimento/abertura da recuperação e do login por senha de uma conta original.

## Esclarecimento dos oito alertas e suspensão da publicação
- Os oito alertas críticos persistidos têm data de criação de 2026-09-03, anterior à correção do Primeiro Acesso; as permissões correspondentes continuam presentes no banco.
- Empresas: consulta entre empresas, incluindo telefones. Assinaturas: consulta ampla de assinaturas. Comprovantes de pagamento: leitura e inclusão sem restrição adequada por empresa. PIX: leitura ampla das configurações. Solicitações de plano: leitura e inclusão sem restrição adequada por empresa. Configurações do sistema: leitura ampla, inclusive anônima, exigindo separar dados públicos e restritos. Riders: dois alertas distintos, substituição e exclusão sem vínculo ao proprietário ou empresa.
- Nenhum dos oito achados demonstrou acesso ao registro de ativação, ao token ou ao mecanismo de senha, nem reutilização de convite. A consulta ampla de empresas não concede autorização de convite: a função de provisionamento valida papéis e empresa do solicitante separadamente. Esta conclusão é específica a esses oito alertas, não uma certificação geral da segurança do aplicativo.
- Os alertas permanecem ativos, sem correção nem supressão, para tratamento posterior. É possível solicitar publicação exclusiva da correção, sujeita ao bloqueio da plataforma; isso não equivale a declarar o restante do aplicativo seguro.
- A chamada de publicação foi cancelada antes da execução quando o titular solicitou este resumo. Nenhum deploy ocorreu por essa chamada. Uma nova autorização explícita é necessária antes de publicar.
- Nenhuma funcionalidade, permissão, dado ou senha foi alterado nesta etapa; somente o relatório e a lista de pendências foram atualizados.

## Publicação autorizada e verificação em produção — 2026-11-09
- Após nova autorização explícita, a plataforma aceitou e agendou a publicação exclusiva da correção; não exigiu resolver nem ignorar os oito alertas críticos persistidos. Nenhuma funcionalidade adicional foi modificada.
- A leitura básica mais recente classificou seis desses achados como críticos e dois como avisos, enquanto o estado persistido usado pela publicação ainda lista oito críticos. Nenhum achado foi corrigido ou suprimido nesta etapa.
- Site verificado: https://gestaodeeventospro.lovable.app. Resposta HTTP 200; frontend compilado carregou `/assets/index-BpVZyk6h.js` e exibiu a página segura de ativação. A versão corrigida foi observada no endereço de produção, não apenas no preview; o estado interno do job de deploy não é fornecido pela ferramenta de publicação.
- Em produção, convite real da conta de teste já ativada foi rejeitado sem campos de senha. A rota antiga `/set-password` também permaneceu bloqueada para uma conta original autenticada.
- Uma das 12 contas originais acessou Usuários da Empresa usando sessão gerenciada autorizada. A primeira tentativa sem recarregar a página após restaurar a sessão permaneceu no login; recarregar hidratou a sessão e confirmou o acesso. Não houve alteração no aplicativo.
- Login digitando e-mail e senha já existentes da conta de teste foi repetido com sucesso em produção; a agenda abriu. Não foram solicitadas, digitadas ou alteradas senhas das 12 contas originais.
- Verificação atual do banco: 12 contas originais presentes com perfis e senhas cadastradas, todas `legacy_locked`, sem tokens; a conta de teste permanece ativada, sem token. RLS e restrições de privilégios cliente permanecem ativos; reivindicação exige token pendente não expirado e reabertura continua bloqueada. A chamada pública de e-mail/senha sem convite retornou HTTP 403.
- Nenhuma exceção de página foi observada no teste de acesso original e bloqueio autenticado. Os 64 testes e a compilação sem erros foram confirmados antes da publicação.
- Pendências remanescentes: titular confirmar login digitando a senha inalterada de uma conta original e recebimento/abertura do e-mail de recuperação. Os oito alertas preexistentes ficam para tratamento separado; isso não invalida a proteção específica de Primeiro Acesso observada, nem certifica a segurança geral do aplicativo.