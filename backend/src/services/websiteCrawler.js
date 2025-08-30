import * as cheerio from 'cheerio';
import { htmlToText } from 'html-to-text';
import logger from '../config/logger.js';
import { emitProgress, emitDone } from './progress.js';

class WebsiteCrawler {
    constructor() {
        this.visitedUrls = new Set();
        this.queue = [];
        this.maxPages = 50; // Limit to prevent infinite crawling
        this.delayMs = 1000; // 1 second delay between requests
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    }

    async crawlWebsite(baseUrl, opId) {
        try {
            logger.info(`Starting recursive crawl of: ${baseUrl}`);
            emitProgress?.(opId, `Starting recursive crawl of: ${baseUrl}`);

            // Normalize base URL
            const baseUrlObj = new URL(baseUrl);
            const baseDomain = baseUrlObj.hostname;

            // Check robots.txt
            await this.checkRobotsTxt(baseUrl, opId);

            // Start with the base URL
            this.queue.push(baseUrl);
            this.visitedUrls.add(baseUrl);

            const allPages = [];
            let pageCount = 0;

            while (this.queue.length > 0 && pageCount < this.maxPages) {
                const currentUrl = this.queue.shift();

                try {
                    emitProgress?.(opId, `Crawling page ${pageCount + 1}/${this.maxPages}: ${currentUrl}`);

                    const pageData = await this.fetchAndProcessPage(currentUrl, opId);
                    if (pageData) {
                        allPages.push(pageData);
                        pageCount++;

                        // Discover new links
                        const newLinks = this.extractInternalLinks(pageData.html, baseDomain);
                        for (const link of newLinks) {
                            if (!this.visitedUrls.has(link) && this.queue.length < this.maxPages) {
                                this.queue.push(link);
                                this.visitedUrls.add(link);
                            }
                        }
                    }

                    // Rate limiting
                    if (this.queue.length > 0) {
                        await this.delay(this.delayMs);
                    }

                } catch (error) {
                    logger.warn(`Failed to crawl ${currentUrl}: ${error.message}`);
                    emitProgress?.(opId, `Skipped ${currentUrl}: ${error.message}`);
                }
            }

            emitProgress?.(opId, `Crawl complete. Processed ${pageCount} pages.`);
            logger.info(`Crawl complete. Processed ${pageCount} pages from ${baseUrl}`);

            return {
                success: true,
                pagesProcessed: pageCount,
                totalUrls: this.visitedUrls.size,
                pages: allPages
            };

        } catch (error) {
            logger.error(`Error during website crawl: ${error.message}`);
            emitProgress?.(opId, `Crawl failed: ${error.message}`);
            throw error;
        }
    }

    async checkRobotsTxt(baseUrl, opId) {
        try {
            const robotsUrl = new URL('/robots.txt', baseUrl).href;
            emitProgress?.(opId, 'Checking robots.txt...');

            const response = await fetch(robotsUrl, {
                headers: { 'User-Agent': this.userAgent },
                signal: AbortSignal.timeout(5000)
            });

            if (response.ok) {
                const robotsText = await response.text();
                // Basic robots.txt parsing - could be enhanced
                if (robotsText.toLowerCase().includes('disallow: /')) {
                    logger.warn('robots.txt disallows crawling');
                    emitProgress?.(opId, 'Warning: robots.txt disallows crawling');
                }
            }
        } catch (error) {
            logger.debug('Could not fetch robots.txt:', error.message);
        }
    }

    async fetchAndProcessPage(url, opId) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(url, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                },
                signal: controller.signal,
            });
            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();

            // Load and clean DOM
            const $ = cheerio.load(html);
            $('script, style, nav, footer, header, iframe, noscript, svg, .ad, .ads, .advertisement').remove();

            // Prefer main/article, fallback to body
            const mainHtml = $('main').html() || $('article').html() || $('body').html() || '';

            // Convert HTML to plain text
            const textContent = htmlToText(mainHtml, {
                wordwrap: false,
                selectors: [
                    { selector: 'a', options: { ignoreHref: true } },
                    { selector: 'img', format: 'skip' },
                ],
            });

            // Extract title
            const title = $('title').text().trim() || 'Untitled Document';

            return {
                url,
                title,
                html: mainHtml,
                textContent,
                links: this.extractAllLinks($)
            };

        } catch (error) {
            logger.warn(`Failed to fetch ${url}: ${error.message}`);
            return null;
        }
    }

    extractInternalLinks(html, baseDomain) {
        const $ = cheerio.load(html);
        const links = new Set();

        $('a[href]').each((_, element) => {
            const href = $(element).attr('href');
            if (!href) return;

            try {
                // Handle relative URLs
                let fullUrl;
                if (href.startsWith('http')) {
                    fullUrl = href;
                } else if (href.startsWith('/')) {
                    fullUrl = `https://${baseDomain}${href}`;
                } else {
                    fullUrl = `https://${baseDomain}/${href}`;
                }

                const urlObj = new URL(fullUrl);

                // Only include links from the same domain
                if (urlObj.hostname === baseDomain) {
                    // Clean URL (remove fragments, query params for deduplication)
                    const cleanUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
                    links.add(cleanUrl);
                }
            } catch (error) {
                // Skip invalid URLs
                logger.debug(`Invalid URL: ${href}`);
            }
        });

        return Array.from(links);
    }

    extractAllLinks($) {
        const links = [];
        $('a[href]').each((_, element) => {
            const href = $(element).attr('href');
            const text = $(element).text().trim();
            if (href && text) {
                links.push({ href, text });
            }
        });
        return links;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default new WebsiteCrawler(); 