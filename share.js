// URL から eventId を取得
const params = new URLSearchParams(window.location.search);
const eventId = params.get("event");

if (!eventId) {
  alert("イベントIDがありません。calendar からアクセスしてください。");
}

// イベント名を表示（任意）
fetch("events.json")
  .then(res => res.json())
  .then(events => {
    const evt = events[eventId];
    if (!evt) return;

    // プルダウンにイベント名を入れる
    const select = document.getElementById("eventSelect");
    select.innerHTML = `
      <option value="">選択してください</option>
      <option value="${eventId}">${evt.title}</option>
    `;
  });

// 参加ボタン
document.getElementById("joinBtn").onclick = () => {
  const name = document.getElementById("name").value;
  const selected = document.getElementById("eventSelect").value;

  if (!name) {
    alert("名前を入力してください");
    return;
  }
  if (!selected) {
    alert("イベントを選択してください");
    return;
  }

  // Firebase に書き込み
  firebase.database()
    .ref(`participants/${eventId}/${name}`)
    .set({
      status: "参加",
      updatedAt: Date.now()
    })
    .then(() => {
      alert("参加を登録しました！");
    });
};
