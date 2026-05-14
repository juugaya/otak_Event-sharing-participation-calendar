// URL から eventId を取得
const params = new URLSearchParams(window.location.search);
const eventId = params.get("event");

if (!eventId) {
  alert("イベントIDがありません。calendar からアクセスしてください。");
}

function initSharePage() {
  const mapBtn = document.getElementById("mapBtn");
  const backBtn = document.getElementById("backBtn");
  const joinBtn = document.getElementById("joinBtn");
  const getLocationBtn = document.getElementById("getLocationBtn");
  const select = document.getElementById("eventSelect");
  const manualLat = document.getElementById("manualLat");
  const manualLng = document.getElementById("manualLng");
  const searchBtn = document.getElementById("searchBtn");
  const searchInput = document.getElementById("searchInput");
  const postalBtn = document.getElementById("postalBtn");
  const postalInput = document.getElementById("postalInput");
  const selectedPlaceName = document.getElementById("selectedPlaceName");
  const shareXBtn = document.getElementById("shareXBtn");
  const shareComment = document.getElementById("shareComment");
  const nameInput = document.getElementById("name");
  const mapDiv = document.getElementById("map");
  let selectedPlaceLabel = "なし";
  let eventTitle = "";
  let markerMap = {}; // ユーザー名 → マーカー
  // ★ 地図の初期化
  let shareMap = L.map('map').setView([35.0, 135.0], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(shareMap);

  // Leaflet が初期描画を正しく行うようにサイズを再計算
  setTimeout(() => {
    shareMap.invalidateSize();
  }, 100);

  // ★ ピンの色分け関数
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

  let selectedMarker = null;

  // ★ マップクリックで位置を選択
  shareMap.on("click", (e) => {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    // 前のマーカーを削除
    if (selectedMarker) {
      shareMap.removeLayer(selectedMarker);
    }

    // 新しいマーカーを追加
    selectedMarker = L.marker([lat, lng], {
      icon: L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        shadowSize: [41, 41]
      })
    }).addTo(shareMap);

    selectedMarker.bindPopup(`選択位置<br>緯度: ${lat.toFixed(6)}<br>経度: ${lng.toFixed(6)}`).openPopup();

    // フォームに入力
    manualLat.value = lat.toFixed(6);
    manualLng.value = lng.toFixed(6);
    selectedPlaceLabel = `選択位置`;
    if (selectedPlaceName) {
      selectedPlaceName.textContent = `選択済みの場所: ${selectedPlaceLabel}`;
    }

    document.getElementById("mapInfo").textContent = `✅ 位置を選択しました: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  });

  // ★ 場所検索機能（Nominatim を使用）
  const performSearch = async (query) => {
    if (!query.trim()) {
      alert("検索キーワードを入力してください");
      return;
    }

    searchBtn.disabled = true;
    searchBtn.textContent = "🔍 検索中...";

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const results = await response.json();

      if (results.length === 0) {
        alert("検索結果が見つかりませんでした");
        searchBtn.disabled = false;
        searchBtn.textContent = "🔍 検索";
        return;
      }

      const result = results[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);

      // 前のマーカーを削除
      if (selectedMarker) {
        shareMap.removeLayer(selectedMarker);
      }

      // 新しいマーカーを追加
      selectedMarker = L.marker([lat, lng], {
        icon: L.icon({
          iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          shadowSize: [41, 41]
        })
      }).addTo(shareMap);

      selectedMarker.bindPopup(`${result.display_name}<br>緯度: ${lat.toFixed(6)}<br>経度: ${lng.toFixed(6)}`).openPopup();

      // フォームに入力
      manualLat.value = lat.toFixed(6);
      manualLng.value = lng.toFixed(6);
      selectedPlaceLabel = result.display_name;
      if (selectedPlaceName) {
        selectedPlaceName.textContent = `選択済みの場所: ${selectedPlaceLabel}`;
      }

      // 地図を移動
      shareMap.flyTo([lat, lng], 15, {
        animate: true,
        duration: 0.6
      });

      document.getElementById("mapInfo").textContent = `✅ 検索結果: ${result.display_name}`;
      searchBtn.disabled = false;
      searchBtn.textContent = "🔍 検索";
    } catch (err) {
      alert("検索エラー: " + err.message);
      searchBtn.disabled = false;
      searchBtn.textContent = "🔍 検索";
    }
  };

  // ★ 郵便番号検索
  const performPostalSearch = async (zipcode) => {
    const code = zipcode.replace(/\D/g, "");
    if (!code) {
      alert("郵便番号を入力してください");
      return;
    }

    postalBtn.disabled = true;
    postalBtn.textContent = "検索中...";

    try {
      const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${encodeURIComponent(code)}`);
      const data = await response.json();
      if (data.status !== 200 || !data.results || data.results.length === 0) {
        alert("郵便番号に該当する住所が見つかりませんでした");
        postalBtn.disabled = false;
        postalBtn.textContent = "🏤 郵便番号検索";
        return;
      }

      const result = data.results[0];
      const address = `${result.address1}${result.address2}${result.address3}`;
      if (!address) {
        alert("住所データが見つかりませんでした");
        postalBtn.disabled = false;
        postalBtn.textContent = "🏤 郵便番号検索";
        return;
      }

      await performSearch(address);
      if (selectedPlaceName) {
        selectedPlaceName.textContent = `選択済みの場所: ${address}`;
        selectedPlaceLabel = address;
      }
    } catch (err) {
      alert("郵便番号検索エラー: " + err.message);
    } finally {
      postalBtn.disabled = false;
      postalBtn.textContent = "🏤 郵便番号検索";
    }
  };

  // ★ 検索ボタンのクリック
  if (searchBtn && searchInput) {
    searchBtn.addEventListener("click", () => {
      performSearch(searchInput.value);
    });

    // ★ Enter キーでも検索できるように
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        performSearch(searchInput.value);
      }
    });
  }

  if (postalBtn && postalInput) {
    postalBtn.addEventListener("click", () => {
      performPostalSearch(postalInput.value);
    });
    postalInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        performPostalSearch(postalInput.value);
      }
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  } else {
    console.error("backBtn が見つかりませんでした。");
  }

  if (!mapBtn) {
    console.warn("mapBtn が見つかりませんでした。地図リンクは無効になります。");
  }
  if (!joinBtn) {
    console.warn("joinBtn が見つかりませんでした。参加ボタンは無効になります。");
  }
  if (!select) {
    console.warn("eventSelect が見つかりませんでした。イベント選択は無効になります。");
  }

  if (select) {
    // ★ Firebase からイベント名を取得（ここが重要）
    firebase.database().ref(`events/${eventId}`).once("value")
      .then(snapshot => {
        const evt = snapshot.val();
        if (!evt) return;
        eventTitle = evt.title || eventTitle;

        select.innerHTML = `
          <option value="${eventId}" selected>${evt.title}</option>
        `;
      });
  }

  // ★ 「現在地を取得」ボタン
  if (getLocationBtn) {
    getLocationBtn.addEventListener("click", () => {
      if (navigator.geolocation) {
        getLocationBtn.textContent = "📍 取得中...";
        getLocationBtn.disabled = true;
        
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            manualLat.value = pos.coords.latitude.toFixed(6);
            manualLng.value = pos.coords.longitude.toFixed(6);

            // 地図にマーカーを表示
            if (selectedMarker) {
              shareMap.removeLayer(selectedMarker);
            }

            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            selectedMarker = L.marker([lat, lng], {
              icon: L.icon({
                iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
                shadowSize: [41, 41]
              })
            }).addTo(shareMap);

            selectedMarker.bindPopup(`現在地<br>緯度: ${lat.toFixed(6)}<br>経度: ${lng.toFixed(6)}`).openPopup();
            selectedPlaceLabel = "現在地";
            if (selectedPlaceName) {
              selectedPlaceName.textContent = `選択済みの場所: ${selectedPlaceLabel}`;
            }

            shareMap.flyTo([lat, lng], 15, {
              animate: true,
              duration: 0.6
            });

            getLocationBtn.textContent = "✅ 取得完了";
            getLocationBtn.disabled = false;
            document.getElementById("mapInfo").textContent = `✅ 現在地を取得しました`;
            setTimeout(() => {
              getLocationBtn.textContent = "📍 現在地を取得";
            }, 2000);
          },
          (err) => {
            alert("位置情報が取得できませんでした：" + err.message);
            getLocationBtn.textContent = "📍 現在地を取得";
            getLocationBtn.disabled = false;
          }
        );
      } else {
        alert("このブラウザは位置情報に対応していません");
      }
    });
  }

  if (joinBtn && select) {
    joinBtn.addEventListener("click", () => {
      const name = document.getElementById("name").value;
      const selected = select.value;
      const lat = parseFloat(manualLat.value);
      const lng = parseFloat(manualLng.value);

      if (!name) {
        alert("名前を入力してください");
        return;
      }
      if (!selected) {
        alert("イベントを選択してください");
        return;
      }

      if (isNaN(lat) || isNaN(lng)) {
        alert("位置情報を入力してください（マップから選択するか、手動入力してください）");
        return;
      }

      // 参加登録
      firebase.database()
        .ref(`participants/${eventId}/${name}`)
        .set({
          name: name,
          status: "参加",
          updatedAt: Date.now()
        });

      // 位置情報送信（手動入力またはGPS）
      firebase.database()
        .ref(`comments/${eventId}/${name}`)
        .set({
          name: name,
          lat: lat,
          lng: lng,
          status: "参加",
          arrived: false,
          comment: "",
          updatedAt: Date.now()
        })
        .then(() => {
          alert("参加登録＋位置情報を送信しました！");
        });
    });
  }

  if (shareXBtn) {
    shareXBtn.addEventListener("click", () => {
      const selected = select.value;
      const lat = parseFloat(manualLat.value);
      const lng = parseFloat(manualLng.value);
      const commentText = shareComment ? shareComment.value.trim() : "";

      if (!selected) {
        alert("イベントを選択してください");
        return;
      }
      if (isNaN(lat) || isNaN(lng)) {
        alert("先に位置を選択してください");
        return;
      }

      const placeText = selectedPlaceLabel !== "なし" ? selectedPlaceLabel : `${lat.toFixed(6)},${lng.toFixed(6)}`;
      const title = eventTitle || selected;
      const mapImageUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat.toFixed(6)},${lng.toFixed(6)}&zoom=15&size=600x400&maptype=mapnik&markers=${lat.toFixed(6)},${lng.toFixed(6)},red-pushpin`;
      const tweet = `推し活共有\nイベント: ${title}\n日時: ${eventDate || "未設定"}\n場所: ${placeText}\n座標: ${lat.toFixed(6)},${lng.toFixed(6)}\nコメント: ${commentText || "なし"}\nマップ: ${mapImageUrl}`;
      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
      window.open(url, "_blank");
    });
  }

  if (mapBtn) {
    mapBtn.addEventListener("click", () => {
      window.location.href = `index.html?event=${eventId}`;
    });
  }

  const renderComments = (comments) => {
    const commentsList = document.getElementById("commentsList");
    commentsList.innerHTML = "";
    const currentName = nameInput ? nameInput.value.trim() : "";

    // ピン削除
    Object.values(markerMap).forEach(m => shareMap.removeLayer(m));
    markerMap = {};

    Object.keys(comments).forEach(userName => {
      const c = comments[userName] || {};
      const commentName = c.name || userName;
      const lat = c.lat;
      const lng = c.lng;

      if (lat != null && lng != null) {
        firebase.database().ref(`participants/${eventId}/${userName}`).once("value", snap => {
          const p = snap.val() || {};
          const status = p.status || c.status || "不明";
          const checkedIn = !!p.checkedIn;

          const popupHtml = `
            <strong>${commentName}</strong><br>
            ステータス：${status}<br>
            コメント：${c.comment || ""}<br>
            到着：${checkedIn ? "✔" : "未到着"}
          `;

          const marker = L.marker([lat, lng], {
            icon: iconByStatus(status, checkedIn)
          }).addTo(shareMap);

          marker.bindPopup(popupHtml, {
            autoPan: true,
            autoPanPadding: [50, 50]
          });

          marker.on("click", () => {
            shareMap.flyTo([lat, lng], 17, {
              animate: true,
              duration: 0.5
            });
          });

          markerMap[userName] = marker;
        });
      }

      const commentDiv = document.createElement("div");
      commentDiv.style.padding = "8px";
      commentDiv.style.marginBottom = "8px";
      commentDiv.style.backgroundColor = "#f9f9f9";
      commentDiv.style.borderRadius = "4px";
      commentDiv.style.position = "relative";
      commentDiv.innerHTML = `
        <strong>${commentName}</strong>：${c.comment || "コメントなし"}<br>
        ステータス：${c.status || "不明"}<br>
        位置：${lat != null ? lat.toFixed(6) : "不明"}, ${lng != null ? lng.toFixed(6) : "不明"}
      `;

      const isMine = currentName && currentName === commentName;
      if (isMine) {
        const editBtn = document.createElement("button");
        editBtn.textContent = "✏️ 自分の投稿を編集";
        editBtn.style.background = "#2196F3";
        editBtn.style.color = "white";
        editBtn.style.border = "none";
        editBtn.style.borderRadius = "4px";
        editBtn.style.padding = "6px 10px";
        editBtn.style.cursor = "pointer";
        editBtn.style.marginTop = "8px";

        editBtn.onclick = () => {
          const textarea = document.createElement("textarea");
          textarea.value = c.comment || "";
          textarea.style.width = "100%";
          textarea.style.height = "100px";
          textarea.style.marginTop = "8px";
          textarea.style.padding = "8px";
          textarea.style.border = "1px solid #ccc";
          textarea.style.borderRadius = "6px";

          const saveBtn = document.createElement("button");
          saveBtn.textContent = "保存";
          saveBtn.style.background = "#4CAF50";
          saveBtn.style.color = "white";
          saveBtn.style.border = "none";
          saveBtn.style.borderRadius = "4px";
          saveBtn.style.padding = "6px 10px";
          saveBtn.style.cursor = "pointer";
          saveBtn.style.marginRight = "8px";

          const cancelBtn = document.createElement("button");
          cancelBtn.textContent = "キャンセル";
          cancelBtn.style.background = "#9E9E9E";
          cancelBtn.style.color = "white";
          cancelBtn.style.border = "none";
          cancelBtn.style.borderRadius = "4px";
          cancelBtn.style.padding = "6px 10px";
          cancelBtn.style.cursor = "pointer";

          const editArea = document.createElement("div");
          editArea.appendChild(textarea);
          editArea.appendChild(saveBtn);
          editArea.appendChild(cancelBtn);

          commentDiv.appendChild(editArea);
          editBtn.disabled = true;

          cancelBtn.onclick = () => {
            commentDiv.removeChild(editArea);
            editBtn.disabled = false;
          };

          saveBtn.onclick = () => {
            const updatedComment = textarea.value.trim();
            firebase.database().ref(`comments/${eventId}/${userName}`).update({
              comment: updatedComment,
              updatedAt: Date.now()
            }).then(() => {
              if (lastComments[userName]) {
                lastComments[userName].comment = updatedComment;
              }
              renderComments(lastComments);
            });
          };
        };

        commentDiv.appendChild(editBtn);
      }

      commentsList.appendChild(commentDiv);
    });
  };

  const commentsRef = firebase.database().ref(`comments/${eventId}`);
  commentsRef.on("value", snapshot => {
    lastComments = snapshot.val() || {};
    renderComments(lastComments);
  });

  if (nameInput) {
    nameInput.addEventListener("input", () => {
      renderComments(lastComments);
    });
  }
}

window.addEventListener("load", initSharePage);
