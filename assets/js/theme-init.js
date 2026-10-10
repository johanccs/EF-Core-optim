/* Applies the saved theme before first paint to avoid a light/dark flash. */
(function () {
  try {
    var t = JSON.parse(localStorage.getItem("efcourse.theme") || "null");
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
  } catch (e) { /* storage unavailable */ }
})();
