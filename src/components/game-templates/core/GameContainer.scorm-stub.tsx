/**
 * SCORM player stub — games are disabled in the published package so unused
 * templates (Millionaire, Escape Room, etc.) are not bundled into player.js.
 */
export function GameContainer({ payload }: { payload?: { title?: string } }) {
  return (
    <div className="flex items-center justify-center w-full h-full p-6 text-slate-300 bg-slate-900">
      <p className="text-sm font-medium">
        {payload?.title ? `${payload.title} is not included in this published package.` : 'Games are not included in this published package.'}
      </p>
    </div>
  );
}
