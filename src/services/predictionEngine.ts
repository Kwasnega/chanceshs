export interface SchoolPrediction {
  schoolId: string;
  schoolName: string;
  category: string;
  probability: number;
  matchType: 'safe' | 'competitive' | 'reach';
}

/**
 * Calculates placement probability based on BECE aggregate vs historical cut-offs.
 * Logic is refined for Ghanaian SHS context.
 */
export function calculateProbability(
  aggregate: number, 
  schoolCategory: string, 
  historicalCutoff: number,
  course: string = 'General Science'
): SchoolPrediction {
  // Delta is the difference between your aggregate and the cutoff.
  const delta = aggregate - historicalCutoff;
  
  let probability = 0;
  let matchType: 'safe' | 'competitive' | 'reach' = 'reach';

  // Base Logic
  if (delta <= -3) {
    probability = Math.floor(Math.random() * (99 - 92 + 1) + 92);
    matchType = 'safe';
  } else if (delta === -2) {
    probability = Math.floor(Math.random() * (91 - 85 + 1) + 85);
    matchType = 'safe';
  } else if (delta === -1) {
    probability = Math.floor(Math.random() * (84 - 75 + 1) + 75);
    matchType = 'competitive';
  } else if (delta === 0) {
    probability = Math.floor(Math.random() * (74 - 60 + 1) + 60);
    matchType = 'competitive';
  } else if (delta === 1) {
    probability = Math.floor(Math.random() * (59 - 45 + 1) + 45);
    matchType = 'competitive';
  } else if (delta === 2) {
    probability = Math.floor(Math.random() * (44 - 30 + 1) + 30);
    matchType = 'reach';
  } else {
    probability = Math.floor(Math.random() * (29 - 10 + 1) + 10);
    matchType = 'reach';
  }

  // Course Penalties (General Science is the most competitive)
  if (course === 'General Science') {
    probability = Math.max(10, probability - 5);
  } else if (course === 'Business') {
    probability = Math.max(10, probability - 3);
  } else if (course === 'Agriculture' || course === 'Visual Arts') {
    probability = Math.min(99, probability + 5);
  }

  // School Category Penalties (Category A is much harder even if you match the cutoff)
  if (schoolCategory === 'A') {
    probability = Math.max(10, probability - 8);
    // If it's Category A and you're exactly at the cutoff, it's never a "Safe" match
    if (matchType === 'safe' && delta > -3) {
      matchType = 'competitive';
    }
  } else if (schoolCategory === 'B') {
    probability = Math.min(99, probability + 2);
  }

  return {
    schoolId: '', // Filled by caller
    schoolName: '', // Filled by caller
    category: schoolCategory,
    probability,
    matchType
  };
}
