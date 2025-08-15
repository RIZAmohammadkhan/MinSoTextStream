/**
 * Trending Algorithm Utilities
 * 
 * This file contains utility functions for calculating trending scores
 * and analyzing content engagement patterns.
 */

export interface TrendingMetrics {
  likes: number;
  comments: number;
  createdAt: Date;
  trendingScore?: number;
  timeDecay?: number;
  wilsonScore?: number;
  engagementBoost?: number;
}

/**
 * Calculate time decay factor for content freshness
 * Uses exponential decay with 24-hour half-life
 */
export function calculateTimeDecay(createdAt: Date, now: Date = new Date()): number {
  const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  return Math.exp(-ageHours / 24);
}

/**
 * Calculate Wilson Score Lower Bound for statistical confidence
 * Provides a more reliable measure of engagement quality
 */
export function calculateWilsonScore(
  positiveVotes: number,
  totalVotes: number,
  confidence: number = 1.96 // 95% confidence interval
): number {
  if (totalVotes === 0) return 0;
  
  const p = positiveVotes / totalVotes;
  const z = confidence;
  const denominator = 1 + z * z / totalVotes;
  
  const numerator = p + z * z / (2 * totalVotes) - z * Math.sqrt(
    (p * (1 - p) + z * z / (4 * totalVotes)) / totalVotes
  );
  
  return numerator / denominator;
}

/**
 * Calculate engagement boost using logarithmic scaling
 * Prevents viral content from completely dominating the feed
 */
export function calculateEngagementBoost(totalEngagement: number): number {
  return Math.log(totalEngagement + 1);
}

/**
 * Calculate complete trending score for a piece of content
 */
export function calculateTrendingScore(metrics: TrendingMetrics): number {
  const { likes, comments, createdAt } = metrics;
  const totalVotes = likes + comments;
  const positiveVotes = likes + (comments * 0.5); // Comments weighted as 0.5x likes
  
  const timeDecay = calculateTimeDecay(createdAt);
  const wilsonScore = calculateWilsonScore(positiveVotes, totalVotes);
  const engagementBoost = calculateEngagementBoost(totalVotes);
  
  // Combined scoring algorithm
  const mainScore = wilsonScore * timeDecay * engagementBoost;
  const baseScore = totalVotes * timeDecay * 0.1;
  
  return mainScore + baseScore;
}

/**
 * Calculate detailed trending metrics for analysis
 */
export function calculateDetailedTrendingMetrics(metrics: TrendingMetrics): Required<TrendingMetrics> {
  const { likes, comments, createdAt } = metrics;
  const totalVotes = likes + comments;
  const positiveVotes = likes + (comments * 0.5);
  
  const timeDecay = calculateTimeDecay(createdAt);
  const wilsonScore = calculateWilsonScore(positiveVotes, totalVotes);
  const engagementBoost = calculateEngagementBoost(totalVotes);
  const trendingScore = calculateTrendingScore(metrics);
  
  return {
    likes,
    comments,
    createdAt,
    timeDecay,
    wilsonScore,
    engagementBoost,
    trendingScore,
  };
}

/**
 * Sort content by trending score
 */
export function sortByTrendingScore<T extends TrendingMetrics>(
  content: T[],
  limit?: number
): T[] {
  const scored = content.map(item => ({
    ...item,
    trendingScore: calculateTrendingScore(item),
  }));
  
  const sorted = scored.sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
  
  return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Analyze trending patterns over time
 */
export interface TrendingAnalysis {
  totalContent: number;
  averageScore: number;
  topScore: number;
  scoreDistribution: {
    high: number; // > 75th percentile
    medium: number; // 25th-75th percentile
    low: number; // < 25th percentile
  };
  freshContentRatio: number; // content < 6 hours old
}

export function analyzeTrendingPatterns(content: TrendingMetrics[]): TrendingAnalysis {
  const scores = content.map(calculateTrendingScore).sort((a, b) => b - a);
  const now = new Date();
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  
  const totalContent = content.length;
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / totalContent;
  const topScore = scores[0] || 0;
  
  // Calculate percentiles for distribution
  const q1Index = Math.floor(totalContent * 0.25);
  const q3Index = Math.floor(totalContent * 0.75);
  const q1Score = scores[q3Index] || 0; // Note: scores are sorted descending
  const q3Score = scores[q1Index] || 0;
  
  const high = scores.filter(score => score >= q3Score).length;
  const low = scores.filter(score => score <= q1Score).length;
  const medium = totalContent - high - low;
  
  const freshContent = content.filter(item => item.createdAt > sixHoursAgo).length;
  const freshContentRatio = freshContent / totalContent;
  
  return {
    totalContent,
    averageScore,
    topScore,
    scoreDistribution: { high, medium, low },
    freshContentRatio,
  };
}
