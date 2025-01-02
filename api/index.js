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
  'https://farm-smart-lbrl3y.flutterflow.app',
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

const getImageUrl = (imgElement, $) => {
  return $(imgElement).attr('data-src') || $(imgElement).attr('src') || null;
};

app.get('/api/news', async (req, res, next) => {
  try {
    console.log('Starting news fetch...');
    
    const { data } = await axios.get('https://odia.krishijagran.com', {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
      }
    });

    const $ = cheerio.load(data);
    const news = [];
    const diagnostics = {
      sectionCounts: {},
      sectionDetails: {},
      failedItems: []
    };

    function logSectionStart(sectionName, selector) {
      console.log(`\n=== Processing ${sectionName} ===`);
      console.log(`Selector: ${selector}`);
      diagnostics.sectionCounts[sectionName] = 0;
      diagnostics.sectionDetails[sectionName] = {
        elementsFound: 0,
        elementsParsed: 0,
        failedItems: []
      };
    }

    // 1. Top story
    logSectionStart('topStory', '.row.h-t-20 .top-story');
    const topStory = $('.row.h-t-20 .top-story');
    diagnostics.sectionDetails.topStory.elementsFound = topStory.length;
    
    if (topStory.length) {
      const title = topStory.find('a').attr('title');
      const link = topStory.find('a').attr('href');
      console.log('Top Story found:', { title, link });
      
      if (title && link) {
        news.push({ 
          section: 'top_story',
          title,
          link: `https://odia.krishijagran.com${link}`,
          image: getImageUrl(topStory.find('img'), $)
        });
        diagnostics.sectionCounts.topStory++;
        diagnostics.sectionDetails.topStory.elementsParsed++;
      }
    }

    // 2. Left list news items
    logSectionStart('leftList', '.row.h-t-20 .home-top-news-lst-lft .news-item');
    const leftListItems = $('.row.h-t-20 .home-top-news-lst-lft .news-item');
    diagnostics.sectionDetails.leftList.elementsFound = leftListItems.length;
    
    leftListItems.each((index, element) => {
      const title = $(element).find('a').attr('title');
      const link = $(element).find('a').attr('href');
      
      if (title && link) {
        news.push({ 
          section: 'left_list',
          title,
          link: `https://odia.krishijagran.com${link}`,
          image: getImageUrl($(element).find('img'), $)
        });
        diagnostics.sectionCounts.leftList++;
        diagnostics.sectionDetails.leftList.elementsParsed++;
      }
    });

    // 3. Right list news items
    logSectionStart('rightList', '.row.h-t-20 .home-top-news-lst-rt .news-item');
    const rightListItems = $('.row.h-t-20 .home-top-news-lst-rt .news-item');
    diagnostics.sectionDetails.rightList.elementsFound = rightListItems.length;
    
    rightListItems.each((index, element) => {
      const title = $(element).find('a').attr('title');
      const link = $(element).find('a').attr('href');
      
      if (title && link) {
        news.push({ 
          section: 'right_list',
          title,
          link: `https://odia.krishijagran.com${link}`,
          image: getImageUrl($(element).find('img'), $)
        });
        diagnostics.sectionCounts.rightList++;
        diagnostics.sectionDetails.rightList.elementsParsed++;
      }
    });

    // 4. Animal husbandry section
    logSectionStart('animalHusbandry', '.weather-home .h-item');
    const animalHusbandryItems = $('.weather-home .h-item');
    diagnostics.sectionDetails.animalHusbandry.elementsFound = animalHusbandryItems.length;
    
    animalHusbandryItems.each((index, element) => {
      const title = $(element).find('h2 a').attr('title');
      const link = $(element).find('h2 a').attr('href');
      
      if (title && link) {
        news.push({ 
          section: 'animal_husbandry',
          title,
          link: `https://odia.krishijagran.com${link}`,
          image: getImageUrl($(element).find('.img a img'), $)
        });
        diagnostics.sectionCounts.animalHusbandry = (diagnostics.sectionCounts.animalHusbandry || 0) + 1;
        diagnostics.sectionDetails.animalHusbandry.elementsParsed++;
      }
    });

    // 5. Health and lifestyle section
    logSectionStart('healthLifestyle', '.weather-home .h-title');
    const healthItems = $('.weather-home .h-title');
    diagnostics.sectionDetails.healthLifestyle.elementsFound = healthItems.length;
    
    healthItems.each((index, element) => {
      const title = $(element).find('a').text();
      const link = $(element).find('a').attr('href');
      
      if (title && link) {
        news.push({ 
          section: 'health_lifestyle',
          title,
          link: `https://odia.krishijagran.com${link}`,
          readMoreLink: $(element).find('.btn-link').attr('href'),
          image: getImageUrl($(element).find('.img img'), $)
        });
        diagnostics.sectionCounts.healthLifestyle = (diagnostics.sectionCounts.healthLifestyle || 0) + 1;
        diagnostics.sectionDetails.healthLifestyle.elementsParsed++;
      }
    });

    // 6. Categories
    logSectionStart('categories', '.home-cat .cat-flex');
    const categoryElements = $('.home-cat .cat-flex');
    diagnostics.sectionDetails.categories.elementsFound = categoryElements.length;
    
    categoryElements.each((index, categoryElement) => {
      const categoryName = $(categoryElement).find('.cat-h a').attr('title');
      
      if (categoryName) {
        $(categoryElement).find('.list-unstyled li').each((i, article) => {
          const title = $(article).find('h2 a').attr('title');
          const link = $(article).find('h2 a').attr('href');
          
          if (title && link) {
            news.push({
              section: 'categories',
              category: categoryName,
              title,
              link: `https://odia.krishijagran.com${link}`,
              image: getImageUrl($(article).find('img'), $)
            });
            diagnostics.sectionCounts.categories = (diagnostics.sectionCounts.categories || 0) + 1;
            diagnostics.sectionDetails.categories.elementsParsed++;
          }
        });
      }
    });

    // Log HTML structure for debugging
    console.log('\n=== HTML Structure Analysis ===');
    const structureAnalysis = {
      weatherHome: {
        exists: $('.weather-home').length > 0,
        hItems: $('.weather-home .h-item').length,
        hTitles: $('.weather-home .h-title').length
      },
      homeCat: {
        exists: $('.home-cat').length > 0,
        catFlex: $('.home-cat .cat-flex').length,
        articles: $('.home-cat .cat-flex .list-unstyled li').length
      }
    };
    console.log('Structure Analysis:', structureAnalysis);

    // Final response
    res.json({
      status: 'success',
      count: news.length,
      diagnostics,
      structureAnalysis,
      data: news
    });

  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch news data',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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