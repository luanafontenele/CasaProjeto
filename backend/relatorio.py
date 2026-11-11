import io
from datetime import datetime
from typing import Dict, List, Any
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.graphics.shapes import Drawing, String
from reportlab.graphics.charts.barcharts import VerticalBarChart

try:
    from .config import settings
    from .metricas import obter_fuso_local, extrair_data_acionamento
except ImportError:
    from config import settings
    from metricas import obter_fuso_local, extrair_data_acionamento


def gerar_relatorio_pdf(usuario: Dict[str, Any], acionamentos: List[Dict[str, Any]], metricas: Dict[str, Any]) -> bytes:
    """
    Compila o relatório visual e estatístico de acionamentos em PDF usando ReportLab.
    Retorna o buffer do documento em bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    elementos = []
    styles = getSampleStyleSheet()

    # Estilos customizados
    titulo_style = ParagraphStyle(
        "TituloRelatorio",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1E3A8A"),
        alignment=1,  # Centralizado
        spaceAfter=6
    )

    subtitulo_style = ParagraphStyle(
        "SubtituloRelatorio",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#64748B"),
        alignment=1,
        spaceAfter=16
    )

    secao_style = ParagraphStyle(
        "SecaoRelatorio",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=14,
        spaceAfter=8
    )

    texto_style = ParagraphStyle(
        "TextoPadrao",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#334155")
    )

    # 1. Cabeçalho Principal
    elementos.append(Paragraph("PROJETO C.A.S.A. — RELATÓRIO DE ACIONAMENTOS", titulo_style))
    agora_fuso = datetime.now(obter_fuso_local()).strftime("%d/%m/%Y às %H:%M")
    elementos.append(Paragraph(f"Comunicação Alternativa e Sensorial Adaptada • Gerado em: {agora_fuso}", subtitulo_style))
    elementos.append(Spacer(1, 10))

    # 2. Informações do Usuário e Período
    dados_usuario = [
        [
            Paragraph(f"<b>Usuário / Paciente:</b> {usuario.get('name') or usuario.get('email') or 'Geral'}", texto_style),
            Paragraph(f"<b>E-mail:</b> {usuario.get('email') or 'Não informado'}", texto_style)
        ],
        [
            Paragraph(f"<b>Janela de Análise:</b> {metricas.get('janela', 'todos').capitalize()}", texto_style),
            Paragraph(f"<b>Total de Acionamentos:</b> {metricas.get('total_acionamentos', len(acionamentos))}", texto_style)
        ]
    ]

    tabela_cabecalho = Table(dados_usuario, colWidths=[260, 260])
    tabela_cabecalho.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elementos.append(tabela_cabecalho)
    elementos.append(Spacer(1, 15))

    # 3. Métricas Resumidas
    elementos.append(Paragraph("Resumo dos Indicadores", secao_style))
    dados_resumo = [
        ["Total de Cliques", "Botão Mais Usado", "Categoria Mais Usada", "Origem App", "Origem Dispositivo"],
        [
            str(metricas.get("total_acionamentos", 0)),
            str(metricas.get("botao_mais_usado", "N/A")),
            str(metricas.get("categoria_mais_usada", "N/A")),
            str(metricas.get("por_origem", {}).get("app", 0)),
            str(metricas.get("por_origem", {}).get("dispositivo", 0))
        ]
    ]
    tabela_resumo = Table(dados_resumo, colWidths=[104, 114, 114, 94, 94])
    tabela_resumo.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2563EB")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor("#EFF6FF")),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 1), (-1, 1), 11),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#3B82F6")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#93C5FD")),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elementos.append(tabela_resumo)
    elementos.append(Spacer(1, 15))

    # 4. Gráfico de Barras com os Botões Mais Acionados
    por_botao = metricas.get("por_botao", {})
    if por_botao:
        elementos.append(Paragraph("Distribuição de Cliques por Botão", secao_style))
        top_botoes = sorted(por_botao.items(), key=lambda x: x[1], reverse=True)[:5]
        labels = [item[0][:10] for item in top_botoes]
        valores = [item[1] for item in top_botoes]

        drawing = Drawing(520, 150)
        bc = VerticalBarChart()
        bc.x = 40
        bc.y = 25
        bc.height = 110
        bc.width = 460
        bc.data = [valores]
        bc.categoryAxis.categoryNames = labels
        bc.categoryAxis.labels.fontSize = 8
        bc.categoryAxis.labels.dy = -10
        bc.valueAxis.valueMin = 0
        valor_max = max(valores) if valores else 1
        bc.valueAxis.valueMax = valor_max + max(2, valor_max // 5)
        bc.bars[0].fillColor = colors.HexColor("#2563EB")
        drawing.add(bc)
        elementos.append(drawing)
        elementos.append(Spacer(1, 15))

    # 5. Lista de Acionamentos Recentes
    elementos.append(Paragraph("Últimos Registros Detalhados", secao_style))
    dados_tabela_acionamentos = [
        ["Data / Hora", "Botão", "Categoria", "Origem", "Dispositivo"]
    ]

    ultimos_acionamentos = acionamentos[:20] if acionamentos else []
    for ac in ultimos_acionamentos:
        dt = extrair_data_acionamento(ac).strftime("%d/%m/%Y %H:%M:%S")
        botao = str(ac.get("botao_nome") or ac.get("botao") or "Botão")
        cat = str(ac.get("categoria_nome") or ac.get("categoria") or "Geral")
        origem = str(ac.get("origem") or "dispositivo").capitalize()
        disp = str(ac.get("dispositivo") or "ESP32 C.A.S.A.")[:15]
        dados_tabela_acionamentos.append([dt, botao, cat, origem, disp])

    if len(dados_tabela_acionamentos) == 1:
        dados_tabela_acionamentos.append(["Nenhum acionamento registrado", "-", "-", "-", "-"])

    tabela_registros = Table(dados_tabela_acionamentos, colWidths=[120, 110, 110, 80, 100])
    tabela_registros.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E293B")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
    ]))
    elementos.append(tabela_registros)

    doc.build(elementos)
    return buffer.getvalue()
