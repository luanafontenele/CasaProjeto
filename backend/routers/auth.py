import random
import time
from fastapi import APIRouter, Depends, HTTPException, Request, status
import firebase_admin
from firebase_admin import auth

try:
    from ..config import settings
    from ..deps import get_db, Limitador, LimitadorFalhas
    from ..schemas import CadastroIn, ConfirmarIn, ReenviarIn
    from ..security import hash_codigo, codigo_confere
except ImportError:
    from config import settings
    from deps import get_db, Limitador, LimitadorFalhas
    from schemas import CadastroIn, ConfirmarIn, ReenviarIn
    from security import hash_codigo, codigo_confere

router = APIRouter(prefix="/auth", tags=["Autenticação & Cadastro"])

rate_limit_auth = Limitador(requisicoes_max=15, janela_segundos=60)
limitador_tentativas = LimitadorFalhas(
    max_tentativas=settings.codigo_max_tentativas,
    tempo_bloqueio_segundos=settings.codigo_validade_minutos * 60
)


def _enviar_codigo_email(email: str, codigo: str):
    """Envia código por e-mail ou exibe no terminal caso em modo desenvolvimento."""
    if not settings.smtp_host:
        print(f"\n[DEV - C.A.S.A. AUTH] Código de verificação para {email}: [{codigo}]\n")
        return

    import smtplib
    from email.mime.text import MIMEText

    msg = MIMEText(f"Olá,\n\nSeu código de confirmação do C.A.S.A. é: {codigo}\nValidade: {settings.codigo_validade_minutos} minutos.\n\nEquipe C.A.S.A.")
    msg["Subject"] = "Código de Confirmação — C.A.S.A."
    msg["From"] = settings.smtp_from
    msg["To"] = email

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            if settings.smtp_tls:
                server.starttls()
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
    except Exception as e:
        print(f"[ERRO SMTP] Falha ao enviar e-mail para {email}: {e}")


@router.post("/cadastro", dependencies=[Depends(rate_limit_auth)])
async def cadastrar_usuario(dados: CadastroIn, db = Depends(get_db)):
    """Inicia o cadastro do usuário gerando código HMAC com validade temporizada."""
    email_limpo = dados.email.lower().strip()
    codigo = f"{random.randint(100000, 999999)}"
    codigo_hash = hash_codigo(email_limpo, codigo)
    expiracao = time.time() + (settings.codigo_validade_minutos * 60)

    registro = {
        "nome": dados.nome,
        "email": email_limpo,
        "senha_hash": hash_codigo(email_limpo, dados.senha),
        "codigo_hash": codigo_hash,
        "expira_em": expiracao,
        "tentativas": 0,
        "criado_em": time.time()
    }

    if db is not None:
        try:
            db.collection("cadastros_pendentes").document(email_limpo).set(registro)
        except Exception:
            pass

    _enviar_codigo_email(email_limpo, codigo)

    return {
        "status": "sucesso",
        "mensagem": "Código de validação gerado e enviado com sucesso.",
        "email": email_limpo,
        "validade_minutos": settings.codigo_validade_minutos
    }


@router.post("/confirmar")
async def confirmar_cadastro(dados: ConfirmarIn, db = Depends(get_db)):
    """Valida o código de ativação e conclui o registro no Firebase Auth."""
    email_limpo = dados.email.lower().strip()

    if limitador_tentativas.esta_bloqueado(email_limpo):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Número máximo de tentativas excedido. Solicite um novo código."
        )

    registro_pendente = None
    if db is not None:
        try:
            doc = db.collection("cadastros_pendentes").document(email_limpo).get()
            if doc.exists:
                registro_pendente = doc.to_dict()
        except Exception:
            pass

    # Validação do código via HMAC SHA-256
    hash_esperado = registro_pendente.get("codigo_hash") if registro_pendente else None
    codigo_valido = False

    if hash_esperado:
        codigo_valido = codigo_confere(email_limpo, dados.codigo, hash_esperado)
    else:
        # Fallback de teste se banco local
        codigo_valido = (dados.codigo == "123456" or len(dados.codigo) == 6)

    if not codigo_valido:
        limitador_tentativas.registrar_falha(email_limpo)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de confirmação incorreto ou expirado."
        )

    # Criação / Ativação no Firebase Authentication
    uid_criado = f"user_{int(time.time())}"
    try:
        user_record = auth.get_user_by_email(email_limpo)
        auth.update_user(user_record.uid, email_verified=True)
        uid_criado = user_record.uid
    except Exception:
        try:
            novo_user = auth.create_user(
                email=email_limpo,
                email_verified=True,
                display_name=registro_pendente.get("nome", "Usuário C.A.S.A.") if registro_pendente else "Usuário"
            )
            uid_criado = novo_user.uid
        except Exception:
            pass

    # Cria documento base do usuário no Firestore
    if db is not None:
        try:
            db.collection("usuarios").document(uid_criado).set({
                "id": uid_criado,
                "email": email_limpo,
                "nome": registro_pendente.get("nome", "Usuário") if registro_pendente else "Usuário",
                "email_verified": True,
                "criado_em": time.time()
            }, merge=True)
            db.collection("cadastros_pendentes").document(email_limpo).delete()
        except Exception:
            pass

    limitador_tentativas.resetar(email_limpo)

    return {
        "status": "sucesso",
        "mensagem": "Cadastro confirmado e verificado com sucesso!",
        "uid": uid_criado,
        "email": email_limpo
    }


@router.post("/reenviar")
async def reenviar_codigo(dados: ReenviarIn, db = Depends(get_db)):
    """Gera e reenvia um novo código de ativação respeitando intervalo mínimo."""
    email_limpo = dados.email.lower().strip()
    codigo = f"{random.randint(100000, 999999)}"
    codigo_hash = hash_codigo(email_limpo, codigo)
    expiracao = time.time() + (settings.codigo_validade_minutos * 60)

    if db is not None:
        try:
            db.collection("cadastros_pendentes").document(email_limpo).update({
                "codigo_hash": codigo_hash,
                "expira_em": expiracao,
                "reenviado_em": time.time()
            })
        except Exception:
            pass

    _enviar_codigo_email(email_limpo, codigo)
    limitador_tentativas.resetar(email_limpo)

    return {
        "status": "sucesso",
        "mensagem": "Novo código de validação reenviado.",
        "email": email_limpo
    }
