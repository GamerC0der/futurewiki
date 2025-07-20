export interface SearchResult {
  id: number;
  title: string;
  description: string;
  thumbnail: string | null;
}

export interface ImageSearchResult {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  author: string;
  license: string;
}

export async function searchWikipedia(query: string): Promise<SearchResult[]> {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(query)}&srlimit=8&origin=*`;
  const searchResponse = await fetch(searchUrl);
  const searchData = await searchResponse.json();
  
  if (!searchData.query?.search?.length) {
    return [];
  }
  
  const results = searchData.query.search;
  const pageIds = results.map((r: any) => r.pageid).join('|');
  
  const summaryUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts|pageimages&exintro=true&explaintext=true&piprop=thumbnail&pithumbsize=200&pageids=${pageIds}&origin=*`;
  const summaryResponse = await fetch(summaryUrl);
  const summaryData = await summaryResponse.json();
  
  return results.map((result: any) => {
    const pageData = summaryData.query?.pages?.[result.pageid];
    const extract = pageData?.extract || '';
    const thumbnail = pageData?.thumbnail?.source || null;
    
    return {
      id: result.pageid,
      title: result.title,
      description: cleanDescription(extract || result.snippet || ''),
      thumbnail
    };
  });
}

function cleanDescription(text: string): string {
  const technicalPatterns = [
    /Temporal range:.*?Ma/gi,
    /PreꞒꞒOSDCPTJKPgN.*?↓/gi,
    /Holocene to present.*?ago\)/gi,
    /Conservation status.*?Domesticated/gi,
    /Scientific classification.*?Binomial name/gi,
    /Kingdom:.*?Species:.*?\[1\]/gi,
    /Binomial name.*?Linnaeus.*?\[2\]/gi,
    /Synonyms.*?\[3\]/gi,
    /F\. angorensis.*?F\. vulgaris.*?1829/gi
  ];
  
  let cleaned = text;
  
  cleaned = cleaned.replace(/<span class="searchmatch">(.*?)<\/span>/g, '$1');
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  cleaned = cleaned.replace(/By <a[^>]*>([^<]*)<\/a>/g, 'By $1');
  
  technicalPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

export async function searchWikimediaImages(query: string): Promise<ImageSearchResult[]> {
  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(query)}&srlimit=8&srnamespace=6&origin=*`;
  const searchResponse = await fetch(searchUrl);
  const searchData = await searchResponse.json();
  
  if (!searchData.query?.search?.length) {
    return [];
  }
  
  const results = searchData.query.search;
  const pageIds = results.map((r: any) => r.pageid).join('|');
  
  const imageUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo|extracts&iiprop=url|size|mime|extmetadata&exintro=true&explaintext=true&pageids=${pageIds}&origin=*`;
  const imageResponse = await fetch(imageUrl);
  const imageData = await imageResponse.json();
  
  return results.map((result: any) => {
    const pageData = imageData.query?.pages?.[result.pageid];
    const imageInfo = pageData?.imageinfo?.[0];
    const extract = pageData?.extract || '';
    
    return {
      id: result.pageid.toString(),
      title: result.title.replace('File:', '').replace(/\.(jpg|jpeg|png|gif|svg|webp)$/i, ''),
      description: cleanDescription(extract || result.snippet || ''),
      imageUrl: imageInfo?.url || '',
      author: imageInfo?.extmetadata?.Artist?.value || 'Unknown',
      license: imageInfo?.extmetadata?.License?.value || 'Unknown'
    };
  }).filter((result: ImageSearchResult) => result.imageUrl);
} 