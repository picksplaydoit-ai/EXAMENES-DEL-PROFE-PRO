import React, { useState } from 'react';
import { UploadCloud, Download, Copy, Check, ExternalLink, Github, Sparkles, X, FileCode } from 'lucide-react';
import { STANDALONE_HTML_CODE } from '../data/standaloneHtmlCode';

interface VercelDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VercelDeployModal: React.FC<VercelDeployModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(STANDALONE_HTML_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadStandalone = () => {
    const blob = new Blob([STANDALONE_HTML_CODE], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'index.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="max-w-3xl w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Guía de Despliegue en Vercel & GitHub (Gratis)
              </h3>
              <p className="text-xs text-slate-400">
                Opciones para publicar tu examen en producción o descargar el archivo único <code className="text-indigo-300">index.html</code>
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

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs text-slate-300">
          {/* Quick Download / Copy Action Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <FileCode className="w-5 h-5 text-indigo-400" />
                <h4 className="text-sm font-bold text-white">
                  Versión Autónoma en Un Solo Archivo (index.html)
                </h4>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Incluye Tailwind CSS (CDN), Firebase v10 Realtime Database, el detector anti-trampas por <em>visibilitychange</em> y las 2 vistas (alumno y panel profesor) en un único archivo.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center space-x-1.5 border border-slate-700 transition-colors shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
                <span>{copied ? '¡Copiado!' : 'Copiar Código'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadStandalone}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Descargar index.html</span>
              </button>
            </div>
          </div>

          {/* Deployment Step-by-Step Guide */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
              <Sparkles className="w-4 h-4 mr-1.5 text-pink-400" />
              Pasos para Desplegar Gratis en Vercel
            </h4>

            {/* Option A: Single File Upload via GitHub */}
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-3">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <span className="font-bold text-white text-xs">
                  Configura tus credenciales de Firebase en el archivo
                </span>
              </div>
              <p className="text-[11px] text-slate-300 pl-8 leading-relaxed">
                Abre tu archivo <code className="text-amber-300 font-mono">index.html</code> (o descárgalo arriba) y busca la sección al inicio del script:
              </p>
              <div className="pl-8">
                <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto">
{`const firebaseConfig = {
  apiKey: "TU_API_KEY_DE_FIREBASE",
  authDomain: "tu-proyecto.firebaseapp.com",
  databaseURL: "https://tu-proyecto-default-rtdb.firebaseio.com",
  projectId: "tu-proyecto",
  ...
};`}
                </pre>
              </div>
            </div>

            {/* Option B: GitHub Repo */}
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-3">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <span className="font-bold text-white text-xs">
                  Sube el archivo a un repositorio en GitHub
                </span>
              </div>
              <ul className="list-disc pl-12 space-y-1 text-[11px] text-slate-300">
                <li>Crea un nuevo repositorio público o privado en <a href="https://github.com/new" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-semibold">github.com/new</a>.</li>
                <li>Arrastra y suelta el archivo <code className="text-indigo-300 font-mono">index.html</code> directamente en la web de GitHub y haz <em>Commit changes</em>.</li>
              </ul>
            </div>

            {/* Step 3: Vercel Deploy */}
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-3">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <span className="font-bold text-white text-xs">
                  Importa el proyecto en Vercel (1 Clic)
                </span>
              </div>
              <div className="pl-8 space-y-2 text-[11px] text-slate-300">
                <p>
                  1. Entra a <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-semibold">vercel.com/new</a> e inicia sesión con GitHub.
                </p>
                <p>
                  2. Selecciona tu repositorio y haz clic en <strong>Deploy</strong>.
                </p>
                <p className="text-emerald-400 font-semibold">
                  ¡Listo! En menos de 20 segundos Vercel te dará una URL HTTPS pública (ej. <code className="bg-slate-900 px-1 py-0.5 rounded text-white">https://tu-examen.vercel.app</code>) para enviar a tus alumnos.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span>¿Dudas?</span>
            <a href="https://vercel.com/docs" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline flex items-center">
              Documentación oficial de Vercel <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Entendido, Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
