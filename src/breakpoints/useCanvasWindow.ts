/**
 * Finds the window the editor canvas renders into.
 *
 * The spacer block does not need this: it has a DOM node in the canvas and can
 * read `ownerDocument.defaultView` off it. The extension has no such node — its
 * only output is an inspector panel, and inspector panels render in the
 * sidebar's document, which is the browser window, not the canvas.
 *
 * Injecting a hidden element into every extended block's output would give us a
 * node, but it would also put a stray tag inside blocks with strict children —
 * list items, table rows, flex containers with `:only-child` rules — for the
 * sake of a measurement. Looking the iframe up is invasive to nothing.
 *
 * `contentWindow.innerWidth`, deliberately, and never the iframe element's
 * `getBoundingClientRect().width`: the element includes the canvas scrollbar,
 * which is about fifteen pixels, which is a whole band either side of a
 * boundary. That exact mistake produced a passing local run and a failing CI
 * one during M4.
 */

import { useEffect, useState } from 'react';

/**
 * Selectors for the canvas iframe, most specific first.
 *
 * Gutenberg's `Iframe` component names the canvas frame, and has since the
 * iframed editor landed. The class is a fallback for editor surfaces that
 * render the same component without the name.
 */
const CANVAS_SELECTORS = [
	'iframe[name="editor-canvas"]',
	'iframe.editor-canvas__iframe',
	'iframe.edit-site-visual-editor__editor-canvas',
];

/**
 * The canvas window, or null until it exists.
 *
 * Returns the document's own window when the editor is not iframed — widget
 * screens and some third-party surfaces still render blocks inline, and there
 * the page *is* the canvas.
 *
 * @return The window to measure, or null while the editor is still mounting.
 */
export function useCanvasWindow(): Window | null {
	const [canvas, setCanvas] = useState<Window | null>(null);

	useEffect(() => {
		let cancelled = false;

		const sync = () => {
			if (cancelled) {
				return;
			}

			const found = findCanvasWindow();

			// Identity comparison: a device-preview switch remounts the iframe.
			setCanvas((current) => (current === found ? current : found));
		};

		sync();

		/*
		 * The iframe mounts after the inspector on a cold load, and is replaced
		 * whenever the editor swaps canvases. Observing the outer document
		 * catches both; it is cheap because the canvas's own churn happens in
		 * the iframe's document, not this one, and because this hook only runs
		 * while a block is selected.
		 */
		const observer = new MutationObserver(sync);

		observer.observe(document.body, { childList: true, subtree: true });

		return () => {
			cancelled = true;
			observer.disconnect();
		};
	}, []);

	return canvas;
}

/**
 * Looks the canvas window up in the current document.
 *
 * @return The canvas window, or null when the iframe is not mounted yet.
 */
function findCanvasWindow(): Window | null {
	for (const selector of CANVAS_SELECTORS) {
		const frame = document.querySelector(selector);

		if (frame instanceof HTMLIFrameElement && frame.contentWindow) {
			return frame.contentWindow;
		}
	}

	/*
	 * No canvas iframe yet — either the editor is still mounting, or this is an
	 * un-iframed surface such as the widgets screen. Blocks render into the
	 * writing flow either way, so its presence in *this* document is the signal
	 * that the page is itself the canvas. Guessing wrong toward `window` would
	 * mean measuring the browser chrome, which is the exact mistake that made
	 * v1's preview wrong; guessing wrong toward null only costs a tier label
	 * until the iframe appears and the observer fires again.
	 */
	return document.querySelector('.block-editor-writing-flow') ? window : null;
}
