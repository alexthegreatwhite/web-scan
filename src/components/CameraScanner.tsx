import React, { useEffect, useRef, useState, useCallback } from 'react';
import { barcodeService } from '../services/BarcodeService';
import { Flashlight, FlashlightOff, RefreshCw, Sun, Scan } from 'lucide-react';

interface CameraScannerProps {
  onCodeScanned: (code: string) => void;
  isPaused: boolean;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onCodeScanned,
  isPaused
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [torchMode, setTorchMode] = useState<'off' | 'hardware' | 'screen'>('off');
  const [torchNotice, setTorchNotice] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
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

  // Analyse continue automatique 100% du temps
  useEffect(() => {
    if (!isPaused && !cameraError) {
      barcodeService.startContinuousScan((code) => {
        const now = Date.now();
        // Anti-rebond 1,5s
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
  }, [isPaused, cameraError, onCodeScanned]);

  // Basculer la lampe torche (Hardware avec fallback automatique Écran blanc)
  const handleToggleTorch = async () => {
    if (torchMode !== 'off') {
      await barcodeService.setTorch(false);
      setTorchMode('off');
      setTorchNotice(null);
      return;
    }

    // Tenter la torche matérielle
    const res = await barcodeService.setTorch(true);
    if (res.success && res.isHardware) {
      setTorchMode('hardware');
      setTorchNotice('LED active');
      setTimeout(() => setTorchNotice(null), 2000);
    } else {
      // Bascule automatique sur Torche Écran (Firefox Android / Pas de LED)
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
        {/* Badge Scanner Automatique Actif */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg text-xs font-semibold text-slate-300">
          <Scan className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          <span>Scanner Auto</span>
        </div>

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
        <div className="relative w-72 h-44 sm:w-80 sm:h-52 rounded-2xl border-2 border-white/25 overflow-hidden shadow-2xl">
          {/* Coins accentués */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-red-500 rounded-tl-xl"></div>
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-red-500 rounded-tr-xl"></div>
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-red-500 rounded-bl-xl"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-red-500 rounded-br-xl"></div>

          {/* Ligne laser animée continue */}
          {!isPaused && (
            <div className="absolute inset-x-0 h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] animate-laser"></div>
          )}
        </div>
      </div>
    </div>
  );
};
