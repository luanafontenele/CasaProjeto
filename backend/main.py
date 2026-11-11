from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

try:
    from .config import settings
    from . import storage
    from .routers import auth, categorias, dispositivos, historico, midias, notificacoes, perfil, tts
except ImportError:
    from config import settings
    import storage
    from routers import auth, categorias, dispositivos, historico, midias, notificacoes, perfil, tts


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Inicialização: assegura que a estrutura física de armazenamento de mídias exista
    storage.garantir_pasta()
    yield


app = FastAPI(
    lifespan=lifespan,
    title="C.A.S.A. API",
    version="2.0.0",
    description="Auth: Firebase Authentication (token Bearer). Dados: Cloud Firestore."
)

# Configuração de CORS para permitir requisições do frontend Web e dispositivos
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ==========================================
# TRATAMENTO CENTRALIZADO DE EXCEÇÕES
# ==========================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Padroniza respostas de erros HTTP da aplicação."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "erro",
            "codigo": exc.status_code,
            "detalhe": exc.detail
        },
        headers=exc.headers
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Formata erros de validação do Pydantic para respostas legíveis."""
    erros_formatados = []
    for erro in exc.errors():
        campo = " -> ".join([str(loc) for loc in erro.get("loc", [])])
        erros_formatados.append({
            "campo": campo,
            "mensagem": erro.get("msg", "Valor inválido"),
            "tipo": erro.get("type", "")
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": "erro_validacao",
            "codigo": 422,
            "detalhe": "Erro de validação nos campos da requisição.",
            "erros": erros_formatados
        }
    )


# ==========================================
# ROTAS DO SISTEMA
# ==========================================

@app.get("/saude", tags=["Monitoramento"])
async def checagem_saude():
    """Endpoint de verificação de integridade operacional do backend."""
    return {
        "status": "ok",
        "versao": "2.0.0",
        "app": "C.A.S.A. API",
        "descricao": "Sistema de Comunicação Alternativa e Sensorial Adaptada"
    }


# Inclusão dos roteadores modulares
app.include_router(auth.router)
app.include_router(categorias.router)
app.include_router(dispositivos.router)
app.include_router(historico.router)
app.include_router(midias.router)
app.include_router(notificacoes.router)
app.include_router(perfil.router)
app.include_router(tts.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
