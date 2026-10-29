(function () {
  "use strict";

  var HERO_TEXT = "https://resendiz1.github.io/juanpancho-s/";
  var MAX_LENGTH = 2000;
  var DEFAULT_EMPTY_MESSAGE = "Escribe un texto o elige un ejemplo para ver tu QR aquí.";
  var THEME_KEY = "jp-theme";

  var EXAMPLES = {
    url: "https://resendiz1.github.io/juanpancho-s/",
    whatsapp: "https://wa.me/522381501369?text=Hola%20JuanPancho%27s%2C%20quiero%20informaci%C3%B3n.",
    wifi: "WIFI:T:WPA;S:JuanPancho's;P:mi-negocio-2026;;",
    email: "mailto:contacto@tunegocio.mx?subject=Hola%20desde%20mi%20QR",
    text: "Hola desde JuanPancho's QR. Escanea, comparte y conecta.",
    vcard: [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "FN:Tu Negocio",
      "ORG:Tu Negocio",
      "TEL;TYPE=CELL:+521234567890",
      "EMAIL:contacto@tunegocio.mx",
      "END:VCARD"
    ].join("\n")
  };

  var els = {
    form: document.getElementById("qrForm"),
    text: document.getElementById("qrText"),
    error: document.getElementById("qrTextError"),
    charCount: document.getElementById("charCount"),
    size: document.getElementById("qrSize"),
    sizeOut: document.getElementById("qrSizeOut"),
    ecl: document.getElementById("qrEcl"),
    dark: document.getElementById("qrDark"),
    darkHex: document.getElementById("qrDarkHex"),
    light: document.getElementById("qrLight"),
    lightHex: document.getElementById("qrLightHex"),
    margin: document.getElementById("qrMargin"),
    marginOut: document.getElementById("qrMarginOut"),
    contrast: document.getElementById("qrContrast"),
    reset: document.getElementById("qrReset"),
    stage: document.getElementById("qrStage"),
    status: document.getElementById("qrStatus"),
    canvas: document.getElementById("qrCanvas"),
    canvasWrap: document.querySelector(".qr-canvas-wrap"),
    empty: document.getElementById("qrEmpty"),
    emptyText: document.querySelector("#qrEmpty p"),
    meta: document.getElementById("qrMeta"),
    encoded: document.getElementById("qrEncoded"),
    downloadPng: document.getElementById("downloadPng"),
    downloadSvg: document.getElementById("downloadSvg"),
    copyQr: document.getElementById("copyQr"),
    heroQr: document.getElementById("heroQr"),
    themeToggle: document.getElementById("themeToggle")
  };

  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var systemThemeQuery = window.matchMedia("(prefers-color-scheme: light)");

  var generated = false;
  var currentText = "";
  var generateTimer = null;
  var statusTimer = null;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobileMenu = document.getElementById("mobileMenu");
  var navToggle = document.querySelector(".nav-toggle");

  function hexToRgb(hex) {
    var value = hex.replace("#", "");
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function channelLuminance(channel) {
    var value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  }

  function luminance(hex) {
    var rgb = hexToRgb(hex);
    return (
      0.2126 * channelLuminance(rgb.r) +
      0.7152 * channelLuminance(rgb.g) +
      0.0722 * channelLuminance(rgb.b)
    );
  }

  function contrastRatio(first, second) {
    var a = luminance(first);
    var b = luminance(second);
    var lighter = Math.max(a, b);
    var darker = Math.min(a, b);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function getStoredTheme() {
    try {
      var stored = window.localStorage.getItem(THEME_KEY);
      return stored === "light" || stored === "dark" ? stored : null;
    } catch (error) {
      return null;
    }
  }

  function getPreferredTheme() {
    return getStoredTheme() || (systemThemeQuery.matches ? "light" : "dark");
  }

  function syncThemeMeta(theme) {
    if (themeMeta) {
      themeMeta.setAttribute("content", theme === "light" ? "#F7F1E1" : "#0B0D0E");
    }
  }

  function updateThemeButton(theme) {
    if (!els.themeToggle) {
      return;
    }
    var isLight = theme === "light";
    var label = isLight ? "Cambiar a tema oscuro" : "Cambiar a tema claro";
    els.themeToggle.setAttribute("aria-pressed", String(isLight));
    els.themeToggle.setAttribute("aria-label", label);
    els.themeToggle.setAttribute("title", label);
  }

  function applyTheme(theme, persist) {
    var next = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    updateThemeButton(next);
    syncThemeMeta(next);
    if (persist) {
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch (error) {}
    }
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    applyTheme(current === "light" ? "dark" : "light", true);
  }

  function getOptions() {
    return {
      width: Number(els.size.value),
      margin: Number(els.margin.value),
      errorCorrectionLevel: els.ecl.value,
      color: {
        dark: els.dark.value,
        light: els.light.value
      }
    };
  }

  function updateOutputs() {
    var size = Number(els.size.value);
    var margin = Number(els.margin.value);
    els.sizeOut.textContent = size + " px";
    els.marginOut.textContent = margin + (margin === 1 ? " módulo" : " módulos");
    els.darkHex.textContent = els.dark.value.toUpperCase();
    els.lightHex.textContent = els.light.value.toUpperCase();
    els.charCount.textContent = String(els.text.value.length);
  }

  function setStatus(message, type, revert) {
    window.clearTimeout(statusTimer);
    els.status.textContent = message;
    els.status.className = "stage-status";
    if (type) {
      els.status.classList.add("is-" + type);
    }
    if (revert) {
      statusTimer = window.setTimeout(function () {
        if (generated) {
          setStatus("Listo para descargar", "ok", false);
        }
      }, 2400);
    }
  }

  function clearFieldError() {
    els.error.hidden = true;
    els.text.removeAttribute("aria-invalid");
  }

  function showFieldError() {
    els.error.hidden = false;
    els.text.setAttribute("aria-invalid", "true");
  }

  function setEmpty(message, statusMessage, statusType) {
    generated = false;
    currentText = "";
    els.canvasWrap.classList.add("is-empty");
    els.empty.hidden = false;
    els.emptyText.textContent = message || DEFAULT_EMPTY_MESSAGE;
    els.meta.textContent = "—";
    els.encoded.textContent = "Sin contenido todavía.";
    els.encoded.removeAttribute("title");
    els.downloadPng.disabled = true;
    els.downloadSvg.disabled = true;
    els.copyQr.disabled = true;
    els.canvas.setAttribute("aria-label", "Vista previa del código QR generado");
    if (statusMessage) {
      setStatus(statusMessage, statusType, false);
    }
  }

  function markReady(text, options) {
    generated = true;
    currentText = text;
    els.canvasWrap.classList.remove("is-empty");
    els.empty.hidden = true;
    els.meta.textContent = options.width + " PX · " + options.errorCorrectionLevel;
    els.encoded.textContent = text.replace(/\s+/g, " ").trim();
    els.encoded.title = text;
    els.downloadPng.disabled = false;
    els.downloadSvg.disabled = false;
    els.copyQr.disabled = false;
    els.canvas.setAttribute(
      "aria-label",
      "Código QR generado con el contenido: " + text.slice(0, 140)
    );
    setStatus("Listo para descargar", "ok", false);
  }

  function updateContrastNotice() {
    var hasText = els.text.value.trim().length > 0;
    if (!hasText) {
      els.contrast.hidden = true;
      return;
    }

    var ratio = contrastRatio(els.dark.value, els.light.value);
    var inverted = luminance(els.dark.value) > luminance(els.light.value);
    var messages = [];

    if (ratio < 3) {
      messages.push("El contraste entre los colores es muy bajo. El QR podría no escanearse.");
    }
    if (inverted) {
      messages.push("Para una mejor lectura, usa un color oscuro para los módulos y uno claro para el fondo.");
    }

    if (!messages.length) {
      els.contrast.hidden = true;
      els.contrast.classList.remove("is-error");
      return;
    }

    els.contrast.textContent = messages.join(" ");
    els.contrast.hidden = false;
    els.contrast.classList.toggle("is-error", ratio < 3);
  }

  async function generate(options) {
    var config = options || {};
    updateOutputs();
    updateContrastNotice();

    var text = els.text.value;

    if (!text.trim()) {
      clearFieldError();
      setEmpty(
        DEFAULT_EMPTY_MESSAGE,
        config.validate ? "Falta el contenido" : "Esperando contenido",
        config.validate ? "error" : null
      );
      if (config.validate) {
        showFieldError();
        els.text.focus();
      }
      return;
    }

    if (text.length > MAX_LENGTH) {
      showFieldError();
      els.error.textContent = "El texto supera el límite de " + MAX_LENGTH + " caracteres.";
      setEmpty("El texto es demasiado largo.", "Texto demasiado largo", "error");
      return;
    }

    if (!window.QRCode) {
      setEmpty(
        "No se pudo cargar la librería de códigos QR. Revisa tu conexión e inténtalo de nuevo.",
        "Error de carga",
        "error"
      );
      return;
    }

    var qrOptions = getOptions();
    setStatus("Generando QR…", null, false);

    try {
      await window.QRCode.toCanvas(els.canvas, text, qrOptions);
      clearFieldError();
      markReady(text, qrOptions);
    } catch (error) {
      setEmpty(
        "No se pudo generar el QR. Prueba con un texto más corto o un nivel de corrección menor.",
        "No se pudo generar",
        "error"
      );
    }
  }

  function scheduleGenerate(delay) {
    window.clearTimeout(generateTimer);
    generateTimer = window.setTimeout(function () {
      generate();
    }, delay);
  }

  function makeTimestamp() {
    var date = new Date();
    var pad = function (value) {
      return String(value).padStart(2, "0");
    };
    return (
      date.getFullYear() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      "-" +
      pad(date.getHours()) +
      pad(date.getMinutes())
    );
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1200);
  }

  async function buildPngBlob(text, qrOptions) {
    var canvas = document.createElement("canvas");
    await window.QRCode.toCanvas(canvas, text, qrOptions);
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("No se pudo crear el PNG"));
        }
      }, "image/png");
    });
  }

  async function downloadPng() {
    var text = els.text.value;
    if (!text.trim() || !window.QRCode) {
      return;
    }
    try {
      var blob = await buildPngBlob(text, getOptions());
      downloadBlob(blob, "juanpanchos-qr-" + makeTimestamp() + ".png");
      setStatus("PNG descargado", "ok", true);
    } catch (error) {
      setStatus("No se pudo descargar el PNG", "error", true);
    }
  }

  async function downloadSvg() {
    var text = els.text.value;
    if (!text.trim() || !window.QRCode) {
      return;
    }
    try {
      var options = getOptions();
      options.type = "svg";
      var svg = await window.QRCode.toString(text, options);
      var blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      downloadBlob(blob, "juanpanchos-qr-" + makeTimestamp() + ".svg");
      setStatus("SVG descargado", "ok", true);
    } catch (error) {
      setStatus("No se pudo descargar el SVG", "error", true);
    }
  }

  async function copyQr() {
    var text = els.text.value;
    if (!text.trim() || !window.QRCode) {
      return;
    }
    try {
      var blob = await buildPngBlob(text, getOptions());

      if (navigator.clipboard && typeof window.ClipboardItem !== "undefined") {
        try {
          await navigator.clipboard.write([
            new window.ClipboardItem({ "image/png": blob })
          ]);
          setStatus("Imagen copiada", "ok", true);
          return;
        } catch (imageError) {
          if (!navigator.clipboard.writeText) {
            throw imageError;
          }
        }
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setStatus("Contenido copiado", "ok", true);
        return;
      }

      throw new Error("Portapapeles no disponible");
    } catch (error) {
      setStatus("No se pudo copiar", "error", true);
    }
  }

  function fillExample(key) {
    var value = EXAMPLES[key];
    if (!value) {
      return;
    }
    els.text.value = value;
    clearFieldError();
    updateOutputs();
    generate();
  }

  function renderHeroQr() {
    if (!els.heroQr || !window.QRCode) {
      return;
    }
    window.QRCode.toCanvas(els.heroQr, HERO_TEXT, {
      width: 420,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#0B0D0E",
        light: "#FFF2C2"
      }
    }).catch(function () {
      els.heroQr.style.display = "none";
    });
  }

  els.form.addEventListener("submit", function (event) {
    event.preventDefault();
    generate({ validate: true });
  });

  els.text.addEventListener("input", function () {
    updateOutputs();
    if (!els.error.hidden) {
      clearFieldError();
    }
    scheduleGenerate(280);
  });

  [els.size, els.ecl, els.dark, els.light, els.margin].forEach(function (control) {
    control.addEventListener("input", function () {
      updateOutputs();
      updateContrastNotice();
      scheduleGenerate(120);
    });
  });

  els.reset.addEventListener("click", function () {
    els.form.reset();
    updateOutputs();
    updateContrastNotice();
    clearFieldError();
    setEmpty(DEFAULT_EMPTY_MESSAGE, "Esperando contenido", null);
    els.text.focus();
  });

  els.downloadPng.addEventListener("click", downloadPng);
  els.downloadSvg.addEventListener("click", downloadSvg);
  els.copyQr.addEventListener("click", copyQr);

  if (mobileMenu && navToggle) {
    navToggle.setAttribute("aria-expanded", "false");
    mobileMenu.addEventListener("show.bs.offcanvas", function () {
      navToggle.setAttribute("aria-expanded", "true");
    });
    mobileMenu.addEventListener("hide.bs.offcanvas", function () {
      navToggle.setAttribute("aria-expanded", "false");
    });
  }

  document.querySelectorAll("[data-example]").forEach(function (button) {
    button.addEventListener("click", function () {
      var outsideGenerator = !button.closest("#generador");
      fillExample(button.getAttribute("data-example"));
      if (outsideGenerator) {
        document.getElementById("generador").scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start"
        });
      }
    });
  });

  applyTheme(getPreferredTheme(), false);

  if (els.themeToggle) {
    els.themeToggle.addEventListener("click", toggleTheme);
  }

  if (typeof systemThemeQuery.addEventListener === "function") {
    systemThemeQuery.addEventListener("change", function (event) {
      if (!getStoredTheme()) {
        applyTheme(event.matches ? "light" : "dark", false);
      }
    });
  }

  updateOutputs();
  updateContrastNotice();
  setEmpty(DEFAULT_EMPTY_MESSAGE, "Esperando contenido", null);
  renderHeroQr();
})();
