function FeatureIcon({ name, className }) {
  const icons = {
    matching: (
      <>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </>
    ),
    connect: (
      <>
        <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 11l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
    heatmap: (
      <>
        <rect x="3" y="3" width="4" height="4" rx="1" fill="currentColor" opacity="0.3" />
        <rect x="9" y="3" width="4" height="4" rx="1" fill="currentColor" opacity="0.6" />
        <rect x="15" y="3" width="4" height="4" rx="1" fill="currentColor" />
        <rect x="3" y="9" width="4" height="4" rx="1" fill="currentColor" opacity="0.6" />
        <rect x="9" y="9" width="4" height="4" rx="1" fill="currentColor" />
        <rect x="15" y="9" width="4" height="4" rx="1" fill="currentColor" opacity="0.3" />
        <rect x="3" y="15" width="4" height="4" rx="1" fill="currentColor" />
        <rect x="9" y="15" width="4" height="4" rx="1" fill="currentColor" opacity="0.3" />
        <rect x="15" y="15" width="4" height="4" rx="1" fill="currentColor" opacity="0.6" />
      </>
    ),
    kanban: (
      <>
        <rect x="3" y="4" width="5" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9.5" y="4" width="5" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="16" y="4" width="5" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </>
    ),
    badge: (
      <path
        d="M12 2l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-1.5L12 2z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    ),
    coverage: (
      <>
        <rect x="4" y="12" width="3.5" height="8" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="10.25" y="7" width="3.5" height="13" rx="1" fill="currentColor" />
        <rect x="16.5" y="3" width="3.5" height="17" rx="1" fill="currentColor" opacity="0.8" />
      </>
    ),
    feed: (
      <path
        d="M4 5h16a1 1 0 011 1v9a1 1 0 01-1 1H9l-4 4v-4H4a1 1 0 01-1-1V6a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    ),
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

const FEATURES = [
  {
    id: 'connect',
    icon: 'connect',
    title: 'One-click GitHub sign-in',
    desc: 'Sign in with GitHub and OSHunt reads your public repos and languages to build your stack profile automatically. No write access, no private repo access, ever.',
  },
  {
    id: 'heatmap',
    icon: 'heatmap',
    title: 'Contribution heatmap',
    desc: 'A GitHub-style heatmap of your activity over time, so your consistency is visible at a glance — not just your latest commit.',
  },
  {
    id: 'kanban',
    icon: 'kanban',
    title: "Track issues you're working",
    desc: "Move issues through a simple Kanban board — found, in progress, in review, merged — so nothing slips through once you've claimed it.",
  },
  {
    id: 'badge',
    icon: 'badge',
    title: 'Milestone badges',
    desc: 'Unlock badges automatically as you hit real milestones — first merged PR, first five issues closed, first maintainer reply — and show them off on your profile.',
  },
  {
    id: 'coverage',
    icon: 'coverage',
    title: 'Stack coverage bars',
    desc: 'See exactly how much active issue volume exists for each language and framework in your stack, so you know where your time is best spent.',
  },
  {
    id: 'feed',
    icon: 'feed',
    title: 'Learn in Public feed',
    desc: "Post what you're working on, stuck on, or just learned — and get visibility for the process itself, not only the merged PR at the end.",
  },
];

const MATCH_PREVIEW = [
  { repo: 'vercel/next.js', match: 94 },
  { repo: 'expressjs/express', match: 88 },
  { repo: 'prisma/prisma', match: 81 },
];

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-[#090909] text-white px-4 sm:px-6 py-16 sm:py-24">
      <div className="max-w-5xl mx-auto">
        {/* hero */}
        <div className="text-center mb-12 sm:mb-16 max-w-2xl mx-auto">
          <span className="inline-block text-xs sm:text-sm font-medium tracking-wide text-[#a8ff3e] mb-3">
            FEATURES
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight">
            Everything you need to start contributing
          </h1>
          <p className="mt-4 text-sm sm:text-base text-white/50">
            OSHunt handles the part that usually kills momentum — finding an issue worth your
            time. Everything else here keeps you moving once you&apos;ve found one.
          </p>
        </div>

        {/* featured: AI matching */}
        <div className="border border-white/10 rounded-2xl bg-white/[0.02] p-6 sm:p-8 mb-5 sm:mb-6 grid sm:grid-cols-2 gap-8 items-center">
          <div>
            <div className="w-10 h-10 rounded-lg bg-[#a8ff3e]/10 flex items-center justify-center mb-4">
              <FeatureIcon name="matching" className="w-5 h-5 text-[#a8ff3e]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-2">AI-powered issue matching</h2>
            <p className="text-sm sm:text-base text-white/50 leading-relaxed">
              Tell OSHunt your stack and skill level. The AI scores every open issue across
              tracked repos against your profile — language fit, complexity, recency — and hands
              you a ranked list instead of a wall of tags.
            </p>
          </div>
          <div className="space-y-2">
            {MATCH_PREVIEW.map((item) => (
              <div
                key={item.repo}
                className="border border-white/10 rounded-lg px-4 py-3 bg-white/[0.02]"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm font-medium text-white/80">
                    {item.repo}
                  </span>
                  <span className="text-xs font-medium text-[#a8ff3e]">{item.match}% match</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#a8ff3e]"
                    style={{ width: `${item.match}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* feature grid */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.id}
              className="border border-white/10 rounded-2xl bg-white/[0.02] p-6 hover:border-white/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center mb-4">
                <FeatureIcon name={f.icon} className="w-5 h-5 text-[#a8ff3e]" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* cta */}
        <div className="mt-12 sm:mt-16 text-center border border-white/10 rounded-2xl px-6 py-10 bg-white/[0.02]">
          <h2 className="text-xl sm:text-2xl font-semibold mb-2">
            Ready to find your first issue?
          </h2>
          <p className="text-sm sm:text-base text-white/50 mb-6 max-w-md mx-auto">
            Connect your GitHub and get matched in under a minute.
          </p>
          <a
            href="/onboarding"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#a8ff3e] text-[#090909] text-sm font-medium hover:bg-[#bdff66] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50"
          >
            Get matched
          </a>
        </div>
      </div>
    </main>
  );
}