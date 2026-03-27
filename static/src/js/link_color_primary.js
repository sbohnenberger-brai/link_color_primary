/** @odoo-module **/

import { whenReady } from "@odoo/owl";

const DEFAULT_FALLBACK_COLOR = "#005bbb";
const ODOO_GREEN = "#008f8c";

function normalize(value) {
    return (value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function normalizeHex(value) {
    const v = normalize(value);
    if (!v) return "";
    return v;
}

function isHexColor(value) {
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test((value || "").trim());
}

function getConfiguredColor() {
    const root = document.documentElement;
    const dataColor = root.dataset.linkColorPrimary;
    if (isHexColor(dataColor)) {
        return dataColor.trim();
    }
    return DEFAULT_FALLBACK_COLOR;
}

async function fetchConfiguredColor() {
    try {
        const response = await fetch("/web/dataset/call_kw/ir.config_parameter/get_param", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "same-origin",
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "call",
                params: {
                    model: "ir.config_parameter",
                    method: "get_param",
                    args: ["link_color_primary.color", DEFAULT_FALLBACK_COLOR],
                    kwargs: {},
                },
                id: Date.now(),
            }),
        });

        const payload = await response.json();
        const value = payload && payload.result;
        const color = isHexColor(value) ? value.trim() : DEFAULT_FALLBACK_COLOR;

        document.documentElement.dataset.linkColorPrimary = color;
        return color;
    } catch {
        document.documentElement.dataset.linkColorPrimary = DEFAULT_FALLBACK_COLOR;
        return DEFAULT_FALLBACK_COLOR;
    }
}

function setImportant(el, prop, value) {
    try {
        el.style.setProperty(prop, value, "important");
    } catch {
        // ignore
    }
}

function hasBackground(el) {
    if (!(el instanceof HTMLElement)) return false;

    const style = el.getAttribute("style") || "";
    const computed = getComputedStyle(el);

    return (
        style.includes("background-color") ||
        (computed.backgroundColor && computed.backgroundColor !== "rgba(0, 0, 0, 0)" && computed.backgroundColor !== "transparent")
    );
}

function replaceGreenInStyle(el, targetColor) {
    const style = el.getAttribute("style");
    if (!style) return false;
    const updated = style.replace(/#008f8c/gi, targetColor);
    if (updated !== style) {
        el.setAttribute("style", updated);
        return true;
    }
    return false;
}

function patchInputValue(input, targetColor) {
    if (!(input instanceof HTMLInputElement)) return false;

    const candidates = [
        input.value,
        input.getAttribute("value"),
        input.placeholder,
    ].filter(Boolean);

    let touched = false;
    for (const candidate of candidates) {
        if (normalizeHex(candidate) === ODOO_GREEN) {
            input.value = targetColor;
            input.setAttribute("value", targetColor);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
            touched = true;
            break;
        }
    }
    return touched;
}

function patchPaletteElement(el, targetColor) {
    if (!(el instanceof HTMLElement)) return false;

    let touched = false;

    if (normalizeHex(el.dataset.color) === ODOO_GREEN) {
        el.dataset.color = targetColor;
        touched = true;
    }
    if (normalizeHex(el.dataset.value) === ODOO_GREEN) {
        el.dataset.value = targetColor;
        touched = true;
    }
    if (normalizeHex(el.dataset.backgroundColor) === ODOO_GREEN) {
        el.dataset.backgroundColor = targetColor;
        touched = true;
    }

    if (replaceGreenInStyle(el, targetColor)) {
        touched = true;
    }

    const title = normalize(el.getAttribute("title"));
    const aria = normalize(el.getAttribute("aria-label"));
    const text = normalize(el.textContent);

    if (title === ODOO_GREEN || aria === ODOO_GREEN || text === ODOO_GREEN) {
        setImportant(el, "background-color", targetColor);
        setImportant(el, "border-color", targetColor);
        setImportant(el, "color", targetColor);
        touched = true;
    }

    return touched;
}

function patchRenderedAnchor(anchor, targetColor) {
    if (!(anchor instanceof HTMLElement)) return;
    if (anchor.classList.contains("btn")) return;
    if ([...anchor.classList].some((c) => c.startsWith("btn-"))) return;

    replaceGreenInStyle(anchor, targetColor);
    setImportant(anchor, "color", targetColor);
    setImportant(anchor, "border-color", targetColor);
    setImportant(anchor, "border-left-color", targetColor);
    setImportant(anchor, "border-right-color", targetColor);
    setImportant(anchor, "border-top-color", targetColor);
    setImportant(anchor, "border-bottom-color", targetColor);

    anchor.querySelectorAll("*").forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        replaceGreenInStyle(child, targetColor);
        setImportant(child, "color", targetColor);
        setImportant(child, "border-color", targetColor);
        setImportant(child, "border-left-color", targetColor);
        setImportant(child, "border-right-color", targetColor);
        setImportant(child, "border-top-color", targetColor);
        setImportant(child, "border-bottom-color", targetColor);
    });
    // 🔥 NEU: Wenn Background gesetzt → Text weiß
    if (hasBackground(anchor)) {
        setImportant(anchor, "color", "#ffffff");

        anchor.querySelectorAll("*").forEach((child) => {
            if (child instanceof HTMLElement) {
                setImportant(child, "color", "#ffffff");
            }
        });
    }
}

function patchVisiblePickers(targetColor, root = document) {
    const popupSelectors = [
        ".dropdown-menu.show",
        ".modal.show",
        ".popover",
        ".o-popover",
        ".o_dialog",
    ].join(", ");

    root.querySelectorAll(popupSelectors).forEach((popup) => {
        popup.querySelectorAll("input").forEach((input) => {
            patchInputValue(input, targetColor);
        });
        popup.querySelectorAll("*").forEach((el) => {
            patchPaletteElement(el, targetColor);
        });
    });
}

function patchEditors(targetColor, root = document) {
    const scopes = [
        '[contenteditable="true"]',
        ".o_field_html",
        ".o-mail-Composer-input",
        ".o-mail-Message-richBody",
        ".note-editable",
        ".odoo-editor-editable",
    ].join(", ");

    root.querySelectorAll(scopes).forEach((scope) => {
        scope.querySelectorAll("a[href]").forEach((anchor) => {
            patchRenderedAnchor(anchor, targetColor);
        });

        scope.querySelectorAll("[style]").forEach((el) => {
            if (!(el instanceof HTMLElement)) return;
            if (normalize(el.getAttribute("style")).includes(ODOO_GREEN.replace("#", ""))) {
                replaceGreenInStyle(el, targetColor);
                if (el.closest("a[href]")) {
                    setImportant(el, "color", targetColor);
                }
            }
        });
    });
}

function patchDocument(targetColor) {
    patchVisiblePickers(targetColor, document);
    patchEditors(targetColor, document);
}

function installHooks(targetColor) {
    const rerun = () => patchDocument(targetColor);

    rerun();

    ["click", "mousedown", "mouseup", "focusin", "input", "change", "keyup", "paste"].forEach((evt) => {
        document.addEventListener(
            evt,
            () => {
                setTimeout(rerun, 0);
                setTimeout(rerun, 50);
                setTimeout(rerun, 150);
            },
            true
        );
    });

    const observer = new MutationObserver(() => {
        rerun();
    });

    observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["style", "class", "value", "data-color", "data-value", "data-background-color"],
    });
}

whenReady(async () => {
    const color = await fetchConfiguredColor();
    installHooks(color);
});
