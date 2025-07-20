export function parseWikipediaContent(apiResponse: any): string {
    try {
        const pages = apiResponse.query?.pages;
        if (!pages) return '';
        
        const pageId = Object.keys(pages)[0];
        const page = pages[pageId];
        
        if (!page.revisions || !page.revisions[0]) return '';
        
        const htmlContent = page.revisions[0]['*'];
        if (!htmlContent) return '';
        
        return htmlContent;
    } catch (error) {
        console.error('Error parsing Wikipedia content:', error);
        return '';
    }
}

export function extractTextFromHTML(html: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
}
