import { processText } from "./processor.js";

const state = {
  i18nData: {},
  metadata: {},
  currentLang: "en",
  currentMode: "XA",
  processingHistory: [],
  charLib: null
};

const $ = (id) => document.getElementById(id);

async function loadI18n() {
  const basePath = window.BASE_PATH || './';
  const [i18nRes, metaRes] = await Promise.all([
    fetch(basePath + "data/i18n.json"),
    fetch(basePath + "data/metadata.json")
  ]);
  state.i18nData = await i18nRes.json();
  state.metadata = await metaRes.json();
}

function setLang(lang) {
  state.currentLang = lang;
  applyLanguage();
}

function t() {
  return state.i18nData[state.currentLang] || state.i18nData["en"];
}

function applyLanguage() {
  const txt = t();
  if (!txt) return;

  const version = state.metadata.version || "";
  const titleWithVersion = version ? `${txt.title} v${version}` : txt.title;
  document.title = txt.title;

  const bindings = {
    "app-title": titleWithVersion,
    "exe-btn": txt.exeVersion,
    "exe-btn-mobile": txt.exeVersion,
    "library-btn-top": txt.library,
    "library-btn-mobile": txt.library,
    "about-btn": txt.about,
    "about-btn-mobile": txt.about,
    "lang-btn": state.currentLang === "zh" ? txt.langEn : txt.langZh,
    "lang-btn-mobile": state.currentLang === "zh" ? txt.langEn : txt.langZh,
    "label-mode-xa": txt.modeXA,
    "label-mode-xb": txt.modeXB,
    "label-suffix": txt.suffix,
    "suffix-none": txt.suffixNone,
    "suffix-ms": txt.suffixMS,
    "suffix-android": txt.suffixAndroid,
    "suffix-num": txt.suffixNum,
    "suffix-custom": txt.suffixCustom,
    "label-custom-prefix": txt.customPrefix,
    "label-custom-suffix": txt.customSuffix,
    "label-custom-repeat": txt.customRepeat,
    "label-custom-repeat-count": txt.customRepeatCount,
    "label-upper": txt.upper,
    "label-lower": txt.lower,
    "label-dbvowel": txt.doubleVowel,
    "label-dbvowel-count": txt.doubleVowelCount,
    "label-numcir": txt.circleNumber,
    "label-hash": txt.addHash,
    "label-hash-length": txt.hashLength,
    "label-preserve-esc": txt.preserveEsc,
    "history-title-text": txt.historyTitle,
    "library-title-text": txt.library,
    "clear-history-btn": txt.historyClear,
    "about-title-text": txt.aboutTitle
  };

  for (const [id, value] of Object.entries(bindings)) {
    const el = $(id);
    if (el) el.textContent = value;
  }

  const inputText = $("input-text");
  const outputText = $("output-text");
  if (inputText) inputText.setAttribute("label", txt.inputPlaceholder);
  if (outputText) outputText.setAttribute("label", txt.outputPlaceholder);

  const buttons = ["process-btn", "clear-btn", "copy-btn", "history-btn", "library-btn"];
  const btnKeys = [txt.process, txt.clear, txt.copy, txt.history, txt.library];
  buttons.forEach((id, i) => {
    const btn = $(id);
    if (btn) btn.textContent = btnKeys[i];
  });

  $("about-content").innerHTML = txt.aboutContent;
}

function showToast(message) {
  const toast = $("toast");
  if (toast) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2000);
  }
}

function showModal(id) {
  const modal = $(id);
  if (modal) {
    modal.classList.remove("hiding");
    modal.style.display = "";
    modal.classList.add("show");
  }
}

function hideModal(id) {
  const modal = $(id);
  if (modal) {
    modal.classList.add("hiding");
    modal.classList.remove("show");
    setTimeout(() => {
      modal.classList.remove("hiding");
      modal.style.display = "none";
    }, 250);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function loadCharLib() {
  if (!state.charLib) {
    const basePath = window.BASE_PATH || './';
    state.charLib = await (await fetch(basePath + "data/character.json")).json();
  }
  return state.charLib;
}

function updateOptionVisibility() {
  const suffix = $("suffix-select")?.value;
  const dbvowel = $("dbvowel")?.selected;
  const addHash = $("addHash")?.selected;

  $("custom-suffix-options").style.display = suffix === "4" ? "block" : "none";
  $("dbvowel-options").style.display = dbvowel ? "block" : "none";
  $("hash-options").style.display = addHash ? "block" : "none";
}

function initEvents() {
  const modeRadios = document.querySelectorAll('md-radio[name="mode"]');
  const updateMode = () => {
    modeRadios.forEach(radio => {
      if (radio.checked) state.currentMode = radio.value;
    });
  };
  modeRadios.forEach(radio => radio.addEventListener('change', updateMode));
  updateMode();

  // Mobile menu toggle
  $("menu-btn")?.addEventListener("click", () => {
    $("mobile-menu")?.classList.toggle("show");
  });

  // Close mobile menu when clicking outside
  document.addEventListener("click", (e) => {
    const menu = $("mobile-menu");
    const btn = $("menu-btn");
    if (menu?.classList.contains("show") &&
      !menu.contains(e.target) &&
      !btn?.contains(e.target)) {
      menu.classList.remove("show");
    }
  });

  const upper = $("upper");
  const lower = $("lower");
  upper?.addEventListener('change', () => {
    if (upper.selected) lower.selected = false;
    updateOptionVisibility();
  });
  lower?.addEventListener('change', () => {
    if (lower.selected) upper.selected = false;
    updateOptionVisibility();
  });

  $("suffix-select")?.addEventListener("change", updateOptionVisibility);
  $("dbvowel")?.addEventListener("change", updateOptionVisibility);
  $("addHash")?.addEventListener("change", updateOptionVisibility);

  $("process-btn")?.addEventListener("click", async () => {
    const text = $("input-text")?.value || "";
    const options = {
      mode: state.currentMode,
      upper: $("upper")?.selected,
      lower: $("lower")?.selected,
      suffix: $("suffix-select")?.value || "0",
      customPrefix: $("custom-prefix")?.value || "",
      customSuffix: $("custom-suffix")?.value || "",
      customRepeat: $("custom-repeat")?.value || "",
      customRepeatCount: parseInt($("custom-repeat-count")?.value) || 7,
      dbvowel: $("dbvowel")?.selected,
      dbvowelCount: parseInt($("dbvowel-count")?.value) || 1,
      numcir: $("numcir")?.selected,
      addHash: $("addHash")?.selected,
      hashLength: parseInt($("hash-length")?.value) || 6,
      preserveEsc: $("preserveEsc")?.selected
    };
    try {
      const result = await processText(text, options);
      $("output-text").value = result;
      if (text.trim()) {
        state.processingHistory.unshift({
          timestamp: new Date().toLocaleString(state.currentLang === "zh" ? "zh-CN" : "en-US"),
          input: text,
          output: result
        });
      }
    } catch (e) {
      $("output-text").value = "Error: " + e.message;
    }
  });

  $("clear-btn")?.addEventListener("click", () => {
    $("input-text").value = "";
    $("output-text").value = "";
  });

  $("copy-btn")?.addEventListener("click", async () => {
    const val = $("output-text")?.value;
    if (val) {
      await navigator.clipboard.writeText(val);
      showToast(t().copySuccess || "Copied!");
    }
  });

  $("history-btn")?.addEventListener("click", () => {
    const content = $("history-content");
    const txt = t();
    if (state.processingHistory.length === 0) {
      content.innerHTML = `<p>${txt.historyEmpty}</p>`;
    } else {
      content.innerHTML = state.processingHistory.map((item, i) => `
        <div class="history-item">
          <div class="history-timestamp">${i + 1}. ${item.timestamp}</div>
          <div class="history-text">
            <div class="history-row"><span class="history-label">${txt.historyInput}</span> <span class="history-input">${escapeHtml(item.input)}</span></div>
            <div class="history-row"><span class="history-label">${txt.historyOutput}</span> <span class="history-output">${escapeHtml(item.output)}</span></div>
          </div>
        </div>
      `).join('');
    }
    showModal("history-modal");
  });

  $("clear-history-btn")?.addEventListener("click", () => {
    state.processingHistory = [];
    $("history-content").innerHTML = `<p>${t().historyCleared}</p>`;
  });

  $("library-btn-top")?.addEventListener("click", async () => {
    const lib = await loadCharLib();
    const txt = t();
    let html = '<table class="library-table"><thead><tr>';
    html += `<th>${txt.libraryCharacter}</th><th>${txt.libraryVariants}</th><th>${txt.libraryCount}</th></tr></thead><tbody>`;

    for (const [char, variants] of Object.entries(lib)) {
      if (Array.isArray(variants)) {
        html += `<tr><td><strong>${escapeHtml(char)}</strong></td><td class="library-variants">${escapeHtml(variants.join(' '))}</td><td>${variants.length}</td></tr>`;
      }
    }
    html += `</tbody></table><p class="library-total">${txt.libraryTotal.replace('{count}', Object.keys(lib).length)}</p>`;

    $("library-content").innerHTML = html;
    showModal("library-modal");
  });

  $("about-btn")?.addEventListener("click", () => showModal("about-modal"));

  // Mobile menu buttons
  $("library-btn-mobile")?.addEventListener("click", async () => {
    $("mobile-menu")?.classList.remove("show");
    const lib = await loadCharLib();
    const txt = t();
    let html = '<table class="library-table"><thead><tr>';
    html += `<th>${txt.libraryCharacter}</th><th>${txt.libraryVariants}</th><th>${txt.libraryCount}</th></tr></thead><tbody>`;
    for (const [char, variants] of Object.entries(lib)) {
      if (Array.isArray(variants)) {
        html += `<tr><td><strong>${escapeHtml(char)}</strong></td><td class="library-variants">${escapeHtml(variants.join(' '))}</td><td>${variants.length}</td></tr>`;
      }
    }
    html += `</tbody></table><p class="library-total">${txt.libraryTotal.replace('{count}', Object.keys(lib).length)}</p>`;
    $("library-content").innerHTML = html;
    showModal("library-modal");
  });

  $("about-btn-mobile")?.addEventListener("click", () => {
    $("mobile-menu")?.classList.remove("show");
    showModal("about-modal");
  });

  $("lang-btn-mobile")?.addEventListener("click", () => {
    $("mobile-menu")?.classList.remove("show");
    setLang(state.currentLang === "zh" ? "en" : "zh");
  });

  $("github-btn-mobile")?.addEventListener("click", () => {
    $("mobile-menu")?.classList.remove("show");
    window.open("https://github.com/suntrise/pseudo", "_blank");
  });

  $("exe-btn")?.addEventListener("click", () => {
    window.open("https://github.com/suntrise/Pseudo-localization-Demo", "_blank");
  });

  $("exe-btn-mobile")?.addEventListener("click", () => {
    $("mobile-menu")?.classList.remove("show");
    window.open("https://github.com/suntrise/Pseudo-localization-Demo", "_blank");
  });

  $("lang-btn")?.addEventListener("click", () => setLang(state.currentLang === "zh" ? "en" : "zh"));

  const modalEvents = [
    ["close-history-btn", "history-modal"],
    ["history-backdrop", "history-modal"],
    ["close-library-btn", "library-modal"],
    ["library-backdrop", "library-modal"],
    ["close-about-btn", "about-modal"],
    ["about-backdrop", "about-modal"]
  ];
  modalEvents.forEach(([btnId, modalId]) => {
    $(btnId)?.addEventListener("click", () => hideModal(modalId));
  });
}

async function initializeApp() {
  await loadI18n();
  state.currentLang = navigator.language?.startsWith("zh") ? "zh" : "en";

  await new Promise(r => setTimeout(r, 100));

  applyLanguage();
  initEvents();
  updateOptionVisibility();
}

initializeApp();
