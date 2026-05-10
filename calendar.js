// events.json を読み込んで一覧を生成
// index-calendar.js

// events.json を読み込んで一覧を生成
fetch('events.json')
  .then(res => res.json())
  .then(events => {
    const list = document.getElementById('event-list');
    list.innerHTML = '';

    Object.keys(events).forEach(eventId => {
      const evt = events[eventId];

      const div = document.createElement('div');
      div.className = 'event-item';
      div.style = `
        padding: 12px;
        margin-bottom: 10px;
        background: white;
        border-radius: 8px;
        border: 1px solid #ddd;
        cursor: pointer;
      `;
      div.textContent = `${evt.title}（${evt.date}）`;

      div.onclick = () => {
        // index.html にイベントIDを渡す
        window.location.href = `index.html?event=${eventId}`;
      };

      list.appendChild(div);
    });
  })
  .catch(err => {
    document.getElementById('event-list').textContent = '読み込みエラー';
    console.error(err);
  });

