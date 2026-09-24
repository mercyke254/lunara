import Link from "next/link";
import {
  ArrowRight,
  Baby,
  Bell,
  BookOpen,
  CalendarDays,
  ChartLine,
  Check,
  Droplets,
  Egg,
  EyeOff,
  Fingerprint,
  HeartPulse,
  KeyRound,
  Layers,
  Lock,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { LunaraLogo } from "@/components/brand/lunara-logo";
import { CycleRing } from "@/components/dashboard/cycle-ring";
import {
  CalendarPreview,
  InsightsPreview,
  WellnessPreview,
} from "@/components/marketing/previews";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE, DISCLAIMERS } from "@/lib/constants";

/**
 * Marketing landing page.
 *
 * Intentionally fully static: no session lookup, no database access, no client
 * JavaScript beyond the shared providers. That keeps it fast, cacheable, and
 * unaffected by a cold database.
 */

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Period tracking that adapts",
    body: "Mark the start and end of each period, correct past entries, and see recorded, predicted, and estimated fertile days on one calendar.",
    tone: "text-[var(--phase-menstrual)]",
  },
  {
    icon: ChartLine,
    title: "Insights in plain language",
    body: "Average, shortest, and longest cycle, period duration, regularity, and how your cycles are trending over time.",
    tone: "text-primary",
  },
  {
    icon: Egg,
    title: "Ovulation and fertility estimates",
    body: "An estimated fertile window and ovulation day, always labelled as an estimate and never as a guarantee.",
    tone: "text-[var(--phase-ovulation)]",
  },
  {
    icon: HeartPulse,
    title: "Daily logging that takes a minute",
    body: "Symptoms with optional intensity, eight mood options, body and lifestyle metrics, and private sexual-health tracking.",
    tone: "text-[var(--accent-rose)]",
  },
  {
    icon: Droplets,
    title: "Wellness patterns, not scorecards",
    body: "Sleep, water, movement, energy, and stress over time — so you can see what actually shifts how you feel.",
    tone: "text-[var(--accent-blue)]",
  },
  {
    icon: BookOpen,
    title: "An education hub you can trust",
    body: "Eleven categories covering the cycle, PMS, fertility, pregnancy, nutrition, sleep, and sexual health in clear language.",
    tone: "text-[var(--success)]",
  },
  {
    icon: Baby,
    title: "Pregnancy mode",
    body: "Estimated due date, week-by-week timeline, appointment reminders, and symptom tracking, with honest medical context.",
    tone: "text-primary",
  },
  {
    icon: Bell,
    title: "Reminders you actually control",
    body: "Period, fertile window, daily log, medication, appointment, and custom reminders — each switchable on its own.",
    tone: "text-[var(--warning)]",
  },
] as const;

const PRIVACY_POINTS = [
  {
    icon: KeyRound,
    title: "Passwords are never stored",
    body: "Passwords are hashed with bcrypt at cost 12, so the original is unrecoverable — even by us.",
  },
  {
    icon: EyeOff,
    title: "Security answers are hashed too",
    body: "Recovery answers are normalised, then hashed. They are never stored in plain text, never returned by an API, and never logged.",
  },
  {
    icon: Fingerprint,
    title: "Sessions you can end anywhere",
    body: "Sessions are opaque tokens; only their hashes are stored. Review active devices and sign out of all of them at once.",
  },
  {
    icon: Lock,
    title: "Only you can read your logs",
    body: "Every query is scoped to the signed-in account. Administrators see aggregate counts — never your health records.",
  },
  {
    icon: Layers,
    title: "Your data, portable",
    body: "Export everything you have logged as JSON at any time. Credentials and hashes are never included in an export.",
  },
  {
    icon: Trash2,
    title: "Real deletion",
    body: "Deleting your account removes your logs, cycles, and reminders immediately and invalidates every session.",
  },
] as const;

const FAQ = [
  {
    q: "Is Lunara free to use?",
    a: "This deployment of Lunara is a self-hosted application, so there is no subscription and no advertising. You run it against your own database, and your data stays there.",
  },
  {
    q: "Can Lunara tell me when I am ovulating?",
    a: "No, and it will not pretend to. Lunara estimates a fertile window and an ovulation day using the dates you log and the typical length of the luteal phase. That is calendar arithmetic, not a measurement of your body. Only methods such as ovulation testing or ultrasound can confirm ovulation.",
  },
  {
    q: "Can I use Lunara as contraception?",
    a: "No. Calendar-based estimates are not reliable enough to prevent pregnancy, and Lunara is not designed or validated for that purpose. If you are avoiding pregnancy, please talk to a healthcare professional about methods with evidence behind them.",
  },
  {
    q: "How private is my health data?",
    a: "Your logs belong to your account and only your account. Passwords and security answers are hashed, IP addresses are stored only as keyed digests, and administrators can see anonymous aggregate statistics but never individual entries. Sexual-health logs are private by default and excluded from aggregates.",
  },
  {
    q: "My cycles are irregular. Is Lunara still useful?",
    a: "Yes, and Lunara is careful not to overstate itself when they are. When your logged cycles vary widely, Lunara widens the uncertainty on every prediction, lowers its stated confidence, and tells you that it has done so rather than showing a single confident-looking date. For irregular or absent cycles, a clinician's input is worth far more than an app's estimate.",
  },
  {
    q: "Does Lunara replace a doctor?",
    a: "No. Lunara tracks what you record, calculates estimates from it, and offers general educational articles. It does not diagnose conditions, interpret symptoms, or give medical instructions. If something concerns you, please speak to a healthcare professional.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>

      {/* ---------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ---------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="rounded-xl focus-visible:outline-none" aria-label={`${APP_NAME} home`}>
            <LunaraLogo size={34} />
          </Link>

          <nav aria-label="Sections" className="ml-8 hidden items-center gap-7 lg:flex">
            <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#preview" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Preview
            </a>
            <a href="#privacy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Privacy
            </a>
            <a href="#faq" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main">
        {/* -------------------------------------------------------------- */}
        {/* Hero                                                            */}
        {/* -------------------------------------------------------------- */}
        <section className="bg-lunara-wash relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-24">
            <div className="animate-fade-in-up">
              <Badge variant="outline" className="mb-5 gap-1.5 border-primary/25 bg-card/70 px-3 py-1">
                <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
                Private by design
              </Badge>

              <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Understand your cycle.
                <br />
                <span className="text-gradient-lunara">Understand yourself.</span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {APP_DESCRIPTION}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/register">
                    Get started free
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>

              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                {[
                  "No ads",
                  "No selling your data",
                  "Export anytime",
                  "Delete anytime",
                ].map((point) => (
                  <li key={point} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Check className="size-3.5 text-primary" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-sm">
                <div className="rounded-[2rem] border border-border bg-card/80 p-7 shadow-lift backdrop-blur">
                  <CycleRing cycleDay={14} cycleLength={28} phase="OVULATION" size={248} />
                  <div className="mt-6 space-y-3 border-t border-border pt-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Estimated ovulation</span>
                      <span className="font-medium">in 1 day</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Next period</span>
                      <span className="font-medium">in 14 days</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Average cycle</span>
                      <span className="font-medium">28 days</span>
                    </div>
                  </div>
                  <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                    Illustrative preview with sample data. Lunara labels every
                    prediction as an estimate.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* Features                                                        */}
        {/* -------------------------------------------------------------- */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything in one considered place
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Lunara tracks your cycle, your symptoms, and your day-to-day
              wellness — then explains what the numbers mean without pretending
              to be a doctor.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body, tone }) => (
              <article
                key={title}
                className="rounded-3xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift dark:shadow-none"
              >
                <span
                  className={`flex size-10 items-center justify-center rounded-2xl bg-muted ${tone}`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* Product preview                                                 */}
        {/* -------------------------------------------------------------- */}
        <section id="preview" className="border-y border-border bg-muted/40 py-16 lg:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                A closer look
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Three of the screens you will use most. Each preview below uses
                sample data.
              </p>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              <div className="animate-fade-in-up space-y-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-[var(--phase-menstrual)]" aria-hidden="true" />
                  <h3 className="font-display text-lg font-semibold">Period calendar</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Recorded days, predicted days, your estimated fertile window,
                  and estimated ovulation — all on one grid, with past entries
                  editable and deletable.
                </p>
                <CalendarPreview />
              </div>

              <div className="animate-fade-in-up space-y-4">
                <div className="flex items-center gap-2">
                  <ChartLine className="size-4 text-primary" aria-hidden="true" />
                  <h3 className="font-display text-lg font-semibold">Cycle insights</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Averages, shortest and longest cycle, period duration,
                  regularity, and symptom and mood trends — each explained in a
                  sentence rather than a medical claim.
                </p>
                <InsightsPreview />
              </div>

              <div className="animate-fade-in-up space-y-4">
                <div className="flex items-center gap-2">
                  <Droplets className="size-4 text-[var(--accent-blue)]" aria-hidden="true" />
                  <h3 className="font-display text-lg font-semibold">Wellness tracking</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Sleep, water, movement, energy, and stress, charted alongside
                  your cycle so you can spot what actually helps.
                </p>
                <WellnessPreview />
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* Privacy                                                         */}
        {/* -------------------------------------------------------------- */}
        <section id="privacy" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16">
            <div>
              <Badge variant="outline" className="mb-5 gap-1.5 border-primary/25 px-3 py-1">
                <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
                Privacy and security
              </Badge>
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Built like your data matters.
                <br />
                Because it does.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Health data is sensitive, so Lunara makes a point of storing as
                little as possible and hashing whatever it must keep. Nothing
                here is a marketing claim you have to take on faith — it is how
                the application is built.
              </p>
              <div className="mt-6 rounded-2xl border border-border bg-card p-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {DISCLAIMERS.SYMPTOMS}
                </p>
              </div>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2">
              {PRIVACY_POINTS.map(({ icon: Icon, title, body }) => (
                <li
                  key={title}
                  className="rounded-2xl border border-border bg-card p-4 shadow-soft dark:shadow-none"
                >
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* FAQ                                                             */}
        {/* -------------------------------------------------------------- */}
        <section id="faq" className="border-t border-border bg-muted/40 py-16 lg:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Questions people ask
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-base leading-relaxed text-muted-foreground">
              Straight answers, including the ones that are inconvenient.
            </p>

            <div className="mt-10 space-y-3">
              {FAQ.map(({ q, a }) => (
                /* Native <details> so the FAQ works without JavaScript and is
                   keyboard-accessible by default. */
                <details
                  key={q}
                  className="group rounded-2xl border border-border bg-card px-5 py-4 shadow-soft open:shadow-lift dark:shadow-none"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold marker:content-none">
                    {q}
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform group-open:rotate-45"
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* Final CTA                                                       */}
        {/* -------------------------------------------------------------- */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="bg-lunara-mesh relative overflow-hidden rounded-[2rem] border border-border bg-card px-6 py-14 text-center shadow-soft sm:px-12">
            <LunaraLogo size={44} showWordmark={false} className="mx-auto" />
            <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Start with one cycle
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
              Log your last period and Lunara will begin estimate your phase,
              your fertile window, and when to expect the next one. It gets more
              accurate with every cycle you record.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/register">
                  <MousePointerClick aria-hidden="true" />
                  Create your account
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/education">
                  <BookOpen aria-hidden="true" />
                  Browse the education hub
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                            */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
            <div>
              <LunaraLogo size={32} />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {APP_TAGLINE}
              </p>
              <p className="mt-4 max-w-xs text-xs leading-relaxed text-muted-foreground">
                {DISCLAIMERS.ESTIMATE}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Product
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><a href="#features" className="text-muted-foreground transition-colors hover:text-foreground">Features</a></li>
                <li><a href="#preview" className="text-muted-foreground transition-colors hover:text-foreground">Preview</a></li>
                <li><Link href="/education" className="text-muted-foreground transition-colors hover:text-foreground">Education hub</Link></li>
                <li><a href="#faq" className="text-muted-foreground transition-colors hover:text-foreground">FAQ</a></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Account
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/register" className="text-muted-foreground transition-colors hover:text-foreground">Create account</Link></li>
                <li><Link href="/login" className="text-muted-foreground transition-colors hover:text-foreground">Sign in</Link></li>
                <li><Link href="/forgot-password" className="text-muted-foreground transition-colors hover:text-foreground">Forgot password</Link></li>
                <li><Link href="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">Privacy centre</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Safety
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><a href="#privacy" className="text-muted-foreground transition-colors hover:text-foreground">How we protect data</a></li>
                <li><a href="#faq" className="text-muted-foreground transition-colors hover:text-foreground">Fertility estimates</a></li>
                <li><a href="#faq" className="text-muted-foreground transition-colors hover:text-foreground">Medical scope</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              © {new Date().getUTCFullYear()} {APP_NAME}. A tracking and wellness application.
            </p>
            <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
              {APP_NAME} does not diagnose conditions and is not a substitute for
              professional medical care. {DISCLAIMERS.SEEK_CARE}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
