import React, { useEffect, useRef, useState, useCallback } from 'react';
import { barcodeService } from '../services/BarcodeService';
import { Flashlight, FlashlightOff, RefreshCw, Sun, Scan, Zap, Crosshair } from 'lucide-react';
import { ScanMode } from '../types/product';

interface CameraScannerProps {
  onCodeScanned: (code: string) => void;
  isPaused: boolean;
  scanMode: ScanMode;
  onToggleScanMode: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onCodeScanned,
  isPaused,
  scanMode,
  onToggleScanMode
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [torchMode, setTorchMode] = useState<'off' | 'hardware' | 'screen'>('off');
  const [torchNotice, setTorchNotice] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerFeedback, setTriggerFeedback] = useState<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Démarrer la caméra
  const startCamera = useCallback(async () => {
    if (!videoRef.current) return;
    setCameraError(null);

    try {
      await barcodeService.startCamera(videoRef.current);
    } catch (err: unknown) {
      const error = err as Error;
      setCameraError(error.message || 'Accès caméra refusé ou indisponible');
    }
  }, []);

  useEffect(() => {
    startCamera();

    return () => {
      barcodeService.stopCamera();
    };
  }, [startCamera]);

  // Mode Auto : Analyse continue cadencée avec anti-rebond 1,5s
  useEffect(() => {
    if (scanMode === 'auto' && !isPaused && !cameraError) {
      barcodeService.startContinuousScan((code) => {
        const now = Date.now();
        if (now - lastScanTimeRef.current > 1500) {
          lastScanTimeRef.current = now;
          onCodeScanned(code);
        }
      });
    } else {
      barcodeService.stopContinuousScan();
    }

    return () => {
      barcodeService.stopContinuousScan();
    };
  }, [scanMode, isPaused, cameraError, onCodeScanned]);

  // Déclencheur manuel pour le Mode Gâchette
  const handleTriggerScan = async () => {
    if (isTriggering || isPaused) return;
    setIsTriggering(true);
    setTriggerFeedback(null);

    try {
      const code = await barcodeService.decodeSingleFrame();
      if (code) {
        onCodeScanned(code);
      } else {
        setTriggerFeedback('Aucun code détecté');
        setTimeout(() => setTriggerFeedback(null), 1500);
      }
    } catch {
      setTriggerFeedback('Erreur lecture');
      setTimeout(() => setTriggerFeedback(null), 1500);
    } finally {
      setIsTriggering(false);
    }
  };

  // Basculer la lampe torche (Hardware avec fallback automatique Écran blanc)
  const handleToggleTorch = async () => {
    if (torchMode !== 'off') {
      await barcodeService.setTorch(false);
      setTorchMode('off');
      setTorchNotice(null);
      return;
    }

    const res = await barcodeService.setTorch(true);
    if (res.success && res.isHardware) {
      setTorchMode('hardware');
      setTorchNotice('LED active');
      setTimeout(() => setTorchNotice(null), 2000);
    } else {
      setTorchMode('screen');
      setTorchNotice('Flash écran actif');
      setTimeout(() => setTorchNotice(null), 2500);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden bg-black select-none">
      {/* Flux Vidéo plein écran */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Halo Torche Écran (Lumière blanche puissante si pas de LED) */}
      {torchMode === 'screen' && (
        <div
          className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300"
          style={{
            background: 'radial-gradient(circle at center, transparent 35%, rgba(255, 255, 255, 0.98) 75%)',
            boxShadow: 'inset 0 0 100px 60px rgba(255, 255, 255, 1)'
          }}
        />
      )}

      {/* Message d'erreur si caméra bloquée */}
      {cameraError && (
        <div className="absolute inset-0 z-40 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center">
          <p className="text-red-400 font-semibold mb-4 text-sm leading-relaxed">{cameraError}</p>
          <button
            onClick={startCamera}
            className="px-6 py-3 rounded-xl bg-slate-800 text-white font-medium flex items-center gap-2 border border-slate-700 text-sm active:scale-95 transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Réessayer</span>
          </button>
        </div>
      )}

      {/* Barre d'outils supérieure dans la caméra */}
      <div className="relative z-30 w-full px-4 pt-3 flex items-center justify-between gap-2">
        {/* Sélecteur Mode Auto / Mode Gâchette */}
        <button
          onClick={onToggleScanMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border shadow-lg text-xs font-semibold transition active:scale-95 ${
            scanMode === 'auto'
              ? 'bg-red-950/80 text-red-300 border-red-500/50'
              : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
          }`}
        >
          {scanMode === 'auto' ? (
            <>
              <Scan className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span>Mode Auto</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Mode Gâchette</span>
            </>
          )}
        </button>

        {/* Bouton Lampe Torche permanent */}
        <div className="relative shrink-0">
          <button
            onClick={handleToggleTorch}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full backdrop-blur-md transition border shadow-lg active:scale-95 ${
              torchMode === 'hardware'
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-500/30 font-bold'
                : torchMode === 'screen'
                ? 'bg-white text-slate-950 border-white shadow-white/40 font-bold'
                : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:text-white'
            }`}
            aria-label="Contrôle Lampe Torche"
          >
            {torchMode === 'hardware' ? (
              <Flashlight className="w-4 h-4 fill-current text-slate-950" />
            ) : torchMode === 'screen' ? (
              <Sun className="w-4 h-4 fill-current text-slate-950 animate-spin" style={{ animationDuration: '6s' }} />
            ) : (
              <FlashlightOff className="w-4 h-4" />
            )}
            <span className="text-xs font-semibold">
              {torchMode === 'hardware' ? 'LED ON' : torchMode === 'screen' ? 'Écran ON' : 'Lampe'}
            </span>
          </button>

          {/* Bulle d'information mode torche */}
          {torchNotice && (
            <div className="absolute right-0 top-11 whitespace-nowrap bg-slate-900/95 text-amber-300 text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-amber-500/40 shadow-xl backdrop-blur-md animate-in fade-in">
              {torchNotice}
            </div>
          )}
        </div>
      </div>

      {/* Cadre de visée central avec faisceau laser */}
      <div className="relative z-20 flex-1 w-full flex items-center justify-center p-6 pointer-events-none">
        <div className={`relative w-72 h-44 sm:w-80 sm:h-52 rounded-2xl border-2 overflow-hidden shadow-2xl transition-colors duration-300 ${
          scanMode === 'auto' ? 'border-white/25' : 'border-amber-400/30'
        }`}>
          {/* Coins accentués */}
          <div className={`absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 rounded-tl-xl ${
            scanMode === 'auto' ? 'border-red-500' : 'border-amber-400'
          }`}></div>
          <div className={`absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 rounded-tr-xl ${
            scanMode === 'auto' ? 'border-red-500' : 'border-amber-400'
          }`}></div>
          <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 rounded-bl-xl ${
            scanMode === 'auto' ? 'border-red-500' : 'border-amber-400'
          }`}></div>
          <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 rounded-br-xl ${
            scanMode === 'auto' ? 'border-red-500' : 'border-amber-400'
          }`}></div>

          {/* Ligne laser */}
          {!isPaused && (
            scanMode === 'auto' ? (
              <div className="absolute inset-x-0 h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] animate-laser"></div>
            ) : (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-amber-400/60 shadow-[0_0_8px_#fbbf24]"></div>
            )
          )}
        </div>
      </div>

      {/* Zone Basse : Bouton Gâchette ergonomique (visible en mode trigger) */}
      {scanMode === 'trigger' && !isPaused && (
        <div className="relative z-30 w-full px-6 pb-8 flex flex-col items-center">
          {triggerFeedback && (
            <div className="mb-3 px-3 py-1 rounded-lg bg-amber-950/90 border border-amber-500/50 text-amber-300 text-xs font-semibold animate-in fade-in">
              {triggerFeedback}
            </div>
          )}

          <button
            onClick={handleTriggerScan}
            disabled={isTriggering}
            className="w-full max-w-xs py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-base shadow-2xl shadow-amber-500/30 active:scale-95 transition flex items-center justify-center gap-3 border border-amber-300/60 uppercase tracking-wider"
          >
            <Crosshair className={`w-5 h-5 ${isTriggering ? 'animate-spin' : ''}`} />
            <span>{isTriggering ? 'Lecture...' : 'Gâchette Scan'}</span>
          </button>
        </div>
      )}
    </div>
  );
};