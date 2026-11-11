import base64
import hashlib
import hmac
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

try:
    from .config import settings
except ImportError:
    from config import settings


def hash_codigo(email: str, codigo: str) -> str:
    """Gera hash HMAC SHA-256 para validação segura de código enviado por e-mail."""
    chave = settings.secret_key.encode("utf-8")
    mensagem = f"{email.lower().strip()}:{codigo.strip()}".encode("utf-8")
    return hmac.new(chave, mensagem, hashlib.sha256).hexdigest()


def codigo_confere(email: str, codigo: str, hash_esperado: str) -> bool:
    """Verifica em tempo constante se o código informado confere com o hash esperado."""
    calculado = hash_codigo(email, codigo)
    return hmac.compare_digest(calculado, hash_esperado)


def _preparar_chave_aes256(chave_bytes: bytes) -> bytes:
    """Garante que a chave de criptografia possua exatamente 32 bytes (AES-256)."""
    if len(chave_bytes) == 32:
        return chave_bytes
    return hashlib.sha256(chave_bytes).digest()


def cifrar_senha_wifi(senha: str, chave_bytes: bytes) -> str:
    """
    Cifra a senha de rede Wi-Fi usando AES-256-GCM com nonce aleatório de 12 bytes.
    Retorna a concatenação (nonce + ciphertext + auth_tag) codificada em Base64.
    """
    chave_final = _preparar_chave_aes256(chave_bytes)
    aesgcm = AESGCM(chave_final)
    nonce = os.urandom(12)  # Nonce/IV recomendado de 12 bytes para GCM
    texto_puro = senha.encode("utf-8")
    ciphertext = aesgcm.encrypt(nonce, texto_puro, None)
    payload = nonce + ciphertext
    return base64.b64encode(payload).decode("ascii")


def decifrar_senha_wifi(payload_b64: str, chave_bytes: bytes) -> str:
    """
    Decifra payload Base64 contendo nonce de 12 bytes + ciphertext cifrado via AES-256-GCM.
    Retorna a senha em texto puro.
    """
    chave_final = _preparar_chave_aes256(chave_bytes)
    aesgcm = AESGCM(chave_final)
    dados = base64.b64decode(payload_b64)
    if len(dados) < 12:
        raise ValueError("Payload cifrado inválido: tamanho insuficiente.")
    nonce = dados[:12]
    ciphertext = dados[12:]
    texto_puro = aesgcm.decrypt(nonce, ciphertext, None)
    return texto_puro.decode("utf-8")
