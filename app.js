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
db.ref("participants").on("value", snapshot => {
  // ★ カレンダーモードなら参加者一覧を描画しない
  if (!eventId) return;

  const allParticipants = snapshot.val() || {};

// ピン削除（★ map が null のときはスキップ）
if (map) {
  Object.values(markerMap).forEach(m => map.removeLayer(m));
}
markerMap = {};


  const infoDiv = document.getElementById("info");
  infoDiv.innerHTML = "";

  Object.keys(allParticipants).forEach(eid => {
    const users = allParticipants[eid];
    const eventInfo = eventsCache[eid];

    const count = Object.keys(users).length;
    const evTitle = eventInfo ? eventInfo.title : eid;

    const evBlock = document.createElement("div");
    evBlock.innerHTML = `<h3>${evTitle}（${count}人）</h3>`;
    infoDiv.appendChild(evBlock);

    const ul = document.createElement("ul");

    Object.keys(users).forEach(userId => {
      const p = users[userId];

      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${p.name}</strong>
        ／ステータス：${p.status || "-"}
        ／到着：${p.checkedIn ? "✔" : "未到着"}
        ／コメント：${p.comment || ""}
      `;
      ul.appendChild(li);
    });

    evBlock.appendChild(ul);
  });
});


// =========================
// Firebase：位置情報（comments）購読
// =========================
db.ref("comments").on("value", snapshot => {
  if (!eventId) return;  // ← 追加
  
  const comments = snapshot.val() || {};

  // ピン削除
  Object.values(markerMap).forEach(m => map.removeLayer(m));
  markerMap = {};

  Object.keys(comments).forEach(userId => {
    const c = comments[userId];

    const eid = c.eventId;
    if (!eid) return;

    const lat = c.lat;
    const lng = c.lng;
    if (lat == null || lng == null) return;

    db.ref(`participants/${eid}/${userId}`).once("value", snap => {
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

      // ★ ピンをクリックしたら中央寄せ
       marker.on("click", () => {
       map.flyTo([lat, lng], 17, {
       animate: true,
       duration: 0.6
       });
      });
      // ★ ポップアップ
      marker.bindPopup(popupHtml);
      // ★ マーカー管理
      markerMap[userId] = marker;

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


      marker.bindPopup(popupHtml);
      markerMap[userId] = marker;
    });
  });
});
