import io
import os
import shutil
import subprocess
from typing import Optional, Tuple
from PIL import Image, ImageDraw, ImageFont

try:
    from .config import settings
except ImportError:
    from config import settings

TAMANHO_BLOCO_FIRESTORE = 196608  # 192 KB (192 * 1024 bytes)


def garantir_pasta():
    """Garante a existência do diretório físico de uploads."""
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(os.path.join(settings.upload_dir, "midias"), exist_ok=True)


def processar_imagem_240(conteudo_bytes: bytes) -> bytes:
    """
    Processa imagem para o formato estrito do ESP32 (display ST7789):
    - Redimensionamento e corte para exatamente 240x240 pixels (RGB).
    - JPEG Baseline (não-progressivo, subsampling 4:2:0, qualidade 85).
    """
    with Image.open(io.BytesIO(conteudo_bytes)) as img:
        img = img.convert("RGB")

        # Central Crop e Resize mantendo proporção
        largura, altura = img.size
        menor_lado = min(largura, altura)
        left = (largura - menor_lado) // 2
        top = (altura - menor_lado) // 2
        right = left + menor_lado
        bottom = top + menor_lado

        img_cortada = img.crop((left, top, right, bottom))
        img_redimensionada = img_cortada.resize(
            (settings.imagem_lado_px, settings.imagem_lado_px),
            Image.Resampling.LANCZOS
        )

        saida_buffer = io.BytesIO()
        img_redimensionada.save(
            saida_buffer,
            format="JPEG",
            quality=85,
            progressive=False,
            subsampling="4:2:0",
            optimize=True
        )
        return saida_buffer.getvalue()


def processar_audio_mp3(conteudo_bytes: bytes, extensao_original: str = ".m4a") -> bytes:
    """
    Processa áudio para conformidade com hardware embarcado:
    - Converte formatos (WebM, OGG, WAV, M4A) para MP3 Mono (22.05 kHz, 64 kbps).
    - Otimiza arquivos que ultrapassem 500 KB via ffmpeg.
    """
    if len(conteudo_bytes) <= 500 * 1024 and extensao_original.lower() in [".mp3"]:
        return conteudo_bytes

    ffmpeg_bin = shutil.which("ffmpeg")
    if not ffmpeg_bin:
        # Se ffmpeg não estiver no PATH do sistema, retorna o áudio original
        return conteudo_bytes

    try:
        processo = subprocess.Popen(
            [
                ffmpeg_bin,
                "-y",
                "-i", "pipe:0",
                "-ac", "1",           # Mono
                "-ar", "22050",       # 22.05 kHz
                "-b:a", "64k",        # 64 kbps
                "-f", "mp3",
                "pipe:1"
            ],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout_data, _ = processo.communicate(input=conteudo_bytes)
        if processo.returncode == 0 and len(stdout_data) > 0:
            return stdout_data
    except Exception:
        pass

    return conteudo_bytes


def gerar_imagem_padrao(texto: str, cor_fundo: str = "#2563EB") -> bytes:
    """
    Gera uma imagem de fallback centralizada com texto (240x240 pixels)
    para botões sem imagem customizada enviada.
    """
    tamanho = (settings.imagem_lado_px, settings.imagem_lado_px)
    imagem = Image.new("RGB", tamanho, color=cor_fundo)
    draw = ImageDraw.Draw(imagem)

    # Fonte padrão interna do Pillow
    fonte = ImageFont.load_default()

    texto_abreviado = (texto[:18] + "..") if len(texto) > 18 else texto

    # Centralização do texto
    bbox = draw.textbbox((0, 0), texto_abreviado, font=fonte)
    largura_txt = bbox[2] - bbox[0]
    altura_txt = bbox[3] - bbox[1]
    pos_x = (tamanho[0] - largura_txt) // 2
    pos_y = (tamanho[1] - altura_txt) // 2

    draw.text((pos_x, pos_y), texto_abreviado, fill="white", font=fonte)

    saida = io.BytesIO()
    imagem.save(saida, format="JPEG", quality=85, progressive=False, subsampling="4:2:0")
    return saida.getvalue()


def salvar_arquivo_midia(
    arquivo_id: str,
    conteudo: bytes,
    extensao: str,
    tipo_midia: str,
    db = None
) -> Tuple[str, int]:
    """
    Persiste arquivo físico no diretório local ./uploads/midias
    e espelha blocos binários de 192 KB no Firestore na coleção
    arquivos_midia/{arquivo_id}/blocos/{indice:04d}.
    """
    garantir_pasta()
    nome_arquivo = f"{arquivo_id}{extensao}"
    caminho_local = os.path.join(settings.upload_dir, "midias", nome_arquivo)

    # 1. Gravação Física em Disco
    with open(caminho_local, "wb") as f:
        f.write(conteudo)

    tamanho_total = len(conteudo)

    # 2. Espelhamento em Blocos de 192 KB no Cloud Firestore
    if db is not None:
        try:
            doc_ref = db.collection("arquivos_midia").document(arquivo_id)
            doc_ref.set({
                "id": arquivo_id,
                "nome_arquivo": nome_arquivo,
                "tipo_midia": tipo_midia,
                "tamanho_bytes": tamanho_total,
                "tamanho_bloco": TAMANHO_BLOCO_FIRESTORE,
                "total_blocos": (tamanho_total + TAMANHO_BLOCO_FIRESTORE - 1) // TAMANHO_BLOCO_FIRESTORE
            })

            blocos_col = doc_ref.collection("blocos")
            offset = 0
            indice = 0
            while offset < tamanho_total:
                fatia = conteudo[offset:offset + TAMANHO_BLOCO_FIRESTORE]
                doc_bloco_id = f"{indice:04d}"
                blocos_col.document(doc_bloco_id).set({
                    "indice": indice,
                    "dados": fatia
                })
                offset += TAMANHO_BLOCO_FIRESTORE
                indice += 1
        except Exception as e:
            # Não quebra o salvamento local caso as regras do Firestore bloqueiem
            pass

    return caminho_local, tamanho_total


def obter_arquivo_midia(arquivo_id: str, extensao: str = "", db = None) -> Optional[bytes]:
    """
    Recupera os bytes do arquivo:
    Prioridade 1: Disco local em ./uploads/midias/{arquivo_id}{extensao}
    Prioridade 2: Reconstrução a partir dos blocos fatiados no Cloud Firestore.
    """
    pasta_midias = os.path.join(settings.upload_dir, "midias")
    if extensao:
        caminho_local = os.path.join(pasta_midias, f"{arquivo_id}{extensao}")
        if os.path.exists(caminho_local):
            with open(caminho_local, "rb") as f:
                return f.read()

    # Procura arquivo com qualquer extensão no disco local
    if os.path.exists(pasta_midias):
        for nome in os.listdir(pasta_midias):
            if nome.startswith(arquivo_id):
                with open(os.path.join(pasta_midias, nome), "rb") as f:
                    return f.read()

    # Reconstrução a partir do Firestore caso não esteja em disco
    if db is not None:
        try:
            doc_ref = db.collection("arquivos_midia").document(arquivo_id)
            blocos_docs = doc_ref.collection("blocos").order_by("indice").stream()
            partes = []
            for b in blocos_docs:
                dados_bloco = b.to_dict().get("dados")
                if dados_bloco:
                    partes.append(dados_bloco)
            if partes:
                conteudo_recuperado = b"".join(partes)
                # Salva em cache local para próximas leituras rápidas
                salvar_arquivo_midia(arquivo_id, conteudo_recuperado, extensao or ".bin", "reconstruido", None)
                return conteudo_recuperado
        except Exception:
            pass

    return None
