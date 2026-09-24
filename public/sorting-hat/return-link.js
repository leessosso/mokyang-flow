(function () {
  var params = new URLSearchParams(location.search);
  var ret = params.get("return");
  if (!ret || !/^\/meetings\/[A-Za-z0-9_-]+$/.test(ret)) return;
  var link = document.querySelector("[data-meeting-return]");
  if (!link) return;
  link.href = ret;
  link.hidden = false;
})();
