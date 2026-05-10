// URL パラメータから eventId を取得
const params = new URLSearchParams(window.location.search);
const eventId = params.get('event') || 'default';

const db = firebase.database();

console.log("Share for event:", eventId);
function sendLocation(lat, lng, comment, userId) {
  db
    .ref(`comments/${eventId}/${userId}`)
    .set({
      lat,
      lng,
      comment,
      updatedAt: Date.now()
    })
    .then(() => {
      console.log("Location sent:", eventId, userId);
    });
}


// 予定一覧を読み込む
fetch("events.json")
  .then(res => res.json())
  .then(events => {
    const sel = document.getElementById("eventSelect");
    // events.json が配列の場合
    if (Array.isArray(events)) {
      events.forEach(e => {
        const op = document.createElement("option");
        op.value = e.id;
        op.textContent = e.title;
        sel.appendChild(op);
      });
    } else {
      // events.json がオブジェクトの場合
      Object.keys(events).forEach(eventId => {
        const e = events[eventId];
        const op = document.createElement("option");
        op.value = eventId;
        op.textContent = e.title;
        sel.appendChild(op);
      });
    }
  });

// 参加ボタン
document.getElementById("joinBtn").onclick = () => {
  const name = document.getElementById("name").value;
  const selectedEventId = document.getElementById("eventSelect").value;

  if (!name || !selectedEventId) {
    alert("名前と予定を選んでください");
    return;
  }

  const userId = name.replace(/\s+/g, "_");

  db.ref(`participants/${selectedEventId}/${userId}`).set({
    name,
    joinedAt: new Date().toISOString(),
    checkedIn: false,
    status: "移動中",
    comment: ""
  });

  alert("参加登録しました！");
};
