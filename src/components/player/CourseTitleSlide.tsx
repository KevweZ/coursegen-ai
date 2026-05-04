import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Camera } from 'lucide-react';
import { cn } from '../../lib/utils';

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

// Default accent colors per theme
const THEME_ACCENT: Record<Theme, string> = {
  light:   '#4f46e5', // indigo-600
  dark:    '#818cf8', // indigo-400
  unified: '#7c3aed', // violet-600
};

// Split course title into two lines at natural midpoint
function splitTitle(title: string): [string, string] {
  const words = title.trim().split(/\s+/);
  if (words.length <= 2) return [words[0] || '', words.slice(1).join(' ')];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

export const CourseTitleSlide: React.FC<CourseTitleSlideProps> = ({
  title,
  description,
  coverImage,
  accentColor,
  theme,
  onImageUpload,
  isPreviewMode = false,
}) => {
  const accent = accentColor || THEME_ACCENT[theme];
  const [line1, line2] = splitTitle(title);
  const [hovering, setHovering] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const darkText = theme === 'light' ? '#1a1f3c' : '#ffffff';
  const leftBg   = theme === 'light' ? '#ffffff' : theme === 'dark' ? '#0f172a' : '#1e1b4b';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageUpload) return;
    const url = URL.createObjectURL(file);
    onImageUpload(url);
  };

  return (
    <div className="w-full h-full flex flex-row overflow-hidden">
      {/* ── Left text panel ───────────────────────────────────── */}
      <div
        className="flex flex-col justify-center px-10 py-10"
        style={{ width: '55%', flexShrink: 0, backgroundColor: leftBg }}
      >
        {/* Logo placeholder row — reserved for future org logo */}
        <div className="mb-10" />

        {/* Two-tone title */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div
            className="font-extrabold leading-none tracking-tight"
            style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', color: darkText }}
          >
            {line1}
          </div>
          {line2 && (
            <div
              className="font-extrabold leading-none tracking-tight mt-1"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', color: accent }}
            >
              {line2}
            </div>
          )}
        </motion.div>

        {/* Descriptor / description */}
        {description && (
          <motion.p
            className="mt-5 text-sm font-medium tracking-widest uppercase"
            style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            {description}
          </motion.p>
        )}
      </div>

      {/* ── Right image panel ─────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Image */}
        {coverImage ? (
          <img
            src={coverImage}
            alt="Course cover"
            className="w-full h-full object-cover"
          />
        ) : (
          /* Default gradient placeholder */
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg, ${accent}55 0%, ${accent}22 50%, #1e293b 100%)`,
            }}
          />
        )}

        {/* Upload overlay (edit mode only) */}
        {!isPreviewMode && onImageUpload && (
          <div
            className={cn(
              'absolute inset-0 flex flex-col items-center justify-center cursor-pointer transition-all duration-200',
              hovering ? 'bg-black/50 opacity-100' : 'opacity-0'
            )}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="w-8 h-8 text-white mb-2" />
            <span className="text-white text-sm font-medium">Click to replace image</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>

      {/* ── Accent color strip (far right) ────────────────────── */}
      <div
        className="shrink-0"
        style={{ width: '6%', backgroundColor: accent }}
      />
    </div>
  );
};

export default CourseTitleSlide;
