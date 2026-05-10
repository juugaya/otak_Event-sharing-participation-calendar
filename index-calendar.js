document.addEventListener("DOMContentLoaded", () => {

    const db = firebase.database();

    // イベント一覧読み込み
    db.ref("events").once("value").then(snapshot => {
        const eventList = document.getElementById("event-list");
        eventList.innerHTML = "";

        snapshot.forEach(child => {
            const id = child.key;
            const evt = child.val();

            const div = document.createElement("div");
            div.className = "event-item";
            div.textContent = `${evt.title}（${evt.date}）`;

            // ★ ここを修正！
            div.onclick = () => {
                window.location.href = `share.html?event=${id}`;
            };

            eventList.appendChild(div);
        });
    });

});
