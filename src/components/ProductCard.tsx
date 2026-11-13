import { useState } from 'react';
import { Bookmark, Film, Image as ImageIcon, Star } from 'lucide-react';
import type { CurrencyCode, Language, Product } from '../shared/types.ts';
import { CATEGORIES, PRODUCT_MODELS, UI_TEXT } from '../shared/i18n.ts';
import { convertAmount, formatMoney } from '../shared/currency.ts';

interface ProductCardProps {
  product: Product;
  lang: Language;
  currency: CurrencyCode;
  isFavorite: boolean;
  onOpenProduct: (product: Product) => void;
  onOpenProvider: (organizationId: string) => void;
  onToggleFavorite: (productId: string) => void;
}

export function ProductCard({
  product,
  lang,
  currency,
  isFavorite,
  onOpenProduct,
  onOpenProvider,
  onToggleFavorite,
}: ProductCardProps) {
  const t = UI_TEXT[lang];
  const [imgFailed, setImgFailed] = useState(false);
  const displayPrice = convertAmount(product.price, product.baseCurrency, currency);
  const gallery = product.mediaGallery || [];
  const hasVideo = gallery.some((m) => m.type === 'video');

  return (
    <article className="group flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
      <div
        onClick={() => onOpenProduct(product)}
        className="aspect-4/3 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer relative"
      >
        {!imgFailed ? (
          <img
            src={product.imageUrl}
            alt={product.title[lang]}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center p-4 text-center text-xs text-slate-500">
            {product.title[lang]}
          </div>
        )}
        {gallery.length > 0 && (
          <span className="absolute bottom-3 start-3 inline-flex items-center gap-1 rounded-md bg-slate-950/75 px-2 py-1 text-[10px] font-medium text-white">
            {hasVideo ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
            <span>{gallery.length}</span>
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          className="absolute top-3 end-3 p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 hover:text-[#F95738] transition-colors cursor-pointer"
          aria-label={isFavorite ? t.savedFavorite : t.saveFavorite}
        >
          <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-[#F95738] text-[#F95738]' : ''}`} />
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5 min-w-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>{CATEGORIES[product.category][lang]}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{product.destination[lang]}</span>
          </div>

          <h3
            onClick={() => onOpenProduct(product)}
            className="mt-1.5 text-base font-semibold text-slate-900 dark:text-white leading-snug cursor-pointer group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
          >
            {product.title[lang]}
          </h3>

          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 min-w-0">
            <button
              type="button"
              onClick={() => onOpenProvider(product.organizationId)}
              className="hover:text-slate-900 dark:hover:text-white hover:underline cursor-pointer truncate min-w-0"
            >
              {product.providerName}
            </button>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-700 dark:text-slate-200 shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {product.rating.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {formatMoney(displayPrice, currency)}
            </div>
            <div className="text-[11px] text-slate-500">
              {PRODUCT_MODELS[product.productModel][lang]} ·{' '}
              {product.instantBooking ? t.instantConfirm : t.requiresApproval}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenProduct(product)}
            className="min-h-[40px] px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.viewAndBook}
          </button>
        </div>
      </div>
    </article>
  );
}
