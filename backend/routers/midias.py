import os
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status

try:
    from ..config import settings
    from ..deps import get_db, usuario_atual
    from .. import storage
except ImportError:
    from config import settings
    from deps import get_db, usuario_atual
    import storage

router = APIRouter(prefix="/midias", tags=["Mídias (Uploads & Processamento)"])


@router.post("/imagem", status_code=status.HTTP_201_CREATED)
async def upload_imagem(
    arquivo: UploadFile = File(...),
    user: dict = Depends(usuario_atual),
    db = Depends(get_db)
):
    """
    Recebe imagem, valida teto de 5 MB, redimensiona para 240x240 pixels (JPEG Baseline)
    e persiste fisicamente no disco e em blocos de 192 KB no Firestore.
    """
    conteudo_bruto = await arquivo.read()
    if len(conteudo_bruto) > settings.max_imagem_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Imagem excede o limite máximo permitido de {settings.max_imagem_mb} MB."
        )

    # Processamento obrigatório para display ST7789 do ESP32
    imagem_processada = storage.processar_imagem_240(conteudo_bruto)
    arquivo_id = f"img_{uuid.uuid4().hex[:12]}"

    caminho, tamanho = storage.salvar_arquivo_midia(
        arquivo_id=arquivo_id,
        conteudo=imagem_processada,
        extensao=".jpg",
        tipo_midia="imagem",
        db=db
    )

    return {
        "status": "sucesso",
        "id": arquivo_id,
        "url": f"/midias/{arquivo_id}",
        "tamanho_bytes": tamanho,
        "dimensoes": f"{settings.imagem_lado_px}x{settings.imagem_lado_px}"
    }


@router.post("/audio", status_code=status.HTTP_201_CREATED)
async def upload_audio(
    arquivo: UploadFile = File(...),
    user: dict = Depends(usuario_atual),
    db = Depends(get_db)
):
    """
    Recebe arquivo de áudio, valida teto de 5 MB, converte para MP3 Mono se necessário
    e persiste fisicamente em disco e em blocos no Firestore.
    """
    conteudo_bruto = await arquivo.read()
    if len(conteudo_bruto) > settings.max_audio_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Áudio excede o limite máximo permitido de {settings.max_audio_mb} MB."
        )

    _, ext = os.path.splitext(arquivo.filename or "")
    if not ext:
        ext = ".m4a"

    audio_processado = storage.processar_audio_mp3(conteudo_bruto, ext)
    arquivo_id = f"aud_{uuid.uuid4().hex[:12]}"

    caminho, tamanho = storage.salvar_arquivo_midia(
        arquivo_id=arquivo_id,
        conteudo=audio_processado,
        extensao=".mp3" if audio_processado != conteudo_bruto else ext,
        tipo_midia="audio",
        db=db
    )

    return {
        "status": "sucesso",
        "id": arquivo_id,
        "url": f"/midias/{arquivo_id}",
        "tamanho_bytes": tamanho
    }


@router.get("/{arquivo_id}")
async def obter_midia(arquivo_id: str, db = Depends(get_db)):
    """
    Recupera e transmite o arquivo de imagem ou áudio.
    Em caso de imagem ausente, fornece fallback gerado dinamicamente com texto centralizado.
    """
    # Tenta recuperar imagem primeiro
    dados = storage.obter_arquivo_midia(arquivo_id, ".jpg", db)
    if dados:
        return Response(content=dados, media_type="image/jpeg")

    # Tenta recuperar áudio
    dados_audio = storage.obter_arquivo_midia(arquivo_id, ".mp3", db) or \
                  storage.obter_arquivo_midia(arquivo_id, ".m4a", db)
    if dados_audio:
        return Response(content=dados_audio, media_type="audio/mpeg")

    # Fallback para imagem com texto padrão
    if arquivo_id.startswith("img_") or not arquivo_id.startswith("aud_"):
        img_padrao = storage.gerar_imagem_padrao("C.A.S.A.")
        return Response(content=img_padrao, media_type="image/jpeg")

    raise HTTPException(status_code=404, detail="Arquivo de mídia não encontrado.")


@router.get("/{arquivo_id}/padrao")
async def obter_imagem_padrao(texto: str = Query("Botão", description="Texto centralizado a desenhar")):
    """Gera sob demanda imagem de fallback 240x240 pixels com texto centralizado."""
    img = storage.gerar_imagem_padrao(texto)
    return Response(content=img, media_type="image/jpeg")
