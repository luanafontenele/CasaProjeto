from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any
try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo

try:
    from .config import settings
except ImportError:
    from config import settings


def obter_fuso_local() -> ZoneInfo:
    """Retorna o fuso horário configurado para a aplicação (padrão America/Sao_Paulo)."""
    try:
        return ZoneInfo(settings.timezone)
    except Exception:
        return ZoneInfo("America/Sao_Paulo")


def inicio_janela(janela: str) -> datetime:
    """
    Retorna o datetime inicial para filtros de métricas e relatórios:
    - "dia": início do dia atual (00:00:00).
    - "semana": início dos últimos 7 dias.
    - "mes": início dos últimos 30 dias.
    - "todos": marco zero (1970-01-01).
    """
    fuso = obter_fuso_local()
    agora = datetime.now(fuso)

    janela_limpa = janela.strip().lower()
    if janela_limpa in ["dia", "hoje", "day"]:
        return agora.replace(hour=0, minute=0, second=0, microsecond=0)
    elif janela_limpa in ["semana", "week", "7d"]:
        return agora - timedelta(days=7)
    elif janela_limpa in ["mes", "month", "30d"]:
        return agora - timedelta(days=30)
    elif janela_limpa in ["ano", "year"]:
        return agora - timedelta(days=365)
    else:  # "todos", "all"
        return datetime(1970, 1, 1, tzinfo=timezone.utc)


def extrair_data_acionamento(item: Dict[str, Any]) -> datetime:
    """Normaliza o campo de timestamp do acionamento para datetime com fuso."""
    fuso = obter_fuso_local()
    valor = item.get("acionado_em") or item.get("timestamp") or item.get("data")
    if isinstance(valor, datetime):
        return valor if valor.tzinfo else valor.replace(tzinfo=fuso)

    if isinstance(valor, (int, float)):
        # Timestamp em milissegundos ou segundos
        segundos = valor / 1000.0 if valor > 1e11 else float(valor)
        return datetime.fromtimestamp(segundos, tz=fuso)

    if isinstance(valor, str) and valor.strip():
        # Parsing ISO-8601
        try:
            limpo = valor.replace("Z", "+00:00")
            dt = datetime.fromisoformat(limpo)
            return dt.astimezone(fuso)
        except Exception:
            pass

    return datetime.now(fuso)


def calcular_metricas(acionamentos: List[Dict[str, Any]], janela: str = "todos") -> Dict[str, Any]:
    """
    Calcula os indicadores analíticos a partir de uma lista de acionamentos:
    - total_acionamentos
    - por_categoria
    - por_botao
    - por_hora
    - por_origem (app vs dispositivo)
    """
    dt_inicio = inicio_janela(janela)

    filtrados = [
        item for item in acionamentos
        if extrair_data_acionamento(item) >= dt_inicio
    ]

    total = len(filtrados)
    por_categoria: Dict[str, int] = {}
    por_botao: Dict[str, int] = {}
    por_hora: Dict[int, int] = {h: 0 for h in range(24)}
    por_origem: Dict[str, int] = {"app": 0, "dispositivo": 0}

    for item in filtrados:
        cat = item.get("categoria_nome") or item.get("categoria") or "Geral"
        botao = item.get("botao_nome") or item.get("botao") or "Botão"
        origem = item.get("origem") or "dispositivo"

        por_categoria[cat] = por_categoria.get(cat, 0) + 1
        por_botao[botao] = por_botao.get(botao, 0) + 1

        dt = extrair_data_acionamento(item)
        por_hora[dt.hour] = por_hora.get(dt.hour, 0) + 1

        origem_chave = "app" if "app" in origem.lower() else "dispositivo"
        por_origem[origem_chave] = por_origem.get(origem_chave, 0) + 1

    botao_mais_usado = max(por_botao.items(), key=lambda x: x[1])[0] if por_botao else "Nenhum"
    categoria_mais_usada = max(por_categoria.items(), key=lambda x: x[1])[0] if por_categoria else "Nenhuma"

    return {
        "janela": janela,
        "total_acionamentos": total,
        "botao_mais_usado": botao_mais_usado,
        "categoria_mais_usada": categoria_mais_usada,
        "por_categoria": por_categoria,
        "por_botao": por_botao,
        "por_hora": por_hora,
        "por_origem": por_origem
    }
