const infoWindowMap = {}; // userId → InfoWindow（後で使う）


function getUserColor(userId) {
  const colors = ['red', 'blue', 'green', 'orange', 'purple'];
  const hash = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

// URL パラメータから eventId を取得
const params = new URLSearchParams(window.location.search);
const eventId = params.get('event') || 'default';
// ② イベントごとのピン色を読み込む
let pinColor = "red"; // デフォルト色
// ユーザーID → マーカー の対応表
const markerMap = {};
const db = firebase.database();

db.ref(`events/${eventId}`).once("value").then(snapshot => {
  const evt = snapshot.val();
  if (evt && evt.pinColor) {
    pinColor = evt.pinColor;
  }
});



console.log("Loaded event:", eventId);



function updateSidebar(data) {
  const sidebar = document.getElementById("sidebar");
  sidebar.innerHTML = "";

  Object.keys(data).forEach(userId => {
    const item = data[userId];

    const div = document.createElement("div");
    div.className = "comment-item";

    div.innerHTML = `
      <strong>${userId}</strong><br>
      ${item.comment || "（コメントなし）"}<br>
      <small>${new Date(item.updatedAt).toLocaleString()}</small>
    `;

    // ★ クリックでピンへジャンプ
    div.onclick = () => {
      const marker = markerMap[userId];
      if (marker) {
        map.panTo(marker.getPosition());
        map.setZoom(17); // 好きなズームレベルに調整
      }
    };

    sidebar.appendChild(div);
  });
}

// =========================
// 地図の初期化
// =========================
const map = L.map('map').setView([35.0, 135.0], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

// 自分の現在地（距離・方角計算用）
let myLat = null;
let myLng = null;

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(pos => {
    myLat = pos.coords.latitude;
    myLng = pos.coords.longitude;
  });
}

// =========================
// ユーティリティ：距離・方角
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
// ピンの色分け（ステータス＋到着）
// =========================
function iconByStatus(status, checkedIn) {
  let color = "blue";

  if (checkedIn) {
    color = "green"; // 到着チェックイン済み
  } else {
    if (status === "取込中") color = "orange";
    else if (status === "トラブル") color = "red";
    else if (status === "休憩中") color = "purple";
    else if (status === "帰宅中") color = "grey";
  }

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
// 参加者ピン管理
// =========================
let markerMap = {};      // userId → marker
let currentEventId = null; // 今フォーカスしているイベント（必要なら後で連動）

// =========================
// 予定データの読み込み（events.json）
// =========================
let eventsCache = [];


db.ref("events").once("value").then(snapshot => {
  eventsCache = snapshot.val() || {};
  console.log("Firebase events 読み込み完了:", eventsCache);
});

// =========================
// 参加者データの購読
// =========================
db.ref("participants").on("value", snapshot => {
  const allParticipants = snapshot.val() || {};
  console.log("participants:", allParticipants);

  // いったん全ピン削除
  Object.values(markerMap).forEach(m => map.removeLayer(m));
  markerMap = {};

  // 参加者一覧テキスト用
  const infoDiv = document.getElementById("info");
  infoDiv.innerHTML = "";

  // イベントごとに処理
  Object.keys(allParticipants).forEach(eventId => {
    const users = allParticipants[eventId];
    const eventInfo = eventsCache.find(e => e.id === eventId);

    // 参加人数
    const count = Object.keys(users).length;

    // イベント情報表示（簡易）
    const evTitle = eventInfo ? eventInfo.title : eventId;
    const evBlock = document.createElement("div");
    evBlock.innerHTML = `<h3>${evTitle}（${count}人）</h3>`;
    infoDiv.appendChild(evBlock);

    const ul = document.createElement("ul");

    Object.keys(users).forEach(userId => {
      const p = users[userId];

      // 参加者一覧テキスト
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${p.name}</strong>
        ／ステータス：${p.status || "-"}
        ／到着：${p.checkedIn ? "✔" : "未到着"}
        ／コメント：${p.comment || ""}
      `;
      ul.appendChild(li);

      // 位置情報は comments 側にある前提なので、ここではまだピンを置かない
      // → 下の comments 購読で実際のピンを置く
    });

    evBlock.appendChild(ul);
  });
});

// =========================
// 位置共有データの購読（comments）
// =========================
db.ref("comments").on("value", snapshot => {
  const comments = snapshot.val() || {};
  console.log("comments:", comments);

  // いったん全ピン削除
  Object.values(markerMap).forEach(m => map.removeLayer(m));
  markerMap = {};

  Object.keys(comments).forEach(userId => {
    const c = comments[userId];

    // eventId が設定されている場合のみ表示（予定に紐づく人だけ）
    const eventId = c.eventId || null;
    if (!eventId) return;

    const lat = c.lat;
    const lng = c.lng;
    if (lat == null || lng == null) return;

    // 参加者情報（checkedIn や status の補完用）
    // なければ comments 側の status をそのまま使う
    db.ref(`participants/${eventId}/${userId}`).once("value", snap => {
      const p = snap.val() || {};
      const status = p.status || c.status || "不明";
      const checkedIn = !!p.checkedIn;

      // 距離・方角
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

      marker.bindPopup(popupHtml);
      markerMap[userId] = marker;
    });
  });
});
