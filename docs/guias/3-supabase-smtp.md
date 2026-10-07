# 3. SMTP próprio no Supabase (envio de e-mails)

## O que é e por que precisa

O Supabase já vem com um serviço de e-mail, mas ele é só para testes:
- **envia pouquíssimos e-mails por hora**, para o projeto inteiro;
- **só entrega para endereços da equipe** do projeto no Supabase;
- os e-mails vêm de um remetente genérico e costumam cair no spam.

Para o "Esqueci minha senha" funcionar com qualquer usuário, o Supabase precisa enviar por um **servidor de e-mail (SMTP)** seu.

## 1. Escolher um serviço de envio

Qualquer serviço que forneça **SMTP** serve. Dois gratuitos e simples:

| Serviço | Grátis | Precisa de domínio próprio? |
|---|---|---|
| **Brevo** (<https://www.brevo.com>) | 300 e-mails/dia | Não: dá para validar só um endereço remetente (ex.: seu Gmail) |
| **Resend** (<https://resend.com>) | 3.000/mês (100/dia) | **Sim** para enviar a qualquer pessoa: você verifica o domínio no DNS |

> **Sem domínio próprio, use o Brevo.** Com domínio próprio (ex.: `suaempresa.com.br`), os dois servem. Com o domínio verificado, os e-mails caem menos no spam.

### Exemplo com o Brevo

1. Crie a conta em <https://www.brevo.com>.
2. **Senders, Domains & Dedicated IPs** → **Senders** → **Add a sender**. Cadastre o e-mail que vai aparecer como remetente e confirme pelo link que chega nele.
3. **SMTP & API** → aba **SMTP** → **Generate a new SMTP key**. Copie:
   - **SMTP Server:** `smtp-relay.brevo.com`
   - **Port:** `587`
   - **Login:** algo como `9a1b2c001@smtp-brevo.com`
   - **SMTP key:** é a senha. Ela só aparece uma vez.

### Exemplo com o Resend (com domínio próprio)

1. Crie a conta em <https://resend.com> → **Domains** → **Add Domain** e cadastre os registros DNS que ele mostrar no seu provedor de domínio.
2. Espere o domínio ficar **Verified**.
3. **API Keys** → **Create API Key**. A chave é a senha.
   - **Host:** `smtp.resend.com`
   - **Port:** `465`
   - **Username:** `resend`
   - **Password:** a API key.

## 2. Configurar no Supabase

1. <https://supabase.com/dashboard> → projeto → **Authentication** → **Emails** → aba **SMTP Settings**.
2. Ative **Enable custom SMTP** e preencha:
   - **Sender email:** o remetente validado no serviço (ex.: `nao-responda@suaempresa.com.br`).
   - **Sender name:** `Digital Signage`, ou o nome que preferir.
   - **Host**, **Port**, **Username** e **Password:** os dados do passo 1.
3. **Save changes**.

## 3. Ajustar o limite de envio

Com SMTP próprio, o Supabase deixa aumentar o limite: **Authentication** → **Rate Limits** → **Rate limit for sending emails**. Use, por exemplo, **30 por hora**.

> O sistema já tem uma trava própria de **5 pedidos de nova senha por hora por endereço de internet (IP)**, para ninguém usar o formulário para disparar e-mails em massa.

## 4. Deixar o e-mail em português

**Authentication** → **Emails** → aba **Templates** → **Reset Password**:

- **Subject:** `Crie uma nova senha`
- **Body:**

```html
<h2>Nova senha</h2>
<p>Recebemos um pedido para criar uma nova senha para a sua conta no painel de Digital Signage.</p>
<p><a href="{{ .ConfirmationURL }}">Criar nova senha</a></p>
<p>O link vale por 1 hora. Se não foi você, ignore este e-mail: a sua senha atual continua valendo.</p>
```

> Mantenha o `{{ .ConfirmationURL }}`: é ele que leva ao endereço configurado no [guia 2](2-supabase-urls.md).

## 5. Testar

Siga o teste do [guia 2](2-supabase-urls.md#testar). Se o e-mail não chegar:
- olhe a caixa de spam;
- no Supabase, veja **Logs → Auth**: lá aparece o erro do SMTP, como senha errada ou remetente não validado;
- no painel do serviço de envio, veja se o e-mail foi aceito.
