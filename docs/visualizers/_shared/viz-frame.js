/* Frame-side helper for a visualiser iframe.
 *
 *  - accepts {type:"theme", theme, skin} from the parent and mirrors
 *    data-theme / data-skin onto this document's <html>
 *  - if data-height-msg is set on this script tag, watches the sized
 *    element (default: .wrap, fallback: document.body) with ResizeObserver
 *    and posts {type:<heightMsg>, height} to the parent whenever it grows
 *    or shrinks
 *
 * Usage inside a visualiser HTML:
 *   <script src="/visualizers/_shared/viz-frame.js"
 *           data-height-msg="foo-height"
 *           data-size-selector=".wrap"
 *           defer></script>
 *
 * Both data-height-msg and data-size-selector are optional. Omit
 * data-height-msg to skip the height postback entirely.
 */
(function () {
  var script = document.currentScript;
  var heightMsg = script && script.getAttribute("data-height-msg");
  var sizeSel = (script && script.getAttribute("data-size-selector")) || ".wrap";

  window.addEventListener("message", function (e) {
    if (!e.data || e.data.type !== "theme") return;
    var t = e.data.theme;
    if (t === "dark" || t === "light")
      document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
    var s = e.data.skin;
    if (s === "tui") document.documentElement.setAttribute("data-skin", "tui");
    else document.documentElement.removeAttribute("data-skin");
  });

  if (!heightMsg) return;

  function post(el) {
    if (!el) return;
    var cs = getComputedStyle(document.body);
    var padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    var h = Math.ceil(el.getBoundingClientRect().height + padY);
    try {
      parent.postMessage({ type: heightMsg, height: h }, "*");
    } catch (_) {}
  }

  function attach() {
    var el = document.querySelector(sizeSel) || document.body;
    var lastH = 0;
    function tick() {
      if (!el) return;
      var cs = getComputedStyle(document.body);
      var padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      var h = Math.ceil(el.getBoundingClientRect().height + padY);
      if (Math.abs(h - lastH) > 1) {
        lastH = h;
        try {
          parent.postMessage({ type: heightMsg, height: h }, "*");
        } catch (_) {}
      }
    }
    window.addEventListener("load", tick);
    window.addEventListener("resize", tick);
    if (window.ResizeObserver) new ResizeObserver(tick).observe(el);
    tick();
  }

  if (document.readyState !== "loading") attach();
  else document.addEventListener("DOMContentLoaded", attach);
})();
