import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const server = await createServer({server:{host:'127.0.0.1',port:0},plugins:[{name:'guide-fixture',configureServer(vite){
  vite.middlewares.use('/__guide-test',async(req,res)=>{
    res.setHeader('Content-Type','text/html');
    res.end(await vite.transformIndexHtml('/__guide-test','<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><div id="root"></div><script type="module" src="/guide_fixture.jsx"></script></body></html>'));
  });
}}]});
await server.listen();
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
  for (const width of [1440, 390, 320]) {
    for (const mode of ['Practice','Mock']) {
      for (const part of ['Part 1','Part 2','Part 3']) {
      const page = await browser.newPage({viewport:{width,height:900},hasTouch:width <= 620,isMobile:width <= 620});
      const activate = locator => width <= 620 ? locator.tap() : locator.click();
      await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__guide-test`);
      const dialog = page.getByRole('dialog');
      await activate(page.locator('[data-tour-target="mode"]'));
      await dialog.getByRole('button',{name:mode,exact:true}).click();
      await dialog.getByRole('button',{name:'Next',exact:true}).click();
      await activate(page.locator('[data-tour-target="flow"]'));
      await dialog.getByRole('button',{name:part,exact:true}).click();
      await dialog.getByRole('button',{name:'Next',exact:true}).click();
      await dialog.getByRole('button',{name:'Next',exact:true}).click();
      const sound = page.getByTestId(width <= 620 ? 'mobile-sound-toggle':'sound-toggle');
      await activate(sound);
      if (width === 390 && mode === 'Practice' && process.env.TOUR_QA_SCREENSHOT) await page.screenshot({path:process.env.TOUR_QA_SCREENSHOT});
      await dialog.getByRole('button',{name:'Back',exact:true}).click();
      await activate(sound);
      await dialog.getByRole('button',{name:'Next',exact:true}).click();
      await dialog.getByRole('button',{name:'Finish guide',exact:true}).click();
      assert.equal(await dialog.count(),0);
      assert.equal(await page.locator('.mobile-more-menu[open]').count(),0);
      await page.locator('.mobile-more-menu summary').click();
      await page.getByTestId('replay-guide-button').click();
      await dialog.getByRole('button',{name:'Skip guide',exact:true}).click();
      assert.equal(await dialog.count(),0);
      await page.locator('.mobile-more-menu summary').click();
      await page.getByTestId('replay-guide-button').click();
      await activate(page.locator('[data-tour-target="mode"]'));
      await dialog.getByRole('button',{name:mode,exact:true}).click();
      await dialog.getByRole('button',{name:'Next',exact:true}).click();
      await activate(page.locator('[data-tour-target="flow"]'));
      await dialog.getByRole('button',{name:'Full',exact:true}).click();
      await dialog.getByRole('button',{name:'Next',exact:true}).click();
      await sound.waitFor({state:'visible'});
      await dialog.getByRole('button',{name:'Skip guide',exact:true}).click();
      assert.equal(await page.locator('.mobile-more-menu[open]').count(),0);
      assert.equal(await page.locator('.tour-target-active, .tour-scrim').count(),0);
      console.log(`PASS ${width}px ${mode} ${part}: selection, sound, back, finish, replay, full, skip`);
      await page.close();
      }
    }
  }
} finally { await browser.close(); await server.close(); }
