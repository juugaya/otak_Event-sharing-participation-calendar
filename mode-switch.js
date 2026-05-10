document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("event");

  if (eventId) {
    document.getElementById("event-list").style.display = "none";
    document.getElementById("container").style.display = "flex";
  }
});
