import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { createServer } from "vite";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : "playwright");
const server = await createServer({ server: { host: "127.0.0.1", port: 0 }, plugins: [{
  name: "recording-fixture",
  configureServer(vite) {
    vite.middlewares.use("/__recording-test", async (_request, response) => {
      response.setHeader("Content-Type", "text/html");
      response.end(await vite.transformIndexHtml("/__recording-test",
        '<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><div id="root"></div><script type="module" src="/mobile_recording_fixture.jsx"></script></body></html>'));
    });
  },
}] });
await server.listen();
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const width of [320, 390, 1440]) {
    for (const part of ["part1", "full"]) {
      const page = await browser.newPage({ viewport: { width, height: 800 }, isMobile: width < 620, hasTouch: width < 620 });
      await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__recording-test?part=${part}`);
      const button = page.getByTestId("record-button");
      await button.waitFor();
      const box = await button.boundingBox();
      assert.ok(box.width >= 75, `${width}px recording button is too narrow: ${box.width}`);
      const visibleLabel = button.locator(width < 620 ? ".record-button-label-mobile" : ".record-button-label-desktop");
      assert.equal(await visibleLabel.innerText(), width < 620 ? "Send" : "Tap to send");
      const labelBox = await visibleLabel.boundingBox();
      assert.ok(labelBox.width < box.width, `${width}px button label is clipped`);
      assert.ok(labelBox.height < box.height / 2, `${width}px button label wraps`);
      const review = page.getByTestId("review-before-send-checkbox");
      const cancel = page.getByTestId("cancel-recording-button");
      const reviewBox = await review.boundingBox();
      const cancelBox = await cancel.boundingBox();
      assert.ok(reviewBox.x >= 0 && reviewBox.x + reviewBox.width <= width, "Review checkbox outside viewport");
      assert.ok(cancelBox.x >= 0 && cancelBox.x + cancelBox.width <= width, "Cancel outside viewport");
      if (width < 620) assert.ok(reviewBox.y > box.y + box.height, "Review option should be below recording controls");
      const text = await page.getByTestId("message-assistant").innerText();
      assert.equal(text.includes("Part 1 Practice"), part === "full");
      assert.match(text, /Are headphones comfortable/);
      if (width === 390 && part === "part1" && process.env.MOBILE_LAYOUT_SCREENSHOT) {
        await page.screenshot({ path: process.env.MOBILE_LAYOUT_SCREENSHOT });
      }
      console.log(`PASS ${width}px ${part}: recording layout and opening copy`);
      await page.close();
    }
  }
} finally { await browser.close(); await server.close(); }
