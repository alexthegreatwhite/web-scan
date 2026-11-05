import { useEffect, useState, useCallback } from 'react';
import { catalogService } from './services/CatalogService';
import { soundService } from './services/SoundService';
import { Article } from './types/product';
import { CameraScanner } from './components/CameraScanner';
import { ProductCard } from './components/ProductCard';
import { ManualInput } from './components/ManualInput';
import { AlertCircle, Search, X, Maximize, Minimize } from 'lucide-react';

export function App() {
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [articleCount, setArticleCount] = useState(0);
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Initialisation du catalogue
  useEffect(() => {
    catalogService.init().then(() => {
      setCatalogLoaded(true);
      setArticleCount(catalogService.getCount());
    }).catch((err) => {
      console.error('Erreur chargement catalogue:', err);
    });
  }, []);

  // Traitement d'un code scanné ou saisi
  const handleCodeFound = useCallback((codeRaw: string) => {
    if (!catalogService.isReady()) return;

    const article = catalogService.search(codeRaw);

    if (article) {
      soundService.playSuccess();
      setCurrentArticle(article);
      setNotFoundCode(null);
      setIsSearchOpen(false);
    } else {
      soundService.playError();
      setNotFoundCode(codeRaw);
      setTimeout(() => {
        setNotFoundCode((prev) => (prev === codeRaw ? null : prev));
      }, 3000);
    }
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 flex flex-col font-sans select-none">
      {/* En-tête mobile aéré et jamais écrasé */}
      <header className="relative z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          {/* Logo et Nom Magasin */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center font-black text-white text-sm shadow-md shadow-red-950/50 shrink-0">
              PS
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-bold text-white text-sm tracking-tight truncate">Paris Store</span>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 shrink-0">
                  Scan Web
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse"></span>
                <span>{catalogLoaded ? `${articleCount.toLocaleString('fr-FR')} articles certifiés` : 'Chargement...'}</span>
              </p>
            </div>
          </div>

          {/* Bouton recherche mobile / Version desktop intégrée */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Version desktop (écrans larges) */}
            <div className="hidden sm:block w-64">
              <ManualInput onSearch={handleCodeFound} disabled={!catalogLoaded} />
            </div>

            {/* Bouton Plein Écran */}
            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded-xl border transition active:scale-95 ${
                isFullscreen
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                  : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:text-white'
              }`}
              aria-label="Plein Écran"
              title="Plein Écran"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            {/* Bouton bascule recherche sur mobile */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`sm:hidden p-2 rounded-xl border transition active:scale-95 ${
                isSearchOpen
                  ? 'bg-red-600 text-white border-red-500'
                  : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:text-white'
              }`}
              aria-label="Recherche manuelle"
            >
              {isSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Ligne de recherche dépliable sur mobile */}
        {isSearchOpen && (
          <div className="sm:hidden pt-2.5 pb-1 animate-in slide-in-from-top-2 duration-150">
            <ManualInput onSearch={handleCodeFound} disabled={!catalogLoaded} autoFocus />
          </div>
        )}
      </header>

      {/* Zone Caméra centrale (Mode Auto uniquement) */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <CameraScanner
          onCodeScanned={handleCodeFound}
          isPaused={!!currentArticle}
        />

        {/* Toast Code Inconnu */}
        {notFoundCode && (
          <div className="absolute top-4 inset-x-4 z-40 max-w-md mx-auto p-3.5 rounded-2xl bg-red-950/95 border border-red-600/80 text-white shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in slide-in-from-top-4 duration-200">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold">Article non trouvé</span> : le code{' '}
              <span className="font-mono font-bold text-amber-300">{notFoundCode}</span> n'existe pas dans le catalogue WMS.
            </div>
          </div>
        )}
      </main>

      {/* Fiche Produit modale */}
      {currentArticle && (
        <ProductCard
          article={currentArticle}
          onClose={() => setCurrentArticle(null)}
        />
      )}
    </div>
  );
}

export default App;
