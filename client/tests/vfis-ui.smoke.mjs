// Optional browser smoke test. All API records below are synthetic TEST FIXTURES.
// Run against a local Vite server; see docs/VFIS_IMPLEMENTATION.md.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.VFIS_TEST_URL || 'http://127.0.0.1:5179';
const output = process.env.VFIS_TEST_OUTPUT;
if (output) await mkdir(output, { recursive: true });
const features = [
  { gid: 1, xa: 'Xã A', dtich: 10000, dtichXM: null, detection_status: 'Chưa xác minh', verification_reason: 'Cháy', end_sau: '2026-10-15' },
  { gid: 2, xa: 'Xã A', dtich: 20000, dtichXM: 15000, detection_status: 'Đã xác minh', verification_reason: 'Khai thác', end_sau: '2026-10-15' },
  { gid: 3, xa: 'Xã B', dtich: 15000, dtichXM: null, detection_status: 'Đang xác minh', end_sau: '2026-10-16' },
].map((properties, i) => ({ type: 'Feature', properties: { ...properties, x: 103.9 + i * 0.02, y: 21.3, tk: '150', khoanh: '2' }, geometry: { type: 'Polygon', coordinates: [[[103.9 + i * 0.02, 21.3], [103.91 + i * 0.02, 21.3], [103.91 + i * 0.02, 21.31], [103.9 + i * 0.02, 21.3]]] } }));

const browser = await chromium.launch({ channel: process.env.VFIS_BROWSER_CHANNEL || 'chrome', headless: true });
try {
  for (const role of ['admin', 'User']) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    const user = { id: 999, username: `test-${role}`, roles: [{ name: role }], permissions: ['data_management.forecast_search', 'detection.view', 'reports.view', 'forecast.auto'], xa: role === 'User' ? 'Xã A' : null };
    const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ exp: 4102444800, ...user })).toString('base64url')}.test-fixture`;
    await context.addInitScript(({ user, token }) => { localStorage.setItem('user', JSON.stringify(user)); localStorage.setItem('token', token); }, { user, token });
    await context.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/auth/me') return route.fulfill({ json: { user } });
      if (path === '/api/search/mat-rung') return route.fulfill({ json: { success: true,revision:'fixture-r1',accessKey:'fixture-a1', data: { type: 'FeatureCollection', features: role === 'User' ? features.slice(0, 2) : features } } });
      if (path === '/api/search/revision') return route.fulfill({json:{success:true,data:{revision:'fixture-r1',accessKey:'fixture-a1'}}});
      if (path === '/api/search/forest-types') return route.fulfill({json:{success:true,data:[{code:'HG1',count:1}]}});
      if (/^\/api\/search\/alerts\/\d+\/profile$/.test(path)) return route.fulfill({json:{success:true,data:{alert:{gid:Number(path.split('/')[4]),area_m2:10000,detection_status:'Chưa xác minh',detection_date:null,confidence:null},forestPlots:[],hasMore:false}}});
      return route.fulfill({ json: { success: true, data: { type: 'FeatureCollection', features: [], pages: [] } } });
    });
    await context.route(/https:\/\/(.*arcgisonline\.com|.*tile\.openstreetmap\.org)\//, route => route.fulfill({ status: 204 }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/dashboard`);
    await page.getByRole('heading', { name: role === 'admin' ? 'TỔNG HỢP THEO ĐỊA BÀN' : 'DANH SÁCH LÔ MẤT RỪNG' }).waitFor();
    await page.locator('.monitor-table-scroll tbody tr').first().waitFor();
    assert.equal(await page.locator('.monitor-table-scroll th').count(), role === 'admin' ? 7 : 13); // 12 leaves + group header
    if (role === 'admin') {
      assert.equal(await page.locator('.vfis-navigation a').count(), 7);
      await page.evaluate(()=>window._leaflet_map.eachLayer(layer=>{if(layer.feature?.properties?.gid===1)layer.fire('click');}));
    } else {
      await page.getByRole('button', { name: 'PH-1', exact: true }).click();
    }
    await page.getByRole('heading', { name: /Hồ sơ lô: PH-1/ }).waitFor();
    await page.getByText('Chưa có dữ liệu gốc trong phạm vi được cấp quyền.',{exact:true}).waitFor();
    if (output) await page.screenshot({ path: `${output}/monitor-${role}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Đóng hồ sơ lô' }).click();
    const excelDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Excel', exact: true }).click();
    assert.match((await excelDownload).suggestedFilename(), /\.xlsx$/);
    await page.getByRole('link', { name: 'Báo cáo & thống kê', exact: true }).click();
    await page.getByLabel('Tháng báo cáo', { exact: true }).fill('2026-10');
    if (role === 'User') await page.getByLabel('Xã (bắt buộc)', { exact: true }).selectOption('Xã A');
    await page.locator('.monitor-report-document').waitFor();
    assert.match(await page.locator('.monitor-report-document').innerText(), role === 'admin' ? /4,5 ha/ : /3 ha/);
    await page.getByLabel('Kiểu hiển thị').selectOption('chart');
    await page.locator('.monitor-report-chart .recharts-surface').first().waitFor();
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Xuất DOCX', exact: true }).click();
    const download = await downloaded;
    assert.match(download.suggestedFilename(), /\.docx$/);
    if (output) await download.saveAs(`${output}/report-${role}.docx`);
    for (const [label, suffix] of [['Xuất PDF', /\.pdf$/], ['Xuất GEOJSON', /\.geojson$/]]) {
      const downloadedFile = page.waitForEvent('download');
      await page.getByRole('button', { name: label, exact: true }).click();
      const file = await downloadedFile;
      assert.match(file.suggestedFilename(), suffix);
      if (output) await file.saveAs(`${output}/${role}-${file.suggestedFilename()}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    if (output) await page.screenshot({ path: `${output}/report-${role}-mobile.png`, fullPage: true });
    assert.deepEqual(errors, []);
    console.log(`PASS ${role}: layout, selection, report total, chart, Excel/DOCX/PDF/GeoJSON downloads, mobile, no page errors`);
    await context.close();
  }
} finally { await browser.close(); }
