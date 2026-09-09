import { describe, expect, it } from 'vitest';
import { AppController } from './app.controller.js';

describe('AppController', () => {
  it('identifies the API', () => {
    expect(new AppController().identify()).toEqual({ name: 'TraNhanh API', version: 'v1' });
  });
});
