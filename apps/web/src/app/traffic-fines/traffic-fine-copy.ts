import type { TrafficFineLimitation, TrafficFineRecordStatus, TrafficFineVehicleType } from '@tranhanh/shared';
import type { Locale } from '../i18n/routes';

const vi = {
  eyebrow: 'TRA CỨU CÔNG KHAI · KHÔNG CẦN ĐĂNG NHẬP',
  title: 'Tra cứu phạt nguội',
  intro:
    'Kiểm tra khả năng tra cứu theo biển số và tiếp tục xác minh trên nguồn chính thức của Cục Cảnh sát giao thông.',
  plateLabel: 'Biển số xe',
  plateHint: 'Ví dụ định dạng: 99Z-000.00 hoặc 99Z 00000.',
  vehicleType: 'Loại phương tiện',
  submit: 'Tiếp tục tra cứu',
  loading: 'Đang xử lý yêu cầu…',
  privacy:
    'Biển số chỉ được dùng để thực hiện yêu cầu tra cứu. Hệ thống không lưu lịch sử tra cứu phạt nguội của khách vãng lai.',
  invalid: 'Biển số hoặc loại phương tiện chưa hợp lệ. Vui lòng kiểm tra và thử lại.',
  rateLimited: 'Bạn đã thực hiện quá nhiều lượt tra cứu. Vui lòng thử lại sau.',
  unavailable:
    'Nguồn tra cứu hiện không phản hồi. Bạn có thể thử lại sau hoặc kiểm tra trực tiếp trên trang chính thức.',
  manualTitle: 'Cần xác minh thủ công trên nguồn chính thức',
  manualBody: 'Nguồn chính thức hiện yêu cầu xác minh CAPTCHA, vì vậy hệ thống không tự động truy vấn thay bạn.',
  unsupportedTitle: 'Loại phương tiện chưa được nguồn này hỗ trợ',
  unsupportedBody: 'Chọn loại phương tiện khác hoặc kiểm tra trực tiếp trên trang chính thức.',
  noRecordsTitle: 'Nguồn không trả về bản ghi phù hợp',
  noRecordsBody:
    'Kết quả này chỉ phản ánh phạm vi của nguồn được kiểm tra và không phải bảo đảm rằng xe không có vi phạm.',
  resultsTitle: 'Bản ghi do nguồn cung cấp',
  sourceTitle: 'Nguồn và phạm vi tra cứu',
  source: 'Nguồn',
  queriedPlate: 'Biển số đã che',
  selectedVehicleType: 'Loại phương tiện',
  official: 'Nguồn chính thức',
  manual: 'Xác minh thủ công',
  checked: 'Yêu cầu được xử lý',
  sourceReviewed: 'Nguồn được rà soát ngày 16/09/2026.',
  coverage: 'Phạm vi',
  freshness: 'Cập nhật dữ liệu',
  limitations: 'Giới hạn cần biết',
  officialCta: 'Mở trang tra cứu chính thức',
  external: 'Mở trên trang bên ngoài',
  stepsTitle: 'Cách kiểm tra trên trang chính thức',
  steps: [
    'Mở trang tra cứu chính thức.',
    'Nhập biển số xe.',
    'Chọn loại phương tiện nếu được yêu cầu.',
    'Nhập mã xác nhận/CAPTCHA.',
    'Xem kết quả từ cơ quan chức năng.',
  ],
  retry: 'Thử lại',
  whatTitle: 'Phạt nguội là gì?',
  whatBody:
    'Phạt nguội thường chỉ việc xử lý vi phạm giao thông được ghi nhận qua camera hoặc thiết bị kỹ thuật thay vì dừng xe tại chỗ.',
  captchaTitle: 'Vì sao cần CAPTCHA?',
  captchaBody:
    'Trang chính thức yêu cầu người tra cứu nhập mã bảo mật. TraNhanh không giải CAPTCHA và không truy cập các điểm cuối được bảo vệ thay người dùng.',
  delayTitle: 'Lưu ý về thời gian cập nhật',
  delayBody:
    'Nguồn công khai không công bố cam kết cập nhật theo thời gian thực. Bản ghi có thể xuất hiện sau thời điểm cơ quan chức năng tiếp nhận và xử lý dữ liệu.',
  scopeTitle: 'TraNhanh có thể xác minh điều gì?',
  scopeBody:
    'Trang này giúp kiểm tra khả năng của nhà cung cấp, giải thích giới hạn và dẫn tới nguồn chính thức. Hiện tại TraNhanh không tự động xác nhận một xe có hay không có vi phạm.',
  resultTime: 'Thời gian vi phạm',
  resultLocation: 'Địa điểm',
  resultBehavior: 'Hành vi vi phạm',
  detectingAuthority: 'Cơ quan phát hiện',
  processingAuthority: 'Cơ quan xử lý',
  status: 'Trạng thái',
  providerWording: 'Mô tả từ nguồn',
  publicReference: 'Mã tham chiếu công khai',
  statusValues: { UNRESOLVED: 'Chưa xử lý', RESOLVED: 'Đã xử lý', UNKNOWN: 'Chưa xác định' },
  vehicleTypes: { CAR: 'Ô tô', MOTORCYCLE: 'Xe máy', ELECTRIC_BICYCLE: 'Xe đạp điện' },
  limitationValues: {
    CAPTCHA_REQUIRED: 'Nguồn chính thức yêu cầu nhập CAPTCHA.',
    MANUAL_LOOKUP_ONLY: 'Tra cứu phải được hoàn tất trực tiếp trên trang chính thức.',
    COVERAGE_NOT_GUARANTEED: 'Nguồn không công bố bảo đảm đầy đủ về phạm vi dữ liệu.',
    FRESHNESS_NOT_PUBLISHED: 'Nguồn không công bố cam kết về độ mới của dữ liệu.',
    NO_PUBLIC_API: 'Chưa xác minh được API tự động công khai chính thức.',
    PROVIDER_UNAVAILABLE: 'Nguồn hiện không khả dụng.',
  },
};

const en: typeof vi = {
  eyebrow: 'PUBLIC LOOKUP · NO ACCOUNT REQUIRED',
  title: 'Traffic Fine Lookup',
  intro:
    'Check the available plate-lookup workflow and continue verification with the official Vietnam traffic police source.',
  plateLabel: 'License plate',
  plateHint: 'Synthetic format examples: 99Z-000.00 or 99Z 00000.',
  vehicleType: 'Vehicle type',
  submit: 'Continue lookup',
  loading: 'Processing your request…',
  privacy: 'The plate is used only for this lookup request. Anonymous traffic-fine lookup history is not stored.',
  invalid: 'Check the plate and vehicle type, then try again.',
  rateLimited: 'You have made too many lookup requests. Please try again later.',
  unavailable: 'The lookup source is not responding. Try again later or check directly on the official website.',
  manualTitle: 'Manual verification is required on the official source',
  manualBody:
    'The official source currently requires CAPTCHA verification, so this service cannot query it automatically for you.',
  unsupportedTitle: 'This source does not support the selected vehicle type',
  unsupportedBody: 'Choose another vehicle type or check directly on the official website.',
  noRecordsTitle: 'The checked source returned no matching records',
  noRecordsBody: 'This reflects only the checked source and does not guarantee that the vehicle has no violations.',
  resultsTitle: 'Records returned by the source',
  sourceTitle: 'Source and lookup coverage',
  source: 'Source',
  queriedPlate: 'Masked plate',
  selectedVehicleType: 'Vehicle type',
  official: 'Official source',
  manual: 'Manual verification',
  checked: 'Request processed',
  sourceReviewed: 'Source reviewed on September 16, 2026.',
  coverage: 'Coverage',
  freshness: 'Data freshness',
  limitations: 'Known limitations',
  officialCta: 'Open the official lookup page',
  external: 'Opens an external website',
  stepsTitle: 'How to check on the official page',
  steps: [
    'Open the official lookup page.',
    'Enter the vehicle plate.',
    'Select the vehicle type if requested.',
    'Enter the security code/CAPTCHA.',
    'Review the result from the authority.',
  ],
  retry: 'Try again',
  whatTitle: 'What is a traffic fine lookup?',
  whatBody:
    'In Vietnam, “phạt nguội” commonly refers to traffic enforcement based on a camera or technical-device record rather than an immediate roadside stop.',
  captchaTitle: 'Why is CAPTCHA required?',
  captchaBody:
    'The official page asks the visitor to enter a security code. TraNhanh does not solve CAPTCHA or access protected endpoints on the user’s behalf.',
  delayTitle: 'Allow for publication delays',
  delayBody:
    'The public source does not publish a real-time update guarantee. A record may appear only after the authority receives and processes the data.',
  scopeTitle: 'What can TraNhanh verify?',
  scopeBody:
    'This page checks provider capability, explains its limits, and links to the official source. TraNhanh cannot currently confirm automatically whether a vehicle has a violation.',
  resultTime: 'Violation time',
  resultLocation: 'Location',
  resultBehavior: 'Violation description',
  detectingAuthority: 'Detecting authority',
  processingAuthority: 'Processing authority',
  status: 'Status',
  providerWording: 'Source wording',
  publicReference: 'Public reference',
  statusValues: { UNRESOLVED: 'Unresolved', RESOLVED: 'Resolved', UNKNOWN: 'Unknown' },
  vehicleTypes: { CAR: 'Car', MOTORCYCLE: 'Motorcycle', ELECTRIC_BICYCLE: 'Electric bicycle' },
  limitationValues: {
    CAPTCHA_REQUIRED: 'The official source requires CAPTCHA entry.',
    MANUAL_LOOKUP_ONLY: 'The lookup must be completed directly on the official page.',
    COVERAGE_NOT_GUARANTEED: 'The source does not publish a complete coverage guarantee.',
    FRESHNESS_NOT_PUBLISHED: 'The source does not publish a data-freshness commitment.',
    NO_PUBLIC_API: 'No documented official public automation API has been verified.',
    PROVIDER_UNAVAILABLE: 'The source is currently unavailable.',
  },
};

export type TrafficFineCopy = typeof vi;
export const trafficFineCopy = (locale: Locale): TrafficFineCopy => (locale === 'vi' ? vi : en);
export const vehicleTypeLabel = (type: TrafficFineVehicleType, locale: Locale) =>
  trafficFineCopy(locale).vehicleTypes[type];
export const statusLabel = (status: TrafficFineRecordStatus, locale: Locale) =>
  trafficFineCopy(locale).statusValues[status];
export const limitationLabel = (limitation: TrafficFineLimitation, locale: Locale) =>
  trafficFineCopy(locale).limitationValues[limitation.code];
