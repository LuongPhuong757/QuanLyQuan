// Lịch sử order — page xem mọi order (đã + chưa thanh toán), filter theo bàn/ngày/cashier/trạng thái.
// Trạng thái = chấm màu + chữ, tô theo VIỆC CẦN LÀM (xem `history-page.css`).
// Bấm cả dòng để mở chi tiết món + ai gọi.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, Fragment } from 'react';
import {
  AlertTriangle, Camera, ChevronDown, ChevronUp, Landmark, MoreHorizontal, Printer,
  SlidersHorizontal, X,
} from 'lucide-react';
import { api, extractError } from '../lib/api.ts';
import { useToast } from '../components/Toast.tsx';
import { CheckoutDialog } from '../components/CheckoutDialog.tsx';
import { usePrompt } from '../components/ConfirmDialog.tsx';
import { PageLayout } from '../components/PageLayout.tsx';
import { useAuth } from '../lib/auth-context.tsx';
import { ChartCard, BarChart, RankBars, Donut } from '../components/Charts.tsx';
import { TimeRangeChips } from '../components/TimeRangeFilter.tsx';
import { catGioTrongHaiDau, nhanGio } from '../lib/gio-cao-diem.ts';
import { DateRangePicker } from '../components/TimeRangeFilter.tsx';
import { isPrevShiftCarryover, presetRange, vnDayIso, type DayRange } from '../lib/date-range.ts';
import { anTien } from '../lib/an-tien.ts';
import { PaymentPhotos, PaymentSummaryBox } from './PaymentReconcilePanel.tsx';
import './history-page.css';
import {
  historyFilterKey,
  historyQuery,
  type HistoryPayment,
  type HistoryFilters,
  type HistorySort,
  type HistoryVerified,
  type HistoryPhoto,
} from '../lib/history-filter.ts';

/** Khoá nhóm cho đơn CHƯA thanh toán khi đang sắp xếp theo giờ thanh toán: chúng không có ngày
 *  TT để gom, và BE đã dồn hết xuống cuối nên chúng luôn thành ĐÚNG MỘT nhóm ở cuối trang. */
const UNPAID_GROUP = 'chua-thanh-toan';

// Nhãn tiếng Việt cho mã trạng thái món (enum kỹ thuật) khi lộ ra UI.
const ITEM_STATE_LABEL: Record<string, string> = {
  PENDING: 'chờ gọi',
  KITCHEN: 'đã báo bếp',
  COOKING: 'đang làm',
  READY: 'đã xong',
  SERVED: 'đã giao',
  CANCELLED: 'đã huỷ',
};
const stateLabel = (s: string) => ITEM_STATE_LABEL[s] || s;

/** Phanh giữa lúc người dùng còn đang SỬA bộ lọc và lúc gọi API.
 *
 * Sửa một ô `<input type="date">` bắn `onChange` nhiều lần (mỗi phần ngày/tháng/năm một lần),
 * và ba endpoint của màn này đều theo bộ lọc → không phanh thì một lần sửa ngày thành cả chục
 * request chồng nhau. Ngắn thôi: đây là màn tra cứu, người dùng bấm xong là muốn thấy ngay. */
const FILTER_DEBOUNCE_MS = 250;

// Rút gọn số tiền cho biểu đồ: 1.200.000 → 1,2tr · 250.000 → 250k
function fmtShort(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace('.0', '') + 'tr';
  if (v >= 1_000) return Math.round(v / 1_000) + 'k';
  return String(v);
}

type Stats = {
  revenue_by_day: Array<{ day: string; revenue: number; orders: number }>;
  top_items: Array<{ name: string; qty: number; revenue: number }>;
  revenue_by_cashier: Array<{ name: string; revenue: number; orders: number }>;
  by_half_hour: Array<{ start_min: number; orders: number; revenue: number }>;
  paid_count: number;
  unpaid_count: number;
  cancelled_count: number;
  /** Đơn đang NỢ (2026-09-25) — cùng lệ cắt theo tab với 3 count kia. */
  debt_count: number;
  paid_revenue: number;
  // M2.D-62 — phí ship là tiền thu hộ, KHÔNG phải doanh thu món. Hiển thị thành ô RIÊNG,
  // không cộng vào `paid_revenue`.
  ship_fee_total: number;
};

type ConsumptionRow = {
  ingredient_name: string;
  unit: string;
  qty_total: number;
  portions: number;
  dishes: number;
};

/** Đổi lên đơn vị lớn khi số đủ lớn — khớp `formatQty` ở BE. "45,2 kg" dễ hình dung hơn nhiều
 * so với "45200 g", còn "150 g" thì giữ nguyên vì "0,15 kg" lại khó đọc hơn. */
function fmtIngredientQty(qty: number, unit: string): string {
  const n = (v: number) => v.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  if (unit === 'g' && qty >= 1000) return `${n(qty / 1000)} kg`;
  if (unit === 'ml' && qty >= 1000) return `${n(qty / 1000)} l`;
  return `${n(qty)} ${unit}`;
}

function vnDayLabel(key: string): string {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}
function fmtHm(ms: number): string {
  return new Date(ms).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

type OrderItem = {
  id: string;
  menu_item_id: string;
  menu_item_name: string;
  menu_item_price: number;
  qty: number;
  state: string;
  note: string | null;
  /** Dòng GHI CHÚ gửi bếp ("lấy bát") — không tính tiền, không tính là một phần món. */
  is_note?: boolean;
  cancelled_reason: string | null;
  created_by_full_name: string | null;
  served_by_full_name: string | null;
};

type HistoryOrder = {
  id: string;
  table_id: string;
  table_code: string;
  table_name: string;       // BE resolved
  opened_at: number;
  closed_at: number | null; // null = chưa thanh toán
  is_paid: boolean;
  first_kitchen_at: number | null;
  customer_name: string | null;
  customer_address: string | null;
  customer_phone: string | null;
  created_by_full_name: string | null;
  checked_out_by_full_name: string | null;
  // Đối soát MISA (2026-09-05) — null = chưa gõ đơn này sang amis.misa.vn.
  misa_copied_at: number | null;
  misa_copied_by_full_name: string | null;
  misa_ref: string | null;
  /** Đơn có thu qua mã QR HKD (2026-10-15) — server tính. Chỉ đơn này mới phải gõ sang MISA. */
  is_hkd: boolean;
  /* Thu bằng chuyển khoản (2026-09-14). `transfer_amount = 0` là mọi đơn có từ trước tính năng
     này, và cũng là đơn thu tiền mặt — tiền mặt luôn suy ra: tổng − phần chuyển khoản. */
  transfer_amount: number;
  /** Ngân hàng đã xác nhận khoản chuyển khoản này chưa (2026-09-23).
   *  `null` = đơn tiền mặt, không có gì để xác nhận. */
  bank_verified: boolean | null;
  payment_qr_label: string | null;
  transfer_note: string | null;
  /** Vì sao đơn CK này không có ảnh bill (2026-10-02). `null` = bình thường (có ảnh, hoặc đơn
   *  tiền mặt). Có chữ = người thu đã bấm "Không chụp được" và gõ lý do. */
  payment_photo_skip_reason: string | null;
  /** Số ảnh bill đã chụp. `null` = đơn không thu chuyển khoản, không có bill nào để chụp. */
  payment_photo_count: number | null;
  ship_fee: number;
  /* Ghi nợ (2026-09-25). `debt_at` có + `is_paid = false` = ĐANG NỢ; `debt_paid_at` có = đã thu
     nợ (lúc đó `is_paid = true`, và đây là mốc tiền thật của đơn). */
  debt_at: number | null;
  debt_note: string | null;
  debt_paid_at: number | null;
  debt_paid_by_full_name: string | null;
  items: OrderItem[];
};

type Table = {
  id: string;
  code: string;
  name: string;
  kind: string;
};

type Cashier = {
  id: string;
  full_name: string;
};

/** Tài khoản nhận tiền chuyển khoản, cho ô lọc "Tài khoản nhận" (2026-09-15).
 *  Lấy cả mã ĐÃ NGỪNG DÙNG (`include_inactive=1`): bộ lọc này nhìn về quá khứ, mà đơn cũ vẫn trỏ
 *  vào mã đã khoá — bỏ chúng đi là đúng những đơn khó đối soát nhất lại không lọc nổi. */
type QrAccount = {
  id: string;
  label: string;
  is_active: boolean;
};

type Status = 'all' | 'paid' | 'unpaid' | 'cancelled' | 'debt';

type Activity = {
  id: string;
  event_kind: string;
  message: string;
  actor_name: string | null;
  created_at: number;
};

const EVENT_ICON: Record<string, string> = {
  order_created: '🟢',
  items_added: '➕',
  item_cancelled: '✕',
  item_served: '🍽',
  item_returned: '↩️', // đã mang ra bàn nhưng khách không dùng → bớt khỏi bill
  note_added: '📝', // yêu cầu phục vụ gửi xuống bếp (bát, đũa thìa, nước mắm...)
  transfer: '↔️',
  checkout: '💰',
  order_cancelled: '🗑️',
  order_restarted: '🔄', // giờ vào ăn được tính lại (bàn mở trống trước đó — xem seated-at.ts)
  misa_copied: '📋', // đánh dấu đã gõ đơn sang amis.misa.vn
  debt: '📒', // ghi nợ (lúc thu hoặc admin chuyển bù)
  debt_paid: '💰', // thu được nợ
  // M7 — khách tự gọi món bằng QR. Ba dòng này cố ý KHÁC biểu tượng nhau: một quyển nhật ký
  // chỉ có ích nếu liếc qua là phân biệt được "khách gọi" với "nhân viên gật đầu cho vào bill".
  guest_request: '📱', // khách gửi lượt gọi qua QR (chưa vào bill)
  guest_request_approved: '✅', // nhân viên duyệt — tên người duyệt nằm ở actor_name
  guest_request_rejected: '🚫', // nhân viên bỏ lượt
};

function fmt(v: number) {
  return v.toLocaleString('vi-VN') + 'đ';
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}


function fmtTime(ms: number) {
  return new Date(ms).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Gộp các dòng cùng món lại để HIỂN THỊ "N×" (count = tổng qty; 1 lần gọi = 1 dòng
// mang cả số lượng, nhưng gọi nhiều lần vẫn ra nhiều dòng cần gộp).
// Gộp theo: tên + ghi chú + trạng thái + NV gọi + người giao + lý do huỷ (giống hệt mới gộp).
type ItemGroup = { key: string; rep: OrderItem; count: number };
function aggregateItems(items: OrderItem[]): ItemGroup[] {
  const map = new Map<string, ItemGroup>();
  for (const i of items) {
    const key = [
      i.menu_item_name, i.note ?? '', i.state,
      i.created_by_full_name ?? '', i.served_by_full_name ?? '', i.cancelled_reason ?? '',
    ].join('¦');
    const e = map.get(key);
    if (e) e.count += i.qty;
    else map.set(key, { key, rep: i, count: i.qty });
  }
  return Array.from(map.values());
}

export function HistoryPage() {
  const toast = useToast();
  const { user } = useAuth();
  // Admin + role Báo cáo thấy doanh thu. Nhân viên order/bếp xem được nhật ký bàn (48h) để tự
  // đối chiếu ca làm, nhưng KHÔNG thấy con số doanh thu. Đây chỉ là phần ẩn UI — /orders/stats
  // có ReportGuard nên gọi thẳng API bằng tài khoản order/bếp cũng không lấy được.
  //
  // Tên biến nói đúng việc nó gác (đổi 2026-09-09, trước là `isAdmin`): quyền XEM số liệu, chứ
  // không phải quyền admin. Nút GHI trên màn này đi theo `canMarkMisa` — role Báo cáo không có.
  const canSeeStats = ['admin', 'report'].includes(
    user?.role ?? (user?.is_owner ? 'admin' : ''),
  );
  /** Khối "Đối soát tiền" hẹp hơn `canSeeStats` một bậc: CHỈ admin, `report` cũng không (chủ quán
   *  chốt 2026-09-14). `canSeeStats` gác doanh thu BÁN HÀNG; khối kia nói tiền về tài khoản ngân
   *  hàng nào của nhà chủ — hai thứ khác nhau, nên cố ý là hai biến chứ không nới cái cũ. */
  const canSeeReconcile = (user?.role ?? (user?.is_owner ? 'admin' : '')) === 'admin';
  /** Order/Bếp KHÔNG thấy một con số tiền nào trên màn này (chủ quán chốt 2026-10-20): không
   *  tổng bill, không giá món, không số trong câu nhật ký. Trước đó chỉ ẩn ô tổng doanh thu, nhưng
   *  tổng từng bàn vẫn hiện nên nhân viên tự cộng tay ra doanh thu ca. Giờ họ chỉ thấy HOẠT ĐỘNG:
   *  món gì, mấy phần, ai gọi / huỷ / giao / trả bàn, lúc nào.
   *  CHỈ che giao diện — API vẫn trả số (chủ quán chọn: ở quán không ai mở công cụ trình duyệt).
   *  Cùng tập người với `canSeeStats`, tách tên để chỗ dùng nói đúng việc nó gác. */
  const canSeeMoney = canSeeStats;
  /** Ngoại lệ của `canSeeMoney` (chủ quán 2026-10-22): đơn ĐÃ THANH TOÁN thì Order/Bếp thấy đủ
   *  tiền, ảnh bill, nút in lại. An toàn vì server chỉ trả cho họ đơn đã thu do CHÍNH HỌ thu
   *  (`paid_only_by_user_id` ở BE) — đơn người khác thu không bao giờ tới FE. Đơn đang dùng / huỷ /
   *  nợ vẫn che như cũ. */
  const canSeeOrderMoney = (o: HistoryOrder) => canSeeMoney || (!!o.closed_at && o.is_paid);
  const [tables, setTables] = useState<Table[]>([]);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  /** Tăng để tải lại danh sách + số liệu sau một thao tác đổi trạng thái đơn (thu nợ, chuyển
   *  sang nợ) mà không đổi bộ lọc. */
  const [reloadTick, setReloadTick] = useState(0);
  const [tableFilter, setTableFilter] = useState<string>('');
  const [cashierFilter, setCashierFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<Status>('all');
  // Đối soát MISA — '' = không lọc, 'pending' = đã thu tiền nhưng chưa gõ sang AMIS.
  const [misaFilter, setMisaFilter] = useState<'' | 'pending' | 'copied'>('');
  /** Lọc theo hình thức thu tiền (2026-09-14). Là Ô CHỌN riêng chứ không nhập vào dãy tab trạng
   *  thái: nó CHỒNG lên trạng thái chứ không thay thế — "đã thanh toán + chuyển khoản" là câu
   *  hỏi có thật lúc đối soát, còn dãy tab kia thì chọn cái này là tắt cái kia. */
  const [paymentFilter, setPaymentFilter] = useState<HistoryPayment>('');
  /** Lọc theo "ngân hàng đã xác nhận chưa" (2026-09-23). Chồng lên ô hình thức thu chứ không
   *  thay thế: nó chỉ có nghĩa với đơn chuyển khoản, và BE đã tự giới hạn ở đó. */
  const [verifiedFilter, setVerifiedFilter] = useState<HistoryVerified>('');
  /** Lọc đơn CK theo chuyện có ảnh bill hay không (2026-10-02). */
  const [photoFilter, setPhotoFilter] = useState<HistoryPhoto>('');
  /** Lọc theo TÀI KHOẢN NHẬN tiền (2026-09-15) — câu hỏi lúc cầm sao kê của một tài khoản: "đơn
   *  nào trong app đã thu về đây?". Chồng lên các trục kia y như ô hình thức thu tiền. */
  const [qrAccountFilter, setQrAccountFilter] = useState<string>('');
  /** Rỗng cũng có nghĩa là KHÔNG ĐƯỢC XEM: `/payment-qr` trả 403 cho người không được thu chuyển
   *  khoản. Ô lọc ẩn theo danh sách này thay vì theo role — ẩn đúng cái BE thật sự từ chối. */
  const [qrAccounts, setQrAccounts] = useState<QrAccount[]>([]);
  /**
   * Công tắc "xác thực giao dịch tại quầy" (chủ quán 2026-09-25). TẮT thì cột "Xác thực" và ô lọc
   * của nó biến mất khỏi màn này.
   *
   * `false` lúc khởi tạo, và đọc hỏng cũng là `false` — cùng lệ "hỏng thì hiểu là TẮT" với
   * `CheckoutDialog`. Ở màn này còn một lý do riêng: `/payment-qr` trả 403 cho người không được
   * thu chuyển khoản, mà họ cũng chẳng có việc gì với cột đó.
   */
  const [verifyOn, setVerifyOn] = useState(false);
  /** Khoảng thời gian đang xem — MỘT state chứ không phải cặp `startDate`/`endDate` rời:
   *  khoảng "ca" mang thêm cờ `shift` mà hai ô ngày không diễn tả được, và tách ra thì sẽ có
   *  lúc cờ bật còn ngày chưa xoá (hoặc ngược lại) — giao diện nói một đằng, query hỏi một nẻo.
   *
   *  Mặc định là CA ĐANG CHẠY chứ không phải "Tất cả" như trước (chốt 2026-09-11): việc mở màn
   *  này nhiều nhất là xem buổi bán đang diễn ra, còn "Tất cả" thì vừa mở đã kéo cả năm đơn về.
   *  Ai cần toàn bộ vẫn bấm chip "Tất cả" — một cú chạm. */
  const [range, setRange] = useState<DayRange>(() => presetRange('shift', Date.now()));
  /** Trục sắp xếp (2026-09-09). Mặc định giữ nguyên nếp cũ — giờ VÀO ĂN. Đổi sang giờ THANH
   *  TOÁN để đối soát ca thu ngân: bàn ngồi từ tối hôm trước, thu tiền sáng hôm sau, xếp theo
   *  giờ vào là nó nằm lẫn ở ngày cũ.
   *  KHÔNG phải "bộ lọc": nó không bỏ bớt đơn nào, nên không tính vào `hasActiveFilter` và nút
   *  "Xoá lọc" cũng không đụng tới. */
  const [sortBy, setSortBy] = useState<HistorySort>('opened');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<Stats | null>(null);
  const [consumption, setConsumption] = useState<ConsumptionRow[]>([]);
  /** `true` từ lúc bộ lọc đổi tới lúc số liệu mới về — để ô tổng quan hiện "…" thay vì 0đ. */
  const [statsLoading, setStatsLoading] = useState(false);
  /** Số thứ tự của lần tải MỚI NHẤT. Response mang số cũ về muộn thì bỏ.
   *
   *  Bug 2026-09-09: một lần sửa ô ngày `<input type="date">` bắn nhiều `onChange`, và bộ lọc
   *  rộng hơn thì request chậm hơn (`/orders/stats` chạy 6 truy vấn, 3 trong đó `COUNT` cả
   *  bảng `orders`). Không có chốt này thì response của bộ lọc CŨ về sau cùng và ghi đè —
   *  danh sách đơn đã đổi theo ngày mới trong khi biểu đồ vẫn là số của cả kỳ. */
  const listSeqRef = useRef(0);
  const statsSeqRef = useRef(0);
  /** Ba góc nhìn của màn (2026-11-06, thay hai nút "Hiện biểu đồ" / khối đối soát nằm trên bảng).
   *  Mặc định vẫn là DANH SÁCH (giữ quyết định 2026-09-05: việc thường ngày là soi đơn, biểu đồ
   *  không được đẩy danh sách xuống). "Đối soát" chỉ admin — cùng lệ `canSeeReconcile`. */
  const [view, setView] = useState<'list' | 'charts' | 'reconcile'>('list');
  /** Tấm "Lọc" trượt từ đáy — chứa các bộ lọc ít dùng (bàn, thu ngân, hình thức thu…). Thời gian
   *  và trạng thái luôn hiện ngoài, vì đó là hai câu hỏi mở màn này nhiều nhất. */
  const [sheetOpen, setSheetOpen] = useState(false);
  /** Top món xếp theo tiền hay theo số phần. */
  const [topBy, setTopBy] = useState<'revenue' | 'qty'>('revenue');
  /** Hai biểu đồ cột vẽ theo TIỀN hay theo SỐ ĐƠN — một chip chung cho cả hai.
   *
   *  Chung chứ không mỗi biểu đồ một chip: hai câu hỏi "ngày nào thu nhiều nhất" và "giờ nào
   *  đông khách nhất" hay được hỏi liền nhau, mà mỗi biểu đồ một chỉ số riêng thì phải nhớ
   *  đang xem cái nào ở đâu. Dữ liệu BE trả về vốn có sẵn cả hai cho cả ngày lẫn giờ. */
  const [chiSo, setChiSo] = useState<'revenue' | 'orders'>('revenue');
  const PAGE_SIZE = 20;

  /** Bộ lọc hiện tại gom thành MỘT object — cả ba request (danh sách / biểu đồ / tiêu hao) đọc
   *  cùng nguồn này qua `historyQuery`, thay cho ba khối `URLSearchParams` chép tay đã lệch
   *  nhau ở khoảng ngày. Xem `lib/history-filter.ts`. */
  const filters: HistoryFilters = {
    table_id: tableFilter,
    cashier_user_id: cashierFilter,
    qr_account_id: qrAccountFilter,
    status: statusFilter,
    misa: misaFilter,
    payment: paymentFilter,
    // Công tắc tắt thì ô lọc biến mất khỏi màn — nhưng giá trị cũ còn nằm trong state, và gửi
    // tiếp là lọc mất đơn bằng một điều kiện KHÔNG CÒN Ô NÀO hiện ra để gỡ. Ép rỗng ở đây, tại
    // chỗ dựng query, thay vì đi dọn state: một nguồn sự thật, không phụ thuộc thứ tự effect.
    verified: verifyOn ? verifiedFilter : '',
    photo: photoFilter,
    from: range.from,
    to: range.to,
    shift: range.shift,
  };
  /** Chuỗi định danh bộ lọc, dùng làm deps của effect: đổi `page` không được bắt biểu đồ tải
   *  lại (biểu đồ không theo trang), đổi bất cứ trục lọc nào thì phải. */
  const filterKey = historyFilterKey(filters);

  useEffect(() => {
    Promise.all([
      api.get<{ data: { items: Table[] } }>('/tables'),
      api.get<{ data: { items: Cashier[] } }>('/orders/cashiers'),
    ])
      .then(([tablesRes, cashiersRes]) => {
        setTables(tablesRes.data.data.items);
        setCashiers(cashiersRes.data.data.items);
      })
      .catch((err) => toast.push('error', extractError(err).message));
  }, [toast]);

  /** Danh sách tài khoản nhận tiền — request RIÊNG, không gộp vào `Promise.all` ở trên.
   *
   *  Vì nó được phép hỏng: người không có quyền thu chuyển khoản ăn 403 ở đây, và nếu nằm trong
   *  `Promise.all` thì một 403 sẽ kéo đổ cả danh sách bàn lẫn danh sách thu ngân — mất hai bộ lọc
   *  đang chạy tốt để đổi lấy một bộ lọc họ vốn không được dùng. Lỗi ở đây nuốt lặng (không toast):
   *  không có quyền là chuyện bình thường, không phải sự cố cần báo. */
  useEffect(() => {
    api
      .get<{ data: { items: QrAccount[]; verify_enabled?: boolean } }>('/payment-qr?include_inactive=1')
      .then((res) => {
        setQrAccounts(res.data.data.items);
        setVerifyOn(res.data.data.verify_enabled ?? false);
      })
      .catch(() => {
        setQrAccounts([]);
        setVerifyOn(false);
      });
  }, []);

  useEffect(() => {
    const seq = ++listSeqRef.current;
    setLoading(true);
    const timer = window.setTimeout(() => {
      api
        .get<{ data: { items: HistoryOrder[]; total: number } }>(
          `/orders/history?${historyQuery(filters, { page: { page, page_size: PAGE_SIZE }, sort: sortBy })}`,
        )
        .then((res) => {
          if (seq !== listSeqRef.current) return; // response của bộ lọc đã rời → bỏ
          setOrders(res.data.data.items);
          setTotal(res.data.data.total);
          setLoading(false);
        })
        .catch((err) => {
          if (seq !== listSeqRef.current) return;
          toast.push('error', extractError(err).message);
          setLoading(false);
        });
    }, FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, page, sortBy, reloadTick]);

  // Số liệu biểu đồ — theo bàn/thu ngân/khoảng ngày VÀ tab đang chọn (2026-09-05): đổi tab
  // thì doanh thu theo ngày, top món, tiêu hao... đổi theo, không chỉ danh sách đơn. Vẫn
  // KHÔNG theo trang: bảng số nói về cả bộ lọc, không phải 20 dòng đang xem.
  // Bỏ hẳn request với nhân viên order: endpoint có ReportGuard nên gọi chỉ để nhận
  // 403, vừa vô ích vừa làm rác log server.
  useEffect(() => {
    if (!canSeeStats) {
      setStats(null);
      setConsumption([]);
      setStatsLoading(false);
      return;
    }
    const seq = ++statsSeqRef.current;
    // Xoá số của bộ lọc TRƯỚC ngay tại đây, không đợi response. Để nguyên thì suốt lúc chờ,
    // biểu đồ vẫn vẽ số cũ mà không có dấu hiệu nào — đúng cái làm người xem tin là "sửa
    // filter thời gian không ăn vào biểu đồ".
    setStats(null);
    setConsumption([]);
    setStatsLoading(true);
    const timer = window.setTimeout(() => {
      api
        .get<{ data: Stats }>(`/orders/stats?${historyQuery(filters)}`)
        .then((res) => {
          if (seq !== statsSeqRef.current) return; // response của bộ lọc đã rời → bỏ
          setStats(res.data.data);
          setStatsLoading(false);
        })
        .catch(() => {
          if (seq !== statsSeqRef.current) return;
          setStats(null);
          setStatsLoading(false);
        });

      // Tiêu hao nguyên liệu — CÙNG bộ lọc ngày/bàn + tab, bỏ `cashier_user_id`: nguyên liệu
      // tốn theo món khách ăn, không theo ai đứng thu tiền (`cashier: false`).
      api
        .get<{ data: { items: ConsumptionRow[] } }>(
          `/consumption?${historyQuery(filters, { cashier: false })}`,
        )
        .then((res) => {
          if (seq !== statsSeqRef.current) return;
          setConsumption(res.data.data.items);
        })
        .catch(() => {
          if (seq !== statsSeqRef.current) return;
          setConsumption([]);
        });
    }, FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeStats, filterKey, reloadTick]);

  /** Chọn 1 tab trong dãy pill trên cùng — loại trừ lẫn nhau.
   *
   * Misa và trạng thái đơn nằm chung MỘT dãy tab: chọn tab này thì tab kia tắt. Trước đây
   * Misa là bộ lọc chồng lên trạng thái nên bấm nó xong, kết quả của mọi tab trạng thái đều
   * bị cắt theo Misa — nhìn như cả trang đổi chứ không chỉ danh sách đơn. */
  const selectTab = (tab: Status | 'misa') => {
    if (tab === 'misa') {
      setMisaFilter('copied');
      setStatusFilter('all');
    } else {
      setMisaFilter('');
      setStatusFilter(tab);
    }
    setPage(1);
  };

  /** Đổi trục sắp xếp → về trang 1. "Trang 3" của thứ tự này không phải "trang 3" của thứ tự
   *  kia, giữ nguyên số trang là người dùng nhảy vào giữa một danh sách khác hẳn. */
  const changeSort = (s: HistorySort) => {
    setSortBy(s);
    setPage(1);
  };

  const onResetFilters = () => {
    setTableFilter('');
    setCashierFilter('');
    setStatusFilter('all');
    setMisaFilter('');
    setPaymentFilter('');
    setQrAccountFilter('');
    // Về MẶC ĐỊNH (ca đang chạy), không phải về "Tất cả thời gian": "Xoá lọc" nghĩa là trả màn
    // về đúng lúc mới mở lên. Trả về "Tất cả" ở đây thì bấm một nút lại thành kéo về toàn bộ
    // lịch sử — rộng hơn hẳn thứ người dùng vừa xem, và đó không phải thứ họ định làm.
    setRange(presetRange('shift', Date.now()));
    setPage(1);
  };

  /** Tiền món ĐÃ GIAO — số đi vào bill / thu nợ / chuyển nợ. Không đổi nghĩa. */
  const orderTotal = (o: HistoryOrder) => {
    return (o.items || [])
      .filter((i) => i.state === 'SERVED')
      .reduce((s, i) => s + i.menu_item_price * i.qty, 0);
  };

  /** Lấy `needCheck` — số đơn CK "chưa khớp" trong bộ lọc hiện tại (trừ chính ô xác thực), để
   *  chip "Cần kiểm tra (n)" nói trước có bao nhiêu đơn. Gọi lại đúng `/orders/history` với
   *  `page_size=1` — chỉ cần `total`. */
  const [needCheck, setNeedCheck] = useState<number | null>(null);
  const needCheckKey = historyFilterKey({ ...filters, verified: '' });
  useEffect(() => {
    if (!canSeeMoney || !verifyOn) {
      setNeedCheck(null);
      return;
    }
    let alive = true;
    const timer = window.setTimeout(() => {
      api
        .get<{ data: { items: HistoryOrder[]; total: number } }>(
          `/orders/history?${historyQuery({ ...filters, verified: 'no' }, { page: { page: 1, page_size: 1 } })}`,
        )
        .then((res) => { if (alive) setNeedCheck(res.data.data.total); })
        .catch(() => { if (alive) setNeedCheck(null); });
    }, FILTER_DEBOUNCE_MS);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needCheckKey, canSeeMoney, verifyOn, reloadTick]);

  /** Đơn đang nợ được bấm "Thu nợ" — mở lại đúng hộp thoại thu tiền (2026-09-25, D-04). */
  const [settleTarget, setSettleTarget] = useState<HistoryOrder | null>(null);
  const onDebtSettled = (o: HistoryOrder) => {
    setSettleTarget(null);
    toast.push('success', `✓ Đã thu nợ ${o.table_name}${o.debt_note ? ` · ${o.debt_note}` : ''}`);
    // Tải lại thay vì sửa tại chỗ: đơn vừa rời tab "Đang nợ", và mốc tiền đổi sang hôm nay nên
    // nhóm ngày của nó cũng đổi — vá tay từng trường là chắc chắn lệch với BE ở đâu đó.
    setReloadTick((t) => t + 1);
  };

  /** Có đang đứng ở một tab cụ thể không (khác "Tất cả") — số liệu bên dưới cắt theo tab đó. */
  const tabActive = statusFilter !== 'all' || !!misaFilter;

  /** Nhãn số liệu theo tab đang chọn.
   *
   * Cùng bộ biểu đồ nhưng Ý NGHĨA đổi theo tab, nên nhãn phải đổi theo: ở tab "Đã huỷ", con số
   * to màu xanh mà vẫn đề "Doanh thu đã thanh toán" là đọc sai hẳn báo cáo. */
  const tabView =
    misaFilter === 'copied'
      ? { money: 'Doanh thu đã lên Misa', count: 'Đơn đã lên Misa', hint: 'Đơn đã thu tiền & đã gõ sang Misa', top: 'Top món (đơn đã lên Misa)' }
      : statusFilter === 'unpaid'
        ? { money: 'Tiền đang chờ thu', count: 'Đơn chưa thanh toán', hint: 'Đơn đang mở - món chưa huỷ', top: 'Top món đang chờ thu' }
        : statusFilter === 'cancelled'
          ? { money: 'Giá trị đơn đã huỷ', count: 'Đơn bị huỷ', hint: 'Món bị huỷ ở các đơn kết bằng huỷ', top: 'Top món bị huỷ' }
          : statusFilter === 'debt'
            ? { money: 'Khách đang nợ', count: 'Đơn đang nợ', hint: 'Bàn đã trả, tiền chưa thu — CHƯA vào doanh thu', top: 'Top món đang nợ' }
          : statusFilter === 'paid'
            ? { money: 'Doanh thu đã thanh toán', count: 'Đơn đã thanh toán', hint: 'Chỉ tính đơn đã thanh toán', top: 'Top món bán chạy' }
            : { money: 'Doanh thu đã thanh toán', count: 'Tổng đơn khớp lọc', hint: 'Chỉ tính đơn đã thanh toán', top: 'Top món bán chạy' };

  // Bếp xem được lịch sử nhưng không đối soát kế toán → chỉ thấy badge, không bấm được.
  // BE cũng chặn bằng RequireRoles('admin','order'); đây chỉ là lớp UX.
  const canMarkMisa = ['admin', 'order'].includes(user?.role ?? (user?.is_owner ? 'admin' : ''));
  /** In lại hoá đơn: thêm bếp so với `canMarkMisa` (2026-10-22) — bếp cũng thu tiền được và giờ
   *  thấy đơn mình thu. Khớp `RequireRoles` của `POST /orders/:id/print`. */
  const canReprint = ['admin', 'order', 'kitchen'].includes(user?.role ?? (user?.is_owner ? 'admin' : ''));

  /** Tick / bỏ tick "đã gõ sang MISA" ngay trên dòng lịch sử.
   *
   * Cập nhật tại chỗ thay vì tải lại cả danh sách: khi đang ở bộ lọc "Misa", tải lại sẽ
   * làm dòng vừa tick biến mất và cả danh sách nhảy — người đang gõ dở mất chỗ. Dòng ở lại,
   * badge đổi màu; lần lọc sau nó mới rời danh sách. */
  const toggleMisa = async (o: HistoryOrder) => {
    const next = o.misa_copied_at == null;
    try {
      const res = await api.patch<{
        data: { misa_copied_at: number | null; misa_copied_by_full_name: string | null };
      }>(`/orders/${o.id}/misa`, { copied: next });
      const d = res.data.data;
      setOrders((cur) =>
        cur.map((x) =>
          x.id === o.id
            ? {
                ...x,
                misa_copied_at: d.misa_copied_at,
                misa_copied_by_full_name: d.misa_copied_by_full_name,
              }
            : x,
        ),
      );
      toast.push('success', next ? `✓ ${o.table_name} — đã đánh dấu lên Misa` : `Đã bỏ đánh dấu Misa — ${o.table_name}`);
    } catch (err) {
      toast.push('error', extractError(err).message);
    }
  };

  /** Đơn đang gửi lệnh in — chặn bấm đúp. Kẹt giấy là lúc người ta bấm liên tục, và mỗi cú bấm
   *  là một tờ giấy thật: khác `toggleMisa` ở chỗ thao tác này KHÔNG tự trung hoà được. */
  /**
   * Menu ⋯ của MỘT dòng đơn (2026-09-28, chủ quán: "đưa in hoá đơn và chuyển nợ vào ⋯ để khỏi vỡ
   * giao diện"). Cột thao tác trước đó có tới 4 thứ (Thu nợ · Misa · 🖨 · → Nợ) nên trên điện thoại
   * dòng 4 của thẻ đơn tràn. Giữ thường trực chỉ những gì làm MỖI đơn (Misa, Thu nợ); in lại và
   * chuyển sang nợ là việc thỉnh thoảng — cùng lệ với menu ⋯ ở header drawer bàn.
   *
   * Toạ độ FIXED chứ không absolute như `.drawer-menu` gốc: bảng nằm trong khung `overflow-x: auto`,
   * menu absolute sẽ bị khung đó cắt cụt ở dòng cuối. Neo theo nút vừa bấm, đóng khi cuộn.
   */
  const [rowMenu, setRowMenu] = useState<
    { id: string; anchorTop: number; anchorBottom: number; right: number } | null
  >(null);
  useEffect(() => {
    if (!rowMenu) return;
    const close = () => setRowMenu(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [rowMenu]);

  /**
   * LẬT MENU LÊN KHI DƯỚI HẾT CHỖ (2026-10-02).
   *
   * Bản cũ luôn đặt menu ở `nút.bottom + 6`. Đơn nằm cuối màn hình thì menu đổ xuống vùng của
   * thanh `.nav-bottom` — mà thanh đó `z-index: 100` còn `.drawer-menu` chỉ `41`, nên mục thứ
   * hai ("Chuyển sang nợ") BIẾN MẤT dưới thanh nav. Nhìn ra thì tưởng menu chỉ có một mục, chứ
   * không ai nghĩ là bị che: menu vẫn bo góc, vẫn đổ bóng, trông như đã hiện đủ.
   *
   * Phải ĐO menu sau khi nó vào DOM chứ không đoán chiều cao: số mục đổi theo quyền (chỉ admin
   * mới có "Chuyển sang nợ"), nên một hằng số chiều cao sẽ sai đúng với nửa số người dùng.
   *
   * `useLayoutEffect` chứ không `useEffect`: nó chạy TRƯỚC khi trình duyệt vẽ, nên người dùng
   * không thấy menu nhảy một nhịp từ chỗ sai sang chỗ đúng.
   */
  const rowMenuRef = useRef<HTMLDivElement>(null);
  const [rowMenuTop, setRowMenuTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!rowMenu) {
      setRowMenuTop(null);
      return;
    }
    const el = rowMenuRef.current;
    if (!el) return;
    const GAP = 6;
    const menuH = el.offsetHeight;
    // Đo thanh nav thật thay vì hằng số: nó cao khác nhau giữa máy có và không có safe-area
    // (`env(safe-area-inset-bottom)` ở `.nav-bottom`), và ẩn hẳn trên máy tính.
    const nav = document.querySelector('.nav-bottom');
    const floor = window.innerHeight - (nav ? nav.getBoundingClientRect().height : 0) - GAP;
    let top = rowMenu.anchorBottom + GAP;
    if (top + menuH > floor) top = rowMenu.anchorTop - GAP - menuH; // lật lên trên nút
    // Lật lên mà vẫn tràn khỏi mép trên (menu dài, màn ngắn) → ép nó nằm trọn trong vùng dùng
    // được, chấp nhận che mất dòng đơn. Thà đè lên thứ người ta vừa bấm còn hơn cắt cụt menu.
    if (top < GAP) top = Math.max(GAP, floor - menuH);
    setRowMenuTop(top);
  }, [rowMenu]);
  const rowMenuOrder = rowMenu ? orders.find((o) => o.id === rowMenu.id) ?? null : null;

  /** Admin chuyển đơn ĐÃ THU sang nợ (thu ngân bấm nhầm). Hộp thoại của app (không phải
   *  `window.prompt` của trình duyệt): nói rõ việc này RÚT tiền khỏi doanh thu, bắt gõ tên khách
   *  rồi mới cho bấm — là bước xác nhận cho một thao tác đổi doanh thu (góp ý 2026-11-06). */
  const prompt = usePrompt();
  const [markingDebt, setMarkingDebt] = useState<Set<string>>(new Set());
  const markAsDebt = async (o: HistoryOrder) => {
    const note = await prompt({
      title: `Chuyển ${o.table_name} sang nợ`,
      message:
        `Đơn ${fmt(orderTotal(o) + (o.ship_fee || 0))} sẽ bị rút khỏi doanh thu, ` +
        'phần chuyển khoản đã ghi cũng bị xoá - chỉ làm khi thu ngân bấm nhầm',
      label: 'Ai nợ? (tên khách)',
      defaultValue: o.customer_name ?? '',
      confirmLabel: 'Chuyển sang nợ',
      validate: (v) => (v.trim() ? null : 'Nhập tên khách nợ'),
    });
    if (note === null || !note.trim()) return;
    setMarkingDebt((s) => new Set(s).add(o.id));
    try {
      await api.patch(`/orders/${o.id}/debt`, { debt_note: note.trim() });
      toast.push('success', `📒 ${o.table_name} → đang nợ (${note.trim()})`);
      setReloadTick((t) => t + 1);
    } catch (err) {
      toast.push('error', extractError(err).message);
    } finally {
      setMarkingDebt((s) => {
        const n = new Set(s);
        n.delete(o.id);
        return n;
      });
    }
  };

  const [reprinting, setReprinting] = useState<Set<string>>(new Set());

  /** In lại hoá đơn của một đơn đã thanh toán.
   *
   * Tờ in ra mang dấu "BẢN IN LẠI" kèm giờ (xem `receipt-model.ts` ở BE) — hai tờ giống hệt
   * nhau trên quầy là đường dẫn thẳng tới thu tiền hai lần. */
  const reprintReceipt = async (o: HistoryOrder) => {
    if (reprinting.has(o.id)) return;
    setReprinting((s) => new Set(s).add(o.id));
    try {
      const res = await api.post<{ data: { queued: boolean } }>(`/orders/${o.id}/print`, {});
      if (res.data.data.queued) {
        toast.push('success', `Đang in lại hoá đơn — ${o.table_name}`);
      } else {
        // Không phải lỗi thao tác: công tắc in đang tắt hoặc chưa khai máy in.
        toast.push('error', 'Chưa bật in hoá đơn — vào Cài đặt → Máy in để bật');
      }
    } catch (err) {
      toast.push('error', extractError(err).message);
    } finally {
      setReprinting((s) => {
        const n = new Set(s);
        n.delete(o.id);
        return n;
      });
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Gom đơn của trang hiện tại theo ngày (giờ VN), giữ thứ tự BE trả về.
  // Gom theo ĐÚNG trục đang sắp xếp — gom theo ngày vào ăn trong khi danh sách xếp theo giờ
  // thanh toán thì cùng một ngày sẽ hiện thành nhiều dải rời rạc, trông như dữ liệu lỗi.
  const dayGroups = useMemo(() => {
    const groups: Array<{ key: string; orders: HistoryOrder[] }> = [];
    for (const o of orders) {
      const key =
        sortBy === 'paid'
          ? o.closed_at
            ? vnDayIso(o.closed_at)
            : UNPAID_GROUP
          : vnDayIso(o.opened_at);
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.orders.push(o);
      else groups.push({ key, orders: [o] });
    }
    return groups;
  }, [orders, sortBy]);
  // Doanh thu THỰC mỗi ngày (từ stats — toàn bộ filter) để hiện ở header ngày.
  const dayRevenue = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of stats?.revenue_by_day || []) m.set(d.day, d.revenue);
    return m;
  }, [stats]);

  /** Nhãn + cách định dạng của chỉ số đang xem. Gom một chỗ để tiêu đề thẻ, nhãn trục dọc và
   *  chip không bao giờ nói ba thứ khác nhau. */
  const chiSoView =
    chiSo === 'revenue'
      ? { ten: 'Doanh thu', icon: '💰', format: fmtShort }
      : // Số đơn là số ĐẾM, không rút gọn thành "1,2k": ở quán một ngày vài chục đơn, rút gọn
        // chỉ làm mất con số thật mà chẳng tiết kiệm được ký tự nào.
        { ten: 'Số đơn', icon: '🧾', format: (v: number) => String(Math.round(v)) };

  /** Có đang lọc khác MẶC ĐỊNH không — quyết định hiện nút "Xoá lọc".
   *
   *  Khoảng thời gian tính là "có lọc" khi nó KHÁC ca đang chạy: ca là mặc định, nên đang ở ca
   *  mà vẫn mời "Xoá lọc" thì nút đó chẳng xoá gì cả. */
  const hasActiveFilter =
    tableFilter ||
    cashierFilter ||
    statusFilter !== 'all' ||
    misaFilter ||
    paymentFilter ||
    (verifyOn && verifiedFilter) ||
    photoFilter ||
    qrAccountFilter ||
    // Mặc định của màn là CA ĐANG CHẠY, nên chỉ nó mới là "không lọc gì". Ca trước là một lựa
    // chọn có chủ ý và phải tính là đang lọc — nếu không thì nút "Xoá lọc" biến mất đúng lúc
    // người dùng cần nó nhất để quay về ca hiện tại.
    range.shift !== 'current';

  /** Số bộ lọc đang bật TRONG tấm "Lọc" — hiện trên nút để người dùng biết danh sách đang bị cắt
   *  bởi thứ không nhìn thấy ngoài màn. Sắp xếp không tính: nó không bỏ bớt đơn nào. */
  const sheetFilterCount = [
    tableFilter,
    cashierFilter,
    canSeeMoney && paymentFilter,
    canSeeMoney && verifyOn && verifiedFilter,
    canSeeMoney && photoFilter,
    canSeeMoney && qrAccountFilter,
  ].filter(Boolean).length;

  /** Bàn gom theo loại (bàn ngồi / mang về / ship) cho <optgroup>, giữ thứ tự BE trả. */
  const tableGroups = Array.from(
    tables.reduce((m, t) => m.set(t.kind, [...(m.get(t.kind) ?? []), t]), new Map<string, Table[]>()),
  );

  const showViewTabs = canSeeStats;
  const listVisible = !showViewTabs || view === 'list';

  return (
    <PageLayout
      className="history-page"
      actions={
        canSeeReconcile ? (
          // Cửa vào sổ webhook — đưa lên hàng nút của trang (góp ý 2026-11-06) thay vì đứng cạnh
          // một <h1> thứ hai trong màn. Người cần nó luôn đang đứng ở màn này: họ vừa thấy một đơn
          // "chưa khớp" và muốn xem ngân hàng báo gì.
          <a href="/admin/bank-ledger" className="hp-link-btn">
            <Landmark size={20} aria-hidden />
            Sổ webhook ngân hàng
          </a>
        ) : undefined
      }
    >
      {/* Thu nợ (2026-09-25): dùng lại NGUYÊN hộp thoại thu tiền — cùng ba hình thức, cùng mã QR,
          cùng ảnh bill — chỉ khác endpoint. */}
      {settleTarget && (
        <CheckoutDialog
          settleDebt
          orderId={settleTarget.id}
          table={{ code: settleTarget.table_code, name: settleTarget.table_name }}
          cashier={{ full_name: user?.full_name, username: user?.name }}
          canCollectTransfer={!!user?.can_collect_transfer}
          items={settleTarget.items || []}
          itemsTotal={orderTotal(settleTarget)}
          shipFee={settleTarget.ship_fee || 0}
          onCancel={() => setSettleTarget(null)}
          onDone={() => onDebtSettled(settleTarget)}
        />
      )}

      {/* ── Bộ lọc (sắp lại 2026-11-06) ──────────────────────────────────────────────
          Trước: ~19 điều khiển, 3 kiểu (chip / ô chọn / nút) trên 3–4 hàng → trên điện thoại đơn
          đầu tiên nằm ở ~60% chiều cao màn. Nay chỉ còn HAI hàng luôn hiện:
            1. Thời gian (lên đầu — câu hỏi đầu tiên khi mở màn: "xem buổi nào")
            2. Trạng thái + "Cần kiểm tra (n)" + nút "Lọc (n)"
          Mọi bộ lọc còn lại (bàn, thu ngân, hình thức thu, xác thực, ảnh bill, tài khoản nhận,
          sắp xếp) vào tấm "Lọc" trượt từ đáy. Không bộ lọc nào bị bỏ. */}
      <div className="hp-filters">
        <DateRangePicker
          label="Thời gian"
          value={range}
          shiftChip
          onChange={(r) => { setRange(r); setPage(1); }}
        />

        <div className="hp-filter-row">
          {/* Dãy trạng thái LOẠI TRỪ lẫn nhau (kể cả Misa) — giữ luật `selectTab`. Một hàng vuốt
              ngang trên điện thoại, mép phải mờ dần báo còn chip; ≥900px thì xuống dòng. */}
          <div className="hp-scroll" role="group" aria-label="Lọc theo trạng thái đơn">
            <FilterChip active={!misaFilter && statusFilter === 'all'} onClick={() => selectTab('all')}>
              Tất cả
            </FilterChip>
            {/* Order/Bếp có lại tab này từ 2026-10-22 — server chỉ trả đơn chính họ thu. */}
            <FilterChip active={!misaFilter && statusFilter === 'paid'} onClick={() => selectTab('paid')}>
              Đã thanh toán
            </FilterChip>
            <FilterChip active={!misaFilter && statusFilter === 'unpaid'} onClick={() => selectTab('unpaid')}>
              Chưa thanh toán
            </FilterChip>
            {/* Bàn kết thúc bằng huỷ — để chủ quán soi gọi đồ rồi huỷ thay vì thu tiền. */}
            <FilterChip active={!misaFilter && statusFilter === 'cancelled'} onClick={() => selectTab('cancelled')}>
              Đã huỷ
            </FilterChip>
            {/* Đang nợ: chỉ admin (chủ quán chốt 2026-10-20) — thu nợ phải nhìn số tiền. */}
            {canSeeMoney && (
              <FilterChip active={!misaFilter && statusFilter === 'debt'} onClick={() => selectTab('debt')}>
                Đang nợ
              </FilterChip>
            )}
            {/* Misa: chỉ đơn thu qua mã QR HKD (server lọc, 2026-10-15). */}
            {canSeeMoney && (
              <FilterChip active={misaFilter === 'copied'} onClick={() => selectTab('misa')}>
                Đã lên Misa
              </FilterChip>
            )}
          </div>

          <div className="hp-filter-tools">
            {/* "Cần kiểm tra (n)" (2026-11-06): lối tắt tới đơn chuyển khoản mà ngân hàng chưa
                báo về — chính là ô lọc "Không thấy GD" trong tấm Lọc, đưa ra ngoài kèm số đếm để
                đơn lệch không phải đi tìm. Chỉ hiện khi công tắc xác thực bật. */}
            {canSeeMoney && verifyOn && (
              <button
                type="button"
                className={`hp-chip hp-chip--warn${needCheck ? '' : ' hp-chip--zero'}`}
                aria-pressed={verifiedFilter === 'no'}
                onClick={() => { setVerifiedFilter(verifiedFilter === 'no' ? '' : 'no'); setPage(1); }}
              >
                <AlertTriangle size={18} aria-hidden />
                Cần kiểm tra
                <span className="hp-chip-count">{needCheck ?? '…'}</span>
              </button>
            )}
            <button
              type="button"
              className="secondary hp-filter-btn"
              aria-haspopup="dialog"
              onClick={() => setSheetOpen(true)}
            >
              <SlidersHorizontal size={20} aria-hidden />
              Lọc{sheetFilterCount > 0 && <span className="hp-filter-btn-count">{sheetFilterCount}</span>}
            </button>
            {hasActiveFilter && (
              <button type="button" className="secondary hp-filter-btn" onClick={onResetFilters}>
                <X size={20} aria-hidden />
                Xoá lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {sheetOpen && (
        <div className="nav-sheet-overlay" onClick={() => setSheetOpen(false)}>
          <div
            className="nav-sheet hp-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Bộ lọc"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nav-sheet-head">
              <strong>Bộ lọc</strong>
              <button
                type="button"
                className="secondary nav-sheet-close"
                aria-label="Đóng"
                onClick={() => setSheetOpen(false)}
              >
                <X size={22} aria-hidden />
              </button>
            </div>

            <div className="hp-sheet-body">
              {/* Ô chọn GỐC của máy (2026-11-06) thay cho dropdown tự vẽ: cao 48px, chữ 16px, trên
                  điện thoại mở bộ chọn của hệ điều hành — dropdown cũ chữ 11–14px và bị khung cuộn
                  của tấm Lọc cắt mất. Bàn nhóm theo loại bằng <optgroup>. */}
              <label className="hp-field">
                <span className="hp-field-label">Bàn</span>
                <select value={tableFilter} onChange={(e) => { setTableFilter(e.target.value); setPage(1); }}>
                  <option value="">Tất cả bàn</option>
                  {tableGroups.map(([kind, ts]) => (
                    <optgroup key={kind} label={TABLE_KIND_LABEL[kind] || kind}>
                      {ts.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <label className="hp-field">
                <span className="hp-field-label">Thu ngân</span>
                <select value={cashierFilter} onChange={(e) => { setCashierFilter(e.target.value); setPage(1); }}>
                  <option value="">Tất cả thu ngân</option>
                  {cashiers.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
              </label>

              {/* Bốn ô dưới chỉ có nghĩa với đơn ĐÃ THU và có thể lộ tên tài khoản nhận → chỉ người
                  được xem tiền (giữ luật 2026-10-22). */}
              {canSeeMoney && (
                <>
                  <label className="hp-field">
                    <span className="hp-field-label">Hình thức thu tiền</span>
                    <select
                      value={paymentFilter}
                      onChange={(e) => { setPaymentFilter(e.target.value as HistoryPayment); setPage(1); }}
                    >
                      <option value="">Mọi hình thức</option>
                      <option value="cash">Tiền mặt</option>
                      <option value="transfer">Chuyển khoản</option>
                      <option value="mixed">Cả hai (tiền mặt + chuyển khoản)</option>
                    </select>
                  </label>

                  {/* Ẩn khi công tắc xác thực tắt (2026-09-25). */}
                  {verifyOn && (
                    <label className="hp-field">
                      <span className="hp-field-label">Ngân hàng xác nhận (chỉ đơn chuyển khoản)</span>
                      <select
                        value={verifiedFilter}
                        onChange={(e) => { setVerifiedFilter(e.target.value as HistoryVerified); setPage(1); }}
                      >
                        <option value="">Tất cả</option>
                        <option value="yes">Đã khớp với ngân hàng</option>
                        <option value="no">Chưa khớp - chưa thấy giao dịch</option>
                      </select>
                    </label>
                  )}

                  {/* "Thiếu ảnh" gồm cả đơn đã gõ lý do "không chụp được" (2026-10-02). */}
                  <label className="hp-field">
                    <span className="hp-field-label">Ảnh bill (chỉ đơn chuyển khoản)</span>
                    <select
                      value={photoFilter}
                      onChange={(e) => { setPhotoFilter(e.target.value as HistoryPhoto); setPage(1); }}
                    >
                      <option value="">Tất cả</option>
                      <option value="has">Có ảnh bill</option>
                      <option value="missing">Thiếu ảnh bill</option>
                    </select>
                  </label>

                  {/* Ẩn khi danh sách rỗng (chưa có mã QR, hoặc BE trả 403). */}
                  {qrAccounts.length > 0 && (
                    <label className="hp-field">
                      <span className="hp-field-label">Tài khoản nhận tiền</span>
                      <select
                        value={qrAccountFilter}
                        onChange={(e) => { setQrAccountFilter(e.target.value); setPage(1); }}
                      >
                        <option value="">Mọi tài khoản</option>
                        {qrAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.label}{a.is_active ? '' : ' (ngừng dùng)'}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </>
              )}

              {/* Sắp xếp — ô chọn vì trên điện thoại không có tiêu đề cột để bấm. */}
              <label className="hp-field">
                <span className="hp-field-label">Sắp xếp (mới nhất trước)</span>
                <select value={sortBy} onChange={(e) => changeSort(e.target.value as HistorySort)}>
                  <option value="opened">Theo giờ vào ăn</option>
                  <option value="paid">Theo giờ thanh toán</option>
                </select>
              </label>
            </div>

            <div className="hp-sheet-foot">
              {sheetFilterCount > 0 && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setTableFilter('');
                    setCashierFilter('');
                    setPaymentFilter('');
                    setVerifiedFilter('');
                    setPhotoFilter('');
                    setQrAccountFilter('');
                    setPage(1);
                  }}
                >
                  Bỏ các lọc này
                </button>
              )}
              <button type="button" onClick={() => setSheetOpen(false)}>
                Xem kết quả
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nhân viên order: nói rõ phạm vi được xem để không tưởng là mất dữ liệu. */}
      {!canSeeStats && (
        <div className="hp-note">
          Bạn xem được nhật ký các bàn chưa thanh toán trong 48 giờ gần nhất (món gì, mấy phần, ai
          gọi, ai huỷ) và các đơn chính bạn đã thu - doanh thu chỉ dành cho admin và quyền Báo cáo
        </div>
      )}

      {/* Tổng quan — 2 ô (giữ quyết định 2026-09-05: không quay lại 6 ô nói hai con số khác nhau).
          Màu TRUNG TÍNH (2026-11-06): nền hồng chữ đỏ trông như cảnh báo. */}
      {canSeeStats && (
        <div className="hp-stats">
          <StatTile
            label={tabView.money}
            value={statsLoading ? '…' : stats ? fmt(stats.paid_revenue) : '—'}
          />
          {/* Có tab đang chọn thì BE chỉ trả count của tab đó → tổng luôn = số đơn của tab. */}
          <StatTile
            label={tabView.count}
            value={
              statsLoading
                ? '…'
                : stats
                  ? String(stats.paid_count + stats.unpaid_count + stats.cancelled_count + (stats.debt_count ?? 0))
                  : '—'
            }
          />
          {/* Phí ship là tiền THU HỘ (M2.D-62) — ô riêng, không cộng vào doanh thu. */}
          {stats && stats.ship_fee_total > 0 && (
            <StatTile label="Phí ship thu hộ" value={fmt(stats.ship_fee_total)} />
          )}
        </div>
      )}

      {showViewTabs && (
        <div className="hp-views" role="tablist" aria-label="Chọn cách xem">
          <button type="button" role="tab" aria-selected={view === 'list'} onClick={() => setView('list')}>
            Danh sách
          </button>
          <button type="button" role="tab" aria-selected={view === 'charts'} onClick={() => setView('charts')}>
            Biểu đồ
          </button>
          {canSeeReconcile && (
            <button type="button" role="tab" aria-selected={view === 'reconcile'} onClick={() => setView('reconcile')}>
              Đối soát
            </button>
          )}
        </div>
      )}

      {/* ── Tab Đối soát ── (CHỈ admin, chủ quán chốt 2026-09-14; BE có AdminGuard) */}
      {showViewTabs && view === 'reconcile' && canSeeReconcile && (
        <PaymentSummaryBox query={historyQuery(filters, { cashier: true }).toString()} filterKey={filterKey} />
      )}

      {/* ── Tab Biểu đồ ── */}
      {showViewTabs && view === 'charts' && (
        <ChartsView
          stats={stats}
          statsLoading={statsLoading}
          consumption={consumption}
          range={range}
          chiSo={chiSo}
          setChiSo={setChiSo}
          chiSoView={chiSoView}
          tabView={tabView}
          tabActive={tabActive}
          topBy={topBy}
          setTopBy={setTopBy}
        />
      )}

      {/* ── Tab Danh sách ── */}
      {listVisible && loading && <p className="hp-muted">Đang tải danh sách đơn...</p>}

      {listVisible && !loading && orders.length === 0 && (
        <div className="empty-state card hp-empty">
          <div>Không có đơn nào khớp bộ lọc - thử chọn khoảng thời gian rộng hơn</div>
          {hasActiveFilter && (
            <button type="button" className="secondary" onClick={onResetFilters}>
              Xoá lọc
            </button>
          )}
        </div>
      )}

      {listVisible && !loading && orders.length > 0 && (
        <>
          <p className="hp-hint">Bấm vào một đơn để xem món, người gọi và tiền đã nhận</p>
          {/* Bảng 9 cột CỐ ĐỊNH (2026-11-06) — không còn biến thể 8/9 cột theo công tắc xác thực.
              Từ 1280px trở lên là bảng; dưới 1280px (điện thoại + iPad) mỗi đơn thành một thẻ —
              bảng 9 cột không vừa iPad 820–1190px và cột thao tác bị cắt. Lưới thẻ bám vào
              `nth-child` trong history-page.css: thêm/bớt cột là phải sửa ở đó. */}
          <table className="responsive card txn-table">
            <colgroup>
              <col style={{ width: 76 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 104 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 210 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 112 }} />
            </colgroup>
            <thead>
              <tr>
                {/* Hai cột thời gian bấm được để đổi trục sắp xếp (lối tắt của ô trong tấm Lọc). */}
                <th aria-sort={sortBy === 'opened' ? 'descending' : undefined}>
                  <button type="button" className="hp-th-btn" onClick={() => changeSort('opened')}>
                    Giờ vào{sortBy === 'opened' && ' ↓'}
                  </button>
                </th>
                <th>Bàn</th>
                <th>Món</th>
                <th className="hp-num">Tổng</th>
                <th>Trạng thái</th>
                <th aria-sort={sortBy === 'paid' ? 'descending' : undefined}>
                  <button type="button" className="hp-th-btn" onClick={() => changeSort('paid')}>
                    Thanh toán{sortBy === 'paid' && ' ↓'}
                  </button>
                </th>
                <th>Đối soát</th>
                <th>Misa</th>
                <th className="hp-num">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {dayGroups.map((g, gi) => {
                const dayRev = dayRevenue.get(g.key);
                // Tiêu đề ngày nói THẬT về trang (góp ý 2026-11-06): số đơn là số đơn TRÊN TRANG
                // NÀY, còn doanh thu là của CẢ NGÀY (từ /orders/stats). Ngày bị cắt bởi chia trang
                // thì nói rõ "còn ở trang trước/sau" thay vì để "1 đơn · 491.000đ" lệch nhau.
                const contPrev = gi === 0 && page > 1;
                const contNext = gi === dayGroups.length - 1 && page < totalPages;
                return (
                  <Fragment key={g.key}>
                    <tr className="txn-day-row">
                      <td className="txn-day" colSpan={9}>
                        {g.key === UNPAID_GROUP ? (
                          <>Chưa thanh toán - {g.orders.length} đơn</>
                        ) : (
                          <>
                            <span className="hp-day-date">{vnDayLabel(g.key)}</span>
                            {sortBy === 'paid' && <span className="hp-day-sub"> (ngày thanh toán)</span>}
                            <span className="hp-day-sub">
                              {' - '}{g.orders.length} đơn{contPrev || contNext ? ' ở trang này' : ''}
                              {contPrev && ', còn ở trang trước'}
                              {contNext && ', còn tiếp ở trang sau'}
                            </span>
                            {dayRev != null && (
                              <span className="hp-day-rev">Đã thu cả ngày {fmt(dayRev)}</span>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                    {g.orders.map((o) => (
                      <HistoryRow
                        key={o.id}
                        o={o}
                        isOpen={expanded === o.id}
                        onToggle={() => setExpanded(expanded === o.id ? null : o.id)}
                        showMoney={canSeeOrderMoney(o)}
                        canSeeMoney={canSeeMoney}
                        verifyOn={verifyOn}
                        canMarkMisa={canMarkMisa}
                        canReprint={canReprint}
                        busy={reprinting.has(o.id) || markingDebt.has(o.id)}
                        menuOpen={rowMenu?.id === o.id}
                        servedTotal={orderTotal(o)}
                        onSettle={() => setSettleTarget(o)}
                        onToggleMisa={() => toggleMisa(o)}
                        onOpenMenu={(r) => {
                          if (rowMenu?.id === o.id) {
                            setRowMenu(null);
                            return;
                          }
                          setRowMenu({
                            id: o.id,
                            anchorTop: r.top,
                            anchorBottom: r.bottom,
                            right: window.innerWidth - r.right,
                          });
                        }}
                      />
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Menu ⋯ của dòng đơn — vẽ NGOÀI bảng (toạ độ fixed) để không bị khung cuộn cắt. */}
          {rowMenu && rowMenuOrder && (
            <>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setRowMenu(null);
                }}
                style={{ position: 'fixed', inset: 0, zIndex: 40 }}
              />
              <div
                ref={rowMenuRef}
                className="drawer-menu hp-row-menu"
                style={{
                  position: 'fixed',
                  top: rowMenuTop ?? rowMenu.anchorBottom + 6,
                  right: rowMenu.right,
                  // TRÊN cả `.nav-bottom` (z-index 100) — xem chú thích `rowMenuTop`.
                  zIndex: 101,
                  visibility: rowMenuTop === null ? 'hidden' : 'visible',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  disabled={reprinting.has(rowMenuOrder.id)}
                  onClick={() => {
                    setRowMenu(null);
                    void reprintReceipt(rowMenuOrder);
                  }}
                >
                  <Printer size={20} aria-hidden />
                  In lại hoá đơn
                </button>
                {/* CHUYỂN SANG NỢ (admin) — tách bằng vạch ngăn + chữ đỏ dạng nguy hiểm, và có
                    hộp xác nhận (2026-11-06): thao tác này rút tiền khỏi doanh thu, không được
                    nằm sát "In lại" như một việc vô hại. */}
                {canSeeReconcile && (
                  <>
                    <div className="drawer-menu-sep" role="separator" />
                    <button
                      type="button"
                      className="drawer-menu-danger"
                      disabled={markingDebt.has(rowMenuOrder.id)}
                      onClick={() => {
                        setRowMenu(null);
                        void markAsDebt(rowMenuOrder);
                      }}
                    >
                      Chuyển sang nợ...
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="hp-pager">
              <button
                className="secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Trang trước
              </button>
              <span>
                Trang {page} / {totalPages}
              </span>
              <button
                className="secondary"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Trang sau →
              </button>
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}

// ─── Số liệu tiện ích cho một đơn ──────────────────────────────────────────

/** Số PHẦN món (cộng `qty`, bỏ dòng ghi chú) — cùng cách đếm với thẻ bàn ở Sơ đồ bàn. Trước
 *  2026-11-06 cột này đếm số DÒNG món, nên "✓3" ở đây và "13 món" ở sơ đồ bàn không khớp. */
function portionsOf(o: HistoryOrder) {
  let alive = 0;
  let served = 0;
  let cancelled = 0;
  for (const i of o.items || []) {
    if (i.is_note) continue;
    if (i.state === 'CANCELLED') cancelled += i.qty;
    else {
      alive += i.qty;
      if (i.state === 'SERVED') served += i.qty;
    }
  }
  return { alive, served, cancelled };
}

/** Tổng HIỂN THỊ ở cột "Tổng".
 *  - Đơn đang mở: CẢ ĐƠN (mọi món chưa huỷ) — khớp số trên sơ đồ bàn. Trước 2026-11-06 cột này chỉ
 *    cộng món đã giao, nên bàn vừa gọi 13 món chưa ra món nào hiện 0đ trong khi sơ đồ ghi 428.000đ.
 *  - Đơn đã kết: món ĐÃ GIAO — đúng số trên bill / số đi vào doanh thu (không đổi). */
function displayTotalOf(o: HistoryOrder): number {
  const open = !o.closed_at;
  return (o.items || [])
    .filter((i) => !i.is_note && (open ? i.state !== 'CANCELLED' : i.state === 'SERVED'))
    .reduce((s, i) => s + i.menu_item_price * i.qty, 0);
}

type PayKind = 'cash' | 'transfer' | 'mixed';
/** Hình thức thu + tách hai phần của đơn "Cả hai". Tổng thu = món đã giao + ship (y như BE
 *  `paymentSummary`); tiền mặt luôn SUY RA: tổng − chuyển khoản. */
function paymentSplit(servedTotal: number, o: HistoryOrder): { kind: PayKind; cash: number; transfer: number; total: number } {
  const total = servedTotal + (o.ship_fee || 0);
  const transfer = Math.max(0, o.transfer_amount || 0);
  if (transfer <= 0) return { kind: 'cash', cash: total, transfer: 0, total };
  if (transfer >= total) return { kind: 'transfer', cash: 0, transfer, total };
  return { kind: 'mixed', cash: total - transfer, transfer, total };
}
const PAY_LABEL: Record<PayKind, string> = {
  cash: 'Tiền mặt',
  transfer: 'Chuyển khoản',
  mixed: 'Cả hai',
};

// ─── Một dòng đơn ──────────────────────────────────────────────────────────

function HistoryRow({
  o,
  isOpen,
  onToggle,
  showMoney,
  canSeeMoney,
  verifyOn,
  canMarkMisa,
  canReprint,
  busy,
  menuOpen,
  servedTotal,
  onSettle,
  onToggleMisa,
  onOpenMenu,
}: {
  o: HistoryOrder;
  isOpen: boolean;
  onToggle: () => void;
  showMoney: boolean;
  canSeeMoney: boolean;
  verifyOn: boolean;
  canMarkMisa: boolean;
  canReprint: boolean;
  busy: boolean;
  menuOpen: boolean;
  servedTotal: number;
  onSettle: () => void;
  onToggleMisa: () => void;
  onOpenMenu: (anchor: DOMRect) => void;
}) {
  // 4 trạng thái: đã thanh toán / đang nợ / đã huỷ / chưa thanh toán.
  // closed_at = đã kết đơn, is_paid = kết bằng thu tiền; nợ = kết, chưa thu, có mốc ghi nợ.
  const isPaid = !!o.closed_at && o.is_paid;
  const isDebt = !!o.closed_at && !o.is_paid && o.debt_at != null;
  const isCancelled = !!o.closed_at && !o.is_paid && !isDebt;
  const p = portionsOf(o);
  const pay = paymentSplit(servedTotal, o);
  // Đơn thu nợ: mốc TIỀN là lúc thu nợ, không phải lúc trả bàn.
  const moneyAt = o.debt_paid_at ?? o.closed_at;
  const isCk = isPaid && o.transfer_amount > 0;

  const status = isPaid
    ? { tone: 'paid', text: o.debt_paid_at != null ? 'Đã thanh toán (thu nợ)' : 'Đã thanh toán' }
    : isDebt
      ? { tone: 'debt', text: 'Đang nợ' }
      : isCancelled
        ? { tone: 'cancelled', text: 'Đã huỷ' }
        : { tone: 'open', text: 'Chưa thanh toán' };

  return (
    <>
      <tr
        className={`txn-row${isOpen ? ' is-open' : ''}`}
        onClick={onToggle}
      >
        <td data-label="Giờ vào" className="hp-c-time">{fmtHm(o.opened_at)}</td>

        {/* Tên khách ship dài → cắt "…" trên bảng (tên đầy đủ ở khối chi tiết); thẻ thì xuống dòng. */}
        <td data-label="Bàn" className="hp-c-table">
          <div title={o.customer_name ? `${o.table_name} - ${o.customer_name}` : o.table_name}>
            <strong>{o.table_name}</strong>
            {o.customer_name && <span className="hp-muted"> - {o.customer_name}</span>}
          </div>
        </td>

        <td data-label="Món" className="hp-c-items">
          {/* Đơn đang mở: "đã giao x/y phần" — trả lời luôn câu "bàn này ra đủ món chưa". */}
          {!o.closed_at ? (
            <span>giao {p.served}/{p.alive} phần</span>
          ) : (
            <span>{p.served} phần</span>
          )}
          {p.cancelled > 0 && <span className="hp-muted"> - huỷ {p.cancelled}</span>}
        </td>

        <td data-label="Tổng" className="hp-num hp-c-total">
          {showMoney && <strong>{fmt(displayTotalOf(o))}</strong>}
        </td>

        {/* MỘT trạng thái mỗi ô (2026-11-06): chấm màu + chữ. "Ca trước" và hình thức thu chuyển
            sang cột Thanh toán — trước đây 2–3 badge chồng nhau làm dòng đã thu cao 62px. */}
        <td data-label="Trạng thái" className="hp-c-status">
          <span className={`hp-status hp-status--${status.tone}`} title={isDebt ? o.debt_note ?? undefined : undefined}>
            {status.text}
          </span>
          {isDebt && o.debt_note && <span className="hp-sub">{o.debt_note}</span>}
        </td>

        {/* Cột "Thanh toán" gộp Thu ngân + Giờ TT + hình thức (2026-11-06): ba cột cũ đều là "—"
            với đơn chưa thanh toán. */}
        <td data-label="Thanh toán" className="hp-c-pay">
          {o.closed_at ? (
            <div>
              {isPaid && showMoney ? (
                <span className={`hp-pay hp-pay--${pay.kind}`}>{PAY_LABEL[pay.kind]}</span>
              ) : isCancelled ? (
                <span>Huỷ bàn</span>
              ) : isDebt ? (
                <span>Ghi nợ</span>
              ) : null}
              <span className="hp-sub">
                {[o.checked_out_by_full_name, moneyAt ? fmtHm(moneyAt) : null].filter(Boolean).join(' - ')}
                {/* Bàn ca trước quên thu, ca này mới thu (2026-11-05) — luật ở `isPrevShiftCarryover`. */}
                {isPrevShiftCarryover(o) && ' - bàn ca trước'}
              </span>
            </div>
          ) : (
            <span className="hp-muted">Đang ăn</span>
          )}
        </td>

        {/* Đối soát: ngân hàng đã xác nhận chưa + ảnh bill. Ghi bằng CHỮ (2026-11-06) — dấu ✓/✗
            trần không có chú thích; "Chưa khớp" nằm trên nền cảnh báo để nhảy ra khỏi cột.
            Cố ý KHÔNG nói "chuyển tiền thất bại": ta chỉ biết chưa thấy giao dịch. */}
        <td data-label="Đối soát" className="hp-c-check">
          {isCk && (
            <span className="hp-check">
              {verifyOn && o.bank_verified === false && (
                <span className="hp-warn" title="Chưa thấy giao dịch này trong báo cáo ngân hàng">
                  <AlertTriangle size={16} aria-hidden />
                  Chưa khớp
                </span>
              )}
              {verifyOn && o.bank_verified === true && <span className="hp-ok">Đã khớp</span>}
              {o.payment_photo_count !== null && (
                <PaymentPhotoBadge count={o.payment_photo_count} skipReason={o.payment_photo_skip_reason} />
              )}
            </span>
          )}
        </td>

        {/* Misa — cột riêng, CỐ ĐỊNH, để nút ⋯ không bị đẩy lệch giữa các dòng. Chỉ đơn thu qua
            mã QR HKD (2026-10-15); đơn cũ đã lỡ tick vẫn hiện để gỡ được. */}
        <td data-label="Misa" className="hp-c-misa">
          {isPaid && (o.is_hkd || o.misa_copied_at != null) && (
            <MisaBadge
              copied={o.misa_copied_at != null}
              by={o.misa_copied_by_full_name}
              disabled={!canMarkMisa}
              onToggle={onToggleMisa}
            />
          )}
        </td>

        <td data-label="Thao tác" className="hp-num hp-c-actions">
          <span className="hp-actions">
            {/* THU NỢ: chỉ admin (2026-10-20) — hộp thu nợ phải hiện số tiền. */}
            {isDebt && canMarkMisa && canSeeMoney && (
              <button
                type="button"
                className="hp-settle"
                onClick={(e) => {
                  e.stopPropagation();
                  onSettle();
                }}
              >
                Thu nợ
              </button>
            )}
            {/* ⋯ gom "In lại hoá đơn" + "Chuyển sang nợ" — chỉ đơn đã thu. */}
            {isPaid && canReprint && (
              <button
                type="button"
                className="secondary hp-icon-btn"
                aria-label="Thêm thao tác"
                aria-expanded={menuOpen}
                onClick={(e) => {
                  // Cả dòng là nút mở chi tiết — không chặn thì bấm ⋯ cũng bung chi tiết.
                  e.stopPropagation();
                  onOpenMenu(e.currentTarget.getBoundingClientRect());
                }}
              >
                {busy ? '…' : <MoreHorizontal size={22} aria-hidden />}
              </button>
            )}
            {/* Nút mở chi tiết cho bàn phím/trình đọc màn hình — chuột/ngón tay bấm cả dòng. */}
            <button
              type="button"
              className="secondary hp-icon-btn hp-chevron"
              aria-label={isOpen ? 'Thu gọn chi tiết' : 'Xem chi tiết đơn'}
              aria-expanded={isOpen}
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              {isOpen ? <ChevronUp size={22} aria-hidden /> : <ChevronDown size={22} aria-hidden />}
            </button>
          </span>
        </td>
      </tr>
      {isOpen && (
        <tr className="hp-detail-row">
          <td className="txn-full" colSpan={9}>
            <HistoryOrderDetail order={o} showMoney={showMoney} servedTotal={servedTotal} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Tab Biểu đồ ───────────────────────────────────────────────────────────

/** MỘT màu cho mọi số liệu doanh thu (2026-11-06): trước đây 4 màu cho cùng một loại số, trong đó
 *  có đỏ — đỏ ở app này là cảnh báo / nút chính. Xám đậm trung tính. */
const CHART_COLOR = '#6b7280';

/** Lấp ngày TRỐNG bằng cột 0 (2026-11-06): BE chỉ trả ngày có đơn, nên trước đây trục ngang nhảy
 *  14/10 → 16/10 mà không ai thấy ngày 15 vắng. Khoảng lấy theo bộ lọc; bộ lọc bỏ ngỏ đầu nào thì
 *  lấy theo ngày có số liệu ở đầu đó. Chặn 400 ngày để "Tất cả" không vẽ cả nghìn cột. */
function fillEmptyDays(
  rows: Array<{ day: string; revenue: number; orders: number }>,
  range: DayRange,
): Array<{ day: string; revenue: number; orders: number }> {
  if (rows.length === 0) return rows;
  const first = !range.shift && range.from ? range.from : rows[0].day;
  const last = !range.shift && range.to ? range.to : rows[rows.length - 1].day;
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: Array<{ day: string; revenue: number; orders: number }> = [];
  const cur = new Date(`${first}T00:00:00Z`);
  const end = new Date(`${last}T00:00:00Z`);
  if (Number.isNaN(cur.getTime()) || Number.isNaN(end.getTime()) || cur > end) return rows;
  for (let n = 0; cur <= end && n < 400; n++) {
    const key = cur.toISOString().slice(0, 10);
    out.push(byDay.get(key) ?? { day: key, revenue: 0, orders: 0 });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function ChartsView({
  stats,
  statsLoading,
  consumption,
  range,
  chiSo,
  setChiSo,
  chiSoView,
  tabView,
  tabActive,
  topBy,
  setTopBy,
}: {
  stats: Stats | null;
  statsLoading: boolean;
  consumption: ConsumptionRow[];
  range: DayRange;
  chiSo: 'revenue' | 'orders';
  setChiSo: (v: 'revenue' | 'orders') => void;
  chiSoView: { ten: string; format: (v: number) => string };
  tabView: { hint: string; top: string };
  tabActive: boolean;
  topBy: 'revenue' | 'qty';
  setTopBy: (v: 'revenue' | 'qty') => void;
}) {
  if (statsLoading) return <p className="hp-muted">Đang tải số liệu...</p>;
  // Phân biệt "đang tải" với "tải không được" — trước đây cả hai đều "Đang tải..." mãi.
  if (!stats) {
    return <p className="hp-muted">Không tải được số liệu thống kê - thử đổi lại bộ lọc hoặc tải lại trang</p>;
  }
  const days = fillEmptyDays(stats.revenue_by_day, range);
  const topItems = [...stats.top_items].sort((a, b) =>
    topBy === 'revenue' ? b.revenue - a.revenue : b.qty - a.qty,
  );
  return (
    <div className="hp-charts">
      <TimeRangeChips
        ariaLabel="Chọn chỉ số cho biểu đồ cột"
        label="Biểu đồ cột theo"
        value={chiSo}
        options={[
          { value: 'revenue' as const, label: 'Doanh thu' },
          { value: 'orders' as const, label: 'Số đơn' },
        ]}
        onChange={setChiSo}
      />
      <div className="hp-charts-grid">
        {/* Hai biểu đồ cột chiếm TRỌN bề ngang — biểu đồ giờ có tới 24+ cột. */}
        <div className="hp-chart-wide">
          <ChartCard title={`${chiSoView.ten} theo ngày`} hint={`${tabView.hint} - ngày không có đơn vẫn hiện cột 0`}>
            <BarChart
              ariaLabel={`${chiSoView.ten} theo ngày`}
              height={200}
              tiLeCot={0.58}
              rongCotToiDa={28}
              color={CHART_COLOR}
              data={days.map((d) => ({
                label: vnDayLabel(d.day).slice(0, 5),
                value: chiSo === 'revenue' ? d.revenue : d.orders,
                tip: [
                  { id: 'rev', name: 'Doanh thu', color: CHART_COLOR, value: d.revenue },
                  { id: 'ord', name: 'Số đơn', color: '#9ca3af', value: d.orders },
                ],
              }))}
              formatValue={chiSoView.format}
            />
          </ChartCard>

          {/* Giờ cao điểm — cắt giờ rỗng ở hai đầu, giữ giờ trống ở GIỮA (hõm nghỉ trưa là thật). */}
          <ChartCard
            title={`Giờ cao điểm - ${chiSoView.ten.toLowerCase()}`}
            hint="Theo giờ thanh toán - mốc 30 phút - đã bỏ khung giờ đầu/cuối không có đơn nào"
          >
            <BarChart
              ariaLabel={`${chiSoView.ten} theo mốc 30 phút trong ngày`}
              height={200}
              tiLeCot={0.58}
              rongCotToiDa={28}
              color={CHART_COLOR}
              data={catGioTrongHaiDau(stats.by_half_hour).map((h) => ({
                label: nhanGio(h.start_min),
                value: chiSo === 'revenue' ? h.revenue : h.orders,
                tip: [
                  { id: 'rev', name: 'Doanh thu', color: CHART_COLOR, value: h.revenue },
                  { id: 'ord', name: 'Số đơn', color: '#9ca3af', value: h.orders },
                ],
              }))}
              formatValue={chiSoView.format}
            />
          </ChartCard>
        </div>

        <ChartCard title={tabView.top} hint={tabView.hint}>
          <TimeRangeChips
            ariaLabel="Xếp top món theo"
            value={topBy}
            options={[
              { value: 'revenue' as const, label: 'Doanh thu' },
              { value: 'qty' as const, label: 'Số phần' },
            ]}
            onChange={setTopBy}
            style={{ marginBottom: 10 }}
          />
          <RankBars
            data={topItems.map((t) =>
              topBy === 'revenue'
                ? { label: t.name, value: t.revenue, sub: `${t.qty} phần` }
                : { label: t.name, value: t.qty, sub: fmtShort(t.revenue) },
            )}
            formatValue={topBy === 'revenue' ? fmtShort : (v) => `${v} phần`}
            color={CHART_COLOR}
          />
        </ChartCard>

        <ChartCard title="Doanh thu theo thu ngân">
          <RankBars
            data={stats.revenue_by_cashier.map((c) => ({ label: c.name, value: c.revenue, sub: `${c.orders} đơn` }))}
            formatValue={fmtShort}
            color={CHART_COLOR}
          />
        </ChartCard>

        {/* Phân rã theo trạng thái — chỉ có nghĩa ở tab "Tất cả" (vào tab cụ thể là một lát 100%). */}
        {!tabActive && (
          <ChartCard title="Tỉ lệ thanh toán">
            <Donut
              segments={[
                { label: 'Đã thanh toán', value: stats.paid_count, color: '#16a34a' },
                { label: 'Chưa thanh toán', value: stats.unpaid_count, color: '#9ca3af' },
                { label: 'Đã huỷ', value: stats.cancelled_count, color: '#b4231d' },
                { label: 'Đang nợ', value: stats.debt_count ?? 0, color: '#f59e0b' },
              ]}
            />
          </ChartCard>
        )}

        {/* Tiêu hao nguyên liệu — BẢNG chứ không biểu đồ (các dòng khác đơn vị). Không có số liệu
            thì chỉ còn MỘT dòng chữ nhỏ thay vì cả khung trống (2026-11-06). */}
        {consumption.length > 0 ? (
          <ChartCard title="Tiêu hao nguyên liệu" hint="Chốt khi bếp bắt đầu nấu - món huỷ trước khi nấu không tính">
            <div className="hp-consume">
              {consumption.map((c) => (
                <div key={`${c.ingredient_name}¦${c.unit}`} className="hp-consume-row">
                  <span className="hp-consume-name">
                    {c.ingredient_name}
                    <span className="hp-muted"> - {c.portions} phần</span>
                  </span>
                  <strong>{fmtIngredientQty(c.qty_total, c.unit)}</strong>
                </div>
              ))}
            </div>
          </ChartCard>
        ) : (
          <p className="hp-muted hp-chart-wide">
            Tiêu hao nguyên liệu: chưa có số liệu - món phải được khai công thức thì mới tính được
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Phần tử nhỏ ───────────────────────────────────────────────────────────

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card hp-stat">
      <div className="hp-stat-label">{label}</div>
      <div className="hp-stat-value">{value}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className="hp-chip" aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  );
}

/** Badge đối soát MISA — bấm để tick / bỏ tick ngay trên dòng (2026-09-05).
 *
 * `stopPropagation`: dòng có onClick mở/đóng chi tiết. Thiếu nó thì mỗi lần tick, bảng lại bung
 * ra một khối chi tiết — người đối soát 30 đơn cuối ca sẽ phải cuộn lại từ đầu. */
function MisaBadge({
  copied,
  by,
  disabled,
  onToggle,
}: {
  copied: boolean;
  by: string | null;
  disabled: boolean;
  onToggle: () => void;
}) {
  const label = copied ? 'Đã lên Misa' : 'Chưa Misa';
  const title = copied
    ? `Đã sao chép sang Misa${by ? ` - ${by}` : ''}${disabled ? '' : ' - bấm để bỏ đánh dấu'}`
    : disabled
      ? 'Chưa sao chép sang Misa'
      : 'Chưa sao chép sang Misa - bấm để đánh dấu đã gõ';
  const cls = `hp-misa${copied ? ' is-copied' : ''}`;
  if (disabled) return <span className={cls} title={title}>{label}</span>;
  return (
    <button
      type="button"
      className={cls}
      title={title}
      aria-pressed={copied}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
    >
      {label}
    </button>
  );
}

/**
 * CỜ ẢNH BILL của một đơn chuyển khoản (2026-10-02). Chỉ dựng cho đơn CK.
 *  - có ảnh  → xám nhạt kèm số tấm (đường bình thường, không được nhảy ra khỏi dòng)
 *  - thiếu ảnh, CÓ lý do → viền cảnh báo (người thu đã khai)
 *  - thiếu ảnh, KHÔNG lý do → nền cảnh báo (không bằng chứng lẫn lời giải thích)
 */
function PaymentPhotoBadge({ count, skipReason }: { count: number; skipReason: string | null }) {
  if (count > 0) {
    return (
      <span className="hp-photo" title={`${count} ảnh bill`}>
        <Camera size={16} aria-hidden />
        {count} ảnh
      </span>
    );
  }
  const coLyDo = !!skipReason;
  return (
    <span
      className={coLyDo ? 'hp-photo hp-photo--reason' : 'hp-warn'}
      // `title` mang nguyên văn lý do — trên điện thoại lý do còn ở khối chi tiết.
      title={coLyDo ? `Không chụp được bill: ${skipReason}` : 'Đơn chuyển khoản không có ảnh bill'}
    >
      Thiếu ảnh
    </span>
  );
}

/** `showMoney = false` (Order/Bếp, 2026-10-20): giữ nguyên mọi HOẠT ĐỘNG — món, số phần, ai gọi /
 *  giao / huỷ, ghi nợ, nhật ký — chỉ bỏ con số tiền. Từ 2026-10-22 đơn đã thanh toán (chỉ đơn
 *  chính họ thu) thì `true`. Xem `canSeeOrderMoney` ở `HistoryPage`. */
function HistoryOrderDetail({
  order,
  showMoney,
  servedTotal,
}: {
  order: HistoryOrder;
  showMoney: boolean;
  servedTotal: number;
}) {
  const items = order.items || [];
  const grouped = {
    SERVED: items.filter((i) => i.state === 'SERVED'),
    CANCELLED: items.filter((i) => i.state === 'CANCELLED'),
    INPROGRESS: items.filter((i) => !['SERVED', 'CANCELLED'].includes(i.state)),
  };
  const isPaid = !!order.closed_at && order.is_paid;
  const isOpen = !order.closed_at;

  /** Người gọi / người giao GOM LÊN ĐẦU (2026-11-06): trước đây dòng "NV gọi / Người giao" màu đỏ
   *  lặp ở mọi món. Chỉ một người gọi + một người giao (đa số đơn) → nói một lần ở đầu, bỏ khỏi
   *  từng món. Nhiều người → vẫn ghi từng món (để soi ai gọi/huỷ món nào), nhưng chữ xám. */
  const uniq = (xs: Array<string | null>) => Array.from(new Set(xs.filter((x): x is string => !!x)));
  const callers = uniq(items.filter((i) => !i.is_note).map((i) => i.created_by_full_name));
  const servers = uniq(grouped.SERVED.map((i) => i.served_by_full_name));
  const perItemPeople = callers.length > 1 || servers.length > 1;

  // Nhật ký hoạt động — fetch khi mở rộng đơn (component chỉ mount khi expand).
  const [activity, setActivity] = useState<Activity[] | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    api
      .get<{ data: { items: Activity[] } }>(`/orders/${order.id}/activity`)
      .then((res) => { if (alive) setActivity(res.data.data.items); })
      .catch((err) => { if (alive) setActErr(extractError(err).message); });
    return () => { alive = false; };
  }, [order.id]);

  const pay = paymentSplit(servedTotal, order);
  const openTotal = displayTotalOf(order);

  const people = (i: OrderItem, served: boolean) =>
    perItemPeople && (i.created_by_full_name || (served && i.served_by_full_name)) ? (
      <div className="hp-item-sub">
        {i.created_by_full_name && <>Gọi: {i.created_by_full_name}</>}
        {served && i.served_by_full_name && <> - Giao: {i.served_by_full_name}</>}
      </div>
    ) : null;

  return (
    <div className="hp-detail">
      {(callers.length > 0 || servers.length > 0) && (
        <div className="hp-detail-people">
          {callers.length > 0 && <div>Người gọi: <strong>{callers.join(', ')}</strong></div>}
          {servers.length > 0 && <div>Người giao: <strong>{servers.join(', ')}</strong></div>}
        </div>
      )}

      {/* Ghi nợ (2026-09-25): ai nợ, nợ từ lúc nào, và (nếu đã thu) ai thu lúc nào. */}
      {order.debt_at != null && (
        <div className="hp-box">
          <strong>Ghi nợ{order.debt_note ? `: ${order.debt_note}` : ''}</strong>
          <span className="hp-muted"> - từ {fmtDate(order.debt_at)}</span>
          {order.debt_paid_at != null ? (
            <div>
              Đã thu nợ {fmtDate(order.debt_paid_at)}
              {order.debt_paid_by_full_name && <> - {order.debt_paid_by_full_name}</>}
            </div>
          ) : (
            <div>Chưa thu{showMoney && ' - chưa vào doanh thu'}</div>
          )}
        </div>
      )}

      {/* Khách ship */}
      {order.customer_name && (
        <div className="hp-box">
          <strong>{order.customer_name}</strong>
          {order.customer_phone && <> - <a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a></>}
          {order.customer_address && <div>{order.customer_address}</div>}
        </div>
      )}

      {/* Món đang làm (chỉ ở đơn chưa thanh toán) */}
      {grouped.INPROGRESS.length > 0 && (
        <div className="hp-item-group">
          <div className="hp-item-head">Đang làm ({grouped.INPROGRESS.length})</div>
          {aggregateItems(grouped.INPROGRESS).map((g) => (
            <div key={g.key} className="hp-item">
              <div className="hp-item-main">
                <div><strong>{g.count}×</strong> {g.rep.menu_item_name} <span className="hp-muted">({stateLabel(g.rep.state)})</span></div>
                {people(g.rep, false)}
                {g.rep.note && <div className="hp-item-sub hp-item-note">Ghi chú: {g.rep.note}</div>}
              </div>
              {showMoney && <div className="hp-num hp-muted">{fmt(g.rep.menu_item_price * g.count)}</div>}
            </div>
          ))}
        </div>
      )}

      {grouped.SERVED.length > 0 && (
        <div className="hp-item-group">
          <div className="hp-item-head">Đã giao ({grouped.SERVED.length})</div>
          {aggregateItems(grouped.SERVED).map((g) => (
            <div key={g.key} className="hp-item">
              <div className="hp-item-main">
                <div><strong>{g.count}×</strong> {g.rep.menu_item_name}</div>
                {people(g.rep, true)}
                {g.rep.note && <div className="hp-item-sub hp-item-note">Ghi chú: {g.rep.note}</div>}
              </div>
              {showMoney && <div className="hp-num">{fmt(g.rep.menu_item_price * g.count)}</div>}
            </div>
          ))}
        </div>
      )}

      {grouped.CANCELLED.length > 0 && (
        <div className="hp-item-group">
          <div className="hp-item-head">Đã huỷ ({grouped.CANCELLED.length})</div>
          {aggregateItems(grouped.CANCELLED).map((g) => (
            <div key={g.key} className="hp-item is-cancelled">
              <div className="hp-item-main">
                <div className="hp-strike"><strong>{g.count}×</strong> {g.rep.menu_item_name}</div>
                {g.rep.cancelled_reason && <div className="hp-item-sub">Lý do: {g.rep.cancelled_reason}</div>}
                {people(g.rep, false)}
              </div>
              {showMoney && <div className="hp-num hp-strike hp-muted">{fmt(g.rep.menu_item_price * g.count)}</div>}
            </div>
          ))}
        </div>
      )}

      {/* DÒNG TỔNG KẾT (2026-11-06): tạm tính, ship, tổng, đã nhận — đơn "Cả hai" ghi rõ mỗi phần
          (trước đây chỉ ghi phần chuyển khoản, tổng 415k mà chi tiết chỉ thấy 365k). Không có
          dòng "giảm giá": đơn không có trường giảm giá. */}
      {showMoney && (
        <div className="hp-summary">
          {isOpen ? (
            <>
              <SumRow label="Tạm tính cả đơn" value={fmt(openTotal)} />
              <SumRow label="Trong đó đã giao" value={fmt(servedTotal)} />
            </>
          ) : (
            <>
              <SumRow label="Tiền món" value={fmt(servedTotal)} />
              {(order.ship_fee || 0) > 0 && <SumRow label="Phí ship (thu hộ)" value={fmt(order.ship_fee)} />}
              <SumRow label="Tổng" value={fmt(pay.total)} strong />
              {isPaid && pay.kind !== 'transfer' && <SumRow label="Đã nhận tiền mặt" value={fmt(pay.cash)} />}
              {isPaid && pay.kind !== 'cash' && <SumRow label="Đã nhận chuyển khoản" value={fmt(pay.transfer)} />}
            </>
          )}
        </div>
      )}

      {/* Chuyển khoản — nội dung CK hiện NGUYÊN VĂN vì đó là chuỗi phải dò trong sao kê. */}
      {order.transfer_amount > 0 && (
        <div className="hp-box">
          <strong>Chuyển khoản{showMoney && ` ${fmt(order.transfer_amount)}`}</strong>
          {order.payment_qr_label && <span> vào {order.payment_qr_label}</span>}
          {order.transfer_note && <div className="hp-mono">Nội dung: {order.transfer_note}</div>}
          {/* Đơn CK không có ảnh bill thì PHẢI nói ra ngay trong khối tiền. */}
          {order.payment_photo_skip_reason && (
            <div className="hp-warn-box">Không chụp được bill - {order.payment_photo_skip_reason}</div>
          )}
          {/* Ảnh bill in rõ số tiền — Order/Bếp không xem (2026-10-20). */}
          {showMoney && <PaymentPhotos orderId={order.id} />}
        </div>
      )}

      {/* Nhật ký hoạt động đơn */}
      <div className="hp-log">
        <div className="hp-item-head">
          Nhật ký đơn
          <span className="hp-muted hp-log-meta"> - {order.table_name} - mở {fmtDate(order.opened_at)}</span>
        </div>
        {actErr && <div className="hp-err">{actErr}</div>}
        {!actErr && activity === null && <div className="hp-muted">Đang tải nhật ký...</div>}
        {activity !== null && activity.length === 0 && (
          <div className="hp-muted">Chưa có hoạt động nào được ghi (đơn cũ trước khi bật tính năng)</div>
        )}
        {activity !== null && activity.length > 0 && (
          <div className="hp-log-list">
            {activity.map((a) => (
              <div key={a.id} className="hp-log-row">
                <span aria-hidden className="hp-log-icon">{EVENT_ICON[a.event_kind] || '•'}</span>
                <div className="hp-log-text">
                  {/* Câu nhật ký do BE viết sẵn, câu thanh toán có tiền nằm giữa — che đi. */}
                  <span>{showMoney ? a.message : anTien(a.message)}</span>
                  {a.actor_name && <span className="hp-muted"> - {a.actor_name}</span>}
                </div>
                <span className="hp-log-time">{fmtTime(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SumRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`hp-sum-row${strong ? ' is-strong' : ''}`}>
      <span>{label}</span>
      <span className="hp-num">{value}</span>
    </div>
  );
}

const TABLE_KIND_LABEL: Record<string, string> = {
  'dine-in': 'Bàn ngồi',
  'takeaway': 'Mang về',
  'delivery': 'Ship',
};
