# Como funcionam as telas (TVs)

Cada empresa tem uma tela em `https://SEU-DOMINIO/display/<endereço-da-empresa>`. Basta abrir esse endereço no navegador da TV, de um mini PC ou de um tablet, em tela cheia. O resto acontece sozinho.

---

## 1. O que a tela faz sozinha

- **Troca os anúncios**, na ordem definida no botão **Ordem** e pela duração de cada um.
  - Vídeos tocam até o fim; a duração configurada vira o tempo mínimo.
  - Vídeos muito longos são cortados em 5 minutos.
- **Respeita o período e os dias/horários** de cada anúncio. Um anúncio "Seg–Sex · 11:00–14:00" só aparece nesses momentos (horário de Brasília).
- **Busca novidades**:
  - na hora, quando alguém altera um anúncio da empresa;
  - de qualquer forma, a cada 30 segundos.
- **Não deixa a TV apagar**: pede ao navegador para manter a tela ligada.
- **Esconde o cursor e o botão de tela cheia** depois de 3 segundos sem mexer o mouse.
- **Pula anúncios quebrados**: se uma imagem ou vídeo não carrega, vai para o próximo. Se for o único, mostra "Conteúdo indisponível no momento" e tenta de novo em 1 minuto.
- **Se recupera sozinha**: se o servidor falhar ao abrir a tela, ela mostra "Tentando novamente em 30s…" e recarrega sozinha. Não precisa ninguém ir até a TV.

---

## 2. Status das telas: "No ar", "Sem sinal há…", "Nunca abriu"

Toda vez que a tela busca novidades, a cada 30 segundos, ela também **avisa o servidor que está viva**. O painel guarda a hora desse último contato.

| Status (página Empresas) | Quer dizer |
|---|---|
| 🟢 **No ar** | Houve contato nos últimos **2 minutos** |
| 🟠 **Sem sinal há 15 min** (ou há 3 h, há 2 dias...) | O último contato foi há esse tempo |
| ⚪ **Nunca abriu** | A tela dessa empresa nunca foi aberta (desde 07/10/2026, quando o recurso entrou) |

- A página **Empresas** atualiza o status sozinha a cada minuto.
- O **Dashboard** mostra **"Telas no ar 3/5"**: quantas telas estão no ar em relação ao total de empresas.

### Por que uma tela pode aparecer "Sem sinal"

- A TV ou o computador está **desligado**, ou o navegador foi **fechado**.
- A **internet caiu**. Mesmo assim, ela continua exibindo os anúncios; veja a seção 3.
- A aba da tela está **minimizada ou atrás de outra janela**. Para economizar, a tela pausa as consultas quando não está visível e volta a avisar assim que aparece.
- Em telas **privadas**, a senha da empresa foi trocada. A tela volta para o pedido de senha e precisa que alguém digite a nova.

> **"Sem sinal" não significa necessariamente tela preta.** Pode ser só a internet fora com a TV ainda exibindo a última lista. O status mostra se o **servidor** está conseguindo falar com a tela.

---

## 3. Modo offline (sem internet)

A tela guarda no navegador tudo o que precisa para continuar exibindo.

### O que fica guardado
- A própria página da tela e os arquivos do sistema.
- A **última lista de anúncios** recebida.
- As **imagens e vídeos enviados pelo painel** (upload). Eles são baixados assim que o anúncio entra na lista e apagados do aparelho quando saem dela.

### O que acontece quando a internet cai
- A TV **continua passando** a última lista, inclusive ao ser recarregada ou religada.
- Os **dias e horários** continuam sendo respeitados: a tela consulta o próprio relógio.
- As **exibições continuam sendo contadas** e ficam guardadas para enviar depois.
- No painel, a tela passa para **"Sem sinal há X"**.

### Quando a internet volta
- Em até alguns minutos, a tela busca a lista nova. Se a queda foi longa, ela espaça as tentativas até 5 minutos, para não sobrecarregar.
- O status volta para **"No ar"**.
- As exibições guardadas são enviadas para o relatório.

### Limites do modo offline
- **A tela precisa ter aberto ao menos uma vez com internet**, já no site publicado, para guardar tudo. Abra a tela, espere 1 minuto e pronto.
- **Anúncios novos ou alterados durante a queda** só chegam quando a internet volta.
- **YouTube** e **imagens/vídeos de links de outros sites** precisam de internet. Para uma TV que não pode parar, prefira **enviar o arquivo** no anúncio.
- **Só funciona no site publicado** (`https://SEU-DOMINIO`), não no `localhost`.
- Navegação anônima (aba privada) apaga tudo ao fechar. Use uma janela normal.

### Como testar
1. Abra `https://SEU-DOMINIO/display/<empresa>` num computador e espere 1 minuto.
2. Desligue o Wi-Fi ou tire o cabo de rede.
3. Recarregue a página (F5): os anúncios continuam aparecendo.
4. No painel, aberto em outro aparelho com internet, a empresa passa para "Sem sinal" depois de cerca de 2 minutos.
5. Religue a internet: em até 1 minuto ela volta para "No ar".

---

## 4. Relatório de exibições

- Cada anúncio que entra na tela conta **1 exibição**. Com um único anúncio, conta 1 a cada "duração".
- A tela junta as contagens e envia **a cada 5 minutos** e quando é fechada. Por isso o relatório pode estar até ~5 minutos atrasado.
- **Relatórios** (menu lateral): escolha o período e a tela e veja:
  - exibições por anúncio;
  - **tempo de tela** (exibições × duração configurada);
  - totais.
- Os dias são contados no horário de Brasília. As contagens começaram em 07/10/2026.

---

## 5. Erros

Se algo der errado numa tela ou no painel, o sistema registra sozinho em **Administração → Erros** (só para ADMIN). Exemplos:
- "Mídia não carregou: Promoção de inverno", com o endereço da mídia;
- falhas do servidor ao montar a lista.

A página mostra os erros **mais frequentes dos últimos 7 dias**, e cada registro abre com os detalhes técnicos. Os registros são apagados depois de 30 dias pela rotina do [guia 1](1-vercel-cron-secret.md).

---

## 6. Dicas para a TV

- Use **Chrome ou Edge** atualizados. Em Smart TVs, o navegador embutido pode não suportar o modo offline; um mini PC, Chromecast com Google TV ou Fire TV Stick com navegador funcionam melhor.
- Deixe o navegador **abrir a tela automaticamente ao ligar**, configurando a página inicial com o endereço da tela, e em **tela cheia**: botão no canto da tela ou F11.
- Desative a **economia de energia/descanso de tela** do aparelho. A tela pede para ficar ligada, mas algumas TVs ignoram o pedido.
- Para instalar como aplicativo, no Chrome use **⋮ → Transmitir, salvar e compartilhar → Instalar página como app**. Ele abre em tela cheia, sem barra de endereço.
