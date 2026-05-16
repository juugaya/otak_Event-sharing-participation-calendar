// 1. グローバル変数としてソート状態を管理（関数の外に配置）
let currentOrder = "asc"; 

document.addEventListener("DOMContentLoaded", () => {

    const db = firebase.database();

    // 戻るボタン
    document.getElementById("backBtn").onclick = () => {
        window.location.href = "index.html";
    };

    // 新規登録・保存
    document.getElementById("saveBtn").onclick = () => {
        const id = document.getElementById("eventId").value;
        const title = document.getElementById("title").value;
        const date = document.getElementById("date").value;
        const pinColor = document.getElementById("pinColor").value;

        if (!id || !title || !date) {
            alert("ID・タイトル・日付は必須です");
            return;
        }

        db.ref("events/" + id).set({
            title,
            date,
            pinColor
        }).then(() => {
            alert("保存が完了しました");
            loadEvents();
        });
    };

    // 位置共有ページを開く
    document.getElementById("shareBtn").onclick = () => {
        const id = document.getElementById("eventId").value;
        if (!id) {
            alert("イベントIDを入力してください。");
            return;
        }
        window.location.href = `share.html?event=${encodeURIComponent(id)}`;
    };

    // 2. イベントを読み込んで描画する関数
    function loadEvents() {
        db.ref("events").once("value").then(snapshot => {
            const eventList = document.getElementById("eventList");
            eventList.innerHTML = "";

            // データを一旦配列にすべて格納
            const eventArray = [];
            snapshot.forEach(child => {
                eventArray.push({
                    id: child.key,
                    evt: child.val()
                });
            });

            // currentOrder の状態に合わせて昇順・降順にソートを行う
            eventArray.sort((a, b) => {
                const dateA = a.evt.date || "";
                const dateB = b.evt.date || "";
                
                if (dateA < dateB) {
                    return currentOrder === "asc" ? -1 : 1;
                }
                if (dateA > dateB) {
                    return currentOrder === "asc" ? 1 : -1;
                }
                return 0;
            });

            // ソートされた配列を画面に出力
            eventArray.forEach(item => {
                const id = item.id;
                const evt = item.evt;

                const div = document.createElement("div");
                div.className = "event-item";
                div.innerHTML = `
                <div class="event-info">
                <strong>${evt.title}</strong> (${evt.date})
                </div>
                <div class="event-actions">
                <button onclick="editEvent('${id}')">編集</button>
                <button class="delete" onclick="deleteEvent('${id}')">削除</button>
                </div>`;
                eventList.appendChild(div);
            });
        });
    }

    // 3. ボタンをクリックした時にソート順を反転させる関数（グローバルに公開）
    window.toggleSortOrder = function() {
        const sortBtn = document.getElementById("sortBtn");
        
        // 状態を反転させてボタンのテキストを書き換える
        if (currentOrder === "asc") {
            currentOrder = "desc";
            if (sortBtn) sortBtn.innerText = "並び替え: 新しい順 (▼)";
        } else {
            currentOrder = "asc";
            if (sortBtn) sortBtn.innerText = "並び替え: 古い順 (▲)";
        }
        
        // 再描画
        loadEvents();
    }

    // 編集ボタンの処理（グローバルに公開）
    window.editEvent = function(id) {
        db.ref("events/" + id).once("value").then(snapshot => {
            const evt = snapshot.val();
            document.getElementById("eventId").value = id;
            document.getElementById("title").value = evt.title;
            document.getElementById("date").value = evt.date;
            document.getElementById("pinColor").value = evt.pinColor;
        });
    }

    // 削除ボタンの処理（グローバルに公開）
    window.deleteEvent = function(id) {
        if (!confirm("削除しますか？")) return;
        db.ref("events/" + id).remove().then(loadEvents);
    }

    // 初回読み込みを実行
    loadEvents();
});