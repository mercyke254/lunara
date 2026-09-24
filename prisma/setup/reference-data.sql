-- ============================================================================
--  Lunara - reference data
-- ============================================================================
--
--  PURPOSE
--  Inserts the minimum reference data Lunara needs to function:
--    * the 7 security questions (without these, /register cannot render)
--    * the 11 article categories (without these, /education has nothing to
--      group by)
--
--  WHEN TO USE THIS
--  Run this AFTER prisma/schema.sql has created the tables, and INSTEAD OF
--  `prisma db seed` when you do not have a local Node.js checkout. This gets
--  registration working; it does not create the demo/admin accounts (which
--  would have known passwords) or the article library.
--
--  Run `npx prisma db seed` later for the full set, including articles.
--
--  SAFETY
--  ＊ Idempotent: every insert uses ON CONFLICT DO NOTHING, so re-running is
--    safe and will not duplicate rows or fail.
--  ＊ WARNING: `updatedAt` has NO database default in the Prisma schema
--    (Prisma sets it client-side), so it must be supplied explicitly here.
--    Omitting it fails the NOT NULL constraint.
--  ＊ This file contains no credentials, no hashes, and no personal data.
--
--  HOW TO RUN
--  Neon Console -> your project -> SQL Editor -> paste -> Run.
-- ============================================================================


-- ----------------------------------------------------------------------------
--  1. Security questions
--     Users pick three of these at sign-up; the answers are hashed with bcrypt.
-- ----------------------------------------------------------------------------

INSERT INTO "SecurityQuestion" ("id", "question", "active", "createdAt", "updatedAt") VALUES
  ('sq_first_school',     'What was the name of your first school?',          true, now(), now()),
  ('sq_birth_city',       'What city were you born in?',                      true, now(), now()),
  ('sq_childhood_friend', 'What was the name of your childhood best friend?',  true, now(), now()),
  ('sq_first_pet',        'What was your first pet''s name?',                  true, now(), now()),
  ('sq_childhood_food',   'What is your favorite childhood food?',             true, now(), now()),
  ('sq_childhood_nickname','What was your childhood nickname?',                true, now(), now()),
  ('sq_first_teacher',    'What was the name of your first teacher?',          true, now(), now())
ON CONFLICT ("question") DO NOTHING;


-- ----------------------------------------------------------------------------
--  2. Article categories
--     Drive the education hub filter. Articles are added by `prisma db seed`.
-- ----------------------------------------------------------------------------

INSERT INTO "ArticleCategory" ("id", "name", "slug", "description", "sortOrder", "active", "createdAt", "updatedAt") VALUES
  ('cat_menstrual_cycle', 'Menstrual cycle', 'menstrual-cycle', 'How the cycle works, phase by phase.',                         1,  true, now(), now()),
  ('cat_period_health',   'Period health',   'period-health',   'What is typical, what to watch for, and when to ask for help.', 2,  true, now(), now()),
  ('cat_pms',             'PMS',             'pms',             'Premenstrual symptoms and ways people manage them.',            3,  true, now(), now()),
  ('cat_ovulation',       'Ovulation',       'ovulation',       'Ovulation, cycle signs, and what can and cannot be predicted.', 4,  true, now(), now()),
  ('cat_fertility',       'Fertility',       'fertility',       'Conception, timing, and when to seek support.',                 5,  true, now(), now()),
  ('cat_pregnancy',       'Pregnancy',       'pregnancy',       'Trimesters, appointments, and what to expect.',                 6,  true, now(), now()),
  ('cat_nutrition',       'Nutrition',       'nutrition',       'Food and the cycle, including iron and blood sugar.',           7,  true, now(), now()),
  ('cat_exercise',        'Exercise',        'exercise',        'Moving in a way that fits each phase.',                         8,  true, now(), now()),
  ('cat_sleep',           'Sleep',           'sleep',           'Sleep and hormonal change.',                                    9,  true, now(), now()),
  ('cat_sexual_health',   'Sexual health',   'sexual-health',   'Contraception, screening, and sexual wellbeing.',               10, true, now(), now()),
  ('cat_general_wellness','General wellness','general-wellness','Stress, energy, and everyday self-care.',                       11, true, now(), now())
ON CONFLICT ("slug") DO NOTHING;


-- ----------------------------------------------------------------------------
--  3. Verify
-- ----------------------------------------------------------------------------

-- Expect: questions = 7, categories = 11
SELECT
  (SELECT count(*) FROM "SecurityQuestion") AS security_questions,
  (SELECT count(*) FROM "ArticleCategory")  AS article_categories;
