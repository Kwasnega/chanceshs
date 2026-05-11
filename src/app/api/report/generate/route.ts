import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, ref, get, set, update } from 'firebase/database';
import { validatePremiumAccess } from '@/lib/premiumAccess';

export const dynamic = 'force-dynamic';

interface GenerateReportRequest {
  userId: string;
  reference?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateReportRequest = await request.json();
    const { userId, reference } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    // Validate premium access
    const premiumAccess = await validatePremiumAccess(userId);
    if (!premiumAccess.isPremium) {
      return NextResponse.json(
        { error: 'Premium access required', details: premiumAccess.error },
        { status: 403 }
      );
    }

    // Validate product entitlement
    const hasReportAccess = await validateProductEntitlement(userId, 'premium_report');
    if (!hasReportAccess) {
      return NextResponse.json(
        { error: 'Report product not purchased' },
        { status: 403 }
      );
    }

    const db = getDatabase();

    // Use provided reference or get from user's premium data
    const reportReference = reference || premiumAccess.premiumReference || `report_${userId}_${Date.now()}`;

    // Check if report already exists
    const reportRef = ref(db, `reports/${reportReference}`);
    const reportSnapshot = await get(reportRef);

    if (reportSnapshot.exists()) {
      const reportData = reportSnapshot.val();
      
      // Check if report is ready
      if (reportData.status === 'ready') {
        return NextResponse.json({
          success: true,
          report: reportData,
          alreadyExists: true
        });
      } else {
        return NextResponse.json({
          success: true,
          status: 'generating',
          message: 'Report is being generated'
        });
      }
    }

    // Get user's prediction data
    const predictionsRef = ref(db, `predictions/${userId}`);
    const predictionsSnapshot = await get(predictionsRef);

    if (!predictionsSnapshot.exists()) {
      return NextResponse.json(
        { error: 'No prediction data found for this user' },
        { status: 404 }
      );
    }

    const predictions = predictionsSnapshot.val();

    // Generate structured report data
    const reportData = await generateReportData(predictions, userId, reportReference);

    // Save report to database
    await set(reportRef, {
      ...reportData,
      status: 'ready',
      generatedAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      report: reportData,
      message: 'Report generated successfully'
    });

  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const reference = searchParams.get('reference');

    if (!userId || !reference) {
      return NextResponse.json(
        { error: 'Missing required parameters: userId and reference' },
        { status: 400 }
      );
    }

    // Validate premium access
    const premiumAccess = await validatePremiumAccess(userId);
    if (!premiumAccess.isPremium) {
      return NextResponse.json(
        { error: 'Premium access required' },
        { status: 403 }
      );
    }

    const db = getDatabase();
    const reportRef = ref(db, `reports/${reference}`);
    const reportSnapshot = await get(reportRef);

    if (!reportSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    const reportData = reportSnapshot.val();

    // Verify report belongs to user
    if (reportData.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      report: reportData
    });

  } catch (error) {
    console.error('Report retrieval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate report data
async function generateReportData(predictions: any, userId: string, reference: string) {
  const now = new Date();
  
  // Sort schools by probability
  const sortedSchools = predictions.results
    ? [...predictions.results].sort((a, b) => b.probability - a.probability)
    : [];

  // Categorize schools
  const categories = {
    safe: sortedSchools.filter(s => s.probability >= 80),
    competitive: sortedSchools.filter(s => s.probability >= 50 && s.probability < 80),
    dream: sortedSchools.filter(s => s.probability < 50)
  };

  // Generate risk analysis
  const riskAnalysis = generateRiskAnalysis(sortedSchools, predictions.aggregate);

  // Generate recommendations
  const recommendations = generateRecommendations(categories, riskAnalysis);

  // Generate parent summary
  const parentSummary = generateParentSummary(predictions, categories, riskAnalysis);

  return {
    reference: reference,
    userId: userId,
    studentData: {
      aggregate: predictions.aggregate,
      course: predictions.course,
      grades: predictions.grades,
      selectedSchools: predictions.selectedSchools
    },
    schoolRanking: sortedSchools.map((school, index) => ({
      rank: index + 1,
      schoolName: school.schoolName,
      probability: school.probability,
      matchType: school.matchType,
      category: getSchoolCategory(school.probability)
    })),
    categories: {
      safe: categories.safe.map(s => ({
        schoolName: s.schoolName,
        probability: s.probability,
        recommendation: 'Safe choice - high probability of placement'
      })),
      competitive: categories.competitive.map(s => ({
        schoolName: s.schoolName,
        probability: s.probability,
        recommendation: 'Competitive - good probability but not guaranteed'
      })),
      dream: categories.dream.map(s => ({
        schoolName: s.schoolName,
        probability: s.probability,
        recommendation: 'Dream school - lower probability, consider as stretch goal'
      }))
    },
    riskAnalysis: riskAnalysis,
    recommendations: recommendations,
    parentSummary: parentSummary,
    metadata: {
      generatedAt: now.toISOString(),
      generatedFor: `BECE ${now.getFullYear()}`,
      dataBasedOn: 'Historical WAEC/GES placement data (2019-2023)',
      disclaimer: 'This report is based on historical data and should be used as guidance. Actual placement depends on WAEC/GES decisions.'
    },
    status: 'pending'
  };
}

function getSchoolCategory(probability: number): string {
  if (probability >= 80) return 'safe';
  if (probability >= 50) return 'competitive';
  return 'dream';
}

function generateRiskAnalysis(schools: any[], aggregate: number): any {
  const totalSchools = schools.length;
  const highProbability = schools.filter(s => s.probability >= 70).length;
  const lowProbability = schools.filter(s => s.probability < 30).length;
  
  let riskLevel = 'low';
  if (highProbability === 0) riskLevel = 'high';
  else if (highProbability < 2) riskLevel = 'medium';

  return {
    overallRisk: riskLevel,
    highProbabilityCount: highProbability,
    lowProbabilityCount: lowProbability,
    averageProbability: schools.reduce((acc, s) => acc + s.probability, 0) / totalSchools,
    aggregateStrength: aggregate <= 10 ? 'excellent' : aggregate <= 15 ? 'very good' : aggregate <= 24 ? 'good' : 'fair',
    recommendations: [
      riskLevel === 'high' ? 'Consider adding more safe options to your school list' : null,
      lowProbability > totalSchools / 2 ? 'Too many dream schools - consider more competitive options' : null,
      highProbability > 0 ? 'You have strong backup options - good strategy' : null
    ].filter(Boolean)
  };
}

function generateRecommendations(categories: any, riskAnalysis: any): string[] {
  const recommendations: string[] = [];

  // Safe schools recommendations
  if (categories.safe.length > 0) {
    recommendations.push(`Your top safe choice is ${categories.safe[0].schoolName} with ${categories.safe[0].probability}% probability`);
  }

  // Competitive schools recommendations
  if (categories.competitive.length > 0) {
    recommendations.push(`Consider ${categories.competitive[0].schoolName} as a strong competitive option`);
  }

  // Risk-based recommendations
  if (riskAnalysis.overallRisk === 'high') {
    recommendations.push('Your school selection carries high risk. Add at least 2-3 more safe options');
  }

  // Aggregate-based recommendations
  if (riskAnalysis.aggregateStrength === 'excellent') {
    recommendations.push('Your excellent aggregate gives you strong placement options across categories');
  } else if (riskAnalysis.aggregateStrength === 'fair') {
    recommendations.push('Focus on safe schools to maximize placement chances');
  }

  return recommendations;
}

function generateParentSummary(predictions: any, categories: any, riskAnalysis: any): string {
  const aggregate = predictions.aggregate;
  const course = predictions.course;
  const safeCount = categories.safe.length;
  const competitiveCount = categories.competitive.length;
  const dreamCount = categories.dream.length;

  return `
Your child has an aggregate score of ${aggregate} in ${course} course.
Based on our analysis of 5 years of historical placement data:

• Strong placement options: ${safeCount} safe schools (${safeCount > 0 ? categories.safe[0].schoolName : 'None'})
• Competitive options: ${competitiveCount} schools
• Stretch goals: ${dreamCount} dream schools

Overall risk level: ${riskAnalysis.overallRisk.toUpperCase()}

${riskAnalysis.overallRisk === 'high' 
  ? 'We recommend adding more safe schools to the selection list for better placement assurance.'
  : 'Your child\'s school selection strategy is well-balanced with good backup options.'}

This analysis is based on historical data and should be used as guidance. Actual placement decisions are made by WAEC/GES.
  `.trim();
}

async function validateProductEntitlement(userId: string, productId: string): Promise<boolean> {
  const db = getDatabase();
  const userRef = ref(db, `users/${userId}`);
  const userSnapshot = await get(userRef);

  if (!userSnapshot.exists()) {
    return false;
  }

  const userData = userSnapshot.val();
  const userProductId = userData.premiumProductId;

  const bundleProducts = {
    'bundle_complete': ['premium_report', 'early_alert'],
    'bundle_full': ['premium_report', 'early_alert']
  };

  if (userProductId === productId) {
    return true;
  }

  if (userProductId === 'bundle_complete' || userProductId === 'bundle_full') {
    const includedProducts = bundleProducts[userProductId as keyof typeof bundleProducts];
    return includedProducts.includes(productId);
  }

  return false;
}
