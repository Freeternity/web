document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('newsForm');
    const newsList = document.getElementById('newsList');

    form.addEventListener('submit', function(event) {
        event.preventDefault();
        const id = document.getElementById('newsId').value;
        const msg = document.getElementById('msg').value;
        const username_posting = document.getElementById('username_posting').value;
        const date_posted = new Date().toISOString();

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/admin/news/${id}` : '/admin/news';

        fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ msg, username_posting, date_posted })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.success || data.error);
            form.reset();
            loadNews();
        });
    });

    function loadNews() {
        fetch('/admin/news')
            .then(response => response.json())
            .then(data => {
                newsList.innerHTML = '';
                data.forEach(newsItem => {
                    const div = document.createElement('div');
                    div.className = 'news-item';
                    div.innerHTML = `
                        <h3>${newsItem.username_posting} - ${newsItem.date_posted}</h3>
                        <p>${newsItem.msg}</p>
                        <div class="actions">
                            <button onclick="editNews('${newsItem._id}', '${newsItem.msg}', '${newsItem.username_posting}')">Edit</button>
                            <button onclick="deleteNews('${newsItem._id}')">Delete</button>
                        </div>
                    `;
                    newsList.appendChild(div);
                });
            });
    }

    window.editNews = function(id, msg, username_posting) {
        document.getElementById('newsId').value = id;
        document.getElementById('msg').value = msg;
        document.getElementById('username_posting').value = username_posting;
    };

    window.deleteNews = function(id) {
        if (confirm('Are you sure you want to delete this news item?')) {
            fetch(`/admin/news/${id}`, { method: 'DELETE' })
                .then(response => response.json())
                .then(data => {
                    alert(data.success || data.error);
                    loadNews();
                });
        }
    };

    loadNews();
});