// =========================
// 初期設定
// =========================

// URL パラメータから eventId を取得
const params = new URLSearchParams(window.location.search);
const eventId = params.get('event') || null;

// Firebase DB（必ず最初に宣言）
const db = firebase.database();

// ピン色（デフォルト）
let pinColor = "red";

// ユーザーID → マーカー
let markerMap = {};

console.log("Loaded event:", eventId);







// =========================
// イベント情報（ピン色）読み込み
// =========================
if (eventId) {
  db.ref(`events/${eventId}`).once("value").then(snapshot => {
    const evt = snapshot.val();
    if (evt && evt.pinColor) {
      pinColor = evt.pinColor;
    }
  });
}

// =========================
// 地図の初期化（★ eventId があるときだけ）
// =========================
let map = null;

if (eventId) {
  map = L.map('map').setView([35.0, 135.0], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);

  // 非表示状態から表示された後でも Leaflet が正しく描画されるようにする
  setTimeout(() => {
    if (map) {
      map.invalidateSize();
    }
  }, 100);
}


// 自分の現在地
let myLat = null;
let myLng = null;

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(pos => {
    myLat = pos.coords.latitude;
    myLng = pos.coords.longitude;
  });
}

// =========================
// ユーティリティ（距離・方角）
// =========================
function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcBearing(lat1, lon1, lat2, lon2) {
  const toRad = x => x * Math.PI / 180;
  const toDeg = x => x * 180 / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function bearingToDirection(b) {
  const dirs = [
    "北","北北東","北東","東北東",
    "東","東南東","南東","南南東",
    "南","南南西","南西","西南西",
    "西","西北西","北西","北北西"
  ];
  return dirs[Math.round(b / 22.5) % 16];
}

// =========================
// ピンの色分け
// =========================
function iconByStatus(status, checkedIn) {
  let color = "blue";

  if (checkedIn) color = "green";
  else if (status === "取込中") color = "orange";
  else if (status === "トラブル") color = "red";
  else if (status === "休憩中") color = "purple";
  else if (status === "帰宅中") color = "grey";

  return L.icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    shadowSize: [41, 41]
  });
}

// =========================
// Firebase：イベント一覧キャッシュ
// =========================
let eventsCache = {};

db.ref("events").once("value").then(snapshot => {
  eventsCache = snapshot.val() || {};
  console.log("Firebase events 読み込み完了:", eventsCache);
});

// =========================
// Firebase：参加者データ購読
// =========================
if (eventId) {
  db.ref(`participants/${eventId}`).on("value", snapshot => {
    const users = snapshot.val() || {};

    // ピン削除（★ map が null のときはスキップ）
    if (map) {
      Object.values(markerMap).forEach(m => map.removeLayer(m));
    }
    markerMap = {};

    const infoDiv = document.getElementById("info");
    infoDiv.innerHTML = "";

    const eventInfo = eventsCache[eventId];
    const evTitle = eventInfo ? eventInfo.title : eventId;

    const evBlock = document.createElement("div");
    evBlock.innerHTML = `<h3>${evTitle}（${Object.keys(users).length}人）</h3>`;
    infoDiv.appendChild(evBlock);

    const ul = document.createElement("ul");

    Object.keys(users).forEach(userName => {
      const p = users[userName];

      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.marginBottom = "8px";
      li.style.padding = "8px";
      li.style.backgroundColor = "#f9f9f9";
      li.style.borderRadius = "4px";

      const infoSpan = document.createElement("span");
      const statusText = p.status || "-";
      const commentText = "";
      infoSpan.innerHTML = `
        <strong>${userName}</strong>
        ／ステータス：${statusText}
        ／到着：${p.checkedIn ? "✔" : "未到着"}
        ／コメント：${commentText}
      `;

      db.ref(`comments/${eventId}/${userName}`).once("value").then(commentSnap => {
        const commentData = commentSnap.val() || {};
        const displayedStatus = commentData.status || statusText;
        const displayedComment = commentData.comment || "";
        infoSpan.innerHTML = `
          <strong>${userName}</strong>
          ／ステータス：${displayedStatus}
          ／到着：${p.checkedIn ? "✔" : "未到着"}
          ／コメント：${displayedComment}
        `;
        statusInput.value = displayedStatus;
        commentInput.value = displayedComment;
      });

      const viewBtn = document.createElement("button");
      viewBtn.textContent = "📍 ピンを表示";
      viewBtn.style.padding = "6px 12px";
      viewBtn.style.fontSize = "12px";
      viewBtn.style.cursor = "pointer";
      viewBtn.style.backgroundColor = "#4CAF50";
      viewBtn.style.color = "white";
      viewBtn.style.border = "none";
      viewBtn.style.borderRadius = "4px";
      viewBtn.style.whiteSpace = "nowrap";
      viewBtn.style.marginRight = "6px";

      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️ 編集";
      editBtn.style.padding = "6px 12px";
      editBtn.style.fontSize = "12px";
      editBtn.style.cursor = "pointer";
      editBtn.style.backgroundColor = "#2196F3";
      editBtn.style.color = "white";
      editBtn.style.border = "none";
      editBtn.style.borderRadius = "4px";
      editBtn.style.whiteSpace = "nowrap";

      const editForm = document.createElement("div");
      editForm.style.display = "none";
      editForm.style.marginTop = "10px";
      editForm.style.padding = "10px";
      editForm.style.background = "#ffffff";
      editForm.style.border = "1px solid #ddd";
      editForm.style.borderRadius = "6px";
      editForm.style.width = "100%";

      const statusInput = document.createElement("input");
      statusInput.type = "text";
      statusInput.placeholder = "ステータス";
      statusInput.value = p.status || "";
      statusInput.style.marginRight = "8px";
      statusInput.style.padding = "6px 8px";
      statusInput.style.width = "140px";

      const commentInput = document.createElement("input");
      commentInput.type = "text";
      commentInput.placeholder = "コメント";
      commentInput.value = p.comment || "";
      commentInput.style.padding = "6px 8px";
      commentInput.style.width = "220px";
      commentInput.style.marginRight = "8px";

      const saveBtn = document.createElement("button");
      saveBtn.textContent = "保存";
      saveBtn.style.padding = "6px 12px";
      saveBtn.style.fontSize = "12px";
      saveBtn.style.cursor = "pointer";
      saveBtn.style.backgroundColor = "#4CAF50";
      saveBtn.style.color = "white";
      saveBtn.style.border = "none";
      saveBtn.style.borderRadius = "4px";
      saveBtn.style.whiteSpace = "nowrap";

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "キャンセル";
      cancelBtn.style.padding = "6px 12px";
      cancelBtn.style.fontSize = "12px";
      cancelBtn.style.cursor = "pointer";
      cancelBtn.style.backgroundColor = "#9E9E9E";
      cancelBtn.style.color = "white";
      cancelBtn.style.border = "none";
      cancelBtn.style.borderRadius = "4px";
      cancelBtn.style.whiteSpace = "nowrap";

      editForm.appendChild(statusInput);
      editForm.appendChild(commentInput);
      editForm.appendChild(saveBtn);
      editForm.appendChild(cancelBtn);

      editBtn.onclick = () => {
        editForm.style.display = editForm.style.display === "none" ? "block" : "none";
      };

      cancelBtn.onclick = () => {
        editForm.style.display = "none";
      };

      saveBtn.onclick = () => {
        const newStatus = statusInput.value.trim();
        const newComment = commentInput.value.trim();

        db.ref(`participants/${eventId}/${userName}`).update({
          status: newStatus || "参加"
        });

        db.ref(`comments/${eventId}/${userName}`).update({
          status: newStatus || "参加",
          comment: newComment,
          updatedAt: Date.now()
        }).then(() => {
          infoSpan.innerHTML = `
            <strong>${userName}</strong>
            ／ステータス：${newStatus || "参加"}
            ／到着：${p.checkedIn ? "✔" : "未到着"}
            ／コメント：${newComment}
          `;
          alert("コメントとステータスを保存しました。");
          editForm.style.display = "none";
        });
      };

      viewBtn.onclick = () => {
        if (markerMap[userName]) {
          const marker = markerMap[userName];
          if (map) {
            map.flyTo(marker.getLatLng(), 17, {
              animate: true,
              duration: 0.6
            });
            marker.openPopup();
          }
        } else {
          // comments データから直接取得
          db.ref(`comments/${eventId}/${userName}`).once("value", snap => {
            const c = snap.val();
            if (c && c.lat != null && c.lng != null && map) {
              map.flyTo([c.lat, c.lng], 17, {
                animate: true,
                duration: 0.6
              });
            }
          });
        }
      };

      li.appendChild(infoSpan);
      const btnGroup = document.createElement("div");
      btnGroup.style.display = "flex";
      btnGroup.style.alignItems = "center";
      btnGroup.appendChild(viewBtn);
      btnGroup.appendChild(editBtn);
      li.appendChild(btnGroup);
      li.appendChild(editForm);
      ul.appendChild(li);
    });

    evBlock.appendChild(ul);
  });
}


// =========================
// Firebase：位置情報（comments）購読
// =========================
if (eventId) {
  db.ref(`comments/${eventId}`).on("value", snapshot => {
    const comments = snapshot.val() || {};

    // ピン削除
    if (map) {
      Object.values(markerMap).forEach(m => map.removeLayer(m));
    }
    markerMap = {};

    Object.keys(comments).forEach(userName => {
      const c = comments[userName];

      const lat = c.lat;
      const lng = c.lng;
      if (lat == null || lng == null) return;

      db.ref(`participants/${eventId}/${userName}`).once("value", snap => {
        const p = snap.val() || {};
        const status = p.status || c.status || "不明";
        const checkedIn = !!p.checkedIn;

        let distText = "不明";
        let bearingText = "不明";
        let dirText = "不明";

        if (myLat != null && myLng != null) {
          const dist = calcDistance(myLat, myLng, lat, lng);
          const bearing = calcBearing(myLat, myLng, lat, lng);
          distText = dist.toFixed(2) + " km";
          bearingText = bearing.toFixed(0) + "°";
          dirText = bearingToDirection(bearing);
        }

        const popupHtml = `
          <strong>${c.name}</strong><br>
          ステータス：${status}<br>
          コメント：${c.comment || ""}<br>
          到着：${checkedIn ? "✔" : "未到着"}<br>
          距離：${distText}<br>
          方角：${dirText}（${bearingText}）<br>
          更新：${c.time || "-"}
        `;

        const marker = L.marker([lat, lng], {
          icon: iconByStatus(status, checkedIn)
        }).addTo(map);

        marker.bindPopup(popupHtml, {
          autoPan: true,
          autoPanPadding: [50, 50]
        });

        marker.on("click", () => {
          map.flyTo([lat, lng], 17, {
            animate: true,
            duration: 0.5
          });
        });

        markerMap[userName] = marker;
      });
    });
  });
}
