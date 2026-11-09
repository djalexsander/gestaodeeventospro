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