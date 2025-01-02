const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());

// Base route for verification
app.get('/', (req, res) => {
    res.json({ status: 'Server is running' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString() 
    });
});

// Main news scraping endpoint
app.get('/api/news', async (req, res) => {
    try {
        const { data } = await axios.get('https://odia.krishijagran.com', {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
            }
        });

        if (!data || typeof data !== 'string') {
            throw new Error('Invalid response data received');
        }

        const $ = cheerio.load(data);
        const news = [];

        try {
            // 1. Scrape the top story
            const topStory = $('.row.h-t-20 .top-story');
            if (topStory.length) {
                const topStoryTitle = topStory.find('a').attr('title');
                const topStoryLink = topStory.find('a').attr('href');
                const topStoryImage = topStory.find('img').attr('src');
                
                if (topStoryTitle && topStoryLink) {
                    news.push({ 
                        section: 'top_story',
                        title: topStoryTitle, 
                        link: `https://odia.krishijagran.com${topStoryLink}`, 
                        image: topStoryImage || null
                    });
                }
            }

            // 2. Scrape the news items in the left list
            $('.row.h-t-20 .home-top-news-lst-lft .news-item').each((index, element) => {
                const title = $(element).find('a').attr('title');
                const link = $(element).find('a').attr('href');
                const image = $(element).find('img').attr('src');
                
                if (title && link) {
                    news.push({ 
                        section: 'left_list',
                        title, 
                        link: `https://odia.krishijagran.com${link}`, 
                        image: image || null
                    });
                }
            });

            // 3. Scrape the news items in the right list
            $('.row.h-t-20 .home-top-news-lst-rt .news-item').each((index, element) => {
                const title = $(element).find('a').attr('title');
                const link = $(element).find('a').attr('href');
                const image = $(element).find('img').attr('src');
                
                if (title && link) {
                    news.push({ 
                        section: 'right_list',
                        title, 
                        link: `https://odia.krishijagran.com${link}`, 
                        image: image || null
                    });
                }
            });

            // 4. Scrape the animal husbandry section
            $('.weather-home .h-item').each((index, element) => {
                const title = $(element).find('h2 a').attr('title');
                const link = $(element).find('h2 a').attr('href');
                const image = $(element).find('.img a img').attr('src');
                
                if (title && link) {
                    news.push({ 
                        section: 'animal_husbandry',
                        title, 
                        link: `https://odia.krishijagran.com${link}`, 
                        image: image || null
                    });
                }
            });

            // 5. Scrape the health and lifestyle section
            $('.weather-home .h-title').each((index, element) => {
                const sectionTitle = $(element).find('a').text();
                const sectionLink = $(element).find('a').attr('href');
                const readMoreLink = $(element).find('.btn-link').attr('href');
                const sectionImage = $(element).find('.img img').attr('src');
                
                if (sectionTitle && sectionLink) {
                    news.push({ 
                        section: 'health_lifestyle',
                        title: sectionTitle, 
                        link: `https://odia.krishijagran.com${sectionLink}`, 
                        readMoreLink: readMoreLink ? `https://odia.krishijagran.com${readMoreLink}` : null,
                        image: sectionImage || null
                    });
                }
            });

            // 6. Scrape the category sections
            $('.home-cat .cat-flex').each((index, categoryElement) => {
                const categoryName = $(categoryElement).find('.cat-h a').attr('title');
                
                if (categoryName) {
                    $(categoryElement).find('.list-unstyled li').each((i, article) => {
                        const title = $(article).find('h2 a').attr('title');
                        const link = $(article).find('h2 a').attr('href');
                        const image = $(article).find('img').attr('src');
                        
                        if (title && link) {
                            news.push({
                                section: 'categories',
                                category: categoryName,
                                title: title,
                                link: `https://odia.krishijagran.com${link}`,
                                image: image || null
                            });
                        }
                    });
                }
            });

            // 7. Scrape trending articles
            $('.trending-articles .list-unstyled li').each((index, element) => {
                const title = $(element).find('a').attr('title');
                const link = $(element).find('a').attr('href');
                const image = $(element).find('img').attr('src');
                
                if (title && link) {
                    news.push({
                        section: 'trending',
                        title,
                        link: `https://odia.krishijagran.com${link}`,
                        image: image || null
                    });
                }
            });

            // 8. Scrape latest news
            $('.latest-news .list-unstyled li').each((index, element) => {
                const title = $(element).find('a').attr('title');
                const link = $(element).find('a').attr('href');
                const image = $(element).find('img').attr('src');
                
                if (title && link) {
                    news.push({
                        section: 'latest_news',
                        title,
                        link: `https://odia.krishijagran.com${link}`,
                        image: image || null
                    });
                }
            });

            console.log(`Successfully scraped ${news.length} items`);

        } catch (scrapingError) {
            console.error('Error during scraping:', scrapingError);
            // Continue with partial results
        }

        res.json({
            status: 'success',
            count: news.length,
            data: news
        });

    } catch (error) {
        console.error('Scraping error:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.status,
            data: error.response?.data
        });

        const statusCode = error.response?.status || 500;
        res.status(statusCode).json({
            status: 'error',
            message: 'Failed to fetch news data',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// For local testing
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

// Export for Vercel
module.exports = app;