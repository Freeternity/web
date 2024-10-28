// Fetch all news
fetch('/api/news')
    .then(response => response.json())
    .then(data => {
        // Handle the news data
    })
    .catch(error => {
        console.error('Error fetching news:', error);
    });

// Post new news
function postNews(newsData) {
    fetch('/api/news', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newsData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('News published successfully');
        } else {
            alert('Error publishing news: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// Update existing news
function updateNews(newsId, newsData) {
    fetch(`/api/news/${newsId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newsData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('News updated successfully');
        } else {
            alert('Error updating news: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}