const subjects = [
  { name: "Mathematics", code: "MA201", attended: 18, total: 20 },
  { name: "Physics", code: "PH202", attended: 14, total: 20 },
  { name: "Programming", code: "CS201", attended: 18, total: 22 },
];

export default function HomePage() {
  return <main className="min-h-screen px-4 py-8 sm:px-8 lg:px-12">
    <div className="mx-auto max-w-6xl">
      <header className="flex items-center justify-between gap-4 border-b border-line pb-6">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-accent text-sm font-black text-canvas">II</div>
          <div><p className="text-sm font-semibold tracking-wide">IIITT PORTAL</p><p className="mt-1 text-xs text-muted">Student workspace</p></div>
        </div>
        <div className="flex items-center gap-3"><span className="rounded-full border border-line bg-surface px-3 py-2 text-xs text-muted">Preview · synthetic data</span><a href="/sign-in" className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-canvas">Sign in</a></div>
      </header>
      <section className="grid gap-8 py-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.22em] text-accent">Your semester, at a glance</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">Stay on top of <span className="text-accent">every subject.</span></h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted">One clear place to check course-wise attendance and help lecturers record each class session separately.</p>
        </div>
        <div className="rounded-3xl border border-line bg-surface p-6">
          <p className="text-sm text-muted">Attendance requirement</p><p className="mt-2 text-3xl font-semibold">75% <span className="text-base font-normal text-muted">per subject</span></p>
          <p className="mt-4 text-sm leading-6 text-muted">Each course is assessed independently. A strong percentage in one subject cannot offset a shortfall in another.</p>
        </div>
      </section>
      <section aria-labelledby="attendance-heading">
        <div className="mb-4"><h2 id="attendance-heading" className="text-xl font-semibold">Subject overview</h2><p className="mt-1 text-sm text-muted">Illustrative data only — sign-in is not connected yet.</p></div>
        <div className="grid gap-4 md:grid-cols-3">{subjects.map((subject) => {
          const value = subject.attended / subject.total * 100;
          const below = value < 75;
          return <article key={subject.code} className="rounded-3xl border border-line bg-surface p-5">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium tracking-wide text-muted">{subject.code}</p><h3 className="mt-2 text-lg font-semibold">{subject.name}</h3></div>
              <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${below ? "bg-risk/10 text-risk" : "bg-accent/10 text-accent"}`}>{below ? "Below target" : "On track"}</span>
            </div>
            <div className="mt-7 flex items-center gap-4">
              <div className="relative grid size-20 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${below ? "#fb7185" : "#2dd4bf"} ${value}%, #232734 0)` }}>
                <div className="grid size-[4.25rem] place-items-center rounded-full bg-surface text-sm font-semibold">{value.toFixed(1)}%</div>
              </div>
              <div><p className="text-sm text-muted">Sessions attended</p><p className="mt-1 text-lg font-semibold">{subject.attended}<span className="text-muted"> / {subject.total}</span></p><p className="mt-1 text-xs text-muted">{subject.total - subject.attended} missed</p></div>
            </div>
          </article>;
        })}</div>
      </section>
      <section className="mt-8 rounded-3xl border border-dashed border-line bg-surface/60 p-6 sm:p-8">
        <p className="text-sm font-semibold">Development status</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Authentication, approved-roster matching, database policies, and lecturer workflows are not connected in this preview. All figures are synthetic and must not be used as real attendance records.</p>
      </section>
      <footer className="py-8 text-xs text-muted">IIITT Portal · Early development scaffold</footer>
    </div>
  </main>;
}
