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
 * Split title: first word on line 1, ALL remaining words on line 2.
 * This avoids lone-word hangers on line 2.
 * If the title is a single word, line2 is empty.
 */
function splitTitle(title: string): [string, string] {
  const words = title.trim().split(/\s+/);
  if (words.length <= 1) return [words[0] || '', ''];
  return [words[0], words.slice(1).join(' ')];
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
        className="flex flex-col justify-center px-10 py-10"
        style={{ width: '52%', flexShrink: 0, backgroundColor: leftBg }}
      >
        {/* Two-tone title — wider wrap zone */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ maxWidth: '100%' }}
        >
          {/* Line 1: first word — dark color */}
          <div
            className="font-extrabold leading-tight tracking-tight"
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 4rem)',
              color: darkText,
              wordBreak: 'keep-all',
            }}
          >
            {line1}
          </div>

          {/* Line 2: remaining words — accent color, same size */}
          {line2 && (
            <div
              className="font-extrabold leading-tight tracking-tight"
              style={{
                fontSize: 'clamp(2.2rem, 5vw, 4rem)',
                color: accent,
                wordBreak: 'keep-all',
                whiteSpace: 'nowrap',
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
