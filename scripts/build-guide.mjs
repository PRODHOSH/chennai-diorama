#!/usr/bin/env node
/** Renders docs/guide/guide.html to docs/Namma-Chennai-Guide.pdf with page numbers. */
import { chromium } from 'playwright-core';
import path from 'node:path';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.goto('file://' + path.resolve('docs/guide/guide.html'), { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const foot = `<div style="width:100%;font-size:7.5pt;font-family:Georgia,serif;color:#8a7f6a;padding:0 15mm;display:flex;justify-content:space-between">
  <span>Namma Chennai · நம்ம சென்னை · Project guide</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`;
await page.pdf({
  path: 'docs/Namma-Chennai-Guide.pdf', format: 'A4', printBackground: true,
  displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: foot,
  margin: { top: '12mm', bottom: '16mm', left: '12mm', right: '12mm' },
});
await browser.close();
console.log('✓ docs/Namma-Chennai-Guide.pdf');
