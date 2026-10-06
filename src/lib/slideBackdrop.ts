export type BackdropScope = 'slide' | 'module' | 'course';

export function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read image'));
    reader.readAsDataURL(file);
  });
}

export function applySlideBackdrop(
  course: any,
  opts: {
    slideId: string;
    backgroundImage?: string | null;
    backgroundDim?: boolean;
    scope: BackdropScope;
  },
): any {
  if (!course?.modules) return course;
  const slideId = String(opts.slideId || '');
  let moduleId: string | null = null;
  for (const mod of course.modules) {
    if ((mod.slides || []).some((s: any) => String(s.id) === slideId)) {
      moduleId = String(mod.id);
      break;
    }
  }

  const patch = (slide: any) => {
    const next = { ...slide };
    if (opts.backgroundImage === null) {
      delete next.backgroundImage;
    } else if (typeof opts.backgroundImage === 'string') {
      next.backgroundImage = opts.backgroundImage;
    }
    if (typeof opts.backgroundDim === 'boolean') {
      next.backgroundDim = opts.backgroundDim;
    }
    return next;
  };

  return {
    ...course,
    modules: course.modules.map((mod: any) => {
      const inModule = String(mod.id) === moduleId;
      return {
        ...mod,
        slides: (mod.slides || []).map((slide: any) => {
          if (opts.scope === 'course') return patch(slide);
          if (opts.scope === 'module' && inModule) return patch(slide);
          if (opts.scope === 'slide' && String(slide.id) === slideId) return patch(slide);
          return slide;
        }),
      };
    }),
  };
}
