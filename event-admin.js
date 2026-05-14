document.addEventListener("DOMContentLoaded", () => {

    const db = firebase.database();

    document.getElementById("backBtn").onclick = () => {
        window.location.href = "index.html";
    };

    // 新規登録
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

    document.getElementById("shareBtn").onclick = () => {
        const id = document.getElementById("eventId").value;
        if (!id) {
            alert("イベントIDを入力してください。");
            return;
        }
        window.location.href = `share.html?event=${encodeURIComponent(id)}`;
    };

    // イベント一覧読み込み
    function loadEvents() {
        db.ref("events").once("value").then(snapshot => {
            const eventList = document.getElementById("eventList");
            eventList.innerHTML = "";

            snapshot.forEach(child => {
                const id = child.key;
                const evt = child.val();

                const div = document.createElement("div");
                div.innerHTML =
                    `<strong>${evt.title}</strong> (${evt.date}) ` +
                    `<button onclick="editEvent('${id}')">編集</button> ` +
                    `<button onclick="deleteEvent('${id}')">削除</button>`;
                eventList.appendChild(div);
            });
        });
    }

    window.editEvent = function(id) {
        db.ref("events/" + id).once("value").then(snapshot => {
            const evt = snapshot.val();
            document.getElementById("eventId").value = id;
            document.getElementById("title").value = evt.title;
            document.getElementById("date").value = evt.date;
            document.getElementById("pinColor").value = evt.pinColor;
        });
    }

    window.deleteEvent = function(id) {
        if (!confirm("削除しますか？")) return;
        db.ref("events/" + id).remove().then(loadEvents);
    }

    loadEvents();
});
