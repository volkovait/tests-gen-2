/**
 * Фиксированный рантайм интерактивного теста: читает JSON из #lesson-spec,
 * рендерит вопросы, проверяет ответы, отправляет итог в /api/lesson-send-telegram.
 */
(function lessonRuntime() {
  "use strict";

  function readSpec() {
    const el = document.getElementById("lesson-spec");
    if (!el || !el.textContent) {
      throw new Error("Не найден элемент #lesson-spec с JSON теста");
    }
    const spec = JSON.parse(el.textContent);
    if (!spec || spec.version !== 1 || !Array.isArray(spec.parts)) {
      throw new Error("Некорректная спецификация теста (version/parts)");
    }
    if (!spec.runtime || typeof spec.runtime.localStorageKey !== "string") {
      throw new Error("Нет runtime.localStorageKey");
    }
    return spec;
  }

  var SPEC = null;
  try {
    SPEC = readSpec();
  } catch (e) {
    console.error("[lesson-test] spec parse failed", e);
    document.body.innerHTML =
      '<p style="padding:1rem;font-family:system-ui">Ошибка загрузки теста. Обновите страницу.</p>';
    return;
  }

  var TEST_BLUEPRINT = SPEC.parts;
  var LS_KEY = SPEC.runtime.localStorageKey;

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /** Убирает дублирующий префикс «Key)» в начале текста (в т.ч. для ключей из одной буквы). */
  function stripDuplicateOptionPrefix(key, text) {
    var t = String(text).trim();
    var k = String(key).trim();
    if (!k) return t;
    var re = new RegExp("^" + escapeRegExp(k) + "\\)\\s*", "i");
    var out = t.replace(re, "").trim();
    if (out.length > 0) return out;
    var letter = k.charAt(0);
    if (!letter) return t;
    var reLetter = new RegExp("^" + escapeRegExp(letter) + "\\)\\s*", "i");
    out = t.replace(reLetter, "").trim();
    return out.length > 0 ? out : t;
  }

  function optionCaption(key, text) {
    var cleaned = stripDuplicateOptionPrefix(key, text);
    return String(key) + ") " + cleaned;
  }

  function shuffleCopy(array) {
    var a = array.slice();
    for (var i = a.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  var FLAT_QUESTIONS = [];
  var serial = 1;
  for (var pi = 0; pi < TEST_BLUEPRINT.length; pi += 1) {
    var part = TEST_BLUEPRINT[pi];
    for (var ei = 0; ei < part.exercises.length; ei += 1) {
      var ex = part.exercises[ei];
      var inputKind = ex.inputKind || "radio";
      for (var qi = 0; qi < ex.questions.length; qi += 1) {
        var q = ex.questions[qi];
        FLAT_QUESTIONS.push({
          serial: serial,
          partTitle: part.title,
          exTitle: ex.title,
          ex: ex,
          q: q,
          inputKind: inputKind,
        });
        serial += 1;
      }
    }
  }

  function formatAnswerLine(key, options) {
    if (!options || !key) return "(нет вариантов)";
    for (var oi = 0; oi < options.length; oi += 1) {
      if (options[oi].key === key) {
        return optionCaption(options[oi].key, options[oi].text);
      }
    }
    return String(key) + ") (нет ответа)";
  }

  function correctAnswerDisplay(item) {
    var q = item.q;
    var inputKind = item.inputKind;
    if (inputKind === "wordOrder" && q.correctSentence) {
      return q.correctSentence;
    }
    if (q.correctKey && q.options) {
      return formatAnswerLine(q.correctKey, q.options);
    }
    return "—";
  }

  function normalizeSentence(s) {
    return String(s)
      .replace(/\s+/g, " ")
      .replace(/\s+([.,?!])/g, "$1")
      .trim();
  }

  function isAnswerCorrect(item, chosen) {
    var q = item.q;
    var inputKind = item.inputKind;
    if (inputKind === "wordOrder") {
      var c = q.correctSentence ? normalizeSentence(q.correctSentence) : "";
      var s = chosen ? normalizeSentence(chosen) : "";
      return c.length > 0 && c === s;
    }
    return chosen === (q.correctKey || "");
  }

  function studentAnswerDisplay(item, chosen) {
    var q = item.q;
    var inputKind = item.inputKind;
    if (inputKind === "wordOrder") {
      return chosen.trim() === "" ? "(нет ответа)" : chosen;
    }
    if (!q.options) return chosen || "(нет ответа)";
    if (chosen === "") return "(нет ответа)";
    return formatAnswerLine(chosen, q.options);
  }

  var wordOrderRefreshers = {};
  var wordOrderState = {};

  function getWordOrderSentence(qid) {
    var st = wordOrderState[qid];
    if (!st) return "";
    return st.answer.join(" ");
  }

  function syncWordOrderHiddenInput(qid) {
    var el = document.getElementById("wo_hidden_" + qid);
    if (el) el.value = getWordOrderSentence(qid);
  }

  function renderWordOrderQuestion(qEl, q) {
    var bank = shuffleCopy(q.wordBank || []);
    wordOrderState[q.id] = { bank: bank, answer: [] };

    var wrap = document.createElement("div");
    wrap.className = "word-order-wrap";
    wrap.innerHTML =
      '<p class="wo-bank-label">Слова (нажмите или перетащите в поле ниже)</p>' +
      '<div class="wo-bank" data-wo-bank="' +
      escapeHtml(q.id) +
      '" aria-label="Банк слов"></div>' +
      '<p class="wo-answer-label">Ваше предложение</p>' +
      '<div class="wo-answer" data-wo-answer="' +
      escapeHtml(q.id) +
      '" aria-label="Собранное предложение"></div>' +
      '<input type="hidden" class="wo-hidden" id="wo_hidden_' +
      escapeHtml(q.id) +
      '" name="answer_' +
      escapeHtml(q.id) +
      '" value="" />' +
      '<p class="wo-hint">Слово из нижней строки можно нажать, чтобы вернуть его в банк.</p>';
    qEl.appendChild(wrap);

    var bankEl = wrap.querySelector(".wo-bank");
    var answerEl = wrap.querySelector(".wo-answer");
    if (!bankEl || !answerEl) return;

    function renderChips() {
      var st = wordOrderState[q.id];
      if (!st) return;
      bankEl.innerHTML = "";
      answerEl.innerHTML = "";
      for (var bi = 0; bi < st.bank.length; bi += 1) {
        bankEl.appendChild(makeWordChip(q.id, st.bank[bi], "bank"));
      }
      for (var ai = 0; ai < st.answer.length; ai += 1) {
        answerEl.appendChild(makeWordChip(q.id, st.answer[ai], "answer"));
      }
      syncWordOrderHiddenInput(q.id);
      scheduleSave();
    }

    function makeWordChip(qid, token, zone) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "wo-chip";
      btn.textContent = token;
      btn.draggable = true;
      btn.dataset.token = token;
      btn.dataset.zone = zone;
      btn.dataset.qid = qid;
      btn.addEventListener("click", function () {
        if (document.body.classList.contains("test-locked")) return;
        var st2 = wordOrderState[qid];
        if (!st2) return;
        if (zone === "bank") {
          st2.bank = st2.bank.filter(function (t) {
            return t !== token;
          });
          st2.answer.push(token);
        } else {
          st2.answer = st2.answer.filter(function (t) {
            return t !== token;
          });
          st2.bank.push(token);
        }
        renderChips();
      });
      btn.addEventListener("dragstart", function (ev) {
        ev.dataTransfer.setData("text/plain", qid + "|" + token + "|" + zone);
        ev.dataTransfer.effectAllowed = "move";
      });
      return btn;
    }

    answerEl.addEventListener("dragover", function (ev) {
      ev.preventDefault();
      answerEl.classList.add("wo-drag-over");
    });
    answerEl.addEventListener("dragleave", function () {
      answerEl.classList.remove("wo-drag-over");
    });
    answerEl.addEventListener("drop", function (ev) {
      ev.preventDefault();
      answerEl.classList.remove("wo-drag-over");
      if (document.body.classList.contains("test-locked")) return;
      var raw = ev.dataTransfer.getData("text/plain");
      if (!raw) return;
      var parts = raw.split("|");
      var qid = parts[0];
      var token = parts[1];
      var zone = parts[2];
      if (qid !== q.id) return;
      var st2 = wordOrderState[q.id];
      if (!st2) return;
      if (zone === "bank") {
        st2.bank = st2.bank.filter(function (t) {
          return t !== token;
        });
        st2.answer.push(token);
      }
      renderChips();
    });

    bankEl.addEventListener("dragover", function (ev) {
      ev.preventDefault();
    });
    bankEl.addEventListener("drop", function (ev) {
      ev.preventDefault();
      if (document.body.classList.contains("test-locked")) return;
      var raw = ev.dataTransfer.getData("text/plain");
      if (!raw) return;
      var parts2 = raw.split("|");
      var qid2 = parts2[0];
      var token2 = parts2[1];
      var zone2 = parts2[2];
      if (qid2 !== q.id) return;
      var st3 = wordOrderState[q.id];
      if (!st3) return;
      if (zone2 === "answer") {
        st3.answer = st3.answer.filter(function (t) {
          return t !== token2;
        });
        st3.bank.push(token2);
      }
      renderChips();
    });

    renderChips();
    wordOrderRefreshers[q.id] = renderChips;
  }

  function remainingBankTokens(wordBank, answer) {
    var counts = {};
    for (var wi = 0; wi < wordBank.length; wi += 1) {
      var w = wordBank[wi];
      counts[w] = (counts[w] || 0) + 1;
    }
    for (var ai = 0; ai < answer.length; ai += 1) {
      counts[answer[ai]] -= 1;
    }
    var bank = [];
    for (var wj = 0; wj < wordBank.length; wj += 1) {
      var w2 = wordBank[wj];
      while (counts[w2] > 0) {
        bank.push(w2);
        counts[w2] -= 1;
      }
    }
    return bank;
  }

  function multisetSameTokens(a, b) {
    return a
      .slice()
      .sort()
      .join("\u0001") === b.slice().sort().join("\u0001");
  }

  function applySavedWordOrder(qid, answerArr) {
    var flat = null;
    for (var fi = 0; fi < FLAT_QUESTIONS.length; fi += 1) {
      if (FLAT_QUESTIONS[fi].q.id === qid) {
        flat = FLAT_QUESTIONS[fi];
        break;
      }
    }
    if (!flat || flat.inputKind !== "wordOrder" || !flat.q.wordBank) return;
    var q = flat.q;
    var st = wordOrderState[qid];
    if (!st || !Array.isArray(answerArr)) return;
    var merged = answerArr.concat(remainingBankTokens(q.wordBank, answerArr));
    if (!multisetSameTokens(merged, q.wordBank)) return;
    st.answer = answerArr.slice();
    st.bank = remainingBankTokens(q.wordBank, answerArr);
    if (wordOrderRefreshers[qid]) wordOrderRefreshers[qid]();
  }

  var saveTimer = 0;
  var suppressSave = true;

  function scheduleSave() {
    if (suppressSave) return;
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveFormState, 200);
  }

  function loadFormState() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function saveFormState() {
    var nameInput = document.getElementById("student-name");
    var answers = collectAnswers();
    var payload = { v: 1, name: nameInput ? nameInput.value : "", answers: answers };
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
      console.log("[lesson-test] saved state", Object.keys(answers).length, "answers");
    } catch (e) {
      /* quota */
    }
  }

  function applyFormState(state) {
    if (!state || typeof state !== "object") return;
    var nameInput = document.getElementById("student-name");
    if (nameInput && typeof state.name === "string") nameInput.value = state.name;
    var ans = state.answers && typeof state.answers === "object" ? state.answers : {};
    for (var ii = 0; ii < FLAT_QUESTIONS.length; ii += 1) {
      var item = FLAT_QUESTIONS[ii];
      var q = item.q;
      var inputKind = item.inputKind;
      var v = ans[q.id];
      if (v === undefined || v === null) continue;
      if (inputKind === "wordOrder" && Array.isArray(v)) {
        applySavedWordOrder(q.id, v);
        continue;
      }
      if (inputKind === "select") {
        var sel = document.getElementById("answer_select_" + q.id);
        if (sel && typeof v === "string") sel.value = v;
        continue;
      }
      if (typeof v !== "string" || v === "") continue;
      var esc =
        typeof CSS !== "undefined" && CSS.escape
          ? CSS.escape(v)
          : v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      var input = document.querySelector('input[name="answer_' + q.id + '"][value="' + esc + '"]');
      if (input) input.checked = true;
    }
  }

  function bindAutosave() {
    var root = ensureTestRoot();
    if (root) root.addEventListener("change", scheduleSave);
    var sn = document.getElementById("student-name");
    if (sn) sn.addEventListener("input", scheduleSave);
  }

  function ensureTestRoot() {
    var el = document.getElementById("test-root");
    if (el) return el;
    var page = document.querySelector(".page");
    var actions = document.querySelector(".actions");
    el = document.createElement("div");
    el.id = "test-root";
    el.className = "test-root";
    el.setAttribute("role", "main");
    if (page && actions && actions.parentNode === page) {
      page.insertBefore(el, actions);
    } else if (page) {
      page.appendChild(el);
    } else {
      document.body.appendChild(el);
    }
    return el;
  }

  function renderReadingPassageHtml(rp) {
    if (!rp || !rp.paragraphs || !rp.paragraphs.length) return "";
    var title = rp.title ? "<h3>" + escapeHtml(rp.title) + "</h3>" : "";
    var instr = rp.instruction ? '<p class="instruction">' + escapeHtml(rp.instruction) + "</p>" : "";
    var ps = "";
    for (var pi = 0; pi < rp.paragraphs.length; pi += 1) {
      ps += "<p>" + escapeHtml(rp.paragraphs[pi]) + "</p>";
    }
    return (
      '<article class="exercise reading-passage">' +
      title +
      instr +
      '<div class="passage" lang="en">' +
      ps +
      "</div></article>"
    );
  }

  function renderTest() {
    var root = ensureTestRoot();
    root.replaceChildren();

    for (var pi = 0; pi < TEST_BLUEPRINT.length; pi += 1) {
      var part = TEST_BLUEPRINT[pi];
      var partEl = document.createElement("section");
      partEl.className = "part";
      partEl.innerHTML = '<h2 class="part-title">' + escapeHtml(part.title) + "</h2>";
      root.appendChild(partEl);

      for (var ei = 0; ei < part.exercises.length; ei += 1) {
        var ex = part.exercises[ei];
        if (ex.readingPassage) {
          partEl.insertAdjacentHTML("beforeend", renderReadingPassageHtml(ex.readingPassage));
        }

        var exEl = document.createElement("article");
        exEl.className = "exercise";

        var html = "<h3>" + escapeHtml(ex.title) + "</h3>";
        if (ex.instruction) {
          html += '<p class="instruction">' + escapeHtml(ex.instruction) + "</p>";
        }
        if (ex.audio) {
          html +=
            '<div class="audio-block"><audio controls preload="none"></audio><p class="audio-hint">Аудиофайл будет добавлен позже.</p></div>';
        }
        exEl.innerHTML = html;

        var inputKind = ex.inputKind || "radio";

        for (var qi = 0; qi < ex.questions.length; qi += 1) {
          var q = ex.questions[qi];
          var num = 0;
          for (var fi = 0; fi < FLAT_QUESTIONS.length; fi += 1) {
            if (FLAT_QUESTIONS[fi].q.id === q.id) {
              num = FLAT_QUESTIONS[fi].serial;
              break;
            }
          }

          var qEl = document.createElement("div");
          qEl.className = "question";
          qEl.dataset.qid = q.id;

          var inner = '<div class="question-id">Вопрос ' + num + "</div>";
          inner += '<p class="question-prompt">' + escapeHtml(q.prompt) + "</p>";
          qEl.innerHTML = inner;

          if (inputKind === "wordOrder") {
            renderWordOrderQuestion(qEl, q);
          } else if (inputKind === "select" && q.options) {
            var selId = "answer_select_" + q.id;
            var sel =
              '<label class="select-wrap" for="' +
              escapeHtml(selId) +
              '"><span class="visually-hidden">Ответ</span>';
            sel +=
              '<select class="answer-select" id="' +
              escapeHtml(selId) +
              '" name="answer_' +
              escapeHtml(q.id) +
              '">';
            sel += '<option value="">— выберите —</option>';
            for (var oi = 0; oi < q.options.length; oi += 1) {
              var opt = q.options[oi];
              sel +=
                '<option value="' +
                escapeHtml(opt.key) +
                '">' +
                escapeHtml(optionCaption(opt.key, opt.text)) +
                "</option>";
            }
            sel += "</select></label>";
            var holder = document.createElement("div");
            holder.className = "options";
            holder.innerHTML = sel;
            qEl.appendChild(holder);
          } else if (q.options) {
            var groupName = "answer_" + q.id;
            var opts = document.createElement("div");
            opts.className = "options";
            var radioHtml = "";
            for (var oj = 0; oj < q.options.length; oj += 1) {
              var op = q.options[oj];
              var inputId = q.id + "_" + op.key;
              radioHtml += '<label class="option" for="' + escapeHtml(inputId) + '">';
              radioHtml +=
                '<input type="radio" name="' +
                escapeHtml(groupName) +
                '" id="' +
                escapeHtml(inputId) +
                '" value="' +
                escapeHtml(op.key) +
                '" />';
              radioHtml += "<span>" + escapeHtml(optionCaption(op.key, op.text)) + "</span>";
              radioHtml += "</label>";
            }
            opts.innerHTML = radioHtml;
            qEl.appendChild(opts);
          }

          exEl.appendChild(qEl);
        }

        partEl.appendChild(exEl);
      }
    }
  }

  function collectAnswers() {
    var out = {};
    for (var i = 0; i < FLAT_QUESTIONS.length; i += 1) {
      var item = FLAT_QUESTIONS[i];
      var q = item.q;
      var inputKind = item.inputKind;
      if (inputKind === "wordOrder") {
        out[q.id] = wordOrderState[q.id] ? wordOrderState[q.id].answer.slice() : [];
        continue;
      }
      if (inputKind === "select") {
        var sel = document.getElementById("answer_select_" + q.id);
        out[q.id] = sel && sel.value ? sel.value : "";
        continue;
      }
      var group = document.querySelector('input[name="answer_' + q.id + '"]:checked');
      out[q.id] = group ? group.value : "";
    }
    return out;
  }

  function gradeAnswers(answers) {
    var score = 0;
    var rows = [];
    for (var i = 0; i < FLAT_QUESTIONS.length; i += 1) {
      var item = FLAT_QUESTIONS[i];
      var q = item.q;
      var raw = answers[q.id];
      var chosen =
        item.inputKind === "wordOrder"
          ? Array.isArray(raw)
            ? raw.join(" ")
            : ""
          : typeof raw === "string"
            ? raw
            : "";
      var ok = isAnswerCorrect(item, chosen);
      if (ok) score += 1;
      var correctLine = correctAnswerDisplay(item);
      var studentLine =
        chosen === "" || (Array.isArray(raw) && raw.length === 0)
          ? "(нет ответа) ❌"
          : studentAnswerDisplay(item, chosen) + (ok ? " ✅" : " ❌");
      rows.push({
        serial: item.serial,
        qid: q.id,
        correctLine: correctLine,
        studentLine: studentLine,
        ok: ok,
      });
    }
    return { score: score, rows: rows, max: FLAT_QUESTIONS.length };
  }

  function highlightResults(result) {
    for (var ri = 0; ri < result.rows.length; ri += 1) {
      var row = result.rows[ri];
      var el = document.querySelector('.question[data-qid="' + row.qid + '"]');
      if (!el) continue;
      el.classList.remove("question-correct", "question-incorrect");
      if (row.ok) el.classList.add("question-correct");
      else el.classList.add("question-incorrect");
    }
  }

  function buildTelegramPre(studentName, result) {
    var lines = [];
    lines.push("Студент: " + studentName);
    lines.push("Балл: " + result.score + " из " + result.max);
    lines.push("");
    lines.push("№ | Правильный ответ | Ответ студента");
    lines.push("--+------------------+----------------");
    for (var i = 0; i < result.rows.length; i += 1) {
      var row = result.rows[i];
      var n = String(row.serial).padStart(2, " ");
      lines.push(n + " | " + row.correctLine + " | " + row.studentLine);
    }
    return lines.join("\n");
  }

  async function sendTelegramHtmlChunk(htmlBody) {
    console.log("[lesson-test] POST /api/lesson-send-telegram (chunk)");
    var res = await fetch("/api/lesson-send-telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ parts: [htmlBody], parse_mode: "HTML" }),
    });
    var data = await res.json().catch(function () {
      return null;
    });
    if (!res.ok || !data || data.ok !== true) {
      var desc =
        data && typeof data.description === "string"
          ? data.description
          : data && typeof data.error === "string"
            ? data.error
            : res.statusText;
      throw new Error(desc || "Ошибка отправки (прокси / Telegram)");
    }
    console.log("[lesson-test] telegram chunk ok");
  }

  async function sendTelegramPreTable(prePlain) {
    var maxLen = 3500;
    var lines = prePlain.split("\n");
    var chunks = [];
    var buf = [];
    var len = 0;

    function flush() {
      if (buf.length) {
        chunks.push(buf.join("\n"));
        buf = [];
        len = 0;
      }
    }

    for (var li = 0; li < lines.length; li += 1) {
      var line = lines[li];
      var add = line.length + (buf.length ? 1 : 0);
      if (len + add > maxLen && buf.length) {
        flush();
      }
      buf.push(line);
      len += add;
    }
    flush();

    for (var ci = 0; ci < chunks.length; ci += 1) {
      var header = chunks.length > 1 ? "Сообщение " + (ci + 1) + " из " + chunks.length + "\n\n" : "";
      var html = "<pre>" + escapeHtml(header + chunks[ci]) + "</pre>";
      await sendTelegramHtmlChunk(html);
    }
  }

  function lockTest() {
    document.body.classList.add("test-locked");
    var nodes = document.querySelectorAll(
      '#test-root input[type="radio"], #test-root input[type="hidden"], #test-root select, #student-name, #finish-btn',
    );
    for (var i = 0; i < nodes.length; i += 1) {
      nodes[i].setAttribute("disabled", "disabled");
    }
    var chips = document.querySelectorAll(".wo-chip");
    for (var j = 0; j < chips.length; j += 1) {
      chips[j].setAttribute("disabled", "disabled");
      chips[j].removeAttribute("draggable");
    }
  }

  function init() {
    console.log("[lesson-test] init, questions:", FLAT_QUESTIONS.length);
    try {
      suppressSave = true;
      renderTest();
      applyFormState(loadFormState());
      bindAutosave();
      suppressSave = false;
      console.log("[lesson-test] render complete");
    } catch (err) {
      var root = ensureTestRoot();
      var msg = err instanceof Error ? err.message : String(err);
      root.innerHTML =
        '<p class="init-error">Не удалось построить тест: ' +
        escapeHtml(msg) +
        ". Откройте консоль браузера (F12) для подробностей.</p>";
      console.error(err);
      return;
    }

    var btn = document.getElementById("finish-btn");
    var nameInput = document.getElementById("student-name");
    var panel = document.getElementById("result-panel");
    var scoreLine = document.getElementById("score-line");
    var tgStatus = document.getElementById("telegram-status");
    var tgError = document.getElementById("telegram-error");

    if (!btn) {
      console.error("[lesson-test] missing #finish-btn");
      return;
    }

    btn.addEventListener("click", async function () {
      var studentName = (nameInput && nameInput.value.trim()) || "";
      if (!studentName) {
        alert("Введите ФИО в начале страницы.");
        if (nameInput) nameInput.focus();
        return;
      }

      var answers = collectAnswers();
      console.log("[lesson-test] grading, answer keys:", Object.keys(answers).length);
      var result = gradeAnswers(answers);
      console.log("[lesson-test] score", result.score, "/", result.max);
      highlightResults(result);
      saveFormState();

      if (scoreLine) {
        scoreLine.textContent = "Набрано баллов: " + result.score + " из " + result.max;
      }
      if (panel) panel.classList.add("visible");
      if (tgStatus) tgStatus.textContent = "Отправка в Telegram…";
      if (tgError) tgError.textContent = "";

      var pre = buildTelegramPre(studentName, result);

      try {
        await sendTelegramPreTable(pre);
        if (tgStatus) tgStatus.textContent = "Результаты отправлены в Telegram.";
      } catch (e) {
        var emsg = e instanceof Error ? e.message : String(e);
        if (tgStatus) tgStatus.textContent = "Не удалось отправить в Telegram.";
        if (tgError) tgError.textContent = emsg;
        console.error("[lesson-test] telegram error", emsg);
      }

      lockTest();
      saveFormState();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
