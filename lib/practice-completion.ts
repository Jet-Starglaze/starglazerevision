export function getPracticeCompletionThreshold(maxScore: number) {
  return maxScore === 6 ? 5 : maxScore;
}

export function hasReachedPracticeCompletionThreshold(
  score: number,
  maxScore: number,
) {
  return score >= getPracticeCompletionThreshold(maxScore);
}
