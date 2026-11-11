from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    firebase_credentials: str = ""  # vazio = credenciais padrão do Google (GOOGLE_APPLICATION_CREDENTIALS)
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    require_email_verified: bool = True
    max_categorias: int = 3
    max_botoes_por_categoria: int = 5
    bateria_baixa_pct: int = 20
    device_offline_minutos: int = 10
    timezone: str = "America/Sao_Paulo"
    # Segredo usado no hash dos códigos de e-mail. TROQUE em produção (openssl rand -hex 32)
    secret_key: str = "dev-troque-esta-chave"
    # Cadastro com código por e-mail
    codigo_validade_minutos: int = 15
    codigo_max_tentativas: int = 5
    codigo_reenvio_segundos: int = 60
    smtp_host: str = ""          # vazio = modo desenvolvimento: o código aparece só no terminal
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "C.A.S.A. <nao-responder@casa.local>"
    smtp_tls: bool = True
    # Mídia (imagens/áudios dos botões) — gravada em disco no servidor
    upload_dir: str = "./uploads"
    max_imagem_mb: int = 5
    max_audio_mb: int = 5
    imagem_lado_px: int = 240    # telas TFT ST7789 do aparelho
    max_midias_por_usuario: int = 200

settings = Settings()
