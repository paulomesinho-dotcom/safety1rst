import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';

// Define the structure of the data returned by the scanner
export interface ExtractedData {
    date?: string;
    text?: string;
    confidence: number;
    rawText?: string;
}

// Set the worker source for PDF.js (v5.x compatible)
if (typeof window !== 'undefined' && 'Worker' in window) {
    const version = '5.4.624'; // Match package.json version
    console.log(`[AI Scanner] Configuring PDF.js worker for version: ${version}`);
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
}

/**
 * Scans a document (PDF, Word, or Image) and extracts information based on the requested type.
 * Uses PDF.js for PDFs, Mammoth for Word docs, and regex patterns for analysis.
 */
export const scanDocument = async (
    file: File,
    type: 'date' | 'text' | 'any',
    contextKeywords: string[] = []
): Promise<ExtractedData> => {
    console.log(`[AI Scanner] Starting analysis for ${file.name} (Type: ${type}, MIME: ${file.type})...`);

    // 1. Extract Text
    let textContent = '';

    try {
        if (file.type === 'application/pdf') {
            console.log('[AI Scanner] Detected PDF file, extracting text...');
            textContent = await extractTextFromPDF(file);
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            console.log('[AI Scanner] Detected Word file, extracting text...');
            textContent = await extractTextFromDocx(file);
        } else if (file.type.startsWith('image/')) {
            console.warn('[AI Scanner] Image OCR not implemented. Using filename analysis.');
            textContent = file.name;
        } else {
            console.warn('[AI Scanner] Unsupported file type. Using filename analysis.');
            textContent = file.name;
        }
    } catch (e) {
        console.error('[AI Scanner] Text extraction failed:', e);
        return { confidence: 0 };
    }

    console.log(`[AI Scanner] Extracted Text Length: ${textContent.length} characters`);
    if (textContent.length > 0) {
        console.log(`[AI Scanner] Text Preview: ${textContent.substring(0, 200)}...`);
    }

    // 2. Analyze Text based on Type
    return analyzeText(textContent, type, contextKeywords);
};

const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        console.log(`[AI Scanner] PDF ArrayBuffer size: ${arrayBuffer.byteLength} bytes`);

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        console.log(`[AI Scanner] PDF loaded successfully. Pages: ${pdf.numPages}`);

        let fullText = '';
        const maxPages = Math.min(pdf.numPages, 3);

        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                // @ts-ignore
                .map((item: any) => item.str)
                .join(' ');
            fullText += pageText + '\n';
            console.log(`[AI Scanner] Extracted ${pageText.length} chars from page ${i}`);
        }

        return fullText;
    } catch (error) {
        console.error('[AI Scanner] PDF extraction error:', error);
        throw error;
    }
};

const extractTextFromDocx = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        console.log(`[AI Scanner] DOCX ArrayBuffer size: ${arrayBuffer.byteLength} bytes`);

        const result = await mammoth.extractRawText({ arrayBuffer });
        console.log(`[AI Scanner] DOCX extracted ${result.value.length} characters`);

        return result.value;
    } catch (error) {
        console.error('[AI Scanner] DOCX extraction error:', error);
        throw error;
    }
};

const analyzeText = (text: string, type: 'date' | 'text' | 'any', keywords: string[]): ExtractedData => {
    console.log(`[AI Scanner] Analyzing text for type: ${type}`);

    // Normalization
    const cleanText = text.replace(/\s+/g, ' ');

    let result: ExtractedData = { confidence: 0, rawText: text.substring(0, 100) + '...' };

    if (type === 'date') {
        // Regex for DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
        const dateRegex = /\b(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})\b|\b(\d{4})[\/\-\.](\d{2})[\/\-\.](\d{2})\b/g;

        const matches = Array.from(cleanText.matchAll(dateRegex));
        console.log(`[AI Scanner] Found ${matches.length} date patterns`);

        if (matches.length > 0) {
            let bestDate = '';
            let maxScore = -1;

            matches.forEach(match => {
                const dateStr = match[0];
                let dateObj: Date | null = null;

                // Parse date
                if (match[1]) { // DD/MM/YYYY
                    dateObj = new Date(`${match[3]}-${match[2]}-${match[1]}`);
                } else if (match[4]) { // YYYY-MM-DD
                    dateObj = new Date(`${match[4]}-${match[5]}-${match[6]}`);
                }

                if (!dateObj || isNaN(dateObj.getTime())) return;

                let score = 0;

                // Context Check
                const index = match.index || 0;
                const windowStart = Math.max(0, index - 50);
                const windowEnd = Math.min(cleanText.length, index + 50);
                const windowText = cleanText.substring(windowStart, windowEnd).toLowerCase();

                if (windowText.includes('valid') || windowText.includes('expir') || windowText.includes('até') || windowText.includes('vigência') || windowText.includes('fim')) {
                    score += 50;
                }

                // Future preference
                if (dateObj > new Date()) {
                    score += 20;
                }

                // Sanity check
                const year = dateObj.getFullYear();
                if (year >= 2020 && year <= 2035) {
                    score += 10;
                } else {
                    score -= 50;
                }

                console.log(`[AI Scanner] Date candidate: ${dateStr} -> ${dateObj.toISOString().split('T')[0]} (score: ${score})`);

                if (score > maxScore) {
                    maxScore = score;
                    bestDate = dateObj.toISOString().split('T')[0];
                }
            });

            if (bestDate && maxScore > 0) {
                result.date = bestDate;
                result.confidence = Math.min(0.5 + (maxScore / 100), 0.95);
                console.log(`[AI Scanner] Best date found: ${bestDate} (confidence: ${result.confidence})`);
            }
        }
    } else if (type === 'text') {
        // Policy number extraction
        const policyRegex = /(?:apólice|policy|ref|nº|n\.º)\.?\s*[:\-\#]?\s*([A-Za-z0-9\-\/]{3,20})/i;
        const match = cleanText.match(policyRegex);

        if (match && match[1]) {
            result.text = match[1];
            result.confidence = 0.85;
            console.log(`[AI Scanner] Policy number found: ${result.text}`);
        } else {
            console.log('[AI Scanner] No policy number pattern matched');
        }
    }

    return result;
};
