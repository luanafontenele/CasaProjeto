import time
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

try:
    from ..config import settings
    from ..deps import get_db, usuario_atual
    from ..metricas import inicio_janela, calcular_metricas, extrair_data_acionamento
    from ..relatorio import gerar_relatorio_pdf
except ImportError:
    from config import settings
    from deps import get_db, usuario_atual
    from metricas import inicio_janela, calcular_metricas, extrair_data_acionamento
    from relatorio import gerar_relatorio_pdf

router = APIRouter(prefix="/historico", tags=["Histórico & Métricas"])


@router.get("", response_model=List[Dict[str, Any]])
async def listar_historico(
    janela: str = Query("todos", description="Filtro de tempo: 'dia', 'semana', 'mes', 'todos'"),
    limite: int = Query(50, ge=1, le=200),
    user: dict = Depends(usuario_atual),
    db = Depends(get_db)
):
    """Lista os registros de acionamento do usuário filtrados por janela de tempo."""
    if db is None:
        return []

    dt_inicio = inicio_janela(janela)
    docs = db.collection("usuarios").document(user["uid"]).collection("acionamentos") \
        .order_by("acionado_em", direction="DESCENDING").limit(limite).stream()

    resultado = []
    for d in docs:
        item = d.to_dict()
        item["id"] = d.id
        if extrair_data_acionamento(item) >= dt_inicio:
            resultado.append(item)

    return resultado


@router.post("", status_code=status.HTTP_201_CREATED)
async def registrar_acionamento(
    payload: Dict[str, Any],
    user: dict = Depends(usuario_atual),
    db = Depends(get_db)
):
    """
    Registra um acionamento disparado pelo aplicativo ou hardware.
    Gera notificação em tempo real para sincronização com o app mobile e frontend.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Banco indisponível.")

    uid = user["uid"]
    doc_id = f"ac_{uuid.uuid4().hex[:12]}"
    agora_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    botao_nome = payload.get("botao_nome") or payload.get("rotulo") or "Botão"
    cat_nome = payload.get("categoria_nome") or payload.get("categoria") or "Geral"
    origem = payload.get("origem") or "app"
    disp_mac = payload.get("dispositivo") or payload.get("dispositivoMac") or ""

    dados_acionamento = {
        "id": doc_id,
        "botao_id": payload.get("botao_id", ""),
        "botao_nome": botao_nome,
        "categoria_nome": cat_nome,
        "origem": origem,
        "dispositivo": disp_mac,
        "acionado_em": agora_iso,
        "timestamp": int(time.time() * 1000)
    }

    db.collection("usuarios").document(uid).collection("acionamentos").document(doc_id).set(dados_acionamento)

    # Cria notificação em tempo real
    try:
        db.collection("usuarios").document(uid).collection("notificacoes").add({
            "titulo": f"Acionamento: {botao_nome}",
            "mensagem": f"Categoria: {cat_nome} • Origem: {origem.capitalize()}",
            "data": int(time.time() * 1000),
            "tipo": "interacao",
            "lida": False,
            "dispositivoId": disp_mac
        })
    except Exception:
        pass

    return dados_acionamento


@router.get("/metricas")
async def obter_metricas(
    janela: str = Query("todos", description="Janela: 'dia', 'semana', 'mes', 'todos'"),
    user: dict = Depends(usuario_atual),
    db = Depends(get_db)
):
    """Calcula e retorna os indicadores analíticos (totais, por botão, categoria e hora)."""
    if db is None:
        return calcular_metricas([], janela)

    docs = db.collection("usuarios").document(user["uid"]).collection("acionamentos").stream()
    todos = [d.to_dict() for d in docs]
    return calcular_metricas(todos, janela)


@router.get("/relatorio.pdf")
async def exportar_relatorio_pdf(
    janela: str = Query("mes", description="Janela para o relatório PDF: 'dia', 'semana', 'mes', 'todos'"),
    user: dict = Depends(usuario_atual),
    db = Depends(get_db)
):
    """
    Gera o relatório estatístico oficial em PDF com gráficos de barras (ReportLab).
    Retorna o stream binário com cabeçalho application/pdf para download imediato.
    """
    if db is not None:
        docs = db.collection("usuarios").document(user["uid"]).collection("acionamentos").stream()
        acionamentos = [d.to_dict() for d in docs]
    else:
        acionamentos = []

    metricas = calcular_metricas(acionamentos, janela)
    pdf_bytes = gerar_relatorio_pdf(user, acionamentos, metricas)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=relatorio_casa_{janela}.pdf"
        }
    )
