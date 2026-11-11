from fastapi import APIRouter, Depends, HTTPException, status
import firebase_admin
from firebase_admin import auth

try:
    from ..deps import get_db, usuario_atual
    from ..schemas import PerfilIn
except ImportError:
    from deps import get_db, usuario_atual
    from schemas import PerfilIn

router = APIRouter(prefix="/perfil", tags=["Perfil do Usuário"])


@router.get("")
async def obter_perfil(user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """Retorna os dados cadastrais e preferências do perfil autenticado."""
    uid = user["uid"]
    dados = {
        "uid": uid,
        "email": user.get("email", ""),
        "email_verified": user.get("email_verified", False),
        "nome": user.get("name", "")
    }

    if db is not None:
        try:
            doc = db.collection("usuarios").document(uid).get()
            if doc.exists:
                info_banco = doc.to_dict()
                dados.update(info_banco)
        except Exception:
            pass

    return dados


@router.put("")
async def atualizar_perfil(payload: PerfilIn, user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """Atualiza o nome de exibição no Firestore e no Firebase Authentication."""
    uid = user["uid"]
    novo_nome = payload.nome.strip()

    # 1. Atualiza no Firebase Auth
    try:
        auth.update_user(uid, display_name=novo_nome)
    except Exception:
        pass

    # 2. Atualiza no Firestore
    if db is not None:
        try:
            db.collection("usuarios").document(uid).set({
                "id": uid,
                "nome": novo_nome
            }, merge=True)
        except Exception:
            pass

    return {
        "status": "sucesso",
        "mensagem": "Perfil atualizado com sucesso.",
        "nome": novo_nome
    }
