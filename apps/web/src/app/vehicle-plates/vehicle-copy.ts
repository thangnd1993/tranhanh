import { Locale } from '../i18n/routes';
import { VehicleRow } from './vehicle-data';
const vi = {
  index: 'Tra cứu biển số xe Việt Nam',
  short: 'Biển số xe',
  home: 'Trang chủ',
  lookup: 'Tra cứu',
  intro: 'Tìm nơi được phân bổ mã biển số, đối chiếu các mã cùng địa phương và tên địa phương trước sắp xếp.',
  label: 'Nhập mã biển số hoặc địa phương',
  hint: 'Ví dụ: 51, 51K, 43, Hà Nội hoặc Da Nang.',
  submit: 'Tra cứu',
  privacy:
    'Chỉ tra cứu phân bổ mã biển số công khai. Không xác định xe hoặc chủ sở hữu; biển đầy đủ không được lưu vào lịch sử.',
  invalid: 'Định dạng chưa hợp lệ. Hãy nhập mã biển số hoặc tên địa phương.',
  missing: 'Không tìm thấy mã biển số',
  missingBody: 'Mã này chưa có trong dữ liệu đã đối chiếu. Kiểm tra lại hoặc tìm trong danh sách.',
  unavailable: 'Dữ liệu biển số tạm thời chưa khả dụng',
  unavailableBody: 'Chưa thể kết nối dịch vụ dữ liệu. Vui lòng thử lại sau.',
  back: 'Xem danh sách biển số',
  retry: 'Thử lại',
  loading: 'Đang tra cứu…',
  code: 'Mã số phân bổ',
  locality: 'Đơn vị được phân bổ',
  source: 'Nguồn dữ liệu',
  published: 'Ngày xuất bản',
  retrieved: 'Ngày đối chiếu nguồn',
  effective: 'Có hiệu lực từ',
  recordUpdated: 'Cập nhật bản ghi',
  related: 'Mã cùng đơn vị phân bổ',
  history: 'Phân bổ trước đây',
  groups: 'Mã hiện hành theo đơn vị phân bổ',
  results: 'Kết quả phù hợp',
  ACTIVE: 'Hiện hành',
  INACTIVE: 'Không còn hiện hành',
  view: 'Xem mã biển số',
  disclaimer:
    'Mã biển số thể hiện phân bổ đăng ký theo nguồn công khai, không xác nhận vị trí hiện tại, tình trạng xe hay chủ sở hữu.',
  evidence: 'Ngày cập nhật bản ghi khác ngày xuất bản và ngày quy định có hiệu lực.',
  series: 'Seri đi kèm không đủ căn cứ để xác định khu vực nhỏ hơn hoặc loại xe. Kết quả dựa trên mã số phân bổ.',
  ambiguous: 'Có nhiều phân bổ phù hợp. Xem từng kết quả dưới đây; chưa thể chọn một đơn vị duy nhất.',
  historyNote: 'Mốc chuyển tiếp của bảng phân bổ không có nghĩa biển đã cấp mất hiệu lực.',
  until: 'Trước ngày',
};
const en: Record<keyof typeof vi, string> = {
  index: 'Vietnam vehicle plate lookup',
  short: 'Vehicle plates',
  home: 'Home',
  lookup: 'Lookup',
  intro: 'Find public plate-prefix allocations, related prefixes and the previous allocation names before regrouping.',
  label: 'Enter a plate prefix or locality',
  hint: 'For example: 51, 51K, 43, Ha Noi or Da Nang.',
  submit: 'Look up',
  privacy:
    'Public prefix allocations only. No vehicle or owner identification; full plates are not saved in search history.',
  invalid: 'Check the format. Enter a plate prefix or locality name.',
  missing: 'Plate prefix not found',
  missingBody: 'This prefix is absent from the reviewed data. Check it or browse the list.',
  unavailable: 'Vehicle plate data is temporarily unavailable',
  unavailableBody: 'We cannot connect to the data service. Please try again later.',
  back: 'Browse plate prefixes',
  retry: 'Try again',
  loading: 'Looking up…',
  code: 'Numeric allocation prefix',
  locality: 'Allocation target',
  source: 'Data source',
  published: 'Published',
  retrieved: 'Source checked',
  effective: 'Effective from',
  recordUpdated: 'Data record updated',
  related: 'Other prefixes for this allocation target',
  history: 'Previous allocation',
  groups: 'Current prefixes by allocation target',
  results: 'Matching results',
  ACTIVE: 'Current',
  INACTIVE: 'Inactive',
  view: 'View plate prefix',
  disclaimer:
    'A plate prefix indicates a public registration allocation. It does not establish a vehicle’s current location, status or owner.',
  evidence: 'A record update is separate from the source publication and legal effective date.',
  series:
    'The series alone does not establish a narrower locality or vehicle category. This result uses the numeric allocation prefix.',
  ambiguous: 'Several allocations match. Review each result below; a single target cannot be selected.',
  historyNote: 'The allocation transition date does not invalidate plates already issued.',
  until: 'Before',
};
export const vehicleCopy = (locale: Locale) => (locale === 'vi' ? vi : en);
export const vehicleHeading = (prefix: string, locale: Locale) =>
  locale === 'vi' ? `${prefix} là biển số ở đâu?` : `Where is plate prefix ${prefix} allocated?`;
export const vehicleAnswer = (row: VehicleRow, locale: Locale) =>
  locale === 'vi'
    ? `Mã biển số ${row.numericPrefix}${row.seriesPrefix ?? ''} được phân bổ cho ${row.target.name}.`
    : `Plate prefix ${row.numericPrefix}${row.seriesPrefix ?? ''} is allocated to ${row.target.name}.`;
