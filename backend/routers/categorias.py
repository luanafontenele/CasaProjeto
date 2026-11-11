import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status

try:
    from ..config import settings
    from ..deps import get_db, usuario_atual
    from ..schemas import CategoriaIn, BotaoIn, BotaoUpdate, OrdemIn
except ImportError:
    from config import settings
    from deps import get_db, usuario_atual
    from schemas import CategoriaIn, BotaoIn, BotaoUpdate, OrdemIn

router = APIRouter(prefix="/categorias", tags=["Categorias e Botões"])


@router.get("", response_model=List[Dict[str, Any]])
async def listar_categorias(user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """Lista as categorias cadastradas do usuário autenticado."""
    if db is None:
        return []

    uid = user["uid"]
    docs = db.collection("usuarios").document(uid).collection("categorias").order_by("ordem").stream()
    categorias = []
    for d in docs:
        dados = d.to_dict()
        dados["id"] = d.id
        categorias.append(dados)
    return categorias


@router.post("", status_code=status.HTTP_201_CREATED)
async def criar_categoria(payload: CategoriaIn, user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """Cria uma nova categoria respeitando o limite máximo por usuário (max_categorias)."""
    if db is None:
        raise HTTPException(status_code=500, detail="Banco de dados indisponível.")

    uid = user["uid"]
    col_ref = db.collection("usuarios").document(uid).collection("categorias")
    existentes = list(col_ref.stream())

    if len(existentes) >= settings.max_categorias:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Limite máximo de {settings.max_categorias} categorias atingido."
        )

    cat_id = f"cat_{uuid.uuid4().hex[:10]}"
    slug = payload.nome.lower().strip().replace(" ", "_")

    nova_cat = {
        "id": cat_id,
        "nome": payload.nome,
        "slug": slug,
        "cor": payload.cor or "#2563EB",
        "icone": payload.icone or "",
        "ordem": len(existentes),
        "owner_uid": uid,
        "botoes": []
    }

    col_ref.document(cat_id).set(nova_cat)
    # Espelho na coleção global para compatibilidade com ESP32
    db.collection("categoria").document(cat_id).set(nova_cat)

    return nova_cat


@router.get("/{cat_id}")
async def obter_categoria(cat_id: str, user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """Obtém detalhes de uma categoria específica."""
    if db is None:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")

    doc = db.collection("usuarios").document(user["uid"]).collection("categorias").document(cat_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    dados = doc.to_dict()
    dados["id"] = doc.id
    return dados


@router.put("/{cat_id}")
async def atualizar_categoria(cat_id: str, payload: CategoriaIn, user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """Atualiza nome, cor ou ícone da categoria."""
    if db is None:
        raise HTTPException(status_code=500, detail="Banco indisponível.")

    doc_ref = db.collection("usuarios").document(user["uid"]).collection("categorias").document(cat_id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")

    atualizacao = {
        "nome": payload.nome,
        "cor": payload.cor,
        "icone": payload.icone
    }
    doc_ref.update(atualizacao)
    db.collection("categoria").document(cat_id).update(atualizacao)
    return {"status": "sucesso", "mensagem": "Categoria atualizada com sucesso."}


@router.delete("/{cat_id}")
async def excluir_categoria(cat_id: str, user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """Remove uma categoria e seus botões vinculados."""
    if db is None:
        raise HTTPException(status_code=500, detail="Banco indisponível.")

    doc_ref = db.collection("usuarios").document(user["uid"]).collection("categorias").document(cat_id)
    doc_ref.delete()
    db.collection("categoria").document(cat_id).delete()
    return {"status": "sucesso", "mensagem": "Categoria removida com sucesso."}


@router.put("/ordem")
async def reordenar_categorias(payload: OrdemIn, user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """Reordena as categorias com base na lista de IDs enviada."""
    if db is None:
        raise HTTPException(status_code=500, detail="Banco indisponível.")

    batch = db.batch()
    col = db.collection("usuarios").document(user["uid"]).collection("categorias")
    for index, cat_id in enumerate(payload.ordem):
        doc_ref = col.document(cat_id)
        batch.update(doc_ref, {"ordem": index})
    batch.commit()
    return {"status": "sucesso", "mensagem": "Ordem atualizada com sucesso."}


# ==========================================
# GESTÃO DE BOTÕES DENTRO DA CATEGORIA
# ==========================================

@router.get("/{cat_id}/botoes")
async def listar_botoes(cat_id: str, user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """Lista os botões vinculados a uma categoria."""
    if db is None:
        return []

    cat_doc = db.collection("usuarios").document(user["uid"]).collection("categorias").document(cat_id).get()
    if not cat_doc.exists:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")

    botoes = cat_doc.to_dict().get("botoes", [])
    botoes.sort(key=lambda x: x.get("ordem", 0))
    return botoes


@router.post("/{cat_id}/botoes", status_code=status.HTTP_201_CREATED)
async def adicionar_botao(cat_id: str, payload: BotaoIn, user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """Adiciona um botão na categoria respeitando o teto de 5 botões (max_botoes_por_categoria)."""
    if db is None:
        raise HTTPException(status_code=500, detail="Banco indisponível.")

    doc_ref = db.collection("usuarios").document(user["uid"]).collection("categorias").document(cat_id)
    cat_doc = doc_ref.get()
    if not cat_doc.exists:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")

    cat_dados = cat_doc.to_dict()
    botoes = cat_dados.get("botoes", [])

    if len(botoes) >= settings.max_botoes_por_categoria:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Limite de {settings.max_botoes_por_categoria} botões por categoria atingido."
        )

    botao_id = f"btn_{uuid.uuid4().hex[:10]}"
    novo_botao = {
        "id": botao_id,
        "rotulo": payload.rotulo,
        "significado": payload.significado or payload.rotulo,
        "ordem": payload.ordem if payload.ordem is not None else len(botoes),
        "imagem_id": payload.imagem_id or "",
        "audio_id": payload.audio_id or "",
        "categoria_id": cat_id
    }

    botoes.append(novo_botao)
    doc_ref.update({"botoes": botoes})

    # Espelho na coleção global categoria_botao para o ESP32
    db.collection("categoria_botao").document(botao_id).set(novo_botao)

    return novo_botao


@router.put("/{cat_id}/botoes/{botao_id}")
async def atualizar_botao(cat_id: str, botao_id: str, payload: BotaoUpdate, user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """Atualiza dados e mídias de um botão."""
    if db is None:
        raise HTTPException(status_code=500, detail="Banco indisponível.")

    doc_ref = db.collection("usuarios").document(user["uid"]).collection("categorias").document(cat_id)
    cat_doc = doc_ref.get()
    if not cat_doc.exists:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")

    botoes = cat_doc.to_dict().get("botoes", [])
    achou = False
    for b in botoes:
        if b.get("id") == botao_id:
            if payload.rotulo is not None: b["rotulo"] = payload.rotulo
            if payload.significado is not None: b["significado"] = payload.significado
            if payload.ordem is not None: b["ordem"] = payload.ordem
            if payload.imagem_id is not None: b["imagem_id"] = payload.imagem_id
            if payload.audio_id is not None: b["audio_id"] = payload.audio_id
            achou = True
            break

    if not achou:
        raise HTTPException(status_code=404, detail="Botão não encontrado.")

    doc_ref.update({"botoes": botoes})
    return {"status": "sucesso", "mensagem": "Botão atualizado com sucesso."}


@router.delete("/{cat_id}/botoes/{botao_id}")
async def excluir_botao(cat_id: str, botao_id: str, user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """Remove um botão da categoria."""
    if db is None:
        raise HTTPException(status_code=500, detail="Banco indisponível.")

    doc_ref = db.collection("usuarios").document(user["uid"]).collection("categorias").document(cat_id)
    cat_doc = doc_ref.get()
    if not cat_doc.exists:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")

    botoes = [b for b in cat_doc.to_dict().get("botoes", []) if b.get("id") != botao_id]
    doc_ref.update({"botoes": botoes})
    db.collection("categoria_botao").document(botao_id).delete()

    return {"status": "sucesso", "mensagem": "Botão removido com sucesso."}
