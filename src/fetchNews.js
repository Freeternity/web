const nano = require('nano')('http://'+process.env.admin_username+':'+process.env.admin_password+'@localhost:5984');
const newsDb = nano.db.use('freeternity_news');

const GOOGLE_NEWS_API_KEY = process.env.GOOGLE_NEWS_API_KEY;
const BING_NEWS_API_KEY = process.env.BING_NEWS_API_KEY;

if (!GOOGLE_NEWS_API_KEY) {
    console.error('Error: GOOGLE_NEWS_API_KEY is not set.');
    process.exit(1);
}

if (!BING_NEWS_API_KEY) {
    console.error('Error: BING_NEWS_API_KEY is not set.');
    process.exit(1);
}
const keywords = [
    'longevity',
    'living forever',
    'not dying',
    'blue zones',
    'longevity supplements'
];

async function fetchGoogleNews() {
    const fetch = (await import('node-fetch')).default;
    console.log('Starting fetchGoogleNews');
    const query = keywords.join(' OR ');
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${GOOGLE_NEWS_API_KEY}`;
    console.log('Google News API URL:', url);

    try {
        const response = await fetch(url);
        console.log('Google News API response status:', response.status);
        const data = await response.json();
        if (!data.articles) {
            console.error('Error fetching Google News: No articles found');
            return [];
        }
        console.log('Fetched Google News articles:', data.articles.length);
        return data.articles;
    } catch (error) {
        console.error('Error fetching Google News:', error);
        return [];
    }
}

async function fetchBingNews() {
    const fetch = (await import('node-fetch')).default;
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
        if (!data.value) {
            console.error('Error fetching Bing News: No articles found');
            return [];
        }
        console.log('Fetched Bing News articles:', data.value.length);
        return data.value;
    } catch (error) {
        console.error('Error fetching Bing News:', error);
        return [];
    }
}

async function saveNewsToDb(newsArticles) {
    console.log('Starting saveNewsToDb with', newsArticles.length, 'articles');
    for (const article of newsArticles) {
        const newsDoc = {
            title: article.title,
            description: article.description,
            url: article.url,
            source: article.source.name,
            publishedAt: article.publishedAt,
            pending: false
        };

        try {
            console.log('Checking for existing article with URL:', article.url);
            const existing = await newsDb.find({ selector: { url: article.url } });
            console.log('Existing articles found:', existing.docs.length);

            if (existing && existing.docs && existing.docs.length === 0) {
                await newsDb.insert(newsDoc);
                console.log('News article saved:', newsDoc.title);
            } else {
                console.log('Duplicate article found, not saving:', newsDoc.title);
            }
        } catch (error) {
            console.error('Error saving news article:', newsDoc.title, error);
        }
    }
    console.log('Completed saveNewsToDb');
}

async function fetchNews() {
    console.log('Starting fetchNews');
    const googleNews = await fetchGoogleNews();
    const bingNews = await fetchBingNews();

    const allNews = [...googleNews, ...bingNews];
    console.log('Total news articles fetched:', allNews.length);
    await saveNewsToDb(allNews);
    console.log('Completed fetchNews');
}

setInterval(fetchNews, 3600000);
fetchNews();

