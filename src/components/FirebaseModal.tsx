import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertTriangle, Key, ExternalLink, X, Copy, Check } from 'lucide-react';
import { FirebaseConfig } from '../types';
import { firebaseService } from '../services/firebaseService';

interface FirebaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export const FirebaseModal: React.FC<FirebaseModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved
}) => {
  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [databaseURL, setDatabaseURL] = useState('');
  const [projectId, setProjectId] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');
  
  const [rawJsonInput, setRawJsonInput] = useState('');
  const [useRawJson, setUseRawJson] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [copiedRules, setCopiedRules] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = firebaseService.getConfig();
      if (current) {
        setApiKey(current.apiKey || '');
        setAuthDomain(current.authDomain || '');
        setDatabaseURL(current.databaseURL || '');
        setProjectId(current.projectId || '');
        setStorageBucket(current.storageBucket || '');
        setMessagingSenderId(current.messagingSenderId || '');
        setAppId(current.appId || '');
        setRawJsonInput(JSON.stringify(current, null, 2));
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleParseRawJson = () => {
    try {
      // Clean possible "const firebaseConfig = { ... };"
      let clean = rawJsonInput.trim();
      if (clean.includes('{') && clean.includes('}')) {
        const start = clean.indexOf('{');
        const end = clean.lastIndexOf('}');
        clean = clean.substring(start, end + 1);
      }
      
      // Replace unquoted keys if necessary or parse standard JSON
      // Handle JS object format where keys might not be double-quoted
      const relaxedJson = clean
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
        .replace(/'/g, '"');

      const parsed = JSON.parse(relaxedJson);

      if (parsed.apiKey) setApiKey(parsed.apiKey);
      if (parsed.authDomain) setAuthDomain(parsed.authDomain);
      if (parsed.databaseURL) setDatabaseURL(parsed.databaseURL);
      if (parsed.projectId) setProjectId(parsed.projectId);
      if (parsed.storageBucket) setStorageBucket(parsed.storageBucket);
      if (parsed.messagingSenderId) setMessagingSenderId(parsed.messagingSenderId);
      if (parsed.appId) setAppId(parsed.appId);

      setStatusMessage({ text: '¡Configuración detectada y cargada en los campos!', isError: false });
      setUseRawJson(false);
    } catch {
      setStatusMessage({ text: 'Error al interpretar el texto JSON. Asegúrate de incluir el objeto con las comillas.', isError: true });
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKey.trim() || (!databaseURL.trim() && !projectId.trim())) {
      setStatusMessage({
        text: 'Por favor ingresa al menos la API Key y la URL de Realtime Database (o Project ID).',
        isError: true
      });
      return;
    }

    const calculatedDbUrl = databaseURL.trim() || `https://${projectId.trim()}-default-rtdb.firebaseio.com`;

    const config: FirebaseConfig = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      databaseURL: calculatedDbUrl,
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim()
    };

    const success = firebaseService.saveConfig(config);
    if (success) {
      setStatusMessage({ text: '¡Firebase Realtime Database conectado y guardado con éxito!', isError: false });
      onConfigSaved();
      setTimeout(() => {
        onClose();
      }, 900);
    } else {
      setStatusMessage({ text: 'Ocurrió un error al conectar con Firebase. Revisa los datos ingresados.', isError: true });
    }
  };

  const handleClear = () => {
    firebaseService.clearConfig();
    setApiKey('');
    setAuthDomain('');
    setDatabaseURL('');
    setProjectId('');
    setStorageBucket('');
    setMessagingSenderId('');
    setAppId('');
    setRawJsonInput('');
    setStatusMessage({ text: 'Configuración de Firebase eliminada. Se usará el modo local seguro sincronizado.', isError: false });
    onConfigSaved();
  };

  const sampleRules = `{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}`;

  const copyRulesToClipboard = () => {
    navigator.clipboard.writeText(sampleRules);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Configuración de Firebase Realtime Database
              </h3>
              <p className="text-xs text-slate-400">
                Conecta tu proyecto gratuito de Firebase para sincronizar alumnos y alertas en tiempo real
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs text-slate-300">
          {/* Status Alert */}
          {statusMessage && (
            <div className={`p-3.5 rounded-xl border flex items-center space-x-2 text-xs font-medium ${
              statusMessage.isError
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            }`}>
              {statusMessage.isError ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Quick Guide Card */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs uppercase tracking-wide flex items-center">
                <Key className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                ¿Cómo obtener tus credenciales gratis?
              </span>
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline"
              >
                Abrir Firebase Console <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>

            <ol className="list-decimal pl-4 space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
              <li>Crea un proyecto en Firebase Console (gratis).</li>
              <li>Ve al menú lateral: <strong>Compilación (Build) → Realtime Database</strong> y haz clic en <em>Crear base de datos</em>.</li>
              <li>
                En la pestaña <strong>Reglas (Rules)</strong>, pon lectura y escritura públicas para el examen:
                <div className="my-1.5 flex items-center justify-between bg-slate-900 p-2 rounded-lg font-mono text-[11px] text-amber-300 border border-slate-700">
                  <code>{`{ "rules": { ".read": true, ".write": true } }`}</code>
                  <button
                    type="button"
                    onClick={copyRulesToClipboard}
                    className="ml-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] flex items-center space-x-1"
                  >
                    {copiedRules ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedRules ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </li>
              <li>Ve a <strong>Configuración del proyecto (engrane) → General → Tus apps → Agregar Web (&lt;/&gt;)</strong> y copia el objeto <code>firebaseConfig</code>.</li>
            </ol>
          </div>

          {/* Switcher: Paste RAW JSON vs Form */}
          <div className="flex items-center justify-between pt-1">
            <span className="font-bold text-white text-xs">
              {useRawJson ? 'Pegar objeto firebaseConfig completo' : 'Completar campos individuales'}
            </span>
            <button
              type="button"
              onClick={() => setUseRawJson(!useRawJson)}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline font-semibold"
            >
              {useRawJson ? 'Editar campo por campo' : 'Pegar objeto completo (Rápido)'}
            </button>
          </div>

          {useRawJson ? (
            <div className="space-y-3">
              <textarea
                rows={6}
                value={rawJsonInput}
                onChange={(e) => setRawJsonInput(e.target.value)}
                placeholder={'const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  databaseURL: "https://mi-quiz-default-rtdb.firebaseio.com",\n  projectId: "mi-quiz",\n  ...\n};'}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleParseRawJson}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
              >
                Interpretar y aplicar configuración
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  API Key *
                </label>
                <input
                  type="text"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSyA..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Database URL (Realtime Database) *
                </label>
                <input
                  type="text"
                  value={databaseURL}
                  onChange={(e) => setDatabaseURL(e.target.value)}
                  placeholder="https://mi-proyecto-default-rtdb.firebaseio.com"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Project ID
                  </label>
                  <input
                    type="text"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="mi-proyecto-123"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Auth Domain
                  </label>
                  <input
                    type="text"
                    value={authDomain}
                    onChange={(e) => setAuthDomain(e.target.value)}
                    placeholder="mi-proyecto.firebaseapp.com"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    App ID
                  </label>
                  <input
                    type="text"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    placeholder="1:123456789:web:abcdef"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Messaging Sender ID
                  </label>
                  <input
                    type="text"
                    value={messagingSenderId}
                    onChange={(e) => setMessagingSenderId(e.target.value)}
                    placeholder="123456789"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3.5 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl border border-rose-500/20 transition-colors"
                >
                  Restablecer a Modo Local
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-md shadow-indigo-600/20 transition-all"
                >
                  Guardar y Conectar Firebase
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
