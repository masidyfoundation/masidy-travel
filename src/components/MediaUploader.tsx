import { useRef, useState } from 'react';
import {
  CheckCircle2,
  Film,
  Image as ImageIcon,
  Link2,
  Plus,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Language, MediaItem } from '../shared/types.ts';

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getEmbedVideoUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    if (host.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.split('/')[2];
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (parsed.pathname.startsWith('/embed/')) return rawUrl;
    }
    if (host === 'youtu.be') {
      const id = parsed.pathname.replace('/', '').trim();
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host.includes('vimeo.com')) {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

export function inferMediaTypeFromUrl(url: string): 'image' | 'video' {
  const lower = url.toLowerCase();
  if (
    lower.startsWith('data:video/') ||
    /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(lower) ||
    Boolean(getEmbedVideoUrl(url))
  ) {
    return 'video';
  }
  return 'image';
}

export async function compressImageFile(file: File, maxDim = 1280, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read image file'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export async function readVideoFileForDemo(file: File): Promise<{ url: string; persistent: boolean }> {
  // Compact videos <= 1.5MB are stored as Data URLs so they persist across refreshes in localStorage
  if (file.size <= 1_500_000) {
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Unable to read video file'));
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(file);
    });
    return { url, persistent: true };
  }
  return { url: URL.createObjectURL(file), persistent: false };
}

export function MediaRenderer({
  item,
  className = 'h-full w-full object-cover',
  controls = true,
}: {
  item: { type: 'image' | 'video'; url: string; name?: string; caption?: string };
  className?: string;
  controls?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (item.type === 'video') {
    const embedUrl = getEmbedVideoUrl(item.url);
    if (embedUrl) {
      return (
        <iframe
          src={embedUrl}
          title={item.caption || item.name || 'Travel Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      );
    }
    return (
      <video
        src={item.url}
        controls={controls}
        playsInline
        preload="metadata"
        className={className}
      />
    );
  }

  if (failed) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 p-3 text-center text-xs text-slate-500">
        {item.caption || item.name || 'Image unavailable'}
      </div>
    );
  }

  return (
    <img
      src={item.url}
      alt={item.caption || item.name || 'Travel Media'}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

interface SingleImageUploaderProps {
  lang: Language;
  label: string;
  value?: string;
  aspectClass?: string;
  placeholder?: string;
  onChange: (nextUrl: string) => void;
}

export function SingleImageUploader({
  lang,
  label,
  value,
  aspectClass = 'w-16 h-16 rounded-xl',
  placeholder,
  onChange,
}: SingleImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) {
      setError(lang === 'ar' ? 'يرجى اختيار ملف صورة صالح.' : 'Please choose a valid image file.');
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await compressImageFile(file, 960, 0.82);
      onChange(dataUrl);
    } catch {
      setError(lang === 'ar' ? 'تعذر قراءة ملف الصورة.' : 'Could not read image file.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5 bg-slate-50/40 dark:bg-slate-900/30">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[11px] text-red-600 hover:underline cursor-pointer"
          >
            {lang === 'ar' ? 'إزالة' : 'Remove'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
        <div
          className={`${aspectClass} overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center shrink-0`}
        >
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="w-5 h-5 text-slate-400" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium hover:border-slate-400 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>
                {busy
                  ? lang === 'ar'
                    ? 'جاري المعالجة...'
                    : 'Processing...'
                  : lang === 'ar'
                  ? 'رفع صورة من الجهاز'
                  : 'Upload Image'}
              </span>
            </button>
          </div>
          <div className="flex gap-1.5">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={placeholder || (lang === 'ar' ? 'أو الصق رابط صورة https://...' : 'Or paste image URL https://...')}
              className="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={() => {
                setError('');
                const trimmed = urlInput.trim();
                if (!trimmed) return;
                if (!/^(https?:\/\/|\/|data:image\/)/i.test(trimmed)) {
                  setError(
                    lang === 'ar'
                      ? 'الرابط يجب أن يبدأ بـ https:// أو /'
                      : 'URL must start with https:// or /'
                  );
                  return;
                }
                onChange(trimmed);
                setUrlInput('');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium cursor-pointer shrink-0"
            >
              {lang === 'ar' ? 'تطبيق' : 'Apply'}
            </button>
          </div>
          {error && <p className="text-[11px] text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

interface MediaUploaderProps {
  lang: Language;
  items: MediaItem[];
  onChange: (nextItems: MediaItem[]) => void;
  coverImageUrl?: string;
  onSetCover?: (imageUrl: string) => void;
  title?: string;
  subtitle?: string;
}

export function MediaUploader({
  lang,
  items,
  onChange,
  coverImageUrl,
  onSetCover,
  title,
  subtitle,
}: MediaUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [urlValue, setUrlValue] = useState('');
  const [urlKind, setUrlKind] = useState<'auto' | 'image' | 'video'>('auto');
  const [captionValue, setCaptionValue] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'error' | 'info' } | null>(null);

  async function processFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setFeedback(null);
    setUploading(true);

    const added: MediaItem[] = [];
    let hasSessionOnlyVideo = false;
    let rejectedCount = 0;

    for (const file of Array.from(fileList)) {
      try {
        if (file.type.startsWith('image/')) {
          const url = await compressImageFile(file);
          added.push({
            id: uid('med'),
            type: 'image',
            url,
            name: file.name,
            createdAt: new Date().toISOString(),
          });
        } else if (file.type.startsWith('video/')) {
          const { url, persistent } = await readVideoFileForDemo(file);
          if (!persistent) hasSessionOnlyVideo = true;
          added.push({
            id: uid('med'),
            type: 'video',
            url,
            name: file.name,
            createdAt: new Date().toISOString(),
          });
        } else {
          rejectedCount += 1;
        }
      } catch {
        rejectedCount += 1;
      }
    }

    if (added.length > 0) {
      const nextList = [...items, ...added];
      onChange(nextList);
      if (onSetCover && !coverImageUrl) {
        const firstImg = added.find((m) => m.type === 'image');
        if (firstImg) onSetCover(firstImg.url);
      }
    }

    if (rejectedCount > 0) {
      setFeedback({
        type: 'error',
        text:
          lang === 'ar'
            ? `تم تجاهل ${rejectedCount} ملف غير مدعوم (يدعم الصور والفيديو فقط).`
            : `${rejectedCount} unsupported file(s) skipped (images and videos only).`,
      });
    } else if (hasSessionOnlyVideo) {
      setFeedback({
        type: 'info',
        text:
          lang === 'ar'
            ? 'الفيديو الكبير يعمل فورًا في هذه الجلسة؛ للاحتفاظ به بعد التحديث استخدم فيديو أقل من 1.5MB أو رابط فيديو مباشر.'
            : 'Large video plays live in this session; for persistence across browser refreshes, use videos <= 1.5MB or a direct video URL.',
      });
    }

    setUploading(false);
  }

  function handleAddByUrl() {
    setFeedback(null);
    const trimmed = urlValue.trim();
    if (!trimmed) {
      setFeedback({
        type: 'error',
        text: lang === 'ar' ? 'يرجى إدخال رابط الصورة أو الفيديو.' : 'Please enter an image or video URL.',
      });
      return;
    }
    if (!/^(https?:\/\/|\/|data:(image|video)\/)/i.test(trimmed)) {
      setFeedback({
        type: 'error',
        text: lang === 'ar' ? 'يرجى إدخال رابط صحيح يبدأ بـ https://' : 'Please enter a valid https:// URL.',
      });
      return;
    }

    const type: 'image' | 'video' = urlKind === 'auto' ? inferMediaTypeFromUrl(trimmed) : urlKind;
    const item: MediaItem = {
      id: uid('med'),
      type,
      url: trimmed,
      name: captionValue.trim() || (type === 'video' ? 'Promotional Video' : 'Service Photo'),
      caption: captionValue.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    const nextList = [...items, item];
    onChange(nextList);
    if (onSetCover && !coverImageUrl && type === 'image') {
      onSetCover(trimmed);
    }
    setUrlValue('');
    setCaptionValue('');
  }

  function handleRemove(id: string) {
    const removed = items.find((m) => m.id === id);
    const nextList = items.filter((m) => m.id !== id);
    onChange(nextList);
    if (onSetCover && removed && removed.url === coverImageUrl) {
      const nextImg = nextList.find((m) => m.type === 'image');
      if (nextImg) onSetCover(nextImg.url);
    }
  }

  function handleCaptionChange(id: string, caption: string) {
    onChange(items.map((m) => (m.id === id ? { ...m, caption } : m)));
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 bg-slate-50/40 dark:bg-slate-900/30">
      <div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
          {title ||
            (lang === 'ar'
              ? 'مكتبة الصور والفيديوهات'
              : 'Photos & Promotional Videos')}
        </h4>
        <p className="text-xs text-slate-500 mt-0.5">
          {subtitle ||
            (lang === 'ar'
              ? 'ارفع صورًا وفيديوهات من جهازك أو أضف روابط مباشرة لتظهر فورًا في حسابك وصفحات السوق.'
              : 'Upload images and videos from your device or paste links—updates appear across your profile and marketplace.')}
        </p>
      </div>

      {/* Drag & Drop File Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void processFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
          dragging
            ? 'border-[#F95738] bg-orange-50/40 dark:bg-orange-950/20'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void processFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <Upload className="w-6 h-6 text-slate-400 mx-auto" />
        <p className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-200">
          {lang === 'ar'
            ? 'اسحب الصور أو الفيديوهات وأفلتها هنا، أو اختر ملفات من جهازك'
            : 'Drag & drop photos or videos here, or select files from your device'}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          JPG, PNG, WebP, MP4, WebM
        </p>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>
            {uploading
              ? lang === 'ar'
                ? 'جاري الرفع...'
                : 'Uploading...'
              : lang === 'ar'
              ? 'اختيار صور أو فيديوهات'
              : 'Choose Photos / Videos'}
          </span>
        </button>
      </div>

      {/* Add via Direct URL (Images, MP4, YouTube, Vimeo) */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        <div className="sm:col-span-5 relative">
          <Link2 className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
          <input
            type="url"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder={
              lang === 'ar'
                ? 'رابط صورة أو فيديو (MP4 / YouTube)...'
                : 'Image or Video URL (MP4 / YouTube)...'
            }
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 ps-8 pe-3 py-2 text-xs"
          />
        </div>
        <select
          value={urlKind}
          onChange={(e) => setUrlKind(e.target.value as 'auto' | 'image' | 'video')}
          className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs"
        >
          <option value="auto">{lang === 'ar' ? 'تلقائي' : 'Auto'}</option>
          <option value="image">{lang === 'ar' ? 'صورة' : 'Image'}</option>
          <option value="video">{lang === 'ar' ? 'فيديو' : 'Video'}</option>
        </select>
        <input
          type="text"
          value={captionValue}
          onChange={(e) => setCaptionValue(e.target.value)}
          placeholder={lang === 'ar' ? 'وصف اختياري...' : 'Caption (optional)...'}
          className="sm:col-span-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
        />
        <button
          type="button"
          onClick={handleAddByUrl}
          className="sm:col-span-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-400 px-3 py-2 text-xs font-semibold cursor-pointer"
        >
          {lang === 'ar' ? '+ إضافة رابط' : '+ Add URL'}
        </button>
      </div>

      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`rounded-lg border px-3 py-2 text-xs ${
            feedback.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Uploaded Media Grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => {
            const isCover = Boolean(coverImageUrl && item.url === coverImageUrl);
            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden flex flex-col"
              >
                <div className="aspect-video w-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                  <MediaRenderer item={item} className="h-full w-full object-cover" />
                  <span className="absolute top-2 start-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950/75 text-white text-[10px] font-medium">
                    {item.type === 'video' ? (
                      <>
                        <Film className="w-3 h-3" />
                        <span>{lang === 'ar' ? 'فيديو' : 'Video'}</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3 h-3" />
                        <span>{lang === 'ar' ? 'صورة' : 'Image'}</span>
                      </>
                    )}
                  </span>
                  {isCover && (
                    <span className="absolute top-2 end-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{lang === 'ar' ? 'الغلاف' : 'Cover'}</span>
                    </span>
                  )}
                </div>

                <div className="p-2.5 space-y-2">
                  <input
                    type="text"
                    value={item.caption ?? item.name}
                    onChange={(e) => handleCaptionChange(item.id, e.target.value)}
                    placeholder={lang === 'ar' ? 'أضف وصفًا...' : 'Add caption...'}
                    className="w-full rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs"
                  />
                  <div className="flex items-center justify-between gap-2">
                    {onSetCover && item.type === 'image' ? (
                      <button
                        type="button"
                        onClick={() => onSetCover(item.url)}
                        className={`inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer ${
                          isCover
                            ? 'text-emerald-600'
                            : 'text-blue-600 hover:underline'
                        }`}
                      >
                        <Star className="w-3 h-3" />
                        <span>
                          {isCover
                            ? lang === 'ar'
                              ? 'صورة الغلاف'
                              : 'Cover Image'
                            : lang === 'ar'
                            ? 'تعيين كغلاف'
                            : 'Set as Cover'}
                        </span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 truncate">{item.name}</span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      aria-label="Remove media"
                      className="inline-flex items-center gap-1 text-[11px] text-red-600 hover:underline cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{lang === 'ar' ? 'حذف' : 'Remove'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
