/* ==========================================================================
   animations.js
   把首页标题「有朋自远方来，不亦乐乎！」拆成单个字符，交给 CSS 逐字浮现。

   设计要点：
   - 渐进增强：JS 不执行时标题就是普通文本，绝不会一直不可见
   - 保留原有 HTML 结构（<em>/<strong> 等标签不会被破坏）
   - 用 aria-label 保证屏幕阅读器读到的仍是完整句子
   - 尊重 prefers-reduced-motion
   ========================================================================== */

(function () {
    "use strict";

    var reduceMotion = window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : { matches: false };

    /* 按「字素」切分，避免 emoji / 组合字符被劈成两半 */
    var segmenter = null;
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
        try {
            segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
        } catch (e) {
            segmenter = null;
        }
    }

    function toGraphemes(text) {
        if (segmenter) {
            var out = [];
            var it = segmenter.segment(text);
            var arr = Array.from(it);
            for (var i = 0; i < arr.length; i++) {
                out.push(arr[i].segment);
            }
            return out;
        }
        return Array.from(text);
    }

    var TEXT_NODE = 3;
    var ELEMENT_NODE = 1;

    /* 递归处理所有文本节点，空白原样保留，其余字符包进 <span class="char"> */
    function splitNode(node, chars) {
        var children = Array.prototype.slice.call(node.childNodes);

        for (var i = 0; i < children.length; i++) {
            var child = children[i];

            if (child.nodeType === TEXT_NODE) {
                var text = child.nodeValue;
                if (!text) {
                    continue;
                }

                var graphemes = toGraphemes(text);
                var frag = document.createDocumentFragment();

                for (var j = 0; j < graphemes.length; j++) {
                    var ch = graphemes[j];

                    if (/^\s+$/.test(ch)) {
                        frag.appendChild(document.createTextNode(ch));
                        continue;
                    }

                    var span = document.createElement("span");
                    span.className = "char";
                    span.textContent = ch;
                    span.setAttribute("aria-hidden", "true");
                    frag.appendChild(span);
                    chars.push(span);
                }

                node.replaceChild(frag, child);
            } else if (child.nodeType === ELEMENT_NODE) {
                splitNode(child, chars);
            }
        }
    }

    function animateHomeTitle() {
        if (reduceMotion.matches) {
            return;
        }

        var heading = document.querySelector(".home-info .entry-header h1");
        if (!heading || heading.getAttribute("data-char-split") === "true") {
            return;
        }

        var label = (heading.textContent || "").replace(/\s+/g, " ").trim();
        if (!label) {
            return;
        }

        heading.setAttribute("data-char-split", "true");
        /* 拆字后原文本被 aria-hidden，用 aria-label 保持可访问名称完整 */
        heading.setAttribute("aria-label", label);

        var chars = [];
        splitNode(heading, chars);

        for (var i = 0; i < chars.length; i++) {
            chars[i].style.setProperty("--i", String(i));
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", animateHomeTitle);
    } else {
        animateHomeTitle();
    }
})();
