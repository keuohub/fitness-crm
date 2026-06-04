// Growth Score Engine — rule-based 0-100 score from member data

export interface GrowthScoreInput {
  trainingCount: number;
  consecutiveTrainingDays: number;
  questionnaireCount: number;
  photoCount: number;
  feedbackCount: number;
  daysSinceJoin: number;
}

export interface GrowthScoreOutput {
  score: number; // 0–100
  breakdown: {
    frequency: number;   // 0–30
    streak: number;      // 0–20
    completeness: number; // 0–20
    photos: number;      // 0–15
    feedback: number;    // 0–15
  };
  label: string;
}

/**
 * Compute growth score from member stats.
 *
 * Scoring rules:
 * - frequency: trainingCount / daysSinceJoin * 30 * 30, capped at 30
 * - streak: consecutiveTrainingDays >= 7 -> 10, >= 30 -> 20
 * - completeness: questionnaireCount >= 1 -> 10, >= 2 -> 20
 * - photos: photoCount >= 1 -> 5, >= 5 -> 15
 * - feedback: feedbackCount >= 1 -> 5, >= 5 -> 15
 */
export function computeGrowthScore(input: GrowthScoreInput): GrowthScoreOutput {
  const { trainingCount, consecutiveTrainingDays, questionnaireCount, photoCount, feedbackCount, daysSinceJoin } = input;

  // Frequency: ideal is 2-3 trainings per week
  const weeks = Math.max(1, daysSinceJoin / 7);
  const trainingsPerWeek = trainingCount / weeks;
  const frequency = Math.min(30, Math.round(trainingsPerWeek * 10));

  // Streak
  let streak = 0;
  if (consecutiveTrainingDays >= 30) streak = 20;
  else if (consecutiveTrainingDays >= 14) streak = 15;
  else if (consecutiveTrainingDays >= 7) streak = 10;
  else if (consecutiveTrainingDays >= 3) streak = 5;

  // Completeness
  let completeness = 0;
  if (questionnaireCount >= 3) completeness = 20;
  else if (questionnaireCount >= 2) completeness = 15;
  else if (questionnaireCount >= 1) completeness = 10;

  // Photos
  let photos = 0;
  if (photoCount >= 8) photos = 15;
  else if (photoCount >= 5) photos = 12;
  else if (photoCount >= 3) photos = 8;
  else if (photoCount >= 1) photos = 5;

  // Feedback
  let feedback = 0;
  if (feedbackCount >= 20) feedback = 15;
  else if (feedbackCount >= 10) feedback = 12;
  else if (feedbackCount >= 5) feedback = 8;
  else if (feedbackCount >= 1) feedback = 5;

  const score = frequency + streak + completeness + photos + feedback;

  // Label
  let label = "待成长";
  if (score >= 85) label = "成长典范";
  else if (score >= 70) label = "稳步提升";
  else if (score >= 50) label = "持续努力";
  else if (score >= 30) label = "正在起步";

  return {
    score: Math.min(100, score),
    breakdown: { frequency, streak, completeness, photos, feedback },
    label,
  };
}
