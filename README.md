# Projeto C.A.S.A. — Frontend Web (Next.js)

Interface Web do **Projeto C.A.S.A.** integrada ao Firebase Authentication e à API compartilhada (`CASA-API`).

---

## 1. Estrutura de Pastas (Repositórios Lado a Lado)

Para que o Frontend Web se comunique automaticamente com o Backend, mantenha os repositórios **lado a lado** dentro da mesma pasta raiz:

```text
CASA/
├── CASA-API/        # Backend compartilhado (FastAPI — porta 8000)
├── ProjetoCasa/     # Este repositório (Next.js — porta 3000)
└── FRONT-MOBILE/    # App Mobile Android (Kotlin)
```

---

## 2. Como Baixar e Iniciar a `CASA-API` (Backend)

1. Na pasta raiz (ao lado de `ProjetoCasa`), clone o repositório da API:
   ```bash
   git clone https://github.com/Projeto-C-A-S-A/CASA-API.git
   ```
2. Entre na pasta do backend, crie o ambiente virtual e instale os pacotes:
   ```powershell
   cd CASA-API/backend
   python -m venv venv
   venv\Scripts\activate
   python -m pip install -r requirements.txt
   ```
3. Coloque o arquivo `firebase-credentials.json` do projeto Firebase em `CASA-API/backend/` e copie o `.env`:
   ```powershell
   copy .env.example .env
   ```
4. Suba a API na porta `8000`:
   ```powershell
   python -m uvicorn main:app --reload --port 8000
   ```
   *(Verifique em `http://localhost:8000/saude` se retornou `{"status":"ok"}`).*

---

## 3. Como Configurar e Iniciar o Frontend Web (`ProjetoCasa`)

### Pré-requisitos
- **Node.js 18+** instalado
- A `CASA-API` rodando em `http://localhost:8000`

### Passo a passo
1. Abra um novo terminal e entre na pasta `frontend`:
   ```powershell
   cd ProjetoCasa/frontend
   ```
2. Instale as dependências:
   ```powershell
   npm install
   ```
3. Configure as variáveis de ambiente do Firebase Web em `ProjetoCasa/frontend/.env.local` (caso ainda não exista):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_project_id
   ```
4. Inicie o servidor de desenvolvimento:
   ```powershell
   npm run dev
   ```
5. Acesse no navegador: **`http://localhost:3000`**

> **Dica no Cadastro:** Ao criar uma nova conta em `/cadastro`, se o envio de e-mail SMTP não estiver configurado na `CASA-API`, o **código de 6 dígitos** aparecerá no terminal onde a `CASA-API` está rodando.
