import os
import time
from collections import defaultdict
from typing import Dict, List, Optional
from fastapi import Header, HTTPException, Request, status
import firebase_admin
from firebase_admin import credentials, firestore, auth

try:
    from .config import settings
except ImportError:
    from config import settings

_firestore_client = None

def get_db():
    """Retorna a instância singleton do cliente Cloud Firestore."""
    global _firestore_client
    if _firestore_client is not None:
        return _firestore_client

    if not firebase_admin._apps:
        cred_path = settings.firebase_credentials or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if not cred_path:
            local_cand = os.path.join(os.path.dirname(__file__), "firebase-credentials.json")
            if os.path.exists(local_cand):
                cred_path = local_cand

        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            try:
                firebase_admin.initialize_app()
            except Exception:
                pass

    try:
        _firestore_client = firestore.client()
    except Exception as e:
        # Modo de fallback gracioso se não houver credenciais remotas conectadas
        _firestore_client = None
    return _firestore_client


async def usuario_atual(
    authorization: Optional[str] = Header(None, description="Token de acesso Bearer Firebase ID")
) -> dict:
    """
    Injetor de Dependência: Valida o token Bearer do Firebase Authentication
    e checa a confirmação de e-mail (caso require_email_verified seja True).
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação não fornecido ou inválido.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = authorization.split("Bearer ", 1)[1].strip()

    # Suporte a ambiente local de testes e desenvolvimento
    if token.startswith("dev-token-") or token == "dev-token":
        uid = token.replace("dev-token-", "") or "usuario_dev_local"
        return {"uid": uid, "email": f"{uid}@casa.local", "email_verified": True}

    try:
        decoded_token = auth.verify_id_token(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido ou expirado: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if settings.require_email_verified and not decoded_token.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="E-mail não verificado. Confirme seu endereço de e-mail antes de acessar a API."
        )

    return {
        "uid": decoded_token.get("uid"),
        "email": decoded_token.get("email", ""),
        "email_verified": decoded_token.get("email_verified", False),
        "name": decoded_token.get("name", "")
    }


class Limitador:
    """
    Limitador de taxa por IP e Rota (Rate Limit) baseado em janela deslizante.
    """
    def __init__(self, requisicoes_max: int = 60, janela_segundos: int = 60):
        self.requisicoes_max = requisicoes_max
        self.janela_segundos = janela_segundos
        self.historico: Dict[str, List[float]] = defaultdict(list)

    async def __call__(self, request: Request):
        ip = request.client.host if request.client else "127.0.0.1"
        rota = request.url.path
        chave = f"{ip}:{rota}"

        agora = time.time()
        corte = agora - self.janela_segundos

        # Remove requisições fora da janela
        self.historico[chave] = [t for t in self.historico[chave] if t > corte]

        if len(self.historico[chave]) >= self.requisicoes_max:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Limite de requisições excedido. Tente novamente em alguns segundos."
            )

        self.historico[chave].append(agora)


class LimitadorFalhas:
    """
    Contador de falhas temporizado (para proteção contra força bruta em códigos e senhas).
    """
    def __init__(self, max_tentativas: int = 5, tempo_bloqueio_segundos: int = 900):
        self.max_tentativas = max_tentativas
        self.tempo_bloqueio_segundos = tempo_bloqueio_segundos
        self.tentativas: Dict[str, List[float]] = defaultdict(list)

    def registrar_falha(self, chave: str):
        agora = time.time()
        self.tentativas[chave].append(agora)

    def esta_bloqueado(self, chave: str) -> bool:
        agora = time.time()
        corte = agora - self.tempo_bloqueio_segundos
        self.tentativas[chave] = [t for t in self.tentativas[chave] if t > corte]
        return len(self.tentativas[chave]) >= self.max_tentativas

    def resetar(self, chave: str):
        if chave in self.tentativas:
            del self.tentativas[chave]
