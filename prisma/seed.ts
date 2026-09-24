import "dotenv/config";
import { prisma } from "../lib/db/prisma";
import { hashPassword, hashSecurityAnswer } from "../lib/auth/password-imports";
import {
  ARTICLE_CATEGORIES,
  REQUIRED_SECURITY_QUESTION_COUNT,
  SECURITY_QUESTIONS,
} from "../lib/constants";
import { addDays, toDateOnly, today } from "../lib/dates";

/**
 * Lunara seed script.
 *
 * Creates the reference data the application needs to function (security
 * questions, article categories) plus a clearly-labelled demo account with
 * sample tracking data.
 *
 * SAFETY
 *  - Refuses to run against a production database unless ALLOW_SEED=1 is set
 *    explicitly. Seeding a real deployment would create demo credentials.
 *  - Demo data lives under a dedicated `@lunara.demo` address and is created by
 *    this script only. It is never mixed into a real user's records.
 *  - Reference data uses upserts, so the script is idempotent and safe to re-run.
 *
 * Run with:  npm run db:seed
 */

const DEMO_EMAIL = "demo@lunara.demo";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@lunara.app";
const DEMO_PASSWORD = process.env.SEED_USER_PASSWORD ?? "Lunara!Demo2026";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Lunara!Admin2026";

// ---------------------------------------------------------------------------
// Article library
// ---------------------------------------------------------------------------

interface SeedArticle {
  title: string;
  slug: string;
  categorySlug: string;
  excerpt: string;
  readingTime: number;
  tags: string[];
  content: string;
}

const ARTICLES: SeedArticle[] = [
  {
    title: "How the menstrual cycle works, phase by phase",
    slug: "how-the-menstrual-cycle-works",
    categorySlug: "menstrual-cycle",
    excerpt:
      "An overview of the four phases, what changes in each, and why cycle length varies between people.",
    readingTime: 6,
    tags: ["cycle", "phases", "basics"],
    content: `The menstrual cycle is counted from the first day of one period to the day before the next period starts. Most cycles fall somewhere between 21 and 35 days, but a wide range is normal, and yours may not be the same every month.

## The four phases

### Menstrual phase
The lining of the uterus is shed. Hormone levels are at their lowest point in the cycle, which is why energy can dip and cramping is common. Bleeding typically lasts between two and seven days.

### Follicular phase
Overlapping with the end of your period, this phase runs up to ovulation. Oestrogen rises as an egg matures. Many people notice steadier energy and mood during this stretch.

### Ovulation phase
An egg is released, roughly midway through the cycle. Oestrogen peaks. This phase is usually short — around a day or two.

### Luteal phase
Progesterone rises and then falls if no pregnancy occurs. The luteal phase is the most consistent part of the cycle, typically 12 to 14 days, which is why cycle-length variation usually comes from the follicular phase.

! Cycle length is mostly determined by how long the follicular phase runs, not by the luteal phase. That is why tracking over several months tells you far more than knowing the length of any single cycle.

## Why cycles vary

Cycle length changes across a lifetime, and shorter or longer cycles are common around puberty and perimenopause. Everyday factors — stress, illness, travel, significant weight change, and intense training — can also shift a cycle.

> A single unusual cycle is usually not meaningful on its own. A pattern across several cycles is more informative.

## What tracking can and cannot tell you

Keeping a record helps you notice your own patterns, prepare for a period, and bring useful information to a doctor's appointment. It cannot tell you what is causing a change.

If your cycles are consistently shorter than 21 days or longer than 35, if bleeding is very heavy, or if your periods stop for several months without pregnancy, that is worth discussing with a healthcare professional.`,
  },
  {
    title: "Period bleeding: what is typical, and what to mention to a doctor",
    slug: "period-bleeding-what-is-typical",
    categorySlug: "period-health",
    excerpt:
      "How to think about flow, duration, and clots — and the specific changes worth raising with a clinician.",
    readingTime: 5,
    tags: ["period", "bleeding", "flow"],
    content: `Bleeding patterns vary enormously between people. There is no single "correct" period, which can make it hard to know whether what you are experiencing needs attention.

## Reasonable ranges

- Duration: commonly two to seven days
- Cycle length: commonly 21 to 35 days
- Flow: heaviest in the first two days for many people, then tapering

## Signs that are worth investigating

These are not diagnoses. They are reasons to speak to a doctor, who can assess you properly.

- Changing a pad or tampon every hour for several hours in a row
- Passing clots larger than a 50p or quarter coin, repeatedly
- Bleeding that lasts longer than seven days
- Bleeding between periods, or after sex
- Periods that have become consistently much heavier or more painful than they used to be
- Any bleeding after menopause

! Severe pain that comes on suddenly, fainting, or a high fever with pelvic pain needs urgent attention rather than an appointment. Seek urgent care.

## Tracking that helps an appointment

A clinician can do much more with concrete information than with a general impression. Useful things to bring:

1. The first day of your last few periods
2. How many days bleeding lasted
3. How often you changed protection on your heaviest day
4. Any pain, and whether it responded to painkillers
5. Any bleeding between periods

Lunara records the first three of these automatically as you log.`,
  },
  {
    title: "PMS: what it is and what tends to help",
    slug: "pms-what-it-is",
    categorySlug: "pms",
    excerpt:
      "Premenstrual symptoms are common and usually ease once bleeding starts. Here is the general picture.",
    readingTime: 5,
    tags: ["pms", "luteal", "mood"],
    content: `Premenstrual syndrome (PMS) describes physical and emotional symptoms that appear in the days before a period and ease once bleeding begins. It is very common.

## Commonly reported symptoms

- Mood changes: irritability, low mood, anxiety, tearfulness
- Physical symptoms: bloating, breast tenderness, headaches, joint or muscle aches
- Behavioural: disturbed sleep, changes in appetite, difficulty concentrating

Symptoms usually appear in the luteal phase — after ovulation and before bleeding — and resolve within a few days of the period starting. The timing is the defining feature.

! Tracking the timing is what distinguishes premenstrual symptoms from symptoms that happen at other points in the cycle. Lunara groups symptoms by phase so you can see whether yours cluster before bleeding.

## General approaches people find useful

These are general wellbeing measures, not treatments:

- Regular sleep and wake times
- Steady meals rather than long gaps, to avoid blood-sugar swings
- Regular movement, at whatever intensity feels manageable
- Reducing alcohol and caffeine in the premenstrual days
- Gentle, non-judgemental tracking, so you can plan around harder days

## When to seek help

If symptoms are significantly disrupting work, relationships, or daily life, that is not something to simply endure. A doctor can discuss options, and can also check whether something else is contributing. If symptoms are severe and follow a clear cyclical pattern, that pattern is itself useful information to bring to an appointment.`,
  },
  {
    title: "Ovulation: how it is estimated, and why it cannot be assumed",
    slug: "ovulation-how-it-is-estimated",
    categorySlug: "ovulation",
    excerpt:
      "Calendar estimates, body signs, and the honest limits of predicting ovulation from dates alone.",
    readingTime: 6,
    tags: ["ovulation", "fertility", "estimates"],
    content: `Ovulation is the release of an egg from an ovary. It usually happens once per cycle, roughly midway, but the exact day varies between people and between cycles.

## How calendar estimates work

The most common method counts backwards from the next expected period, assuming a luteal phase of about 14 days.

    ovulation day ≈ cycle length − 14

For a 28-day cycle, that puts ovulation around day 14. For a 32-day cycle, around day 18.

This works reasonably when cycles are regular, because the luteal phase is the more stable part of the cycle. It becomes much less reliable when cycles vary, because then you are guessing about the follicular phase.

! Lunara always shows an uncertainty band alongside an estimated ovulation date. An estimate for an irregular cycle may be off by many days — and pretending otherwise would be false precision.

## Body signs some people use

These vary between individuals and between cycles, so they are supportive information rather than confirmation:

- Changes in cervical mucus — often becoming clearer, wetter, and more stretchy
- A small rise in basal body temperature, which appears AFTER ovulation and therefore confirms rather than predicts
- Mittelschmerz — a one-sided twinge some people notice
- Ovulation predictor kits, which detect a hormone surge in urine

## The important limitation

None of this confirms ovulation. Only clinical methods such as ultrasound or blood tests can do that. Calendar estimates are not reliable enough to be used as contraception, and Lunara does not offer them for that purpose.

If you are trying to conceive, or trying to avoid pregnancy, a healthcare professional can discuss methods with better evidence behind them.`,
  },
  {
    title: "Understanding your fertile window",
    slug: "understanding-your-fertile-window",
    categorySlug: "fertility",
    excerpt:
      "Why the fertile window is a range rather than a day, and how to read an estimated one sensibly.",
    readingTime: 5,
    tags: ["fertility", "conception", "window"],
    content: `The fertile window is the stretch of days in a cycle when pregnancy is possible. It exists because sperm can survive for several days in the reproductive tract, while an egg remains viable for roughly a day after release.

## The typical shape

- Opens about five days before ovulation
- Includes the day of ovulation
- Closes about one day after ovulation

That makes it roughly six days long for a typical cycle.

## Estimating it

If you know the likely ovulation day, the window follows from it:

    window ≈ (ovulation day − 5) to (ovulation day + 1)

Because ovulation estimates come with uncertainty, the window itself should be treated as approximate, and it widens further when cycles are irregular.

! This is an estimate from calendar arithmetic. It is not a measurement of your body, and it is not a contraceptive method.

## Using it well

- The most fertile days are the ones closest to ovulation, not the edges of the window
- If you are trying to conceive, regular intercourse across the window is generally more useful than targeting a single day
- If you have been trying for a year without success — or six months if you are over 35 — that is a reasonable point to seek medical advice
- If your cycles are very irregular, calendar estimates are of limited use and a clinician can suggest better approaches

## If you are avoiding pregnancy

Calendar-based methods have a meaningful failure rate. Lunara does not present its estimates as protection, and you should not rely on them as such.`,
  },
  {
    title: "The first trimester: what to expect",
    slug: "first-trimester-what-to-expect",
    categorySlug: "pregnancy",
    excerpt:
      "Weeks one to thirteen: common symptoms, typical appointments, and how pregnancy is dated.",
    readingTime: 6,
    tags: ["pregnancy", "trimester", "antenatal"],
    content: `The first trimester runs from the first day of your last period through the end of week 13. Pregnancy is dated from that last period, not from conception, which is why you are already considered around four weeks pregnant at the point of a missed period.

## Common experiences

- Fatigue, which can be pronounced
- Nausea, sometimes with vomiting, often starting around week six
- Breast tenderness and enlargement
- Needing to urinate more often
- Food aversions or cravings
- Mood changes

Symptoms vary widely. Not having a particular symptom is not a sign that anything is wrong.

## Typical appointments

Schedules differ by country and provider, but a first scan is commonly offered around weeks 11 to 13. This is usually when dating is confirmed and screening options are discussed.

! A dating scan is more accurate than calendar arithmetic. If a scan gives you a due date, use it — and enter it into Lunara so your timeline matches.

## Looking after yourself

General guidance usually includes taking folic acid, avoiding alcohol, stopping smoking, and reviewing any medication with a doctor rather than stopping it alone. Your midwife or doctor can give advice specific to you.

## When to seek help promptly

Contact your midwife, doctor, or urgent care if you have:

- Bleeding that is heavy, or accompanied by pain
- Severe or one-sided abdominal pain
- Persistent vomiting and inability to keep fluids down
- Fever
- Painful urination`,
  },
  {
    title: "Iron and your cycle",
    slug: "iron-and-your-cycle",
    categorySlug: "nutrition",
    excerpt:
      "Why iron matters more during your period, and which foods help you absorb it.",
    readingTime: 4,
    tags: ["nutrition", "iron", "period"],
    content: `Iron is used to make red blood cells, which carry oxygen around the body. Menstrual bleeding is a regular source of iron loss, so it is a nutrient worth knowing about.

## Two kinds of dietary iron

- Haem iron, found in red meat, poultry, and fish, which the body absorbs relatively easily
- Non-haem iron, found in beans, lentils, tofu, spinach, fortified cereals, and dried fruit

## Absorption, not just intake

Vitamin C helps the body absorb non-haem iron. Pairing iron-rich plant foods with citrus, peppers, or tomatoes is a simple way to get more from them.

Conversely, tannins in tea and coffee, and calcium in dairy, can reduce absorption when consumed at the same time. Timing them a little apart from iron-rich meals is commonly suggested.

## When to ask about it

Fatigue is common and has many possible causes, only one of which is iron. Heavy periods in particular make iron deficiency more likely.

Do not start high-dose iron supplements on a guess: too much iron is harmful, and a simple blood test can establish whether you actually need it. If you are persistently tired, especially with heavy bleeding, that is worth raising with a doctor.`,
  },
  {
    title: "Moving with your cycle",
    slug: "moving-with-your-cycle",
    categorySlug: "exercise",
    excerpt:
      "Adjusting training intensity to how you feel across the cycle, without overthinking it.",
    readingTime: 4,
    tags: ["exercise", "training", "energy"],
    content: `There is no evidence-based rule that says you must train differently at each phase. The more useful approach is to let how you feel guide intensity, and to know that feeling different across the month is expected rather than a failure of discipline.

## A commonly reported pattern

- Menstrual phase: lower energy for many people; gentle movement often feels better than intensity
- Follicular phase: energy often rising; many people find this the best stretch for harder sessions
- Ovulation: often a peak for some people
- Luteal phase: energy can dip, particularly in the later days

## Practical approach

1. Keep a rough note of how sessions feel, not just whether you did them
2. Let the hard days fall where energy is naturally higher, if your schedule allows
3. On low-energy days, reduce intensity rather than skipping movement entirely
4. Treat this as information about your body, not a prescription

! Symptoms that limit movement for days, or pain that stops you training, are worth discussing with a healthcare professional rather than working around indefinitely.

## Cramps and movement

For some people, light activity reduces cramping; for others, rest helps more. Both are reasonable, and neither is a sign of doing it wrong.`,
  },
  {
    title: "Sleep and hormonal change",
    slug: "sleep-and-hormonal-change",
    categorySlug: "sleep",
    excerpt:
      "Why sleep can shift across the cycle, and the basics that genuinely help.",
    readingTime: 4,
    tags: ["sleep", "luteal", "wellbeing"],
    content: `Many people report worse sleep in the days before their period. The luteal phase is associated with a small rise in core body temperature, and for some people that is enough to affect how easily they fall and stay asleep.

## Common patterns

- Taking longer to fall asleep in the late luteal phase
- More night waking in the days before bleeding
- Feeling less restored even with the same number of hours

## Basics that help

- Consistent wake time, which anchors the body clock more reliably than a consistent bedtime
- A cooler bedroom, which matters more when core temperature is elevated
- Reducing alcohol in the premenstrual days — it fragments sleep even when it speeds falling asleep
- Daylight exposure in the morning
- Keeping the last hour before bed lower in light and stimulation

## What tracking adds

Recording sleep alongside your cycle can show whether your difficult nights cluster in a particular phase. That is useful for planning — scheduling demanding mornings away from your worst-sleep days — and useful to mention at an appointment if sleep is persistently disrupted.

If snoring, gasping, or excessive daytime sleepiness are present, that is worth a medical conversation.`,
  },
  {
    title: "Contraception: an overview of the options",
    slug: "contraception-overview",
    categorySlug: "sexual-health",
    excerpt:
      "The main categories of contraception, and why effectiveness depends on correct use.",
    readingTime: 6,
    tags: ["contraception", "sexual health"],
    content: `There are many contraceptive options, and the best one depends on your health, preferences, and circumstances. A clinician can help you choose — this is an overview of the categories, not a recommendation.

## Broad categories

- Barrier methods (condoms, diaphragms) — also the only methods that reduce the risk of sexually transmitted infections
- Combined hormonal methods (pill, patch, ring)
- Progestogen-only methods (pill, implant, injection, hormonal coil)
- Intrauterine devices (copper and hormonal)
- Fertility awareness approaches, which require consistent tracking and have a higher typical-use failure rate

## Effectiveness and real-world use

Effectiveness figures usually distinguish between perfect use and typical use. Long-acting reversible methods tend to have the smallest gap between the two, because there is nothing to remember daily.

! Calendar and app-based predictions are not contraception. Lunara's estimates deliberately do not present themselves as protection, because calendar methods have a meaningful failure rate in real use.

## Worth discussing with a clinician

- Whether a method suits your medical history, including migraine and blood pressure
- Non-contraceptive effects you may want (for example, lighter periods) or want to avoid
- How quickly fertility returns after stopping
- Emergency contraception, which is time-sensitive and worth knowing about before you need it

## Screening

Sexual health screening is generally recommended as part of routine care, and can be done regardless of symptoms.`,
  },
  {
    title: "Stress, and why it shows up in your cycle",
    slug: "stress-and-your-cycle",
    categorySlug: "general-wellness",
    excerpt:
      "How sustained stress can affect cycles and symptoms, and a few genuinely practical responses.",
    readingTime: 4,
    tags: ["stress", "wellbeing", "cycle"],
    content: `The systems that regulate the menstrual cycle are sensitive to stress. This is not a matter of mindset: sustained stress can affect hormone signalling, and therefore cycle timing and symptoms.

## What people notice

- A cycle arriving later than expected during a demanding period
- Heavier or more painful periods during stressful stretches
- More pronounced premenstrual symptoms

## Practical responses

- Treat sleep as the first thing to protect; it mediates much of the stress response
- Separate what is urgent from what merely feels urgent, and let some things wait
- Keep one form of movement you actually enjoy
- Reduce inputs before bed
- Talk to someone — sustained stress is not a personal failing

## Using tracking here

Logging stress alongside your cycle lets you see whether difficult months line up with cycle changes. That is genuinely useful for planning and for appointments.

! Lunara shows your own stress ratings and nothing more. It does not interpret them or assess your mental health. If stress is affecting your daily life, please talk to a doctor — that is a medical matter, not a tracking problem.`,
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seedReferenceData() {
  console.log("Seeding security questions…");
  for (const question of SECURITY_QUESTIONS) {
    await prisma.securityQuestion.upsert({
      where: { question },
      create: { question, active: true },
      update: { active: true },
    });
  }

  console.log("Seeding article categories…");
  for (const category of ARTICLE_CATEGORIES) {
    await prisma.articleCategory.upsert({
      where: { slug: category.slug },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        sortOrder: category.sortOrder,
        active: true,
      },
      update: {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        active: true,
      },
    });
  }
}

async function seedArticles(authorId: string | null) {
  console.log("Seeding articles…");

  const categories = await prisma.articleCategory.findMany({
    select: { id: true, slug: true },
  });
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  let published = 0;
  for (const article of ARTICLES) {
    const categoryId = categoryBySlug.get(article.categorySlug);
    if (!categoryId) {
      console.warn(`  skipping "${article.title}" — unknown category ${article.categorySlug}`);
      continue;
    }

    await prisma.article.upsert({
      where: { slug: article.slug },
      create: {
        title: article.title,
        slug: article.slug,
        categoryId,
        excerpt: article.excerpt,
        content: article.content,
        readingTime: article.readingTime,
        tags: article.tags,
        published: true,
        publishedAt: new Date(),
        authorId,
      },
      update: {
        title: article.title,
        categoryId,
        excerpt: article.excerpt,
        content: article.content,
        readingTime: article.readingTime,
        tags: article.tags,
        published: true,
      },
    });
    published += 1;
  }

  console.log(`  ${published} articles ready`);
}

/**
 * Create the demo account with realistic tracking history.
 *
 * The history is generated relative to today so that the dashboard, calendar,
 * and insights all have something meaningful to show immediately after seeding.
 */
async function seedDemoUser() {
  console.log("Seeding demo account…");

  const existing = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true },
  });

  if (existing) {
    console.log(`  demo account already exists (${DEMO_EMAIL}) — housekeeping only`);
    // Keep the demo password in sync with the configured seed password so a
    // re-run after changing the env var still lets you sign in.
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash: await hashPassword(DEMO_PASSWORD),
        passwordChangedAt: new Date(),
      },
    });
    return existing.id;
  }

  const questions = await prisma.securityQuestion.findMany({
    where: { active: true },
    orderBy: { question: "asc" },
    take: REQUIRED_SECURITY_QUESTION_COUNT,
    select: { id: true },
  });

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const referenceToday = toDateOnly(today());

  // Six period starts, oldest first, ending 9 days ago so the demo account sits
  // comfortably mid-cycle (around day 10 of ~30) rather than looking overdue.
  //
  // Gaps are 29 days with one 32-day cycle, giving a realistic spread: the
  // insights screen then shows genuine variation instead of a suspiciously
  // perfect constant.
  const cycleStarts: Date[] = [];
  let cursor = addDays(referenceToday, -9);
  for (let index = 0; index < 6; index += 1) {
    cycleStarts.unshift(cursor);
    cursor = addDays(cursor, -(29 + (index === 3 ? 3 : 0)));
  }

  const demo = await prisma.user.create({
    data: {
      name: "Demo Account",
      email: DEMO_EMAIL,
      passwordHash,
      role: "USER",
      onboardedAt: new Date(),
      profile: {
        create: {
          ageRange: "25-34",
          averageCycleLength: 29,
          averagePeriodLength: 5,
          lastPeriodStart: cycleStarts[cycleStarts.length - 1],
          cycleRegularity: "REGULAR",
          trackingGoals: ["UNDERSTAND_CYCLE", "TRACK_SYMPTOMS", "MONITOR_WELLNESS"],
          notificationsEnabled: true,
          // Off by default: the privacy-preserving choice.
          shareAnonymousStats: false,
        },
      },
      securityAnswers: {
        create: await Promise.all(
          questions.map(async (question, index) => ({
            questionId: question.id,
            answerHash: await hashSecurityAnswer(`demo answer ${index + 1}`),
          })),
        ),
      },
    },
    select: { id: true },
  });

  const userId = demo.id;

  // ---- Periods and cycles ------------------------------------------------
  const periods = cycleStarts.map((start) => ({
    startDate: start,
    endDate: addDays(start, 4),
  }));

  await prisma.period.createMany({
    data: periods.map((period) => ({ userId, ...period })),
  });

  const cycles = cycleStarts.map((start, index) => {
    const next = cycleStarts[index + 1];
    return {
      userId,
      startDate: start,
      endDate: next ?? null,
      cycleLength: next ? Math.round((next.getTime() - start.getTime()) / 86_400_000) : null,
      periodLength: 5,
      estimated: false,
    };
  });

  await prisma.cycle.createMany({ data: cycles });

  // ---- Daily logs for the last 45 days ----------------------------------
  const symptomPool: Array<"CRAMPS" | "HEADACHE" | "BLOATING" | "FATIGUE" | "BACK_PAIN" | "ACNE"> = [
    "CRAMPS",
    "HEADACHE",
    "BLOATING",
    "FATIGUE",
    "BACK_PAIN",
    "ACNE",
  ];
  // Only values that exist in the MoodType enum. "TIRED" is a common wish but
  // is not a mood option — fatigue is recorded as a symptom instead.
  const moodPool = [
    "HAPPY",
    "CALM",
    "IRRITATED",
    "ANXIOUS",
    "ENERGETIC",
    "STRESSED",
    "SAD",
    "NEUTRAL",
  ] as const;

  let logsCreated = 0;

  for (let offset = 45; offset >= 0; offset -= 1) {
    const date = addDays(referenceToday, -offset);

    // Skip some days so the charts show realistic gaps.
    if (offset % 7 === 3) continue;

    // Deterministic pseudo-randomness keeps the seed reproducible.
    const seedValue = (offset * 37) % 11;

    const symptomCount = seedValue % 3;
    const symptoms = Array.from({ length: symptomCount }, (_, i) => {
      const type = symptomPool[(seedValue + i * 2) % symptomPool.length];
      return { type, severity: 2 + ((seedValue + i) % 3) };
    }).filter(
      (symptom, index, list) =>
        list.findIndex((candidate) => candidate.type === symptom.type) === index,
    );

    const moods = [moodPool[seedValue % moodPool.length]];

    await prisma.dailyLog.create({
      data: {
        userId,
        date,
        notes:
          offset % 9 === 0
            ? "Long day. Slept poorly but felt better after a walk."
            : null,
        symptoms: { create: symptoms },
        moods: { create: moods.map((type) => ({ type })) },
      },
    });

    // Wellness on most days.
    await prisma.wellnessLog.create({
      data: {
        userId,
        date,
        sleep: 6.25 + (seedValue % 4) * 0.5,
        sleepQuality: 2 + (seedValue % 4),
        water: 1200 + (seedValue % 6) * 200,
        exerciseMinutes: seedValue % 3 === 0 ? 0 : 20 + (seedValue % 5) * 10,
        exercise: seedValue % 3 === 0 ? "NONE" : seedValue % 2 === 0 ? "MODERATE" : "LIGHT",
        energy: 2 + (seedValue % 4),
        stress: 1 + ((seedValue + 2) % 5),
      },
    });

    logsCreated += 1;
  }

  // ---- Private log sample (opt-in) --------------------------------------
  await prisma.intimateLog.create({
    data: {
      userId,
      date: addDays(referenceToday, -5),
      activityType: "Protected",
      protectionUsed: true,
      notes: null,
    },
  });

  // ---- Reminders ---------------------------------------------------------
  await prisma.reminder.createMany({
    data: [
      { userId, type: "PERIOD", enabled: true, timeOfDay: "08:00", leadTimeDays: 2 },
      { userId, type: "FERTILE_WINDOW", enabled: true, timeOfDay: "08:00", leadTimeDays: 0 },
      { userId, type: "DAILY_LOG", enabled: true, timeOfDay: "20:00", leadTimeDays: 0 },
      { userId, type: "MEDICATION", enabled: false, label: "Folic acid", timeOfDay: "09:00", leadTimeDays: 0 },
    ],
  });

  await prisma.notification.create({
    data: {
      userId,
      type: "SYSTEM",
      title: "Welcome to Lunara",
      message:
        "This is a demo account with sample data. Explore the dashboard, calendar, and insights to see how Lunara works.",
    },
  });

  console.log(`  demo account created with ${logsCreated} daily logs, ${periods.length} periods`);
  return userId;
}

async function seedAdminUser(): Promise<string | null> {
  console.log("Seeding administrator account…");

  const email = ADMIN_EMAIL.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  if (existing) {
    if (existing.role !== "ADMIN") {
      await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
      console.log(`  promoted ${email} to ADMIN`);
    } else {
      console.log(`  ${email} is already an administrator`);
    }
    return existing.id;
  }

  const questions = await prisma.securityQuestion.findMany({
    where: { active: true },
    orderBy: { question: "asc" },
    take: REQUIRED_SECURITY_QUESTION_COUNT,
    select: { id: true },
  });

  const admin = await prisma.user.create({
    data: {
      name: "Lunara Admin",
      email,
      passwordHash: await hashPassword(ADMIN_PASSWORD),
      role: "ADMIN",
      onboardedAt: new Date(),
      profile: {
        create: {
          averageCycleLength: 28,
          averagePeriodLength: 5,
          trackingGoals: ["MONITOR_WELLNESS"],
        },
      },
      securityAnswers: {
        create: await Promise.all(
          questions.map(async (question, index) => ({
            questionId: question.id,
            answerHash: await hashSecurityAnswer(`admin answer ${index + 1}`),
          })),
        ),
      },
    },
    select: { id: true },
  });

  console.log(`  administrator created: ${email}`);
  console.log("  NOTE: change this password immediately in any non-local environment.");
  return admin.id;
}

async function main() {
  /**
   * CONTENT-ONLY MODE: `SEED_CONTENT_ONLY=1`.
   *
   * Seeds the reference data and the article library but creates NO accounts.
   * Added because the full seed creates `admin@lunara.app` and `demo@lunara.demo`
   * with passwords published in this repository - an open administrator login on
   * any publicly reachable deployment, even though the article library it also
   * loads is perfectly safe.
   *
   * Because nothing credential-bearing is written in this mode, it is exempt from
   * the ALLOW_SEED guard: there is no known-password account to protect against.
   */
  const contentOnly = process.env.SEED_CONTENT_ONLY === "1";

  if (contentOnly) {
    console.log("Content-only seed: reference data and articles. No accounts will be created.\n");
    await seedReferenceData();
    await seedArticles(null);
    console.log("\nContent seed complete. No accounts were created.\n");
    return;
  }

  // Full seeding creates accounts with KNOWN passwords, so it must never run by
  // accident against something that looks like a real deployment.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "1") {
    console.error(
      "Refusing to seed: NODE_ENV is production.\n" +
        "Full seeding creates demo accounts with passwords published in this repo.\n" +
        "If you only want the article library, use SEED_CONTENT_ONLY=1 instead.\n" +
        "If you genuinely intend to create the accounts too, set ALLOW_SEED=1.",
    );
    process.exit(1);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(
      "Seeding a development database. Demo credentials will be printed at the end.\n",
    );
  }

  await seedReferenceData();

  const adminId = await seedAdminUser();
  await seedArticles(adminId);
  await seedDemoUser();

  console.log("\nSeed complete.\n");
  console.log("Sign-in credentials for local development:");
  console.log(`  demo user : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  admin     : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log("\nDo not use these credentials in production.\n");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    // The client is a lazy proxy; disconnect is best-effort.
    await prisma.$disconnect().catch(() => undefined);
  });
