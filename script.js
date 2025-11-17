// Firebase Configuration - SUBSTITUA COM SUAS CREDENCIAIS
const firebaseConfig = {
  apiKey: "AIzaSyDmAiRk8OfK4AHdE1NIziACSUxDcMLcrS8",
  authDomain: "powerlinkquadro.firebaseapp.com",
  databaseURL: "https://powerlinkquadro-default-rtdb.firebaseio.com",
  projectId: "powerlinkquadro",
  storageBucket: "powerlinkquadro.firebasestorage.app",
  messagingSenderId: "1092141418844",
  appId: "1:1092141418844:web:d8b462b8c9341223bdd999",
  measurementId: "G-RZS591VH3T"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// MQTT Configuration
const WS_URL = 'wss://broker.hivemq.com:8884/mqtt'; 
const TOPIC_BASE = 'home/automacao/esp32';

const T = {
  setSubwoofer: `${TOPIC_BASE}/subwoofer/set`,
  stateSubwoofer: `${TOPIC_BASE}/subwoofer/state`,
  setSpeakerEsq: `${TOPIC_BASE}/speaker_esq/set`,
  stateSpeakerEsq: `${TOPIC_BASE}/speaker_esq/state`,
  setSpeakerDir: `${TOPIC_BASE}/speaker_dir/set`,
  stateSpeakerDir: `${TOPIC_BASE}/speaker_dir/state`,
  setSala: `${TOPIC_BASE}/sala/set`,
  stateSala: `${TOPIC_BASE}/sala/state`,
  ledSet: `${TOPIC_BASE}/led/set`,
  ledState: `${TOPIC_BASE}/led/state`,
  // Switches físicos
  switchState: `${TOPIC_BASE}/switch/state`, // Estado de todos os switches (JSON)
  switchSet: `${TOPIC_BASE}/switch/set`, // Comando para um switch específico
  switch1State: `${TOPIC_BASE}/switch/1/state`,
  switch2State: `${TOPIC_BASE}/switch/2/state`,
  switch3State: `${TOPIC_BASE}/switch/3/state`,
  switch4State: `${TOPIC_BASE}/switch/4/state`,
  switch5State: `${TOPIC_BASE}/switch/5/state`,
  switch6State: `${TOPIC_BASE}/switch/6/state`,
  switch7State: `${TOPIC_BASE}/switch/7/state`,
  switch8State: `${TOPIC_BASE}/switch/8/state`,
  // Dados do sistema
  systemData: `${TOPIC_BASE}/system/data`,
};

const el = (id) => document.getElementById(id);

// Estado da aplicação
const state = {
  subwoofer: undefined,
  speakerEsq: undefined,
  speakerDir: undefined,
  sala: undefined,
  led: { mode: 'solid', color: '#FFFFFF', brightness: 128 },
  switches: {
    1: false, // Subwoofer
    2: false, // Luz da sala
    3: false, // Speaker Esquerdo
    4: false, // Speaker Direito
    5: false, // Ligar/desligar fita LED
    6: false, // Modo rainbow fita LED
    7: false, // Cena 1
    8: false  // Cena 2
  },
  switchScenes: {
    7: null, // ID da cena para switch 7
    8: null  // ID da cena para switch 8
  },
  auth: {
    isAuthenticated: false,
    userType: null, // 'master' | 'user' | null
    expiresAt: null,
    currentKey: null
  },
  devicesBlocked: {
    subwoofer: false,
    speaker_esquerdo: false,
    speaker_direito: false,
    lampada_sala: false,
    fita_led: false
  },
  systemData: {
    cpu: 0,
    ram: 0,
    temp: 0,
    ssd: 0,
    lastUpdate: null
  }
};

// MQTT Client
let client;

// Função para conectar MQTT
function connect() {
  const clientId = `web-ui-${Math.random().toString(16).slice(2)}`;
  client = mqtt.connect(WS_URL, { clientId, clean: true, reconnectPeriod: 2000 });

  client.on('connect', () => {
    setConn(true);
    client.subscribe([
      T.stateSubwoofer, 
      T.stateSpeakerEsq, 
      T.stateSpeakerDir,
      T.stateSala, 
      T.ledState,
      T.switchState,
      T.switch1State,
      T.switch2State,
      T.switch3State,
      T.switch4State,
      T.switch5State,
      T.switch6State,
      T.switch7State,
      T.switch8State,
      T.systemData
    ]);
  });

  client.on('reconnect', () => setConn(false));
  client.on('offline', () => setConn(false));
  client.on('error', () => setConn(false));

  client.on('message', (topic, payload) => {
    const msg = payload.toString();
    if (topic === T.stateSubwoofer) {
      state.subwoofer = msg;
      el('stateSubwoofer').textContent = msg;
      const checked = msg.toLowerCase() === 'on';
      const t = el('toggleSubwoofer');
      if (t && t.checked !== checked) t.checked = checked;
      logDeviceChange('subwoofer', msg, 'fisico');
    } else if (topic === T.stateSpeakerEsq) {
      state.speakerEsq = msg;
      el('stateSpeakerEsq').textContent = msg;
      const checked = msg.toLowerCase() === 'on';
      const t = el('toggleSpeakerEsq');
      if (t && t.checked !== checked) t.checked = checked;
      logDeviceChange('speaker_esquerdo', msg, 'fisico');
    } else if (topic === T.stateSpeakerDir) {
      state.speakerDir = msg;
      el('stateSpeakerDir').textContent = msg;
      const checked = msg.toLowerCase() === 'on';
      const t = el('toggleSpeakerDir');
      if (t && t.checked !== checked) t.checked = checked;
      logDeviceChange('speaker_direito', msg, 'fisico');
    } else if (topic === T.stateSala) {
      state.sala = msg;
      el('stateSala').textContent = msg;
      const checked = msg.toLowerCase() === 'on';
      const t = el('toggleSala');
      if (t && t.checked !== checked) t.checked = checked;
      logDeviceChange('lampada_sala', msg, 'fisico');
    } else if (topic === T.ledState) {
      try {
        const j = JSON.parse(msg);
        state.led = j;
        if (j.mode) {
          el('ledMode').value = j.mode;
          el('ledModeState').textContent = j.mode;
        }
        if (j.color) {
          el('ledColor').value = j.color;
          el('ledColorState').textContent = j.color.toUpperCase();
          const sw = el('ledSwatch');
          if (sw) sw.style.background = j.color;
        }
        if (typeof j.brightness === 'number') {
          el('ledBri').value = j.brightness;
          el('briVal').textContent = j.brightness;
          el('ledBriState').textContent = j.brightness;
        }
        logDeviceChange('fita_led', JSON.stringify(j), 'fisico');
      } catch (_) {}
    } else if (topic.startsWith(`${TOPIC_BASE}/switch/`)) {
      // Processar estado dos switches físicos
      handleSwitchState(topic, msg);
    } else if (topic === T.systemData) {
      // Processar dados do sistema
      try {
        const data = JSON.parse(msg);
        state.systemData = {
          cpu: data.cpu || 0,
          ram: data.ram || 0,
          lastUpdate: new Date()
        };
        updateSystemDataDisplay();
      } catch (e) {
        console.error('Erro ao processar dados do sistema:', e);
      }
    }
  });
}

// Atualizar status de conexão
function setConn(connected) {
  const node = el('connStatus');
  if (!node) return;
  node.classList.toggle('status--connected', connected);
  node.classList.toggle('status--disconnected', !connected);
  node.textContent = connected ? 'MQTT: conectado' : 'MQTT: desconectado';
}

// Processar estado dos switches físicos
function handleSwitchState(topic, payload) {
  const msg = payload.toString();
  let switchNum = null;
  
  // Determinar qual switch baseado no tópico
  if (topic === T.switchState) {
    // Estado de todos os switches em JSON
    try {
      const switchesData = JSON.parse(msg);
      Object.keys(switchesData).forEach(num => {
        const numInt = parseInt(num);
        if (numInt >= 1 && numInt <= 8) {
          updateSwitchState(numInt, switchesData[num] === true || switchesData[num] === 'on' || switchesData[num] === 1, true);
        }
      });
    } catch (e) {
      console.error('Erro ao processar estado dos switches:', e);
    }
    return;
  } else if (topic.endsWith('/state')) {
    // Tópico individual: home/automacao/esp32/switch/X/state
    const match = topic.match(/switch\/(\d+)\/state$/);
    if (match) {
      switchNum = parseInt(match[1]);
    }
  }
  
  if (switchNum && switchNum >= 1 && switchNum <= 8) {
    const isOn = msg === 'on' || msg === '1' || msg === 'true';
    updateSwitchState(switchNum, isOn, true); // true = veio do switch físico
  }
}

// Atualizar estado de um switch e acionar dispositivo correspondente
function updateSwitchState(switchNum, isOn, fromPhysical = true) {
  const previousState = state.switches[switchNum];
  state.switches[switchNum] = isOn;
  
  // Atualizar apenas o status (toggles foram removidos)
  const switchStatus = el(`switch${switchNum}Status`);
  if (switchStatus) {
    switchStatus.textContent = isOn ? 'Ligado' : 'Desligado';
    switchStatus.className = `state ${isOn ? 'state-on' : 'state-off'}`;
  }
  
  // Acionar dispositivo correspondente apenas se veio do switch físico
  // e o estado mudou
  if (fromPhysical && previousState !== isOn) {
    if (isOn) {
      handleSwitchAction(switchNum, true);
    } else {
      handleSwitchAction(switchNum, false);
    }
  }
}

// Acionar dispositivo baseado no switch
function handleSwitchAction(switchNum, turnOn) {
  switch (switchNum) {
    case 1: // Subwoofer
      if (publish(T.setSubwoofer, turnOn ? 'on' : 'off', 'switch', 'subwoofer')) {
        el('stateSubwoofer').textContent = turnOn ? 'on' : 'off';
        const toggle = el('toggleSubwoofer');
        if (toggle) toggle.checked = turnOn;
        logDeviceChange('subwoofer', turnOn ? 'on' : 'off', 'switch');
      }
      break;
    case 2: // Luz da sala
      if (publish(T.setSala, turnOn ? 'on' : 'off', 'switch', 'lampada_sala')) {
        el('stateSala').textContent = turnOn ? 'on' : 'off';
        const toggle = el('toggleSala');
        if (toggle) toggle.checked = turnOn;
        logDeviceChange('lampada_sala', turnOn ? 'on' : 'off', 'switch');
      }
      break;
    case 3: // Speaker Esquerdo
      if (publish(T.setSpeakerEsq, turnOn ? 'on' : 'off', 'switch', 'speaker_esquerdo')) {
        el('stateSpeakerEsq').textContent = turnOn ? 'on' : 'off';
        const toggle = el('toggleSpeakerEsq');
        if (toggle) toggle.checked = turnOn;
        logDeviceChange('speaker_esquerdo', turnOn ? 'on' : 'off', 'switch');
      }
      break;
    case 4: // Speaker Direito
      if (publish(T.setSpeakerDir, turnOn ? 'on' : 'off', 'switch', 'speaker_direito')) {
        el('stateSpeakerDir').textContent = turnOn ? 'on' : 'off';
        const toggle = el('toggleSpeakerDir');
        if (toggle) toggle.checked = turnOn;
        logDeviceChange('speaker_direito', turnOn ? 'on' : 'off', 'switch');
      }
      break;
    case 5: // Ligar/desligar fita LED
      const ledMode = turnOn ? 'solid' : 'off';
      const ledColor = el('ledColor')?.value || '#FFFFFF';
      const ledBrightness = parseInt(el('ledBri')?.value || 128);
      const ledPayload = JSON.stringify({
        mode: ledMode,
        color: ledColor.toUpperCase(),
        brightness: ledBrightness
      });
      if (publish(T.ledSet, ledPayload, 'switch', 'fita_led')) {
        el('ledMode').value = ledMode;
        el('ledModeState').textContent = ledMode;
        logDeviceChange('fita_led', ledPayload, 'switch');
      }
      break;
    case 6: // Modo rainbow fita LED
      if (turnOn) {
        const ledBrightnessRainbow = parseInt(el('ledBri')?.value || 128);
        const ledPayloadRainbow = JSON.stringify({
          mode: 'rainbow',
          color: '#FFFFFF',
          brightness: ledBrightnessRainbow
        });
        if (publish(T.ledSet, ledPayloadRainbow, 'switch', 'fita_led')) {
          el('ledMode').value = 'rainbow';
          el('ledModeState').textContent = 'rainbow';
          logDeviceChange('fita_led', ledPayloadRainbow, 'switch');
        }
      } else {
        // Quando desligar o switch rainbow, voltar para modo sólido com cor atual
        const ledColor = el('ledColor')?.value || '#FFFFFF';
        const ledBrightness = parseInt(el('ledBri')?.value || 128);
        const ledPayloadSolid = JSON.stringify({
          mode: 'solid',
          color: ledColor.toUpperCase(),
          brightness: ledBrightness
        });
        if (publish(T.ledSet, ledPayloadSolid, 'switch', 'fita_led')) {
          el('ledMode').value = 'solid';
          el('ledModeState').textContent = 'solid';
          logDeviceChange('fita_led', ledPayloadSolid, 'switch');
        }
      }
      break;
    case 7: // Cena 1
      if (turnOn && state.switchScenes[7]) {
        executeScene(state.switchScenes[7]);
      }
      break;
    case 8: // Cena 2
      if (turnOn && state.switchScenes[8]) {
        executeScene(state.switchScenes[8]);
      }
      break;
  }
}

// Enviar comando para um switch físico
function setSwitch(switchNum, state) {
  const payload = JSON.stringify({
    switch: switchNum,
    state: state ? 'on' : 'off'
  });
  publish(`${TOPIC_BASE}/switch/set`, payload, 'web');
}

// Mapeamento de nomes de dispositivos para exibição
const deviceNames = {
  'subwoofer': 'Subwoofer',
  'speaker_esquerdo': 'Speaker Esquerdo',
  'speaker_direito': 'Speaker Direito',
  'lampada_sala': 'Lâmpada Sala',
  'fita_led': 'Fita LED'
};

// Publicar mensagem MQTT
function publish(topic, payload, source = 'web', deviceName = null) {
  if (!client) {
    console.error('MQTT client não inicializado');
    return false;
  }
  
  if (!client.connected) {
    console.error('MQTT client não conectado. Estado:', client.connected);
    return false;
  }
  
  // Verificar bloqueio individual do dispositivo
  if (deviceName && state.devicesBlocked[deviceName] && state.auth.userType !== 'master') {
    const displayName = deviceNames[deviceName] || deviceName;
    console.log(`Dispositivo bloqueado: ${deviceName}, UserType: ${state.auth.userType}, Blocked: ${state.devicesBlocked[deviceName]}`);
    showDeviceBlockedModal(displayName);
    return false;
  }
  
  try {
    const result = client.publish(topic, payload, { qos: 0, retain: false }, (error) => {
      if (error) {
        console.error(`Erro ao publicar ${topic}:`, error);
      } else {
        console.log(`Publicado com sucesso: ${topic} = ${payload}`);
      }
    });
    
    // client.publish retorna um Packet ou false
    if (result === false) {
      console.error(`Falha ao publicar: ${topic} - buffer cheio ou desconectado`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Exceção ao publicar ${topic}:`, error);
    return false;
  }
}

// Sistema de Autenticação
async function checkMasterKey(key) {
  try {
    const snapshot = await database.ref('keys/master').once('value');
    const masterKey = snapshot.val();
    return masterKey === key;
  } catch (error) {
    console.error('Erro ao verificar chave mestre:', error);
    return false;
  }
}

async function checkTemporaryKey(key) {
  try {
    const snapshot = await database.ref('keys/temporary').once('value');
    const tempKeys = snapshot.val() || {};
    const keyData = tempKeys[key];
    
    if (!keyData) return null;
    
    // Chaves mestres não expiram
    if (keyData.type === 'master') {
      return keyData;
    }
    
    // Verificar expiração para chaves de usuário e convidado
    const now = Date.now();
    if (keyData.expiresAt < now) {
      // Remover chave expirada
      await database.ref(`keys/temporary/${key}`).remove();
      return null;
    }
    
    return keyData;
  } catch (error) {
    console.error('Erro ao verificar chave temporária:', error);
    return null;
  }
}

async function login(key) {
  if (!key || key.trim() === '') {
    showError('Digite uma chave de acesso');
    return;
  }

  // Verificar chave mestre
  const isMaster = await checkMasterKey(key);
  if (isMaster) {
    state.auth.isAuthenticated = true;
    state.auth.userType = 'master';
    state.auth.currentKey = key;
    showMasterView();
    loadLogs();
    loadBlockedState();
    loadSwitchScenes();
    initSchedules();
    initScenes();
    return;
  }

  // Verificar chave temporária
  const keyData = await checkTemporaryKey(key);
  if (keyData) {
    state.auth.isAuthenticated = true;
    // Chaves 'guest' são tratadas como 'user' para controle de acesso
    state.auth.userType = keyData.type === 'guest' ? 'user' : keyData.type;
    state.auth.expiresAt = keyData.expiresAt;
    state.auth.currentKey = key;
    showUserView();
    loadLogs();
    loadBlockedState(); // Carregar estado de bloqueio também para usuários comuns
    loadSwitchScenes();
    startTimer();
    initSchedules();
    initScenes();
    return;
  }

  showError('Chave inválida ou expirada');
}


function showMasterView() {
  el('loginView').style.display = 'none';
  el('userView').style.display = 'none';
  el('masterView').style.display = 'block';
  el('logsPanel').style.display = 'block';
  // Painel de bloqueio será mostrado apenas na aba de Automação
  updateBlockDevicesPanelVisibility();
  // Mostrar painel de geração de chaves para usuários mestres
  el('keyGenerationPanel').style.display = 'block';
  // Mostrar conteúdo principal e esconder página de login
  showMainContent();
}

function showUserView() {
  el('loginView').style.display = 'none';
  el('masterView').style.display = 'none';
  el('userView').style.display = 'block';
  el('logsPanel').style.display = 'block';
  // Esconder painel de bloqueio para usuários comuns
  el('blockDevicesPanel').style.display = 'none';
  // Esconder painel de geração de chaves para usuários comuns
  el('keyGenerationPanel').style.display = 'none';
  // Mostrar conteúdo principal e esconder página de login
  showMainContent();
}

// Atualizar visibilidade do painel de bloqueio baseado na aba ativa
function updateBlockDevicesPanelVisibility() {
  const automationPage = el('automationPage');
  const blockPanel = el('blockDevicesPanel');
  
  if (!blockPanel) return;
  
  const isAutomationActive = automationPage && automationPage.style.display !== 'none';
  
  if (state.auth.userType === 'master' && isAutomationActive) {
    blockPanel.style.display = 'block';
  } else {
    blockPanel.style.display = 'none';
  }
}

function showLoginView() {
  el('loginView').style.display = 'block';
  el('masterView').style.display = 'none';
  el('userView').style.display = 'none';
  el('logsPanel').style.display = 'none';
  state.auth.isAuthenticated = false;
  state.auth.userType = null;
  state.auth.expiresAt = null;
  state.auth.currentKey = null;
  // Mostrar página de login e esconder conteúdo principal
  showLoginPage();
}

function showLoginPage() {
  el('loginPage').style.display = 'flex';
  el('mainContent').style.display = 'none';
  el('mainHeader').style.display = 'none';
  el('mainFooter').style.display = 'none';
}

function showMainContent() {
  el('loginPage').style.display = 'none';
  el('mainContent').style.display = 'grid';
  el('mainHeader').style.display = 'block';
  el('mainFooter').style.display = 'block';
  // Focar no campo de acesso se necessário (para acessibilidade)
  el('accessKey').blur();
}

function showError(message) {
  const errorEl = el('loginError');
  errorEl.textContent = message;
  errorEl.style.display = 'block';
  setTimeout(() => {
    errorEl.style.display = 'none';
  }, 3000);
}

async function generateTemporaryKey(type, durationMinutes = null) {
  // Gerar chave de 3 dígitos (000-999)
  const key = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  
  try {
    const keyData = {
      type: type,
      createdAt: Date.now(),
      createdBy: state.auth.currentKey
    };
    
    // Se for chave mestre, não tem expiração
    if (type === 'master') {
      // Chaves mestres não expiram (100 anos no futuro para garantir)
      keyData.expiresAt = Date.now() + (100 * 365 * 24 * 60 * 60 * 1000);
    } else if (type === 'guest') {
      // Chaves de convidado expiram em 2 minutos
      keyData.expiresAt = Date.now() + (2 * 60 * 1000);
    } else {
      // Chaves de usuário expiram em 5 minutos (ou duração especificada)
      const duration = durationMinutes || 5;
      keyData.expiresAt = Date.now() + (duration * 60 * 1000);
    }
    
    await database.ref(`keys/temporary/${key}`).set(keyData);
    
    return key;
  } catch (error) {
    console.error('Erro ao gerar chave:', error);
    throw error;
  }
}

async function generateKeyFromControlPanel() {
  const keyType = el('controlKeyType').value;
  const keyInput = el('controlGeneratedKey');
  const statusEl = el('controlKeyStatus');
  
  if (!keyType) {
    if (statusEl) {
      statusEl.textContent = 'Selecione um tipo de chave';
      statusEl.style.color = 'var(--bad)';
      statusEl.style.display = 'block';
    }
    return;
  }
  
  try {
    const key = await generateTemporaryKey(keyType);
    
    if (keyInput) {
      keyInput.value = key;
      keyInput.select();
      document.execCommand('copy');
    }
    
    if (statusEl) {
      if (keyType === 'master') {
        statusEl.textContent = 'Chave mestre gerada e copiada! Esta chave não expira.';
        statusEl.style.color = 'var(--ok)';
      } else if (keyType === 'guest') {
        statusEl.textContent = 'Chave de convidado gerada e copiada! Válida por 2 minutos.';
        statusEl.style.color = 'var(--ok)';
      } else {
        statusEl.textContent = 'Chave gerada e copiada! Válida por 5 minutos.';
        statusEl.style.color = 'var(--ok)';
      }
      statusEl.style.display = 'block';
    }
  } catch (error) {
    if (statusEl) {
      statusEl.textContent = 'Erro ao gerar chave. Tente novamente.';
      statusEl.style.color = 'var(--bad)';
      statusEl.style.display = 'block';
    }
  }
}

function startTimer() {
  if (!state.auth.expiresAt) return;
  
  const updateTimer = () => {
    const now = Date.now();
    const remaining = state.auth.expiresAt - now;
    
    if (remaining <= 0) {
      alert('Sua sessão expirou');
      logout();
      return;
    }
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    el('timeRemaining').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };
  
  updateTimer();
  setInterval(updateTimer, 1000);
}

function logout() {
  showLoginView();
  el('accessKey').value = '';
}

async function loadBlockedState() {
  try {
    // Carregar estado inicial
    const snapshot = await database.ref('settings/devicesBlocked').once('value');
    const blocked = snapshot.val() || {};
    state.devicesBlocked = {
      subwoofer: blocked.subwoofer || false,
      speaker_esquerdo: blocked.speaker_esquerdo || false,
      speaker_direito: blocked.speaker_direito || false,
      lampada_sala: blocked.lampada_sala || false,
      fita_led: blocked.fita_led || false
    };
    
    console.log('Estado de bloqueio carregado:', state.devicesBlocked);
    
    // Atualizar toggle se houver dispositivo selecionado
    updateBlockDeviceUI();
    
    // Adicionar listener em tempo real para atualizar estado quando mudar
    database.ref('settings/devicesBlocked').on('value', (snapshot) => {
      const blocked = snapshot.val() || {};
      state.devicesBlocked = {
        subwoofer: blocked.subwoofer || false,
        speaker_esquerdo: blocked.speaker_esquerdo || false,
        speaker_direito: blocked.speaker_direito || false,
        lampada_sala: blocked.lampada_sala || false,
        fita_led: blocked.fita_led || false
      };
      console.log('Estado de bloqueio atualizado:', state.devicesBlocked);
      updateBlockDeviceUI();
    });
  } catch (error) {
    console.error('Erro ao carregar estado de bloqueio:', error);
  }
}

async function toggleBlockDevice(deviceName, blocked) {
  try {
    state.devicesBlocked[deviceName] = blocked;
    await database.ref(`settings/devicesBlocked/${deviceName}`).set(blocked);
    console.log(`Dispositivo ${deviceName} ${blocked ? 'bloqueado' : 'desbloqueado'}`);
    updateBlockDeviceStatus();
  } catch (error) {
    console.error('Erro ao atualizar bloqueio:', error);
  }
}

// Atualizar UI do bloqueio quando dispositivo é selecionado
function updateBlockDeviceUI() {
  const deviceSelect = el('blockDeviceSelect');
  const controls = el('blockDeviceControls');
  const toggle = el('toggleBlockDevice');
  const status = el('blockDeviceStatus');
  
  if (!deviceSelect || !controls || !toggle || !status) return;
  
  const selectedDevice = deviceSelect.value;
  
  if (selectedDevice) {
    controls.style.display = 'block';
    const isBlocked = state.devicesBlocked[selectedDevice] || false;
    toggle.checked = isBlocked;
    updateBlockDeviceStatus();
  } else {
    controls.style.display = 'none';
  }
}

// Atualizar status do bloqueio
function updateBlockDeviceStatus() {
  const deviceSelect = el('blockDeviceSelect');
  const status = el('blockDeviceStatus');
  
  if (!deviceSelect || !status) return;
  
  const selectedDevice = deviceSelect.value;
  if (!selectedDevice) return;
  
  const isBlocked = state.devicesBlocked[selectedDevice] || false;
  const deviceDisplay = deviceNames[selectedDevice] || selectedDevice;
  
  if (isBlocked) {
    status.textContent = `${deviceDisplay} está BLOQUEADO. Apenas usuários mestres podem fazer alterações.`;
    status.style.color = 'var(--bad)';
  } else {
    status.textContent = `${deviceDisplay} está LIBERADO. Todos os usuários podem fazer alterações.`;
    status.style.color = 'var(--ok)';
  }
}

// Sistema de Logs
function logDeviceChange(device, deviceState, source) {
  if (!state.auth.isAuthenticated) return;
  
  const now = new Date();
  const logEntry = {
    device: device,
    state: deviceState,
    source: source, // 'web' ou 'fisico'
    userType: state.auth.userType || 'sistema', // 'master' ou 'user'
    timestamp: now.toISOString(),
    date: String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0'),
    hour: String(now.getHours()).padStart(2, '0'),
    minute: String(now.getMinutes()).padStart(2, '0'),
    userKey: state.auth.currentKey ? state.auth.currentKey.substring(0, 8) + '...' : 'sistema'
  };
  
  try {
    database.ref('logs').push(logEntry);
  } catch (error) {
    console.error('Erro ao salvar log:', error);
  }
}

function loadLogs() {
  const logsRef = database.ref('logs').orderByChild('timestamp').limitToLast(20);
  
  logsRef.on('value', (snapshot) => {
    const logs = [];
    snapshot.forEach((child) => {
      logs.push({ id: child.key, ...child.val() });
    });
    
    logs.reverse(); // Mais recentes primeiro
    displayLogs(logs);
  });
}

// Função auxiliar para escapar CSV
function escapeCSV(value) {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  // Se contém vírgula, quebra de linha ou aspas, precisa ser envolvido em aspas
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

// Função para formatar estado de forma legível
function formatState(state, device) {
  if (!state) return 'Desconhecido';
  
  if (state === 'on') return 'Ligado';
  if (state === 'off') return 'Desligado';
  
  // Se for JSON (LED)
  if (typeof state === 'string' && state.startsWith('{')) {
    try {
      const parsed = JSON.parse(state);
      if (parsed.mode === 'off') return 'Desligado';
      if (parsed.mode === 'solid') {
        const color = parsed.color || '#FFFFFF';
        const brightness = parsed.brightness !== undefined ? ` (${Math.round((parsed.brightness / 255) * 100)}%)` : '';
        return `Sólido - ${color.toUpperCase()}${brightness}`;
      }
      if (parsed.mode === 'rainbow') {
        const brightness = parsed.brightness !== undefined ? ` (${Math.round((parsed.brightness / 255) * 100)}%)` : '';
        return `Arco-íris${brightness}`;
      }
      return `LED - ${parsed.mode || 'Desconhecido'}`;
    } catch (e) {
      return state;
    }
  }
  
  return state;
}

// Exportar logs para CSV
async function exportLogsToCSV() {
  try {
    // Buscar todos os logs (sem limite)
    const logsRef = database.ref('logs').orderByChild('timestamp');
    const snapshot = await logsRef.once('value');
    
    const logs = [];
    snapshot.forEach((child) => {
      logs.push({ id: child.key, ...child.val() });
    });
    
    if (logs.length === 0) {
      alert('Nenhum log disponível para exportar.');
      return;
    }
    
    // Ordenar por timestamp (mais antigo primeiro para CSV)
    logs.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeA - timeB;
    });
    
    // Criar cabeçalho CSV com colunas melhoradas (usando ponto e vírgula para Excel)
    const separator = ';';
    const headers = [
      'Data Completa',
      'Data',
      'Hora',
      'Dispositivo',
      'Estado Formatado',
      'Estado Original',
      'Fonte',
      'Tipo de Usuário',
      'Chave do Usuário',
      'Timestamp ISO'
    ];
    const csvRows = [headers.map(h => escapeCSV(h)).join(separator)];
    
    // Adicionar dados
    logs.forEach(log => {
      const deviceDisplay = deviceNames[log.device] || log.device;
      
      // Formatar data completa
      let dateTime = '';
      let date = '';
      let time = '';
      
      if (log.timestamp) {
        try {
          const logDate = new Date(log.timestamp);
          dateTime = logDate.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          date = logDate.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          time = logDate.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
        } catch (e) {
          dateTime = log.date || '--/--';
          date = log.date || '--/--';
          time = log.hour && log.minute ? `${log.hour}:${log.minute}` : '--:--';
        }
      } else {
        date = log.date || '--/--';
        const hour = log.hour || '--';
        const minute = log.minute || '--';
        time = `${hour}:${minute}`;
        dateTime = `${date} ${time}`;
      }
      
      // Formatar estado
      const stateFormatted = formatState(log.state, log.device);
      const stateOriginal = typeof log.state === 'string' ? log.state : JSON.stringify(log.state);
      
      const source = log.source === 'web' ? 'Web' : log.source === 'fisico' ? 'Físico' : log.source || 'Desconhecido';
      const userType = log.userType === 'master' ? 'Mestre' : log.userType === 'user' ? 'Visitante' : log.userType || 'Sistema';
      const userKey = log.userKey || 'N/A';
      const timestamp = log.timestamp || '';
      
      // Criar linha CSV
      const row = [
        dateTime,
        date,
        time,
        deviceDisplay,
        stateFormatted,
        stateOriginal,
        source,
        userType,
        userKey,
        timestamp
      ];
      
      csvRows.push(row.map(cell => escapeCSV(cell)).join(separator));
    });
    
    // Criar conteúdo CSV
    const csvContent = csvRows.join('\n');
    
    // Criar blob e fazer download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM para Excel
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const now = new Date();
    const fileName = `logs_${now.toISOString().split('T')[0]}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.csv`;
    
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert(`Logs exportados com sucesso! ${logs.length} registro(s) exportado(s).`);
  } catch (error) {
    console.error('Erro ao exportar logs:', error);
    alert('Erro ao exportar logs. Verifique o console para mais detalhes.');
  }
}

function displayLogs(logs) {
  const container = el('logsContainer');
  if (!container) return;
  
  if (logs.length === 0) {
    container.innerHTML = '<div class="state">Nenhum log disponível</div>';
    return;
  }
  
  // Agrupar logs por data
  const logsByDate = {};
  logs.forEach(log => {
    // Se não tiver data, tentar extrair do timestamp
    let date = log.date;
    if (!date && log.timestamp) {
      try {
        const logDate = new Date(log.timestamp);
        date = String(logDate.getDate()).padStart(2, '0') + '/' + String(logDate.getMonth() + 1).padStart(2, '0');
      } catch (e) {
        date = '--/--';
      }
    }
    if (!date) date = '--/--';
    
    if (!logsByDate[date]) {
      logsByDate[date] = [];
    }
    logsByDate[date].push(log);
  });
  
  // Ordenar datas (mais recente primeiro)
  const sortedDates = Object.keys(logsByDate).sort((a, b) => {
    if (a === '--/--') return 1;
    if (b === '--/--') return -1;
    const [dayA, monthA] = a.split('/').map(Number);
    const [dayB, monthB] = b.split('/').map(Number);
    if (monthA !== monthB) return monthB - monthA;
    return dayB - dayA;
  });
  
  // Renderizar logs agrupados por data
  container.innerHTML = sortedDates.map(date => {
    const dateLogs = logsByDate[date];
    return `
      <div class="log-date-group">
        <div class="log-date-header">${date}</div>
        <div class="log-date-content">
          ${dateLogs.map(log => {
            const deviceDisplay = deviceNames[log.device] || log.device;
            const hour = log.hour || '--';
            const minute = log.minute || '--';
            const isOn = log.state === 'on' || (typeof log.state === 'string' && (log.state.includes('"mode"') || log.state.includes('rainbow') || log.state.includes('solid')));
            const stateLabel = log.state === 'on' ? 'ON' : log.state === 'off' ? 'OFF' : 'LED';
            const sourceIcon = log.source === 'web' ? '🌐' : '🔌';
            const userTypeIcon = log.userType === 'master' ? '👑' : '👤';
            const userTypeLabel = log.userType === 'master' ? 'Mestre' : 'Visitante';
            return `
              <div class="log-entry-compact">
                <span class="log-time-compact">${hour}:${minute}</span>
                <span class="log-device-compact">${deviceDisplay}</span>
                <span class="log-state-compact ${isOn ? 'state-on' : 'state-off'}">${stateLabel}</span>
                <span class="log-source-compact" title="${log.source === 'web' ? 'Web' : 'Físico'}">${sourceIcon}</span>
                <span class="log-user-compact" title="${userTypeLabel}">${userTypeIcon}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// Sistema de Automação
let schedules = {};
let scenes = {};

// Navegação entre abas
function initTabs() {
  const tabControl = el('tabControl');
  const tabAutomation = el('tabAutomation');
  const controlPage = el('controlPage');
  const automationPage = el('automationPage');
  
  tabControl.addEventListener('click', () => {
    tabControl.classList.add('active');
    tabAutomation.classList.remove('active');
    controlPage.style.display = 'contents';
    automationPage.style.display = 'none';
    updateBlockDevicesPanelVisibility();
  });
  
  tabAutomation.addEventListener('click', () => {
    // Verificar se o usuário está autenticado
    if (!state.auth.isAuthenticated) {
      showLoginRequiredModal();
      return;
    }
    
    tabAutomation.classList.add('active');
    tabControl.classList.remove('active');
    controlPage.style.display = 'none';
    automationPage.style.display = 'contents';
    updateBlockDevicesPanelVisibility();
  });
}

// Modal de login necessário
function showLoginRequiredModal() {
  const modal = el('loginRequiredModal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeLoginRequiredModal() {
  const modal = el('loginRequiredModal');
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

// Modal de dispositivo bloqueado
function showDeviceBlockedModal(deviceName) {
  const modal = el('deviceBlockedModal');
  const messageEl = el('deviceBlockedMessage');
  if (messageEl) {
    messageEl.textContent = `O dispositivo "${deviceName}" está bloqueado. Apenas usuários mestres podem fazer alterações.`;
  }
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function closeDeviceBlockedModal() {
  const modal = el('deviceBlockedModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// Agendamentos
function initSchedules() {
  // Preencher seletores de hora, minuto e AM/PM
  const hourSelect = el('scheduleHour');
  const minuteSelect = el('scheduleMinute');
  
  // Horas: 1-12 (formato AM/PM)
  for (let h = 1; h <= 12; h++) {
    const option = document.createElement('option');
    option.value = String(h);
    option.textContent = String(h);
    hourSelect.appendChild(option);
  }
  
  // Minutos: 00-59 (todos os minutos)
  for (let m = 0; m < 60; m++) {
    const option = document.createElement('option');
    option.value = String(m).padStart(2, '0');
    option.textContent = String(m).padStart(2, '0');
    minuteSelect.appendChild(option);
  }
  
  // Mostrar/ocultar campo de cor baseado no dispositivo
  el('scheduleDevice').addEventListener('change', (e) => {
    const isLed = e.target.value === 'fita_led';
    el('scheduleColorContainer').style.display = isLed ? 'block' : 'none';
  });
  
  // Sincronizar color picker com input hex
  el('scheduleColor').addEventListener('input', (e) => {
    el('scheduleColorHex').value = e.target.value.toUpperCase();
  });
  
  el('scheduleColorHex').addEventListener('input', (e) => {
    const hex = e.target.value;
    if (/^#[0-9A-F]{6}$/i.test(hex)) {
      el('scheduleColor').value = hex;
    }
  });
  
  // Carregar agendamentos do Firebase
  const schedulesRef = database.ref('schedules');
  schedulesRef.on('value', (snapshot) => {
    schedules = snapshot.val() || {};
    displaySchedules();
  });
  
  // Event listeners
  el('btnAddSchedule').addEventListener('click', () => {
    el('scheduleModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });
  
  el('closeScheduleModal').addEventListener('click', closeScheduleModal);
  el('cancelSchedule').addEventListener('click', closeScheduleModal);
  
  // Toggle entre data específica e dias da semana
  el('scheduleType').addEventListener('change', (e) => {
    const isDate = e.target.value === 'date';
    el('scheduleDateContainer').style.display = isDate ? 'block' : 'none';
    el('scheduleWeekdaysContainer').style.display = isDate ? 'none' : 'block';
  });
  
  el('saveSchedule').addEventListener('click', () => {
    const device = el('scheduleDevice').value;
    const action = el('scheduleAction').value;
    const hour = el('scheduleHour').value;
    const minute = el('scheduleMinute').value;
    const amPm = el('scheduleAmPm').value;
    const enabled = el('scheduleEnabled').checked;
    const scheduleType = el('scheduleType').value;
    
    if (!hour || !minute) {
      alert('Selecione a hora e o minuto.');
      return;
    }
    
    // Converter para formato 24h
    let hour24 = parseInt(hour);
    if (amPm === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (amPm === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    const time = `${String(hour24).padStart(2, '0')}:${minute}`;
    
    let schedule = {
      device,
      action,
      time,
      enabled,
      type: scheduleType,
      createdAt: new Date().toISOString()
    };
    
    // Adicionar cor se for fita LED
    if (device === 'fita_led' && action === 'on') {
      schedule.color = el('scheduleColor').value;
    }
    
    if (scheduleType === 'date') {
      const date = el('scheduleDate').value;
      if (!date) {
        alert('Selecione uma data.');
        return;
      }
      schedule.date = date;
    } else {
      const weekdays = Array.from(document.querySelectorAll('.weekdays input[type="checkbox"]:checked')).map(cb => parseInt(cb.value));
      if (weekdays.length === 0) {
        alert('Selecione pelo menos um dia da semana.');
        return;
      }
      schedule.weekdays = weekdays;
    }
    
    database.ref('schedules').push(schedule);
    closeScheduleModal();
  });
  
  // Verificar agendamentos a cada minuto
  setInterval(checkSchedules, 60000);
  setInterval(updateScheduleNotification, 60000); // Atualizar notificação a cada minuto
  checkSchedules(); // Verificar imediatamente
  updateScheduleNotification(); // Atualizar notificação imediatamente
}

function closeScheduleModal() {
  el('scheduleModal').style.display = 'none';
  document.body.style.overflow = '';
  // Reset form
  el('scheduleDevice').value = 'fita_led';
  el('scheduleAction').value = 'on';
  el('scheduleHour').value = '';
  el('scheduleMinute').value = '';
  el('scheduleAmPm').value = 'AM';
  el('scheduleDate').value = '';
  el('scheduleType').value = 'weekly';
  el('scheduleEnabled').checked = true;
  el('scheduleColor').value = '#FFFFFF';
  el('scheduleColorHex').value = '#FFFFFF';
  el('scheduleColorContainer').style.display = 'block';
  el('scheduleDateContainer').style.display = 'none';
  el('scheduleWeekdaysContainer').style.display = 'block';
  document.querySelectorAll('.weekdays input[type="checkbox"]').forEach(cb => cb.checked = false);
}

function displaySchedules() {
  const container = el('schedulesList');
  const scheduleEntries = Object.entries(schedules);
  
  if (scheduleEntries.length === 0) {
    container.innerHTML = '<div class="state">Nenhum agendamento criado</div>';
    updateScheduleNotification();
    return;
  }
  
  container.innerHTML = scheduleEntries.map(([id, schedule]) => {
    const deviceName = deviceNames[schedule.device] || schedule.device;
    const actionLabel = schedule.action === 'on' ? 'Ligar' : 'Desligar';
    
    // Converter horário 24h para 12h AM/PM
    let timeDisplay = schedule.time;
    if (schedule.time) {
      const [hour, minute] = schedule.time.split(':');
      const hour24 = parseInt(hour);
      let hour12 = hour24;
      let amPm = 'AM';
      
      if (hour24 === 0) {
        hour12 = 12;
      } else if (hour24 === 12) {
        amPm = 'PM';
      } else if (hour24 > 12) {
        hour12 = hour24 - 12;
        amPm = 'PM';
      }
      
      timeDisplay = `${hour12}:${minute} ${amPm}`;
    }
    
    let scheduleInfo = '';
    if (schedule.type === 'date' && schedule.date) {
      const date = new Date(schedule.date + 'T' + schedule.time);
      const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      scheduleInfo = `Data: ${dateStr} às ${timeDisplay}`;
      if (schedule.device === 'fita_led' && schedule.color) {
        scheduleInfo += ` (Cor: ${schedule.color})`;
      }
    } else if (schedule.weekdays && schedule.weekdays.length > 0) {
      const weekdaysLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const selectedDays = schedule.weekdays.map(d => weekdaysLabels[d]).join(', ');
      scheduleInfo = `Dias: ${selectedDays} às ${timeDisplay}`;
      if (schedule.device === 'fita_led' && schedule.color) {
        scheduleInfo += ` (Cor: ${schedule.color})`;
      }
    } else {
      scheduleInfo = `Horário: ${timeDisplay}`;
      if (schedule.device === 'fita_led' && schedule.color) {
        scheduleInfo += ` (Cor: ${schedule.color})`;
      }
    }
    
    return `
      <div class="schedule-item">
        <div class="schedule-item-info">
          <div class="schedule-item-title">${deviceName} - ${actionLabel}</div>
          <div class="schedule-item-details">${scheduleInfo} | ${schedule.enabled ? 'Ativo' : 'Inativo'}</div>
        </div>
        <div class="schedule-item-actions">
          <button class="btn btn-small" onclick="toggleSchedule('${id}')">${schedule.enabled ? 'Desativar' : 'Ativar'}</button>
          <button class="btn btn-small btn-secondary" onclick="deleteSchedule('${id}')">Excluir</button>
        </div>
      </div>
    `;
  }).join('');
  
  updateScheduleNotification();
}

window.toggleSchedule = function(id) {
  database.ref(`schedules/${id}/enabled`).set(!schedules[id].enabled);
};

window.deleteSchedule = function(id) {
  if (confirm('Deseja excluir este agendamento?')) {
    database.ref(`schedules/${id}`).remove();
  }
};

function checkSchedules() {
  const now = new Date();
  const currentDay = now.getDay();
  const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  
  Object.entries(schedules).forEach(([id, schedule]) => {
    if (!schedule.enabled) return;
    if (schedule.time !== currentTime) return;
    
    // Verificar se é agendamento de data específica
    if (schedule.type === 'date') {
      if (schedule.date !== currentDate) return;
    } else {
      // Agendamento recorrente - verificar dia da semana
      if (!schedule.weekdays || !schedule.weekdays.includes(currentDay)) return;
    }
    
    // Executar ação
    if (schedule.device === 'fita_led') {
      if (schedule.action === 'on') {
        const color = schedule.color || '#FFFFFF';
        publish(T.ledSet, JSON.stringify({ mode: 'solid', color: color, brightness: 100 }), 'automacao', 'fita_led');
      } else {
        publish(T.ledSet, JSON.stringify({ mode: 'off' }), 'automacao', 'fita_led');
      }
    } else {
      // Mapear dispositivo para o tópico correto
      const topicMap = {
        'subwoofer': T.setSubwoofer,
        'speaker_esquerdo': T.setSpeakerEsq,
        'speaker_direito': T.setSpeakerDir,
        'lampada_sala': T.setSala
      };
      const topic = topicMap[schedule.device];
      if (topic) {
        publish(topic, schedule.action, 'automacao', schedule.device);
      } else {
        console.error(`Dispositivo desconhecido no agendamento: ${schedule.device}`);
      }
    }
    
    logDeviceChange(schedule.device, schedule.action, 'automacao');
  });
  
  updateScheduleNotification();
}

function updateScheduleNotification() {
  const notification = el('scheduleNotification');
  const notificationText = el('scheduleNotificationText');
  if (!notification || !notificationText) return;
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes(); // minutos desde meia-noite
  
  // Encontrar próximos agendamentos (hoje e próximos 7 dias)
  const upcomingSchedules = [];
  
  Object.entries(schedules).forEach(([id, schedule]) => {
    if (!schedule.enabled) return;
    
    const scheduleTime = parseInt(schedule.time.split(':')[0]) * 60 + parseInt(schedule.time.split(':')[1]);
    
    if (schedule.type === 'date') {
      // Agendamento de data específica
      if (schedule.date >= today) {
        const scheduleDate = new Date(schedule.date + 'T' + schedule.time);
        const minutesUntil = Math.floor((scheduleDate - now) / 60000);
        
        if (minutesUntil >= 0 && minutesUntil <= 1440) { // Próximas 24 horas
          upcomingSchedules.push({
            device: deviceNames[schedule.device] || schedule.device,
            action: schedule.action === 'on' ? 'Ligar' : 'Desligar',
            time: schedule.time,
            date: schedule.date,
            minutesUntil
          });
        }
      }
    } else {
      // Agendamento recorrente
      if (schedule.weekdays && schedule.weekdays.includes(currentDay)) {
        // Hoje
        if (scheduleTime >= currentTime) {
          const minutesUntil = scheduleTime - currentTime;
          if (minutesUntil <= 1440) { // Próximas 24 horas
            upcomingSchedules.push({
              device: deviceNames[schedule.device] || schedule.device,
              action: schedule.action === 'on' ? 'Ligar' : 'Desligar',
              time: schedule.time,
              date: 'Hoje',
              minutesUntil
            });
          }
        }
      }
      
      // Próximos dias da semana
      for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
        const futureDay = (currentDay + dayOffset) % 7;
        if (schedule.weekdays && schedule.weekdays.includes(futureDay)) {
          const futureDate = new Date(now);
          futureDate.setDate(now.getDate() + dayOffset);
          const minutesUntil = dayOffset * 1440 + scheduleTime - currentTime;
          
          if (minutesUntil <= 1440) { // Próximas 24 horas
            upcomingSchedules.push({
              device: deviceNames[schedule.device] || schedule.device,
              action: schedule.action === 'on' ? 'Ligar' : 'Desligar',
              time: schedule.time,
              date: futureDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
              minutesUntil
            });
          }
        }
      }
    }
  });
  
  // Ordenar por tempo até execução
  upcomingSchedules.sort((a, b) => a.minutesUntil - b.minutesUntil);
  
  // Mostrar até 3 próximos agendamentos
  const nextSchedules = upcomingSchedules.slice(0, 3);
  
  if (nextSchedules.length > 0) {
    const scheduleTexts = nextSchedules.map(s => {
      let timeText = '';
      if (s.minutesUntil < 60) {
        timeText = `em ${s.minutesUntil} min`;
      } else {
        const hours = Math.floor(s.minutesUntil / 60);
        const mins = s.minutesUntil % 60;
        timeText = `em ${hours}h${mins > 0 ? mins + 'min' : ''}`;
      }
      return `${s.device} ${s.action} ${timeText}`;
    });
    
    notificationText.textContent = scheduleTexts.join(' • ');
    notification.style.display = 'flex';
  } else {
    notification.style.display = 'none';
  }
}

// Cenas
function initScenes() {
  // Carregar cenas do Firebase
  const scenesRef = database.ref('scenes');
  scenesRef.on('value', (snapshot) => {
    scenes = snapshot.val() || {};
    displayScenes();
  });
  
  // Event listeners
  el('btnAddScene').addEventListener('click', () => {
    el('sceneModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    initSceneDevices();
  });
  
  el('closeSceneModal').addEventListener('click', closeSceneModal);
  el('cancelScene').addEventListener('click', closeSceneModal);
  
  el('saveScene').addEventListener('click', () => {
    const name = el('sceneName').value.trim();
    if (!name) {
      alert('Digite um nome para a cena.');
      return;
    }
    
    const devices = {};
    document.querySelectorAll('.scene-device-item').forEach(item => {
      const device = item.querySelector('.scene-device-select').value;
      let action;
      
      if (device === 'fita_led') {
        // Para fita LED, usar cor selecionada
        const color = item.querySelector('.scene-color-picker').value;
        action = JSON.stringify({ mode: 'solid', color: color, brightness: 100 });
      } else {
        // Para outros dispositivos, usar ação on/off
        action = item.querySelector('.scene-device-action').value || 'on';
      }
      
      devices[device] = action;
    });
    
    if (Object.keys(devices).length === 0) {
      alert('Adicione pelo menos um dispositivo à cena.');
      return;
    }
    
    const scene = {
      name,
      devices,
      createdAt: new Date().toISOString()
    };
    
    database.ref('scenes').push(scene);
    closeSceneModal();
  });
}

function initSceneDevices() {
  const container = el('sceneDevices');
  container.innerHTML = '<div class="stack"><button type="button" class="btn btn-small" onclick="addSceneDevice()">+ Adicionar Dispositivo</button></div>';
}

window.addSceneDevice = function() {
  const container = el('sceneDevices');
  const deviceItem = document.createElement('div');
  deviceItem.className = 'scene-device-item';
  deviceItem.innerHTML = `
    <div class="stack" style="flex: 1;">
      <label class="label">Dispositivo</label>
      <select class="scene-device-select input">
        <option value="fita_led">Fita LED</option>
        <option value="subwoofer">Subwoofer</option>
        <option value="speaker_esquerdo">Speaker Esquerdo</option>
        <option value="speaker_direito">Speaker Direito</option>
        <option value="lampada_sala">Lâmpada Sala</option>
      </select>
    </div>
    <div class="scene-device-state" style="flex: 1;">
      <div class="stack scene-device-action-container">
        <label class="label">Ação</label>
        <select class="scene-device-action input">
          <option value="on">Ligar</option>
          <option value="off">Desligar</option>
        </select>
      </div>
      <div class="stack scene-device-color-container" style="display: none;">
        <label class="label">Cor da Fita LED</label>
        <div class="color-picker-inline">
          <input type="color" class="input-color scene-color-picker" value="#FFFFFF" />
          <input type="text" class="input scene-color-hex" placeholder="#FFFFFF" maxlength="7" />
        </div>
      </div>
    </div>
    <div style="display: flex; align-items: flex-end; padding-bottom: 10px;">
      <button type="button" class="btn btn-small btn-secondary" onclick="this.closest('.scene-device-item').remove()">Remover</button>
    </div>
  `;
  
  // Event listener para mudança de dispositivo
  const deviceSelect = deviceItem.querySelector('.scene-device-select');
  const actionContainer = deviceItem.querySelector('.scene-device-action-container');
  const colorContainer = deviceItem.querySelector('.scene-device-color-container');
  
  deviceSelect.addEventListener('change', (e) => {
    const isLed = e.target.value === 'fita_led';
    actionContainer.style.display = isLed ? 'none' : 'block';
    colorContainer.style.display = isLed ? 'block' : 'none';
  });
  
  // Sincronizar color picker com input hex
  const colorPicker = deviceItem.querySelector('.scene-color-picker');
  const colorHex = deviceItem.querySelector('.scene-color-hex');
  
  colorPicker.addEventListener('input', (e) => {
    colorHex.value = e.target.value.toUpperCase();
  });
  
  colorHex.addEventListener('input', (e) => {
    const hex = e.target.value;
    if (/^#[0-9A-F]{6}$/i.test(hex)) {
      colorPicker.value = hex;
    }
  });
  
  container.appendChild(deviceItem);
};

function closeSceneModal() {
  el('sceneModal').style.display = 'none';
  document.body.style.overflow = '';
  el('sceneName').value = '';
  initSceneDevices();
}

function displayScenes() {
  const container = el('scenesList');
  const sceneEntries = Object.entries(scenes);
  
  if (sceneEntries.length === 0) {
    container.innerHTML = '<div class="state">Nenhuma cena criada</div>';
    updateSwitchSceneSelects();
    return;
  }
  
  container.innerHTML = sceneEntries.map(([id, scene]) => {
    const deviceCount = Object.keys(scene.devices).length;
    
    // Verificar se há fita LED com cor definida
    let ledColorInfo = '';
    if (scene.devices.fita_led) {
      try {
        const ledState = JSON.parse(scene.devices.fita_led);
        if (ledState.mode === 'solid' && ledState.color) {
          ledColorInfo = ` | LED: ${ledState.color.toUpperCase()}`;
        }
      } catch (e) {
        // Se não for JSON, não mostrar cor
      }
    }
    
    return `
      <div class="scene-item">
        <div class="scene-item-info">
          <div class="scene-item-title">${scene.name}</div>
          <div class="scene-item-details">${deviceCount} dispositivo(s)${ledColorInfo}</div>
        </div>
        <div class="scene-item-actions">
          <button class="btn btn-small" onclick="executeScene('${id}')">Executar</button>
          <button class="btn btn-small btn-secondary" onclick="deleteScene('${id}')">Excluir</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Atualizar selects dos switches após atualizar lista de cenas
  updateSwitchSceneSelects();
}

// Atualizar selects de cenas para switches 7 e 8
function updateSwitchSceneSelects() {
  const switch7Select = el('switch7Scene');
  const switch8Select = el('switch8Scene');
  
  if (!switch7Select || !switch8Select) return;
  
  const sceneEntries = Object.entries(scenes);
  
  // Limpar e adicionar opção padrão
  switch7Select.innerHTML = '<option value="">Nenhuma cena selecionada</option>';
  switch8Select.innerHTML = '<option value="">Nenhuma cena selecionada</option>';
  
  // Adicionar cenas
  sceneEntries.forEach(([id, scene]) => {
    const option7 = document.createElement('option');
    option7.value = id;
    option7.textContent = scene.name;
    if (id === state.switchScenes[7]) option7.selected = true;
    switch7Select.appendChild(option7);
    
    const option8 = document.createElement('option');
    option8.value = id;
    option8.textContent = scene.name;
    if (id === state.switchScenes[8]) option8.selected = true;
    switch8Select.appendChild(option8);
  });
}

// Carregar configurações dos switches do Firebase
async function loadSwitchScenes() {
  try {
    const snapshot = await database.ref('settings/switchScenes').once('value');
    const switchScenes = snapshot.val() || {};
    state.switchScenes[7] = switchScenes[7] || null;
    state.switchScenes[8] = switchScenes[8] || null;
    updateSwitchSceneSelects();
  } catch (error) {
    console.error('Erro ao carregar configurações dos switches:', error);
  }
}

// Salvar configuração de cena para um switch
async function saveSwitchScene(switchNum, sceneId) {
  try {
    state.switchScenes[switchNum] = sceneId || null;
    await database.ref(`settings/switchScenes/${switchNum}`).set(sceneId || null);
    alert(`Configuração do Switch ${switchNum} salva com sucesso!`);
  } catch (error) {
    console.error('Erro ao salvar configuração do switch:', error);
    alert('Erro ao salvar configuração');
  }
}

window.executeScene = function(id) {
  const scene = scenes[id];
  if (!scene) return;
  
  Object.entries(scene.devices).forEach(([device, action]) => {
    if (device === 'fita_led') {
      try {
        const ledState = JSON.parse(action);
        publish(T.ledSet, JSON.stringify(ledState), 'automacao', 'fita_led');
      } catch {
        publish(T.ledSet, JSON.stringify({ mode: action === 'on' ? 'solid' : 'off', color: '#FFFFFF', brightness: 100 }), 'automacao', 'fita_led');
      }
    } else {
      const topicMap = {
        'subwoofer': T.setSubwoofer,
        'speaker_esquerdo': T.setSpeakerEsq,
        'speaker_direito': T.setSpeakerDir,
        'lampada_sala': T.setSala
      };
      const topic = topicMap[device];
      if (topic) {
        publish(topic, action, 'automacao', device);
      } else {
        console.error(`Dispositivo desconhecido na cena: ${device}`);
      }
    }
    logDeviceChange(device, action, 'automacao');
  });
};

window.deleteScene = function(id) {
  if (confirm('Deseja excluir esta cena?')) {
    database.ref(`scenes/${id}`).remove();
  }
};

// Bloqueio Temporário
function initTemporaryBlocks() {
  // Carregar bloqueios do Firebase
  const blocksRef = database.ref('temporaryBlocks');
  blocksRef.on('value', (snapshot) => {
    temporaryBlocks = snapshot.val() || {};
    displayTemporaryBlocks();
    checkTemporaryBlocks();
  });
  
  // Event listeners - botão será adicionado no HTML
  const btnAddBlock = el('btnAddBlock');
  if (btnAddBlock) {
    btnAddBlock.addEventListener('click', () => {
      el('blockModal').style.display = 'flex';
      document.body.style.overflow = 'hidden';
    });
  }
  
  el('closeBlockModal').addEventListener('click', closeBlockModal);
  el('cancelBlock').addEventListener('click', closeBlockModal);
  
  el('saveBlock').addEventListener('click', () => {
    const device = el('blockDevice').value;
    const duration = parseInt(el('blockDuration').value);
    
    if (!duration || duration < 1) {
      alert('Digite uma duração válida (mínimo 1 minuto).');
      return;
    }
    
    const blockUntil = new Date(Date.now() + duration * 60000).toISOString();
    const block = {
      device,
      duration,
      blockedAt: new Date().toISOString(),
      blockUntil
    };
    
    database.ref('temporaryBlocks').push(block);
    
    // Atualizar bloqueio no estado
    state.devicesBlocked[device] = true;
    database.ref(`settings/devicesBlocked/${device}`).set(true);
    
    closeBlockModal();
  });
  
  // Verificar bloqueios a cada minuto
  setInterval(checkTemporaryBlocks, 60000);
}

function closeBlockModal() {
  el('blockModal').style.display = 'none';
  document.body.style.overflow = '';
  el('blockDevice').value = 'fita_led';
  el('blockDuration').value = '30';
}

function displayTemporaryBlocks() {
  const container = el('temporaryBlocksList');
  const blockEntries = Object.entries(temporaryBlocks).filter(([id, block]) => {
    return new Date(block.blockUntil) > new Date();
  });
  
  if (blockEntries.length === 0) {
    container.innerHTML = '<div class="state">Nenhum bloqueio ativo</div>';
    return;
  }
  
  container.innerHTML = blockEntries.map(([id, block]) => {
    const deviceName = deviceNames[block.device] || block.device;
    const blockUntil = new Date(block.blockUntil);
    const remaining = Math.ceil((blockUntil - new Date()) / 60000);
    
    return `
      <div class="block-item">
        <div class="block-item-info">
          <div class="block-item-title">${deviceName}</div>
          <div class="block-item-details">Bloqueado por ${block.duration} min | Restam ${remaining} min</div>
        </div>
        <div class="block-item-actions">
          <button class="btn btn-small btn-secondary" onclick="removeBlock('${id}')">Remover</button>
        </div>
      </div>
    `;
  }).join('');
}

window.removeBlock = function(id) {
  const block = temporaryBlocks[id];
  if (block) {
    state.devicesBlocked[block.device] = false;
    database.ref(`settings/devicesBlocked/${block.device}`).set(false);
  }
  database.ref(`temporaryBlocks/${id}`).remove();
};

function checkTemporaryBlocks() {
  const now = new Date();
  let hasChanges = false;
  
  Object.entries(temporaryBlocks).forEach(([id, block]) => {
    if (new Date(block.blockUntil) <= now) {
      // Bloqueio expirado
      state.devicesBlocked[block.device] = false;
      database.ref(`settings/devicesBlocked/${block.device}`).set(false);
      database.ref(`temporaryBlocks/${id}`).remove();
      hasChanges = true;
    }
  });
  
  if (hasChanges) {
    displayTemporaryBlocks();
  }
}

// Inicialização
window.addEventListener('DOMContentLoaded', () => {
  // Mostrar página de login inicialmente
  showLoginPage();
  connect();
  initTabs();
  
  // Event listeners de autenticação
  el('btnLogin').addEventListener('click', () => {
    const key = el('accessKey').value.trim();
    login(key);
  });
  
  el('accessKey').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const key = el('accessKey').value.trim();
      login(key);
    }
  });
  
  el('btnGenerateKey').addEventListener('click', () => {
    const type = el('keyType').value;
    generateTemporaryKey(type).then(key => {
      el('generatedKey').value = key;
      el('generatedKey').select();
      document.execCommand('copy');
      if (type === 'master') {
        alert('Chave mestre gerada e copiada! Esta chave não expira.');
      } else {
        alert('Chave gerada e copiada! Válida por 5 minutos.');
      }
    }).catch(error => {
      console.error('Erro ao gerar chave:', error);
      alert('Erro ao gerar chave');
    });
  });
  
  // Event listener para botão de gerar chave no painel de controle
  el('btnGenerateControlKey').addEventListener('click', generateKeyFromControlPanel);
  
  el('btnLogout').addEventListener('click', logout);
  el('btnUserLogout').addEventListener('click', logout);
  
  // Event listener para exportar logs
  el('btnExportLogs').addEventListener('click', exportLogsToCSV);
  
  // Event listeners para modal de login necessário
  el('closeLoginRequiredModal').addEventListener('click', closeLoginRequiredModal);
  el('cancelLoginRequired').addEventListener('click', closeLoginRequiredModal);
  el('goToLogin').addEventListener('click', () => {
    closeLoginRequiredModal();
    // Mostrar página de login
    showLoginPage();
    // Focar no campo de login
    setTimeout(() => {
      el('accessKey').focus();
    }, 100);
  });
  
  // Fechar modal ao clicar no overlay
  const loginRequiredOverlay = el('loginRequiredModal')?.querySelector('.modal-overlay');
  if (loginRequiredOverlay) {
    loginRequiredOverlay.addEventListener('click', closeLoginRequiredModal);
  }
  
  // Event listeners para modal de dispositivo bloqueado
  el('closeDeviceBlockedModal').addEventListener('click', closeDeviceBlockedModal);
  el('closeDeviceBlockedBtn').addEventListener('click', closeDeviceBlockedModal);
  const deviceBlockedOverlay = el('deviceBlockedModal')?.querySelector('.modal-overlay');
  if (deviceBlockedOverlay) {
    deviceBlockedOverlay.addEventListener('click', closeDeviceBlockedModal);
  }
  
  // Fechar modal de login necessário com ESC (já existe listener para colorPickerModal)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const loginModal = el('loginRequiredModal');
      if (loginModal && loginModal.style.display === 'flex') {
        closeLoginRequiredModal();
      }
      const deviceBlockedModal = el('deviceBlockedModal');
      if (deviceBlockedModal && deviceBlockedModal.style.display === 'flex') {
        closeDeviceBlockedModal();
      }
    }
  });
  
  // Event listeners para bloqueio de dispositivos (nova interface)
  const blockDeviceSelect = el('blockDeviceSelect');
  if (blockDeviceSelect) {
    blockDeviceSelect.addEventListener('change', updateBlockDeviceUI);
  }
  
  const toggleBlockDeviceEl = el('toggleBlockDevice');
  if (toggleBlockDeviceEl) {
    toggleBlockDeviceEl.addEventListener('change', (e) => {
      const selectedDevice = blockDeviceSelect.value;
      if (selectedDevice) {
        toggleBlockDevice(selectedDevice, e.target.checked);
      }
    });
  }
  
  // Event listeners para switches físicos - REMOVIDO: switches físicos são apenas para visualização
  // Os switches físicos agora são apenas para mostrar o estado, não podem ser controlados pelo site
  // A função updateSwitchState ainda funciona para atualizar a visualização quando o estado muda fisicamente
  
  // Event listeners para salvar configurações de cenas dos switches
  el('btnSaveSwitch7Scene').addEventListener('click', () => {
    const sceneId = el('switch7Scene').value || null;
    saveSwitchScene(7, sceneId);
  });
  
  el('btnSaveSwitch8Scene').addEventListener('click', () => {
    const sceneId = el('switch8Scene').value || null;
    saveSwitchScene(8, sceneId);
  });

  // Event listeners para dispositivos
  const toggleSubwoofer = el('toggleSubwoofer');
  if (toggleSubwoofer) {
    toggleSubwoofer.addEventListener('change', (e) => {
      const value = e.target.checked ? 'on' : 'off';
      if (publish(T.setSubwoofer, value, 'web', 'subwoofer')) {
        el('stateSubwoofer').textContent = value;
        logDeviceChange('subwoofer', value, 'web');
      } else {
        e.target.checked = !e.target.checked; // Reverter
      }
    });
  }
  
  const toggleSpeakerEsq = el('toggleSpeakerEsq');
  if (toggleSpeakerEsq) {
    toggleSpeakerEsq.addEventListener('change', (e) => {
      const value = e.target.checked ? 'on' : 'off';
      if (publish(T.setSpeakerEsq, value, 'web', 'speaker_esquerdo')) {
        el('stateSpeakerEsq').textContent = value;
        logDeviceChange('speaker_esquerdo', value, 'web');
      } else {
        e.target.checked = !e.target.checked;
      }
    });
  }
  
  const toggleSpeakerDir = el('toggleSpeakerDir');
  if (toggleSpeakerDir) {
    toggleSpeakerDir.addEventListener('change', (e) => {
      const value = e.target.checked ? 'on' : 'off';
      if (publish(T.setSpeakerDir, value, 'web', 'speaker_direito')) {
        el('stateSpeakerDir').textContent = value;
        logDeviceChange('speaker_direito', value, 'web');
      } else {
        e.target.checked = !e.target.checked;
      }
    });
  }
  
  const toggleSala = el('toggleSala');
  if (toggleSala) {
    toggleSala.addEventListener('change', (e) => {
      const value = e.target.checked ? 'on' : 'off';
      if (publish(T.setSala, value, 'web', 'lampada_sala')) {
        el('stateSala').textContent = value;
        logDeviceChange('lampada_sala', value, 'web');
      } else {
        e.target.checked = !e.target.checked;
      }
    });
  }

  el('ledBri').addEventListener('input', (e) => {
    el('briVal').textContent = e.target.value;
    updatePreview(); // Atualizar preview em tempo real
  });
  
  // Modal de seletor de cores
  const colorModal = el('colorPickerModal');
  const colorInputModal = el('ledColorModal');
  const colorInput = el('ledColor');
  const colorHexValue = el('colorHexValue');
  
  function openColorPicker() {
    const mode = el('ledMode').value;
    if (mode === 'solid') {
      // Sincronizar valor atual
      const currentColor = colorInput.value;
      colorInputModal.value = currentColor;
      colorHexValue.textContent = currentColor.toUpperCase();
      
      // Mostrar modal centralizado
      colorModal.style.display = 'flex';
      document.body.style.overflow = 'hidden'; // Prevenir scroll do body
      
      // Abrir seletor nativo após um pequeno delay para garantir que o modal está visível
      setTimeout(() => {
        colorInputModal.focus();
        colorInputModal.click();
      }, 150);
    }
  }
  
  function closeColorPicker() {
    colorModal.style.display = 'none';
    document.body.style.overflow = ''; // Restaurar scroll do body
  }
  
  function applyColor() {
    const selectedColor = colorInputModal.value;
    colorInput.value = selectedColor;
    updatePreview();
    closeColorPicker();
  }
  
  // Tornar o preview clicável para abrir seletor de cores
  const previewBar = el('ledPreview');
  if (previewBar) {
    previewBar.addEventListener('click', openColorPicker);
  }
  
  // Atualizar hex value quando a cor mudar
  if (colorInputModal) {
    colorInputModal.addEventListener('input', (e) => {
      const color = e.target.value;
      colorHexValue.textContent = color.toUpperCase();
    });
  }
  
  // Event listeners do modal
  el('closeColorPicker').addEventListener('click', closeColorPicker);
  el('cancelColor').addEventListener('click', closeColorPicker);
  el('applyColor').addEventListener('click', applyColor);
  
  // Fechar ao clicar no overlay
  const overlay = colorModal.querySelector('.color-picker-overlay');
  if (overlay) {
    overlay.addEventListener('click', closeColorPicker);
  }
  
  // Fechar com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && colorModal.style.display === 'block') {
      closeColorPicker();
    }
  });
  
  // Atualizar preview quando a cor mudar
  el('ledColor').addEventListener('input', () => {
    updatePreview();
  });
  
  // Atualizar preview quando o modo mudar
  el('ledMode').addEventListener('change', () => {
    updatePreview();
  });
  
  el('btnLedSend').addEventListener('click', () => {
    const payload = JSON.stringify({
      mode: el('ledMode').value,
      color: el('ledColor').value.toUpperCase(),
      brightness: Number(el('ledBri').value),
    });
    if (publish(T.ledSet, payload, 'web', 'fita_led')) {
    el('ledModeState').textContent = el('ledMode').value;
    el('ledColorState').textContent = el('ledColor').value.toUpperCase();
    const sw = el('ledSwatch');
    if (sw) sw.style.background = el('ledColor').value;
    el('ledBriState').textContent = String(Number(el('ledBri').value));
    updatePreview();
      logDeviceChange('fita_led', payload, 'web');
    }
  });

  // Animação de partículas
  initParticles();
  updatePreview();
  
  // Atualizar timestamp dos dados do sistema a cada segundo
  setInterval(() => {
    if (state.systemData.lastUpdate) {
      updateSystemDataDisplay();
    }
  }, 1000);
});

// Animação de partículas
function initParticles(){
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, dpr;
  const particles = [];
  const NUM = 60; 

  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth = window.innerWidth;
    h = canvas.clientHeight = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function rand(min,max){ return Math.random()*(max-min)+min; }
  function reset(p){
    p.x = rand(0, w);
    p.y = rand(0, h);
    p.vx = rand(-0.2, 0.2);
    p.vy = rand(-0.15, 0.15);
    p.r = rand(1, 2.4);
    p.a = rand(0.25, 0.7);
  }
  for(let i=0;i<NUM;i++){
    const p = {}; reset(p); particles.push(p);
  }

  function step(){
    ctx.clearRect(0,0,w,h);
   
    for (let i=0;i<particles.length;i++){
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = w+10; if (p.x > w+10) p.x = -10;
      if (p.y < -10) p.y = h+10; if (p.y > h+10) p.y = -10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(148,163,184,${p.a})`;
      ctx.shadowColor = 'rgba(59,130,246,0.25)';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.lineWidth = 1;
    for (let i=0;i<particles.length;i++){
      for (let j=i+1;j<particles.length;j++){
        const a = particles[i], b = particles[j];
        const dx = a.x-b.x, dy = a.y-b.y, dist = Math.hypot(dx,dy);
        if (dist < 110){
          const alpha = 1 - (dist/110);
          ctx.strokeStyle = `rgba(96,165,250,${alpha*0.15})`;
          ctx.beginPath();
          ctx.moveTo(a.x,a.y);
          ctx.lineTo(b.x,b.y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(step);
  }
  step();
}

function updatePreview(){
  const bar = document.getElementById('ledPreview');
  if (!bar) return;
  const mode = el('ledMode')?.value || 'solid';
  const color = (el('ledColor')?.value || '#FFFFFF').toUpperCase();
  const b = Number(el('ledBri')?.value || 128) / 255;
  if (mode === 'rainbow'){
    bar.style.background = 'linear-gradient(90deg, red, orange, yellow, green, cyan, blue, violet)';
    bar.style.opacity = Math.max(0.15, b).toString();
  } else if (mode === 'off' || b === 0){
    bar.style.background = '#000000';
    bar.style.opacity = '0.2';
  } else {
    bar.style.background = color;
    bar.style.opacity = Math.max(0.15, b).toString();
  }
}

// Atualizar exibição dos dados do sistema
function updateSystemDataDisplay() {
  const data = state.systemData;
  
  // Atualizar valores
  const cpuEl = el('systemCpu');
  const ramEl = el('systemRam');
  const lastUpdateEl = el('systemLastUpdate');
  
  if (cpuEl) {
    cpuEl.textContent = `${data.cpu.toFixed(1)}%`;
    const cpuBar = el('systemCpuBar');
    if (cpuBar) {
      cpuBar.style.width = `${Math.min(100, data.cpu)}%`;
      cpuBar.className = `system-bar-fill ${data.cpu > 80 ? 'high' : data.cpu > 50 ? 'medium' : 'low'}`;
    }
  }
  
  if (ramEl) {
    ramEl.textContent = `${data.ram.toFixed(1)}%`;
    const ramBar = el('systemRamBar');
    if (ramBar) {
      ramBar.style.width = `${Math.min(100, data.ram)}%`;
      ramBar.className = `system-bar-fill ${data.ram > 80 ? 'high' : data.ram > 50 ? 'medium' : 'low'}`;
    }
  }
  
  if (lastUpdateEl && data.lastUpdate) {
    const now = new Date();
    const diff = Math.floor((now - data.lastUpdate) / 1000);
    if (diff < 60) {
      lastUpdateEl.textContent = `Atualizado há ${diff}s`;
    } else {
      const minutes = Math.floor(diff / 60);
      lastUpdateEl.textContent = `Atualizado há ${minutes}min`;
    }
  }
}
