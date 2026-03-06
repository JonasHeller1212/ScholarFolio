import { ApiError } from '../../utils/api';
import type { Author, Publication, Topic, Metrics } from '../../types/scholar';
import { metricsCalculator } from '../scholar/metrics';

const SEMANTIC_SCHOLAR_API = 'https://api.semanticscholar.org/graph/v1';

export class SemanticScholarService {
  private readonly headers = {
    'Accept': 'application/json',
    'User-Agent': 'ResearchPortfolio/1.0',
  };

  public async searchByGoogleScholarId(googleScholarId: string): Promise<any> {
    try {
      const response = await fetch(
        `${SEMANTIC_SCHOLAR_API}/author/search?query=scholarid:${encodeURIComponent(googleScholarId)}&limit=1`,
        { headers: this.headers }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format');
      }
      
      return data;
    } catch (error) {
      console.error('[SemanticScholar] Search error:', error);
      throw new ApiError(
        'Failed to find author. Please try using a Semantic Scholar URL instead.',
        'SEARCH_ERROR'
      );
    }
  }

  public async getAuthorProfile(authorId: string): Promise<Author> {
    try {
      // Fetch author details with papers and citation counts
      const fields = [
        'name',
        'affiliations',
        'papers.title',
        'papers.year',
        'papers.citationCount',
        'papers.authors',
        'papers.url',
        'papers.venue',
        'papers.abstract',
        'papers.fieldsOfStudy',
        'papers.publicationTypes',
        'citationCount',
        'hIndex'
      ].join(',');

      const response = await fetch(
        `${SEMANTIC_SCHOLAR_API}/author/${authorId}?fields=${fields}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new ApiError('Author not found', 'NOT_FOUND');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.papers || !Array.isArray(data.papers)) {
        throw new Error('Invalid response format');
      }

      // Transform papers data
      const publications: Publication[] = data.papers
        .filter((paper: any) => paper.title && paper.year) // Filter out invalid papers
        .map((paper: any) => ({
          title: paper.title,
          authors: paper.authors?.map((author: any) => author.name) || [],
          venue: paper.venue || '',
          year: paper.year,
          citations: paper.citationCount || 0,
          url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
        }))
        .sort((a: Publication, b: Publication) => b.year - a.year);

      // Extract topics from fields of study
      const topics: Topic[] = this.extractTopics(data.papers);

      // Calculate citation metrics
      const totalCitations = data.citationCount || 
        publications.reduce((sum, pub) => sum + pub.citations, 0);

      const hIndex = data.hIndex || 
        this.calculateHIndex(publications.map(p => p.citations));

      // Build citations per year map
      const citationsPerYear: Record<string, number> = {};
      publications.forEach(pub => {
        citationsPerYear[pub.year] = (citationsPerYear[pub.year] || 0) + pub.citations;
      });

      // Calculate additional metrics
      const metrics = metricsCalculator.calculateMetrics(publications, citationsPerYear, data.name);

      return {
        name: data.name,
        affiliation: data.affiliations?.[0] || 'Unknown Affiliation',
        topics,
        hIndex,
        totalCitations,
        publications,
        metrics
      };
    } catch (error) {
      console.error('[SemanticScholar] Profile fetch error:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        'Failed to fetch author profile. Please try again.',
        'PROFILE_ERROR'
      );
    }
  }

  private extractTopics(papers: any[]): Topic[] {
    // Create a map to count field occurrences
    const fieldCounts = new Map<string, number>();
    
    papers.forEach(paper => {
      if (paper.fieldsOfStudy && Array.isArray(paper.fieldsOfStudy)) {
        paper.fieldsOfStudy.forEach((field: string) => {
          fieldCounts.set(field, (fieldCounts.get(field) || 0) + 1);
        });
      }
    });

    // Convert to array and sort by count
    return Array.from(fieldCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // Take top 10 topics
      .map(([name, count]) => ({
        name,
        url: `https://www.semanticscholar.org/topic/${encodeURIComponent(name)}`,
        paperCount: count
      }));
  }

  private calculateHIndex(citations: number[]): number {
    const sortedCitations = [...citations].sort((a, b) => b - a);
    let hIndex = 0;
    
    for (let i = 0; i < sortedCitations.length; i++) {
      if (sortedCitations[i] >= i + 1) {
        hIndex = i + 1;
      } else {
        break;
      }
    }
    
    return hIndex;
  }
}

export const semanticScholarService = new SemanticScholarService();