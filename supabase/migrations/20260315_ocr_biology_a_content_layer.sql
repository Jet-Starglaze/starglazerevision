create table if not exists public.subjects (
  id bigint generated always as identity primary key,
  name text not null,
  slug text not null unique,
  exam_board text not null,
  qualification text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.modules (
  id bigint generated always as identity primary key,
  subject_id bigint not null references public.subjects(id) on delete cascade,
  name text not null,
  slug text not null,
  order_number integer not null,
  created_at timestamptz not null default now(),
  constraint modules_subject_slug_key unique (subject_id, slug)
);

create table if not exists public.topics (
  id bigint generated always as identity primary key,
  module_id bigint not null references public.modules(id) on delete cascade,
  name text not null,
  slug text not null,
  order_number integer not null,
  created_at timestamptz not null default now(),
  constraint topics_module_slug_key unique (module_id, slug)
);

create table if not exists public.subtopics (
  id bigint generated always as identity primary key,
  topic_id bigint not null references public.topics(id) on delete cascade,
  code text not null,
  name text not null,
  slug text not null,
  order_number integer not null,
  summary text,
  key_terms text[],
  exam_tips text[],
  created_at timestamptz not null default now(),
  constraint subtopics_topic_slug_key unique (topic_id, slug),
  constraint subtopics_topic_code_key unique (topic_id, code)
);

create index if not exists modules_subject_id_order_number_idx
  on public.modules (subject_id, order_number);

create index if not exists topics_module_id_order_number_idx
  on public.topics (module_id, order_number);

create index if not exists subtopics_topic_id_order_number_idx
  on public.subtopics (topic_id, order_number);

alter table public.subjects enable row level security;
alter table public.modules enable row level security;
alter table public.topics enable row level security;
alter table public.subtopics enable row level security;

drop policy if exists "Public read subjects" on public.subjects;
create policy "Public read subjects"
  on public.subjects
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public read modules" on public.modules;
create policy "Public read modules"
  on public.modules
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public read topics" on public.topics;
create policy "Public read topics"
  on public.topics
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public read subtopics" on public.subtopics;
create policy "Public read subtopics"
  on public.subtopics
  for select
  to anon, authenticated
  using (true);

with subject_upsert as (
  insert into public.subjects (name, slug, exam_board, qualification)
  values (
    'OCR A Level Biology A',
    'ocr-a-level-biology-a',
    'OCR',
    'A Level'
  )
  on conflict (slug) do update
  set
    name = excluded.name,
    exam_board = excluded.exam_board,
    qualification = excluded.qualification
  returning id
),
module_upsert as (
  insert into public.modules (subject_id, name, slug, order_number)
  select
    subject_upsert.id,
    'Module 2',
    'module-2',
    2
  from subject_upsert
  on conflict (subject_id, slug) do update
  set
    name = excluded.name,
    order_number = excluded.order_number
  returning id
),
topic_upsert as (
  insert into public.topics (module_id, name, slug, order_number)
  select
    module_upsert.id,
    'Cell structure',
    'cell-structure',
    1
  from module_upsert
  on conflict (module_id, slug) do update
  set
    name = excluded.name,
    order_number = excluded.order_number
  returning id
),
subtopic_source (
  code,
  name,
  slug,
  order_number,
  summary,
  key_terms,
  exam_tips
) as (
  values
    (
      '2.1.1',
      'Eukaryotic cell structure',
      'eukaryotic-cell-structure',
      1,
      'Learn the main organelles in plant and animal cells and link each one to a precise function.',
      array['organelle', 'nucleus', 'rough ER', 'Golgi apparatus'],
      array[
        'Name the organelle and state its function clearly.',
        'Do not mix up ribosomes with membrane-bound organelles.'
      ]
    ),
    (
      '2.1.2',
      'Prokaryotic cell structure',
      'prokaryotic-cell-structure',
      2,
      'Focus on the features that make prokaryotic cells simpler, smaller, and different from eukaryotic cells.',
      array['circular DNA', 'plasmid', '70S ribosome', 'capsule'],
      array[
        'Compare prokaryotes with eukaryotes using exact biological terms.',
        'Remember that prokaryotes have no nucleus.'
      ]
    ),
    (
      '2.1.3',
      'Magnification and microscopy',
      'magnification-and-microscopy',
      3,
      'Use magnification calculations confidently and know when light or electron microscopes are most useful.',
      array['magnification', 'resolution', 'electron microscope', 'light microscope'],
      array[
        'Show the magnification formula clearly in calculations.',
        'Resolution and magnification are not the same thing.'
      ]
    ),
    (
      '2.1.4',
      'Cell fractionation and ultracentrifugation',
      'cell-fractionation-and-ultracentrifugation',
      4,
      'Understand the sequence of homogenisation, filtration, and centrifugation used to separate cell components.',
      array['homogenisation', 'filtration', 'supernatant', 'pellet'],
      array[
        'Describe the steps in the correct order.',
        'Link faster spins with smaller organelles staying in the pellet.'
      ]
    )
)
insert into public.subtopics (
  topic_id,
  code,
  name,
  slug,
  order_number,
  summary,
  key_terms,
  exam_tips
)
select
  topic_upsert.id,
  subtopic_source.code,
  subtopic_source.name,
  subtopic_source.slug,
  subtopic_source.order_number,
  subtopic_source.summary,
  subtopic_source.key_terms,
  subtopic_source.exam_tips
from subtopic_source
cross join topic_upsert
on conflict (topic_id, slug) do update
set
  code = excluded.code,
  name = excluded.name,
  order_number = excluded.order_number,
  summary = excluded.summary,
  key_terms = excluded.key_terms,
  exam_tips = excluded.exam_tips;
