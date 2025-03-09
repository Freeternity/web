require('dotenv').config();
const nano = require('nano')('http://'+process.env.admin_username+':'+process.env.admin_password+'@localhost:5984');
const newsDb = nano.db.use('freeternity_news');
const Parser = require('rss-parser');

const GOOGLE_NEWS_API_KEY = process.env.GOOGLE_NEWS_API_KEY;
const BING_NEWS_API_KEY = process.env.BING_NEWS_API_KEY;

const keywords = [
    'longevity',
    'living forever',
    'not dying',
    'blue zones',
    'longevity supplements'
];

async function fetchGoogleNews() {
    const fetch = (await import('node-fetch')).default; // Use dynamic import
    console.log('Starting fetchGoogleNews');
    const query = keywords.join(' OR ');
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${GOOGLE_NEWS_API_KEY}`;
    console.log('Google News API URL:', url);

    try {
        const response = await fetch(url);
        console.log('Google News API response status:', response.status);
        const data = await response.json();
        console.log('Fetched Google News articles:', data.articles.length);
        return data.articles;
    } catch (error) {
        console.error('Error fetching Google News:', error);
        return [];
    }
}

async function fetchBingNews() {
    const fetch = (await import('node-fetch')).default; // Use dynamic import
    console.log('Starting fetchBingNews');
    const query = keywords.join(' OR ');
    const url = `https://api.cognitive.microsoft.com/bing/v7.0/news/search?q=${encodeURIComponent(query)}`;
    console.log('Bing News API URL:', url);

    try {
        const response = await fetch(url, {
            headers: { 'Ocp-Apim-Subscription-Key': BING_NEWS_API_KEY }
        });
        console.log('Bing News API response status:', response.status);
        const data = await response.json();
        console.log('Fetched Bing News articles:', data.value.length);
        return data.value;
    } catch (error) {
        console.error('Error fetching Bing News:', error);
        return [];
    }
}

async function fetchRssNews() {
    const parser = new Parser();
    const url = 'https://news.google.com/news?q=longevity&output=rss&num=25';
    console.log('Fetching RSS news from:', url);

    const timeout = 10000; // Set timeout to 10 seconds

    try {
        const fetchPromise = parser.parseURL(url);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('RSS fetch timed out')), timeout)
        );

        const feed = await Promise.race([fetchPromise, timeoutPromise]);
        console.log('Fetched RSS feed', feed);
        console.log('Fetched RSS News articles:', feed.items.length);
        return feed.items.map(item => ({
            title: item.title,
            description: item.contentSnippet,
            url: item.link,
            source: item.source || '',
            publishedAt: item.pubDate,
            timestamp: new Date().toISOString(),
            pending: false
        }));
    } catch (error) {
        console.error('Error fetching RSS News:', error);
        return [];
    }
}

async function fetchBingNewsWithImages() {
    const fetch = (await import('node-fetch')).default; // Use dynamic import
    console.log('Starting fetchBingNewsWithImages');
    const url = 'https://www.bing.com/news/search?q=longevity&qft=interval%3d%227%22&form=PTFTNR';
    console.log('Bing News URL:', url);

    try {
        const response = await fetch(url);
        console.log('Bing News response status:', response.status);
        const html = await response.text();

        // Parse the HTML to extract news articles
        const articles = parseBingNewsHTML(html);
        console.log('Fetched Bing News articles with images:', articles.length);
        return articles;
    } catch (error) {
        console.error('Error fetching Bing News with images:', error);
        return [];
    }
}

function parseBingNewsHTML(html) {
    const articles = [];
    // Use a library like cheerio to parse the HTML and extract the necessary details
    const cheerio = require('cheerio');
    const $ = cheerio.load(html);

    $('.news-card').each((index, element) => {
        const title = $(element).find('.title').text();
        const description = $(element).find('.snippet').text();
        const url = $(element).find('a.title').attr('href');
        const img = $(element).find('img.image').attr('src');
        const sourceImage = $(element).find('img.source').attr('src');
        const sourceText = $(element).find('.source').text();
        const faviconImg = $(element).find('img.favicon').attr('src');

        articles.push({
            title,
            description,
            url,
            img,
            sourceImage,
            sourceText,
            faviconImg,
            publishedAt: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            pending: false
        });
    });

    return articles;
}

async function createTitleIndex() {
    try {
        const response = await newsDb.createIndex({
            index: {
                fields: ['title']
            },
            name: 'title-index',
            type: 'json'
        });
        console.log('Title index creation result:', response);
    } catch (error) {
        console.error('Error creating title index (may already exist):', error);
    }
}

// Call the function to ensure the title index is created
createTitleIndex();

async function saveNewsToDb(newsArticles) {
    console.log('Starting saveNewsToDb with', newsArticles.length, 'articles');

    try {
        // Fetch existing titles from the database, sorted by _id in descending order
        const existingArticles = await newsDb.find({
            selector: {},
            fields: ['title'],
            sort: [{ '_id': 'desc' }], // Sort by _id in descending order
            limit: 1000 // Limit to the most recent 1000 articles
        });

        // Create a set of existing titles for quick lookup
        const existingTitles = new Set(existingArticles.docs.map(doc => doc.title.toLowerCase().trim()));

        const savePromises = newsArticles.map(async (article) => {
            const normalizedTitle = article.title.toLowerCase().trim();

            if (!existingTitles.has(normalizedTitle)) {
                const newsDoc = {
                    title: article.title,
                    description: article.description,
                    url: article.url,
                    source: article.source,
                    img: article.img,
                    sourceImage: article.sourceImage,
                    sourceText: article.sourceText,
                    faviconImg: article.faviconImg,
                    publishedAt: article.publishedAt,
                    timestamp: new Date().toISOString(),
                    pending: false
                };

                try {
                    await newsDb.insert(newsDoc);
                    console.log('News article saved:', newsDoc.title, newsDoc.url);
                } catch (error) {
                    console.error('Error saving news article:', newsDoc.title, error);
                }
            } else {
                console.log('Not inserting in the database because it already exists there.');
            }
        });

        await Promise.all(savePromises);
        console.log('Completed saveNewsToDb');
    } catch (error) {
        console.error('Error fetching existing articles:', error);
    }
}

async function fetchNews() {
    console.log('Starting fetchNews');
    //const googleNews = await fetchGoogleNews();
    //const bingNews = await fetchBingNews();
    const bingNewsWithImages = await fetchBingNewsWithImages();
    const rssNews = await fetchRssNews();

    //const allNews = [...rssNews]; //just fetch rss news - ...googleNews, ...bingNews,
    const allNews = [ ...bingNewsWithImages, ...rssNews].map(newsItem => ({
        ...newsItem,
        timestamp: new Date().toISOString() // Add current timestamp
    }));
    
    console.log('Total news articles fetched:', allNews.length );
    console.log('Completed fetchNews with timestamp');
    await saveNewsToDb(allNews);
    console.log('Completed fetchNews');
}

fetchNews();

// Schedule the fetchNews function to run periodically
setInterval(fetchNews, 3600000); // Fetch news every hour

