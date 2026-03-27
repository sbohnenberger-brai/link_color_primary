/** @odoo-module **/

import { whenReady } from "@odoo/owl";

const ODOO_GREEN = "#008f8c";

/**
 * Primärfarbe dynamisch aus CSS lesen.
 * Fallback ist Odoo-Grün nur dann, wenn gar nichts gefunden wird.
 */
function getBrandPrimary() {
    const cssVars = [
        "--o-brand-primary",
        "--primary",
        "--bs-primary",
    ];
    const rootStyle = getComputedStyle(document.documentElement);
    for (const name of cssVars) {
        const value = (rootStyle.getPropertyValue(name) || "").trim();
        if (value) {
            return normalizeColor(value);
        }
    }
    return "#005bbb";
}

function normalizeText(value) {
    return (value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function normalizeColor(value) {
    if (!value) return "";
    const s = normalizeText(value);

    // already hex
    if (s.startsWith("#")) return s;

    // rgb(...) or rgba(...)
    const m = s.match(/^rgba?\((\d+),(\d+),(\d+)/);
    if (m) {
        const r = Number(m[1]).toString(16).padStart(2, "0");
        const g = Number(m[2]).toString(16).padStart(2, "0");
        const b = Number(m[3]).toString(16).padStart(2, "0");
        return `#${r}${g}${b}`;
    }
    return s;
}

function currentPrimary() {
    return getBrandPrimary();
}

function isOdooGreen(value) {
    return normalizeColor(value) === ODOO_GREEN;
}

function setImportant(el, prop, value) {
    try {
        el.style.setProperty(prop, value, "important");
    } catch {
        // ignore
    }
}

function replaceGreenInStyleAttribute(el) {
    const style = el.getAttribute("style");
    if (!style) return false;
    const primary = currentPrimary();
    const updated = style.replace(/#008f8c/gi, primary);
    if (updated !== style) {
        el.setAttribute("style", updated);
        return true;
    }
    return false;
}

function patchColorInput(input) {
    if (!(input instanceof HTMLInputElement)) return false;
    const raw = input.value || input.getAttribute("value") || input.placeholder || "";
    if (!raw) return false;

    if (isOdooGreen(raw)) {
        const primary = currentPrimary();
        input.value = primary;
        input.setAttribute("value", primary);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
    }
    return false;
}

function patchPaletteItem(el) {
    if (!(el instanceof HTMLElement)) return false;
    const primary = currentPrimary();
    let touched = false;

    const datasetValues = [
        el.dataset.color,
        el.dataset.value,
        el.dataset.backgroundColor,
    ].filter(Boolean);

    for (const value of datasetValues) {
        if (isOdooGreen(value)) {
            if (el.dataset.color) el.dataset.color = primary;
            if (el.dataset.value) el.dataset.value = primary;
            if (el.dataset.backgroundColor) el.dataset.backgroundColor = primary;
            touched = true;
        }
    }

    const aria = el.getAttribute("aria-label") || "";
    if (isOdooGreen(aria)) {
        el.setAttribute("aria-label", primary);
        touched = true;
    }

    if (replaceGreenInStyleAttribute(el)) {
        touched = true;
    }

    const inlineColor = normalizeColor(el.style.backgroundColor || el.style.color || "");
    if (isOdooGreen(inlineColor)) {
        setImportant(el, "background-color", primary);
        setImportant(el, "border-color", primary);
        setImportant(el, "color", primary);
        touched = true;
    }

    return touched;
}

function patchLinkTree(anchor) {
    if (!(anchor instanceof HTMLElement)) return;
    if (anchor.classList.contains("btn")) return;
    if ([...anchor.classList].some((c) => c.startsWith("btn-"))) return;

    const primary = currentPrimary();

    replaceGreenInStyleAttribute(anchor);
    setImportant(anchor, "color", primary);
    setImportant(anchor, "border-color", primary);
    setImportant(anchor, "border-left-color", primary);
    setImportant(anchor, "border-right-color", primary);
    setImportant(anchor, "border-top-color", primary);
    setImportant(anchor, "border-bottom-color", primary);

    anchor.querySelectorAll("*").forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        replaceGreenInStyleAttribute(child);
        setImportant(child, "color", primary);
        setImportant(child, "border-color", primary);
        setImportant(child, "border-left-color", primary);
        setImportant(child, "border-right-color", primary);
        setImportant(child, "border-top-color", primary);
        setImportant(child, "border-bottom-color", primary);
    });
}

function patchVisiblePopups(root = document) {
    const popupSelectors = [
        ".dropdown-menu.show",
        ".modal.show",
        ".popover.show",
        ".popover",
        ".o-popover",
        ".o_dialog",
    ].join(", ");

    root.querySelectorAll(popupSelectors).forEach((popup) => {
        // 1) Inputs mit vorbefülltem Grün ersetzen
        popup.querySelectorAll("input").forEach((input) => {
            patchColorInput(input);
        });

        // 2) Sichtbare Paletten/Chips auf Primärfarbe umschreiben
        popup.querySelectorAll("*").forEach((el) => {
            patchPaletteItem(el);
        });
    });
}

function patchRenderedRichText(root = document) {
    const scopes = [
        ".o-mail-Message-richBody",
        ".o_field_html",
        '[contenteditable="true"]',
        ".note-editable",
        ".odoo-editor-editable",
    ].join(", ");

    root.querySelectorAll(scopes).forEach((scope) => {
        scope.querySelectorAll("a[href]").forEach((a) => patchLinkTree(a));
        scope.querySelectorAll("[style*='#008f8c'], [style*='#008F8C']").forEach((el) => {
            if (el instanceof HTMLElement) {
                replaceGreenInStyleAttribute(el);
                if (el.closest("a[href]")) {
                    setImportant(el, "color", currentPrimary());
                }
            }
        });
    });
}

function patchToolbarButtons(root = document) {
    const primary = currentPrimary();
    const selectors = [
        "[data-color]",
        "[data-value]",
        "[data-background-color]",
        "[style]",
        ".dropdown-item",
        "button",
        "a",
        "span",
        "div",
    ].join(", ");

    root.querySelectorAll(selectors).forEach((el) => {
        if (!(el instanceof HTMLElement)) return;

        const text = normalizeText(el.textContent || "");
        const title = normalizeText(el.getAttribute("title") || "");
        const aria = normalizeText(el.getAttribute("aria-label") || "");

        const seemsToBeGreenChip =
            text === ODOO_GREEN ||
            title === ODOO_GREEN ||
            aria === ODOO_GREEN ||
            isOdooGreen(el.dataset.color) ||
            isOdooGreen(el.dataset.value) ||
            isOdooGreen(el.dataset.backgroundColor);

        if (seemsToBeGreenChip || replaceGreenInStyleAttribute(el)) {
            setImportant(el, "background-color", primary);
            setImportant(el, "border-color", primary);
            setImportant(el, "color", primary);
            if (el.dataset.color && isOdooGreen(el.dataset.color)) el.dataset.color = primary;
            if (el.dataset.value && isOdooGreen(el.dataset.value)) el.dataset.value = primary;
            if (el.dataset.backgroundColor && isOdooGreen(el.dataset.backgroundColor)) {
                el.dataset.backgroundColor = primary;
            }
        }
    });
}

function rerun() {
    patchVisiblePopups(document);
    patchToolbarButtons(document);
    patchRenderedRichText(document);
}

function installObservers() {
    rerun();

    ["click", "mousedown", "mouseup", "focusin", "input", "change", "keyup", "paste"].forEach((evt) => {
        document.addEventListener(
            evt,
            () => {
                setTimeout(rerun, 0);
                setTimeout(rerun, 50);
                setTimeout(rerun, 200);
            },
            true
        );
    });

    const observer = new MutationObserver((mutations) => {
        let shouldRerun = false;
        for (const m of mutations) {
            if (m.type === "childList" && (m.addedNodes.length || m.removedNodes.length)) {
                shouldRerun = true;
                break;
            }
            if (m.type === "attributes") {
                shouldRerun = true;
                break;
            }
        }
        if (shouldRerun) {
            rerun();
        }
    });

    observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["style", "class", "value", "data-color", "data-value", "data-background-color"],
    });

    document.addEventListener(
        "submit",
        () => {
            rerun();
        },
        true
    );
}

whenReady(() => {
    installObservers();
});
