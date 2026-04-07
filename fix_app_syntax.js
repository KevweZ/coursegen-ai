const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `              Submit
  const [includeModuleTitleSlides, setIncludeModuleTitleSlides] = useState(true);`;

const replacement = `              Submit
            </button>
          ) : (
            <span className="text-sm font-bold text-gray-400">Response Submitted</span>
          )}
        </div>

        {answered && slideState && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "p-5 mt-4 rounded-xl text-sm font-semibold border shadow-md flex flex-col gap-3",
              slideState.isCorrect
                ? "bg-emerald-100 text-emerald-900 border-emerald-300/50"
                : "bg-rose-100 text-rose-900 border-rose-300/50"
            )}
          >
            <div>
              {slideState.isCorrect ? "✓ Correct! " : "✗ Incorrect. "}
              <span className="font-normal mt-1 text-gray-800">
                {slide.interactions?.[0]?.feedback || slide.data?.feedback || "Review your placements carefully based on the course material."}
              </span>
            </div>

            {/* Injected Answer Key (Only if Incorrect) */}
            {!slideState.isCorrect && slide.data && (
              <div className="mt-2 p-4 bg-white/60 rounded-lg border border-rose-200/50 flex flex-col gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-rose-800 mb-1">Correct Answers:</p>
                
                {slide.type === 'matching' && slide.data.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-gray-700">{item.content}</span>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    <span className="text-emerald-700 font-bold">
                       {slide.data.targets?.find((t: any) => t.id === item.matchId)?.content || item.matchId || 'Unmapped'}
                    </span>
                  </div>
                ))}

                {slide.type === 'drag-drop-activity' && slide.data.items?.map((item: any, idx: number) => {
                  const correctTarget = slide.data.targets?.find((t: any) => t.accepts?.includes(item.id));
                  return (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-gray-700">{item.content}</span>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      <span className="text-emerald-700 font-bold">
                         {correctTarget?.label || correctTarget?.title || correctTarget?.content || 'Unmapped'}
                      </span>
                    </div>
                  );
                })}

                {slide.type === 'sorting' && slide.data.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-gray-700">{item.content}</span>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    <span className="text-emerald-700 font-bold">
                       {slide.data.groups?.find((g: any) => g.id === item.groupId)?.title || item.groupId}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const isScormPlayer = typeof window !== 'undefined' && !!(window as any).__COURSE_DATA__;
  
  const [step, setStep] = useState<any>(isScormPlayer ? 'preview' : 'home');
  const [courseTitle, setCourseTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<any>(isScormPlayer ? (window as any).__COURSE_DATA__ : null);
  const [outlineDraft, setOutlineDraft] = useState<any>(null);
  const [skipOutlineReview, setSkipOutlineReview] = useState(false);
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [theme, setTheme] = useState<'light' | 'dark' | 'unified'>('dark');
  const [variables, setVariables] = useState<Record<string, any>>({});
  const [slideStates, setSlideStates] = useState<Record<string, any>>({});
  const [showImageGalleryForSlide, setShowImageGalleryForSlide] = useState<string | null>(null);

  // Game Mode State
  const [isGameMode, setIsGameMode] = useState(false);
  const [selectedGameTemplate, setSelectedGameTemplate] = useState<any | null>(null);

  // Course Details State
  const [courseType, setCourseType] = useState<any>('standard');
  const [learningObjectives, setLearningObjectives] = useState<string[]>([]);
  const [abcdFormat, setAbcdFormat] = useState<'AB' | 'ABC' | 'ABCD'>('ABCD');
  const [slideCount, setSlideCount] = useState(14);
  const [interactionTypes, setInteractionTypes] = useState<string[]>(['choice', 'drag-drop', 'accordion', 'flashcards']);
  const [voiceOverEnabled, setVoiceOverEnabled] = useState(true);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  const [includeObjectiveSlides, setIncludeObjectiveSlides] = useState(true);
  const [includeSummarySlides, setIncludeSummarySlides] = useState(true);
  const [includeModuleTitleSlides, setIncludeModuleTitleSlides] = useState(true);`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', code, 'utf-8');
  console.log("Success!");
} else {
  // try \r\n
  const altTarget = target.replace(/\n/g, '\r\n');
  if (code.includes(altTarget)) {
    code = code.replace(altTarget, replacement.replace(/\n/g, '\r\n'));
    fs.writeFileSync('src/App.tsx', code, 'utf-8');
    console.log("Success with CRLF!");
  } else {
    console.log("Target not found!");
  }
}
