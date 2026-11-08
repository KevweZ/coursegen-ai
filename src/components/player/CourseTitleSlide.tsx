import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlignCenter, AlignLeft, AlignRight, Camera, ImageOff, Loader2, RefreshCw, X } from 'lucide-react';
import { courseTitleForDisplay } from '../../lib/splitCourseTitle';
import { type CoverTitleAlign, resolveCoverTitleAlign } from '../../lib/promoteSlideImages';
import { EnlargeableImage, type InFlowPromoteInfo } from './EnlargeableImage';

type Theme = 'light' | 'dark' | 'unified';

interface CourseTitleSlideProps {
  title: string;
  description?: string;
  /** AI-generated (or user-uploaded) cover — never a stock photo archive fallback */
  coverImage?: string;
  /** Author typed this title in Edit Slide — do not strip lead-ins like “Overview of”. */
  verbatimTitle?: boolean;
  accentColor?: string;
  theme: Theme;
  onImageUpload?: (url: string) => void;
  isPreviewMode?: boolean;
  /** True while /api/generate-image is in progress for this course */
  isGeneratingCover?: boolean;
  /** When true, hide the right image panel and center the title text */
  hideImagePanel?: boolean;
  /** Authoring: Crop / Move / Delete — same chrome as other in-flow images. */
  onRemove?: () => void;
  onCrop?: (dataUrl: string) => void;
  onPromoteToFloat?: (info: InFlowPromoteInfo) => void;
  onRegenerate?: () => void;
  regenerating?: boolean;
  /** Hide the right cover panel entirely (author dismissed it). */
  coverPanelHidden?: boolean;
  /** A moved cover photo is already on the float canvas — don't show the empty CTA under it. */
  hasFloatingCover?: boolean;
  coverTitleAlign?: CoverTitleAlign;
  onTitleAlign?: (align: CoverTitleAlign) => void;
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

export const CourseTitleSlide: React.FC<CourseTitleSlideProps> = ({
  title,
  description,
  coverImage,
  verbatimTitle = false,
  accentColor,
  theme,
  onImageUpload,
  isPreviewMode = false,
  isGeneratingCover = false,
  hideImagePanel = false,
  onRemove,
  onCrop,
  onPromoteToFloat,
  onRegenerate,
  regenerating = false,
  coverPanelHidden = false,
  hasFloatingCover = false,
  coverTitleAlign = 'left',
  onTitleAlign,
}) => {
  const accent   = accentColor || THEME_ACCENT[theme];
  const darkText = THEME_DARK_TEXT[theme];
  const leftBg   = THEME_LEFT_BG[theme];
  const descColor = THEME_DESC_COLOR[theme];
  const align = resolveCoverTitleAlign(coverTitleAlign);

  const { primary, secondary, secondaryFirst } = courseTitleForDisplay(title, verbatimTitle);
  const [hovering, setHovering] = useState(false);

  const canReplace = typeof onImageUpload === 'function';
  const displayImage = coverImage || null;
  const generating = isGeneratingCover || regenerating;
  const showImagePanel = generating
    ? true
    : coverPanelHidden
      ? false
      : hasFloatingCover && !displayImage
        ? false
        : (!hideImagePanel || !!displayImage);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onImageUpload?.(url);
  };

  const primaryStyle: React.CSSProperties = {
    fontSize: showImagePanel
      ? 'clamp(2.4rem, 5.5vw, 4.25rem)'
      : 'clamp(2.6rem, 6vw, 4.75rem)',
    color: darkText,
    wordBreak: 'keep-all',
  };

  const secondaryStyle: React.CSSProperties = {
    fontSize: showImagePanel
      ? 'clamp(1.15rem, 2.4vw, 1.75rem)'
      : 'clamp(1.25rem, 2.8vw, 2rem)',
    color: darkText,
    opacity: 0.82,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    maxWidth: '100%',
  };

  const primaryLine = (
    <div className="font-extrabold leading-tight tracking-tight" style={primaryStyle}>
      {primary}
    </div>
  );

  const secondaryLine = secondary ? (
    <div
      className={`font-semibold leading-snug tracking-tight ${secondaryFirst ? 'mb-1' : 'mt-1'}`}
      style={secondaryStyle}
    >
      {secondary}
    </div>
  ) : null;

  const titleAlignClass =
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  const titleBlockStyle: React.CSSProperties = {
    maxWidth: showImagePanel ? '100%' : '46rem',
    marginLeft: align === 'right' ? 'auto' : align === 'center' ? 'auto' : undefined,
    marginRight: align === 'left' ? undefined : align === 'center' ? 'auto' : undefined,
    width: showImagePanel ? '100%' : 'min(46rem, 100%)',
  };

  const titleBlock = (
    <motion.div
      initial={{ opacity: 0, x: showImagePanel && align === 'left' ? -24 : 0, y: showImagePanel ? 0 : 12 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={titleBlockStyle}
      className={titleAlignClass}
    >
      {secondaryFirst ? (
        <>
          {secondaryLine}
          {primaryLine}
        </>
      ) : (
        <>
          {primaryLine}
          {secondaryLine}
        </>
      )}

      {description && description.trim() && (
        <motion.p
          className={cnDesc(showImagePanel)}
          style={{
            color: descColor,
            maxWidth: showImagePanel ? '36rem' : '40rem',
            marginLeft: align === 'left' ? undefined : 'auto',
            marginRight: align === 'right' ? undefined : align === 'center' ? 'auto' : undefined,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          {description}
        </motion.p>
      )}
    </motion.div>
  );

  const alignBar = isPreviewMode && onTitleAlign ? (
    <div className="absolute top-3 left-3 z-[4] inline-flex items-center rounded-lg border border-slate-200/80 bg-white/90 shadow-sm overflow-hidden">
      {([
        { id: 'left' as const, Icon: AlignLeft, title: 'Align left' },
        { id: 'center' as const, Icon: AlignCenter, title: 'Align center' },
        { id: 'right' as const, Icon: AlignRight, title: 'Align right' },
      ] as const).map(({ id, Icon, title: label }) => (
        <button
          key={id}
          type="button"
          title={label}
          aria-label={label}
          onClick={(e) => {
            e.stopPropagation();
            onTitleAlign(id);
          }}
          className={`p-1.5 transition-colors ${
            align === id
              ? 'bg-indigo-600 text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  ) : null;

  const columnJustify =
    align === 'center' ? 'items-center' : align === 'right' ? 'items-end' : 'items-start';

  if (!showImagePanel) {
    return (
      <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: leftBg }}>
        {alignBar}
        <div className={`flex-1 w-full h-full flex flex-col justify-center ${columnJustify} px-10 sm:px-16 py-10`}>
          {titleBlock}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-row overflow-hidden">
      <div
        className={`relative flex flex-col justify-center ${columnJustify} px-14 py-10`}
        style={{ width: '52%', flexShrink: 0, backgroundColor: leftBg }}
      >
        {alignBar}
        {titleBlock}
      </div>

      <div
        className="flex-1 relative overflow-hidden"
        onMouseEnter={() => { if (canReplace && !displayImage) setHovering(true); }}
        onMouseLeave={() => setHovering(false)}
        style={{
          background: displayImage
            ? undefined
            : `linear-gradient(135deg, ${accent}55 0%, #0f172a 55%, #1e293b 100%)`,
        }}
      >
        {displayImage ? (
          <EnlargeableImage
            src={displayImage}
            alt="Course cover"
            wrapperClassName="w-full h-full"
            className="w-full h-full object-cover"
            onRemove={onRemove}
            onCrop={onCrop}
            onPromoteToFloat={onPromoteToFloat}
            onRegenerate={onRegenerate}
            regenerating={regenerating || isGeneratingCover}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            {generating ? (
              <>
                <Loader2 className="w-8 h-8 text-white/80 animate-spin" />
                <p className="text-white/90 text-sm font-semibold">Generating topic cover…</p>
                <p className="text-white/50 text-xs max-w-[14rem]">
                  Creating an image that matches this course subject
                </p>
              </>
            ) : hasFloatingCover ? null : (
              <>
                <ImageOff className="w-8 h-8 text-white/50" />
                <p className="text-white/70 text-sm font-semibold">No cover image yet</p>
                {canReplace && (
                <p className="text-white/45 text-xs max-w-[14rem]">
                  Hover to upload, or use Edit → Regenerate cover image
                </p>
                )}
              </>
            )}
          </div>
        )}

        {(onRemove || onRegenerate) && !displayImage && (
          <div className="absolute top-2 right-2 z-[3] flex items-center gap-1">
            {onRegenerate && (
              <button
                type="button"
                title="Regenerate AI image"
                aria-label="Regenerate AI image"
                disabled={generating}
                onClick={(e) => {
                  e.stopPropagation();
                  if (generating) return;
                  onRegenerate();
                }}
                className="flex items-center gap-1 h-7 px-2 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white shadow"
              >
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${generating ? 'animate-spin' : ''}`} />
                <span className="text-[10px] font-semibold pr-0.5">AI</span>
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                title="Remove cover panel"
                aria-label="Remove cover panel"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="flex items-center justify-center w-7 h-7 rounded-full bg-red-500 hover:bg-red-400 text-white shadow"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {canReplace && !displayImage && !hasFloatingCover && (
        <label
          className="absolute inset-0 z-[1] flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
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
                Click to upload image
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
        )}
      </div>
    </div>
  );
};

function cnDesc(showImagePanel: boolean) {
  return showImagePanel
    ? 'mt-5 text-sm font-medium leading-relaxed normal-case tracking-normal'
    : 'mt-6 text-base font-medium leading-relaxed normal-case tracking-normal';
}

export default CourseTitleSlide;
