export function parseWikipediaContent(apiResponse: any): string {
    try {
        if (!apiResponse || typeof apiResponse !== 'object') {
            return '';
        }
        
        const pages = apiResponse.query?.pages;
        if (!pages || typeof pages !== 'object') {
            return '';
        }
        
        const pageIds = Object.keys(pages);
        if (pageIds.length === 0) {
            return '';
        }
        
        const pageId = pageIds[0];
        const page = pages[pageId];
        
        if (!page || typeof page !== 'object') {
            return '';
        }
        
        if (!page.revisions || !Array.isArray(page.revisions) || page.revisions.length === 0) {
            return '';
        }
        
        const revision = page.revisions[0];
        if (!revision || typeof revision !== 'object') {
            return '';
        }
        
        const htmlContent = revision['*'];
        if (!htmlContent || typeof htmlContent !== 'string') {
            return '';
        }
        
        return htmlContent;
    } catch (error) {
        console.error('Error parsing Wikipedia content:', error);
        return '';
    }
}

export function extractTextFromHTML(html: string): string {
    if (!html || typeof html !== 'string') {
        return '';
    }
    
    try {
        if (typeof document === 'undefined') {
            return html.replace(/<[^>]*>/g, '');
        }
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    } catch (error) {
        console.error('Error extracting text from HTML:', error);
        return html.replace(/<[^>]*>/g, '');
    }
}
