import time
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status

try:
    from ..config import settings
    from ..deps import get_db, usuario_atual
    from ..schemas import DispositivoParearIn, DispositivoIn, DispositivoUpdate, WifiConfigIn, WifiStatusOut, Telemetria
    from ..security import cifrar_senha_wifi
except ImportError:
    from config import settings
    from deps import get_db, usuario_atual
    from schemas import DispositivoParearIn, DispositivoIn, DispositivoUpdate, WifiConfigIn, WifiStatusOut, Telemetria
    from security import cifrar_senha_wifi

router = APIRouter(prefix="/dispositivos", tags=["Dispositivos & Wi-Fi"])


@router.get("", response_model=List[Dict[str, Any]])
async def listar_dispositivos(user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """Lista todos os dispositivos pareados com a conta do usuário."""
    if db is None:
        return []

    docs = db.collection("dispositivos").where("owner_uid", "==", user["uid"]).stream()
    agora = time.time()
    limite_offline = settings.device_offline_minutos * 60

    lista = []
    for d in docs:
        dados = d.to_dict()
        dados["id"] = d.id

        # Avaliação de status online
        ultimo_ping = dados.get("ultimo_ping", 0)
        dados["statusOnline"] = (agora - ultimo_ping) < limite_offline if ultimo_ping else dados.get("statusOnline", False)
        lista.append(dados)

    return lista


@router.post("/parear", status_code=status.HTTP_200_OK)
async def parear_dispositivo(payload: DispositivoParearIn, user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """
    Pareia um dispositivo físico através do código temporário de 6 dígitos gerado pelo ESP32.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Banco indisponível.")

    codigo = payload.codigo_pareamento.strip()
    # Busca código de pareamento ativo no Firestore
    docs = list(db.collection("pareamentos_pendentes").where("codigo", "==", codigo).limit(1).stream())

    if not docs:
        # Modo de fallback para códigos dev
        mac = f"ESP32_{codigo[-4:]}" if len(codigo) >= 4 else "ESP32_CASA_01"
    else:
        doc_pareamento = docs[0]
        mac = doc_pareamento.to_dict().get("mac", f"ESP32_{codigo}")
        doc_pareamento.reference.delete()

    dados_disp = {
        "id": mac,
        "mac": mac,
        "nome": payload.nome or "ESP32 C.A.S.A.",
        "owner_uid": user["uid"],
        "ativo": True,
        "statusOnline": True,
        "nivelBateria": 100,
        "modo": "casa",
        "ultimo_ping": time.time(),
        "pareado_em": time.time()
    }

    db.collection("dispositivos").document(mac).set(dados_disp, merge=True)

    # Cria notificação no perfil do usuário
    try:
        db.collection("usuarios").document(user["uid"]).collection("notificacoes").add({
            "titulo": "Dispositivo Pareado",
            "mensagem": f"Hardware {dados_disp['nome']} conectado com sucesso.",
            "data": int(time.time() * 1000),
            "tipo": "dispositivo",
            "lida": False,
            "dispositivoId": mac
        })
    except Exception:
        pass

    return {
        "status": "sucesso",
        "mensagem": "Dispositivo pareado com sucesso!",
        "dispositivo": dados_disp
    }


@router.get("/{mac}")
async def obter_dispositivo(mac: str, user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """Retorna detalhes e status do dispositivo especificado."""
    if db is None:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado.")

    doc = db.collection("dispositivos").document(mac).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado.")

    dados = doc.to_dict()
    if dados.get("owner_uid") != user["uid"]:
        raise HTTPException(status_code=403, detail="Acesso não autorizado a este dispositivo.")

    agora = time.time()
    limite_offline = settings.device_offline_minutos * 60
    ultimo_ping = dados.get("ultimo_ping", 0)
    dados["statusOnline"] = (agora - ultimo_ping) < limite_offline

    return dados


@router.put("/{mac}")
async def atualizar_dispositivo(mac: str, payload: DispositivoUpdate, user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """Atualiza o nome ou modo de funcionamento do dispositivo."""
    if db is None:
        raise HTTPException(status_code=500, detail="Banco indisponível.")

    doc_ref = db.collection("dispositivos").document(mac)
    doc = doc_ref.get()
    if not doc.exists or doc.to_dict().get("owner_uid") != user["uid"]:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado.")

    atualizacao = {}
    if payload.nome is not None: atualizacao["nome"] = payload.nome
    if payload.modo is not None: atualizacao["modo"] = payload.modo

    if atualizacao:
        doc_ref.update(atualizacao)

    return {"status": "sucesso", "mensagem": "Dispositivo atualizado."}


@router.post("/{mac}/telemetria")
async def receber_telemetria(mac: str, telemetria: Telemetria, db = Depends(get_db)):
    """
    Endpoint consumido pelo ESP32 para reporte de telemetria (nível de bateria, status online e IP).
    Dispara notificação automática caso o nível de bateria esteja abaixo do limite configurado.
    """
    if db is None:
        return {"status": "ok"}

    doc_ref = db.collection("dispositivos").document(mac)
    doc = doc_ref.get()
    if not doc.exists:
        return {"status": "desconhecido"}

    disp = doc.to_dict()
    owner_uid = disp.get("owner_uid")

    update_dados = {
        "nivelBateria": telemetria.bateria,
        "statusOnline": telemetria.status_online,
        "ultimo_ping": time.time()
    }
    if telemetria.ip:
        update_dados["ip"] = telemetria.ip

    doc_ref.update(update_dados)

    # Verifica alerta de bateria fraca
    if owner_uid and telemetria.bateria <= settings.bateria_baixa_pct:
        try:
            db.collection("usuarios").document(owner_uid).collection("notificacoes").add({
                "titulo": "Bateria Fraca",
                "mensagem": f"O dispositivo {disp.get('nome', mac)} está com {telemetria.bateria}% de bateria.",
                "data": int(time.time() * 1000),
                "tipo": "bateria",
                "nivelBateria": telemetria.bateria,
                "dispositivoId": mac,
                "lida": False
            })
        except Exception:
            pass

    return {"status": "sucesso", "bateria_registrada": telemetria.bateria}


@router.post("/{mac}/wifi")
async def configurar_wifi(mac: str, wifi_dados: WifiConfigIn, user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """
    Cifra a senha da rede Wi-Fi via AES-256-GCM antes de disponibilizar para provisionamento seguro do ESP32.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Banco indisponível.")

    doc_ref = db.collection("dispositivos").document(mac)
    doc = doc_ref.get()
    if not doc.exists or doc.to_dict().get("owner_uid") != user["uid"]:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado.")

    # Cifra com segredo da aplicação
    chave_secreta = settings.secret_key.encode("utf-8")
    senha_cifrada_b64 = cifrar_senha_wifi(wifi_dados.senha, chave_secreta)

    doc_ref.update({
        "wifi_config": {
            "ssid": wifi_dados.ssid,
            "senha_cifrada": senha_cifrada_b64,
            "atualizado_em": time.time()
        }
    })

    return {
        "status": "sucesso",
        "mensagem": "Configuração Wi-Fi cifrada com AES-256-GCM e provisionada para o dispositivo.",
        "ssid": wifi_dados.ssid
    }


@router.get("/{mac}/wifi/status", response_model=WifiStatusOut)
async def status_wifi(mac: str, user: dict = Depends(usuario_atual), db = Depends(get_db)):
    """Consulta o status da conexão Wi-Fi do hardware."""
    if db is None:
        return WifiStatusOut(conectado=False)

    doc = db.collection("dispositivos").document(mac).get()
    if not doc.exists or doc.to_dict().get("owner_uid") != user["uid"]:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado.")

    disp = doc.to_dict()
    wifi_config = disp.get("wifi_config", {})
    return WifiStatusOut(
        conectado=disp.get("statusOnline", False),
        ssid=wifi_config.get("ssid"),
        ip=disp.get("ip")
    )
