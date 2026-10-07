# 2. URLs de retorno no Supabase (link do "Esqueci minha senha")

## O que é e por que precisa

Quando alguém usa **"Esqueceu a senha?"** no login, o Supabase envia um e-mail com um link. Ao clicar, a pessoa passa primeiro pelo Supabase, que confere o link, e depois **volta para o sistema** em `https://SEU-DOMINIO/auth/callback`. De lá ela segue para **Minha conta**, onde cria a nova senha.

Por segurança, o Supabase só devolve a pessoa para endereços **cadastrados na lista de permitidos**. Se o endereço não estiver na lista, o link manda para o endereço padrão ("Site URL") e a troca de senha não funciona.

## Passo a passo

1. Entre em <https://supabase.com/dashboard> e abra o projeto do sistema.
2. Menu lateral: **Authentication** → **URL Configuration**.
3. **Site URL:** coloque `https://SEU-DOMINIO`, sem barra no final, e clique em **Save**.
4. **Redirect URLs** → **Add URL**. Adicione:
   - `https://SEU-DOMINIO/auth/callback`
   - `http://localhost:3000/auth/callback`, só se quiser testar a troca de senha no computador.
5. Clique em **Save**.

> Se um dia o sistema mudar de domínio (por exemplo, um domínio próprio como `painel.suaempresa.com.br`), repita estes passos com o endereço novo.

## Opcional: fixar o endereço nos e-mails

O sistema descobre o próprio endereço pela requisição. Para fixá-lo, crie na Vercel (**Settings → Environment Variables**, como no guia 1):
- **Key:** `NEXT_PUBLIC_SITE_URL`
- **Value:** `https://SEU-DOMINIO`

Depois faça o **Redeploy**.

## Testar

Faça o teste só depois do [guia 3 (SMTP)](3-supabase-smtp.md), porque sem SMTP próprio o Supabase envia poucos e-mails por hora.

1. Abra `https://SEU-DOMINIO/login` → **Esqueceu a senha?**
2. Informe o seu e-mail → **Enviar link**.
3. Abra o e-mail e clique no link. Você deve cair em **Minha conta** com o aviso "Crie uma nova senha para a sua conta".
4. Troque a senha e entre de novo com ela.

Se cair no login com a mensagem **"Link inválido ou expirado"**, confira:
- se o endereço do passo 4 está exatamente igual, com `https` e sem barra no final;
- se o link tem menos de 1 hora;
- se foi o último link pedido, porque cada novo pedido invalida o anterior.
