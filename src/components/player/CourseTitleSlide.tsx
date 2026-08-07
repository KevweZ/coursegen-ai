import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Loader2, ImageOff } from 'lucide-react';

type Theme = 'light' | 'dark' | 'unified';

interface CourseTitleSlideProps {
  title: string;
  description?: string;
  /** AI-generated (or user-uploaded) cover — never a stock photo archive fallback */
  coverImage?: string;
  accentColor?: string;
  theme: Theme;
  onImageUpload?: (url: string) => void;
  isPreviewMode?: boolean;
  /** True while /api/generate-image is in progress for this course */
  isGeneratingCover?: boolean;
  /** When true, hide the right image panel and center the title text */
  hideImagePanel?: boolean;
}

const THEME_ACCENT: Record<Theme, string> = {
  light:   '#4f46e5',
  dark:    '#818cf8',
  unified: '#7c3aed',
};

const THEME_DARK_TEXT: Record<Theme, string> = {
  light:   '#1a1f3c',
  dark:    '#ffffff',
  unified: '#e2e8f0',
};

const THEME_LEFT_BG: Record<Theme, string> = {
  light:   '#ffffff',
  dark:    '#0f172a',
  unified: '#1e1b4b',
};

const THEME_DESC_COLOR: Record<Theme, string> = {
  light:   '#6b7280',
  dark:    '#94a3b8',
  unified: '#a5b4fc',
};

const THEME_STRIP: Record<Theme, string> = {
  light:   '#e2e8f0',
  dark:    '#1e293b',
  unified: '#312e81',
};

/**
 * Split course title into bold headline + lighter subtitle.
 * Prefer "Subject: Rest…" so "Pumps: Principles, Types, and Components"
 * becomes ["Pumps:", "Principles, Types, and Components"] — not a naive
 * two-word cut that leaves "Principles," on the bold line.
 */
function splitTitle(title: string): [string, string] {
  const t = title.trim().replace(/\s+/g, ' ');
  if (!t) return ['', ''];

  const colonIdx = t.indexOf(':');
  if (colonIdx > 0 && colonIdx < t.length - 1) {
    const before = t.slice(0, colonIdx).trim();
    const after = t.slice(colonIdx + 1).trim();
    if (before && after) return [`${before}:`, after];
  }

  const dash = t.match(/^(.+?)\s+[—–]\s+(.+)$/);
  if (dash?.[1] && dash?.[2]) return [dash[1].trim(), dash[2].trim()];

  const words = t.split(' ').filter(Boolean);
  if (words.length <= 2) return [words.join(' '), ''];
  // Balanced fallback for titles without a colon
  const n = Math.min(Math.max(1, Math.ceil(words.length * 0.4)), 3);
  return [words.slice(0, n).join(' '), words.slice(n).join(' ')];
}

export const CourseTitleSlide: React.FC<CourseTitleSlideProps> = ({
  title,
  description,
  coverImage,
  accentColor,
  theme,
  onImageUpload,
  isGeneratingCover = false,
  hideImagePanel = false,
}) => {
  const accent   = accentColor || THEME_ACCENT[theme];
  const darkText = THEME_DARK_TEXT[theme];
  const leftBg   = THEME_LEFT_BG[theme];
  const descColor = THEME_DESC_COLOR[theme];
  const stripBg  = THEME_STRIP[theme];

  const [line1, line2] = splitTitle(title);
  const [hovering, setHovering] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const displayImage = uploadedImage || coverImage || null;
  // If user uploaded while "no images" mode, still show the panel
  const showImagePanel = !hideImagePanel || !!displayImage;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedImage(url);
    onImageUpload?.(url);
  };

  const titleBlock = (
    <motion.div
      initial={{ opacity: 0, x: showImagePanel ? -24 : 0, y: showImagePanel ? 0 : 12 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{ maxWidth: showImagePanel ? '100%' : '46rem' }}
      className={showImagePanel ? undefined : 'mx-auto text-center'}
    >
      <div
        className="font-extrabold leading-tight tracking-tight"
        style={{
          fontSize: showImagePanel
            ? 'clamp(2.4rem, 5.5vw, 4.25rem)'
            : 'clamp(2.6rem, 6vw, 4.75rem)',
          color: darkText,
          wordBreak: 'keep-all',
        }}
      >
        {line1}
      </div>

      {line2 && (
        <div
          className="font-semibold leading-snug tracking-tight mt-1"
          style={{
            fontSize: showImagePanel
              ? 'clamp(1.15rem, 2.4vw, 1.75rem)'
              : 'clamp(1.25rem, 2.8vw, 2rem)',
            color: darkText,
            opacity: 0.82,
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            maxWidth: '100%',
          }}
        >
          {line2}
        </div>
      )}

      {description && description.trim() && (
        <motion.p
          className={cnDesc(showImagePanel)}
          style={{ color: descColor, maxWidth: showImagePanel ? '36rem' : '40rem', marginLeft: showImagePanel ? undefined : 'auto', marginRight: showImagePanel ? undefined : 'auto' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          {description}
        </motion.p>
      )}
    </motion.div>
  );

  if (!showImagePanel) {
    return (
      <div className="w-full h-full flex flex-row overflow-hidden" style={{ backgroundColor: leftBg }}>
        <div className="flex-1 flex flex-col justify-center items-center px-10 sm:px-16 py-10">
          {titleBlock}
        </div>
        <div className="shrink-0" style={{ width: '5%', backgroundColor: stripBg }} />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-row overflow-hidden">
      <div
        className="flex flex-col justify-center px-14 py-10"
        style={{ width: '52%', flexShrink: 0, backgroundColor: leftBg }}
      >
        {titleBlock}
      </div>

      <div
        className="flex-1 relative overflow-hidden"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{
          background: displayImage
            ? undefined
            : `linear-gradient(135deg, ${accent}55 0%, #0f172a 55%, #1e293b 100%)`,
        }}
      >
        {displayImage ? (
          <img
            src={displayImage}
            alt="Course cover"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            {isGeneratingCover ? (
              <>
                <Loader2 className="w-8 h-8 text-white/80 animate-spin" />
                <p className="text-white/90 text-sm font-semibold">Generating topic cover…</p>
                <p className="text-white/50 text-xs max-w-[14rem]">
                  Creating an image that matches this course subject
                </p>
              </>
            ) : (
              <>
                <ImageOff className="w-8 h-8 text-white/50" />
                <p className="text-white/70 text-sm font-semibold">No cover image yet</p>
                <p className="text-white/45 text-xs max-w-[14rem]">
                  Hover to upload, or use Edit → Generate AI images
                </p>
              </>
            )}
          </div>
        )}

        <label
          className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
          style={{
            backgroundColor: hovering ? 'rgba(0,0,0,0.45)' : 'transparent',
          }}
        >
          {hovering && (
            <motion.div
              className="flex flex-col items-center gap-2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15 }}
            >
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                <Camera className="w-7 h-7 text-white" />
              </div>
              <span className="text-white text-sm font-semibold drop-shadow">
                Click to replace image
              </span>
            </motion.div>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>

      <div
        className="shrink-0"
        style={{ width: '7%', backgroundColor: stripBg }}
      />
    </div>
  );
};

function cnDesc(showImagePanel: boolean) {
  return showImagePanel
    ? 'mt-5 text-sm font-medium leading-relaxed normal-case tracking-normal'
    : 'mt-6 text-base font-medium leading-relaxed normal-case tracking-normal';
}

export default CourseTitleSlide;
