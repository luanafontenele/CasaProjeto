from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status

try:
    from ..deps import get_db, usuario_atual
except ImportError:
    from deps import get_db, usuario_atual

router = APIRouter(prefix="/notificacoes", tags=["Notificações & Avisos"])


@router.get("", response_model=List[Dict[str, Any]])
async def listar_notificacoes(user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """Lista as notificações registradas para o usuário autenticado."""
    if db is None:
        return []

    docs = db.collection("usuarios").document(user["uid"]).collection("notificacoes") \
        .order_by("data", direction="DESCENDING").limit(50).stream()

    lista = []
    for d in docs:
        item = d.to_dict()
        item["id"] = d.id
        lista.append(item)
    return lista


@router.put("/{notif_id}/lida")
async def marcar_notificacao_lida(notif_id: str, user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """Marca uma notificação específica como lida."""
    if db is None:
        raise HTTPException(status_code=500, detail="Banco indisponível.")

    doc_ref = db.collection("usuarios").document(user["uid"]).collection("notificacoes").document(notif_id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Notificação não encontrada.")

    doc_ref.update({"lida": True})
    return {"status": "sucesso", "mensagem": "Notificação marcada como lida."}


@router.delete("/{notif_id}")
async def excluir_notificacao(notif_id: str, user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """Remove uma notificação do usuário."""
    if db is None:
        raise HTTPException(status_code=500, detail="Banco indisponível.")

    doc_ref = db.collection("usuarios").document(user["uid"]).collection("notificacoes").document(notif_id)
    doc_ref.delete()
    return {"status": "sucesso", "mensagem": "Notificação removida."}


@router.delete("")
async def limpar_todas_notificacoes(user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """Remove todas as notificações da conta do usuário."""
    if db is None:
        raise HTTPException(status_code=500, detail="Banco indisponível.")

    col = db.collection("usuarios").document(user["uid"]).collection("notificacoes")
    docs = col.stream()
    batch = db.batch()
    for d in docs:
        batch.delete(d.reference)
    batch.commit()

    return {"status": "sucesso", "mensagem": "Todas as notificações foram limpas."}
