import React, { useState, useEffect, useRef } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';

interface ManualInputProps {
  onSearch: (query: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const ManualInput: React.FC<ManualInputProps> = ({ onSearch, disabled, autoFocus }) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Écoute des douchettes USB / Bluetooth (Lecteur HID émulant un clavier)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si l'utilisateur est déjà en train de taper dans un champ textuel
      if (document.activeElement === inputRef.current) return;

      const now = Date.now();
      const char = e.key;

      if (char === 'Enter') {
        if (barcodeBufferRef.current.length >= 3) {
          onSearch(barcodeBufferRef.current);
          barcodeBufferRef.current = '';
        }
        return;
      }

      // Douchette envoi typiquement les caractères à < 40ms d'intervalle
      if (now - lastKeyTimeRef.current > 100) {
        barcodeBufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (char.length === 1) {
        barcodeBufferRef.current += char;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSearch(value.trim());
    setValue('');
    inputRef.current?.blur();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full relative">
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
          <Search className="w-4 h-4" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder="Code 6 chiffres ou EAN..."
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition font-mono"
        />

        {value && (
          <button
            type="submit"
            className="absolute right-2 p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-500 transition active:scale-95"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </form>
  );
};
