firebase.database().ref("events").once("value")
  .then(snapshot => {
    const events = snapshot.val();
    const list = document.getElementById("event-list");
    list.innerHTML = "";

    Object.keys(events).forEach(eventId => {
      const evt = events[eventId];

      const div = document.createElement("div");
      div.className = "event-item";
      div.textContent = `${evt.title}（${evt.date}）`;

      div.onclick = () => {
        window.location.href = `index.html?event=${eventId}`;
      };

      list.appendChild(div);
    });
  })
  .catch(err => {
    document.getElementById("event-list").textContent = "読み込みエラー";
  });
