// Sơ đồ bàn — grid mobile-first. Click bàn → OrderDrawer.
//
// Thiết kế lại 2026-11-06 (chủ repo QuanLyQuan): thẻ bàn tô theo VIỆC CẦN LÀM, không theo
// "có khách hay không" — xem `cardVariant()` bên dưới. Chức năng KiotViet (khoá bàn cho POS
// ngoài) đã bỏ hẳn cùng ngày, cả API lẫn cột DB.
import { useEffect, useState, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, extractError, isTransientError } from '../lib/api.ts';
import { useToast } from '../components/Toast.tsx';
import { OrderDrawer } from '../components/OrderDrawer.tsx';
import { PageLayout } from '../components/PageLayout.tsx';
import { readyNotifier } from '../lib/ready-notifier.ts';
import { BellRing, Clock, Info, Receipt, ShoppingCart, Timer, TriangleAlert } from 'lucide-react';
import { formatAge } from '../lib/item-age.ts';
import { useStaleUnpaid } from '../lib/stale-unpaid.ts';
import { useGuestPending } from '../lib/guest-pending.ts';
import './orders-page.css';

type Table = {
  id: string;
  code: string;
  name: string;
  kind: string;
  x: number;
  y: number;
};

type OrderSummary = {
  id: string;
  table_id: string;
  table_code: string;
  opened_at: number;
  first_kitchen_at: number | null;
  /** M7 — khác NULL nghĩa là chính KHÁCH đã gửi lượt gọi qua QR cho bàn này. */
  first_guest_request_at?: number | null;
  items?: Array<{
    id: string;
    menu_item_name: string;
    menu_item_price?: number;
    qty: number;
    state: string;
    /** Dòng GHI CHÚ (giá 0) — không phải món; không tính tiền/số món/trạng thái. */
    is_note?: boolean;
  }>;
};

type FilterKey =
  | 'all' | 'in-use' | 'ready' | 'has-pending' | 'empty' | 'qr' | 'unpaid'
  | 'takeaway' | 'delivery';

const FILTER_LABEL: Record<FilterKey, string> = {
  'all': 'Tất cả',
  'in-use': 'Đang dùng',
  'ready': 'Chờ mang ra',
  'has-pending': 'Còn món chưa giao',
  'empty': 'Trống',
  'qr': 'Khách QR gọi',
  'unpaid': 'Chưa trả',
  'takeaway': 'Mang về',
  'delivery': 'Giao hàng',
};

/* Nhóm "Trạng thái" luôn hiện (một hàng, vuốt ngang trên điện thoại). Nhóm "Loại bàn" chỉ hiện
   khi có bàn mang về / giao hàng ĐANG có khách — "Tại quán" luôn bằng tổng số bàn nên không giúp
   lọc gì (bỏ). Chỉ MỘT bộ lọc được chọn tại một lúc, như bản cũ. */
/* 'qr' = mọi yêu cầu QR đang chờ (gọi món chờ duyệt, gọi nhân viên, xin hoá đơn). 'unpaid' = bàn mở
   quá ngưỡng "chưa trả" (BE quyết, cùng danh sách với dải cảnh báo). Thêm 2026-11-06. KHÔNG đưa lại
   "Chờ thanh toán" / "Chưa gửi bếp" (bỏ cùng ngày — xem STATE_LABEL và cardVariant). */
const STATUS_FILTERS: FilterKey[] = ['all', 'qr', 'ready', 'unpaid', 'in-use', 'has-pending', 'empty'];
const KIND_FILTERS: FilterKey[] = ['takeaway', 'delivery'];

// Món "đã giao xong" = SERVED. CANCELLED không tính (bỏ). Còn lại đều là "chưa giao".
const TERMINAL_STATES = new Set(['SERVED', 'CANCELLED']);

/* Trạng thái món — chấm màu + CHỮ. Màu chấm (orders-page.css `.op-dot--<STATE>`) KHỚP màu viền
   thẻ: cam = xong chờ mang ra, xám = bếp đang lo, xanh lá = đã giao. Trước đây "đang làm" màu đỏ
   nên viền đỏ của mọi bàn có khách bị đọc thành "đang làm".
   KHÔNG có chấm/cảnh báo "chưa gửi bếp" (PENDING) — bỏ 2026-11-06: màn gọi món luôn báo bếp ngay
   (BulkOrderModal `send_to_kitchen: true`), nên PENDING thực tế chỉ là GHI CHÚ cố ý không gửi bếp
   (OrderDrawer, bỏ tick "gửi bếp"). Cảnh báo đỏ + nút "Gửi bếp" trên đó là báo động giả và đẩy
   nhầm ghi chú xuống bếp. */
const STATE_LABEL: Record<string, string> = {
  PENDING: 'chưa gửi bếp',
  KITCHEN: 'đã báo bếp',
  COOKING: 'đang làm',
  READY: 'xong, chờ mang ra',
  SERVED: 'đã giao',
};
const STATE_ORDER = ['KITCHEN', 'COOKING', 'READY', 'SERVED'] as const;

/** Ngưỡng đồng hồ NGỒI BÀN (khác tuổi MÓN ở màn Bếp — 10/20 phút trong lib/item-age.ts): cam từ
 *  15 phút, đỏ từ 25 phút. */
const SEAT_WARN_MIN = 15;
const SEAT_CRITICAL_MIN = 25;
/** Bếp chậm: đã báo bếp ≥ 15 phút mà chưa có món nào tới khách. */
const SLOW_KITCHEN_MIN = 15;

const fmtMoney = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
/** Lời gọi QR (gọi nhân viên / xin hoá đơn) đang chờ của một bàn — mốc CŨ NHẤT mỗi loại. */
type CallInfo = { bill: number | null; staff: number | null };

type Variant = 'empty' | 'alert' | 'qr' | 'stale' | 'ready' | 'normal';

export function OrdersPage() {
  const toast = useToast();
  const [tables, setTables] = useState<Table[]>([]);
  const [openOrders, setOpenOrders] = useState<OrderSummary[]>([]);
  /* M7 — số lượt khách gọi bằng QR đang CHỜ DUYỆT, khoá theo `table_code`.
   *
   * Vì sao không đọc từ `/orders`: bàn mà khách vừa gửi lượt đầu chưa có món nào trong
   * `order_items`, nên `listOpenOrders` lọc nó đi như một đơn rỗng (phantom). Đúng cái bàn
   * cần báo động nhất lại là bàn KHÔNG xuất hiện trong danh sách — nên dấu hiệu phải lấy từ
   * nguồn riêng. Dùng lại endpoint màn bếp đang gọi, không thêm endpoint mới. */
  const guestPending = useGuestPending(false);
  const qrWaitingByCode = useMemo(() => {
    const next = new Map<string, number>();
    for (const r of guestPending?.requests ?? []) {
      if (r?.table_code) next.set(r.table_code, (next.get(r.table_code) ?? 0) + 1);
    }
    return next;
  }, [guestPending]);
  /* Gọi nhân viên / xin hoá đơn — cùng endpoint, trước đây chỉ hiện trên dải trên cùng, thẻ bàn
     không có dấu hiệu gì (2026-11-06). Khoá theo `table_code`. */
  const callsByCode = useMemo(() => {
    const cm = new Map<string, CallInfo>();
    for (const c of guestPending?.calls ?? []) {
      if (!c?.table_code) continue;
      const e = cm.get(c.table_code) ?? { bill: null, staff: null };
      const k = c.kind === 'BILL' ? 'bill' : 'staff';
      e[k] = e[k] == null ? c.created_at : Math.min(e[k]!, c.created_at);
      cm.set(c.table_code, e);
    }
    return cm;
  }, [guestPending]);
  /* Bàn mở quá lâu chưa trả — CÙNG danh sách BE với dải cảnh báo (ngưỡng ở Cài đặt). */
  const staleUnpaid = useStaleUnpaid(true);
  const staleByTable = useMemo(
    () => new Map((staleUnpaid?.items ?? []).map((it) => [it.table_id, it])),
    [staleUnpaid],
  );
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Table | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [legendOpen, setLegendOpen] = useState(false);
  const errorCountRef = useRef(0);
  const pollEnabledRef = useRef(true);
  /* Có đang mở drawer chi tiết bàn hay không. Ref chứ không đọc thẳng `active` để effect poll
     bên dưới khỏi phải nhận `active` vào deps (mỗi lần mở/đóng bàn lại dựng lại timer). */
  const drawerOpenRef = useRef(false);
  drawerOpenRef.current = active !== null;

  const refresh = useCallback(async (showError = true) => {
    try {
      /* Lượt QR KHÔNG kéo ở đây nữa (2026-11-06): App đã poll `/table-requests/pending` cho màn này
         và đổ vào `guestPendingStore` — kéo thêm mỗi 2 giây ở đây là ~46 request/phút/tab. */
      const [t, o] = await Promise.all([
        api.get<{ data: { items: Table[] } }>('/tables'),
        api.get<{ data: { items: OrderSummary[] } }>('/orders'),
      ]);
      // Defensive: nếu body trống (vd 304 leak), skip update không throw
      if (t.data?.data?.items) setTables(t.data.data.items);
      if (o.data?.data?.items) {
        setOpenOrders(o.data.data.items);
        // Diff vs previous poll → emit notification cho items chuyển sang READY
        readyNotifier.ingest(o.data.data.items);
        // Badge số bàn đang mở trên nút "Order" đã bỏ 2026-11-06 — con số để biết, không phải việc
        // phải làm (chỉ việc cần xử lý mới có badge).
      }
      errorCountRef.current = 0;  // reset on success
    } catch (err) {
      const transient = isTransientError(err);
      errorCountRef.current++;
      if (showError && !transient && errorCountRef.current <= 2) {
        toast.push('error', extractError(err).message);
      }
      const threshold = transient ? 10 : 3;
      if (errorCountRef.current >= threshold && pollEnabledRef.current) {
        pollEnabledRef.current = false;
        toast.push('error', 'Tạm dừng cập nhật tự động - tải lại trang để thử lại');
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const manualRefresh = useCallback(() => {
    errorCountRef.current = 0;
    pollEnabledRef.current = true;
    refresh(true);
  }, [refresh]);

  /** Đóng drawer → làm mới NGAY. Lưới bàn đã nghỉ poll suốt lúc drawer mở (xem effect dưới),
   *  nên nếu chỉ chờ nhịp 2s kế tiếp thì có một khoảng bàn vừa gọi món xong vẫn hiện như cũ. */
  const closeDrawer = useCallback(() => {
    setActive(null);
    refresh(false);
  }, [refresh]);

  useEffect(() => {
    refresh();
    // Poll every 2s — sync nhanh giữa Order ↔ Bếp. 10-20 staff, payload nhỏ → server tải nhẹ.
    const t = setInterval(() => {
      /* NGHỈ khi drawer chi tiết bàn đang mở (2026-09-21). Drawer phủ kín sơ đồ bàn nên nhịp
         này không vẽ ra thứ gì người dùng đang nhìn, nhưng nó vẫn `setTables`/`setOpenOrders`
         → OrdersPage re-render → OrderDrawer re-render → BulkOrderModal (con của drawer)
         re-render cả lưới ~283 thẻ món, đúng lúc nhân viên đang vuốt chọn món. */
      if (pollEnabledRef.current && !drawerOpenRef.current) refresh(false);  // silent retry
    }, 2_000);
    return () => clearInterval(t);
  }, [refresh]);

  /* `/orders?table=<id>` → mở thẳng drawer của bàn đó (2026-10-12). Lối vào là dải đỏ "bàn ngồi
     quá lâu chưa thanh toán" (StaleTableBanner): bấm tên bàn trên dải là tới đúng bàn, không bắt
     người lớn tuổi dò tìm trên sơ đồ. Chờ `tables` tải xong mới khớp được id.
     Xoá tham số ngay sau khi mở (replace, không thêm lịch sử): để lại thì đóng drawer rồi nhịp
     poll kế tiếp lại mở bung nó ra, và nút Back của điện thoại quay về đúng chỗ cũ. */
  const tableParam = searchParams.get('table');
  useEffect(() => {
    if (!tableParam || tables.length === 0) return;
    const t = tables.find((x) => x.id === tableParam);
    if (t) setActive(t);
    const next = new URLSearchParams(searchParams);
    next.delete('table');
    setSearchParams(next, { replace: true });
  }, [tableParam, tables, searchParams, setSearchParams]);

  const orderByTable = useMemo(() => {
    const m = new Map<string, OrderSummary>();
    for (const o of openOrders) m.set(o.table_id, o);
    return m;
  }, [openOrders]);

  /** Mọi con số của một bàn — tính MỘT lần, dùng cho cả bộ lọc lẫn thẻ. */
  const summarize = useCallback((t: Table) => {
    const order = orderByTable.get(t.id);
    const items = order?.items || [];
    const counts: Record<string, number> = { PENDING: 0, KITCHEN: 0, COOKING: 0, READY: 0, SERVED: 0 };
    let total = 0;
    let qty = 0;
    for (const it of items) {
      if (it.is_note) continue;  // ghi chú không phải món
      if (counts[it.state] != null) counts[it.state] += it.qty;
      if (it.state !== 'CANCELLED') {
        total += (it.menu_item_price ?? 0) * it.qty;
        qty += it.qty;
      }
    }
    const unserved = counts.KITCHEN + counts.COOKING + counts.READY;
    const minutesSinceKitchen =
      order?.first_kitchen_at != null
        ? Math.max(0, Math.floor((Date.now() - order.first_kitchen_at) / 60_000))
        : null;
    // Đồng hồ ngồi bàn: từ lần đầu báo bếp; bàn chưa từng báo bếp thì từ lúc mở bàn.
    const seatMinutes = order
      ? minutesSinceKitchen ?? Math.max(0, Math.floor((Date.now() - order.opened_at) / 60_000))
      : null;
    return {
      order,
      counts,
      total,
      qty,
      hasItems: qty > 0,
      ready: counts.READY > 0,
      hasUnserved: unserved > 0,
      slowKitchen: minutesSinceKitchen != null && minutesSinceKitchen >= SLOW_KITCHEN_MIN && counts.SERVED === 0,
      seatMinutes,
      qrWaiting: qrWaitingByCode.get(t.code) ?? 0,
      /* "Tính tiền" chỉ có nghĩa khi bàn CÒN món để thu — bàn đã trả xong mà lời gọi cũ chưa ai
         bấm "Đã nghe" thì không hiện trên thẻ (2026-11-06, Bàn 16 trống vẫn hiện "Tính tiền"). */
      calls: (() => {
        const c = callsByCode.get(t.code);
        if (!c) return null;
        const bill = qty > 0 ? c.bill : null;
        return bill == null && c.staff == null ? null : { bill, staff: c.staff };
      })(),
      stale: staleByTable.get(t.id) ?? null,
    };
  }, [orderByTable, qrWaitingByCode, callsByCode, staleByTable]);

  const summaries = useMemo(() => new Map(tables.map((t) => [t.id, summarize(t)])), [tables, summarize]);

  const matches = useCallback((t: Table, k: FilterKey): boolean => {
    const s = summaries.get(t.id)!;
    switch (k) {
      case 'all': return true;
      case 'in-use': return !!s.order;
      case 'empty': return !s.order;
      case 'ready': return s.ready;
      case 'has-pending': return s.hasUnserved;
      case 'qr': return s.qrWaiting > 0 || !!s.calls;
      case 'unpaid': return !!s.stale;
      default: return t.kind === k;
    }
  }, [summaries]);

  // Đếm cho từng bộ lọc (luôn tính từ toàn bộ bàn, không phụ thuộc bộ lọc đang chọn).
  const filterCounts = useMemo(() => {
    const c = {} as Record<FilterKey, number>;
    for (const k of [...STATUS_FILTERS, ...KIND_FILTERS]) c[k] = tables.filter((t) => matches(t, k)).length;
    return c;
  }, [tables, matches]);

  // Nhóm "Loại bàn" chỉ khi có bàn mang về / giao hàng ĐANG có khách (hoặc đang lọc theo nó).
  const showKindGroup =
    KIND_FILTERS.includes(filter) ||
    tables.some((t) => t.kind !== 'dine-in' && !!summaries.get(t.id)?.order);

  const filteredTables = tables
    .filter((t) => matches(t, filter))
    .sort((a, b) => {
      // Sort: dine-in trước, rồi theo vị trí y,x (Quản lý bàn); trùng vị trí thì theo SỐ trong tên
      // ("Bàn 2" trước "Bàn 10" — so chữ thường sẽ ra 1, 10, 2). Các loại khác cũng theo số.
      const byName = a.name.localeCompare(b.name, 'vi', { numeric: true, sensitivity: 'base' });
      if (a.kind === 'dine-in' && b.kind === 'dine-in') {
        return (a.y - b.y) || (a.x - b.x) || byName;
      }
      if (a.kind === 'dine-in') return -1;
      if (b.kind === 'dine-in') return 1;
      return byName;
    });

  /** Viền/nền thẻ theo VIỆC CẦN LÀM, ưu tiên từ trên xuống:
   *  đỏ = bếp chậm → tím = khách QR chờ duyệt → cam = món xong chờ
   *  mang ra → xám = đang ăn bình thường (kể cả đã giao đủ món: khách còn ngồi thì CHƯA phải "chờ
   *  thanh toán" — chủ repo bỏ nhãn đó 2026-11-06; chấm xanh lá "đã giao" đã đủ thông tin). */
  const cardVariant = (s: ReturnType<typeof summarize>): Variant => {
    if (s.slowKitchen) return 'alert';
    if (s.qrWaiting > 0 || s.calls) return 'qr';
    if (s.stale) return 'stale';
    if (s.ready) return 'ready';
    if (s.hasItems) return 'normal';
    return 'empty';
  };

  const renderTableCard = (t: Table) => {
    const s = summaries.get(t.id)!;
    const variant = cardVariant(s);
    const seatTone =
      s.seatMinutes == null ? '' : s.seatMinutes >= SEAT_CRITICAL_MIN ? ' is-critical' : s.seatMinutes >= SEAT_WARN_MIN ? ' is-warn' : '';

    /* Việc cần làm của bàn — tối đa HAI dòng, ưu tiên như viền (2026-11-06). Mọi yêu cầu QR đều
       có dòng riêng, có chữ + thời gian chờ: trước chỉ "gọi món chờ duyệt" mới có dấu hiệu, bàn
       xin hoá đơn / gọi nhân viên nhìn sơ đồ không thấy gì. */
    const flags: ReactNode[] = [];
    if (s.slowKitchen) {
      flags.push(<span key="slow" className="tcard-flag tcard-flag--alert"><TriangleAlert size={14} aria-hidden="true" /> Bếp chậm</span>);
    }
    if (s.qrWaiting > 0) {
      flags.push(<span key="qr" className="tcard-flag tcard-flag--qr"><ShoppingCart size={14} aria-hidden="true" /> {s.qrWaiting > 1 ? `Gọi món ×${s.qrWaiting}` : 'Gọi món'}</span>);
    }
    if (s.calls?.bill != null) {
      flags.push(<span key="bill" className="tcard-flag tcard-flag--qr"><Receipt size={14} aria-hidden="true" /> Tính tiền</span>);
    }
    if (s.calls?.staff != null) {
      flags.push(<span key="staff" className="tcard-flag tcard-flag--qr"><BellRing size={14} aria-hidden="true" /> Gọi nhân viên</span>);
    }
    if (s.stale) {
      flags.push(<span key="stale" className="tcard-flag tcard-flag--stale"><Clock size={14} aria-hidden="true" /> Chưa trả</span>);
    }
    if (s.ready) {
      flags.push(<span key="ready" className="tcard-flag tcard-flag--ready">Có món chờ mang ra</span>);
    }
    /* MỘT dòng việc trên thẻ (2026-11-06): hai dòng làm cả hàng thẻ cao theo (lưới chia đều
       chiều cao). Việc còn lại hiện "+N"; chi tiết đủ ở thanh "việc đang chờ" và trong bàn. */
    const shownFlags = flags.slice(0, 1);

    return (
      <div key={t.id} className="op-cell">
        <button className={`tcard tcard--${variant}`} onClick={() => setActive(t)}>
          <div className="tcard-top">
            {/* Mã bàn kỹ thuật (ban-01) đã bỏ khỏi thẻ (2026-11-06): nhân viên chỉ cần tên. */}
            <div className="tcard-name">{t.name}</div>
            {s.seatMinutes != null && (
              <div className={`tcard-age${seatTone}`}>
                <Timer size={14} aria-hidden="true" /> {formatAge(s.seatMinutes)}
              </div>
            )}
          </div>

          {s.hasItems ? (
            <>
              <div className="tcard-money">
                {/* Số món bỏ (2026-11-06): chấm trạng thái ngay dưới đã cộng ra đúng số món, ở 360px
                    "- 2 món" bị cắt thành "- 2 m…". */}
                {fmtMoney(s.total)}
              </div>
              {/* Trạng thái món gộp MỘT dòng chấm màu + số (chú thích ở nút ⓘ). Thẻ nhờ vậy cao
                  đều nhau — trước đây bàn có 3 trạng thái kéo cả hàng thẻ cao theo. */}
              <div className="tcard-states" aria-label={STATE_ORDER.filter((st) => s.counts[st] > 0).map((st) => `${s.counts[st]} ${STATE_LABEL[st]}`).join(', ')}>
                {STATE_ORDER.map((st) =>
                  s.counts[st] > 0 ? (
                    <span key={st} className="tcard-state" aria-hidden="true">
                      <span className={`op-dot op-dot--${st}`} />
                      {s.counts[st]}
                    </span>
                  ) : null,
                )}
              </div>
            </>
          ) : s.qrWaiting > 0 || s.calls ? null : (
            /* KHÔNG rơi về chữ "Trống" khi có lượt QR chờ (chủ quán chốt 2026-10-01): bàn đang có
               khách ngồi chờ mà ghi "Trống" là đúng tình huống dấu hiệu QR sinh ra để tránh. */
            <div className="tcard-empty-text">Trống</div>
          )}

          {shownFlags.length > 0 && (
            <div className="tcard-flagrow">
              {shownFlags}
              {flags.length > 1 && <span className="tcard-more">+{flags.length - 1}</span>}
            </div>
          )}
        </button>
      </div>
    );
  };

  const renderChip = (k: FilterKey) => (
    <button
      key={k}
      type="button"
      onClick={() => setFilter(k)}
      aria-pressed={filter === k}
      className={`op-chip${filterCounts[k] === 0 ? ' op-chip--zero' : ''}`}
    >
      {FILTER_LABEL[k]}
      <span className="op-chip-count">{filterCounts[k]}</span>
    </button>
  );

  return (
    <PageLayout className="orders-page">
      {/* Tiêu đề "Sơ đồ bàn" nằm trên header (App.tsx `pageTitle`) — hiện cả trên điện thoại. */}

      {loading && <p className="muted">Đang tải bàn...</p>}

      {!loading && tables.length === 0 && (
        <div className="empty-state card">
          Chưa có bàn nào - vào Thêm → Quản lý bàn để tạo bàn
        </div>
      )}

      {!loading && tables.length > 0 && (
        <>
          {/* Bộ lọc: mỗi nhóm MỘT hàng — điện thoại vuốt ngang (mép phải mờ dần báo còn chip phía
              sau), máy tính tự xuống dòng. Chú thích trạng thái thu vào nút ⓘ để bàn đầu tiên
              lên cao hơn. */}
          <div className="op-filters">
            <div className="op-filter-row">
              <div className="op-filter-group op-scroll" role="group" aria-label="Lọc theo trạng thái">
                {STATUS_FILTERS.map(renderChip)}
              </div>
              <button
                type="button"
                className="secondary op-legend-btn"
                aria-expanded={legendOpen}
                aria-label="Chú thích màu"
                onClick={() => setLegendOpen((v) => !v)}
              >
                <Info size={20} aria-hidden="true" />
              </button>
            </div>
            {showKindGroup && (
              <div className="op-filter-group op-scroll" role="group" aria-label="Lọc theo loại bàn">
                {KIND_FILTERS.map(renderChip)}
              </div>
            )}
          </div>

          {legendOpen && (
            <div className="op-legend card">
              <div><strong>Màu viền thẻ:</strong></div>
              <div className="op-legend-row">
                <span><span className="op-swatch op-swatch--alert" />Bếp chậm (báo bếp 15 phút chưa ra món)</span>
                <span><span className="op-swatch op-swatch--qr" />Khách QR gọi (gọi món, gọi nhân viên, tính tiền)</span>
                <span><span className="op-swatch op-swatch--stale" />Chưa trả (mở bàn quá lâu)</span>
                <span><span className="op-swatch op-swatch--ready" />Có món chờ mang ra</span>
                <span><span className="op-swatch op-swatch--normal" />Đang ăn</span>
              </div>
              <div><strong>Chấm trạng thái món:</strong></div>
              <div className="op-legend-row">
                {STATE_ORDER.map((st) => (
                  <span key={st}><span className={`op-dot op-dot--${st}`} aria-hidden="true" />{STATE_LABEL[st]}</span>
                ))}
              </div>
            </div>
          )}

          {filteredTables.length === 0 ? (
            <div className="empty-state card">
              Không có bàn nào ở mục "{FILTER_LABEL[filter]}"
            </div>
          ) : (
            <div className="op-grid">{filteredTables.map(renderTableCard)}</div>
          )}
        </>
      )}

      {active && <OrderDrawer table={active} onClose={closeDrawer} onTransferred={manualRefresh} />}
    </PageLayout>
  );
}
