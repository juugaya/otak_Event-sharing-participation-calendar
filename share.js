// =========================
// events.json を読み込んでプルダウンに表示
// =========================
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
  })
  .catch(err => {
    console.error("events.json が読み込めません:", err);
  });


// =========================
// 参加ボタン
// =========================
document.getElementById("joinBtn").onclick = () => {
  const name = document.getElementById("name").value.trim();
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
  })
  .then(() => {
    alert("参加登録しました！");
  })
  .catch(err => {
    console.error("参加登録エラー:", err);
    alert("Firebase に書き込めませんでした");
  });
};


// =========================
// 参加取り消し
// =========================
document.getElementById("cancelBtn").onclick = () => {
  const name = document.getElementById("name").value.trim();
  const eventId = document.getElementById("eventSelect").value;

  if (!name || !eventId) {
    alert("名前と予定を選んでください");
    return;
  }

  const userId = name.replace(/\s+/g, "_");

  db.ref(`participants/${eventId}/${userId}`).remove()
    .then(() => {
      alert("参加を取り消しました");
    })
    .catch(err => {
      console.error("取り消しエラー:", err);
    });
};


// =========================
// 到着チェックイン
// =========================
document.getElementById("checkinBtn").onclick = () => {
  const name = document.getElementById("name").value.trim();
  const eventId = document.getElementById("eventSelect").value;

  if (!name || !eventId) {
    alert("名前と予定を選んでください");
    return;
  }

  const userId = name.replace(/\s+/g, "_");

  db.ref(`participants/${eventId}/${userId}/checkedIn`).set(true)
    .then(() => {
      alert("到着チェックインしました！");
    })
    .catch(err => {
      console.error("チェックインエラー:", err);
    });
};


// =========================
// 位置共有（現在地送信）
// =========================
document.getElementById("sendLocationBtn")?.addEventListener("click", () => {
  const name = document.getElementById("name").value.trim();
  const eventId = document.getElementById("eventSelect").value;

  if (!name || !eventId) {
    alert("名前と予定を選んでください");
    return;
  }

  const userId = name.replace(/\s+/g, "_");

  if (!navigator.geolocation) {
    alert("位置情報が取得できません");
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    db.ref(`comments/${userId}`).set({
      name,
      lat,
      lng,
      status: "移動中",
      comment: "",
      eventId,
      time: new Date().toISOString()
    })
    .then(() => {
      alert("位置情報を送信しました！");
    })
    .catch(err => {
      console.error("位置送信エラー:", err);
    });

  }, err => {
    alert("位置情報が取得できませんでした");
    console.error(err);
  });
});
