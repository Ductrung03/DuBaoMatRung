import test from 'node:test';
import assert from 'node:assert/strict';
import { hasVisiblePixels } from './image-pixels.js';
test('empty/transparent PNG cannot enable a comparison slider; dark real pixels remain valid',()=>{
  assert.equal(hasVisiblePixels([]),false);assert.equal(hasVisiblePixels([0,0,0,0,255,255,255,0]),false);
  assert.equal(hasVisiblePixels([0,0,0,255]),true);assert.equal(hasVisiblePixels([10,30,40,1]),true);
});
