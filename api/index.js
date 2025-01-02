require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

// CORS Configuration
const allowedOrigins = [
  'https://agromitra.vercel.app',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

// Enhanced CORS configuration
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later.' }
});

// Apply rate limiting to API routes
app.use('/api', limiter);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// News scraping endpoint
app.get('/api/news', async (req, res, next) => {
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

    // 1. Top story
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

    // 2. Left list news items
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

    // 3. Right list news items
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

    // 4. Animal husbandry section
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

    // 5. Health and lifestyle section
    $('.weather-home .h-title').each((index, element) => {
      const title = $(element).find('a').text();
      const link = $(element).find('a').attr('href');
      const readMoreLink = $(element).find('.btn-link').attr('href');
      const image = $(element).find('.img img').attr('src');
      
      if (title && link) {
        news.push({ 
          section: 'health_lifestyle',
          title, 
          link: `https://odia.krishijagran.com${link}`, 
          readMoreLink: readMoreLink ? `https://odia.krishijagran.com${readMoreLink}` : null,
          image: image || null
        });
      }
    });

    // 6. Categories
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
              title,
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  });
}

module.exports = app;