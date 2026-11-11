# Projeto C.A.S.A. — Frontend Web (Next.js)

Interface Web do **Projeto C.A.S.A.** desenvolvida em **Next.js (App Router)** e **Tailwind CSS**, integrada à **CASA-API (FastAPI)** e ao **Firebase Authentication**.

---

## 1. Estrutura de Pastas (Repositórios Lado a Lado)

Os repositórios devem permanecer lado a lado dentro da pasta raiz:

```text
CASA/
├── CASA-API/        # Backend compartilhado (FastAPI — porta 8000)
├── ProjetoCasa/     # Frontend Web Next.js (porta 3000)
└── FRONT-MOBILE/    # App Mobile Android (Kotlin)
```

---

## 2. Inicialização Rápida

### Backend (`CASA-API`)
```powershell
cd CASA-API/backend
.\venv\Scripts\activate
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend (`ProjetoCasa`)
```powershell
cd ProjetoCasa/frontend
npm install
npm run dev
```

Acesse no navegador: **`http://localhost:3000`**

---

## 3. Principais Recursos Implementados (Firmware v7)

- **Assistente de Pareamento em 3 Passos:**
  1. Orienta colocar o aparelho em `MODO CONFIGURAÇÃO` (segurar os 3 botões de categoria por 2 s).
  2. Envio de Wi-Fi via **Web Bluetooth (BLE)** com geração no navegador de chave de criptografia **AES-256 (32 bytes)** enviada junto com o payload `{"ssid","pass","key"}` em chunks de até 180 bytes.
  3. Digitação do código de 6 dígitos exibido no OLED do aparelho, vinculando a conta e enviando a chave de segurança ao servidor.
- **Gerenciamento Remoto de Múltiplas Redes Wi-Fi:**
  - Cadastro de até 4 redes (1 principal + até 3 reservas).
  - Cifragem das senhas no servidor com AES-256-GCM antes de salvar no Firestore.
  - Reordenação (alterar qual rede é a principal) e monitoramento do status (`Aplicado no aparelho`, `Aguardando`, `Erro ao decifrar`).
- **Displays TFT e Prancha:**
  - Geração automática de imagem sólida JPEG 240x240 para botões e categorias sem imagem, evitando telas pretas nos displays ST7789.
  - Incremento atômico de versão (`config_versao`) a cada alteração da prancha.
- **Métricas e Histórico:**
  - Agrupamento de cliques por `botao_id` com indicação de registros de horário aproximado.

---

## 4. Testes do Frontend

Verificação estática e build de produção:

```powershell
cd ProjetoCasa/frontend
npx tsc --noEmit
npm run build
```
