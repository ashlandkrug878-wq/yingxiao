(function () {
  "use strict";
  var app = document.getElementById("app");
  var cache = {};

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function list(arr, tag) {
    if (!arr || !arr.length) return "";
    tag = tag || "ul";
    return "<" + tag + ">" + arr.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</" + tag + ">";
  }
  function load(url) {
    if (cache[url]) return Promise.resolve(cache[url]);
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(url + " 返回 " + r.status);
      return r.json();
    }).then(function (j) { cache[url] = j; return j; });
  }
  function loadMethod(id) { return load("methodologies/" + id + "/diagnosis.json"); }
  function store(id, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem("yx:" + id) || "null");
      localStorage.setItem("yx:" + id, JSON.stringify(val));
    } catch (e) { return null; }
  }
  function stripNum(t) { return String(t || "").replace(/^\s*\d+\s*/, ""); }
  function gateNo(d) { return (d.gates && d.gates.station) || "00"; }

  /* ---------- routing ---------- */
  function route() {
    var m = location.hash.match(/^#\/m\/([\w-]+)/);
    var pf = location.hash.match(/^#\/pitfalls(?:\/([\w-]+))?/);
    if (m) renderMethod(m[1]); else if (pf) renderPitfalls(pf[1]); else renderHome();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

  function fail(msg) {
    app.innerHTML = '<h1>载入失败</h1><p class="sub">' + esc(msg) + '</p><p><a href="#/">回到方法论列表</a></p>';
  }

  /* ---------- home ---------- */
  function mini(d) {
    var h = "";
    if (d.gates) h += '<i class="g"></i><b></b>';
    (d.steps || []).forEach(function (s, i) { h += (i ? "<b></b>" : "") + "<i></i>"; });
    return '<span class="mini" aria-hidden="true">' + h + "</span>";
  }
  function renderHome() {
    document.title = "营销方法论库";
    load("methodologies/index.json").then(function (idx) {
      return Promise.all(idx.methodologies.map(function (id) {
        return loadMethod(id).catch(function () { return null; });
      }));
    }).then(function (ms) {
      ms = ms.filter(Boolean);
      var rows = ms.map(function (d) {
        return '<li><a class="mrow" href="#/m/' + esc(d.id) + '">' +
          '<span class="mtitle">' + esc(d.title) + "</span>" + mini(d) +
          '<span class="mmeta">' + esc(d.subtitle) + "</span></a></li>";
      }).join("");
      app.innerHTML =
        "<h1>营销方法论库</h1>" +
        '<p class="lede">每套方法论拆成路线和检查项。选一套，回答几个问题，看看品牌现在卡在哪一步。</p>' +
        (rows ? '<ul class="mlist">' + rows + "</ul>" : '<p class="empty">还没有收录方法论。按仓库 README 的步骤添加第一套。</p>') +
        pitfallTeaser(ms);
    }).catch(function (e) { fail(e.message); });
  }

  /* ---------- route (stations) ---------- */
  function stations(d) {
    var st = [];
    if (d.gates) st.push({ key: "gate", no: gateNo(d), name: stripNum(d.gates.title), tag: d.gates.tag || "能不能做", gate: true });
    (d.steps || []).forEach(function (s) { st.push({ key: s.id, no: s.id, name: s.title, tag: s.tagline }); });
    return st;
  }
  function routeHtml(d, status) {
    var st = stations(d);
    return '<div class="route" style="--n:' + st.length + '" role="group" aria-label="路线">' + st.map(function (s) {
      var cls = "stn" + (s.gate ? " gate" : "");
      var flag = "";
      if (status) {
        var v = status[s.key] || "";
        cls += " " + v.split(" ").map(function (x) { return x; }).join(" ");
        if (/\bhere\b/.test(v)) flag = '<span class="here-flag">卡在这里</span>';
      }
      return '<button type="button" class="' + cls + '" data-k="' + esc(s.key) + '"' + (status ? "" : ' aria-pressed="false"') + ">" +
        '<span class="dot"><span>' + esc(s.no) + "</span></span>" +
        '<span class="txt"><span class="sname">' + esc(s.name) + '</span><span class="stag">' + esc(s.tag) + "</span></span>" + flag +
        "</button>";
    }).join("") + "</div>";
  }
  function detailHtml(d, key) {
    if (key === "gate") {
      return "<h3>" + esc(d.gates.title) + "</h3><p class=\"ds\" style=\"margin-top:0\">" + esc(d.gates.intro) + "</p>" +
        list(d.gates.items.map(function (g) { return g.title + (g.veto ? "（一票否决）" : "") + "：" + g.summary; }));
    }
    var s = (d.steps || []).filter(function (x) { return x.id === key; })[0];
    if (!s) return "";
    return "<h3>" + esc(s.id + " " + s.title) + "：" + esc(s.tagline) + "</h3>" + list(s.points) +
      (s.done_signal ? '<p class="ds">完成标志：' + esc(s.done_signal) + "</p>" : "");
  }

  /* ---------- methodology page ---------- */
  function renderMethod(id) {
    loadMethod(id).then(function (d) {
      document.title = d.title + " · 营销方法论库";
      var saved = store(d.id) || {};
      var h = "";
      h += "<h1>" + esc(d.title) + "</h1>";
      h += '<p class="lede">' + esc(d.summary) + "</p>";
      if (d.source) {
        h += '<p class="src">来源：' + (d.source.url ? '<a href="' + esc(d.source.url) + '" target="_blank" rel="noopener">' + esc(d.source.title) + "</a>" : esc(d.source.title)) +
          (d.source.note ? "。" + esc(d.source.note) : "") +
          (d.source.transcript ? '。<a href="' + esc(d.source.transcript) + '" target="_blank" rel="noopener">看逐字稿</a>' : "") + "</p>";
      }
      if (d.tags) h += '<div class="tags">' + d.tags.map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") + "</div>";

      h += "<h2>路线</h2><p class=\"sub\">点击任意一站查看要点。</p>";
      h += '<div id="overview">' + routeHtml(d) + '</div><div class="detail" id="detail" hidden></div>';

      if (d.stages) {
        h += "<h2>" + esc(d.stages.title) + "：每个规模做到哪一步</h2>";
        h += '<table class="stages"><thead><tr><th>阶段</th><th>规模与预算</th><th>应做</th><th>不该做</th></tr></thead><tbody>' +
          d.stages.options.map(function (o) {
            return "<tr><td>" + esc(o.label) + "</td><td>" + esc(o.desc) + (o.budget ? "<br><span class=\"note\">" + esc(o.budget) + "</span>" : "") +
              "</td><td>" + esc((o.dos || []).join("；")) + "</td><td>" + esc((o.donts || []).join("；")) + "</td></tr>";
          }).join("") + "</tbody></table>";
        if (d.stages.note) h += '<p class="note">' + esc(d.stages.note) + "</p>";
      }

      if (d.pitfalls && d.pitfalls.length) {
        h += "<h2>这一套提到的错误打法</h2><p class=\"sub\">共 " + d.pitfalls.length + ' 条。到<a href="#/pitfalls/' + esc(d.id) + '">错题集</a>里逐条自查。</p>';
        h += '<ul class="pfmini">' + d.pitfalls.map(function (p) {
          return "<li><span class=\"pfstep\">" + esc(p.step) + "</span><span>" + esc(p.title) + "</span></li>";
        }).join("") + "</ul>";
      }
      h += '<section class="diag" aria-labelledby="dg"><h2 id="dg">自诊断</h2><p class="sub">按实际情况回答，没做到的就不勾。答案只保存在这台设备的浏览器里。</p>';
      h += '<form id="form" novalidate>';
      h += '<div class="who"><label for="who">诊断对象（可选）</label><input type="text" id="who" name="who" placeholder="例如：MKB 坐垫" value="' + esc(saved.who || "") + '"></div>';

      if (d.gates) {
        h += "<h3 style=\"margin-top:28px;font-family:var(--serif);font-size:19px\">" + esc(d.gates.title) + "</h3>";
        d.gates.items.forEach(function (g) {
          h += '<fieldset><legend class="q">' + esc(g.title) + (g.veto ? "（一票否决）" : "") + "<small>" + esc(g.question) + "</small></legend>";
          g.options.forEach(function (o, i) {
            var ck = saved.gates && saved.gates[g.id] === i ? " checked" : "";
            h += '<label class="opt"><input type="radio" name="g_' + esc(g.id) + '" value="' + i + '"' + ck + "><span>" + esc(o.label) + "</span></label>";
          });
          h += "</fieldset>";
        });
      }
      if (d.stages) {
        h += '<fieldset><legend class="q" style="font-family:var(--serif);font-size:19px">' + esc(d.stages.title) + "<small>" + esc(d.stages.question) + "</small></legend>";
        d.stages.options.forEach(function (o) {
          var ck = saved.stage === o.id ? " checked" : "";
          h += '<label class="opt"><input type="radio" name="stage" value="' + esc(o.id) + '"' + ck + "><span>" + esc(o.label) +
            '<span class="od">' + esc(o.desc) + "</span></span></label>";
        });
        h += "</fieldset>";
      }
      if (d.steps && d.steps.length) {
        h += "<h3 style=\"margin-top:30px;font-family:var(--serif);font-size:19px\">每一步做到了哪些</h3>";
        d.steps.forEach(function (s) {
          h += '<fieldset class="stepq"><legend class="q"><span style="display:flex;gap:10px;align-items:baseline"><span style="font-family:var(--num);font-size:20px;color:var(--line)">' + esc(s.id) + "</span>" +
            esc(s.title) + '<span style="font-weight:400;color:var(--mute);font-size:14px">' + esc(s.tagline) + "</span></span></legend>";
          s.checks.forEach(function (c, i) {
            var key = s.id + ":" + i;
            var ck = saved.checks && saved.checks.indexOf(key) > -1 ? " checked" : "";
            h += '<label class="opt"><input type="checkbox" name="c" value="' + esc(key) + '"' + ck + "><span>" + esc(c) + "</span></label>";
          });
          h += "</fieldset>";
        });
      }
      h += '<div class="actions"><button class="primary" type="submit">生成诊断</button><button class="ghost" type="button" id="reset">清空答案</button><p class="err" id="err" role="alert"></p></div>';
      h += "</form></section>";
      h += '<div id="result" tabindex="-1"></div>';
      h += '<p style="margin-top:40px"><a href="#/">回到方法论列表</a></p>';
      app.innerHTML = h;

      bindOverview(d);
      bindForm(d);
      if (saved.done) showResult(d, readForm(d), false);
    }).catch(function (e) { fail(e.message); });
  }

  function bindOverview(d) {
    var ov = document.getElementById("overview");
    var det = document.getElementById("detail");
    ov.addEventListener("click", function (e) {
      var b = e.target.closest(".stn");
      if (!b) return;
      var on = b.getAttribute("aria-pressed") === "true";
      ov.querySelectorAll(".stn").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
      if (on) { det.hidden = true; return; }
      b.setAttribute("aria-pressed", "true");
      det.innerHTML = detailHtml(d, b.getAttribute("data-k"));
      det.hidden = false;
    });
  }

  function readForm(d) {
    var f = document.getElementById("form");
    var a = { who: f.who.value.trim(), gates: {}, stage: null, checks: [] };
    if (d.gates) d.gates.items.forEach(function (g) {
      var el = f.querySelector('input[name="g_' + g.id + '"]:checked');
      if (el) a.gates[g.id] = +el.value;
    });
    var st = f.querySelector('input[name="stage"]:checked');
    if (st) a.stage = st.value;
    f.querySelectorAll('input[name="c"]:checked').forEach(function (el) { a.checks.push(el.value); });
    return a;
  }

  function bindForm(d) {
    var f = document.getElementById("form");
    var err = document.getElementById("err");
    f.addEventListener("change", function () {
      err.textContent = "";
      var a = readForm(d); var prev = store(d.id) || {}; a.done = prev.done; store(d.id, a);
    });
    f.addEventListener("input", function (e) {
      if (e.target.id === "who") { var a = readForm(d); var prev = store(d.id) || {}; a.done = prev.done; store(d.id, a); }
    });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var a = readForm(d);
      var missing = [];
      if (d.gates) d.gates.items.forEach(function (g) { if (a.gates[g.id] == null) missing.push(g.title); });
      if (d.stages && !a.stage) missing.push(d.stages.title);
      if (missing.length) { err.textContent = "还没回答：" + missing.join("、"); return; }
      a.done = true; store(d.id, a);
      showResult(d, a, true);
    });
    document.getElementById("reset").addEventListener("click", function () {
      store(d.id, {});
      f.reset();
      f.who.value = "";
      f.querySelectorAll("input[type=radio],input[type=checkbox]").forEach(function (x) { x.checked = false; });
      document.getElementById("result").innerHTML = "";
      err.textContent = "";
    });
  }

  /* ---------- diagnosis ---------- */
  function vetoNames(r) {
    return r.gates.filter(function (x) { return x.g.veto && x.o.outcome === "fail"; }).map(function (x) { return x.g.title; }).join("、");
  }
  var OUT = { pass: "通过", risk: "有风险", fail: "不通过" };

  function diagnose(d, a) {
    var r = { gates: [], verdict: null, stage: null, steps: [], stuck: null, debts: [], allDone: false, stop: false };
    if (d.gates) {
      var veto = false, anyFail = false, anyRisk = false;
      d.gates.items.forEach(function (g) {
        var o = g.options[a.gates[g.id]];
        if (!o) return;
        r.gates.push({ g: g, o: o });
        if (o.outcome === "fail") { anyFail = true; if (g.veto) veto = true; }
        if (o.outcome === "risk") anyRisk = true;
      });
      r.verdict = veto ? { cls: "fail", text: "不建议做品牌", why: "一票否决项没有通过，先解决它，其他动作都暂停。" }
        : anyFail ? { cls: "risk", text: "补救后能做", why: "有前提没有通过，先按下面的建议补救。" }
        : anyRisk ? { cls: "risk", text: "能做，有风险", why: "前提基本成立，但有需要盯住的风险。" }
        : { cls: "pass", text: "可以做", why: "三个前提都成立。" };
      r.stop = veto;
    }
    if (d.stages && a.stage) r.stage = d.stages.options.filter(function (o) { return o.id === a.stage; })[0] || null;
    var ordered = !(d.meta && d.meta.steps_ordered === false);
    (d.steps || []).forEach(function (s) {
      var missing = s.checks.filter(function (c, i) { return a.checks.indexOf(s.id + ":" + i) < 0; });
      var item = { s: s, done: missing.length === 0, missing: missing };
      r.steps.push(item);
      if (!item.done && !r.stuck && ordered) r.stuck = item;
    });
    var expect = (r.stage && r.stage.expect_done) || [];
    r.debts = r.steps.filter(function (x) { return !x.done && expect.indexOf(x.s.id) > -1; });
    r.allDone = r.steps.length > 0 && r.steps.every(function (x) { return x.done; });
    r.ordered = ordered;
    return r;
  }

  function statusMap(d, r) {
    var m = {};
    if (d.gates && r.verdict) m.gate = "v-" + r.verdict.cls + (r.stop ? " here" : "");
    r.steps.forEach(function (x) {
      var k = x.s.id;
      if (x.done) m[k] = "done";
      else if (r.debts.indexOf(x) > -1) m[k] = "debt";
      else m[k] = "todo";
      if (!r.stop && r.stuck === x) m[k] += " here";
    });
    return m;
  }

  function showResult(d, a, focus) {
    var r = diagnose(d, a);
    var el = document.getElementById("result");
    var h = '<section class="result" aria-labelledby="rt"><h2 id="rt">' + esc(a.who ? a.who + " 的诊断" : "诊断结果") + "</h2>";
    h += routeHtml(d, statusMap(d, r));
    h += '<div class="legend"><span style="--c:var(--line);--b:var(--line)">已完成</span>' + (d.stages ? '<span style="--c:var(--risk);--b:var(--risk-soft)">按规模应完成，但还没做完</span>' : '') + '<span style="--c:var(--rule);--b:var(--paper)">还没到</span></div>';

    if (r.verdict) {
      h += '<div class="rsec"><h3>' + esc(d.gates.title) + '</h3><span class="verdict ' + r.verdict.cls + '">' + esc(r.verdict.text) + "</span>" +
        '<p style="margin:4px 0 8px">' + esc(r.verdict.why) + "</p><ul class=\"gres\">" +
        r.gates.map(function (x) {
          return '<li><span class="pill ' + x.o.outcome + '">' + OUT[x.o.outcome] + "</span><span><b>" + esc(x.g.title) + "</b>：" + esc(x.o.advice) + "</span></li>";
        }).join("") + "</ul></div>";
    }

    if (r.stop) {
      h += '<div class="rsec"><h3>下一步</h3><p>先解决一票否决项：' + esc(vetoNames(r)) + '。在它通过之前，后面的步骤都先暂停，解决后再回来重新诊断。</p></div>' + stepPitfalls(d, gateNo(d));
    } else {
      if (r.stuck) {
        h += '<div class="rsec"><h3>卡在 ' + esc(r.stuck.s.id + " " + r.stuck.s.title) + "</h3>" +
          "<p style=\"margin:0 0 6px\">还没做到：</p>" + list(r.stuck.missing) +
          "<p style=\"margin:12px 0 6px\">最该做的事：</p>" + list(r.stuck.s.actions, "ol") +
          (r.stuck.s.done_signal ? '<p class="note">进入下一步的标志：' + esc(r.stuck.s.done_signal) + "</p>" : "") + "</div>" +
          stepPitfalls(d, r.stuck.s.id);
      } else if (r.allDone) {
        h += '<div class="rsec"><h3>路线已经走完</h3><p>所有步骤的检查项都已做到。按下面的阶段建议持续经营，并定期回来复查。</p></div>';
      } else if (!r.ordered) {
        var miss = r.steps.filter(function (x) { return !x.done; });
        h += '<div class="rsec"><h3>未完成项</h3>' + list(miss.map(function (x) { return x.s.title + "：" + x.missing.join("；"); })) + "</div>";
      }
      var others = r.debts.filter(function (x) { return x !== r.stuck; });
      if (others.length) {
        h += '<div class="rsec"><h3>其他欠账</h3><p style="margin:0 0 6px">按你的规模，这些步骤应该已经完成：</p>' +
          list(others.map(function (x) { return x.s.id + " " + x.s.title + "：" + x.missing.join("；"); })) + "</div>";
      }
      if (r.stage) {
        var lag = r.stuck && r.stage.focus && r.stuck.s.id < r.stage.focus;
        h += '<div class="rsec"><h3>' + esc(r.stage.label) + " 阶段</h3>" +
          (lag ? "<p>按规模，你的重点应该在 " + esc(r.stage.focus) + "，但 " + esc(r.stuck.s.id) + " 还没完成。先回头把它补上，否则后面的投入接不住。</p>" : "") +
          '<div class="cols"><div><p style="margin:0 0 4px;font-weight:600">这个阶段应做</p>' + list(r.stage.dos) + '</div><div><p style="margin:0 0 4px;font-weight:600">这个阶段不该做</p>' + list(r.stage.donts) + "</div></div></div>";
      }
    }
    if (d.caveats && d.caveats.length) h += '<div class="rsec"><h3>使用时注意</h3>' + list(d.caveats) + "</div>";
    h += '<div class="actions"><button class="ghost" type="button" id="copy">复制诊断文字</button><span class="copied" id="copied" aria-live="polite"></span></div>';
    h += "</section>";
    el.innerHTML = h;

    document.getElementById("copy").addEventListener("click", function () {
      var t = plainText(d, a, r);
      var done = function () { document.getElementById("copied").textContent = "已复制"; };
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, function () { fallbackCopy(t); done(); });
      else { fallbackCopy(t); done(); }
    });
    if (focus) { el.scrollIntoView({ behavior: "smooth", block: "start" }); el.focus({ preventScroll: true }); }
  }

  function fallbackCopy(t) {
    var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {} document.body.removeChild(ta);
  }

  function plainText(d, a, r) {
    var L = [];
    L.push("【" + d.title + "】" + (a.who ? a.who + " 的" : "") + "诊断");
    if (r.verdict) {
      L.push("", d.gates.title + "：" + r.verdict.text);
      r.gates.forEach(function (x) { L.push("- " + x.g.title + "（" + OUT[x.o.outcome] + "）：" + x.o.advice); });
    }
    if (r.stop) { L.push("", "下一步：先解决一票否决项（" + vetoNames(r) + "），其他步骤暂停。"); return L.join("\n"); }
    if (r.stage) L.push("", "所处阶段：" + r.stage.label + "（" + r.stage.desc + "）");
    if (r.stuck) {
      L.push("", "卡在：" + r.stuck.s.id + " " + r.stuck.s.title);
      L.push("还没做到：");
      r.stuck.missing.forEach(function (m) { L.push("- " + m); });
      L.push("最该做的事：");
      r.stuck.s.actions.forEach(function (m, i) { L.push((i + 1) + ". " + m); });
      if (r.stuck.s.done_signal) L.push("进入下一步的标志：" + r.stuck.s.done_signal);
      var sp = (d.pitfalls || []).filter(function (p) { return p.step === r.stuck.s.id; });
      if (sp.length) { L.push("这一步常见的错误打法："); sp.forEach(function (p) { L.push("- " + p.title + "。正确做法：" + p.fix); }); }
    } else if (r.allDone) L.push("", "所有步骤的检查项都已做到。");
    var others = r.debts.filter(function (x) { return x !== r.stuck; });
    if (others.length) { L.push("", "其他欠账："); others.forEach(function (x) { L.push("- " + x.s.id + " " + x.s.title); }); }
    if (r.stage) {
      L.push("", "这个阶段应做：" + (r.stage.dos || []).join("；"));
      L.push("这个阶段不该做：" + (r.stage.donts || []).join("；"));
    }
    return L.join("\n");
  }

  /* ---------- pitfalls (错题集) ---------- */
  var CATS = ["产品与定位", "品牌建设", "内容", "达人与投放", "预算与 ROI", "组织与认知"];

  function stepPitfalls(d, stepId) {
    var ps = (d.pitfalls || []).filter(function (p) { return p.step === stepId; });
    if (!ps.length) return "";
    return '<div class="rsec"><h3>这一步常见的错误打法</h3><ul class="pfres">' + ps.map(function (p) {
      return "<li><b>" + esc(p.title) + "</b><span>正确做法：" + esc(p.fix) + "</span></li>";
    }).join("") + '</ul><p class="note"><a href="#/pitfalls/' + esc(d.id) + '">到错题集逐条自查</a></p></div>';
  }

  function pitfallTeaser(ms) {
    var n = 0;
    ms.forEach(function (d) { n += (d.pitfalls || []).length; });
    if (!n) return "";
    return '<a class="pfteaser" href="#/pitfalls"><span class="mtitle">错题集</span>' +
      '<span class="mmeta">' + n + " 条错误打法，来自 " + ms.length + " 套方法论。逐条对照，勾出我们正在犯的。</span></a>";
  }

  function loadAllPitfalls() {
    return load("methodologies/index.json").then(function (idx) {
      return Promise.all(idx.methodologies.map(function (id) { return loadMethod(id).catch(function () { return null; }); }))
        .then(function (ms) {
          return load("pitfalls/team.json").catch(function () { return { pitfalls: [] }; }).then(function (team) {
            var items = [];
            ms.filter(Boolean).forEach(function (d) {
              var names = {};
              (d.steps || []).forEach(function (s) { names[s.id] = s.title; });
              if (d.gates) names[gateNo(d)] = stripNum(d.gates.title);
              (d.pitfalls || []).forEach(function (p) {
                items.push({ p: p, key: d.id + ":" + p.id, src: d.id, srcTitle: d.title,
                  where: (p.step ? p.step + " " + (names[p.step] || "") : "").trim() });
              });
            });
            (team.pitfalls || []).forEach(function (p) {
              items.push({ p: p, key: "team:" + p.id, src: "team", srcTitle: "团队复盘",
                where: [p.project, p.date].filter(Boolean).join("，") });
            });
            return { ms: ms.filter(Boolean), items: items, teamCount: (team.pitfalls || []).length };
          });
        });
    });
  }

  function renderPitfalls(srcFilter) {
    document.title = "错题集 · 营销方法论库";
    loadAllPitfalls().then(function (all) {
      var st = store("pitfalls") || {};
      st.checked = st.checked || [];
      st.cat = st.cat || "";
      st.src = srcFilter || "";
      st.only = !!st.only;

      var srcOpts = '<option value="">全部来源</option>' + all.ms.map(function (d) {
        return '<option value="' + esc(d.id) + '">' + esc(d.title) + "</option>";
      }).join("") + '<option value="team">团队复盘</option>';
      var cats = CATS.filter(function (c) { return all.items.some(function (x) { return x.p.category === c; }); });
      all.items.forEach(function (x) { if (cats.indexOf(x.p.category) < 0) cats.push(x.p.category); });

      app.innerHTML =
        "<h1>错题集</h1>" +
        '<p class="lede">各套方法论里提到的错误打法，以及我们自己复盘出来的坑。逐条对照，勾出我们正在犯的。</p>' +
        '<div class="pfbar">' +
          '<div class="chips" role="group" aria-label="按分类筛选"><button type="button" class="chip" data-cat="">全部</button>' +
            cats.map(function (c) { return '<button type="button" class="chip" data-cat="' + esc(c) + '">' + esc(c) + "</button>"; }).join("") + "</div>" +
          '<div class="pfctl"><label for="pfsrc">来源</label><select id="pfsrc">' + srcOpts + "</select>" +
          '<label class="onlyhit"><input type="checkbox" id="pfonly"> 只看已勾选</label></div>' +
        "</div>" +
        '<div class="pfsum" aria-live="polite"><span id="pfcount"></span><button type="button" class="ghost" id="pfcopy">复制已勾选清单</button><button type="button" class="ghost" id="pfclear">清空勾选</button><span class="copied" id="pfcopied"></span></div>' +
        '<div id="pflist"></div>' +
        '<h2>团队复盘</h2><p class="sub">' + (all.teamCount ? "团队自己踩过的坑共 " + all.teamCount + " 条，已合并在上面的列表里，来源显示为“团队复盘”。" :
          "还没有团队自己的复盘记录。") +
        '新增记录写进仓库的 <a href="https://github.com/ashlandkrug878-wq/yingxiao/blob/main/pitfalls/team.json" target="_blank" rel="noopener">pitfalls/team.json</a>，也可以直接把复盘内容发给 Claude 整理进去。</p>' +
        '<p style="margin-top:40px"><a href="#/">回到方法论列表</a></p>';

      var srcSel = document.getElementById("pfsrc");
      srcSel.value = st.src;
      document.getElementById("pfonly").checked = st.only;

      function save() { store("pitfalls", { checked: st.checked, cat: st.cat, only: st.only }); }
      function draw() {
        document.querySelectorAll(".chip").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-cat") === st.cat ? "true" : "false"); });
        var vis = all.items.filter(function (x) {
          return (!st.cat || x.p.category === st.cat) && (!st.src || x.src === st.src) && (!st.only || st.checked.indexOf(x.key) > -1);
        });
        var groups = cats.filter(function (c) { return vis.some(function (x) { return x.p.category === c; }); });
        var h = groups.map(function (c) {
          var its = vis.filter(function (x) { return x.p.category === c; });
          return '<section class="pfgroup"><h2>' + esc(c) + ' <span class="cnt">' + its.length + "</span></h2>" + its.map(card).join("") + "</section>";
        }).join("");
        document.getElementById("pflist").innerHTML = h || '<p class="empty">' + (st.only ? "还没有勾选任何一条。取消“只看已勾选”可以看到全部。" : "这个筛选条件下没有错误打法。") + "</p>";
        var hit = all.items.filter(function (x) { return st.checked.indexOf(x.key) > -1; }).length;
        document.getElementById("pfcount").textContent = "共 " + all.items.length + " 条，已勾选 " + hit + " 条";
      }
      function card(x) {
        var on = st.checked.indexOf(x.key) > -1;
        var srcLink = x.src === "team" ? esc(x.srcTitle) : '<a href="#/m/' + esc(x.src) + '">' + esc(x.srcTitle) + "</a>";
        return '<article class="pf' + (on ? " hit" : "") + '">' +
          "<h3>" + esc(x.p.title) + "</h3>" +
          "<dl><dt>怎么识别</dt><dd>" + esc(x.p.symptom) + "</dd><dt>为什么错</dt><dd>" + esc(x.p.why) + "</dd><dt>正确做法</dt><dd>" + esc(x.p.fix) + "</dd></dl>" +
          '<div class="pffoot"><span class="pfsrc">来源：' + srcLink + (x.where ? "，" + esc(x.where) : "") + "</span>" +
          '<label class="pfhit"><input type="checkbox" data-k="' + esc(x.key) + '"' + (on ? " checked" : "") + "> 我们正在这样做</label></div>" +
          "</article>";
      }

      document.querySelector(".chips").addEventListener("click", function (e) {
        var b = e.target.closest(".chip"); if (!b) return;
        st.cat = b.getAttribute("data-cat"); save(); draw();
      });
      srcSel.addEventListener("change", function () {
        st.src = srcSel.value;
        history.replaceState(null, "", "#/pitfalls" + (st.src ? "/" + st.src : ""));
        draw();
      });
      document.getElementById("pfonly").addEventListener("change", function (e) { st.only = e.target.checked; save(); draw(); });
      document.getElementById("pflist").addEventListener("change", function (e) {
        var k = e.target.getAttribute("data-k"); if (!k) return;
        var i = st.checked.indexOf(k);
        if (e.target.checked && i < 0) st.checked.push(k);
        if (!e.target.checked && i > -1) st.checked.splice(i, 1);
        e.target.closest(".pf").classList.toggle("hit", e.target.checked);
        save();
        var hit = all.items.filter(function (x) { return st.checked.indexOf(x.key) > -1; }).length;
        document.getElementById("pfcount").textContent = "共 " + all.items.length + " 条，已勾选 " + hit + " 条";
      });
      document.getElementById("pfclear").addEventListener("click", function () { st.checked = []; save(); draw(); });
      document.getElementById("pfcopy").addEventListener("click", function () {
        var hits = all.items.filter(function (x) { return st.checked.indexOf(x.key) > -1; });
        var L = ["【错题集自查】已勾选 " + hits.length + " 条"];
        hits.forEach(function (x, i) {
          L.push("", (i + 1) + ". " + x.p.title + "（" + x.srcTitle + (x.where ? "，" + x.where : "") + "）");
          L.push("   为什么错：" + x.p.why);
          L.push("   正确做法：" + x.p.fix);
        });
        var t = L.join("\n");
        var done = function () { document.getElementById("pfcopied").textContent = hits.length ? "已复制" : "还没有勾选"; };
        if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, function () { fallbackCopy(t); done(); });
        else { fallbackCopy(t); done(); }
      });
      draw();
    }).catch(function (e) { fail(e.message); });
  }

  route();
})();
