// URL から eventId を取得
const params = new URLSearchParams(window.location.search);
const eventId = params.get("event");

if (!eventId) {
  alert("イベントIDがありません。calendar からアクセスしてください。");
}

// Firebase からイベント名を取得
firebase.database().ref(`events/${eventId}`).once("value")
  .then(snapshot => {
    const evt = snapshot.val();
    if (!evt) return;

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

  // 参加登録
  firebase.database()
    .ref(`participants/${eventId}/${name}`)
    .set({
      status: "参加",
      updatedAt: Date.now()
    });

  // 位置情報送信
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      firebase.database()
        .ref(`comments/${eventId}/${name}`)
        .set({
          name: name,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          status: "参加",
          arrived: false,
          comment: "",
          updatedAt: Date.now()
        })
        .then(() => {
          alert("参加登録＋位置情報を送信しました！");
        });
    },
    (err) => {
      alert("位置情報が取得できませんでした：" + err.message);
    }
  );
};
