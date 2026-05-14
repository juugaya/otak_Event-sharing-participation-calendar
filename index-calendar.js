document.addEventListener("DOMContentLoaded", () => {

    const db = firebase.database();
    const eventList = document.getElementById("event-list");
    const calendarMonth = document.getElementById("calendarMonth");
    const calendarGrid = document.getElementById("calendarGrid");
    const calendarStatus = document.getElementById("calendarStatus");
    const addCalendarBtn = document.getElementById("addCalendarBtn");
    const prevMonthBtn = document.getElementById("prevMonthBtn");
    const nextMonthBtn = document.getElementById("nextMonthBtn");
    const shareEventBtn = document.getElementById("shareEventBtn");
    const params = new URLSearchParams(window.location.search);
    const selectedEventId = params.get("event");
    let events = {};
    const today = new Date();
    const minView = new Date(today.getFullYear(), today.getMonth(), 1);
    const maxView = new Date(today.getFullYear(), today.getMonth() + 11, 1);
    let currentViewYear = today.getFullYear();
    let currentViewMonth = today.getMonth();

    const normalizeView = (year, month) => {
        let date = new Date(year, month, 1);
        if (date < minView) date = new Date(minView);
        if (date > maxView) date = new Date(maxView);
        return { year: date.getFullYear(), month: date.getMonth() };
    };

    const getEventsForMonth = (year, month) => {
        return Object.entries(events)
            .map(([id, evt]) => {
                if (!evt.date) return null;
                const d = new Date(evt.date);
                if (Number.isNaN(d.getTime())) return null;
                if (d.getFullYear() === year && d.getMonth() === month) {
                    return { id, title: evt.title, date: evt.date, day: d.getDate() };
                }
                return null;
            })
            .filter(Boolean);
    };

    const renderCalendarGrid = (year, month, eventItems = [], highlightId = null) => {
        if (!calendarMonth || !calendarGrid || !calendarStatus) return;
        calendarMonth.textContent = `${year}年${month + 1}月`;
        calendarGrid.innerHTML = "";

        const labels = ["日", "月", "火", "水", "木", "金", "土"];
        labels.forEach(label => {
            const th = document.createElement("div");
            th.className = "calendar-cell header";
            th.textContent = label;
            calendarGrid.appendChild(th);
        });

        const first = new Date(year, month, 1);
        const totalDays = new Date(year, month + 1, 0).getDate();
        const startWeekDay = first.getDay();

        for (let i = 0; i < startWeekDay; i++) {
            const empty = document.createElement("div");
            empty.className = "calendar-cell";
            calendarGrid.appendChild(empty);
        }

        const eventsByDay = {};
        eventItems.forEach(evt => {
            eventsByDay[evt.day] = eventsByDay[evt.day] || [];
            eventsByDay[evt.day].push(evt);
        });

        for (let d = 1; d <= totalDays; d++) {
            const cell = document.createElement("div");
            cell.className = "calendar-cell";
            const items = eventsByDay[d] || [];
            const lines = [`${d}日`];

            if (items.length) {
                cell.classList.add("event");
                if (items.length === 1) {
                    lines.push(items[0].title);
                } else {
                    items.slice(0, 2).forEach(evt => lines.push(evt.title));
                    if (items.length > 2) lines.push(`他 ${items.length - 2} 件`);
                }

                cell.onclick = () => {
                    window.location.href = `share.html?event=${items[0].id}`;
                };
            }

            if (highlightId && items.some(evt => evt.id === highlightId)) {
                cell.classList.add("active");
            }

            cell.textContent = lines.join("\n");
            calendarGrid.appendChild(cell);
        }
    };

    const updateCalendar = () => {
        const { year, month } = normalizeView(currentViewYear, currentViewMonth);
        currentViewYear = year;
        currentViewMonth = month;
        const isSelectedEvent = selectedEventId && events[selectedEventId];

        if (isSelectedEvent) {
            const evt = events[selectedEventId];
            if (evt.date) {
                const eventDateObj = new Date(evt.date);
                if (!Number.isNaN(eventDateObj.getTime())) {
                    currentViewYear = eventDateObj.getFullYear();
                    currentViewMonth = eventDateObj.getMonth();
                }
            }
        }

        const monthEvents = getEventsForMonth(currentViewYear, currentViewMonth);
        renderCalendarGrid(currentViewYear, currentViewMonth, monthEvents, selectedEventId);

        const selectedText = selectedEventId && events[selectedEventId]
            ? `選択イベント：${events[selectedEventId].title} / ${events[selectedEventId].date}`
            : "";

        calendarStatus.textContent = monthEvents.length
            ? `${selectedText} ${currentViewMonth + 1}月のイベント: ${monthEvents.map(evt => `${evt.day}日 ${evt.title}`).join('、')}`
            : `${selectedText} この月の予定はありません`;

        if (addCalendarBtn) {
            addCalendarBtn.disabled = !selectedEventId || !events[selectedEventId] || !events[selectedEventId].date;
        }
        if (shareEventBtn) {
            shareEventBtn.disabled = !selectedEventId || !events[selectedEventId];
        }
        if (prevMonthBtn) {
            const prev = new Date(currentViewYear, currentViewMonth - 1, 1);
            prevMonthBtn.disabled = prev < minView;
        }
        if (nextMonthBtn) {
            const next = new Date(currentViewYear, currentViewMonth + 1, 1);
            nextMonthBtn.disabled = next > maxView;
        }
    };

    const downloadIcs = () => {
        if (!selectedEventId || !events[selectedEventId]) {
            alert("イベントを選択してください。");
            return;
        }
        const evt = events[selectedEventId];
        if (!evt.date) {
            alert("イベントに日付が登録されていません。");
            return;
        }
        const start = evt.date.replace(/-/g, "");
        const eventDateObj = new Date(evt.date);
        if (Number.isNaN(eventDateObj.getTime())) {
            alert("イベント日付が不正です。");
            return;
        }
        const endDate = new Date(eventDateObj);
        endDate.setDate(endDate.getDate() + 1);
        const end = endDate.toISOString().slice(0, 10).replace(/-/g, "");
        const now = new Date().toISOString().replace(/[-:]/g, "").split('.')[0] + "Z";
        const uid = `event-${selectedEventId}-${Date.now()}@pushi.local`;
        const description = `イベント: ${evt.title}\n日付: ${evt.date}`;
        const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Pushi Event Calendar//JP\nBEGIN:VEVENT\nUID:${uid}\nDTSTAMP:${now}\nDTSTART;VALUE=DATE:${start}\nDTEND;VALUE=DATE:${end}\nSUMMARY:${evt.title}\nDESCRIPTION:${description}\nEND:VEVENT\nEND:VCALENDAR`;
        const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${evt.title || "event"}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const shareToX = () => {
        if (!selectedEventId || !events[selectedEventId]) {
            alert("共有したいイベントを選択してください。");
            return;
        }
        const evt = events[selectedEventId];
        const shareUrl = new URL("share.html", window.location.href);
        shareUrl.searchParams.set("event", selectedEventId);
        const tweet = `推し活予定\nイベント: ${evt.title}\n日付: ${evt.date}\n詳細: ${shareUrl.toString()}`;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
        window.open(url, "_blank");
    };

    if (addCalendarBtn) {
        addCalendarBtn.addEventListener("click", downloadIcs);
    }
    if (shareEventBtn) {
        shareEventBtn.addEventListener("click", shareToX);
    }
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener("click", () => {
            const prev = normalizeView(currentViewYear, currentViewMonth - 1);
            currentViewYear = prev.year;
            currentViewMonth = prev.month;
            updateCalendar();
        });
    }
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener("click", () => {
            const next = normalizeView(currentViewYear, currentViewMonth + 1);
            currentViewYear = next.year;
            currentViewMonth = next.month;
            updateCalendar();
        });
    }

    db.ref("events").once("value").then(snapshot => {
        eventList.innerHTML = "";
        snapshot.forEach(child => {
            const id = child.key;
            const evt = child.val();
            events[id] = evt;

            const div = document.createElement("div");
            div.className = "event-item";
            div.textContent = `${evt.title}（${evt.date || '日付未設定'}）`;
            div.onclick = () => {
                window.location.href = `share.html?event=${id}`;
            };
            eventList.appendChild(div);
        });

        if (selectedEventId && events[selectedEventId] && events[selectedEventId].date) {
            const selectedDate = new Date(events[selectedEventId].date);
            if (!Number.isNaN(selectedDate.getTime())) {
                currentViewYear = selectedDate.getFullYear();
                currentViewMonth = selectedDate.getMonth();
            }
        }

        updateCalendar();
    });

});
