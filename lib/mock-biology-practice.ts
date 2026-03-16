export const BIOLOGY_PRACTICE_SUBJECT_SLUG = "ocr-a-level-biology-a";

export type PracticeQuestionType = "mixed" | "six-mark" | "long-answer";

export type PracticeSessionLength = 5 | 10 | 20;

export type PracticeSubtopic = {
  id: string;
  slug: string;
  code: string;
  name: string;
};

export type PracticeTopic = {
  id: string;
  slug: string;
  name: string;
  subtopics: PracticeSubtopic[];
};

export type PracticeModule = {
  id: string;
  slug: string;
  label: string;
  name: string;
  topics: PracticeTopic[];
};

export type MockPracticeFeedback = {
  awardedMarks: number;
  overallComment: string;
  awardedPoints: string[];
  missingPoints: string[];
  improvementAdvice: string[];
};

export type PracticeQuestion = {
  id: string;
  subtopicId: string;
  type: Exclude<PracticeQuestionType, "mixed">;
  questionLabel: string;
  prompt: string;
  maxMarks: number;
  focus: string;
  firstAttemptFeedback: MockPracticeFeedback;
  improvedAttemptFeedback: MockPracticeFeedback;
};

export const biologyPracticeSyllabus: PracticeModule[] = [
  {
    id: "module-2",
    slug: "module-2",
    label: "Module 2",
    name: "Foundations in biology",
    topics: [
      {
        id: "topic-cell-structure",
        slug: "cell-structure",
        name: "Cell structure",
        subtopics: [
          {
            id: "eukaryotic-cell-structure",
            slug: "eukaryotic-cell-structure",
            code: "2.1.1",
            name: "Eukaryotic cell structure",
          },
          {
            id: "prokaryotic-cell-structure",
            slug: "prokaryotic-cell-structure",
            code: "2.1.2",
            name: "Prokaryotic cell structure",
          },
          {
            id: "microscopy",
            slug: "microscopy",
            code: "2.1.3",
            name: "Microscopy",
          },
        ],
      },
    ],
  },
  {
    id: "module-3",
    slug: "module-3",
    label: "Module 3",
    name: "Exchange and transport",
    topics: [
      {
        id: "topic-exchange-and-transport",
        slug: "exchange-and-transport",
        name: "Exchange and transport",
        subtopics: [
          {
            id: "exchange-surfaces",
            slug: "exchange-surfaces",
            code: "3.1.1",
            name: "Exchange surfaces",
          },
          {
            id: "transport-in-animals",
            slug: "transport-in-animals",
            code: "3.1.2",
            name: "Transport in animals",
          },
        ],
      },
    ],
  },
  {
    id: "module-6",
    slug: "module-6",
    label: "Module 6",
    name: "Genetics, evolution and ecosystems",
    topics: [
      {
        id: "topic-genetics-and-evolution",
        slug: "genetics-and-evolution",
        name: "Genetics and evolution",
        subtopics: [
          {
            id: "biodiversity",
            slug: "biodiversity",
            code: "6.1.1",
            name: "Biodiversity",
          },
          {
            id: "classification",
            slug: "classification",
            code: "6.1.2",
            name: "Classification",
          },
        ],
      },
    ],
  },
];

// TODO: Replace these placeholder questions and feedback payloads with real AI-generated sessions.
export const biologyPracticeQuestions: PracticeQuestion[] = [
  {
    id: "question-eukaryotic-six",
    subtopicId: "eukaryotic-cell-structure",
    type: "six-mark",
    questionLabel: "6-mark practice question",
    prompt:
      "Explain how the structure of the rough endoplasmic reticulum, Golgi apparatus, and vesicles allows a eukaryotic cell to process and transport proteins.",
    maxMarks: 6,
    focus:
      "Link each organelle to a clear stage in protein production and secretion.",
    firstAttemptFeedback: {
      awardedMarks: 3,
      overallComment:
        "You identified the main organelles involved, but the sequence and detail were still too loose for a higher mark.",
      awardedPoints: [
        "You recognised the rough endoplasmic reticulum as part of the protein pathway.",
        "You mentioned the Golgi apparatus and vesicles in protein transport.",
      ],
      missingPoints: [
        "You did not clearly explain the order from ribosomes to rough ER to Golgi to secretory vesicles.",
        "The answer needed more precision about protein modification and packaging before secretion.",
      ],
      improvementAdvice: [
        "Rewrite the answer as a sequence of stages rather than as isolated organelle facts.",
        "Use precise terms such as ribosomes, transport vesicles, modification, and exocytosis.",
      ],
    },
    improvedAttemptFeedback: {
      awardedMarks: 5,
      overallComment:
        "The improved answer follows the pathway much more clearly and uses more accurate biological language.",
      awardedPoints: [
        "You linked ribosomes on the rough ER to the initial synthesis of proteins.",
        "You explained that the Golgi apparatus modifies and packages proteins into vesicles.",
        "You finished the sequence by linking vesicles to transport and secretion at the cell surface.",
      ],
      missingPoints: [
        "One more explicit link to why these membrane-bound compartments help efficiency would push it further.",
      ],
      improvementAdvice: [
        "Add one final sentence explaining how compartmentalisation keeps the process ordered and efficient.",
      ],
    },
  },
  {
    id: "question-prokaryotic-long",
    subtopicId: "prokaryotic-cell-structure",
    type: "long-answer",
    questionLabel: "Long-answer practice question",
    prompt:
      "Compare the structure of prokaryotic and eukaryotic cells and explain how those differences affect what each cell can do.",
    maxMarks: 10,
    focus:
      "Use direct comparison points rather than describing each cell type in isolation.",
    firstAttemptFeedback: {
      awardedMarks: 4,
      overallComment:
        "The comparison has some correct biological points, but it still reads more like two short descriptions than a developed comparative answer.",
      awardedPoints: [
        "You correctly noted that eukaryotic cells have membrane-bound organelles.",
        "You identified that prokaryotic DNA is not enclosed in a nucleus.",
      ],
      missingPoints: [
        "You needed clearer comparison of ribosomes, DNA structure, and cell size.",
        "Functional consequences were mentioned only briefly instead of being linked to each structural difference.",
      ],
      improvementAdvice: [
        "Structure the answer as paired comparisons such as DNA, ribosomes, organelles, and size.",
        "After each difference, explain how that affects transport, compartmentalisation, or cell activity.",
      ],
    },
    improvedAttemptFeedback: {
      awardedMarks: 7,
      overallComment:
        "The second attempt is much stronger because each structural contrast now leads into a functional explanation.",
      awardedPoints: [
        "You compared DNA arrangement, ribosome size, and organelle presence in a clearer way.",
        "You linked membrane-bound organelles in eukaryotes to compartmentalised processes.",
        "You explained how the smaller size and simpler structure of prokaryotes supports rapid exchange with the environment.",
      ],
      missingPoints: [
        "A final comparison around plasmids or cell wall differences would have added even more depth.",
      ],
      improvementAdvice: [
        "To push higher, include one extra named example such as plasmids or 70S and 80S ribosomes.",
      ],
    },
  },
  {
    id: "question-microscopy-six",
    subtopicId: "microscopy",
    type: "six-mark",
    questionLabel: "6-mark practice question",
    prompt:
      "Explain why resolution is often more important than magnification when comparing light microscopes with electron microscopes.",
    maxMarks: 6,
    focus:
      "Use biological examples and avoid treating resolution and magnification as the same idea.",
    firstAttemptFeedback: {
      awardedMarks: 3,
      overallComment:
        "You showed the basic difference between magnification and resolution, but the explanation was still too general.",
      awardedPoints: [
        "You correctly said that resolution affects how clearly separate points can be distinguished.",
        "You recognised that electron microscopes reveal more detail than light microscopes.",
      ],
      missingPoints: [
        "You did not give a strong biological example of a structure that needs higher resolution to be seen clearly.",
        "The answer needed a sharper explanation of why greater magnification alone can still produce a blurry image.",
      ],
      improvementAdvice: [
        "Use an example such as mitochondrial cristae or ribosomes to show why improved resolution matters.",
        "State explicitly that magnification without resolution only enlarges the blur.",
      ],
    },
    improvedAttemptFeedback: {
      awardedMarks: 5,
      overallComment:
        "The improved answer now makes the key point clearly and backs it up with a relevant biological example.",
      awardedPoints: [
        "You clearly defined resolution and separated it from magnification.",
        "You explained that electron microscopes reveal finer details such as internal organelle structure.",
        "You made it clear that enlarging a low-resolution image does not add information.",
      ],
      missingPoints: [
        "A brief numerical or wavelength-based comparison would strengthen the final explanation.",
      ],
      improvementAdvice: [
        "Add one short sentence linking shorter electron wavelengths to higher resolving power.",
      ],
    },
  },
  {
    id: "question-exchange-long",
    subtopicId: "exchange-surfaces",
    type: "long-answer",
    questionLabel: "Long-answer practice question",
    prompt:
      "Describe how efficient exchange surfaces are adapted for their function in organisms and explain why these adaptations matter.",
    maxMarks: 10,
    focus:
      "Build the answer around surface area, diffusion distance, and maintaining concentration gradients.",
    firstAttemptFeedback: {
      awardedMarks: 4,
      overallComment:
        "The answer included the main adaptation themes, but they were not yet developed into a full explanation.",
      awardedPoints: [
        "You identified large surface area and short diffusion distance as key features.",
        "You mentioned that organisms maintain concentration gradients.",
      ],
      missingPoints: [
        "The answer did not clearly explain how ventilation or transport systems maintain steep gradients.",
        "You needed more explicit links from each adaptation to faster diffusion.",
      ],
      improvementAdvice: [
        "Use a repeated pattern of adaptation followed by its direct benefit.",
        "Bring in ventilation or blood flow to show how gradients are kept steep in real systems.",
      ],
    },
    improvedAttemptFeedback: {
      awardedMarks: 7,
      overallComment:
        "The second attempt is much more exam-ready because the adaptations are now linked directly to function.",
      awardedPoints: [
        "You explained how a large surface area increases the area available for diffusion.",
        "You linked thin exchange surfaces to short diffusion distance.",
        "You added transport and ventilation as mechanisms that maintain concentration gradients.",
      ],
      missingPoints: [
        "A named example such as alveoli, gills, or villi would add even more specificity.",
      ],
      improvementAdvice: [
        "Use one clear biological example to anchor the explanation and gain extra precision.",
      ],
    },
  },
  {
    id: "question-transport-six",
    subtopicId: "transport-in-animals",
    type: "six-mark",
    questionLabel: "6-mark practice question",
    prompt:
      "Explain how the transport system in animals helps maintain a supply of oxygen and nutrients to active tissues.",
    maxMarks: 6,
    focus:
      "Keep the answer focused on transport and delivery rather than listing unrelated organ facts.",
    firstAttemptFeedback: {
      awardedMarks: 3,
      overallComment:
        "You identified the transport system as important, but the delivery chain to tissues was not fully explained.",
      awardedPoints: [
        "You referred to the circulatory system carrying substances around the body.",
        "You recognised that oxygen and nutrients are delivered by the blood.",
      ],
      missingPoints: [
        "You needed clearer explanation of how arteries, capillaries, and circulation support active tissues.",
        "The role of short diffusion distance at capillaries was missing.",
      ],
      improvementAdvice: [
        "Trace the pathway from transport in blood to exchange at capillaries to use by tissues.",
        "Include capillaries and steep concentration gradients for a more complete explanation.",
      ],
    },
    improvedAttemptFeedback: {
      awardedMarks: 5,
      overallComment:
        "The improved answer is stronger because it now links circulation to exchange at tissues more clearly.",
      awardedPoints: [
        "You explained that blood transports oxygen and nutrients to tissues continuously.",
        "You linked capillaries to short diffusion distance and efficient exchange.",
        "You showed that active tissues need a rapid and maintained supply to support respiration.",
      ],
      missingPoints: [
        "One more explicit reference to increased demand in active tissues would make the reasoning even sharper.",
      ],
      improvementAdvice: [
        "Add a final sentence about how higher metabolic rate in active tissues increases the need for constant delivery.",
      ],
    },
  },
  {
    id: "question-biodiversity-long",
    subtopicId: "biodiversity",
    type: "long-answer",
    questionLabel: "Long-answer practice question",
    prompt:
      "Explain why maintaining biodiversity matters for ecosystems and for humans who rely on biological resources.",
    maxMarks: 10,
    focus:
      "Balance ecological stability with practical human consequences.",
    firstAttemptFeedback: {
      awardedMarks: 4,
      overallComment:
        "The first answer has the right general idea, but it needs stronger explanation of both ecosystem and human impacts.",
      awardedPoints: [
        "You recognised that biodiversity supports ecosystem stability.",
        "You noted that humans depend on biological resources.",
      ],
      missingPoints: [
        "The ecological section needed a clearer explanation of resilience and interdependence.",
        "The human section needed more specific consequences such as food, medicine, or genetic resources.",
      ],
      improvementAdvice: [
        "Split the answer into ecosystem benefits and human benefits.",
        "Add one concrete ecological example and one practical human-use example.",
      ],
    },
    improvedAttemptFeedback: {
      awardedMarks: 7,
      overallComment:
        "The improved answer is more balanced and gives clearer reasons for why biodiversity loss has real consequences.",
      awardedPoints: [
        "You explained that more diverse ecosystems are often more stable and resilient to change.",
        "You linked biodiversity to resources such as food, medicines, and breeding material.",
        "You showed that biodiversity loss can reduce ecosystem services humans rely on.",
      ],
      missingPoints: [
        "An additional named case study would make the response even more persuasive.",
      ],
      improvementAdvice: [
        "Add one short real-world example to strengthen the ecological impact section.",
      ],
    },
  },
  {
    id: "question-classification-six",
    subtopicId: "classification",
    type: "six-mark",
    questionLabel: "6-mark practice question",
    prompt:
      "Explain how classification systems help biologists identify organisms and understand evolutionary relationships.",
    maxMarks: 6,
    focus:
      "Use taxonomy and evolutionary evidence rather than treating classification as simple naming.",
    firstAttemptFeedback: {
      awardedMarks: 3,
      overallComment:
        "The answer identifies some uses of classification, but it needs a stronger explanation of relatedness and evidence.",
      awardedPoints: [
        "You recognised that classification helps organise organisms into groups.",
        "You mentioned that it supports communication between biologists.",
      ],
      missingPoints: [
        "You did not explain clearly how shared characteristics or molecular evidence show relatedness.",
        "The evolutionary purpose of classification needed more detail.",
      ],
      improvementAdvice: [
        "Explain that organisms grouped together share characteristics and often common ancestry.",
        "Add one line on molecular or genetic evidence supporting modern classification.",
      ],
    },
    improvedAttemptFeedback: {
      awardedMarks: 5,
      overallComment:
        "The second attempt makes the evolutionary purpose of classification much clearer and more precise.",
      awardedPoints: [
        "You explained how classification helps identification and consistent communication.",
        "You linked grouped characteristics to evolutionary relationships and shared ancestry.",
        "You brought in molecular evidence as support for modern classification systems.",
      ],
      missingPoints: [
        "A brief named reference to taxonomy levels would complete the answer more fully.",
      ],
      improvementAdvice: [
        "Add one short sentence using a term such as genus or species to make the taxonomy link explicit.",
      ],
    },
  },
];

export function getEligiblePracticeQuestions(
  selectedSubtopicIds: string[],
  questionType: PracticeQuestionType,
) {
  const allowedTypes: Array<Exclude<PracticeQuestionType, "mixed">> =
    questionType === "mixed" ? ["six-mark", "long-answer"] : [questionType];

  return biologyPracticeQuestions.filter((question) => {
    return (
      selectedSubtopicIds.includes(question.subtopicId) &&
      allowedTypes.includes(question.type)
    );
  });
}
