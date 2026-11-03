/* Parent-side helper for visualizer iframes.
 *
 * Auto-wires every `<iframe data-viz-embed>` on the page:
 *   - forwards {theme, skin} to the frame via postMessage on load and
 *     whenever the parent's <html> data-theme / data-skin changes
 *   - listens for {type: <heightMsg>, height} from the frame and resizes
 *     the iframe accordingly
 *
 * The frame's incoming message type is the fixed literal "theme"; the
 * height message type is per-iframe (set via data-height-msg="…"),
 * matching what the visualiser's own viz-frame.js posts back.
 *
 * Usage in a blog post:
 *   <iframe src="/visualizers/foo.html"
 *           data-viz-embed
 *           data-height-msg="foo-height"
 *           id="foo-frame"
 *           style="width:100%;height:800px;border:1px solid var(--rule);
 *                  border-radius:6px;"></iframe>
 *   <script src="/visualizers/_shared/viz-embed.js" defer></script>
 */
(function () {
  var frames = document.querySelectorAll("iframe[data-viz-embed]");
  if (!frames.length) return;

  frames.forEach(function (frame) {
    var heightMsg = frame.getAttribute("data-height-msg");

    function syncTheme() {
      var t = document.documentElement.getAttribute("data-theme") || "auto";
      var s = document.documentElement.getAttribute("data-skin") || "minima";
      try {
        frame.contentWindow.postMessage({ type: "theme", theme: t, skin: s }, "*");
      } catch (_) {}
    }
    frame.addEventListener("load", syncTheme);

    var mo = new MutationObserver(syncTheme);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-skin"],
    });

    if (heightMsg) {
      window.addEventListener("message", function (e) {
        if (e.source !== frame.contentWindow) return;
        if (!e.data || e.data.type !== heightMsg) return;
        frame.style.height = e.data.height + "px";
      });
    }
  });
})();
