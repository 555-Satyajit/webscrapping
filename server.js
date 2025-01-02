const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors()); // Enable CORS

app.get('/news', async (req, res) => {
    try {
        const { data } = await axios.get('https://odia.krishijagran.com');
        const $ = cheerio.load(data);
        const news = [];

        // 1. Scrape the top story
        const topStory = $('.row.h-t-20 .top-story');
        const topStoryTitle = topStory.find('a').attr('title');
        const topStoryLink = 'https://odia.krishijagran.com' + topStory.find('a').attr('href');
        const topStoryImage = topStory.find('img').attr('src');
        news.push({ 
            section: 'top_story',
            title: topStoryTitle, 
            link: topStoryLink, 
            image: topStoryImage 
        });

        // 2. Scrape the news items in the left list
        $('.row.h-t-20 .home-top-news-lst-lft .news-item').each((index, element) => {
            const title = $(element).find('a').attr('title');
            const link = 'https://odia.krishijagran.com' + $(element).find('a').attr('href');
            const image = $(element).find('img').attr('src');
            news.push({ 
                section: 'left_list',
                title, 
                link, 
                image 
            });
        });

        // 3. Scrape the news items in the right list
        $('.row.h-t-20 .home-top-news-lst-rt .news-item').each((index, element) => {
            const title = $(element).find('a').attr('title');
            const link = 'https://odia.krishijagran.com' + $(element).find('a').attr('href');
            const image = $(element).find('img').attr('src');
            news.push({ 
                section: 'right_list',
                title, 
                link, 
                image 
            });
        });

        // 4. Scrape the animal husbandry section
        $('.weather-home .h-item').each((index, element) => {
            const title = $(element).find('h2 a').attr('title');
            const link = 'https://odia.krishijagran.com' + $(element).find('h2 a').attr('href');
            const image = $(element).find('.img a img').attr('src');
            news.push({ 
                section: 'animal_husbandry',
                title, 
                link, 
                image 
            });
        });

        // 5. Scrape the health and lifestyle section
        $('.weather-home .h-title').each((index, element) => {
            const sectionTitle = $(element).find('a').text();
            const sectionLink = 'https://odia.krishijagran.com' + $(element).find('a').attr('href');
            const readMoreLink = $(element).find('.btn-link').attr('href');
            const sectionImage = $(element).find('.img img').attr('src');
            news.push({ 
                section: 'health_lifestyle',
                title: sectionTitle, 
                link: sectionLink, 
                readMoreLink: readMoreLink ? 'https://odia.krishijagran.com' + readMoreLink : null,
                image: sectionImage 
            });
        });

        // 6. Scrape the category sections
        $('.home-cat .cat-flex').each((index, categoryElement) => {
            const categoryName = $(categoryElement).find('.cat-h a').attr('title');
            
            $(categoryElement).find('.list-unstyled li').each((i, article) => {
                const title = $(article).find('h2 a').attr('title');
                const link = $(article).find('h2 a').attr('href');
                const image = $(article).find('img').attr('src');
                
                news.push({
                    section: 'categories',
                    category: categoryName,
                    title: title,
                    link: link ? 'https://odia.krishijagran.com' + link : null,
                    image: image || null
                });
            });
        });

        res.json({
            status: 'success',
            count: news.length,
            data: news
        });

    } catch (error) {
        console.error('Scraping error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch news data',
            error: error.message
        });
    }
});

// Export the app for deployment to Vercel
module.exports = app;
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}