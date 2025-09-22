interface IGDBGame {
  id: number;
  name: string;
  summary?: string;
  cover?: {
    id: number;
    url: string;
  };
  first_release_date?: number;
  rating?: number;
  platforms?: Array<{
    id: number;
    name: string;
  }>;
  genres?: Array<{
    id: number;
    name: string;
  }>;
  screenshots?: Array<{
    id: number;
    url: string;
  }>;
}

interface IGDBAuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

class IGDBClient {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  private async authenticate(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const clientId = process.env.IGDB_CLIENT_ID;
    const clientSecret = process.env.IGDB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('IGDB credentials not configured');
    }

    const response = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`IGDB authentication failed: ${response.status}`);
    }

    const data: IGDBAuthResponse = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 minute early

    return this.accessToken;
  }

  private async makeRequest(endpoint: string, query: string): Promise<any> {
    const token = await this.authenticate();
    const clientId = process.env.IGDB_CLIENT_ID;

    const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Client-ID': clientId!,
        'Authorization': `Bearer ${token}`,
      },
      body: query,
    });

    if (!response.ok) {
      throw new Error(`IGDB API error: ${response.status}`);
    }

    return response.json();
  }

  async searchGames(query: string, limit: number = 20): Promise<IGDBGame[]> {
    // Try multiple search approaches to maximize results
    const searchApproaches = [
      // Approach 1: Full text search without category filter  
      `search "${query}"; fields name, summary, cover.url, first_release_date, rating, platforms.name, genres.name, screenshots.url; limit ${limit};`,
      
      // Approach 2: Full text search with category filter
      `search "${query}"; fields name, summary, cover.url, first_release_date, rating, platforms.name, genres.name, screenshots.url; where category = 0; limit ${limit};`,
      
      // Approach 3: Case-insensitive name matching without category
      `fields name, summary, cover.url, first_release_date, rating, platforms.name, genres.name, screenshots.url; where name ~= "${query}"; limit ${limit};`,
      
      // Approach 4: Partial name matching without category
      `fields name, summary, cover.url, first_release_date, rating, platforms.name, genres.name, screenshots.url; where name ~ *"${query}"*; sort rating desc; limit ${limit};`
    ];

    for (let i = 0; i < searchApproaches.length; i++) {
      try {
        console.log(`IGDB trying approach ${i + 1} for "${query}"`);
        const results = await this.makeRequest('games', searchApproaches[i]);
        if (results.length > 0) {
          console.log(`IGDB search approach ${i + 1} found ${results.length} results for "${query}"`);
          return results;
        }
      } catch (error) {
        console.warn(`IGDB search approach ${i + 1} failed for "${query}":`, error);
      }
    }

    // If no full-phrase results, try individual words without category filter
    const words = query.toLowerCase().split(' ').filter(word => word.length > 2);
    for (const word of words) {
      try {
        console.log(`IGDB trying word search for: "${word}"`);
        const wordQuery = `fields name, summary, cover.url, first_release_date, rating, platforms.name, genres.name, screenshots.url; where name ~ *"${word}"*; sort rating desc; limit ${limit};`;
        const wordResults = await this.makeRequest('games', wordQuery);
        
        if (wordResults.length > 0) {
          console.log(`IGDB word search for "${word}" found ${wordResults.length} results`);
          
          // Filter to prefer games containing multiple query words
          const filteredResults = wordResults.filter(game => 
            words.filter(w => game.name.toLowerCase().includes(w)).length >= Math.min(2, words.length)
          );
          
          return filteredResults.length > 0 ? filteredResults : wordResults.slice(0, limit);
        }
      } catch (error) {
        console.warn(`IGDB word search failed for "${word}":`, error);
      }
    }

    console.log(`IGDB search found no results for "${query}"`);
    return [];
  }

  async getGameById(id: number): Promise<IGDBGame | null> {
    const igdbQuery = `
      fields name, summary, cover.url, first_release_date, rating, platforms.name, genres.name, screenshots.url;
      where id = ${id};
    `;

    const results = await this.makeRequest('games', igdbQuery);
    return results.length > 0 ? results[0] : null;
  }

  async getPopularGames(limit: number = 20): Promise<IGDBGame[]> {
    const igdbQuery = `
      fields name, summary, cover.url, first_release_date, rating, platforms.name, genres.name, screenshots.url;
      where rating > 80 & rating_count > 10;
      sort rating desc;
      limit ${limit};
    `;

    return this.makeRequest('games', igdbQuery);
  }

  async getRecentReleases(limit: number = 20): Promise<IGDBGame[]> {
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    const now = Math.floor(Date.now() / 1000);

    const igdbQuery = `
      fields name, summary, cover.url, first_release_date, rating, platforms.name, genres.name, screenshots.url;
      where first_release_date >= ${thirtyDaysAgo} & first_release_date <= ${now};
      sort first_release_date desc;
      limit ${limit};
    `;

    return this.makeRequest('games', igdbQuery);
  }

  async getUpcomingReleases(limit: number = 20): Promise<IGDBGame[]> {
    const now = Math.floor(Date.now() / 1000);
    const sixMonthsFromNow = Math.floor((Date.now() + 6 * 30 * 24 * 60 * 60 * 1000) / 1000);

    const igdbQuery = `
      fields name, summary, cover.url, first_release_date, rating, platforms.name, genres.name, screenshots.url;
      where first_release_date >= ${now} & first_release_date <= ${sixMonthsFromNow};
      sort first_release_date asc;
      limit ${limit};
    `;

    return this.makeRequest('games', igdbQuery);
  }

  formatGameData(igdbGame: IGDBGame): any {
    return {
      id: `igdb-${igdbGame.id}`,
      igdbId: igdbGame.id,
      title: igdbGame.name,
      summary: igdbGame.summary || '',
      coverUrl: igdbGame.cover?.url ? `https:${igdbGame.cover.url.replace('t_thumb', 't_cover_big')}` : '',
      releaseDate: igdbGame.first_release_date 
        ? new Date(igdbGame.first_release_date * 1000).toISOString().split('T')[0]
        : '',
      rating: igdbGame.rating ? Math.round(igdbGame.rating) / 10 : 0,
      platforms: igdbGame.platforms?.map(p => p.name) || [],
      genres: igdbGame.genres?.map(g => g.name) || [],
      screenshots: igdbGame.screenshots?.map(s => `https:${s.url.replace('t_thumb', 't_screenshot_big')}`) || [],
      status: 'wanted' as const,
    };
  }
}

export const igdbClient = new IGDBClient();