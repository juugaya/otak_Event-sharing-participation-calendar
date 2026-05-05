// 予定一覧を読み込む
fetch("events.json")
  .then(res => res.json())
  .then(events => {
    const sel = document.getElementById("eventSelect");
    events.forEach(e => {
      const op = document.createElement("option");
      op.value = e.id;
      op.textContent = e.title;
      sel.appendChild(op);
    });
  });

// 参加ボタン
document.getElementById("joinBtn").onclick = () => {
  const name = document.getElementById("name").value;
  const eventId = document.getElementById("eventSelect").value;

  if (!name || !eventId) {
    alert("名前と予定を選んでください");
    return;
  }

  const userId = name.replace(/\s+/g, "_");

  db.ref(`participants/${eventId}/${userId}`).set({
    name,
    joinedAt: new Date().toISOString(),
    checkedIn: false,
    status: "移動中",
    comment: ""
  });

  alert("参加登録しました！");
};
