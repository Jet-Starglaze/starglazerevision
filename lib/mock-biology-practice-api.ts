import {
  isPracticeQuestionCommandWord,
  type PracticeQuestionCommandWord,
  type PracticeQuestionFilterMode,
  type PracticeSessionLength,
} from "@/lib/mock-biology-practice";

export type ApiErrorResponse = {
  error: string;
};

export type PracticeRubricPoint = {
  id: number;
  pointText: string;
  orderNumber: number;
};

export type GenerateQuestionRequest = {
  subjectId: string;
  selectedSubtopicIds: number[];
  questionFilterMode: PracticeQuestionFilterMode;
  sessionLength: PracticeSessionLength;
  questionCursor?: number;
};

export type GenerateQuestionResponse = {
  questionId: string;
  questionText: string;
  marks: number;
  questionType: PracticeQuestionCommandWord;
  topicId: string;
  topicLabel: string;
  subtopicId: string;
  subtopicLabel: string;
  answerFocus: string;
  rubricPoints: PracticeRubricPoint[];
};

export type MarkAnswerRequest = GenerateQuestionResponse & {
  answerText: string;
  attemptNumber: 1 | 2;
};

export type MarkAnswerResponse = {
  questionId: string;
  estimatedMark: number;
  maxMarks: number;
  topicId: string;
  topicLabel: string;
  subtopicId: string;
  subtopicLabel: string;
  whatWasGood: string[];
  missingPoints: string[];
  improvementAdvice: string;
  attemptNumber: 1 | 2;
};

type MockApiResult<T> = {
  status: number;
  body: T | ApiErrorResponse;
};

type MockFeedbackTemplate = {
  estimatedMark: number;
  whatWasGood: string[];
  missingPoints: string[];
  improvementAdvice: string;
};

type MockQuestionRecord = Omit<GenerateQuestionResponse, "rubricPoints"> & {
  rubricPoints?: PracticeRubricPoint[];
  feedbackByAttempt: Record<1 | 2, MockFeedbackTemplate>;
};

const mockBiologyQuestionBank: MockQuestionRecord[] = [
  {
    questionId: "mock-bio-001",
    questionText:
      "Explain how the structure of the rough endoplasmic reticulum, Golgi apparatus, and vesicles allows a eukaryotic cell to process and transport proteins.",
    marks: 6,
    questionType: "explain",
    topicId: "topic-cell-structure",
    topicLabel: "Cell structure",
    subtopicId: "eukaryotic-cell-structure",
    subtopicLabel: "Eukaryotic cell structure",
    answerFocus:
      "Link each organelle to a clear stage in protein production and secretion.",
    feedbackByAttempt: {
      1: {
        estimatedMark: 3,
        whatWasGood: [
          "You recognised the rough endoplasmic reticulum as part of the protein pathway.",
          "You mentioned the Golgi apparatus and vesicles in protein transport.",
        ],
        missingPoints: [
          "You did not clearly explain the order from ribosomes to rough ER to Golgi to secretory vesicles.",
          "The answer needed more precision about protein modification and packaging before secretion.",
        ],
        improvementAdvice:
          "Rewrite the answer as a sequence of stages and use precise terms such as ribosomes, transport vesicles, modification, and exocytosis.",
      },
      2: {
        estimatedMark: 5,
        whatWasGood: [
          "You linked ribosomes on the rough ER to the initial synthesis of proteins.",
          "You explained that the Golgi apparatus modifies and packages proteins into vesicles.",
          "You finished the sequence by linking vesicles to transport and secretion at the cell surface.",
        ],
        missingPoints: [
          "One more explicit link to why these membrane-bound compartments help efficiency would push it further.",
        ],
        improvementAdvice:
          "Add one final sentence explaining how compartmentalisation keeps the process ordered and efficient.",
      },
    },
  },
  {
    questionId: "mock-bio-002",
    questionText:
      "Compare the structure of prokaryotic and eukaryotic cells and explain how those differences affect what each cell can do.",
    marks: 10,
    questionType: "compare",
    topicId: "topic-cell-structure",
    topicLabel: "Cell structure",
    subtopicId: "prokaryotic-cell-structure",
    subtopicLabel: "Prokaryotic cell structure",
    answerFocus:
      "Use direct comparison points rather than describing each cell type in isolation.",
    feedbackByAttempt: {
      1: {
        estimatedMark: 4,
        whatWasGood: [
          "You correctly noted that eukaryotic cells have membrane-bound organelles.",
          "You identified that prokaryotic DNA is not enclosed in a nucleus.",
        ],
        missingPoints: [
          "You needed clearer comparison of ribosomes, DNA structure, and cell size.",
          "Functional consequences were mentioned only briefly instead of being linked to each structural difference.",
        ],
        improvementAdvice:
          "Structure the answer as paired comparisons such as DNA, ribosomes, organelles, and size, then explain the functional effect after each difference.",
      },
      2: {
        estimatedMark: 7,
        whatWasGood: [
          "You compared DNA arrangement, ribosome size, and organelle presence in a clearer way.",
          "You linked membrane-bound organelles in eukaryotes to compartmentalised processes.",
          "You explained how the smaller size and simpler structure of prokaryotes supports rapid exchange with the environment.",
        ],
        missingPoints: [
          "A final comparison around plasmids or cell wall differences would have added even more depth.",
        ],
        improvementAdvice:
          "To push higher, include one extra named example such as plasmids or 70S and 80S ribosomes.",
      },
    },
  },
  {
    questionId: "mock-bio-003",
    questionText:
      "Explain why resolution is often more important than magnification when comparing light microscopes with electron microscopes.",
    marks: 6,
    questionType: "explain",
    topicId: "topic-cell-structure",
    topicLabel: "Cell structure",
    subtopicId: "microscopy",
    subtopicLabel: "Microscopy",
    answerFocus:
      "Use biological examples and avoid treating resolution and magnification as the same idea.",
    feedbackByAttempt: {
      1: {
        estimatedMark: 3,
        whatWasGood: [
          "You correctly said that resolution affects how clearly separate points can be distinguished.",
          "You recognised that electron microscopes reveal more detail than light microscopes.",
        ],
        missingPoints: [
          "You did not give a strong biological example of a structure that needs higher resolution to be seen clearly.",
          "The answer needed a sharper explanation of why greater magnification alone can still produce a blurry image.",
        ],
        improvementAdvice:
          "Use an example such as mitochondrial cristae or ribosomes and state explicitly that magnification without resolution only enlarges the blur.",
      },
      2: {
        estimatedMark: 5,
        whatWasGood: [
          "You clearly defined resolution and separated it from magnification.",
          "You explained that electron microscopes reveal finer details such as internal organelle structure.",
          "You made it clear that enlarging a low-resolution image does not add information.",
        ],
        missingPoints: [
          "A brief numerical or wavelength-based comparison would strengthen the final explanation.",
        ],
        improvementAdvice:
          "Add one short sentence linking shorter electron wavelengths to higher resolving power.",
      },
    },
  },
  {
    questionId: "mock-bio-004",
    questionText:
      "Describe how efficient exchange surfaces are adapted for their function in organisms and explain why these adaptations matter.",
    marks: 10,
    questionType: "describe",
    topicId: "topic-exchange-and-transport",
    topicLabel: "Exchange and transport",
    subtopicId: "exchange-surfaces",
    subtopicLabel: "Exchange surfaces",
    answerFocus:
      "Build the answer around surface area, diffusion distance, and maintaining concentration gradients.",
    feedbackByAttempt: {
      1: {
        estimatedMark: 4,
        whatWasGood: [
          "You identified large surface area and short diffusion distance as key features.",
          "You mentioned that organisms maintain concentration gradients.",
        ],
        missingPoints: [
          "The answer did not clearly explain how ventilation or transport systems maintain steep gradients.",
          "You needed more explicit links from each adaptation to faster diffusion.",
        ],
        improvementAdvice:
          "Use a repeated pattern of adaptation followed by its direct benefit, and bring in ventilation or blood flow to show how gradients are kept steep.",
      },
      2: {
        estimatedMark: 7,
        whatWasGood: [
          "You explained how a large surface area increases the area available for diffusion.",
          "You linked thin exchange surfaces to short diffusion distance.",
          "You added transport and ventilation as mechanisms that maintain concentration gradients.",
        ],
        missingPoints: [
          "A named example such as alveoli, gills, or villi would add even more specificity.",
        ],
        improvementAdvice:
          "Use one clear biological example to anchor the explanation and gain extra precision.",
      },
    },
  },
  {
    questionId: "mock-bio-005",
    questionText:
      "Explain how the transport system in animals helps maintain a supply of oxygen and nutrients to active tissues.",
    marks: 6,
    questionType: "explain",
    topicId: "topic-exchange-and-transport",
    topicLabel: "Exchange and transport",
    subtopicId: "transport-in-animals",
    subtopicLabel: "Transport in animals",
    answerFocus:
      "Keep the answer focused on transport and delivery rather than listing unrelated organ facts.",
    feedbackByAttempt: {
      1: {
        estimatedMark: 3,
        whatWasGood: [
          "You referred to the circulatory system carrying substances around the body.",
          "You recognised that oxygen and nutrients are delivered by the blood.",
        ],
        missingPoints: [
          "You needed clearer explanation of how arteries, capillaries, and circulation support active tissues.",
          "The role of short diffusion distance at capillaries was missing.",
        ],
        improvementAdvice:
          "Trace the pathway from transport in blood to exchange at capillaries to use by tissues, and mention steep concentration gradients.",
      },
      2: {
        estimatedMark: 5,
        whatWasGood: [
          "You explained that blood transports oxygen and nutrients to tissues continuously.",
          "You linked capillaries to short diffusion distance and efficient exchange.",
          "You showed that active tissues need a rapid and maintained supply to support respiration.",
        ],
        missingPoints: [
          "One more explicit reference to increased demand in active tissues would make the reasoning even sharper.",
        ],
        improvementAdvice:
          "Add a final sentence about how higher metabolic rate in active tissues increases the need for constant delivery.",
      },
    },
  },
  {
    questionId: "mock-bio-006",
    questionText:
      "Explain why maintaining biodiversity matters for ecosystems and for humans who rely on biological resources.",
    marks: 10,
    questionType: "explain",
    topicId: "topic-genetics-and-evolution",
    topicLabel: "Genetics and evolution",
    subtopicId: "biodiversity",
    subtopicLabel: "Biodiversity",
    answerFocus:
      "Balance ecological stability with practical human consequences.",
    feedbackByAttempt: {
      1: {
        estimatedMark: 4,
        whatWasGood: [
          "You recognised that biodiversity supports ecosystem stability.",
          "You noted that humans depend on biological resources.",
        ],
        missingPoints: [
          "The ecological section needed a clearer explanation of resilience and interdependence.",
          "The human section needed more specific consequences such as food, medicine, or genetic resources.",
        ],
        improvementAdvice:
          "Split the answer into ecosystem benefits and human benefits, then add one concrete ecological example and one practical human-use example.",
      },
      2: {
        estimatedMark: 7,
        whatWasGood: [
          "You explained that more diverse ecosystems are often more stable and resilient to change.",
          "You linked biodiversity to resources such as food, medicines, and breeding material.",
          "You showed that biodiversity loss can reduce ecosystem services humans rely on.",
        ],
        missingPoints: [
          "An additional named case study would make the response even more persuasive.",
        ],
        improvementAdvice:
          "Add one short real-world example to strengthen the ecological impact section.",
      },
    },
  },
  {
    questionId: "mock-bio-007",
    questionText:
      "Explain how classification systems help biologists identify organisms and understand evolutionary relationships.",
    marks: 6,
    questionType: "explain",
    topicId: "topic-genetics-and-evolution",
    topicLabel: "Genetics and evolution",
    subtopicId: "classification",
    subtopicLabel: "Classification",
    answerFocus:
      "Use taxonomy and evolutionary evidence rather than treating classification as simple naming.",
    feedbackByAttempt: {
      1: {
        estimatedMark: 3,
        whatWasGood: [
          "You recognised that classification helps organise organisms into groups.",
          "You mentioned that it supports communication between biologists.",
        ],
        missingPoints: [
          "You did not explain clearly how shared characteristics or molecular evidence show relatedness.",
          "The evolutionary purpose of classification needed more detail.",
        ],
        improvementAdvice:
          "Explain that organisms grouped together share characteristics and often common ancestry, then add one line on molecular or genetic evidence.",
      },
      2: {
        estimatedMark: 5,
        whatWasGood: [
          "You explained how classification helps identification and consistent communication.",
          "You linked grouped characteristics to evolutionary relationships and shared ancestry.",
          "You brought in molecular evidence as support for modern classification systems.",
        ],
        missingPoints: [
          "A brief named reference to taxonomy levels would complete the answer more fully.",
        ],
        improvementAdvice:
          "Add one short sentence using a term such as genus or species to make the taxonomy link explicit.",
      },
    },
  },
];

export function markMockPracticeAnswer(
  payload: unknown,
): MockApiResult<MarkAnswerResponse> {
  if (!isRecord(payload)) {
    return createErrorResult(400, "Invalid request body");
  }

  const {
    questionId,
    questionText,
    marks,
    questionType,
    topicId,
    topicLabel,
    subtopicId,
    subtopicLabel,
    answerText,
    attemptNumber,
  } = payload;

  if (typeof questionId !== "string" || questionId.length === 0) {
    return createErrorResult(400, "questionId is required");
  }

  if (
    typeof questionText !== "string" ||
    typeof topicId !== "string" ||
    typeof topicLabel !== "string" ||
    typeof subtopicId !== "string" ||
    typeof subtopicLabel !== "string" ||
    typeof marks !== "number" ||
    !isPracticeQuestionCommandWord(questionType)
  ) {
    return createErrorResult(400, "Invalid question payload");
  }

  if (typeof answerText !== "string" || answerText.trim().length === 0) {
    return createErrorResult(400, "Answer text is required");
  }

  if (!isAttemptNumber(attemptNumber)) {
    return createErrorResult(400, "Invalid attemptNumber");
  }

  const question = mockBiologyQuestionBank.find(
    (mockQuestion) => mockQuestion.questionId === questionId,
  );

  if (!question) {
    return {
      status: 200,
      body: createFallbackFeedback({
        attemptNumber,
        marks,
        questionId,
        subtopicId,
        subtopicLabel,
        topicId,
        topicLabel,
      }),
    };
  }

  const feedback = question.feedbackByAttempt[attemptNumber];

  return {
    status: 200,
    body: {
      questionId: question.questionId,
      estimatedMark: feedback.estimatedMark,
      maxMarks: question.marks,
      topicId: question.topicId,
      topicLabel: question.topicLabel,
      subtopicId: question.subtopicId,
      subtopicLabel: question.subtopicLabel,
      whatWasGood: feedback.whatWasGood,
      missingPoints: feedback.missingPoints,
      improvementAdvice: feedback.improvementAdvice,
      attemptNumber,
    },
  };
}

function createFallbackFeedback({
  attemptNumber,
  marks,
  questionId,
  subtopicId,
  subtopicLabel,
  topicId,
  topicLabel,
}: {
  questionId: string;
  marks: number;
  topicId: string;
  topicLabel: string;
  subtopicId: string;
  subtopicLabel: string;
  attemptNumber: 1 | 2;
}): MarkAnswerResponse {
  const firstAttemptMark =
    Math.min(marks, Math.max(1, Math.ceil(marks * 0.5)));
  const improvementStep = marks >= 6 ? 2 : 1;
  const estimatedMark =
    attemptNumber === 1
      ? firstAttemptMark
      : Math.min(marks, firstAttemptMark + improvementStep);

  return {
    questionId,
    estimatedMark,
    maxMarks: marks,
    topicId,
    topicLabel,
    subtopicId,
    subtopicLabel,
    whatWasGood:
      attemptNumber === 1
        ? [
            `You stayed focused on ${subtopicLabel} and addressed the main question directly.`,
            "Your response included relevant biological points instead of drifting off topic.",
          ]
        : [
            `Your revised answer on ${subtopicLabel} was more direct and better structured.`,
            "You used clearer explanation to connect ideas and support the main line of argument.",
          ],
    missingPoints:
      attemptNumber === 1
        ? [
            "The explanation needs a little more precision and explicit scientific detail.",
            "A clearer sequence of linked points would make the answer stronger.",
          ]
        : [
            "One more specific example or sharper piece of terminology would push the answer further.",
          ],
    improvementAdvice:
      attemptNumber === 1
        ? `Keep the answer tightly organised around the key points for ${topicLabel}, then add one precise biological example.`
        : "Add one more exact detail or named example to turn a clearer answer into a stronger exam response.",
    attemptNumber,
  };
}

function createErrorResult(status: number, error: string): MockApiResult<never> {
  return {
    status,
    body: { error },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAttemptNumber(value: unknown): value is 1 | 2 {
  return value === 1 || value === 2;
}
