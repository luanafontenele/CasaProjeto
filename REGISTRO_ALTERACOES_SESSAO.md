# Registro de Alterações - Sessão de Desenvolvimento C.A.S.A.

**Data:** 14/11/2026 - 15/11/2026  
**Repositórios Envolvidos:**
- Mobile: [FRONT-MOBILE](file:///E:/CASA/FRONT-MOBILE)
- Backend / Regras: [CASA-API](file:///E:/CASA/CASA-API)
- Firmware: [casa_firmware_v11.ino](file:///E:/CASA/casa_firmware_v11/casa_firmware_v11.ino)
- Dispositivo Físico de Testes: Android Smartphone (`RQCW403S3QB`)

---

## 1. Ajustes de Layout e Navegação

### 1.1 Inversão da Sidebar (Drawer) para o Lado Direito
- **Objetivo:** Mover o menu lateral para o lado direito da interface e diferenciar o ícone da aba "Dispositivo" do ícone de menu hamburguer.
- **Arquivos modificados:**
  - [activity_base_drawer.xml](file:///E:/CASA/FRONT-MOBILE/app/src/main/res/layout/activity_base_drawer.xml): `android:layout_gravity="end"` no `NavigationView`.
  - [BaseDrawerActivity.kt](file:///E:/CASA/FRONT-MOBILE/app/src/main/java/fatec/labweb/projetocasa/view/BaseDrawerActivity.kt): Atualização das ações de abertura/fechamento com `GravityCompat.END`.
  - [menu_bottom_navigation.xml](file:///E:/CASA/FRONT-MOBILE/app/src/main/res/menu/menu_bottom_navigation.xml): Ícone do menu "Dispositivo" atualizado para um ícone dedicado de hardware/microcontrolador, eliminando conflito com o menu sanduíche.
- **Commit:** `713d0aa`

---

## 2. Refatoração do Modal de Conexão com ESP32 (Firmware v11)

### 2.1 Novo Fluxo de Onboarding Híbrido (BLE + Wi-Fi + Firestore)
- **Problema anterior:** Pareamento exigia redigitação manual do código após o reinício do hardware ou ficava preso sem sincronizar.
- **Solução implementada em 3 etapas integradas:**
  1. **Etapa 1 (Varredura Bluetooth):**
     - O app verifica os aparelhos Bluetooth pareados no sistema Android e inicia varredura BLE contínua filtrando por nomes iniciados em `"CASA"`.
     - Exibe lista com RSSI e endereço MAC em tempo real.
  2. **Etapa 2 (Envio de Credenciais BLE):**
     - Leitura das características GATT: Serviço `...26a0`, Configuração `...26a8` e Status `...26a7`.
     - Coleta do SSID, Senha e PIN do visor OLED (6 dígitos).
     - Formatação rigorosa exigida pelo Firmware v11: `{"pin":"123456","ssid":"SSID","pass":"SENHA","key":"CHAVE_AES_32B"}` (PIN enviado explicitamente como string com aspas para preservar zeros à esquerda).
  3. **Etapa 3 (Reinício, Conexão e Auto-Vínculo):**
     - O ESP32 reinicia em modo Wi-Fi e publica `pareamentos/{pin}` no Firestore contendo seu MAC.
     - O app monitora a criação desse documento em tempo real, associa a conta do usuário (`owner_uid`) em `dispositivos/{mac}`, remove o documento temporário de pareamento e conclui a configuração sem que o usuário precise redigitar nada.
- **Arquivos:**
  - [Esp32BleManager.kt](file:///E:/CASA/FRONT-MOBILE/app/src/main/java/fatec/labweb/projetocasa/service/Esp32BleManager.kt)
  - [dialog_parear_dispositivo.xml](file:///E:/CASA/FRONT-MOBILE/app/src/main/res/layout/dialog_parear_dispositivo.xml)
  - [HomeActivity.kt](file:///E:/CASA/FRONT-MOBILE/app/src/main/java/fatec/labweb/projetocasa/view/HomeActivity.kt)
- **Commit:** `a74055c`

---

## 3. Correções de Segurança e Erros de Permissão no Firestore

### 3.1 `PERMISSION_DENIED: Missing or insufficient permissions`
- **Causa:** O arquivo `backend/firestore.rules` continha apenas regras de autenticação anônima (`aparelho()`) voltadas ao microcontrolador ESP32. O app mobile roda sob sessão autenticada (`usuarioLogado()`), resultando em bloqueio de acesso ao ler ou criar documentos.
- **Solução:**
  - Atualizadas as regras de segurança no Firestore: permissão irrestrita de leitura/escrita para usuários autenticados nas coleções `usuarios/{uid}`, `dispositivos/{mac}` e `pareamentos/{codigo}` (leitura e deleção pós-pareamento).
- **Arquivo:** [backend/firestore.rules](file:///E:/CASA/CASA-API/backend/firestore.rules)
- **Commit (CASA-API):** `2831d61`

### 3.2 `NOT_FOUND: No document to update: .../usuarios/{uid}`
- **Causa:** Durante a finalização do vínculo, o app chamava `.update("dispositivosVinculados", ...)` no Firestore. Em contas recém-criadas onde o documento do usuário ainda não havia sido instanciado, o Firestore rejeitava a chamada com erro `NOT_FOUND`.
- **Solução:**
  - Substituído por `.set(mapOf("dispositivosVinculados" to FieldValue.arrayUnion(mac)), SetOptions.merge())`, garantindo a criação automática do documento caso inexistente.
- **Arquivo:** [DispositivoService.kt](file:///E:/CASA/FRONT-MOBILE/app/src/main/java/fatec/labweb/projetocasa/service/DispositivoService.kt)
- **Commit:** `c78b173`

---

## 4. Regras de Acesso à Aba Dispositivo e Controle do Modo Desenvolvedor

### 4.1 Bloqueio de Entrada sem Aparelho Pareado
- **Requisito:** Se o usuário não tiver dispositivo conectado, o acesso à tela Dispositivo (prancha de comunicação) deve ser travado, oferecendo opção para ir para o Início ou entrar em modo desenvolvedor.
- **Implementação:**
  - Criado container de bloqueio (`containerAcessoBloqueado`) em [activity_categoria_item.xml](file:///E:/CASA/FRONT-MOBILE/app/src/main/res/layout/activity_categoria_item.xml).
  - Exibe ícone de alerta e mensagem *"Acesso Bloqueado: Primeiro conecte o dispositivo em Início"*.
  - Botão *"Ir para Início"* direciona para a tela inicial.
  - Botão *"Entrar em modo desenvolvedor?"* destrava o acesso para a sessão ativa.

### 4.2 Ocultação Automática do Modo Desenvolvedor com Dispositivo Pareado
- **Requisito:** O card do Modo Desenvolvedor deve desaparecer completamente se houver um dispositivo conectado.
- **Implementação em [CategoriaGeralActivity.kt](file:///E:/CASA/FRONT-MOBILE/app/src/main/java/fatec/labweb/projetocasa/view/CategoriaGeralActivity.kt):**
  - `temDispositivo == true`: Oculta `cardModoDevGeral` (`View.GONE`) e libera o acesso à prancha.
  - `temDispositivo == false` (sem bypass dev): Trava tela com `containerAcessoBloqueado` visível.
  - `temDispositivo == false` (com bypass dev ativado): Libera a prancha e exibe `cardModoDevGeral`.
- **Commit:** `3e79871`

---

## 5. Verificação Dinâmica de Status Online/Offline (TTL de 12 Minutos)

### 5.1 Validação Real-Time por Timestamp
- **Problema anterior:** O aplicativo lia o campo booleano estático `statusOnline` / `ativo`. Uma vez gravado como `true` durante o pareamento, o dispositivo nunca mudava para Offline no app mesmo estando desligado.
- **Solução implementada em [DadosDispositivo.kt](file:///E:/CASA/FRONT-MOBILE/app/src/main/java/fatec/labweb/projetocasa/model/DadosDispositivo.kt):**
  - Implementada a propriedade calculada `val isOnline: Boolean`.
  - Faz o parse do timestamp UTC (`"%Y-%m-%dT%H:%M:%SZ"`, ISO-8601 ou epoch em milissegundos) gerado periodicamente pela telemetria do ESP32 (`ultima_sincronizacao`).
  - Aplica janela de tolerância de **12 minutos** (`diffMs in -120_000L..(12 * 60 * 1000L)`).
  - Se a telemetria não for recebida em 12 minutos ou o campo estiver vazio, o status é alterado automaticamente para **Offline**.
  - Atualizadas as telas [HomeActivity.kt](file:///E:/CASA/FRONT-MOBILE/app/src/main/java/fatec/labweb/projetocasa/view/HomeActivity.kt) e [NotificacoesActivity.kt](file:///E:/CASA/FRONT-MOBILE/app/src/main/java/fatec/labweb/projetocasa/view/NotificacoesActivity.kt) para refletir o status em tempo real.
- **Commit:** `a0ed34a`

---

## 6. Suporte e Gerenciamento de Múltiplas Redes Wi-Fi (Firmware v11)

### 6.1 Arquitetura de Múltiplas Redes do ESP32
- A placa armazena até **5 redes** em memória NVS:
  - **Rede 1 (Principal):** Configurada via BLE no onboarding inicial.
  - **Redes 2 a 5 (Reservas de Contingência):** Cifradas com AES-256-GCM e sincronizadas via Firestore em `dispositivos/{mac}.wifi_redes` e `wifi_versao`.
- Comportamento no firmware: Se a rede principal falhar por 15 segundos, o ESP32 tenta automaticamente as reservas em ordem sequencial sem esperar. Se todas falharem, entra em backoff exponencial (30s, 60s, 120s até 5 min) e recomeça pela principal.

### 6.2 Criptografia AES-256-GCM
- **Arquivo:** [WifiCryptoHelper.kt](file:///E:/CASA/FRONT-MOBILE/app/src/main/java/fatec/labweb/projetocasa/util/WifiCryptoHelper.kt)
  - `gerarChaveAes256()`: Gera 32 bytes criptograficamente seguros em Base64.
  - `cifrarSenhaWifi(senha, chaveB64)`: Formato estrito exigido pelo `mbedtls` do ESP32: `Base64( IV[12] + Ciphertext + TAG[16] )`, sem AAD.
  - Suporte a rede aberta (senha vazia retorna string vazia).
- **Testes Unitários:** [WifiCryptoHelperTest.kt](file:///E:/CASA/FRONT-MOBILE/app/src/test/java/fatec/labweb/projetocasa/util/WifiCryptoHelperTest.kt) cobrindo geração, cifragem, decifragem e chaves inválidas.

### 6.3 Gestão no Modal de Pareamento Inicial
- **Arquivo:** [dialog_parear_dispositivo.xml](file:///E:/CASA/FRONT-MOBILE/app/src/main/res/layout/dialog_parear_dispositivo.xml) e [HomeActivity.kt](file:///E:/CASA/FRONT-MOBILE/app/src/main/java/fatec/labweb/projetocasa/view/HomeActivity.kt)
  - Seção retrátil *"Redes Reservas (Opcional)"* na Etapa 2.
  - Permite adicionar dinamicamente até 4 redes secundárias via mini-formulário [dialog_form_adicionar_wifi_rapido.xml](file:///E:/CASA/FRONT-MOBILE/app/src/main/res/layout/dialog_form_adicionar_wifi_rapido.xml).
  - O app gera a chave AES de 32 bytes, envia o campo `"key"` no JSON BLE para a NVS do ESP32, cifra as redes reservas e as salva em `wifi_redes` com `wifi_versao = 1`.

### 6.4 Gestão na Aba Dispositivo e Modal Dedicado
- **Arquivo:** [activity_categoria_item.xml](file:///E:/CASA/FRONT-MOBILE/app/src/main/res/layout/activity_categoria_item.xml) e [CategoriaGeralActivity.kt](file:///E:/CASA/FRONT-MOBILE/app/src/main/java/fatec/labweb/projetocasa/view/CategoriaGeralActivity.kt)
  - Card *"Redes Wi-Fi do Aparelho"* com botão *"Configurar"*, visível quando o usuário tem dispositivo pareado.
- **Arquivo:** [dialog_gerenciar_redes_wifi.xml](file:///E:/CASA/FRONT-MOBILE/app/src/main/res/layout/dialog_gerenciar_redes_wifi.xml) e [DialogGerenciarWifi.kt](file:///E:/CASA/FRONT-MOBILE/app/src/main/java/fatec/labweb/projetocasa/view/DialogGerenciarWifi.kt)
  - Exibe a rede em uso no hardware, IP, status da versão Wi-Fi aplicada.
  - Lista as redes reservas cadastradas com ordem de prioridade.
  - Permite adicionar novas redes ou remover redes antigas.
  - Botão *"Salvar e Sincronizar no Hardware"*: cifra as senhas e incrementa `wifi_versao` no Firestore via [DispositivoService.kt](file:///E:/CASA/FRONT-MOBILE/app/src/main/java/fatec/labweb/projetocasa/service/DispositivoService.kt). O ESP32 aplica as alterações automaticamente em até 30 segundos.
  - Também disponibilizado no modal *"Gerenciar Dispositivos"* do Início via [activity_gerenciar_dispositivos.xml](file:///E:/CASA/FRONT-MOBILE/app/src/main/res/layout/activity_gerenciar_dispositivos.xml).
- **Commit:** `cad2db0`

---

## 7. Sumário dos Commits Realizados

| Hash | Repositório | Descrição |
| :--- | :--- | :--- |
| `713d0aa` | `FRONT-MOBILE` | `feat(sidebar): mover drawer para o lado direito e atualizar icone da aba dispositivo` |
| `a74055c` | `FRONT-MOBILE` | `feat(dispositivo): refatoracao do modal de pareamento BLE e wifi com esp32 v11` |
| `2831d61` | `CASA-API` | `fix(firestore): adicionar regras de leitura e escrita para usuarios autenticados no app e pareamento` |
| `223f60a` | `FRONT-MOBILE` | `fix(dispositivo): mensagens claras de erro de seguranca do firestore` |
| `c78b173` | `FRONT-MOBILE` | `fix(dispositivo): usar set com merge ao inves de update no documento do usuario` |
| `3e79871` | `FRONT-MOBILE` | `feat(dispositivo): bloquear tela dispositivo sem conexao e ocultar modo dev com dispositivo pareado` |
| `a0ed34a` | `FRONT-MOBILE` | `feat(dispositivo): calcular status online com base em ultima_sincronizacao no limite de 12 minutos` |
| `cad2db0` | `FRONT-MOBILE` | `feat(wifi): suporte a multiplas redes wifi secundarias com criptografia AES-256-GCM no modal e aba dispositivo` |
| `bdf3303` | `CASA-API` | `feat(dispositivo): alinhar TTL de 12 minutos, redes reservas no pareamento e criacao de vinculo seguro` |
| pendente | `ProjetoCasa` | `feat(web): alinhar pareamento BLE v11/v12 com PIN, gestao wifi na aba dispositivo, status 12m e icone de hardware` |

---

## 8. Verificação e Deploy

- **Testes Unitários:** Todos os testes unitários (`WifiCryptoHelperTest`, `AlinhamentoMobileTest`, `ExampleUnitTest`) passaram no mobile; 30/30 testes passaram no backend `CASA-API`.
- **Compilação Web:** Compilação de produção e tipos TypeScript validados com sucesso no frontend Next.js (`next build`).
- **Instalação Físico:** Realizada instalação direta e automatizada via ADB (`adb install -r`) no smartphone conectado via USB (`RQCW403S3QB`).
- **Repositórios Remotos:** Sincronização e push efetuados para os respectivos repositórios GitHub (`FRONT-MOBILE`, `CASA-API`, `ProjetoCasa`).
