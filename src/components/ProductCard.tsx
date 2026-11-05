import React from 'react';
import { Article } from '../types/product';
import { X, Box, Barcode, PackageCheck, Layers } from 'lucide-react';

interface ProductCardProps {
  article: Article;
  onClose: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ article, onClose }) => {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 pb-8 sm:p-6 sm:inset-0 sm:flex sm:items-center sm:justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden"
        style={{
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(239, 68, 68, 0.15)'
        }}
      >
        {/* Accent glow bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600"></div>

        {/* Header avec badge et bouton fermer */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold uppercase tracking-wider">
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Fiche Produit</span>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition active:scale-95"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. DÉNOMINATION (Français uniquement) */}
        <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug mb-4 tracking-tight">
          {article.libelle}
        </h2>

        {/* Grille des identifiants (Code Carton + PCB) */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* 2. CODE CARTON 6 CHIFFRES */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1 truncate">
              <Box className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">Code Carton</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono tracking-wider truncate">
              {article.code}
            </div>
          </div>

          {/* 4. PCB (Pièces par carton) - libellé court et soigné pour ne jamais déborder */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1 truncate">
              <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">PCB</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight flex items-baseline gap-1.5 truncate">
              <span>{article.pcb}</span>
              <span className="text-xs font-semibold text-emerald-500/80 font-sans">unités</span>
            </div>
          </div>
        </div>

        {/* 3. CODE EAN */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 mb-5 flex items-center justify-between gap-2 overflow-hidden">
          <div className="flex items-center gap-2 shrink-0">
            <Barcode className="w-4 h-4 text-sky-400" />
            <span className="text-xs text-slate-400 uppercase font-medium tracking-wider">EAN :</span>
          </div>
          <span className="text-base sm:text-lg font-mono font-bold text-sky-300 tracking-wider truncate">
            {article.ean || 'Non renseigné'}
          </span>
        </div>

        {/* Bouton d'action rapide pour scanner suivant */}
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-bold text-base shadow-lg shadow-red-950/50 active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          <span>Scanner le produit suivant</span>
        </button>
      </div>
    </div>
  );
};
