import type { PracticeModule, PracticeSubtopic, PracticeTopic } from "@/lib/mock-biology-practice";
import { createClient } from "@/utils/supabase/server";

type SubjectsClient = Awaited<ReturnType<typeof createClient>>;
type MaybeEmbedded<T> = T | T[] | null;

type SubjectRow = {
  id: number | string;
  name: string;
  slug: string;
  exam_board: string;
  qualification: string;
};

type ModuleRow = {
  id: number | string;
  subject_id: number | string;
  name: string;
  slug: string;
  order_number: number;
};

type TopicRow = {
  id: number | string;
  module_id: number | string;
  name: string;
  slug: string;
  order_number: number;
};

type SubtopicRow = {
  id: number | string;
  topic_id: number | string;
  code: string;
  name: string;
  slug: string;
  order_number: number;
  summary: string | null;
  key_terms: string[] | null;
  exam_tips: string[] | null;
};

type SubtopicDetailFields = {
  id: number | string;
  code: string;
  name: string;
  slug: string;
  order_number: number;
  summary: string | null;
  key_terms: string[] | null;
  exam_tips: string[] | null;
};

type SubjectPageRawRow = SubjectRow & {
  modules: ModuleRow[] | null;
};

type ModulePageRawRow = ModuleRow & {
  subjects: MaybeEmbedded<SubjectRow>;
  topics: TopicRow[] | null;
};

type TopicContextModuleRow = ModuleRow & {
  subjects: MaybeEmbedded<SubjectRow>;
};

type TopicPageRawRow = TopicRow & {
  modules: MaybeEmbedded<TopicContextModuleRow>;
  subtopics: SubtopicRow[] | null;
};

type SubtopicContextTopicRow = TopicRow & {
  modules: MaybeEmbedded<TopicContextModuleRow>;
};

type SubtopicPageRawRow = SubtopicDetailFields & {
  topics: MaybeEmbedded<SubtopicContextTopicRow>;
};

type PracticeTopicTreeRow = TopicRow & {
  subtopics: SubtopicRow[] | null;
};

type PracticeModuleTreeRow = ModuleRow & {
  topics: PracticeTopicTreeRow[] | null;
};

type PracticeSubjectTreeRawRow = SubjectRow & {
  modules: PracticeModuleTreeRow[] | null;
};

export type SubjectSummary = {
  id: number;
  name: string;
  slug: string;
  examBoard: string;
  qualification: string;
};

export type ModuleSummary = {
  id: number;
  name: string;
  slug: string;
  orderNumber: number;
};

export type TopicSummary = {
  id: number;
  name: string;
  slug: string;
  orderNumber: number;
};

export type SubtopicSummary = {
  id: number;
  code: string;
  name: string;
  slug: string;
  orderNumber: number;
  summary: string | null;
};

export type SubtopicDetail = SubtopicSummary & {
  keyTerms: string[];
  examTips: string[];
};

export type SubjectPageData = {
  subject: SubjectSummary;
  modules: ModuleSummary[];
};

export type ModulePageData = {
  subject: SubjectSummary;
  module: ModuleSummary;
  topics: TopicSummary[];
};

export type TopicPageData = {
  subject: SubjectSummary;
  module: ModuleSummary;
  topic: TopicSummary;
  subtopics: SubtopicSummary[];
};

export type SubtopicPageData = {
  subject: SubjectSummary;
  module: ModuleSummary;
  topic: TopicSummary;
  subtopic: SubtopicDetail;
};

function mapSubject(row: SubjectRow): SubjectSummary {
  return {
    id: toNumericId(row.id),
    name: row.name,
    slug: row.slug,
    examBoard: row.exam_board,
    qualification: row.qualification,
  };
}

function mapModule(row: ModuleRow): ModuleSummary {
  return {
    id: toNumericId(row.id),
    name: row.name,
    slug: row.slug,
    orderNumber: row.order_number,
  };
}

function mapTopic(row: TopicRow): TopicSummary {
  return {
    id: toNumericId(row.id),
    name: row.name,
    slug: row.slug,
    orderNumber: row.order_number,
  };
}

function mapSubtopicSummary(row: SubtopicRow): SubtopicSummary {
  return {
    id: toNumericId(row.id),
    code: row.code,
    name: row.name,
    slug: row.slug,
    orderNumber: row.order_number,
    summary: row.summary,
  };
}

function mapSubtopicDetail(row: SubtopicDetailFields): SubtopicDetail {
  return {
    id: toNumericId(row.id),
    code: row.code,
    name: row.name,
    slug: row.slug,
    orderNumber: row.order_number,
    summary: row.summary,
    keyTerms: row.key_terms ?? [],
    examTips: row.exam_tips ?? [],
  };
}

function mapPracticeSubtopic(row: SubtopicRow): PracticeSubtopic {
  return {
    id: toNumericId(row.id),
    slug: row.slug,
    code: row.code,
    name: row.name,
  };
}

function mapPracticeTopic(row: PracticeTopicTreeRow): PracticeTopic {
  return {
    id: toNumericId(row.id),
    slug: row.slug,
    name: row.name,
    subtopics: sortByOrderNumber(row.subtopics).map(mapPracticeSubtopic),
  };
}

function mapPracticeModule(row: PracticeModuleTreeRow): PracticeModule {
  return {
    id: toNumericId(row.id),
    slug: row.slug,
    label: row.name,
    name: row.name,
    topics: sortByOrderNumber(row.topics).map(mapPracticeTopic),
  };
}

async function resolveClient(client?: SubjectsClient) {
  return client ?? createClient();
}

function assertNoError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

function takeFirst<T>(value: MaybeEmbedded<T> | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function sortByOrderNumber<T extends { order_number: number }>(
  value: T[] | null | undefined,
) {
  return [...(value ?? [])].sort((left, right) => {
    return left.order_number - right.order_number;
  });
}

function toNumericId(value: number | string) {
  if (typeof value === "number") {
    return value;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`Invalid numeric identifier "${value}"`);
  }

  return parsedValue;
}

export async function getSubjects(client?: SubjectsClient) {
  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("subjects")
    .select("id, name, slug, exam_board, qualification")
    .order("name");

  assertNoError(error, "Failed to load subjects");

  return ((data ?? []) as SubjectRow[]).map(mapSubject);
}

export async function getSubjectPageData(
  subjectSlug: string,
  client?: SubjectsClient,
): Promise<SubjectPageData | null> {
  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("subjects")
    .select(
      `
        id,
        name,
        slug,
        exam_board,
        qualification,
        modules (
          id,
          subject_id,
          name,
          slug,
          order_number
        )
      `,
    )
    .eq("slug", subjectSlug)
    .maybeSingle();

  assertNoError(error, `Failed to load subject "${subjectSlug}"`);

  if (!data) {
    return null;
  }

  const row = data as unknown as SubjectPageRawRow;

  return {
    subject: mapSubject(row),
    modules: sortByOrderNumber(row.modules).map(mapModule),
  };
}

export async function getPracticeSyllabusData(
  subjectSlug: string,
  client?: SubjectsClient,
): Promise<PracticeModule[]> {
  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("subjects")
    .select(
      `
        id,
        name,
        slug,
        exam_board,
        qualification,
        modules (
          id,
          subject_id,
          name,
          slug,
          order_number,
          topics (
            id,
            module_id,
            name,
            slug,
            order_number,
            subtopics (
              id,
              topic_id,
              code,
              name,
              slug,
              order_number,
              summary,
              key_terms,
              exam_tips
            )
          )
        )
      `,
    )
    .eq("slug", subjectSlug)
    .maybeSingle();

  assertNoError(error, `Failed to load practice syllabus for "${subjectSlug}"`);

  if (!data) {
    return [];
  }

  const row = data as unknown as PracticeSubjectTreeRawRow;

  return sortByOrderNumber(row.modules).map(mapPracticeModule);
}

export async function getModulePageData(
  subjectSlug: string,
  moduleSlug: string,
  client?: SubjectsClient,
): Promise<ModulePageData | null> {
  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("modules")
    .select(
      `
        id,
        subject_id,
        name,
        slug,
        order_number,
        subjects!inner (
          id,
          name,
          slug,
          exam_board,
          qualification
        ),
        topics (
          id,
          module_id,
          name,
          slug,
          order_number
        )
      `,
    )
    .eq("slug", moduleSlug)
    .eq("subjects.slug", subjectSlug)
    .maybeSingle();

  assertNoError(error, `Failed to load module "${moduleSlug}"`);

  if (!data) {
    return null;
  }

  const row = data as unknown as ModulePageRawRow;
  const subjectRow = takeFirst(row.subjects);

  if (!subjectRow) {
    return null;
  }

  return {
    subject: mapSubject(subjectRow),
    module: mapModule(row),
    topics: sortByOrderNumber(row.topics).map(mapTopic),
  };
}

export async function getTopicPageData(
  subjectSlug: string,
  moduleSlug: string,
  topicSlug: string,
  client?: SubjectsClient,
): Promise<TopicPageData | null> {
  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("topics")
    .select(
      `
        id,
        module_id,
        name,
        slug,
        order_number,
        modules!inner (
          id,
          subject_id,
          name,
          slug,
          order_number,
          subjects!inner (
            id,
            name,
            slug,
            exam_board,
            qualification
          )
        ),
        subtopics (
          id,
          topic_id,
          code,
          name,
          slug,
          order_number,
          summary
        )
      `,
    )
    .eq("slug", topicSlug)
    .eq("modules.slug", moduleSlug)
    .eq("modules.subjects.slug", subjectSlug)
    .maybeSingle();

  assertNoError(error, `Failed to load topic "${topicSlug}"`);

  if (!data) {
    return null;
  }

  const row = data as unknown as TopicPageRawRow;
  const moduleRow = takeFirst(row.modules);
  const subjectRow = takeFirst(moduleRow?.subjects);

  if (!moduleRow || !subjectRow) {
    return null;
  }

  return {
    subject: mapSubject(subjectRow),
    module: mapModule(moduleRow),
    topic: mapTopic(row),
    subtopics: sortByOrderNumber(row.subtopics).map(mapSubtopicSummary),
  };
}

export async function getSubtopicPageData(
  subjectSlug: string,
  moduleSlug: string,
  topicSlug: string,
  subtopicSlug: string,
  client?: SubjectsClient,
): Promise<SubtopicPageData | null> {
  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("subtopics")
    .select(
      `
        id,
        code,
        name,
        slug,
        order_number,
        summary,
        key_terms,
        exam_tips,
        topics!inner (
          id,
          module_id,
          name,
          slug,
          order_number,
          modules!inner (
            id,
            subject_id,
            name,
            slug,
            order_number,
            subjects!inner (
              id,
              name,
              slug,
              exam_board,
              qualification
            )
          )
        )
      `,
    )
    .eq("slug", subtopicSlug)
    .eq("topics.slug", topicSlug)
    .eq("topics.modules.slug", moduleSlug)
    .eq("topics.modules.subjects.slug", subjectSlug)
    .maybeSingle();

  assertNoError(error, `Failed to load subtopic "${subtopicSlug}"`);

  if (!data) {
    return null;
  }

  const row = data as unknown as SubtopicPageRawRow;
  const topicRow = takeFirst(row.topics);
  const moduleRow = takeFirst(topicRow?.modules);
  const subjectRow = takeFirst(moduleRow?.subjects);

  if (!topicRow || !moduleRow || !subjectRow) {
    return null;
  }

  return {
    subject: mapSubject(subjectRow),
    module: mapModule(moduleRow),
    topic: mapTopic(topicRow),
    subtopic: mapSubtopicDetail(row),
  };
}
