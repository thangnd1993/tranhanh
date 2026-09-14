import { Locale } from '../i18n/routes';
import { AreaCodeResult } from './area-data';
const vi = {
  index: 'Tra cứu mã vùng điện thoại Việt Nam',
  short: 'Mã vùng điện thoại',
  home: 'Trang chủ',
  lookup: 'Tra cứu',
  intro: 'Tìm mã vùng điện thoại cố định theo mã hoặc khu vực, đồng thời đối chiếu mã cũ và mã hiện hành.',
  label: 'Nhập mã vùng hoặc khu vực',
  hint: 'Ví dụ: 0236, +84236, Đà Nẵng hoặc Da Nang.',
  submit: 'Tra cứu',
  privacy: 'Số điện thoại chỉ được dùng để xác định mã vùng và không được lưu vào lịch sử tra cứu.',
  invalid: 'Định dạng chưa hợp lệ. Hãy nhập mã vùng, số điện thoại cố định hoặc tên khu vực.',
  missing: 'Không tìm thấy mã vùng',
  missingBody: 'Kiểm tra lại mã hoặc tìm theo tên khu vực trong danh sách đã xác minh.',
  unavailable: 'Dữ liệu mã vùng tạm thời chưa khả dụng',
  unavailableBody: 'Chưa thể kết nối dịch vụ dữ liệu. Vui lòng thử lại sau.',
  noResults: 'Không tìm thấy khu vực phù hợp.',
  back: 'Xem danh sách mã vùng',
  retry: 'Thử lại',
  loading: 'Đang tra cứu…',
  code: 'Mã vùng',
  old: 'Mã vùng cũ',
  current: 'Mã vùng hiện hành',
  locality: 'Khu vực',
  status: 'Trạng thái',
  ACTIVE: 'Hiện hành',
  LEGACY: 'Mã cũ',
  INACTIVE: 'Không còn sử dụng',
  source: 'Nguồn dữ liệu',
  published: 'Ngày xuất bản',
  retrieved: 'Ngày đối chiếu nguồn',
  effective: 'Có hiệu lực từ',
  effectiveTo: 'Có hiệu lực đến',
  changed: 'Ngày bắt đầu chuyển đổi',
  recordUpdated: 'Cập nhật bản ghi dữ liệu',
  related: 'Mã vùng liên quan',
  history: 'Lịch sử mã vùng',
  groups: 'Mã vùng hiện hành theo vùng viễn thông',
  legacy: 'Mã vùng cũ → mới',
  results: 'Kết quả phù hợp',
  view: 'Xem mã vùng',
  disclaimer:
    'Tên khu vực hiển thị theo dữ liệu phân bổ mã vùng viễn thông và có thể không hoàn toàn trùng với tên đơn vị hành chính hiện hành.',
  evidence: 'Ngày cập nhật bản ghi không phải ngày xuất bản hoặc ngày mã vùng có hiệu lực.',
};
const en: Record<keyof typeof vi, string> = {
  index: 'Vietnam landline area code lookup',
  short: 'Area code',
  home: 'Home',
  lookup: 'Lookup',
  intro: 'Find a Vietnamese landline area code by code or locality and check verified legacy mappings.',
  label: 'Enter an area code or locality',
  hint: 'For example: 0236, +84236, Da Nang or Đà Nẵng.',
  submit: 'Look up',
  privacy: 'A landline number is used only to identify its area code and is not saved in search history.',
  invalid: 'Check the format. Enter an area code, a Vietnamese landline number or a locality.',
  missing: 'Area code not found',
  missingBody: 'Check the code or search the verified list by locality.',
  unavailable: 'Area code data is temporarily unavailable',
  unavailableBody: 'We cannot connect to the data service. Please try again later.',
  noResults: 'No matching locality was found.',
  back: 'Browse area codes',
  retry: 'Try again',
  loading: 'Looking up…',
  code: 'Area code',
  old: 'Legacy area code',
  current: 'Current area code',
  locality: 'Locality',
  status: 'Status',
  ACTIVE: 'Current',
  LEGACY: 'Legacy area code',
  INACTIVE: 'Inactive',
  source: 'Data source',
  published: 'Published',
  retrieved: 'Source checked',
  effective: 'Effective from',
  effectiveTo: 'Effective until',
  changed: 'Migration start date',
  recordUpdated: 'Data record updated',
  related: 'Related area codes',
  history: 'Area code history',
  groups: 'Current codes by telecom locality group',
  legacy: 'Legacy → current area codes',
  results: 'Matching results',
  view: 'View area code',
  disclaimer:
    'Locality names follow the telecom allocation data and may not exactly match current administrative-unit names.',
  evidence: 'A data record update is not the source publication date or the date an area code took effect.',
};
export const areaCopy = (locale: Locale) => (locale === 'vi' ? vi : en);
export function areaHeading(row: AreaCodeResult, locale: Locale): string {
  if (row.status === 'LEGACY')
    return locale === 'vi' ? `Mã vùng ${row.code} đổi thành mã nào?` : `What did area code ${row.code} change to?`;
  return locale === 'vi' ? `${row.code} là mã vùng ở đâu?` : `Where is area code ${row.code} used?`;
}
export function areaAnswer(row: AreaCodeResult, locale: Locale): string {
  if (row.status === 'LEGACY')
    return locale === 'vi'
      ? `Mã vùng cũ ${row.code} của khu vực ${row.locality.name} đã đổi thành ${row.currentCode}.`
      : `Legacy area code ${row.code} for ${row.locality.name} changed to ${row.currentCode}.`;
  return locale === 'vi'
    ? `Mã vùng ${row.code} được sử dụng cho khu vực ${row.locality.name}.`
    : `Area code ${row.code} is used for ${row.locality.name}.`;
}
