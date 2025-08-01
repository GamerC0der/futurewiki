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

export interface DictionaryResult {
  word: string;
  partOfSpeech: string;
  definitions: string[];
  etymology: string;
  pronunciation: string;
  examples: string[];
}

export async function searchWikipedia(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }
  
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(query)}&srlimit=15&origin=*`;
    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      console.error('Wikipedia search failed:', searchResponse.status, searchResponse.statusText);
      return [];
    }
    
    const searchData = await searchResponse.json();
  
    if (!searchData.query?.search?.length) {
      return [];
    }
  
    const results = searchData.query.search;
    if (!Array.isArray(results) || results.length === 0) {
      return [];
    }
    
    const pageIds = results.map((r: any) => r.pageid).filter((id: any) => id != null).join('|');
    
    if (!pageIds) {
      return [];
    }
    
    const summaryUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts|pageimages&exintro=true&explaintext=true&piprop=thumbnail&pithumbsize=200&pageids=${pageIds}&origin=*`;
    const summaryResponse = await fetch(summaryUrl);
  
    if (!summaryResponse.ok) {
      console.error('Wikipedia summary failed:', summaryResponse.status, summaryResponse.statusText);
      return [];
    }
  
    const summaryData = await summaryResponse.json();
  
    return results.map((result: any) => {
      if (!result || !result.pageid || !result.title) {
        return null;
      }
      
      const pageData = summaryData.query?.pages?.[result.pageid];
      const extract = pageData?.extract || '';
      const thumbnail = pageData?.thumbnail?.source || null;
    
      return {
        id: result.pageid,
        title: result.title,
        description: cleanDescription(extract || result.snippet || ''),
        thumbnail
      };
    }).filter((result): result is SearchResult => result !== null);
  } catch (error) {
    console.error('Wikipedia search error:', error);
    return [];
  }
}

function cleanDescription(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
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
  if (!query || query.trim().length === 0) {
    return [];
  }
  
  try {
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(query)}&srlimit=8&srnamespace=6&origin=*`;
    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      console.error('Wikimedia images search failed:', searchResponse.status, searchResponse.statusText);
      return [];
    }
    
    const searchData = await searchResponse.json();
  
    if (!searchData.query?.search?.length) {
      return [];
    }
  
    const results = searchData.query.search;
    if (!Array.isArray(results) || results.length === 0) {
      return [];
    }
    
    const pageIds = results.map((r: any) => r.pageid).filter((id: any) => id != null).join('|');
    
    if (!pageIds) {
      return [];
    }
    
    const imageUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo|extracts&iiprop=url|size|mime|extmetadata&exintro=true&explaintext=true&pageids=${pageIds}&origin=*`;
    const imageResponse = await fetch(imageUrl);
  
    if (!imageResponse.ok) {
      console.error('Wikimedia image details failed:', imageResponse.status, imageResponse.statusText);
      return [];
    }
  
    const imageData = await imageResponse.json();
  
    return results.map((result: any) => {
      if (!result || !result.pageid || !result.title) {
        return null;
      }
      
      const pageData = imageData.query?.pages?.[result.pageid];
      const imageInfo = pageData?.imageinfo?.[0];
      const extract = pageData?.extract || '';
      
      if (!imageInfo?.url) {
        return null;
      }
    
      return {
        id: result.pageid.toString(),
        title: result.title.replace('File:', '').replace(/\.(jpg|jpeg|png|gif|svg|webp)$/i, ''),
        description: cleanDescription(extract || result.snippet || ''),
        imageUrl: imageInfo.url,
        author: imageInfo?.extmetadata?.Artist?.value || 'Unknown',
        license: imageInfo?.extmetadata?.License?.value || 'Unknown'
      };
    }).filter((result): result is ImageSearchResult => result !== null);
  } catch (error) {
    console.error('Wikimedia images search error:', error);
    return [];
  }
} 

export async function searchWiktionary(word: string): Promise<DictionaryResult[]> {
  if (!word || word.trim().length === 0) {
    return [];
  }
  
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    
    if (!response.ok) {
      console.warn(`Dictionary API returned ${response.status} for word: ${word}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    return data.map((entry: any) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      
      const definitions: string[] = [];
      const examples: string[] = [];
      let etymology = '';
      let pronunciation = '';
      let partOfSpeech = '';
      
      if (entry.meanings && Array.isArray(entry.meanings) && entry.meanings.length > 0) {
        entry.meanings.forEach((meaning: any) => {
          if (meaning && typeof meaning === 'object') {
            if (meaning.partOfSpeech) {
              partOfSpeech = meaning.partOfSpeech;
            }
          
            if (meaning.definitions && Array.isArray(meaning.definitions) && meaning.definitions.length > 0) {
              meaning.definitions.forEach((def: any) => {
                if (def && typeof def === 'object') {
                  if (def.definition && typeof def.definition === 'string') {
                    definitions.push(def.definition);
                  }
                  if (def.example && typeof def.example === 'string') {
                    examples.push(def.example);
                  }
                }
              });
            }
          }
        });
      }
      
      if (entry.phonetics && Array.isArray(entry.phonetics) && entry.phonetics.length > 0) {
        const phonetic = entry.phonetics.find((p: any) => p && p.text);
        if (phonetic && phonetic.text) {
          pronunciation = phonetic.text;
        }
      }
      
      if (entry.etymologies && Array.isArray(entry.etymologies) && entry.etymologies.length > 0) {
        etymology = entry.etymologies[0] || '';
      }
      
      return {
        word: entry.word || word,
        partOfSpeech: partOfSpeech || 'Unknown',
        definitions,
        etymology: etymology || 'No etymology available',
        pronunciation: pronunciation || 'No pronunciation available',
        examples
      };
    }).filter((result): result is DictionaryResult => result !== null);
  } catch (error) {
    console.error('Wiktionary search error:', error);
    return [];
  }
}

export function parseAIResponse(responseJson: any): {thinking: string; response: string } {
  if (!responseJson || typeof responseJson !== 'object') {
    return { thinking: '', response: '' };
  }
  
  const content = responseJson.choices?.[0]?.message?.content || '';
  
  if (typeof content !== 'string') {
    return { thinking: '', response: '' };
  }
  
  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
  const thinking = thinkMatch ? thinkMatch[1].trim() : '';

  const response = content.replace(/<think>([\s\S]*?)<\/think>/, '').trim();

  return { thinking, response };
}