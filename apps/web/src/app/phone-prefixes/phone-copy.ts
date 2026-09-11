import { Locale } from '../i18n/routes';
import { PhonePrefixResult } from './phone-data';
const vi = {
  index: 'Tra cứu đầu số điện thoại Việt Nam',
  short: 'Đầu số điện thoại',
  home: 'Trang chủ',
  lookup: 'Tra cứu',
  intro: 'Tìm nhà mạng được phân bổ đầu số và đối chiếu đầu số cũ với đầu số mới.',
  label: 'Nhập đầu số hoặc số điện thoại',
  hint: 'Hỗ trợ đầu số, số di động trong nước và định dạng +84.',
  submit: 'Tra cứu',
  privacy: 'Số điện thoại chỉ được dùng để xác định đầu số, không lưu vào lịch sử tra cứu.',
  invalid: 'Định dạng chưa hợp lệ. Hãy nhập đầu số hoặc số di động Việt Nam.',
  missing: 'Không tìm thấy đầu số',
  missingBody: 'Kiểm tra lại đầu số hoặc xem danh sách đầu số đã hỗ trợ.',
  unavailable: 'Dữ liệu tạm thời chưa khả dụng',
  unavailableBody: 'Chưa thể kết nối dữ liệu đầu số. Vui lòng thử lại sau.',
  back: 'Xem danh sách đầu số',
  retry: 'Thử lại',
  loading: 'Đang tra cứu…',
  operator: 'Nhà mạng được phân bổ',
  prefix: 'Đầu số',
  old: 'Đầu số cũ',
  current: 'Đầu số mới',
  status: 'Trạng thái',
  ACTIVE: 'Đang sử dụng',
  LEGACY: 'Đầu số cũ',
  INACTIVE: 'Ngừng sử dụng',
  mnp: 'Do có dịch vụ chuyển mạng giữ số, đầu số chỉ cho biết nhà mạng được phân bổ ban đầu và không nhất thiết phản ánh nhà mạng hiện đang phục vụ thuê bao.',
  source: 'Nguồn dữ liệu',
  published: 'Ngày xuất bản',
  retrieved: 'Ngày đối chiếu nguồn',
  effective: 'Có hiệu lực từ',
  effectiveTo: 'Có hiệu lực đến',
  changed: 'Thời điểm chuyển đổi',
  imported: 'Cập nhật bản ghi dữ liệu',
  dateUnknown: 'Nguồn chưa xác định ngày chuyển đổi cụ thể cho toàn bộ đầu số.',
  related: 'Các đầu số liên quan',
  history: 'Lịch sử chuyển đổi',
  groups: 'Đầu số đang sử dụng',
  legacy: 'Tra cứu đầu số cũ',
  all: 'Tất cả nhà mạng',
  filter: 'Lọc theo nhà mạng',
  explanation: 'Đầu số cho biết điều gì?',
  evidence:
    'Mỗi trang đầu số có nguồn đối chiếu và ngày tra cứu nguồn. Ngày cập nhật bản ghi không phải ngày xuất bản của nguồn.',
  view: 'Xem đầu số',
};
const en: Record<keyof typeof vi, string> = {
  index: 'Vietnam mobile prefix lookup',
  short: 'Phone prefix',
  home: 'Home',
  lookup: 'Lookup',
  intro: 'Find the operator allocated a mobile prefix and check how legacy prefixes changed.',
  label: 'Enter a prefix or phone number',
  hint: 'Accepts prefixes, Vietnamese mobile numbers and +84 format.',
  submit: 'Look up',
  privacy: 'Your phone number is used only to identify its prefix and is not saved in search history.',
  invalid: 'Check the format. Enter a prefix or a Vietnamese mobile number.',
  missing: 'Prefix not found',
  missingBody: 'Check the prefix or browse the supported prefix list.',
  unavailable: 'Prefix data is temporarily unavailable',
  unavailableBody: 'We cannot connect to the prefix data service. Please try again later.',
  back: 'Browse phone prefixes',
  retry: 'Try again',
  loading: 'Looking up…',
  operator: 'Allocated operator',
  prefix: 'Prefix',
  old: 'Old prefix',
  current: 'New prefix',
  status: 'Status',
  ACTIVE: 'In use',
  LEGACY: 'Legacy prefix',
  INACTIVE: 'Inactive',
  mnp: 'Mobile number portability means a prefix identifies the originally allocated operator, which may differ from the network currently serving the subscriber.',
  source: 'Data source',
  published: 'Published',
  retrieved: 'Source checked',
  effective: 'Effective from',
  effectiveTo: 'Effective until',
  changed: 'Migration date',
  imported: 'Data record updated',
  dateUnknown: 'The source does not establish a single migration date for the entire prefix.',
  related: 'Related prefixes',
  history: 'Prefix history',
  groups: 'Current prefixes',
  legacy: 'Legacy prefix lookup',
  all: 'All operators',
  filter: 'Filter by operator',
  explanation: 'What does a prefix tell you?',
  evidence:
    'Each prefix page includes its source and the date it was checked. A record update is not the source publication date.',
  view: 'View prefix',
};
export const phoneCopy = (locale: Locale) => (locale === 'vi' ? vi : en);
export function phoneHeading(row: PhonePrefixResult, locale: Locale): string {
  if (row.status === 'LEGACY')
    return locale === 'vi' ? `Đầu số ${row.prefix} đổi thành đầu số nào?` : `What did prefix ${row.prefix} change to?`;
  return locale === 'vi' ? `${row.prefix} là mạng gì?` : `What network uses prefix ${row.prefix}?`;
}
export function phoneAnswer(row: PhonePrefixResult, locale: Locale): string {
  if (row.status === 'LEGACY')
    return locale === 'vi'
      ? `Đầu số ${row.prefix} đã được chuyển thành ${row.currentPrefix}.`
      : `Prefix ${row.prefix} was changed to ${row.currentPrefix}.`;
  return locale === 'vi'
    ? `Đầu số ${row.prefix} được phân bổ cho ${row.operator.name}.`
    : `Prefix ${row.prefix} is allocated to ${row.operator.name}.`;
}
