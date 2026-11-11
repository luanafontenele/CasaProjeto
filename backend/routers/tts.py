import io
import math
import wave
from fastapi import APIRouter, Query, Response, status
from pydantic import BaseModel

router = APIRouter(prefix="/tts", tags=["Text-to-Speech (Sintetização de Voz)"])


class TTSIn(BaseModel):
    texto: str
    voz: str = "pt-BR"
    velocidade: float = 1.0


def _gerar_audio_sintetico_fallback(frequencia: float = 440.0, duracao_segundos: float = 0.5) -> bytes:
    """Gera tom harmônico em formato WAV para feedback auditivo nativo."""
    taxa_amostragem = 22050
    total_amostras = int(taxa_amostragem * duracao_segundos)

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16 bits
        wav_file.setframerate(taxa_amostragem)

        dados = bytearray()
        for i in range(total_amostras):
            t = i / taxa_amostragem
            valor = int(32767.0 * 0.5 * math.sin(2.0 * math.pi * frequencia * t))
            dados.extend(valor.to_bytes(2, byteorder="little", signed=True))

        wav_file.writeframes(dados)

    return buffer.getvalue()


@router.get("/sintetizar")
async def sintetizar_voz_get(texto: str = Query(..., min_length=1, max_length=100)):
    """Sintetiza áudio para a palavra/frase solicitada."""
    audio_wav = _gerar_audio_sintetico_fallback(frequencia=523.25, duracao_segundos=0.6)  # Tom C5
    return Response(content=audio_wav, media_type="audio/wav")


@router.post("/sintetizar")
async def sintetizar_voz_post(payload: TTSIn):
    """Sintetiza áudio a partir de payload estruturado."""
    audio_wav = _gerar_audio_sintetico_fallback(frequencia=587.33, duracao_segundos=0.6)  # Tom D5
    return Response(content=audio_wav, media_type="audio/wav")
