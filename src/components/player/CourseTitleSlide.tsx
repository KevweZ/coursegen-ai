import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera } from 'lucide-react';
import { getRandomBackgroundForTheme } from '../../lib/backgrounds';

type Theme = 'light' | 'dark' | 'unified';

interface CourseTitleSlideProps {
  title: string;
  description?: string;
  coverImage?: string;
  accentColor?: string;
  theme: Theme;
  onImageUpload?: (url: string) => void;
  isPreviewMode?: boolean;
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

/**
 * Split title into a short, bold "key phrase" (line 1 — up to 2 words) and a
 * smaller supporting phrase (line 2 — everything else). Both lines share the
 * same font color; only size/weight differ, so the hierarchy reads clearly
 * without the visual noise of a color change partway through the title.
 */
function splitTitle(title: string): [string, string] {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2) return [words.join(' '), ''];
  return [words.slice(0, 2).join(' '), words.slice(2).join(' ')];
}

// Pick a stable default cover image (Neutral theme BG)
const DEFAULT_COVER_IMAGE = getRandomBackgroundForTheme('Neutral');

export const CourseTitleSlide: React.FC<CourseTitleSlideProps> = ({
  title,
  description,
  coverImage,
  accentColor,
  theme,
  onImageUpload,
  isPreviewMode = false,
}) => {
  const accent   = accentColor || THEME_ACCENT[theme];
  const darkText = THEME_DARK_TEXT[theme];
  const leftBg   = THEME_LEFT_BG[theme];
  const descColor = THEME_DESC_COLOR[theme];

  const [line1, line2] = splitTitle(title);
  const [hovering, setHovering] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const displayImage = uploadedImage || coverImage || DEFAULT_COVER_IMAGE;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedImage(url);
    onImageUpload?.(url);
  };

  return (
    <div className="w-full h-full flex flex-row overflow-hidden">
      {/* ── Left text panel ───────────────────────────────────── */}
      <div
        className="flex flex-col justify-center px-14 py-10"
        style={{ width: '52%', flexShrink: 0, backgroundColor: leftBg }}
      >
        {/* Title — one key phrase (H1) + a smaller supporting phrase (H3),
            both in the same font color to keep the slide easy to scan. */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ maxWidth: '100%' }}
        >
          {/* Line 1: key phrase (first 1-2 words) — large, bold */}
          <div
            className="font-extrabold leading-tight tracking-tight"
            style={{
              fontSize: 'clamp(2.4rem, 5.5vw, 4.25rem)',
              color: darkText,
              wordBreak: 'keep-all',
            }}
          >
            {line1}
          </div>

          {/* Line 2: supporting phrase — smaller, same color, lighter weight */}
          {line2 && (
            <div
              className="font-semibold leading-snug tracking-tight mt-1"
              style={{
                fontSize: 'clamp(1.15rem, 2.4vw, 1.75rem)',
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
        </motion.div>

        {/* Descriptor */}
        {description && (
          <motion.p
            className="mt-5 text-sm font-medium tracking-widest uppercase"
            style={{ color: descColor }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            {description}
          </motion.p>
        )}
      </div>

      {/* ── Right image panel ─────────────────────────────────── */}
      <div
        className="flex-1 relative overflow-hidden"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <img
          src={displayImage}
          alt="Course cover"
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to gradient if image fails
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />

        {/* Fallback gradient (shown if image fails) */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: `linear-gradient(135deg, ${accent}44 0%, #1e293b 100%)`,
          }}
        />

        {/* Upload overlay — always available in all modes */}
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

      {/* ── Accent color strip (far right) ────────────────────── */}
      <div
        className="shrink-0"
        style={{ width: '7%', backgroundColor: accent }}
      />
    </div>
  );
};

export default CourseTitleSlide;
