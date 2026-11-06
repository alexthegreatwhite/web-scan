import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  HTMLCanvasElementLuminanceSource,
  BinaryBitmap,
  HybridBinarizer
} from '@zxing/library';

// Types pour BarcodeDetector API natif (W3C draft)
interface DetectedBarcode {
  rawValue: string;
  format: string;
}

interface NativeBarcodeDetector {
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): NativeBarcodeDetector;
      getSupportedFormats?(): Promise<string[]>;
    };
  }
}

export interface TorchResult {
  success: boolean;
  isHardware: boolean;
  error?: string;
}

export class BarcodeService {
  private videoEl: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private track: MediaStreamTrack | null = null;
  private nativeDetector: NativeBarcodeDetector | null = null;
  private zxingReader: MultiFormatReader | null = null;
  private isScanning = false;
  private scanTimer: number | null = null;
  private isTorchOn = false;
  private hasHardwareTorchSupport = false;

  // Offscreen canvas pour capture et conversion en luminance propre
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor() {
    this.initDetector();
  }

  private async initDetector() {
    // 1. Détecteur natif Chromium/Android
    if (typeof window !== 'undefined' && window.BarcodeDetector) {
      try {
        const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'];
        this.nativeDetector = new window.BarcodeDetector({ formats });
      } catch {
        this.nativeDetector = null;
      }
    }

    // 2. Détecteur ZXing avec hints 1D optimisés
    const hints = new Map<DecodeHintType, unknown>();
    const formats = [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF
    ];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    hints.set(DecodeHintType.TRY_HARDER, true);

    this.zxingReader = new MultiFormatReader();
    this.zxingReader.setHints(hints);
  }

  public async startCamera(videoElement: HTMLVideoElement): Promise<void> {
    this.stopCamera();
    this.videoEl = videoElement;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        'Accès caméra bloqué : HTTPS obligatoire pour accéder à la caméra sur mobile.'
      );
    }

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoEl.srcObject = this.stream;
      await this.videoEl.play();

      this.track = this.stream.getVideoTracks()[0] || null;
      if (this.track) {
        const capabilities = (this.track.getCapabilities?.() || {}) as { torch?: boolean; focusMode?: string[] };
        this.hasHardwareTorchSupport = !!capabilities.torch;

        // Tente d'activer l'autofocus continu si supporté
        if (capabilities.focusMode?.includes('continuous')) {
          try {
            await (this.track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
              advanced: [{ focusMode: 'continuous' }]
            });
          } catch {}
        }
      }
    } catch (err) {
      console.error('Erreur démarrage caméra:', err);
      throw err;
    }
  }

  public stopCamera(): void {
    this.stopContinuousScan();
    if (this.track) {
      try {
        if (this.isTorchOn) {
          this.setTorch(false).catch(() => {});
        }
        this.track.stop();
      } catch {}
      this.track = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
      this.videoEl = null;
    }
    this.isTorchOn = false;
    this.hasHardwareTorchSupport = false;
  }

  public getTorchState(): boolean {
    return this.isTorchOn;
  }

  public hasHardwareTorch(): boolean {
    return this.hasHardwareTorchSupport;
  }

  public async setTorch(enable: boolean): Promise<TorchResult> {
    if (!this.track) {
      return { success: false, isHardware: false, error: 'Caméra non prête' };
    }

    try {
      await this.track.applyConstraints({
        advanced: [{ torch: Boolean(enable) } as unknown as MediaTrackConstraintSet]
      });
      this.isTorchOn = enable;
      return { success: true, isHardware: true };
    } catch (err: unknown) {
      const error = err as Error;

      if ('ImageCapture' in window) {
        try {
          const imageCapture = new (window as unknown as { ImageCapture: new (t: MediaStreamTrack) => { setOptions: (o: { fillLightMode: string }) => Promise<void> } }).ImageCapture(this.track);
          await imageCapture.setOptions({ fillLightMode: enable ? 'torch' : 'off' });
          this.isTorchOn = enable;
          return { success: true, isHardware: true };
        } catch {}
      }

      this.isTorchOn = false;
      return {
        success: false,
        isHardware: false,
        error: error.message || 'Torche matérielle non supportée'
      };
    }
  }

  public async toggleTorch(): Promise<TorchResult> {
    return this.setTorch(!this.isTorchOn);
  }

  /**
   * Décodage centré sur la zone de visée (ROI) pour maximiser les FPS et la réactivité
   */
  public async decodeSingleFrame(): Promise<string | null> {
    if (!this.videoEl || this.videoEl.readyState < 2) return null;

    const vw = this.videoEl.videoWidth;
    const vh = this.videoEl.videoHeight;
    if (vw <= 0 || vh <= 0) return null;

    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }
    if (!this.ctx) return null;

    // Définir la zone centrale correspondant au viseur laser (75% largeur, 50% hauteur)
    const cropW = Math.floor(vw * 0.75);
    const cropH = Math.floor(vh * 0.50);
    const cropX = Math.floor((vw - cropW) / 2);
    const cropY = Math.floor((vh - cropH) / 2);

    this.canvas.width = cropW;
    this.canvas.height = cropH;

    try {
      this.ctx.drawImage(this.videoEl, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    } catch {
      return null;
    }

    // 1. Détecteur natif BarcodeDetector si présent (Chromium)
    if (this.nativeDetector) {
      try {
        const barcodes = await this.nativeDetector.detect(this.canvas);
        if (barcodes && barcodes.length > 0) {
          const raw = barcodes[0].rawValue?.trim();
          if (raw) return raw;
        }
      } catch {}
    }

    // 2. Détecteur ZXing pur avec conversion en vraie luminance
    if (this.zxingReader && this.canvas) {
      try {
        const lum = new HTMLCanvasElementLuminanceSource(this.canvas);
        const bmp = new BinaryBitmap(new HybridBinarizer(lum));
        const res = this.zxingReader.decode(bmp);
        const text = res.getText()?.trim();
        if (text) return text;
      } catch {
        // Aucun code sur la zone rognée
      }
    }

    return null;
  }

  /**
   * Analyse continue cadencée à 100ms
   */
  public startContinuousScan(onDetect: (code: string) => void): void {
    if (this.isScanning) return;
    this.isScanning = true;

    let isBusy = false;

    this.scanTimer = window.setInterval(async () => {
      if (!this.isScanning || isBusy) return;

      if (this.videoEl && this.videoEl.readyState >= 2) {
        isBusy = true;
        try {
          const code = await this.decodeSingleFrame();
          if (code && this.isScanning) {
            onDetect(code);
          }
        } catch {
        } finally {
          isBusy = false;
        }
      }
    }, 100);
  }

  public stopContinuousScan(): void {
    this.isScanning = false;
    if (this.scanTimer !== null) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
  }
}

export const barcodeService = new BarcodeService();
