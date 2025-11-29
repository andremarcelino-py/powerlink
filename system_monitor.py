#!/usr/bin/env python3
"""
Script para monitorar e enviar dados do sistema (CPU, RAM) via MQTT
para o ESP32 com display OLED.

Requisitos:
    pip install paho-mqtt psutil

Uso:
    python system_monitor.py
"""

import json
import time
import paho.mqtt.client as mqtt
import psutil

# Configuração MQTT
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
MQTT_TOPIC = "home/automacao/esp32/system/data"
UPDATE_INTERVAL = 2  # Enviar dados a cada 2 segundos

def get_system_data():
    """Coleta dados do sistema"""
    # CPU
    cpu_percent = psutil.cpu_percent(interval=1)
    
    # RAM
    memory = psutil.virtual_memory()
    ram_percent = memory.percent
    
    return {
        "cpu": round(cpu_percent, 1),
        "ram": round(ram_percent, 1)
    }

def on_connect(client, userdata, flags, rc):
    """Callback quando conecta ao broker MQTT"""
    if rc == 0:
        print(f"Conectado ao broker MQTT: {MQTT_BROKER}")
    else:
        print(f"Falha ao conectar. Código: {rc}")

def main():
    """Função principal"""
    # Criar cliente MQTT
    client = mqtt.Client()
    client.on_connect = on_connect
    
    try:
        # Conectar ao broker
        print(f"Conectando ao broker MQTT: {MQTT_BROKER}:{MQTT_PORT}")
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
        
        print(f"Enviando dados do sistema para o tópico: {MQTT_TOPIC}")
        print("Pressione Ctrl+C para parar\n")
        
        while True:
            # Coletar dados do sistema
            data = get_system_data()
            
            # Converter para JSON
            json_data = json.dumps(data)
            
            # Publicar no MQTT
            result = client.publish(MQTT_TOPIC, json_data, qos=0)
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                print(f"Enviado: {json_data}")
            else:
                print(f"Erro ao enviar: {result.rc}")
            
            # Aguardar antes de enviar novamente
            time.sleep(UPDATE_INTERVAL)
            
    except KeyboardInterrupt:
        print("\n\nInterrompido pelo usuário")
    except Exception as e:
        print(f"\nErro: {e}")
    finally:
        client.loop_stop()
        client.disconnect()
        print("Desconectado do broker MQTT")

if __name__ == "__main__":
    main()

