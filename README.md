# One Plus Gestão — guia de instalação

Sistema web próprio da One Plus: login e senha reais, banco de dados seguro na nuvem, cadastro completo de clientes (com dependentes, dados bancários, CPF, carteirinha), funil comercial, tarefas/demandas/inclusões/exclusões, agenda, reembolsos, agendamento de consultas/exames e pós-venda.

Duas contas gratuitas (pagas apenas se a base crescer muito) e cerca de 20 minutos resolvem a instalação. Você não precisa saber programar — é copiar e colar.

---

## Passo 1 — Criar o banco de dados (Supabase)

O Supabase é quem guarda seus dados com segurança (login, criptografia, backups automáticos). É a mesma tecnologia usada por milhares de empresas — sua "fornecedora de segurança".

1. Acesse **supabase.com** e crie uma conta gratuita (dá para usar o e-mail da One Plus).
2. Clique em **New project**. Dê o nome "oneplus-gestao", crie uma senha forte para o banco (guarde-a em local seguro — é diferente da senha de login do sistema) e escolha a região **South America (São Paulo)**.
3. Aguarde ~2 minutos até o projeto ficar pronto.
4. No menu lateral, abra **SQL Editor** → **New query**.
5. Abra o arquivo `schema.sql` (está nesta pasta), copie todo o conteúdo, cole no editor e clique em **Run**.
   - Isso cria todas as tabelas (clientes, dependentes, tarefas, reembolsos, agendamentos, funil, pós-venda, parâmetros) já com um cliente de exemplo, que você apaga depois pela tela do sistema.

## Passo 2 — Conectar o sistema ao banco

1. No Supabase, vá em **Settings** (ícone de engrenagem) → **API**.
2. Copie o valor de **Project URL**.
3. Copie o valor de **anon public** (a chave "pública" — não é secreta, mas também não compartilhe sem necessidade).
4. Abra o arquivo `config.js` desta pasta em qualquer editor de texto (Bloco de Notas serve) e cole os dois valores nos lugares indicados. Salve o arquivo.

## Passo 3 — Criar o login de cada pessoa da equipe

O sistema não tem tela de "criar minha conta" pública — por segurança, só entra quem você cadastrar.

1. No Supabase, vá em **Authentication** → **Users** → **Add user** → **Create new user**.
2. Preencha e-mail e senha para você e para Alana, Agatha e Kelly (uma conta por pessoa).
3. Marque a opção **Auto Confirm User** ao criar (assim a pessoa já consegue entrar direto, sem precisar confirmar e-mail).
4. Repita para cada integrante da equipe. Para adicionar ou remover alguém no futuro, é só voltar nessa tela — não precisa mexer no código.

## Passo 4 — Publicar o site na internet

Você pode usar qualquer hospedagem de site estático; a mais simples é a **Netlify** (gratuita):

1. Acesse **netlify.com**, crie uma conta gratuita.
2. Na tela inicial, procure a área de **"Deploy manually"** (arrastar e soltar).
3. Arraste esta pasta inteira (`oneplus-app`, com os 5 arquivos: `index.html`, `styles.css`, `app.js`, `config.js`, `schema.sql`) para a área indicada.
4. Em alguns segundos, a Netlify te dá um endereço (ex: `oneplus-gestao.netlify.app`). Esse é o link que você e a equipe vão usar para acessar o sistema todos os dias — pode salvar nos favoritos do navegador ou no celular.
5. (Opcional, quando quiser) na Netlify dá para trocar esse endereço por um domínio próprio, tipo `gestao.oneplusseguros.com.br`.

## Passo 5 — Entrar e usar

1. Abra o endereço do site.
2. Entre com o e-mail e senha que você cadastrou no Passo 3.
3. Vá em **Clientes** e apague o cliente de exemplo ("João Ricardo Almeida — exemplo"), depois comece a cadastrar sua carteira real.
4. Vá em **Parâmetros** e confirme a alíquota de imposto (8,5%), o percentual vitalício (2%) e defina sua meta mensal.

---

## O que o sistema já faz

- **Clientes:** cadastro completo — titular, CNPJ/CPF, e-mail, telefone, nascimento, plano, carteirinha, vigência, valor por beneficiário e valor total do contrato, dados bancários, dependentes (cada um com CPF, nascimento e valor). Calcula automaticamente a faixa etária ANS de cada titular e avisa a próxima mudança de faixa.
- **Comissões e faturamento:** projeção mês a mês do que você vai receber líquido (3 parcelas cheias + bônus eventual da 4ª + 2% vitalício), comparado com sua meta.
- **Funil comercial:** oportunidades por etapa (Qualificação → Fechado/Perdido), visível para toda a equipe, com botão para virar cliente direto ao fechar.
- **Tarefas:** tarefas do dia a dia, demandas, inclusões e exclusões de beneficiários, com responsável e vencimento.
- **Agenda:** visão única de tudo que vence — tarefas e agendamentos combinados, separados em atrasados e próximos.
- **Atendimentos:** agendamento de consultas/exames e acompanhamento de reembolsos, por status.
- **Pós-venda:** alertas automáticos de cliente sem contato há mais de 21 dias, revisão de plano (2 anos) a vencer em 60 dias, aniversariantes do mês, histórico de interações e modelos prontos de mensagem para WhatsApp (edite antes de enviar).

## O que fica por conta de vocês / observações importantes

- **Dados sensíveis (CPF, dados bancários):** ficam protegidos por login no Supabase, mas a responsabilidade pelo tratamento desses dados perante a LGPD é da One Plus como empresa — vale ter um termo de uso interno e cuidado ao dar acesso a novas pessoas.
- **Backup:** o Supabase já faz backup automático do banco no plano gratuito; se quiser tranquilidade extra, dá para ativar backups diários pagos (poucos dólares/mês) nas configurações do projeto.
- **Sincronização entre pessoas:** hoje, quando alguém cadastra ou edita algo, a tela de quem está vendo atualiza ao navegar ou recarregar a página (não é "ao vivo" segundo a segundo). Se isso incomodar no dia a dia, dá para ativar atualização em tempo real depois — é um ajuste pontual.
- **Mensagens de WhatsApp:** nesta versão os modelos são textos prontos para copiar e personalizar (não são gerados por IA na hora). Se quiser reativar geração automática por IA, é possível integrar futuramente.
- Guarde a senha do banco de dados (a que você criou no Passo 1) em local seguro — ela não fica salva em nenhum arquivo desta pasta.

Qualquer dúvida na instalação ou ajuste que queira pedir, é só chamar.
