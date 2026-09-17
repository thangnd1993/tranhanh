import { describe, expect, it } from 'vitest';
import { documentPath, equivalentPath } from '../i18n/routes';
describe('vehicle document routes', () => {
  const vehicle = '11111111-1111-4111-8111-111111111111';
  const document = '22222222-2222-4222-8222-222222222222';
  it('creates complete localized private routes', () => {
    expect(documentPath('vi', vehicle)).toBe(`/vi/garage/${vehicle}/giay-to`);
    expect(documentPath('en', vehicle, undefined, 'add')).toBe(`/en/garage/${vehicle}/documents/add`);
    expect(documentPath('vi', vehicle, document, 'edit')).toBe(`/vi/garage/${vehicle}/giay-to/${document}/chinh-sua`);
  });
  it('preserves vehicle and document identities while switching language', () => {
    expect(equivalentPath(documentPath('vi', vehicle, document), 'en')).toBe(documentPath('en', vehicle, document));
    expect(equivalentPath(documentPath('en', vehicle, document, 'edit'), 'vi')).toBe(
      documentPath('vi', vehicle, document, 'edit'),
    );
  });
});
