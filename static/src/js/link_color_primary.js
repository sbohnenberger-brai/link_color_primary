/** @odoo-module **/

import { whenReady } from "@odoo/owl";

/**
 * Odoo 19 pragmatic link-color enforcer
 *
 * Goal:
 * - Whenever the editor or chatter creates a green Odoo link (#008f8c),
 *   rewrite it to your brand primary color.
 * - Works for contenteditable editors, chatter composer-like areas,
 *   HTML fields, signatures, and portal rich messages.
 *
 * Notes:
 * - This is intentionally DOM-driven and not tied to fragile internal
 *   editor class implementations.
 * - It is a "best effort" module for Odoo 19.x.
 */

const PRIMARY_COLOR = "#005bbb";       // <-- DEINE FIRMAFARBE
const ODOO_GREEN = "#008f8c";

const EDITOR_SELECTORS = [
    '[contenteditable="true"]',
    '.o-mail-Composer-input',
    '.o-mail-Composer-inputContainer [contenteditable="true"]',
    '.o_field_html [contenteditable="true"]',
    '.note-editable',
    '.odoo-editor-editable',
    '.o-mail-Message-richBody',
].join(", ");

function normalizeHex(value) {
    if (!value) return "";
    return value.trim().toLowerCase().replace(/\s+/g, "");
}

function styleContainsGreen(styleValue = "") {
    const s = styleValue.toLowerCase().replace(/\s+/g, "");
    return s.includes(`color:${ODOO_GREEN}`) ||
           s.includes(`border-left-color:${ODOO_GREEN}`) ||
           s.includes(`border-right-color:${ODOO_GREEN}`) ||
           s.includes(`border-top-color:${ODOO_GREEN}`) ||
           s.includes(`border-bottom-color:${ODOO_GREEN}`) ||
           s.includes(`border-color:${ODOO_GREEN}`);
}

function setStyleProperty(el, prop, value) {
    try {
        el.style.setProperty(prop, value, "important");
    } catch {
        // ignore
    }
}

function patchInlineStyleAttribute(el) {
    const style = el.getAttribute("style");
    if (!style) return;

    let updated = style;

    updated = updated.replace(/color\s*:\s*#008f8c/gi, `color:${PRIMARY_COLOR}`);
    updated = updated.replace(/border-left-color\s*:\s*#008f8c/gi, `border-left-color:${PRIMARY_COLOR}`);
    updated = updated.replace(/border-right-color\s*:\s*#008f8c/gi, `border-right-color:${PRIMARY_COLOR}`);
    updated = updated.replace(/border-top-color\s*:\s*#008f8c/gi, `border-top-color:${PRIMARY_COLOR}`);
    updated = updated.replace(/border-bottom-color\s*:\s*#008f8c/gi, `border-bottom-color:${PRIMARY_COLOR}`);
    updated = updated.replace(/border-color\s*:\s*#008f8c/gi, `border-color:${PRIMARY_COLOR}`);

    if (updated !== style) {
        el.setAttribute("style", updated);
    }
}

function forceAnchorTree(anchor) {
    if (!(anchor instanceof HTMLElement)) return;
    if (anchor.classList.contains("btn")) return;
    if ([...anchor.classList].some((c) => c.startsWith("btn-"))) return;

    patchInlineStyleAttribute(anchor);
    setStyleProperty(anchor, "color", PRIMARY_COLOR);
    setStyleProperty(anchor, "border-color", PRIMARY_COLOR);
    setStyleProperty(anchor, "border-left-color", PRIMARY_COLOR);
    setStyleProperty(anchor, "border-right-color", PRIMARY_COLOR);
    setStyleProperty(anchor, "border-top-color", PRIMARY_COLOR);
    setStyleProperty(anchor, "border-bottom-color", PRIMARY_COLOR);

    anchor.querySelectorAll("*").forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        patchInlineStyleAttribute(child);

        // Only force descendants that are inside a link
        if (child.closest("a[href]")) {
            setStyleProperty(child, "color", PRIMARY_COLOR);
            setStyleProperty(child, "border-color", PRIMARY_COLOR);
            setStyleProperty(child, "border-left-color", PRIMARY_COLOR);
            setStyleProperty(child, "border-right-color", PRIMARY_COLOR);
            setStyleProperty(child, "border-top-color", PRIMARY_COLOR);
            setStyleProperty(child, "border-bottom-color", PRIMARY_COLOR);
        }
    });
}

function enforceInside(root) {
    if (!(root instanceof Element || root instanceof Document)) return;

    root.querySelectorAll(EDITOR_SELECTORS).forEach((scope) => {
        scope.querySelectorAll("a[href]").forEach(forceAnchorTree);

        scope.querySelectorAll("[style]").forEach((el) => {
            if (!(el instanceof HTMLElement)) return;
            if (styleContainsGreen(el.getAttribute("style") || "") && el.closest("a[href]")) {
                patchInlineStyleAttribute(el);
                setStyleProperty(el, "color", PRIMARY_COLOR);
            }
        });
    });
}

/**
 * Best-effort:
 * if an editor popup opens with #008f8c already prefilled in a color input,
 * replace that prefilled value by PRIMARY_COLOR.
 */
function patchOpenPopups(root = document) {
    const popupSelectors = [
        ".modal.show",
        ".dropdown-menu.show",
        ".popover",
        ".o-popover",
        ".o_dialog",
    ].join(", ");

    root.querySelectorAll(popupSelectors).forEach((popup) => {
        popup.querySelectorAll('input[type="text"], input:not([type])').forEach((input) => {
            const value = normalizeHex(input.value || "");
            if (value === ODOO_GREEN) {
                input.value = PRIMARY_COLOR;
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));
            }
        });
    });
}

function installGlobalHooks() {
    const rerun = () => {
        enforceInside(document);
        patchOpenPopups(document);
    };

    // Initial run
    rerun();

    // Common editor interactions
    ["input", "keyup", "mouseup", "paste", "change", "focusin", "click"].forEach((evt) => {
        document.addEventListener(evt, () => {
            // Let Odoo finish DOM updates first
            setTimeout(rerun, 0);
            setTimeout(rerun, 50);
            setTimeout(rerun, 200);
        }, true);
    });

    // Observe DOM mutations for editor updates and message rendering
    const observer = new MutationObserver((mutations) => {
        let shouldRun = false;

        for (const mutation of mutations) {
            if (mutation.type === "childList" && (mutation.addedNodes.length || mutation.removedNodes.length)) {
                shouldRun = true;
                break;
            }
            if (mutation.type === "attributes") {
                shouldRun = true;
                break;
            }
        }

        if (shouldRun) {
            rerun();
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class", "href"],
    });

    // Try to normalize before forms submit/save
    document.addEventListener("submit", () => {
        rerun();
    }, true);
}

whenReady(() => {
    installGlobalHooks();
});
