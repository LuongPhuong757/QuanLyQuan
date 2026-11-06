// Drawer chi tiết bàn: list món với lifecycle state buttons + add món + chuyển bàn
import type { CSSProperties } from 'react';
import React, { useEffect, useState, useCallback, useRef, FormEvent } from 'react';
import { api, extractError, isTransientError } from '../lib/api.ts';
import { settleAll } from '../lib/settle-all.ts';
import { useToast } from './Toast.tsx';
import { CheckoutDialog, type CheckoutResult } from './CheckoutDialog.tsx';
import { useAuth } from '../lib/auth-context.tsx';
import { useConfirm } from './ConfirmDialog.tsx';
import { BulkOrderModal } from './BulkOrderModal.tsx';
import { HelpModal } from './HelpModal.tsx';
import { ageColor, ageMinutes, formatAge } from '../lib/item-age.ts';
import { customerMapHref, hasSharedLocation } from '../lib/customer-map.ts';
import { guestPendingStore } from '../lib/guest-pending.ts';
import {
  ArrowRightLeft, Check, ShoppingCart, Clock, Info, MoreHorizontal, Pencil, Plus, Printer,
  Star, StickyNote, Trash2, Undo2, X,
} from 'lucide-react';

type OrderItem = {
  id: string;
  menu_item_id: string;
  menu_item_name: string;
  menu_item_price: number;
  qty: number;
  state: string;
  note: string | null;
  cancelled_reason: string | null;
  created_by_full_name: string | null;
  is_priority?: boolean;
  /** true = dòng ghi chú cho bếp ("lấy bát cho khách"), không phải món bán. */
  is_note?: boolean;
  /** Lúc khách gọi món (epoch ms) — gốc để tính "đã chờ bao lâu". */
  created_at: number;
  /** Lần đổi cuối (BE `@UpdateDateColumn`). Với món READY ≈ lúc bếp báo xong → "Xong 6p trước". */
  updated_at?: number;
};

// Nhóm hiển thị: gộp các dòng cùng món+ghi chú+trạng thái lại "N×" (count = tổng
// qty, vì mỗi dòng có thể mang nhiều phần từ 1 lần gọi).
// `oldest` = created_at nhỏ nhất trong nhóm → đồng hồ chờ lấy trường hợp xấu nhất,
// không để phần mới gọi che mất phần đã chờ lâu.
type ItemGroup = { key: string; rep: OrderItem; count: number; ids: string[]; oldest: number; doneAt: number };

type Order = {
  id: string;
  table_id: string;
  first_kitchen_at?: number | null;
  table_code: string;
  opened_at: number;
  closed_at: number | null;
  customer_name: string | null;
  customer_address: string | null;
  customer_phone: string | null;
  // 4 field vị trí (2026-08-05, yêu cầu chủ dự án: "người đi ship vào bàn order phải xem được
  // địa chỉ"). BE trả nguyên entity `orders` ở `GET /orders/by-table/:id` nên dữ liệu có sẵn từ
  // lúc duyệt đơn online (admin-online-orders.service copy sang order) — chỉ thiếu phần khai
  // type + vẽ ra. `decimal` của MySQL về dạng string, KHÔNG phải number.
  customer_lat?: string | null;
  customer_lng?: string | null;
  customer_map_link?: string | null;
  distance_km?: string | null;
  // 3 field dưới phục vụ badge chặng giao của ĐƠN ONLINE (chỉ đạo 2026-08-04: shipper vào
  // màn order phải biết đơn đang giao) — BE trả nguyên entity nên có sẵn, chỉ khai thêm type.
  source?: string; // 'STAFF' | 'ONLINE'
  shipped_at?: number | null;
  received_at?: number | null;
  /** Phí ship admin nhập lúc duyệt đơn online (M2.D-62). PHẢI cộng vào tổng cần thu — thiếu nó
   * là thu thiếu đúng bằng phí ship, mỗi đơn giao tận nơi (lỗi phát hiện 2026-08-06). Đơn tại
   * quán không có cột này trong payload cũ nên để optional, `?? 0`. */
  ship_fee?: number;
  items: OrderItem[];
};

type Table = {
  id: string;
  code: string;
  name: string;
  kind: string;
};

// Must match packages/schemas/orders.ts.
// SERVED là shortcut từ mọi state non-terminal — món có sẵn giao luôn không cần bếp.
// SERVED → CANCELLED = trả món (đã mang ra nhưng khách không dùng hết).
const ALLOWED: Record<string, string[]> = {
  PENDING: ['KITCHEN', 'SERVED', 'CANCELLED'],
  KITCHEN: ['COOKING', 'SERVED', 'CANCELLED'],
  COOKING: ['READY', 'SERVED', 'CANCELLED'],
  READY: ['SERVED', 'CANCELLED'],
  SERVED: ['CANCELLED'],
  CANCELLED: [],
};

const CANCEL_CONFIRM: Record<string, boolean> = {
  PENDING: false,
  KITCHEN: true,
  COOKING: true,
  READY: true,
  SERVED: true, // đi qua modal trả món (chọn số lượng), không phải prompt lý do
  CANCELLED: false,
};

const LABEL: Record<string, string> = {
  PENDING: 'Đang gọi',
  KITCHEN: 'Đã báo bếp',
  COOKING: 'Đang làm',
  READY: 'Xong, chờ giao',
  SERVED: 'Đã giao',
  CANCELLED: 'Đã huỷ',
};

/* Màu trạng thái KHỚP chấm trạng thái trên thẻ bàn ở Sơ đồ bàn (2026-11-06): xám nhạt = đã báo
   bếp, xám đậm = đang làm, cam = xong chờ mang ra (việc phải làm), xanh lá = đã giao. Hai màn
   cùng nói một chuyện mà hai bộ màu thì nhân viên phải dịch lại trong đầu. */
const COLOR: Record<string, string> = {
  PENDING: '#6b7280',
  KITCHEN: '#9ca3af',
  COOKING: '#4b5563',
  READY: '#f59e0b',
  SERVED: '#16a34a',
  CANCELLED: '#b4231d',
};

const NEXT_LABEL: Record<string, string> = {
  KITCHEN: 'Báo bếp',
  COOKING: 'Bắt đầu nấu',
  READY: 'Xong',
  SERVED: 'Đã giao',
  CANCELLED: 'Huỷ',
};

/* Lý do huỷ — CHỌN bằng một chạm, không bắt gõ (chủ repo 2026-11-06, thay quyết định cũ "lý do
   luôn không bắt buộc"). Bắt buộc chọn để nhật ký bàn luôn trả lời được "vì sao", nhưng chỉ tốn
   một cú bấm. "Khác" mở thêm ô gõ (không bắt buộc). Bớt số lượng (Sửa SL) thì KHÔNG hỏi. */
const REASONS_CANCEL_ITEM = ['Khách đổi ý', 'Gọi nhầm', 'Hết món', 'Chờ lâu quá', 'Khác'];
const REASONS_RETURN_ITEM = ['Khách không dùng hết', 'Món bị lỗi', 'Mang nhầm món', 'Khác'];
const REASONS_CANCEL_TABLE = ['Khách không dùng nữa', 'Mở nhầm bàn', 'Khách bỏ về', 'Khác'];

type ReasonAsk = {
  title: string;
  summary: React.ReactNode;
  reasons: string[];
  confirmLabel: string;
  resolve: (reason: string | null) => void;
};

function fmt(v: number) {
  return v.toLocaleString('vi-VN') + 'đ';
}


// Helper components dùng trong checkout confirm dialog

type Props = {
  table: Table;
  onClose: () => void;
  onTransferred?: () => void;
};

export function OrderDrawer({ table, onClose, onTransferred }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBulkOrder, setShowBulkOrder] = useState(false);
  const [fulfillBusy, setFulfillBusy] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showNote, setShowNote] = useState(false);
  // Nhóm món đang sửa số lượng (mở EditQtyModal). `target` = số lượng đặt sẵn
  // trong ô nhập: mở từ "Sửa SL" thì giữ nguyên, mở từ "Huỷ/Trả món" thì 0.
  const [editQty, setEditQty] = useState<{ group: ItemGroup; target: number } | null>(null);
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  /** Menu ⋯ ở header — chứa các thao tác thỉnh thoảng mới dùng. */
  const [menuOpen, setMenuOpen] = useState(false);
  /** Hộp chọn lý do huỷ đang mở (null = đóng). Dạng promise để luồng huỷ đọc như confirm(). */
  const [reasonAsk, setReasonAsk] = useState<ReasonAsk | null>(null);
  const askReason = (opts: Omit<ReasonAsk, 'resolve'>) =>
    new Promise<string | null>((resolve) => setReasonAsk({ ...opts, resolve }));
  const errorCountRef = useRef(0);
  const pollEnabledRef = useRef(true);
  /* Màn "Gọi món" (BulkOrderModal) đang che kín drawer hay không.
     Là REF chứ không đọc thẳng `showBulkOrder`: đọc thẳng thì `showBulkOrder` phải vào deps
     của effect poll bên dưới, effect dựng lại và bắn thêm một `refresh(true)` mỗi lần mở/đóng
     hộp — thừa một request đúng lúc hộp đang tải menu. */
  const bulkOpenRef = useRef(false);
  bulkOpenRef.current = showBulkOrder;

  const isDelivery = table.kind === 'delivery';
  const mapHref = order ? customerMapHref(order) : null;

  // ── Đơn ONLINE: drawer thu về 2 hành động — mốc giao + thanh toán (chỉ đạo 2026-08-04).
  // Sửa món/gọi thêm của đơn online làm ở màn Đơn hàng online (có panel sửa + báo lại khách);
  // gọi món/chuyển bàn/ghi chú ở đây là mở đường cho đơn thật lệch khỏi bản khách đã chốt. ──
  const isOnline = order?.source === 'ONLINE';
  /** Nút mốc giao DUY NHẤT là "Đã đi ship" (bàn delivery chưa ship). KHÔNG có nút "khách đã
   * nhận/tới lấy" — khách nhận = thanh toán (chốt 2026-08-04), luồng checkout tự ghi
   * `received_at`; bàn takeaway vì thế không có nút mốc nào. */
  const canMarkShipped =
    isOnline && order != null && isDelivery && !order.shipped_at && !order.received_at;

  /** Đơn ship chưa rời quán thì CHƯA cho thanh toán (chốt 2026-08-04) — trình tự thật ngoài
   * đời là hàng đi rồi tiền mới về; cho checkout trước là mở đường bấm nhầm khoá đơn sớm.
   * BE cũng chặn 409 — đây chỉ là lớp UX. */
  const checkoutBlockedByShip = isOnline && isDelivery && order != null && !order.shipped_at;

  const markShipped = async () => {
    if (!order) return;
    setFulfillBusy(true);
    try {
      // BE không ghi đè mốc đã có (bấm 2 lần) — tin mốc trả về, không tự lấy giờ máy.
      const res = await api.post<{
        data: { shipped_at_ms: number | null; received_at_ms: number | null };
      }>(`/admin/online-orders/by-order/${order.id}/ship`);
      const d = res.data.data;
      setOrder((cur) =>
        cur ? { ...cur, shipped_at: d.shipped_at_ms, received_at: d.received_at_ms } : cur,
      );
      toast.push('success', 'Đã ghi nhận: đơn rời quán đi giao');
    } catch (err) {
      toast.push('error', extractError(err).message);
    } finally {
      setFulfillBusy(false);
    }
  };

  const refresh = useCallback(async (showError = true) => {
    try {
      const res = await api.get<{ data: Order }>(`/orders/by-table/${table.id}`);
      if (res.data?.data) setOrder(res.data.data);
      errorCountRef.current = 0;
    } catch (err) {
      // Lỗi transient (5xx/network/timeout) — KHÔNG show toast, request kế tiếp
      // (2s sau) sẽ retry. Tránh user thấy thông báo lỗi nhấp nháy gây hiểu nhầm.
      const transient = isTransientError(err);
      errorCountRef.current++;
      if (showError && !transient && errorCountRef.current <= 2) {
        toast.push('error', extractError(err).message);
      }
      // Threshold cao hơn cho transient: 10 vs 3 cho non-transient → ít cảnh báo dư
      const threshold = transient ? 10 : 3;
      if (errorCountRef.current >= threshold && pollEnabledRef.current) {
        pollEnabledRef.current = false;
        toast.push('error', 'Tạm dừng cập nhật tự động — đóng drawer mở lại để retry.');
      }
    } finally {
      setLoading(false);
    }
  }, [table.id, toast]);

  /* ── M7 — lượt khách gọi đang chờ duyệt, của CHÍNH bàn này ────────────────────────────
   * Chủ quán chốt 2026-10-01: bấm vào bàn ở màn Order cũng phải duyệt được, không bắt chạy
   * sang màn Bếp. Dùng chung endpoint `/table-requests/pending` (trả mọi bàn) rồi lọc theo
   * `order_id` — không thêm endpoint mới cho một màn.
   */
  const [guestReqs, setGuestReqs] = useState<
    Array<{
      id: string;
      order_id: string;
      created_at: number;
      items: Array<{ name: string; qty: number; note: string | null; price_now: number; out_of_stock: boolean }>;
      total_now: number;
    }>
  >([]);
  const [guestBusyId, setGuestBusyId] = useState<string | null>(null);

  /* Deps là `order.id`, KHÔNG phải cả `order` (2026-10-16). `refresh()` 2 giây một lần thay
     `order` bằng object mới dù không gì đổi → effect cũ dựng lại timer + bắn thêm một lượt gọi
     ngay mỗi 2 giây, tức nhịp "3 giây" thực chất là 2 giây cộng dồn. Chỉ id đổi (chuyển bàn,
     thanh toán xong mở đơn mới) mới cần nạp lại. */
  const guestOrderId = order?.id ?? null;
  useEffect(() => {
    if (!guestOrderId) return;
    let alive = true;
    const load = async () => {
      /* NGHỈ khi màn "Gọi món" đang che drawer — cùng lý do với nhịp 2 giây bên dưới: mỗi
         `setGuestReqs` là một lượt re-render dội xuống lưới ~283 thẻ món giữa lúc nhân viên
         vuốt chọn món. Lượt khách mới vẫn hiện ngay ở màn Bếp; ở đây nó hiện ở nhịp đầu tiên
         sau khi đóng hộp. */
      if (bulkOpenRef.current) return;
      try {
        const res = await api.get<{ data: { requests: typeof guestReqs } }>('/table-requests/pending');
        if (!alive) return;
        const next = (res.data?.data?.requests ?? []).filter((r) => r.order_id === guestOrderId);
        // API trả mảng MỚI mọi lần kể cả khi không có gì — so nội dung để khỏi re-render vô cớ.
        setGuestReqs((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      } catch {
        // Endpoint mới lỗi KHÔNG được làm hỏng drawer — đây là phần thêm, không phải phần lõi.
      }
    };
    void load();
    const t = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [guestOrderId]);

  const decideGuest = useCallback(
    async (requestId: string, action: 'approve' | 'reject') => {
      setGuestBusyId(requestId);
      try {
        await api.post(`/table-requests/${requestId}/${action}`, {});
        await refresh(false);
        setGuestReqs((rs) => rs.filter((r) => r.id !== requestId));
        toast.push('success', action === 'approve' ? 'Đã nhận món, bếp thấy ngay.' : 'Đã bỏ lượt này.');
      } catch (err) {
        const msg = extractError(err).message;
        // 409 = người khác vừa xử lý. Câu trung tính, không banner đỏ: đây là hợp tác bình
        // thường giữa hai nhân viên, không phải sự cố.
        toast.push(/vừa được người khác/.test(msg) ? 'info' : 'error', msg);
      } finally {
        setGuestBusyId(null);
      }
    },
    [refresh, toast],
  );

  useEffect(() => {
    refresh(true);
    // Poll every 2s while drawer open — bếp + nhân viên thấy state thay đổi nhanh
    const t = setInterval(() => {
      /* NGHỈ khi màn "Gọi món" đang mở (2026-09-21). Hộp đó che kín drawer nên không có một
         thứ gì trên màn phụ thuộc vào nhịp này, trong khi `BulkOrderModal` lại là CON của
         drawer: mỗi `setOrder` là một lượt re-render dội xuống lưới ~283 thẻ món, giữa lúc
         nhân viên đang vuốt chọn món (đo máy chậm 6×: 17,3ms/lượt, quá ngân sách 1 frame).
         Đóng hộp là nhịp tiếp theo chạy lại bình thường, và `onSubmitted` đã gọi `refresh()`
         ngay sau khi báo bếp nên không có khoảng nào dữ liệu bị cũ mà người dùng nhìn thấy. */
      if (pollEnabledRef.current && !bulkOpenRef.current) refresh(false);
    }, 2_000);
    return () => clearInterval(t);
  }, [refresh]);

  // Nhịp 30s chỉ để đồng hồ chờ tự nhích lên. Poll 2s đã re-render sẵn, nhưng poll
  // tự tắt sau nhiều lần lỗi mạng — không có nhịp này thì đồng hồ đứng ở con số cũ
  // và bồi bàn tưởng món mới gọi trong khi thực tế đã chờ rất lâu.
  const [, setClockTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setClockTick((v) => v + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // Thao tác theo NHÓM: 1 món có thể nằm ở nhiều dòng (gọi nhiều lần), drawer gộp
  // lại "N×" — nút bấm áp cho TẤT CẢ phần trong nhóm.
  const changeStateGroup = async (g: ItemGroup, to: string) => {
    /* Huỷ/trả món → hỏi xác nhận + CHỌN lý do rồi huỷ cả nhóm. Muốn bớt vài phần thì dùng
       "Sửa số lượng" trong cùng menu ⋯ (không hỏi lý do). Trước 2026-11-06 không hỏi lý do —
       chủ repo đổi: bắt chọn nhanh một lý do (xem REASONS_*). */
    if (to === 'CANCELLED') {
      const isServedGroup = g.rep.state === 'SERVED';
      const reason = await askReason({
        title: isServedGroup ? 'Trả món?' : 'Huỷ món?',
        confirmLabel: isServedGroup ? `Trả ${g.count} phần` : `Huỷ ${g.count} phần`,
        reasons: isServedGroup ? REASONS_RETURN_ITEM : REASONS_CANCEL_ITEM,
        summary: (
          <>
            <div>
              <strong>
                {g.count} × {g.rep.menu_item_name}
              </strong>{' '}
              <span className="muted">({LABEL[g.rep.state]})</span>
            </div>
            {isServedGroup && (
              <div className="reason-warn">
                Món đã mang ra bàn - trả lại sẽ bớt <strong>{fmt(g.rep.menu_item_price * g.count)}</strong> khỏi
                tiền bàn
              </div>
            )}
          </>
        ),
      });
      if (reason === null) return;
      try {
        await api.post('/orders/items/remove', { item_ids: g.ids, reason });
        toast.push('success', `${isServedGroup ? 'Đã trả' : 'Đã huỷ'} ${g.count} × ${g.rep.menu_item_name}`);
        refresh();
      } catch (e) {
        toast.push('error', extractError(e).message);
      }
      return;
    }
    // SONG SONG như màn Bếp, không `for … await`: nhóm 5 dòng là 5 vòng round-trip nối tiếp,
    // đo 2026-09-14 trên 4G mất ~175 ms/dòng — bồi bàn bấm "Đã giao" rồi đứng chờ gần 1 giây.
    const res = await settleAll(g.ids.map((id) => () => api.patch(`/orders/items/${id}/state`, { to })));
    if (res.failed === 0) {
      toast.push('success', `${g.count}× ${g.rep.menu_item_name} → ${LABEL[to]}`);
    } else if (res.failed === g.ids.length) {
      toast.push('error', extractError(res.firstError).message);
    } else {
      // Báo rõ số dòng hỏng thay vì im lặng: một phần nhóm đã đổi, phần còn lại vẫn ở chỗ cũ.
      toast.push('error', `${res.failed}/${g.ids.length} dòng không chuyển được — thử lại.`);
    }
    refresh();
  };

  /** Huỷ cả bàn — khách vào gọi đồ rồi không dùng nữa. Huỷ sạch mọi món (kể cả đã
   * giao), bàn về trống. Bắt xác nhận vì đây là thao tác xoá tiền của cả bàn. */
  const cancelWholeTable = async () => {
    if (!order) return;
    const alive = order.items?.filter((i) => i.state !== 'CANCELLED') || [];
    if (alive.length === 0) {
      toast.push('info', 'Bàn này không có món nào để huỷ');
      return;
    }
    const servedAmount = alive
      .filter((i) => i.state === 'SERVED')
      .reduce((s, i) => s + i.menu_item_price * i.qty, 0);
    const aliveUnits = unitsOf(alive);

    const reason = await askReason({
      title: `Huỷ cả ${table.name}?`,
      confirmLabel: `Huỷ cả bàn (${aliveUnits} món)`,
      reasons: REASONS_CANCEL_TABLE,
      summary: (
        <>
          <div>
            Toàn bộ <strong>{aliveUnits} món</strong> của bàn sẽ bị huỷ, bàn về trạng thái trống
          </div>
          {servedAmount > 0 && (
            <div className="reason-warn">
              Số tiền bị xoá khỏi bill: <strong>−{fmt(servedAmount)}</strong>
            </div>
          )}
          <div className="muted">Nhật ký bàn vẫn ghi lại đầy đủ (ai huỷ, món gì, bao nhiêu tiền)</div>
        </>
      ),
    });
    if (reason === null) return;

    try {
      await api.post(`/orders/${order.id}/cancel-all`, { reason });
      toast.push('success', `Đã huỷ cả ${table.name} (${aliveUnits} món)`);
      onTransferred?.(); // refresh sơ đồ bàn ở trang cha
      onClose();
    } catch (e) {
      toast.push('error', extractError(e).message);
    }
  };

  const togglePriorityGroup = async (g: ItemGroup) => {
    const next = !g.rep.is_priority;
    // Song song, cùng lý do với changeStateGroup.
    const res = await settleAll(
      g.ids.map((id) => () => api.patch(`/orders/items/${id}/priority`, { priority: next })),
    );
    if (res.failed === 0) {
      toast.push('success', next
        ? `Đã đánh dấu ưu tiên "${g.rep.menu_item_name}"`
        : `Đã bỏ ưu tiên "${g.rep.menu_item_name}"`);
    } else if (res.failed === g.ids.length) {
      toast.push('error', extractError(res.firstError).message);
    } else {
      toast.push('error', `${res.failed}/${g.ids.length} dòng không đổi được ưu tiên — thử lại.`);
    }
    refresh();
  };

  /** "Giao tất cả" — bưng một khay nhiều món ra bàn (2026-11-06). Song song như changeStateGroup. */
  const serveAll = async (ids: string[]) => {
    const res = await settleAll(ids.map((id) => () => api.patch(`/orders/items/${id}/state`, { to: 'SERVED' })));
    if (res.failed === 0) toast.push('success', `Đã giao ${ids.length} món`);
    else toast.push('error', `${res.failed}/${ids.length} món chưa chuyển được - thử lại`);
    refresh();
  };

  // Gộp các dòng theo (món + ghi chú) trong 1 cột trạng thái → hiển thị "N×".
  const groupItemsByState = (state: string): ItemGroup[] => {
    const list = order?.items?.filter((i) => i.state === state) || [];
    const map = new Map<string, ItemGroup>();
    for (const it of list) {
      const key = `${it.menu_item_id}¦${it.note ?? ''}`;
      const e = map.get(key);
      if (e) {
        e.count += it.qty;
        e.ids.push(it.id);
        if (it.created_at < e.oldest) e.oldest = it.created_at;
        const u = it.updated_at ?? it.created_at;
        if (u < e.doneAt) e.doneAt = u;
      } else {
        map.set(key, {
          key, rep: it, count: it.qty, ids: [it.id], oldest: it.created_at,
          doneAt: it.updated_at ?? it.created_at,
        });
      }
    }
    return Array.from(map.values());
  };

  const activeStates: string[] = ['PENDING', 'KITCHEN', 'COOKING', 'READY'];
  const terminalStates: string[] = ['SERVED', 'CANCELLED'];

  /* ĐÃ GỌI LÀ TÍNH TIỀN (chủ quán 2026-09-08) — mọi dòng chưa huỷ đều vào tiền, không đợi
     mang ra bàn. Khớp `computeCheckoutTotals` ở BE; hai bên lệch nhau thì thu ngân đọc một số
     còn hệ thống ghi sổ một số khác. */
  const billableItems = order?.items?.filter((i) => i.state !== 'CANCELLED') || [];
  const itemsTotal = billableItems.reduce((s, i) => s + i.menu_item_price * i.qty, 0);
  // M2.D-62 — tổng cần thu = tiền món + phí ship. BE `checkout()` cũng tính đúng công thức này;
  // 2 chỗ lệch nhau thì thu ngân đọc một số, hệ thống ghi sổ một số khác.
  const shipFee = order?.ship_fee ?? 0;
  const total = itemsTotal + shipFee;
  const activeItems = order?.items?.filter((i) => activeStates.includes(i.state)) || [];
  // 1 dòng item mang cả số lượng của lần gọi (qty=N) → mọi chỗ nói "N món" phải cộng
  // qty, đếm số dòng sẽ báo thiếu (gọi 3 phần 1 lần chỉ ra "1 món").
  const unitsOf = (list: OrderItem[]) => list.reduce((s, i) => s + i.qty, 0);
  const billableUnits = unitsOf(billableItems);
  /* Món chờ quá ngưỡng khẩn cấp — gom thành MỘT thông báo trên đầu danh sách (2026-11-06) thay
     vì dòng "quá lâu, nên ưu tiên…" lặp lại ở từng món. Ghi chú cho bếp không tính. */
  /* Thông báo đầu danh sách: chỉ còn "N món xong chưa mang ra · Giao tất cả" (bỏ "bếp chậm"). */
  const readyItems = activeItems.filter((i) => i.state === 'READY');
  const readyUnits = unitsOf(readyItems);
  /* Món chưa giao (không tính ghi chú) — quyết định nút chính ở thanh đáy. */
  const unservedUnits = unitsOf(activeItems.filter((i) => !i.is_note));
  /* "NV gọi" chỉ lặp trên từng món khi bàn có NHIỀU người gọi; một người thì ghi một lần ở đầu. */
  const creators = Array.from(
    new Set(billableItems.map((i) => i.created_by_full_name).filter((x): x is string => !!x)),
  );

  const hasItems = (order?.items?.length || 0) > 0;
  // Còn món chưa huỷ → mới có gì để "huỷ cả bàn". Bàn đã huỷ sạch thì ẩn nút.
  const hasAliveItems = (order?.items || []).some((i) => i.state !== 'CANCELLED');
  const isCheckedOut = !!order?.closed_at;

  const [payOpen, setPayOpen] = useState(false);

  /** Nút 💰 chỉ MỞ hộp thoại Thu tiền; mọi thứ còn lại (hình thức, mã QR, gọi API) nằm trong
   *  `CheckoutDialog`. Trước 2026-09-14 chỗ này là một hộp `confirm()` khổng lồ dựng bằng JSX
   *  nội tuyến và tuồn giá trị ra bằng `ref` — không mở rộng thêm được nữa. */
  // Phiếu tạm tính (2026-10-17): in cho khách khi CHƯA thanh toán — người giữ quán lúc chủ
  // vắng không biết thu tiền trên app, đưa tờ này cho khách rồi ghi tay món gọi thêm.
  const [tamTinhBusy, setTamTinhBusy] = useState(false);
  const printTamTinh = async () => {
    if (!order || tamTinhBusy) return;
    setTamTinhBusy(true);
    try {
      const res = await api.post<{ data: { queued: boolean } }>(`/orders/${order.id}/print-tam-tinh`, {});
      if (res.data.data.queued) toast.push('success', 'Đang in phiếu tạm tính…');
      else toast.push('error', 'Chưa bật in hoá đơn — vào Cài đặt → Máy in để bật.');
    } catch (err) {
      toast.push('error', extractError(err).message);
    } finally {
      setTamTinhBusy(false);
    }
  };

  const checkout = () => {
    if (!order) return;
    if (!hasItems) {
      toast.push('error', 'Bàn chưa có món nào để thanh toán');
      return;
    }
    setPayOpen(true);
  };

  /** Hộp thoại đã gọi API xong và thành công — phần còn lại y hệt luồng cũ. */
  const onPaid = (res: CheckoutResult) => {
    setPayOpen(false);
    /* Thu tiền xong → tự "Đã nghe" mọi lời gọi QR còn treo của bàn (2026-11-06). Trước đây khách
       bấm "Tính tiền", nhân viên thu tiền mà quên bấm "Đã nghe" → bàn đã trống vẫn hiện "Tính tiền".
       Dùng API có sẵn (`/table-calls/:id/ack`), làm ngầm — lỗi thì thôi, nhân viên vẫn tự bấm được. */
    void (async () => {
      try {
        const r = await api.get<{ data: { calls?: Array<{ id: string; table_code: string }> } }>('/table-requests/pending');
        const mine = (r.data?.data?.calls ?? []).filter((c) => c.table_code === table.code);
        await Promise.allSettled(mine.map((c) => api.post(`/table-calls/${c.id}/ack`, {})));
        if (mine.length > 0) await guestPendingStore.reload();
      } catch {
        /* im lặng — việc phụ */
      }
    })();
    // Ghi nợ: câu thông báo phải nói "chưa thu" — "Đã thanh toán" cho một bàn khách đi mà chưa trả
    // là câu sai, và người đọc toast là người đếm két.
    let msg = res.debt
      ? `📒 Đã ghi nợ ${table.name} · ${res.total.toLocaleString('vi-VN')}đ · chưa thu, xem ở Lịch sử › Đang nợ`
      : `✓ Đã thanh toán ${table.name} · ${res.total.toLocaleString('vi-VN')}đ`;
    if (res.auto_served_items > 0) msg += ` (${res.auto_served_items} món chưa mang ra vẫn tính tiền)`;
    if (!res.debt && res.transfer_amount > 0) {
      msg +=
        res.transfer_amount >= res.total
          ? ` · chuyển khoản${res.payment_qr_label ? ` → ${res.payment_qr_label}` : ''}`
          : ` · tiền mặt ${(res.total - res.transfer_amount).toLocaleString('vi-VN')}đ + CK ${res.transfer_amount.toLocaleString('vi-VN')}đ`;
    }
    toast.push('success', msg);
    // KHÔNG push notif — Admin checkout poller (ReadyListener) sẽ emit cross-device
    onTransferred?.();
    onClose();
  };

  return (
    <>
    {/* Hộp thoại Thu tiền nằm NGOÀI cây drawer và phủ lên trên nó: người thu vừa chìa QR cho
        khách vừa phải nhìn lại danh sách món thì bấm Huỷ là quay về đúng chỗ cũ. */}
    {payOpen && order && (
      <CheckoutDialog
        orderId={order.id}
        table={{ code: table.code, name: table.name }}
        cashier={{ full_name: user?.full_name, username: user?.name }}
        canCollectTransfer={!!user?.can_collect_transfer}
        items={order.items || []}
        itemsTotal={itemsTotal}
        shipFee={shipFee}
        onCancel={() => setPayOpen(false)}
        onDone={onPaid}
      />
    )}
    {reasonAsk && (
      <ReasonModal
        ask={reasonAsk}
        onDone={(r) => {
          reasonAsk.resolve(r);
          setReasonAsk(null);
        }}
      />
    )}
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        /* Chiều cao nằm trong CSS (.modal-flush + .drawer-full) — điện thoại mở TOÀN MÀN như màn
           "Xem đơn" (2026-11-06), không còn lộ header trang phía trên. */
        className="modal modal-flush drawer-full"
        style={{ maxWidth: 640, width: '100%' }}
      >
        <div className="flex between drawer-sticky-head" style={{ alignItems: 'flex-start', gap: 8, flexWrap: 'nowrap' }}>
          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
            <div className="drawer-title-row">
              <h1 id="drawer-title">{table.name}</h1>
              {/* Hướng dẫn ra khỏi menu ⋯ (2026-11-06): menu thao tác chỉ chứa thao tác. */}
              <button
                type="button"
                className="secondary drawer-icon-btn"
                onClick={() => setHelpOpen(true)}
                aria-label="Hướng dẫn"
              >
                <Info size={20} aria-hidden="true" />
              </button>
            </div>
            {/* Badge chặng giao của đơn ONLINE — shipper mở drawer là biết đơn đã rời quán
                chưa mà không phải chạy sang màn Đơn hàng online (chỉ đạo 2026-08-04).
                Bấm mốc ship/nhận vẫn ở màn đơn online; ở đây CHỈ ĐỌC. */}
            {/* Giờ mở bàn (2026-11-06) — bàn chưa trả lâu cần biết mở từ BAO GIỜ (vd hôm qua). */}
            {order && (
              <div className="drawer-opened muted">
                Mở bàn {(() => {
                  const d = new Date(order.opened_at);
                  const p2 = (x: number) => String(x).padStart(2, '0');
                  return `${p2(d.getHours())}:${p2(d.getMinutes())} ${p2(d.getDate())}/${p2(d.getMonth() + 1)}`;
                })()}
                {creators.length === 1 ? ` · NV gọi: ${creators[0]}` : ''}
              </div>
            )}
            {order?.source === 'ONLINE' && (
              <span className="drawer-online-tag">
                {order.received_at ? 'Khách đã nhận' : order.shipped_at ? 'Đang giao' : 'Đơn online'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, position: 'relative', flex: '0 0 auto' }}>
            {/* Menu ⋯: việc THỈNH THOẢNG mới làm. Huỷ cả bàn nằm CUỐI, tách bằng vạch kẻ
                (2026-11-06) — trước nó kẹp giữa "Ghi chú" và "In phiếu", rất dễ bấm nhầm. */}
            <button
              className="secondary drawer-icon-btn"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Thêm thao tác"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <MoreHorizontal size={22} aria-hidden="true" />
            </button>
            <button className="secondary drawer-icon-btn" onClick={onClose} aria-label="Đóng">
              <X size={22} aria-hidden="true" />
            </button>
            {menuOpen && (
              <>
                {/* Lớp trong suốt phủ toàn màn: bấm ra ngoài là đóng menu. */}
                <div
                  onClick={() => setMenuOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                />
                <div className="drawer-menu" role="menu">
                  {!isOnline && (
                    <button
                      role="menuitem"
                      onClick={() => { setMenuOpen(false); setShowTransfer(true); }}
                      disabled={!hasItems}
                    >
                      <ArrowRightLeft size={20} aria-hidden="true" /> Chuyển bàn
                    </button>
                  )}
                  {/* Ghi chú cho bếp — "lấy bát", "đũa thìa". Lưu như 1 dòng item nên bếp
                      thấy trên KDS và tick được như món thường. */}
                  {!isOnline && (
                    <button role="menuitem" onClick={() => { setMenuOpen(false); setShowNote(true); }}>
                      <StickyNote size={20} aria-hidden="true" /> Ghi chú cho bếp
                    </button>
                  )}
                  {/* In phiếu tạm tính (2026-10-17) — KHÔNG đổi gì trên đơn, in mấy lần cũng được. */}
                  {hasItems && (
                    <button
                      role="menuitem"
                      disabled={tamTinhBusy}
                      onClick={() => { setMenuOpen(false); void printTamTinh(); }}
                    >
                      <Printer size={20} aria-hidden="true" /> In phiếu tạm tính
                    </button>
                  )}
                  {!isOnline && hasAliveItems && (
                    <>
                      <div className="drawer-menu-sep" role="separator" />
                      <button
                        role="menuitem"
                        className="drawer-menu-danger"
                        onClick={() => { setMenuOpen(false); void cancelWholeTable(); }}
                      >
                        <Trash2 size={20} aria-hidden="true" /> Huỷ cả bàn
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* M7 — lượt khách tự gọi đang CHỜ DUYỆT. Việc phải xử lý TRƯỚC khi nhìn tới món đang nấu.
            Nằm NGOÀI đầu drawer (2026-11-06): trong đầu drawer nó chỉ rộng bằng cột tên bàn (chung
            hàng với ⋯ ✕) nên lơ lửng, hẹp hơn khung — giờ rộng hết khung và cuộn theo nội dung. */}
        {guestReqs.map((r) => (
          <div key={r.id} className="guest-req">
            <div className="guest-req-title">
              <ShoppingCart size={18} aria-hidden="true" /> Khách vừa gọi · {r.items.reduce((t, i) => t + i.qty, 0)} món
            </div>
            {r.items.map((i, k) => (
              <div key={k} className={`guest-req-line${i.out_of_stock ? ' is-gone' : ''}`}>
                <b>{i.qty}×</b> {i.name}
                {i.note ? <i className="guest-req-note"> - {i.note}</i> : null}
                {/* Nhãn hiện TRƯỚC khi bấm để một cú bấm vẫn là quyết định có hiểu biết. */}
                {i.out_of_stock ? <span className="guest-req-gone">hết - sẽ bỏ</span> : null}
              </div>
            ))}
            <div className="guest-req-sub">Tạm tính theo giá hiện tại: {fmt(r.total_now)}</div>
            {/* Hai nút RỘNG BẰNG NHAU (2026-11-06). "Bỏ" là nút viền, "Nhận món" nút chính. */}
            <div className="guest-req-actions">
              <button
                type="button"
                className="secondary"
                disabled={guestBusyId === r.id}
                onClick={() => void decideGuest(r.id, 'reject')}
              >
                Bỏ
              </button>
              <button type="button" disabled={guestBusyId === r.id} onClick={() => void decideGuest(r.id, 'approve')}>
                {guestBusyId === r.id ? 'Đang gửi…' : 'Nhận món'}
              </button>
            </div>
          </div>
        ))}

        <HelpModal title={`Hướng dẫn - ${table.name}`} open={helpOpen} onClose={() => setHelpOpen(false)}>
          <h3 style={{ marginTop: 0, marginBottom: 6 }}>Vòng đời một món</h3>
          <p style={{ marginTop: 0, color: '#6b7280' }}>
            Đã báo bếp → Đang làm → Xong, chờ mang ra → <strong>Đã giao</strong>
          </p>

          <h3 style={{ marginBottom: 6 }}>Mang món ra bàn</h3>
          <p style={{ margin: '4px 0' }}>
            Bấm nút <strong>Đã giao</strong> bên phải món. Bấm được ở mọi trạng thái - vd nước đóng
            chai có sẵn thì bấm luôn, không cần đợi bếp
          </p>

          <h3 style={{ marginBottom: 6 }}>Ưu tiên, sửa số lượng, huỷ món</h3>
          <p style={{ margin: '4px 0' }}>
            Bấm nút <strong>⋯</strong> trên dòng món. <strong>Ưu tiên</strong> chỉ có khi món đang chờ
            bếp: món lên đầu hàng ở màn Bếp và tự bỏ ưu tiên khi bếp bắt đầu nấu
          </p>
          <p style={{ margin: '4px 0' }}>
            Huỷ món phải chọn một lý do - nhật ký bàn ghi lại ai huỷ và vì sao
          </p>

          <h3 style={{ marginBottom: 6 }}>Thanh toán</h3>
          <p style={{ margin: '4px 0 0' }}>
            Thanh dưới cùng luôn hiện tổng tiền và nút <strong>Thanh toán</strong>. Món chưa mang ra
            vẫn tính tiền - hộp thanh toán sẽ liệt kê để bạn soát lại
          </p>
        </HelpModal>

        {loading && <p style={{ color: '#6b7280' }}>Đang tải...</p>}

        {!loading && order && (
          <>
            {/* Block thông tin khách — chỉ hiện cho bàn ship */}
            {isDelivery && (
              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  borderRadius: 10,
                  background: order.customer_name ? '#d1fae5' : '#fef3c7',
                  border: `1px solid ${order.customer_name ? '#10b981' : '#f59e0b'}`,
                }}
              >
                <div className="flex between" style={{ alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>
                      🛵 KHÁCH GIAO HÀNG
                    </div>
                    {order.customer_name ? (
                      <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                        <div><strong>{order.customer_name}</strong> · <a href={`tel:${order.customer_phone}`} style={{ color: '#b82a1e' }}>{order.customer_phone}</a></div>
                        {order.customer_address && (
                          <div style={{ color: '#374151', wordBreak: 'break-word' }}>
                            📍 {order.customer_address}
                            {order.distance_km ? ` · ${order.distance_km} km` : ''}
                          </div>
                        )}
                        {/* Nguồn địa chỉ (2026-08-16) — cùng định nghĩa với chip ở màn Đơn online
                            (`hasSharedLocation`). Shipper cần biết TRƯỚC KHI ĐI: có ghim GPS đúng
                            nhà khách, hay chỉ có dòng chữ khách gõ (mơ hồ thì gọi hỏi trước).
                            Chưa có cả địa chỉ lẫn toạ độ (nhân viên chưa điền) thì không hiện —
                            "địa chỉ nhập tay" cho một đơn chưa có dòng địa chỉ nào là nói sai. */}
                        {(order.customer_address || hasSharedLocation(order)) && (
                          <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: hasSharedLocation(order) ? '#047857' : '#6b7280' }}>
                            {hasSharedLocation(order)
                              ? '📍 Khách chia sẻ vị trí — ghim bản đồ đúng chỗ nhà khách'
                              : '✍️ Địa chỉ nhập tay — chưa có ghim bản đồ, tìm nhà theo dòng địa chỉ'}
                          </div>
                        )}
                        {/* Nút mở bản đồ cho người đi ship — dùng chung `customerMapHref` với màn
                            Đơn hàng online: có link khách dán thì mở link đó, không thì dựng từ
                            toạ độ GPS khách chia sẻ. Đây là thứ shipper cần nhất mà bản cũ không
                            có: chỉ in địa chỉ dạng chữ, muốn dẫn đường phải tự gõ lại vào Maps. */}
                        {mapHref && (
                          <div style={{ marginTop: 4 }}>
                            <a
                              href={mapHref}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: 8,
                                border: '1px solid #b82a1e',
                                color: '#b82a1e',
                                fontWeight: 600,
                                fontSize: 13,
                                textDecoration: 'none',
                              }}
                            >
                              🗺 Mở bản đồ chỉ đường
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: '#92400e' }}>
                        Chưa có thông tin khách (không bắt buộc) — bấm "Nhập thông tin" khi cần lưu.
                      </div>
                    )}
                  </div>
                  <button
                    className="secondary"
                    onClick={() => setShowCustomerInfo(true)}
                    style={{ padding: '6px 10px', fontSize: 13, whiteSpace: 'nowrap' }}
                  >
                    {order.customer_name ? 'Sửa' : 'Nhập thông tin'}
                  </button>
                </div>
              </div>
            )}

            {/* Thông báo "N món bếp chậm · Ưu tiên" BỎ (chủ repo 2026-11-06). Ưu tiên từng món vẫn ở menu
                ⋯ của món; đồng hồ "Đã chờ" đổi màu đỏ khi quá lâu. */}
            {readyUnits > 0 && (
              <div className="drawer-slow drawer-ready" role="status">
                <span className="drawer-slow-text">
                  <Check size={20} aria-hidden="true" />
                  {readyUnits} món xong chưa mang ra
                </span>
                <button type="button" className="secondary" onClick={() => void serveAll(readyItems.map((i) => i.id))}>
                  Giao tất cả
                </button>
              </div>
            )}

            {/* Items grouped by state */}
            {order.items.length === 0 && (
              <div className="empty-state" style={{ padding: 24 }}>
                Bàn chưa gọi món nào - bấm "Gọi món" ở dưới để bắt đầu
              </div>
            )}

            {activeStates.map((st) => {
              const groups = groupItemsByState(st);
              if (groups.length === 0) return null;
              const unitCount = groups.reduce((s, g) => s + g.count, 0);
              return (
/* Mỗi vùng trạng thái là một KHUNG riêng, viền màu của chính trạng thái đó (chủ
                     quán 2026-09-08). Tiêu đề bên trong là CHIP ôm sát chữ — khung bao cả vùng,
                     còn chip chỉ ôm cái nhãn; hai thứ khác nhau, đừng gộp. */
                <div key={st} className="item-section" style={{ borderColor: `${COLOR[st]}55` }}>
                  <h2
                    className="item-section-title"
                    style={{
                      color: COLOR[st],
                      borderColor: `${COLOR[st]}66`,
                      background: `${COLOR[st]}14`,
                    }}
                  >
                    {LABEL[st]} ({unitCount})
                  </h2>
                  {st === 'READY' && unitCount > 1 && (
                    <button
                      type="button"
                      className="secondary item-section-action"
                      onClick={() => void serveAll(groups.flatMap((g) => g.ids))}
                    >
                      <Check size={18} aria-hidden="true" /> Giao tất cả ({unitCount})
                    </button>
                  )}
                  {groups.map((g) => (
                    <ItemRow
                      key={g.key}
                      item={g.rep}
                      count={g.count}
                      oldest={g.oldest}
                      doneAt={g.doneAt}
                      showCreator={creators.length > 1}
                      onChangeState={(to) => changeStateGroup(g, to)}
                      onEditQty={() => setEditQty({ group: g, target: g.count })}
                      onTogglePriority={() => togglePriorityGroup(g)}
                    />
                  ))}
                </div>
              );
            })}

            {/* Terminal states — hiện cùng style như active states để staff vẫn xem được
                món đã giao + món đã huỷ (lý do huỷ + ai gọi) ngay trên drawer.
                CANCELLED readonly hẳn; SERVED vẫn cho "Trả món" vì khách có thể
                không dùng hết những gì đã mang ra. */}
            {terminalStates.map((st) => {
              const groups = groupItemsByState(st);
              if (groups.length === 0) return null;
              const unitCount = groups.reduce((s, g) => s + g.count, 0);
              return (
<div
                  key={st}
                  className="item-section"
                  style={{ borderColor: `${COLOR[st]}55`, opacity: st === 'CANCELLED' ? 0.85 : 1 }}
                >
                  <h2
                    className="item-section-title"
                    style={{
                      color: COLOR[st],
                      borderColor: `${COLOR[st]}66`,
                      background: `${COLOR[st]}14`,
                    }}
                  >
                    {LABEL[st]} ({unitCount})
                  </h2>
                  {groups.map((g) => (
                    <ItemRow
                      key={g.key}
                      item={g.rep}
                      count={g.count}
                      oldest={g.oldest}
                      showCreator={creators.length > 1}
                      onChangeState={(to) => changeStateGroup(g, to)}
                      onEditQty={
                        st === 'CANCELLED' ? undefined : () => setEditQty({ group: g, target: g.count })
                      }
                      readonly={st === 'CANCELLED'}
                    />
                  ))}
                </div>
              );
            })}

            {/* Khối tổng tiền cuối trang đã bỏ (2026-09-08): con số đó nay nằm ngay dưới
                tên bàn ở header, hiện cùng phần tách phí ship. Cảnh báo "còn N món chưa giao sẽ
                bị huỷ" chuyển hẳn vào hộp xác nhận thanh toán — đó mới là lúc người ta cần đọc,
                và ở đó nó liệt kê từng món chứ không chỉ đếm. */}
            {isCheckedOut && (
              <div
                style={{
                  marginTop: 20,
                  padding: 14,
                  background: '#f9fafb',
                  borderRadius: 10,
                  textAlign: 'center',
                  color: '#6b7280',
                }}
              >
                ✓ Đã thanh toán lúc {new Date(order!.closed_at!).toLocaleTimeString('vi-VN')}
              </div>
            )}
          </>
        )}

        {/* THANH ĐÁY dính (2026-11-06): tổng tiền + [Gọi món] + [Thanh toán]. Trước đây Thanh
            toán là nút to nhất nằm trên ĐẦU danh sách — kể cả khi bàn còn 7 món chờ bếp — còn
            Gọi món là nút tròn "+" không chữ đè lên cột giá của món dưới cùng.
            Chỉ MỘT nút chính (đỏ): bàn chưa có món → Gọi món; có món → Thanh toán; đơn ship
            chưa rời quán → "Đã đi ship" (thanh toán bị khoá tới lúc đó, chốt 2026-08-04).
            Món chưa mang ra vẫn tính tiền — hộp Thanh toán liệt kê chúng, không hỏi thêm lớp nữa. */}
        {!loading && order && !isCheckedOut && (
          <div className="drawer-paybar">
            {hasItems && (
              <div className="drawer-paybar-total">
                <span className="muted">
                  {billableUnits} món{shipFee > 0 ? ` + ship ${fmt(shipFee)}` : ''}
                </span>
                <strong>{fmt(total)}</strong>
              </div>
            )}
            <div className="drawer-paybar-btns">
              {/* Nút CHÍNH đổi theo tình trạng bàn (2026-11-06): còn món chưa giao → "Gọi món" là chính,
                  "Thanh toán" lùi thành nút phụ; giao đủ → "Thanh toán" là chính. Hộp Thanh toán vẫn
                  liệt kê "N món chưa mang ra" trước khi thu. */}
              {!isOnline && (
                <button
                  className={hasItems && unservedUnits === 0 ? 'secondary' : ''}
                  onClick={() => setShowBulkOrder(true)}
                >
                  <Plus size={20} aria-hidden="true" /> Gọi món
                </button>
              )}
              {canMarkShipped ? (
                <button onClick={() => void markShipped()} disabled={fulfillBusy}>
                  {fulfillBusy ? 'Đang xử lý...' : 'Đã đi ship'}
                </button>
              ) : (
                hasItems && (
                  <button
                    className={unservedUnits > 0 && !isOnline ? 'secondary' : ''}
                    onClick={checkout}
                    disabled={checkoutBlockedByShip}
                  >
                    Thanh toán
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {showBulkOrder && order && (
          <BulkOrderModal
            orderId={order.id}
            tableLabel={table.name}
            tableKind={table.kind}
            // Bàn "mới tinh" = chưa có dòng món nào. Tính từ `order.items` chứ không từ
            // `hasItems` của drawer để khỏi phụ thuộc thứ tự khai biến.
            isNewTable={(order.items?.length ?? 0) === 0}
            onClose={() => setShowBulkOrder(false)}
            onSubmitted={() => {
              setShowBulkOrder(false);
              refresh();
            }}
          />
        )}

        {showNote && order && (
          <ServiceNoteModal
            orderId={order.id}
            tableLabel={table.name}
            onClose={() => setShowNote(false)}
            onDone={() => {
              setShowNote(false);
              refresh();
            }}
          />
        )}

        {editQty && order && (
          <EditQtyModal
            group={editQty.group}
            orderId={order.id}
            initialTarget={editQty.target}
            onClose={() => setEditQty(null)}
            onDone={() => {
              setEditQty(null);
              refresh();
            }}
          />
        )}

        {showTransfer && order && (
          <TransferTableModal
            order={order}
            currentTable={table}
            onClose={() => setShowTransfer(false)}
            onTransferred={() => {
              setShowTransfer(false);
              toast.push('success', 'Đã chuyển bàn');
              onTransferred?.();
              onClose();
            }}
          />
        )}

        {showCustomerInfo && order && (
          <DeliveryInfoModal
            order={order}
            onClose={() => setShowCustomerInfo(false)}
            onSaved={() => {
              setShowCustomerInfo(false);
              refresh();
            }}
          />
        )}
      </div>
    </div>
    </>
  );
}

function DeliveryInfoModal({
  order,
  onClose,
  onSaved,
}: {
  order: Order;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(order.customer_name || '');
  const [address, setAddress] = useState(order.customer_address || '');
  const [phone, setPhone] = useState(order.customer_phone || '');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    // Không field nào bắt buộc — bồi bàn có thể lưu mỗi SĐT, hoặc bỏ trống hết.
    // Chỉ check định dạng SĐT KHI có gõ, tránh lưu số sai không gọi được.
    if (phone.trim() && !/^0\d{9}$/.test(phone.trim())) {
      setErr('Số điện thoại phải có 10 số, bắt đầu bằng 0 (vd: 0901234567)');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await api.patch(`/orders/${order.id}/customer-info`, {
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
      });
      toast.push('success', 'Đã lưu thông tin khách ✓');
      onSaved();
    } catch (e) {
      setErr(extractError(e).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form className="modal" onSubmit={submit} style={{ maxWidth: 480 }}>
        <div className="flex between" style={{ marginBottom: 12, alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0 }}>🛵 Thông tin khách giao hàng</h1>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              Không bắt buộc — điền phần nào biết, để trống phần chưa có
            </div>
          </div>
          <button type="button" className="secondary" onClick={onClose} style={{ padding: '6px 10px' }}>
            ✕
          </button>
        </div>

        <div className="row">
          <label htmlFor="ci-name">Tên người nhận</label>
          <input
            id="ci-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="vd: Anh Nam"
            autoFocus
            autoComplete="name"
            maxLength={128}
          />
        </div>

        <div className="row">
          <label htmlFor="ci-phone">Số điện thoại</label>
          <input
            id="ci-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="0901234567"
            autoComplete="tel"
            maxLength={10}
            style={{ fontFamily: 'monospace' }}
          />
        </div>

        <div className="row">
          <label htmlFor="ci-address">Địa chỉ giao hàng</label>
          <textarea
            id="ci-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="vd: 123 Nguyễn Trãi, Thanh Xuân, Hà Nội"
            autoComplete="street-address"
            maxLength={255}
            rows={3}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              fontSize: 16,
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: 80,
            }}
          />
        </div>

        {err && <div className="field-error" style={{ marginBottom: 12 }}>{err}</div>}

        <div className="flex" style={{ marginTop: 8 }}>
          <button type="button" className="secondary" onClick={onClose} style={{ flex: 1 }}>
            Huỷ
          </button>
          <button type="submit" disabled={submitting} style={{ flex: 1 }}>
            {submitting && <span className="spinner" />}
            Lưu thay đổi
          </button>
        </div>
      </form>
    </div>
  );
}

/** Gợi ý bấm nhanh — những yêu cầu lặp lại nhiều nhất, đỡ phải gõ tay giữa giờ đông. */
const NOTE_PRESETS = ['Lấy bát cho khách', 'Đũa thìa cho khách', 'Nước mắm', 'Thêm đá', 'Giấy ăn'];

/** GHI CHÚ CHO BẾP — lưu như 1 dòng item (giá 0) nên bếp thấy ngay trên KDS và
 * tick chuyển trạng thái được y như món thường. */
function ServiceNoteModal({
  orderId,
  tableLabel,
  onClose,
  onDone,
}: {
  orderId: string;
  tableLabel: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [toKitchen, setToKitchen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) {
      setErr('Nhập nội dung ghi chú');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await api.post(`/orders/${orderId}/notes`, { text: content, send_to_kitchen: toKitchen });
      toast.push('success', `📝 Đã gửi ghi chú: ${content}`);
      onDone();
    } catch (e) {
      setErr(extractError(e).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form className="modal" onSubmit={submit} style={{ maxWidth: 460 }}>
        <div className="flex between" style={{ marginBottom: 12, alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20 }}>📝 Ghi chú cho bếp</h1>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{tableLabel}</div>
          </div>
          <button type="button" className="secondary" onClick={onClose} style={{ padding: '6px 10px' }}>
            ✕
          </button>
        </div>

        <div className="row">
          <label htmlFor="note-text">Cần bếp chuẩn bị gì?</label>
          <input
            id="note-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={128}
            autoFocus
            placeholder="vd: Lấy 2 bát cho khách"
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {NOTE_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              className="secondary"
              onClick={() => setText(p)}
              style={{ padding: '6px 10px', fontSize: 13, minHeight: 36 }}
            >
              {p}
            </button>
          ))}
        </div>

        <label
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 14 }}
        >
          <input
            type="checkbox"
            checked={toKitchen}
            onChange={(e) => setToKitchen(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          Báo bếp luôn (bỏ tick nếu muốn gửi cùng lần báo bếp sau)
        </label>

        {err && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{err}</div>}

        <div className="flex" style={{ gap: 8 }}>
          <button type="button" className="secondary" onClick={onClose} style={{ flex: 1, minHeight: 46 }}>
            Thôi
          </button>
          <button type="submit" disabled={submitting} style={{ flex: 2, minHeight: 46, fontWeight: 700 }}>
            {submitting ? 'Đang gửi...' : '📝 Gửi ghi chú'}
          </button>
        </div>
      </form>
    </div>
  );
}

/** SỬA SỐ LƯỢNG MÓN — dùng cho MỌI trạng thái trước khi thanh toán.
 *
 * Nhập số lượng MỚI muốn có (không phải số muốn bớt):
 * - Nhỏ hơn hiện tại → huỷ bớt phần dư (1 request cho cả N phần → nhật ký 1 dòng)
 * - Lớn hơn → gọi thêm, tự báo bếp nếu nhóm đã qua bếp
 * - 0 → bỏ hẳn món khỏi đơn
 *
 * Lý do LUÔN optional ở mọi trạng thái — bớt 5/6 phần mà bắt gõ lý do là phiền vô
 * ích. Nhật ký bàn vẫn ghi đủ ai + món + số lượng. */
const MAX_QTY = 99; // khớp @Max(99) của AddItemDto ở BE

/** State mà khách đang thực sự CHỜ → hiện đồng hồ "đã chờ N phút" cho bồi bàn.
 * Gồm cả READY: món xong mà để lâu chưa mang ra thì khách vẫn đang chờ và đồ nguội. */
const WAITING_STATES = new Set(['KITCHEN', 'COOKING', 'READY']);

function EditQtyModal({
  group,
  orderId,
  initialTarget,
  onClose,
  onDone,
}: {
  group: ItemGroup;
  orderId: string;
  /** Số lượng đặt sẵn trong ô nhập: mở từ "Sửa SL" = giữ nguyên, từ "Huỷ" = 0. */
  initialTarget: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [target, setTarget] = useState(initialTarget);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isServed = group.rep.state === 'SERVED';
  const price = group.rep.menu_item_price;
  const delta = target - group.count;
  // Chỉ món ĐÃ GIAO mới đang nằm trong tiền bàn → chỉ bớt nó mới làm bill giảm.
  // Món gọi thêm cũng chưa vào bill cho tới khi giao.
  const billDelta = delta < 0 && isServed ? price * delta : 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (target < 0 || target > MAX_QTY) {
      setErr(`Số lượng phải từ 0 đến ${MAX_QTY}`);
      return;
    }
    if (delta === 0) {
      setErr('Số lượng không thay đổi');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      if (delta < 0) {
        // Bớt |delta| phần trong nhóm. Gửi CẢ nhóm + số phần thay vì tự chọn dòng:
        // 1 dòng giờ mang nhiều phần (qty=N) nên FE không cắt được theo dòng — BE tự
        // tách dòng CANCELLED cho phần bị bớt. Lý do luôn optional — BE tự ghi mặc
        // định theo trạng thái ("Khách không dùng đến" cho món đã giao).
        await api.post('/orders/items/remove', {
          item_ids: group.ids,
          units: -delta,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        });
        toast.push(
          'success',
          `${isServed ? '↩' : '✕'} Đã bớt ${-delta}× ${group.rep.menu_item_name}` +
            (billDelta < 0 ? ` — bớt ${fmt(-billDelta)}` : ''),
        );
      } else {
        // Tăng: gọi thêm delta phần. Nếu nhóm đã qua bếp thì báo bếp luôn cho khớp
        // — để PENDING sẽ khiến bồi bàn phải bấm "báo bếp" lần nữa.
        await api.post(`/orders/${orderId}/items-bulk`, {
          items: [{ menu_item_id: group.rep.menu_item_id, qty: delta, note: group.rep.note }],
          send_to_kitchen: group.rep.state !== 'PENDING',
        });
        toast.push('success', `➕ Đã gọi thêm ${delta}× ${group.rep.menu_item_name}`);
      }
      onDone();
    } catch (e) {
      setErr(extractError(e).message);
    } finally {
      setSubmitting(false);
    }
  };

  const clamp = (v: number) => Math.min(MAX_QTY, Math.max(0, Math.trunc(v)));

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form className="modal" onSubmit={submit} style={{ maxWidth: 440 }}>
        <div className="flex between" style={{ marginBottom: 12, alignItems: 'flex-start' }}>
          <h1 style={{ margin: 0, fontSize: 20 }}>✎ Sửa số lượng</h1>
          <button type="button" className="secondary" onClick={onClose} style={{ padding: '6px 10px' }}>
            ✕
          </button>
        </div>

        <div
          style={{
            background: '#fef6f3',
            border: '1px solid #fbe4de',
            borderRadius: 8,
            padding: 12,
            marginBottom: 14,
          }}
        >
          <div style={{ fontWeight: 600 }}>{group.rep.menu_item_name}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            {LABEL[group.rep.state]} · đang có {group.count} phần · {fmt(price)}/phần
          </div>
          {group.rep.note && (
            <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', marginTop: 2 }}>
              📝 {group.rep.note}
            </div>
          )}
        </div>

        <div className="row">
          <label htmlFor="eq-qty">Sửa thành bao nhiêu phần?</label>
          <div className="flex" style={{ gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className="secondary"
              onClick={() => setTarget((q) => clamp(q - 1))}
              disabled={target <= 0}
              style={{ minWidth: 44, minHeight: 44, fontSize: 20, fontWeight: 700 }}
              aria-label="Giảm số lượng"
            >
              −
            </button>
            <input
              id="eq-qty"
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_QTY}
              value={target}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) setTarget(clamp(v));
              }}
              style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, flex: 1, minWidth: 60 }}
            />
            <button
              type="button"
              className="secondary"
              onClick={() => setTarget((q) => clamp(q + 1))}
              disabled={target >= MAX_QTY}
              style={{ minWidth: 44, minHeight: 44, fontSize: 20, fontWeight: 700 }}
              aria-label="Tăng số lượng"
            >
              +
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setTarget(0)}
              style={{ minHeight: 44, whiteSpace: 'nowrap' }}
              title="Bỏ hẳn món này khỏi đơn"
            >
              Bỏ hết
            </button>
          </div>
        </div>

        {/* Tóm tắt thay đổi — nói thẳng sẽ bớt/thêm mấy phần và tiền bàn đổi ra sao. */}
        <div
          style={{
            background: delta === 0 ? '#f9fafb' : delta < 0 ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${delta === 0 ? '#e5e7eb' : delta < 0 ? '#fecaca' : '#bbf7d0'}`,
            borderRadius: 8,
            padding: 12,
            textAlign: 'center',
            margin: '4px 0 14px',
          }}
        >
          {delta === 0 ? (
            <div style={{ fontSize: 13, color: '#6b7280' }}>Chưa thay đổi gì</div>
          ) : delta < 0 ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#dc2626' }}>
                {target === 0 ? 'Bỏ hẳn món này' : `Bớt ${-delta} phần, còn ${target}`}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                {billDelta < 0
                  ? `Tiền bàn giảm ${fmt(-billDelta)}`
                  : 'Món chưa giao nên không ảnh hưởng tiền bàn'}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#15803d' }}>
                Gọi thêm {delta} phần, thành {target}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                +{fmt(price * delta)} khi giao
                {group.rep.state !== 'PENDING' && ' · báo bếp luôn'}
              </div>
            </>
          )}
        </div>

        {/* Lý do luôn KHÔNG bắt buộc — bớt 5/6 phần mà phải gõ lý do là phiền vô ích.
            BE tự ghi mặc định theo trạng thái, nhật ký bàn vẫn có ai + món + số lượng. */}
        {delta < 0 && (
          <div className="row">
            <label htmlFor="eq-reason">Lý do (không bắt buộc)</label>
            <input
              id="eq-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={255}
              placeholder={isServed ? 'Để trống = “Khách không dùng đến”' : 'vd: Khách đổi ý...'}
            />
          </div>
        )}

        {err && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{err}</div>}

        <div className="flex" style={{ gap: 8 }}>
          <button type="button" className="secondary" onClick={onClose} style={{ flex: 1, minHeight: 46 }}>
            Thôi
          </button>
          <button
            type="submit"
            className={delta < 0 ? 'danger' : ''}
            disabled={submitting || delta === 0}
            style={{ flex: 2, minHeight: 46, fontWeight: 700 }}
          >
            {submitting ? 'Đang lưu...' : delta === 0 ? 'Lưu' : `Lưu: ${group.count} → ${target} phần`}
          </button>
        </div>
      </form>
    </div>
  );
}

function ItemRow({
  item,
  count,
  oldest,
  onChangeState,
  onEditQty,
  onTogglePriority,
  readonly,
  doneAt,
  showCreator = true,
}: {
  item: OrderItem;
  count?: number;
  /** created_at cũ nhất trong nhóm — mốc tính "đã chờ bao lâu". */
  oldest?: number;
  /** Món READY: lúc bếp báo xong (updated_at sớm nhất trong nhóm) → "Xong 6p trước". */
  doneAt?: number;
  /** false = cả bàn chỉ một người gọi, tên đã ghi một lần ở đầu drawer. */
  showCreator?: boolean;
  onChangeState: (to: string) => void;
  onEditQty?: () => void;
  onTogglePriority?: () => void;
  readonly?: boolean;
}) {
  const n = count ?? item.qty;
  // Ẩn các transition thuộc luồng bếp khỏi giao diện order — staff order chỉ
  // cần các action: Báo bếp (gọi tới bếp), Đã giao (giao tới khách), Huỷ.
  // 'COOKING' (Bắt đầu nấu) + 'READY' (Xong) là hành động của bếp ở KDS.
  const KITCHEN_ONLY = new Set(['COOKING', 'READY']);
  const next = ALLOWED[item.state].filter((s) => s !== 'CANCELLED' && !KITCHEN_ONLY.has(s));
  const cancelAllowed = ALLOWED[item.state].includes('CANCELLED');
  // Món đã mang ra bàn: nút huỷ đổi nghĩa thành "trả món" (bớt khỏi bill).
  const isServed = item.state === 'SERVED';
  /* DÒNG MÓN (2026-11-06, thay bố cục 4 nút cùng cỡ + vuốt ngang):
     - Bên phải chỉ còn nút viền "Đã giao" (việc làm nhiều nhất) + nút ⋯, cả hai cao 44px.
     - ⋯ mở menu nhỏ: Ưu tiên · Sửa số lượng · (vạch) · Huỷ/Trả món — Huỷ là việc nguy hiểm nên
       không còn nằm sẵn dưới ngón tay, và phải chọn lý do.
     - Bỏ cú vuốt ngang: không ai nhìn thấy nó, và nay ⋯ đã đủ to để bấm. */
  const [menuOpen, setMenuOpen] = useState(false);

  /** Ưu tiên chỉ có nghĩa với món còn ở hàng chờ BẾP (KITCHEN) — trạng thái khác BE từ chối. */
  const showPriority = !readonly && !!onTogglePriority && item.state === 'KITCHEN';
  const hasMenu = !readonly && (showPriority || !!onEditQty || cancelAllowed);

  /* Đồng hồ (2026-11-06): món ĐANG chờ bếp → "Đã chờ 25p" tính từ lúc gọi; món ĐÃ XONG → "Xong 6p
     trước" tính từ lúc bếp báo xong — điều cần biết là món có đang nguội không. Cam khi quá 5 phút. */
  const isReady = item.state === 'READY';
  const showAge = WAITING_STATES.has(item.state);
  const ageAt = oldest ?? item.created_at;
  const waitedMin = ageMinutes(ageAt);
  const doneMin = isReady ? ageMinutes(doneAt ?? item.updated_at ?? item.created_at) : 0;

  return (
    <div
      className="item-card"
      style={{
        borderLeft: `4px solid ${COLOR[item.state]}`,
        opacity: item.state === 'CANCELLED' ? 0.6 : 1,
      }}
    >
      {/* Dòng 1: TÊN chiếm cả bề ngang — ở 360px giá + nút bên cạnh làm tên gãy hai dòng. */}
      <div className="item-card-name">
        {item.is_priority && (
          <span className="item-priority-tag">
            <Star size={14} aria-hidden="true" /> Ưu tiên
          </span>
        )}
        {item.is_note ? (
          <>
            <StickyNote size={16} aria-hidden="true" /> {item.menu_item_name}
          </>
        ) : (
          `${n} × ${item.menu_item_name}`
        )}
      </div>

      {/* Dòng 2: đồng hồ · giá bên trái, [Đã giao][⋯] bên phải. */}
      <div className="item-card-row">
        <div className="item-card-meta">
          {isReady ? (
            <span className={`item-card-age${doneMin > 5 ? ' is-cooling' : ''}`}>
              <Clock size={14} aria-hidden="true" /> Xong {formatAge(doneMin)} trước
            </span>
          ) : showAge ? (
            <span
              className="item-card-age"
              style={{ color: ageColor(ageAt) }}
              title={`Khách gọi lúc ${new Date(ageAt).toLocaleTimeString('vi-VN')}`}
            >
              <Clock size={14} aria-hidden="true" /> Đã chờ {formatAge(waitedMin)}
            </span>
          ) : null}
          <span className="item-card-price">{item.is_note ? 'yêu cầu' : fmt(item.menu_item_price * n)}</span>
        </div>
        {!readonly && (next.length > 0 || hasMenu) && (
          <div className="item-card-btns">
            {next.map((to) => (
              <button
                key={to}
                type="button"
                className={`secondary item-act${to === 'SERVED' ? ' item-act--served' : ''}`}
                onClick={() => onChangeState(to)}
              >
                {to === 'SERVED' && <Check size={18} aria-hidden="true" />}
                {NEXT_LABEL[to]}
              </button>
            ))}
            {hasMenu && (
              <button
                type="button"
                className="item-more"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`Thao tác khác cho ${item.menu_item_name}`}
              >
                <MoreHorizontal size={20} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>

      {showCreator && item.created_by_full_name && <div className="item-card-sub">NV gọi: {item.created_by_full_name}</div>}
      {item.note && <div className="item-card-sub item-card-note">Ghi chú: {item.note}</div>}
      {item.cancelled_reason && <div className="item-card-sub item-card-cancel">Lý do: {item.cancelled_reason}</div>}

      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div className="drawer-menu item-menu" role="menu">
            {showPriority && (
              <button role="menuitem" onClick={() => { setMenuOpen(false); onTogglePriority?.(); }}>
                <Star size={20} aria-hidden="true" /> {item.is_priority ? 'Bỏ ưu tiên' : 'Ưu tiên - bếp làm trước'}
              </button>
            )}
            {/* Sửa số lượng — hiện ở MỌI trạng thái trước khi thanh toán. Không hỏi lý do. */}
            {onEditQty && (
              <button role="menuitem" onClick={() => { setMenuOpen(false); onEditQty(); }}>
                <Pencil size={20} aria-hidden="true" /> Sửa số lượng
              </button>
            )}
            {cancelAllowed && (
              <>
                {(showPriority || onEditQty) && <div className="drawer-menu-sep" role="separator" />}
                <button
                  role="menuitem"
                  className="drawer-menu-danger"
                  onClick={() => { setMenuOpen(false); onChangeState('CANCELLED'); }}
                >
                  {isServed ? <Undo2 size={20} aria-hidden="true" /> : <Trash2 size={20} aria-hidden="true" />}
                  {isServed ? 'Trả món (khách không dùng)' : 'Huỷ món'}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Hộp xác nhận huỷ kèm CHỌN LÝ DO bằng một chạm (2026-11-06). Nút xác nhận khoá tới khi đã
 *  chọn. "Khác" mở thêm ô gõ, không bắt buộc. Nút xác nhận là nút NGUY HIỂM (viền đỏ). */
function ReasonModal({ ask, onDone }: { ask: ReasonAsk; onDone: (reason: string | null) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [other, setOther] = useState('');
  const reason = picked === 'Khác' ? (other.trim() ? `Khác: ${other.trim()}` : 'Khác') : picked;
  return (
    <div
      className="modal-overlay reason-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reason-title"
      onClick={(e) => e.target === e.currentTarget && onDone(null)}
    >
      <div className="modal">
        <h2 id="reason-title" style={{ marginTop: 0 }}>{ask.title}</h2>
        <div className="reason-summary">{ask.summary}</div>
        <p className="reason-label">Chọn lý do</p>
        <div className="reason-chips">
          {ask.reasons.map((r) => (
            <button
              key={r}
              type="button"
              className="secondary reason-chip"
              aria-pressed={picked === r}
              onClick={() => setPicked(r)}
            >
              {r}
            </button>
          ))}
        </div>
        {picked === 'Khác' && (
          <input
            autoFocus
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder="Ghi thêm (không bắt buộc)"
            maxLength={200}
            style={{ width: '100%', marginTop: 8 }}
          />
        )}
        <div className="reason-actions">
          <button type="button" className="secondary" onClick={() => onDone(null)}>
            Không
          </button>
          <button type="button" className="danger" disabled={!reason} onClick={() => onDone(reason)}>
            {ask.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function TransferTableModal({
  order,
  currentTable,
  onClose,
  onTransferred,
}: {
  order: Order;
  currentTable: Table;
  onClose: () => void;
  onTransferred: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [tables, setTables] = useState<Table[]>([]);
  // Bàn còn món CHƯA THANH TOÁN — BE chặn chuyển sang, chỉ bàn trống mới nhận. Hiện ngay trong
  // danh sách chứ không để nhân viên bấm rồi mới ăn toast lỗi.
  const [busyTableIds, setBusyTableIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Dùng `/orders/open-table-ids` chứ KHÔNG đếm từ `/orders`: cùng một định nghĩa "bàn đang có
    // khách" (còn ≥1 món chưa huỷ) nhưng chỉ tốn 1 mảng id, không kéo cả payload đơn + món.
    // Bàn chỉ có đơn rỗng do tap nhầm KHÔNG nằm trong danh sách này — chuyển sang được bình
    // thường, xem `transferTable` (sửa 2026-09-15).
    Promise.all([
      api.get<{ data: { items: Table[] } }>('/tables'),
      api.get<{ data: { items: string[] } }>('/orders/open-table-ids'),
    ])
      .then(([tablesRes, openRes]) => {
        setTables(tablesRes.data.data.items.filter((t) => t.id !== currentTable.id));
        setBusyTableIds(new Set(openRes.data.data.items));
      })
      .catch((e) => toast.push('error', extractError(e).message));
  }, [currentTable.id, toast]);

  const transfer = async (destId: string, destCode: string) => {
    const ok = await confirm({
      title: 'Chuyển bàn?',
      message: `Toàn bộ order của ${currentTable.code} (${currentTable.name}) sẽ chuyển sang ${destCode}.`,
      variant: 'warning',
      confirmLabel: `Chuyển sang ${destCode}`,
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      await api.post(`/orders/${order.id}/transfer`, { dest_table_id: destId });
      onTransferred();
    } catch (e) {
      toast.push('error', extractError(e).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="flex between" style={{ marginBottom: 12 }}>
          <h1 style={{ margin: 0 }}>Chuyển bàn</h1>
          <button className="secondary" onClick={onClose} style={{ padding: '6px 10px' }}>
            ✕
          </button>
        </div>
        <p style={{ color: '#6b7280' }}>
          Chọn bàn đích — toàn bộ order sẽ chuyển sang. Chỉ chuyển được sang bàn TRỐNG: bàn chưa
          thanh toán phải thanh toán xong mới nhận.
        </p>
        <div style={{ display: 'grid', gap: 6, maxHeight: '50vh', overflowY: 'auto' }}>
          {tables.map((t) => {
            // Bàn bận vẫn HIỆN chứ không lọc khỏi danh sách: nhân viên đang tìm "bàn 15" mà nó
            // biến mất thì tưởng bàn bị xoá. Thấy dòng mờ ghi "chưa thanh toán" thì biết ngay vì
            // sao bấm không được. Nút disabled đã có sẵn `opacity: .5` + `cursor: not-allowed`
            // từ `button:disabled` trong styles.css, không cần style riêng.
            const busy = busyTableIds.has(t.id);
            return (
              <button
                key={t.id}
                disabled={submitting || busy}
                onClick={() => transfer(t.id, t.code)}
                className="secondary"
                title={busy ? `${t.name} chưa thanh toán — thanh toán bàn đó trước` : undefined}
                style={{
                  textAlign: 'left',
                  padding: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                }}
              >
                <span>
                  <code>{t.code}</code> {t.name}
                </span>
                <span style={{ color: busy ? '#b45309' : '#6b7280', fontSize: 12 }}>
                  {busy ? '🔴 chưa thanh toán' : t.kind}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
