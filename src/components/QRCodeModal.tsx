import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { QrCode, Copy, Check, Download, ExternalLink, X, Maximize2 } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  examTitle: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  examTitle
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [studentUrl, setStudentUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Create clean student URL with student_only mode (completely isolated from teacher view)
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set('role', 'student');
      url.searchParams.set('mode', 'student_only');
      setStudentUrl(url.toString());

      QRCode.toDataURL(
        url.toString(),
        {
          width: 400,
          margin: 2,
          color: {
            dark: '#0f172a', // slate-900
            light: '#ffffff'
          }
        },
        (err, dataUrl) => {
          if (!err && dataUrl) {
            setQrDataUrl(dataUrl);
          }
        }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(studentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_Examen_${examTitle.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 mb-3">
          <QrCode className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-black text-white">
          Código QR de Acceso para Alumnos
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Muestra este código en el proyector. Al escanearlo, los alumnos entrarán <strong className="text-emerald-400">exclusivamente a su vista de examen</strong> sin acceso al panel del profesor ni a la configuración.
        </p>

        {/* QR Code Container */}
        <div className="my-6 p-4 bg-white rounded-2xl shadow-xl inline-block border-4 border-indigo-500/30">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Código QR del Examen"
              className="w-56 h-56 sm:w-64 sm:h-64 object-contain mx-auto"
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-slate-400">
              Generando QR...
            </div>
          )}
        </div>

        {/* Link preview & Copy */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-2.5 flex items-center justify-between text-xs text-slate-300 mb-5">
          <span className="truncate max-w-[240px] font-mono text-[11px] text-indigo-300">
            {studentUrl}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="ml-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shrink-0 transition-colors flex items-center space-x-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Imagen PNG</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
