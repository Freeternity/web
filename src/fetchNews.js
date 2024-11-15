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

    try {
        const feed = await parser.parseURL(url);
        console.log('Fetched RSS News articles:', feed.items.length);
        return feed.items.map(item => ({
            title: item.title,
            description: item.contentSnippet,
            url: item.link,
            source: item.source || 'Google News RSS',
            publishedAt: item.pubDate,
            pending: false
        }));
    } catch (error) {
        console.error('Error fetching RSS News:', error);
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
            source: article.source,
            publishedAt: article.publishedAt,
            pending: false
        };

        try {
            // Check if the article already exists in the database
            const existing = await newsDb.find({ selector: { url: article.url } });
            //console.log(existing);
            //console.log('Existing articles:', existing.docs.length);
            
            //new method for searching for existing artices:
            newsDb.find({
                selector: {
                    // Your search criteria here
                    "url": {
                        "$regex": article.url // Example: search for documents where 'field_name' contains 'search_term'
                    }
                },
                limit: 10 // Limit the number of results
                }, (err, result) => {
                    if (err) {
                        console.error(err);
                    }
                    if (result.docs && result.docs.length === 0) {

                        newsDb.insert(newsDoc);
                        console.log('News article saved:', newsDoc.title);

                    } else {

                        console.log('not inserting in the database because it already exists there.');
                    }
                        // not in the database, save it
                    console.log(result.docs); // Output the search results
            });
            
            
            
            
            
            
            if (existing.docs && existing.docs.length === 0) {
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
    const rssNews = await fetchRssNews();

    const allNews = [...googleNews, ...bingNews, ...rssNews];
    console.log('Total news articles fetched:', allNews.length);
    await saveNewsToDb(allNews);
    console.log('Completed fetchNews');
}

fetchNews();

// Schedule the fetchNews function to run periodically
setInterval(fetchNews, 3600000); // Fetch news every hour

