/**
 * DATA MANIFEST — ChanceSHS Prediction Data Provenance
 *
 * This file answers the three legal/trust questions:
 *   1. WHERE does the data come from?
 *   2. How verified is it?
 *   3. Who updates it and when?
 *
 * IMPORTANT: This file must be updated every year after GES releases results.
 * Any school entry marked `dataQuality: 'estimated'` must be treated as
 * illustrative only and must NOT be presented as verified cutoff data.
 */

export type DataQuality = 'verified' | 'community_cross_checked' | 'estimated';

export interface SchoolDataRecord {
  schoolId:        string;
  schoolName:      string;
  dataQuality:     DataQuality;
  yearsOfData:     number;        // How many years of cutoff history we have
  cutoffSource:    string[];      // Attribution for each data source used
  lastVerified:    string;        // ISO date of most recent manual verification
  notes?:          string;
}

export interface DataManifest {
  version:         string;        // Semantic version of this data set
  lastUpdated:     string;        // ISO date of last dataset update
  nextUpdate:      string;        // Expected next update (after BECE results)
  sourceNote:      string;        // Plain-language source statement shown to users
  methodology:     string;        // How predictions are made
  disclaimer:      string;        // Legal disclaimer
  updateSchedule:  string;        // Human-readable update cadence
  validationPipeline: {
    step: string;
    description: string;
    frequency: string;
  }[];
  schools: SchoolDataRecord[];
}

export const DATA_MANIFEST: DataManifest = {
  version:     '2.1.0',
  lastUpdated: '2024-10-15',   // Update after each BECE results cycle
  nextUpdate:  '2025-10-01',   // Expected after 2025 BECE placement release
  sourceNote:
    'Cutoff data compiled from Ghana Education Service (GES) published placement aggregates, ' +
    'Ghana Results Checker community records, and cross-referenced parent/student reports. ' +
    'Data covers BECE placement cycles 2022–2024.',

  methodology:
    'Placement probabilities are computed using a Normal CDF model fitted to 2–3 years of ' +
    'historical cutoff aggregates per school. A trend slope (least-squares) projects the most ' +
    'likely cutoff for the current cycle. Subject alignment, raw score tiebreaker, and boarding ' +
    'competitiveness factors apply multiplicative adjustments. Confidence scores reflect data ' +
    'depth: schools with only 1 year of data receive lower confidence and wider probability bands.',

  disclaimer:
    'ChanceSHS predictions are statistical estimates based on historical patterns. They do NOT ' +
    'guarantee placement. Final placement depends on actual GES cutoffs, school capacity, national ' +
    'quota allocations, and GES administrative decisions which may change year-to-year. Always ' +
    'use predictions as one input among many when making school choices.',

  updateSchedule:
    'Data is reviewed and updated annually within 4 weeks of GES releasing official BECE placement ' +
    'results (typically September–October). Schools added or reclassified by GES are incorporated ' +
    'within 2 weeks of the official announcement.',

  validationPipeline: [
    {
      step:        '1. Anchor verification',
      description: 'Top 10 nationally known schools (Achimota, PRESEC, Wesley Girls, etc.) are ' +
                   'cross-checked against GES press releases and Ghana Results Checker.',
      frequency:   'Annual, immediately after GES results',
    },
    {
      step:        '2. Community cross-check',
      description: 'Mid-tier school cutoffs are validated against aggregated user-reported placements ' +
                   'collected via the ChanceSHS feedback form and verified SHS parent groups.',
      frequency:   'Annual',
    },
    {
      step:        '3. Statistical outlier detection',
      description: 'Any cutoff that deviates >2 standard deviations from its historical mean is ' +
                   'flagged and manually reviewed before inclusion.',
      frequency:   'Each update cycle',
    },
    {
      step:        '4. Version control',
      description: 'Each dataset update increments the version number. All historical versions ' +
                   'are retained in Firebase for audit trail.',
      frequency:   'Each update cycle',
    },
    {
      step:        '5. Confidence downgrade for estimated data',
      description: 'Schools with fewer than 2 years of verified data are tagged `estimated`. ' +
                   'The prediction engine uses wider uncertainty bands for these schools and ' +
                   'the UI displays a lower confidence score with a visible caveat.',
      frequency:   'Ongoing',
    },
  ],

  schools: [
    {
      schoolId:    'achimota',
      schoolName:  'Achimota School',
      dataQuality: 'verified',
      yearsOfData: 3,
      cutoffSource: [
        'GES 2024 placement press release',
        'Ghana Results Checker historical aggregates 2022–2023',
      ],
      lastVerified: '2024-10-15',
    },
    {
      schoolId:    'presec_legon',
      schoolName:  'PRESEC Legon',
      dataQuality: 'verified',
      yearsOfData: 3,
      cutoffSource: [
        'GES 2024 placement press release',
        'Ghana Results Checker historical aggregates 2022–2023',
      ],
      lastVerified: '2024-10-15',
    },
    {
      schoolId:    'wesley_girls',
      schoolName:  'Wesley Girls High School',
      dataQuality: 'verified',
      yearsOfData: 3,
      cutoffSource: [
        'GES 2024 placement press release',
        'Ghana Results Checker historical aggregates 2022–2023',
      ],
      lastVerified: '2024-10-15',
    },
    {
      schoolId:    'adisadel',
      schoolName:  'Adisadel College',
      dataQuality: 'community_cross_checked',
      yearsOfData: 2,
      cutoffSource: [
        'Ghana Results Checker 2023–2024',
        'ChanceSHS user feedback pool (n=47)',
      ],
      lastVerified: '2024-10-15',
    },
    {
      schoolId:    'st_marys',
      schoolName:  'St. Mary\'s Senior High School',
      dataQuality: 'community_cross_checked',
      yearsOfData: 2,
      cutoffSource: [
        'Ghana Results Checker 2023–2024',
        'ChanceSHS user feedback pool (n=31)',
      ],
      lastVerified: '2024-10-15',
    },
    {
      schoolId:    'ghana_national',
      schoolName:  'Ghana National College',
      dataQuality: 'community_cross_checked',
      yearsOfData: 2,
      cutoffSource: [
        'Ghana Results Checker 2023–2024',
        'ChanceSHS user feedback pool (n=22)',
      ],
      lastVerified: '2024-10-15',
    },
    {
      schoolId:    'kumasi_high',
      schoolName:  'Kumasi High School',
      dataQuality: 'estimated',
      yearsOfData: 1,
      cutoffSource: [
        'Tier-based estimate (Category B boarding school band)',
      ],
      lastVerified: '2024-10-15',
      notes: 'Only 1 year of confirmed data. Confidence scores for this school are intentionally lower.',
    },
    {
      schoolId:    'mpraeso',
      schoolName:  'Mpraeso SHS',
      dataQuality: 'estimated',
      yearsOfData: 1,
      cutoffSource: [
        'Tier-based estimate (Category C boarding school band)',
      ],
      lastVerified: '2024-10-15',
      notes: 'Only 1 year of confirmed data.',
    },
  ],
};

/**
 * Get data quality record for a specific school.
 * Returns null if school is not yet in the manifest (treat as estimated).
 */
export function getSchoolDataRecord(schoolId: string): SchoolDataRecord | null {
  return DATA_MANIFEST.schools.find(s => s.schoolId === schoolId) ?? null;
}

/**
 * Returns true if any school in the provided list has estimated-only data.
 * Used to decide whether to show the data caveat banner.
 */
export function hasEstimatedData(schoolIds: string[]): boolean {
  return schoolIds.some(id => {
    const record = getSchoolDataRecord(id);
    return !record || record.dataQuality === 'estimated';
  });
}

/**
 * Returns data freshness status: 'current', 'stale', or 'critical'.
 * Stale = last update > 14 months ago. Critical = > 26 months ago.
 */
export function getDataFreshness(): 'current' | 'stale' | 'critical' {
  const lastUpdate  = new Date(DATA_MANIFEST.lastUpdated);
  const monthsOld   = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (monthsOld > 26) return 'critical';
  if (monthsOld > 14) return 'stale';
  return 'current';
}
