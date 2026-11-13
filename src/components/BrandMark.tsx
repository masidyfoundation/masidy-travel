interface BrandMarkProps {
  onClick?: () => void;
  darkSurface?: boolean;
}

export function BrandMark({ onClick, darkSurface = false }: BrandMarkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 cursor-pointer"
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="masidyCoral" x1="8" y1="8" x2="54" y2="54" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF3D2E" />
            <stop offset="100%" stopColor="#FF8E47" />
          </linearGradient>
          <linearGradient id="masidyOcean" x1="12" y1="52" x2="50" y2="12" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#43DCE8" />
            <stop offset="100%" stopColor="#0052CC" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="44" height="18" rx="9" fill="url(#masidyCoral)" />
        <rect x="34" y="8" width="18" height="44" rx="9" fill="url(#masidyCoral)" />
        <path
          d="M12.5 51.5C9.0 48.0 9.0 42.3 12.5 38.8L38.8 12.5C42.3 9.0 48.0 9.0 51.5 12.5C55.0 16.0 55.0 21.7 51.5 25.2L25.2 51.5C21.7 55.0 16.0 55.0 12.5 51.5Z"
          fill="url(#masidyOcean)"
        />
      </svg>
      <span
        className={`text-xl font-bold tracking-tight whitespace-nowrap shrink-0 ${
          darkSurface ? 'text-white' : 'text-slate-900 dark:text-white'
        }`}
      >
        Masidy
      </span>
    </button>
  );
}
