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

## Resultados verificados
- 62 testes passaram em quatro arquivos, incluindo 10 testes de segurança: conta nova convidada, conta legada, uso repetido, token inválido, token expirado, e-mail sem autorização, falha após consumo, isolamento entre empresas e autorização de papéis.
- Chamadas reais à função implantada com somente e-mail/senha e com token desconhecido retornaram 403 e a mesma mensagem genérica.
- Navegador: sem convite, token desconhecido, rota antiga e conta existente autenticada não exibem formulário de senha; administrador existente continua acessando Usuários da Empresa.
- Banco: 12 contas `legacy_locked`; `anon` sem leitura, `authenticated` sem atualização nem execução da reivindicação.
- Aplicação compilou sem erros; verificação de diferenças sem erros de whitespace.

## Limites da verificação
- Não foi realizada ativação completa de uma nova conta real, pois exigiria criar usuário e definir senha; essas mutações foram evitadas para respeitar a restrição de preservar credenciais durante a auditoria. A ativação válida e expirada foi exercitada com testes isolados, não com token real consumido no servidor.
- A entrega/abertura do e-mail de recuperação e redefinição final não foi retestada; o fluxo foi preservado sem alterações. Nenhum e-mail foi disparado a terceiros.
- Não foram publicados frontend nem nova versão desktop/PWA. As funções de segurança e migrations já estão aplicadas no backend compartilhado, protegendo também clientes antigos.
- Convites expirados ou provisionamentos interrompidos não são reabertos por e-mail nem recriam usuários; uma conta criada sem convite utilizável deve usar recuperação por e-mail. Não foi incluído reenviar convite para contas existentes.