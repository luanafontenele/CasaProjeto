import re
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


# ==========================================
# 1. MODELOS DE USUÁRIO E PERFIL
# ==========================================

class PerfilIn(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100, description="Nome completo do usuário")


class CadastroIn(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100, description="Nome do usuário")
    email: EmailStr = Field(..., description="E-mail de cadastro")
    senha: str = Field(..., min_length=8, description="Senha de acesso")

    @field_validator("senha")
    @classmethod
    def validar_complexidade_senha(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("A senha deve possuir no mínimo 8 caracteres.")
        if not re.search(r"[A-Z]", v):
            raise ValueError("A senha deve conter ao menos uma letra maiúscula.")
        if not re.search(r"[\d\W_]", v):
            raise ValueError("A senha deve conter ao menos um número ou caractere especial.")
        return v


class ConfirmarIn(BaseModel):
    email: EmailStr = Field(..., description="E-mail que recebeu o código de confirmação")
    codigo: str = Field(..., min_length=4, max_length=8, description="Código de validação recebido")


class ReenviarIn(BaseModel):
    email: EmailStr = Field(..., description="E-mail para reenvio do código")


# ==========================================
# 2. MODELOS DE DISPOSITIVOS E WI-FI
# ==========================================

class DispositivoParearIn(BaseModel):
    codigo_pareamento: str = Field(..., description="Código de pareamento exibido no display do ESP32")
    nome: Optional[str] = Field("ESP32 C.A.S.A.", description="Nome descritivo para identificação do hardware")


class DispositivoIn(BaseModel):
    mac: str = Field(..., description="Endereço MAC físico do dispositivo")
    nome: str = Field(..., description="Nome do dispositivo")


class DispositivoUpdate(BaseModel):
    nome: Optional[str] = Field(None, description="Nome atualizado")
    modo: Optional[str] = Field(None, description="Modo de operação: 'casa', 'offline', 'manutencao'")


class WifiConfigIn(BaseModel):
    ssid: str = Field(..., min_length=1, max_length=64, description="Nome da rede Wi-Fi (SSID)")
    senha: str = Field(..., max_length=64, description="Senha da rede Wi-Fi")


class WifiStatusOut(BaseModel):
    conectado: bool
    ssid: Optional[str] = None
    ip: Optional[str] = None


class Telemetria(BaseModel):
    mac: str = Field(..., description="MAC do dispositivo")
    bateria: int = Field(..., ge=0, le=100, description="Percentual da bateria (0 a 100)")
    status_online: Optional[bool] = Field(True, description="Indicação de conexão ativa")
    ultimo_clique: Optional[int] = Field(None, description="Timestamp milissegundos do último clique")
    ip: Optional[str] = Field(None, description="Endereço IP local na rede")


# ==========================================
# 3. MODELOS DE CATEGORIAS E BOTÕES
# ==========================================

class CategoriaIn(BaseModel):
    nome: str = Field(..., min_length=1, max_length=50, description="Nome da categoria")
    cor: Optional[str] = Field("#2563EB", description="Cor hexadecimal de destaque")
    icone: Optional[str] = Field(None, description="Identificador ou URL de ícone padrão")


class BotaoIn(BaseModel):
    rotulo: str = Field(..., min_length=1, max_length=50, description="Rótulo principal do botão")
    significado: Optional[str] = Field(None, description="Texto falado ou significado estendido")
    ordem: Optional[int] = Field(0, description="Posição de ordenação dentro da categoria")
    imagem_id: Optional[str] = Field(None, description="ID da imagem processada em /midias")
    audio_id: Optional[str] = Field(None, description="ID do áudio processado em /midias")


class BotaoUpdate(BaseModel):
    rotulo: Optional[str] = Field(None, min_length=1, max_length=50)
    significado: Optional[str] = None
    ordem: Optional[int] = None
    imagem_id: Optional[str] = None
    audio_id: Optional[str] = None


class OrdemIn(BaseModel):
    ordem: List[str] = Field(..., description="Lista ordenada de IDs de categorias ou botões")
