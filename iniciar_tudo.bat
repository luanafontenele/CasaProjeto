@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

title C.A.S.A. - Setup e Inicializador Completo
set "SCRIPT_DIR=%~dp0"
if exist "%SCRIPT_DIR%..\CASA-API" (
    cd /d "%SCRIPT_DIR%.."
    set "BASE_DIR=%CD%\"
) else (
    cd /d "%SCRIPT_DIR%"
    set "BASE_DIR=%SCRIPT_DIR%"
)

echo ==========================================================
echo        PROJETO C.A.S.A. - SETUP E INICIALIZADOR
echo ==========================================================
echo.

:: 1. Verificação de pré-requisitos essenciais
echo [1/5] Verificando ferramentas instaladas...
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Git nao encontrado! Instale o Git e tente novamente: https://git-scm.com/
    pause
    exit /b 1
)

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Python nao encontrado! Instale o Python (versao 3.11+) e marque "Add to PATH": https://python.org/
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js / npm nao encontrado! Instale o Node.js: https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Git, Python e Node.js detectados com sucesso.
echo.

:: 2. Download / Atualização dos Repositórios
echo [2/5] Verificando repositorios Git...

:: Repositório da API (Backend)
if not exist "%BASE_DIR%CASA-API\.git" (
    echo -> Clonando repositorio da API (CASA-API)...
    git clone https://github.com/Projeto-C-A-S-A/CASA-API.git "%BASE_DIR%CASA-API"
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao clonar o repositorio da API.
        pause
        exit /b 1
    )
) else (
    echo -> Atualizando CASA-API com git pull...
    cd /d "%BASE_DIR%CASA-API"
    git pull
    cd /d "%BASE_DIR%"
)

:: Repositório do Frontend (ProjetoCasa)
if not exist "%BASE_DIR%ProjetoCasa\.git" (
    echo -> Clonando repositorio do Frontend (ProjetoCasa)...
    git clone https://github.com/luanafontenele/ProjetoCasa "%BASE_DIR%ProjetoCasa"
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao clonar o repositorio do Frontend.
        pause
        exit /b 1
    )
) else (
    echo -> Atualizando ProjetoCasa com git pull...
    cd /d "%BASE_DIR%ProjetoCasa"
    git pull
    cd /d "%BASE_DIR%"
)
echo.

:: 3. Configuração do Backend (Python, venv, dependências e .env)
echo [3/5] Configurando Backend (API FastAPI)...
cd /d "%BASE_DIR%CASA-API\backend"

if not exist "venv" (
    echo -> Criando ambiente virtual Python (venv)...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao criar venv.
        pause
        exit /b 1
    )
)

echo -> Instalando dependencias do backend...
call .\venv\Scripts\activate
python -m pip install --upgrade pip >nul 2>nul
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [AVISO] Falha ou aviso ao instalar dependencias do backend.
)

:: Criação do .env do backend caso não exista
if not exist ".env" (
    echo -> Criando arquivo .env padrao para o backend...
    (
        echo CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
        echo UPLOAD_DIR=./uploads
        echo DEVICE_OFFLINE_MINUTOS=10
        echo MAX_CATEGORIAS=3
        echo MAX_BOTOES_POR_CATEGORIA=5
        echo TIMEZONE=America/Sao_Paulo
    ) > .env
    echo [OK] .env do backend criado com sucesso.
) else (
    echo [OK] .env do backend ja existe.
)

:: Verificação do arquivo de credenciais do Firebase
if exist "%BASE_DIR%firebase-credentials.json" (
    if not exist "%BASE_DIR%CASA-API\backend\firebase-credentials.json" (
        echo -> Copiando firebase-credentials.json da raiz para o backend...
        copy "%BASE_DIR%firebase-credentials.json" "%BASE_DIR%CASA-API\backend\firebase-credentials.json" >nul
    )
)

if not exist "firebase-credentials.json" (
    echo.
    echo [ATENCAO] O arquivo 'firebase-credentials.json' nao foi encontrado em:
    echo           %BASE_DIR%CASA-API\backend\firebase-credentials.json
    echo           Lembre-se de colocar a chave privada do Firebase Admin nele.
    echo.
) else (
    echo [OK] firebase-credentials.json detectado no backend.
)
cd /d "%BASE_DIR%"
echo.

:: 4. Configuração do Frontend (Node, npm install e .env.local)
echo [4/5] Configurando Frontend (Next.js)...
cd /d "%BASE_DIR%ProjetoCasa\frontend"

:: Copia .env.local se estiver junto do .bat
if exist "%BASE_DIR%.env.local" (
    if not exist "%BASE_DIR%ProjetoCasa\frontend\.env.local" (
        echo -> Copiando .env.local da raiz para o frontend...
        copy "%BASE_DIR%.env.local" "%BASE_DIR%ProjetoCasa\frontend\.env.local" >nul
    )
)

:: Criação do .env.local caso não exista
if not exist ".env.local" (
    echo -> Criando arquivo .env.local de exemplo para o frontend...
    (
        echo NEXT_PUBLIC_API_URL=http://localhost:8000
        echo NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key_aqui
        echo NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=projeto-casa-f4a05.firebaseapp.com
        echo NEXT_PUBLIC_FIREBASE_PROJECT_ID=projeto-casa-f4a05
        echo NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=projeto-casa-f4a05.appspot.com
        echo NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id_aqui
        echo NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id_aqui
    ) > .env.local
    echo [OK] .env.local criado. Complete com as chaves publicas do Firebase se necessario.
) else (
    echo [OK] .env.local do frontend ja existe.
)

echo -> Instalando pacotes npm do frontend (pode levar alguns instantes)...
call npm install
if %errorlevel% neq 0 (
    echo [AVISO] Falha ou aviso ao executar npm install.
)
cd /d "%BASE_DIR%"
echo.

:: 5. Execução de Ambos os Serviços em Janelas Separadas
echo [5/5] Iniciando os servidores...
echo.
echo ==========================================================
echo  1. Backend FastAPI: http://localhost:8000
echo  2. Frontend Next.js: http://localhost:3000
echo ==========================================================
echo.

:: Inicia o Backend em uma nova janela CMD
start "CASA API - Backend (Porta 8000)" cmd /k "cd /d "%BASE_DIR%CASA-API\backend" && call .\venv\Scripts\activate && uvicorn main:app --reload --port 8000"

:: Inicia o Frontend em uma nova janela CMD
start "CASA Frontend - Next.js (Porta 3000)" cmd /k "cd /d "%BASE_DIR%ProjetoCasa\frontend" && npm run dev"

:: Aguarda 3 segundos e abre o navegador
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo Servidores iniciados! As janelas continuarao em execucao.
echo Pressione qualquer tecla para fechar esta janela auxiliar.
pause >nul
