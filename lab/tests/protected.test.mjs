import test from 'node:test';
import assert from 'node:assert/strict';
import { checkProtected } from '../protected.mjs';
test('Officina, SQL and Worker outside upload match the approved baseline',()=>{
  assert.deepEqual(checkProtected(new URL('../../',import.meta.url)),[]);
});
