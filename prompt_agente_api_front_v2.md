# Tarefa: integrar API (FastAPI) e front (Next.js) ao firmware v7 do ESP32 do Projeto C.A.S.A.

## 0. Como trabalhar

1. **Antes de alterar qualquer coisa**, leia o repositório (`backend/main.py` e o que mais existir, `frontend/app/`) e me entregue um resumo curto do que já existe: rotas da API, esquema atual do Firestore (coleções e campos), telas do front. Compare com o **contrato** da seção 2.
2. **O firmware (v7) já está pronto e NÃO será alterado.** O contrato da seção 2 é fixo. Se o esquema atual da API for diferente, **adapte a API** para produzir/ler o contrato (por exemplo, uma função que "publica" a prancha no formato do aparelho). Não peça mudança no firmware.
3. Trabalhe em etapas, nesta ordem: (A) contrato e regras → (B) API → (C) front → (D) testes → (E) documentação. Ao fim de cada etapa, liste o que mudou e o que ficou pendente.
4. Se alguma decisão não estiver coberta aqui, escolha a opção mais simples e segura e **registre a decisão** no resumo final. Não invente campos além dos listados.

## 1. Arquitetura (muda em relação ao documento do TCC)

```
ESP32  <──REST (login anônimo Firebase)──>  Firestore  <──Admin SDK──>  API FastAPI  <──>  Front Next.js
```

- O ESP32 **não** fala com a API. Ele lê e escreve direto no Firestore por REST, autenticado como **usuário anônimo** do Firebase Auth. O **Firestore é o elo** entre aparelho e API.
- A API usa o **Admin SDK** (ignora as regras do Firestore). O front só fala com a API.
- Não existe mais `X-Device-Token`. Remova ou marque como obsoleta qualquer rota `/dispositivo/...` pensada para o aparelho consumir a API, e remova o fluxo de "gerar token de 256 bits no pareamento".
- O **dono do aparelho é sempre o campo `owner_uid` do documento `dispositivos/{MAC}`**. É isso que vincula o aparelho a uma conta, e somente a API escreve esse campo.
- O aparelho só tem 8 botões, 8 telas TFT e um OLED 128x32. **O aparelho não consegue renderizar texto nas telas TFT**: ele só decodifica JPEG. Ver 2.5.

## 2. Contrato do Firestore (fixo)

Tipos: use tipos nativos do Firestore. **Números inteiros devem ser inteiros** (não `float`), para virarem `integerValue`.
Datas gravadas pelo aparelho são **strings ISO-8601 UTC** (`"2026-11-10T14:30:00Z"`), **não** `Timestamp`. Ao ler, faça o parse.

### 2.1 `dispositivos/{MAC}`

ID do documento: MAC em **MAIÚSCULAS com dois-pontos**, ex.: `A1:B2:C3:D4:E5:F6`.

Escritos **somente pela API**:

| Campo | Tipo | Observação |
|---|---|---|
| `owner_uid` | string | Dono. Vazio/ausente = sem dono. |
| `config_versao` | int | Incrementar a cada mudança da prancha (ver 2.6). |
| `modo` | string | `"casa"` ou `"escola"`. **O firmware v7 não exibe mais o modo em lugar nenhum.** Mantenha só por compatibilidade e **remova o seletor do front**. |
| `wifi_versao` | int | Versão da lista de redes Wi-Fi (ver 2.11). Incrementar a cada alteração da lista. |
| `wifi_redes` | array de map | Redes Wi-Fi com senha **cifrada** (ver 2.11). Posição 0 = principal. |
| `volume` | int 0–100 | O aparelho lê a cada 30 s. Não precisa incrementar `config_versao`. |
| `nome` | string (opcional) | Apelido. O aparelho ignora. |
| `criado_em` | string ISO | Opcional. |

Escritos **somente pelo aparelho** (a cada 5 min, e logo após parear). **A API nunca deve sobrescrever esses campos:**

`bateria_pct` (int), `nivelBateria` (int), `ip` (string), `firmware` (string), `ssid` (string; é a rede **em uso**, lida do rádio), `wifi_versao_aplicada` (int; `-1` = nenhuma lista do site aplicada ainda), `wifi_status` (string: `sem_chave`, `aguardando`, `ok`, `erro_decifrar`), `sinal_wifi` (int 0–100), `statusOnline` (bool), `ultima_sincronizacao` (string ISO).

> **Cuidado:** nunca use `set()` sem `merge` em `dispositivos/{MAC}`. Use `update()` ou `set(..., merge=True)` para não apagar a telemetria.

> **Online/offline:** `statusOnline` fica `true` para sempre se o aparelho for desligado. Calcule o estado por `ultima_sincronizacao`: mais de **10 minutos** atrás = "sem comunicação recente".

### 2.2 `pareamentos/{codigo}`

ID do documento: **código de 6 dígitos** (ex.: `482913`), mostrado no OLED do aparelho.
Criado **pelo aparelho**, com os campos `mac` (string, formato `AA:BB:CC:DD:EE:FF`) e `firmware` (string).

- O aparelho renova o código a cada 9 minutos enquanto não estiver pareado. Códigos antigos ficam órfãos.
- **A validade é de 10 minutos a partir do `create_time` do documento no Firestore** (não há campo de data gravado pelo aparelho, pois ele pode estar sem relógio).
- Depois de usar um código com sucesso, **apague o documento**.

### 2.3 `usuarios/{uid}/categorias/{id}` (prancha)

O aparelho lista **todos** os documentos desta coleção e lê:

| Campo | Tipo | Regra |
|---|---|---|
| `ordem` | int | **0, 1 ou 2** = botão de navegação SW1/SW2/SW3. Outros valores são ignorados. |
| `nome` | string | |
| `imagem_id` | string | ID em `usuarios/{uid}/midias/`. `""` = sem imagem. É o ícone da categoria. |
| `botoes` | array de map | Até 5 itens (abaixo). |

Cada item de `botoes`:

| Campo | Tipo | Regra |
|---|---|---|
| `ordem` | int | **0 a 4** = posição do botão de comunicação. |
| `id` | string | **ID estável do botão** (não pode mudar se o botão só for renomeado). Usado no histórico. |
| `rotulo` | string | Nome/significado do botão. |
| `imagem_id` | string | ID em `midias/`, ou `""`. |
| `audio_id` | string | ID em `midias/`, ou `""`. |

Limites da API: no máximo 3 categorias e 5 botões por categoria. Os mesmos 15 botões valem para **todos os aparelhos da conta**.

Um botão sem imagem **e** sem áudio fica inativo no aparelho.

### 2.4 Mídias

`usuarios/{uid}/midias/{midiaId}`:
- `arquivo` (string): chave em `arquivos_midia`. **Para áudio, deve terminar em `.mp3` ou `.wav`** (o aparelho decide a extensão pelo nome).
- `sha256` (string): hex minúsculo, 64 caracteres, calculado sobre os **bytes finais** do arquivo.
- `tamanho` (int): tamanho em bytes.

`arquivos_midia/{arquivo}`:
- `total_blocos` (int), `sha256` (string), `tamanho` (int).
- Subcoleção `blocos/{NNNN}`: ID com **4 dígitos com zeros à esquerda, começando em `0000`**; campo `dados_b64` (string) com Base64 padrão (com `=`, sem quebras de linha).
- Cada bloco deve decodificar sozinho. Use blocos de **196608 bytes brutos** (múltiplo de 3, ≈262 KB em Base64, abaixo do limite de 1 MiB por documento).

**Regras do conteúdo (o aparelho não converte nada):**
- **Imagem:** JPEG **baseline** (NÃO progressivo), **240×240**. Converta PNG/JPG enviados pelo usuário.
- **Áudio:** **MP3 ou WAV**, ≤ 500 KB, preferencialmente mono. Se o front gravar pelo navegador (webm/ogg), converta no servidor (ffmpeg, MP3 mono 64–96 kbps ou WAV PCM 16-bit 16 kHz mono).
- ⚠️ O RNF06 do documento fala em AAC/.m4a. **O firmware não toca `.m4a`.** Padronize em MP3/WAV e me avise para ajustar o texto do TCC.
- **Trocar uma mídia = criar um novo `midiaId`** (por exemplo, UUID novo). O aparelho decide o que baixar comparando IDs. Se reaproveitar o mesmo ID com conteúdo novo, o aparelho **não** atualiza.

### 2.5 O aparelho só mostra imagem

As telas TFT exibem apenas JPEG. Portanto:
- **Toda categoria precisa de imagem** (`imagem_id`), senão o botão de navegação fica com a tela preta.
- Todo botão com áudio e sem imagem também fica com a tela preta.
- Implemente: se o usuário não enviar imagem para uma categoria/botão, a API **gera um JPEG 240×240 padrão** (fundo de cor sólida + texto do `nome`/`rotulo`, usando Pillow) e o publica como mídia normal.

### 2.6 Sincronização versionada (`config_versao`)

O aparelho compara `config_versao` com a versão que ele tem; **só quando é diferente** ele baixa a prancha. Portanto:

1. Grave **primeiro** todos os blocos, depois `arquivos_midia/{arquivo}`, depois `midias/{id}`, depois as `categorias`.
2. **Por último**, incremente `config_versao` (`firestore.Increment(1)`) em **todos** os documentos `dispositivos` onde `owner_uid == uid` (a prancha é da conta; cada aparelho tem seu contador).
3. Faça o incremento a cada mudança: criar/editar/excluir categoria ou botão, reordenar, trocar/remover mídia. Se o usuário fizer várias edições seguidas, agrupe (debounce) para não disparar vários downloads.
4. Apague mídias antigas do servidor **depois** de incrementar a versão.
5. Ao parear, grave `config_versao` com um valor inicial (ex.: `1`). O aparelho começa em `-1`, então sempre sincroniza no primeiro vínculo.
6. Mudanças em `modo`, `volume` e `nome` **não** exigem incremento.

### 2.7 `usuarios/{uid}/acionamentos/{id}` (escrito pelo aparelho)

ID: `{MACSEMPONTOS}_{boot}_{seq}` (idempotente, o aparelho reenvia sem duplicar).
Campos: `botao_id` (string; é o `id` do botão em `categorias.botoes`; se vazio, `"b1"`…`"b5"`), `botao_nome` (string), `categoria_nome` (string), `dispositivo` (MAC com dois-pontos), `origem` (`"dispositivo"`), `acionado_em` (**string** ISO UTC), `tempo_aproximado` (bool, só aparece se verdadeiro).

`botao_nome` e `categoria_nome` são o **retrato do momento do clique** (o histórico não muda se o botão for renomeado depois). Rankings e gráficos devem agrupar por `botao_id`.
Registros com `tempo_aproximado == true` devem ser marcados na UI (ou ignorados nos gráficos por hora).

### 2.8 `usuarios/{uid}/notificacoes/{id}` (escrito pelo aparelho)

`tipo` (`"bateria_baixa"`), `titulo`, `mensagem`, `lida` (bool, `false`), `criada_em` (string ISO; pode faltar se o aparelho estava sem relógio, nesse caso use o `create_time` do documento). A API também cria notificações próprias (ex.: `"pareamento"`) com o mesmo formato.

### 2.9 `status_casa/atual`

**Obsoleto.** Era um documento único compartilhado. O firmware v6 não o escreve mais. Se algum painel ou rota ler esse documento, **migre para `dispositivos/{MAC}`** (por conta, filtrando por `owner_uid`).

### 2.10 Regras do Firestore (publicar no console)

Substitui o "negar tudo" atual. O aparelho precisa destas permissões; o front continua sem acesso direto.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function aparelho() {
      return request.auth != null &&
             request.auth.token.firebase.sign_in_provider == 'anonymous';
    }
    match /dispositivos/{mac} {
      allow get: if aparelho();
      allow update: if aparelho() &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly([
          'bateria_pct','nivelBateria','ip','firmware','ssid','sinal_wifi',
          'ultima_sincronizacao','statusOnline','wifi_versao_aplicada','wifi_status']);
    }
    match /pareamentos/{codigo} {
      allow create: if aparelho()
        && codigo.matches('^[0-9]{6}$')
        && request.resource.data.keys().hasOnly(['mac','firmware'])
        && request.resource.data.mac is string
        && request.resource.data.mac.size() == 17;
    }
    match /arquivos_midia/{f} {
      allow get: if aparelho();
      match /blocos/{b} { allow get: if aparelho(); }
    }
    match /usuarios/{uid}/categorias/{c}   { allow get, list: if aparelho(); }
    match /usuarios/{uid}/midias/{m}       { allow get: if aparelho(); }
    match /usuarios/{uid}/acionamentos/{a} { allow create, update: if aparelho(); }
    match /usuarios/{uid}/notificacoes/{n} { allow create, update: if aparelho(); }
  }
}
```

**Não crie regra para `dispositivos_segredos`**: sem regra, o Firestore nega tudo, e só o Admin SDK (a API) acessa. É onde fica a chave de criptografia do Wi-Fi (2.11).

Também é necessário habilitar **Authentication → Sign-in method → Anonymous**. Estas duas ações são manuais no console do Firebase: liste-as no seu resumo final para eu executar.

### 2.11 Wi-Fi remoto: várias redes, senha cifrada

O aparelho guarda até 5 redes. A posição 0 é a **principal**. Se uma rede não conecta em 15 s, ele tenta a próxima; ao fim da lista espera (30 s, 1 min… até 5 min) e **recomeça pela principal**, em loop. Se a conexão cair, também recomeça pela principal. Enquanto isso o uso pela criança continua normal (só não sincroniza).

**Por que cifrar:** o documento `dispositivos/{MAC}` pode ser lido por qualquer aparelho anônimo (regras da 2.10). A senha do Wi-Fi nunca pode ficar em texto puro ali.

**A chave (AES-256), 32 bytes:**
- É gerada pelo **front** (`crypto.getRandomValues`) e enviada ao aparelho **pelo Bluetooth**, junto com a primeira rede (ver 4.1). O aparelho a guarda na memória interna.
- A API guarda a mesma chave em `dispositivos_segredos/{MAC}` (campos `chave_wifi` = Base64 de 32 bytes, `atualizada_em` = string ISO). Coleção **somente do servidor**. **Nunca devolva a chave ao front** nem a registre em log.
- Ao desvincular um aparelho (`DELETE`), **não apague** `dispositivos_segredos/{MAC}`: o aparelho continua com a chave. Quem parear depois reaproveita a chave existente.

**Formato do documento** (`dispositivos/{MAC}`):
- `wifi_versao` (int): incremente (`firestore.Increment(1)`; se o campo não existir, grave `1`) a cada alteração da lista.
- `wifi_redes` (array de map, na ordem de prioridade; máximo **4**): cada item tem `ssid` (string, 1–32 bytes UTF-8) e `senha_cifrada` (string).
- `senha_cifrada` = **Base64 padrão de `IV(12 bytes) + texto_cifrado + TAG(16 bytes)`**, AES-256-GCM, **sem AAD**, IV aleatório novo a cada cifragem. Em Python (`cryptography`): `nonce = os.urandom(12)`; `ct = AESGCM(chave).encrypt(nonce, senha.encode(), None)` (já devolve texto+tag); `senha_cifrada = base64.b64encode(nonce + ct).decode()`. Senha vazia (rede aberta) = `senha_cifrada` como string vazia. Senha WPA: 8 a 63 caracteres.
- Lista vazia ou ausente = o aparelho **não mexe** nas redes dele.

**Comportamento do aparelho (para a UI refletir):**
- Ele lê o documento a cada 30 s. Se `wifi_versao` for diferente da que ele aplicou, decifra **todas** as senhas. Se **qualquer uma falhar**, descarta a lista inteira, mantém a atual e reporta `wifi_status = "erro_decifrar"` (e não marca a versão como aplicada).
- Se der certo, grava `wifi_status = "ok"` e `wifi_versao_aplicada = wifi_versao` na telemetria, em até ~30 s (mais o envio imediato). A UI deve mostrar "aplicado" **só** quando `wifi_versao_aplicada == wifi_versao`.
- A rede **em uso nunca é apagada**: se o site a remover da lista, ela fica como reserva no fim até o aparelho conectar em outra rede da lista.
- A mudança de principal **não derruba a conexão atual**: vale na próxima vez que o aparelho precisar conectar (queda de rede ou reinício). Avise isso na UI.
- `wifi_status = "sem_chave"`: o aparelho não tem chave (Wi-Fi configurado por Bluetooth sem chave). Ele ignora `wifi_redes` até ser reconfigurado por Bluetooth com chave.
- Reconfigurar o Wi-Fi **por Bluetooth substitui toda a lista** do aparelho por uma única rede (a principal) e zera `wifi_versao_aplicada` para `-1`.

## 3. API: o que implementar

Adapte os nomes de rota ao padrão que já existe no projeto. Todas as rotas de usuário usam o `uid` do **token validado no servidor**, nunca de parâmetros do cliente.

### 3.1 Pareamento por código

`POST /dispositivos/parear` com `{ "codigo": "482913", "nome": "opcional", "chave_wifi": "<base64 32 bytes, opcional>" }`:
1. Valide o formato (6 dígitos). Aplique **limite de tentativas por usuário** (ex.: 5 erros em 10 min → 429).
2. Leia `pareamentos/{codigo}`. Se não existir, ou se `agora - create_time > 10 min`: responda 404 genérico ("código inválido ou expirado"), sem distinguir os casos.
3. Normalize o `mac` (maiúsculas, dois-pontos, 17 caracteres). Se `dispositivos/{mac}` **já existir**: 409 ("aparelho já vinculado"). Nunca transfira um aparelho vinculado a outra conta por esta rota.
3b. Se o corpo trouxer `chave_wifi` (Base64 de **exatamente 32 bytes**, valide), grave/atualize `dispositivos_segredos/{mac}`. Aceite a chave **somente nesta rota** (o código do visor prova que a pessoa está com o aparelho). Se não vier chave e já existir uma guardada, reaproveite; se não houver nenhuma, o Wi-Fi remoto fica indisponível (`wifi_remoto: false`).
4. Em transação/batch: crie `dispositivos/{mac}` com `owner_uid = uid do token`, `config_versao = 1`, `modo = "casa"`, `volume = 70`, `nome`, `criado_em`; apague `pareamentos/{codigo}`; crie a notificação de pareamento.
5. Responda com o aparelho criado. Diga ao front que o aparelho confirma o vínculo em até ~30 s.

### 3.2 Gerenciar dispositivos

- `GET /dispositivos`: lista os aparelhos da conta (`owner_uid == uid`) com: `mac`, `nome`, `volume`, `bateria_pct`, `sinal_wifi`, `ip`, `firmware`, `ssid`, `ultima_sincronizacao`, `wifi_status`, `wifi_versao_aplicada` e um campo calculado **`online`** (ver 2.1, 10 min).
- `PATCH /dispositivos/{mac}`: altera `nome` e `volume` (int 0–100); aceite `modo` só por compatibilidade. Verifique o dono. Se o MAC for de outra conta, responda **404**.
- `DELETE /dispositivos/{mac}`: verifique o dono e apague o documento. O aparelho detecta em ≤ 30 s, esquece o vínculo, descarta o log local e volta a mostrar um novo código. Não é preciso invalidar token algum.
- Limpeza de `pareamentos` com `create_time` > 15 min (no startup e a cada chamada de `/parear`, ou por job periódico).
- `brilho` e `tempo de inatividade` (RF16): o firmware **não implementa**. Não grave nem exponha esses campos como se funcionassem.

### 3.3 Prancha, mídias e versão

- Implemente a **publicação** da prancha no formato 2.3/2.4 e o bump de versão de 2.6.
- Conversão de imagem (240×240 JPEG baseline) e de áudio (MP3/WAV), geração de imagem padrão (2.5), SHA-256 e divisão em blocos Base64 (2.4).
- Valide os limites de 3 categorias e 5 botões e o tamanho do áudio (500 KB).
- Ao excluir categoria/botão/mídia: remova os documentos correspondentes (`midias`, `arquivos_midia` e `blocos`) e incremente a versão.

### 3.4 Histórico, desempenho e notificações

- Reaponte rankings, gráfico por período, busca e PDF para a coleção `acionamentos` e os campos de 2.7.
- Permita filtrar por `dispositivo`.
- Listagem de notificações: use `criada_em` ou o `create_time` como fallback.

### 3.5 Exclusão de conta (LGPD)

Ordem: apagar os `dispositivos` com `owner_uid == uid` → apagar `arquivos_midia` referenciados (e blocos) → apagar recursivamente `usuarios/{uid}` → apagar o usuário no Firebase Auth. Os aparelhos voltam sozinhos ao estado "sem dono".

### 3.6 Remoções

Remova (ou deixe 410) as rotas de dispositivo baseadas em `X-Device-Token`, o hash de token no `dispositivos` e a lógica de "MAC já pareado recusa novo token". Atualize os testes.

### 3.7 Wi-Fi do aparelho (várias redes)

Todas verificam o dono (MAC de outra conta = 404) e **nunca** devolvem senha, texto cifrado nem chave.

- `GET /dispositivos/{mac}/wifi` → `{ redes: [{ ssid, principal: bool }], wifi_versao, aplicada: bool, status, ssid_atual, remoto_disponivel: bool }`. `aplicada = (wifi_versao_aplicada == wifi_versao)`. `status` vem de `wifi_status`. `remoto_disponivel` = existe chave em `dispositivos_segredos/{mac}`. `ssid_atual` = campo `ssid` da telemetria.
- `PUT /dispositivos/{mac}/wifi` com `{ redes: [{ ssid, senha? }, ...] }` na ordem de prioridade (a primeira é a principal):
  1. Valide: 1 a 4 redes, SSID sem repetição (1–32 bytes), senha 8–63 caracteres ou vazia (rede aberta, só se `aberta: true` no item).
  2. Se `senha` for omitida e o SSID **já existir** na lista atual, reaproveite o `senha_cifrada` dele. SSID novo sem senha = 422.
  3. Sem chave guardada: **409** ("reconfigure o Wi-Fi pelo Bluetooth para habilitar a edição remota").
  4. Cifre cada senha nova (formato da 2.11) e grave `wifi_redes` e `wifi_versao` (Increment) com `update()`, **sem tocar na telemetria**.
  5. Não registre senhas em log nem em mensagens de erro.
- `PUT /dispositivos/{mac}/wifi/chave` com `{ chave_wifi }` (Base64 de 32 bytes): usada **depois** que o front reenviou o Wi-Fi por Bluetooth com chave nova num aparelho já vinculado. Substitui a chave em `dispositivos_segredos/{mac}`, grava `wifi_redes = []` e incrementa `wifi_versao` (a lista antiga foi cifrada com a chave velha e o aparelho também a descartou). A API não guarda senhas em texto puro, então as redes reservas precisam ser cadastradas de novo na UI.

## 4. Front (Next.js + Tailwind, seguindo o design system do projeto)

Todas as chamadas vão para a API (o front não acessa o Firestore).

### 4.1 Modal "Adicionar dispositivo" (assistente em 3 passos)

1. **Colocar o aparelho em modo de configuração.** Texto: "Ligue o aparelho segurando os 3 botões de categoria (os 3 primeiros) por 2 segundos. A tela de status mostrará 'MODO CONFIGURAÇÃO'." O aparelho novo (sem Wi-Fi nem conteúdo) já entra em modo de configuração sozinho.
2. **Enviar o Wi-Fi por Bluetooth (Web Bluetooth).**
   - Campos: nome da rede (SSID) e senha. Avisar: **somente redes de 2,4 GHz**.
   - `navigator.bluetooth.requestDevice({ filters: [{ namePrefix: "CASA-" }], optionalServices: ["4fafc201-1fb5-459e-8fcc-c5c9c331914b"] })`.
   - Conectar, obter o serviço `4fafc201-1fb5-459e-8fcc-c5c9c331914b` e a característica `beb5483e-36e1-4688-b7f5-ea07361b26a8` (escrita).
   - Gerar a chave: `crypto.getRandomValues(new Uint8Array(32))` e converter para Base64. Guardar **só em memória** (estado do assistente), nunca em localStorage nem em URL.
   - Escrever o JSON `{"ssid":"...","pass":"...","key":"<base64 da chave>"}` em **pedaços de até 180 bytes** (`writeValueWithResponse`), em ordem. O aparelho junta os pedaços até o JSON fechar. Tamanho total máximo: 1024 bytes.
   - **Não envie `uid` nem `token`**: o aparelho ignora. O dono é definido pelo código (passo 3). O campo `key` é obrigatório neste fluxo (sem ele o Wi-Fi remoto fica indisponível).
   - Após o último pedaço o aparelho salva e reinicia sozinho; a desconexão BLE é esperada (não é erro).
   - Web Bluetooth só funciona em Chrome/Edge (desktop e Android) sobre HTTPS (ou localhost). Em outros navegadores, mostre uma mensagem clara e aponte para o app Android.
3. **Digitar o código.** Texto: "Quando o aparelho conectar ao Wi-Fi, o visor mostrará 'Código de pareamento' com 6 dígitos. Digite aqui." Campo de 6 dígitos (numérico, com `inputmode="numeric"`), apelido opcional, botão "Vincular" → `POST /dispositivos/parear` (inclua `chave_wifi` com a chave gerada no passo 2).
   - Erros: código inválido/expirado (orientar a ler o código atual, que muda a cada 9 min), aparelho já vinculado, muitas tentativas.
   - Sucesso: "Aparelho vinculado! Ele vai sincronizar a prancha em instantes."

### 4.2 Painel e modais de dispositivo

- Cartão de status: **online/sem comunicação** (pelo campo `online` da API), bateria %, qualidade do Wi-Fi %, IP, firmware, último botão acionado (último `acionamento`).
- Se não houver dispositivo vinculado, mostrar a ação "Adicionar dispositivo" em destaque.
- Detalhes do aparelho: nome (editável), **volume (slider 0–100)** (sem seletor de modo: o aparelho não o exibe mais), botão "Remover aparelho" com confirmação ("o aparelho ficará sem conta e vai pedir um novo código").
- **Não exiba controles de brilho ou tempo de inatividade** (o firmware não os implementa; deixe como "em breve" desabilitado, se quiser).
- Aviso após editar a prancha: "As mudanças chegam ao aparelho em alguns minutos, quando ele estiver conectado ao Wi-Fi."

### 4.3 Categorias e botões

- Impor 3 categorias e 5 botões por categoria na UI.
- **Imagem obrigatória na categoria** e recomendada no botão. Se faltar, avisar que a API vai gerar uma imagem com o texto (2.5), com prévia 240×240 quadrada.
- Upload de áudio **MP3 ou WAV até 500 KB**. Se houver gravação pelo microfone no navegador, enviar e deixar a API converter.
- Reordenar categorias/botões envia `ordem`.

### 4.4 Histórico, desempenho e notificações

- Consumir os campos da seção 2.7 (rankings por `botao_id`, séries por período, PDF). Marcar registros com `tempo_aproximado`.
- Sino de notificações: bateria baixa e pareamento. Marcar como lida.

### 4.5 Gerenciar Wi-Fi do aparelho

Na tela de detalhes do aparelho, seção "Redes Wi-Fi" (usa 3.7):
- Lista **ordenada**: a primeira é a "Principal", as demais "Reserva 1, 2, 3". Reordenar por arrastar ou setas. Máximo 4 redes.
- Ações: **trocar a principal** (editar SSID/senha da primeira), **adicionar reserva**, **remover**, **reordenar**. Senhas **nunca são exibidas**; ao editar uma rede existente, o campo de senha vem vazio e "vazio = manter a atual".
- Botão "Salvar" → `PUT .../wifi`. Depois, mostre o estado pelo `GET .../wifi`, consultando a cada ~10 s por até 2 minutos:
  - `aplicada == false` → "Aguardando o aparelho (até 1 minuto)…".
  - `aplicada == true` e `status == "ok"` → "Aplicado no aparelho".
  - `status == "erro_decifrar"` → "O aparelho não conseguiu ler a lista. Refaça a configuração por Bluetooth" (abre o assistente do passo 2 num aparelho já vinculado; ao terminar, chame `PUT .../wifi/chave`).
  - `remoto_disponivel == false` ou `status == "sem_chave"` → edição desabilitada com o aviso "Para editar o Wi-Fi pelo site, reconfigure o aparelho por Bluetooth uma vez".
- Avisos fixos: "Somente redes de 2,4 GHz"; "A troca da rede principal vale na próxima vez que o aparelho precisar conectar (queda de rede ou reinício)"; "Mantenha ao menos uma rede que funcione: se nenhuma funcionar, só o Bluetooth recupera o aparelho".
- Mostre também a rede em uso (`ssid_atual`).

## 5. Testes e critérios de aceite

Escreva testes automatizados da API que **simulem o aparelho por REST**, usando um token anônimo do Firebase (signUp anônimo) ou o emulador do Firestore:

1. Aparelho cria `pareamentos/{codigo}` com `?currentDocument.exists=false`; um segundo create no mesmo código falha.
2. `POST /dispositivos/parear` com código válido cria `dispositivos/{mac}` com o dono certo e apaga o pareamento. Código inválido ou expirado = 404. Código repetido = 404. MAC já vinculado = 409. Excesso de tentativas = 429.
3. Isolamento: o usuário B não enxerga, altera nem apaga o aparelho do usuário A (404).
4. Aparelho lê `dispositivos/{MAC}` e vê `owner_uid`, `config_versao`, `modo`, `volume`.
5. Publicar prancha: `categorias` no formato 2.3, mídias em blocos que recompõem o arquivo com o SHA-256 igual (teste de integridade), imagem JPEG baseline 240×240, áudio MP3/WAV, imagem padrão gerada quando faltar.
6. Qualquer mudança de prancha incrementa `config_versao` em **todos** os aparelhos da conta; mudar só `volume`/`modo` não incrementa.
7. Trocar uma mídia gera um `midiaId` novo.
8. Aparelho grava telemetria com PATCH + `updateMask` e **a API não a sobrescreve** ao atualizar `nome`/`modo`/`volume`.
9. Aparelho grava acionamentos em lote (`documents:commit`); reenviar o mesmo lote não duplica; histórico e ranking agrupam por `botao_id`.
10. `DELETE /dispositivos/{mac}` apaga o documento; exclusão de conta executa a ordem de 3.5.
11. `online` fica `false` quando `ultima_sincronizacao` tem mais de 10 minutos.

12. Cifra: uma senha cifrada pela API (formato da 2.11) decifra com a mesma chave e o mesmo IV; chave errada ou byte alterado falha na verificação da TAG.
13. `PUT /dispositivos/{mac}/wifi`: grava `wifi_redes` na ordem recebida, incrementa `wifi_versao`, **não** grava senha em texto puro (varra o documento), não altera a telemetria; SSID repetido/inválido = 422; sem chave = 409; MAC de outra conta = 404; reaproveita o texto cifrado quando a senha é omitida.
14. `GET /dispositivos/{mac}/wifi` nunca devolve senha, texto cifrado nem chave; `aplicada` só é `true` quando `wifi_versao_aplicada == wifi_versao`.
15. `PUT .../wifi/chave` troca a chave, zera `wifi_redes` e incrementa `wifi_versao`; `dispositivos_segredos` não é acessível por um token anônimo do Firebase (esperado: permissão negada).
16. `POST /dispositivos/parear` com `chave_wifi` inválida (não é Base64 de 32 bytes) = 422; com chave válida grava `dispositivos_segredos/{mac}`.

**Teste manual de ponta a ponta com o aparelho real** (deixe o roteiro escrito no README):
1. Aparelho virgem liga → OLED "MODO CONFIGURAÇÃO" → Web Bluetooth envia Wi-Fi → reinicia → OLED mostra o código de 6 dígitos.
2. Digitar o código no site → aparelho vibra e sai da tela do código em ≤ 30 s → painel mostra online em ≤ 1 min.
3. Criar categoria com imagem + áudio → em alguns minutos as telas TFT e o áudio refletem a mudança.
4. Apertar botões → acionamentos aparecem no histórico em ≤ 2 min.
5. Wi-Fi: cadastrar uma reserva pelo site → status passa a "Aplicado". Cadastrar como principal uma rede com senha errada, manter a boa como reserva, reiniciar o aparelho → OLED mostra "Sem conexao" por até ~15 s e depois "Rede: ONLINE" na reserva. Desligar a rede em uso → ele tenta a próxima e volta pela principal quando ela existir.
6. OLED em uso: linha 1 categoria, linha 2 bateria, linha 3 rede (sem "modo").
7. Remover o aparelho no site → em ≤ 30 s ele mostra um novo código; parear com **outra conta** e confirmar que a prancha da conta antiga sumiu e a nova foi baixada.

## 6. Documentação (TCC)

Atualize os trechos que dizem que o ESP32 usa API + `X-Device-Token` (seções 3.3.3, 3.4.1, 3.4.3, 3.4.4 e 5.4) para a arquitetura **ESP32 ↔ Firestore ↔ API**, com login anônimo e regras do Firestore. Registre como **limitações do protótipo**: (a) as regras não sabem quem é o dono, então um aparelho anônimo que souber o `uid` consegue ler os dados daquela conta; (b) quem conhecer o MAC de um aparelho não pareado e criar um pareamento falso poderia reivindicá-lo; (c) TLS sem validação de certificado no firmware; (d) o Bluetooth do aparelho não tem criptografia própria: quem estiver ao alcance durante o modo de configuração pode capturar a chave do Wi-Fi remoto (e o próprio Wi-Fi). Em produção, usar pareamento/bonding BLE seguro. Caminho para produção: backend emitindo custom token com claim do dono e regras comparando essa claim com o `{uid}`.

## 7. Entrega

Ao terminar, me devolva: (1) lista de arquivos alterados/criados; (2) diferenças entre o esquema anterior e o contrato; (3) rotas novas/removidas; (4) passos manuais pendentes (publicar regras, habilitar Anonymous, variáveis de ambiente, instalar ffmpeg/Pillow); (5) resultado dos testes; (6) decisões que você tomou onde este documento não cobria.
