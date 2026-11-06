// Dải "KHÁCH GỌI BẰNG QR" (chủ quán chốt 2026-10-19) — hiện ở màn Order và màn Bếp.
//
// Trước đây lượt gọi món QR chỉ nằm sau nút "📱 Gọi bằng QR" ở thanh trên màn Bếp, bấm mới xổ
// ra. Chủ quán: "chưa hợp lý" — người ra bàn xác nhận là nhân viên ORDER, mà màn Order thì
// không thấy gì. Giờ:
//   - Màn Order: dải luôn hiện khi có lượt, bấm chip → hộp món + ✓ Duyệt / ✕ Bỏ lượt. Lượt MỚI
//     kêu chuông (KHÔNG đọc tên bàn — chủ quán: giọng đọc chỉ cần ở bếp).
//   - Màn Bếp: cùng dải, bấm chip vẫn xem được món nhưng KHÔNG có nút duyệt, thay bằng câu
//     "Báo nhân viên order ra bàn xác nhận". Âm thanh / giọng đọc của bếp giữ nguyên ở KitchenPage.
//   - Chuông gọi nhân viên / xin tính tiền (🔔💵): cả hai màn bấm "Đã nghe" được.
// Server KHÔNG gác theo role (chủ quán chọn): ai đứng ở màn Order — kể cả tài khoản bếp tự cầm
// điện thoại ra bàn — vẫn duyệt được.
//
// Cùng khuôn với `StaleTableBanner`: MỘT DÒNG MỎNG, vuốt ngang, sticky, khai chiều cao qua biến
// CSS `--qr-banner-h` để dải đỏ "chưa trả", header và khung Bếp tụt xuống dưới nó. Dải này nằm
// TRÊN dải đỏ vì nó là việc phải làm NGAY (khách đang đứng chờ), dải đỏ là nhắc nhở.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { BellRing, ChevronRight, Clock, X } from 'lucide-react';
import { formatAge } from '../lib/item-age.ts';
import type { StaleUnpaid } from '../lib/stale-unpaid.ts';
import { api, extractError } from '../lib/api.ts';
import { createBell } from '../lib/bell.ts';
import { guestPendingStore } from '../lib/guest-pending.ts';
import { buildGuestCards, groupCallsByTable, type PendingPayload } from '../lib/kds-guest-cards.ts';
import { GuestRequestCards } from './GuestRequestCards.tsx';
import { useToast } from './Toast.tsx';

type Props = {
  data: PendingPayload | null;
  /** `true` = màn Order (duyệt được + kêu chuông lượt mới). `false` = màn Bếp (chỉ báo). */
  canApprove: boolean;
  /**
   * `compact` (màn Order, 2026-11-06): GỘP dải QR + dải "chưa trả" thành MỘT dòng
   * "N yêu cầu QR · N bàn chưa trả ›", bấm mở tấm danh sách từ đáy. Hai dải cũ cùng header
   * chiếm ~18% màn điện thoại mọi lúc, chip bị cắt không bấm được. Màn Bếp giữ dải cũ.
   */
  variant?: 'rail' | 'compact';
  /** Chỉ dùng ở `compact` — danh sách bàn chưa trả (cùng dữ liệu StaleTableBanner). */
  stale?: StaleUnpaid | null;
};

/**
 * Lượt đã kêu chuông, ở MỨC MODULE chứ không trong component: nhân viên đi qua lại giữa Order và
 * Sơ đồ bàn thì dải unmount/mount liên tục — giữ trong state là mỗi lần quay lại chuông réo lại
 * cho đúng những lượt đã réo rồi.
 */
const rungIds = new Set<string>();

export function GuestQrBanner({ data, canApprove, variant = 'rail', stale = null }: Props) {
  const toast = useToast();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const compact = variant === 'compact';
  const staleItems = compact ? stale?.items ?? [] : [];
  const ref = useRef<HTMLDivElement>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const bellRef = useRef<ReturnType<typeof createBell> | null>(null);
  if (bellRef.current === null) bellRef.current = createBell();

  const cards = buildGuestCards(data, Date.now());
  const calls = data?.calls ?? [];
  const tableCount = new Set([
    ...cards.map((c) => c.table_name),
    ...groupCallsByTable(calls).map((g) => g.table_name),
  ]).size;
  // Đếm theo YÊU CẦU, không theo bàn (2026-11-06): "5 bàn QR" mà có 7 chip là đọc lệch.
  const requestCount = cards.length + calls.length;
  const visible = cards.length > 0 || calls.length > 0 || staleItems.length > 0;

  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (!visible || !el) {
      root.style.removeProperty('--qr-banner-h');
      return;
    }
    const sync = () => root.style.setProperty('--qr-banner-h', `${el.offsetHeight}px`);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty('--qr-banner-h');
    };
  }, [visible]);

  // Trình duyệt chặn âm thanh tới cú chạm đầu tiên: mở khoá IM LẶNG ở thao tác đầu (cùng cơ chế
  // tự-bật của màn Đơn online). Màn Bếp không cần — nó có chuông riêng ở KitchenPage.
  useEffect(() => {
    if (!canApprove) return;
    const bell = bellRef.current;
    const tryUnlock = () => void bell?.unlock({ silent: true });
    window.addEventListener('pointerdown', tryUnlock, true);
    window.addEventListener('keydown', tryUnlock, true);
    return () => {
      window.removeEventListener('pointerdown', tryUnlock, true);
      window.removeEventListener('keydown', tryUnlock, true);
    };
  }, [canApprove]);

  useEffect(() => {
    const bell = bellRef.current;
    return () => bell?.dispose();
  }, []);

  // Chuông lượt mới — CHỈ màn Order. Chuông gọi nhân viên cũng kêu: đó chính là việc của order.
  const ids = [...cards.map((c) => c.request_id), ...calls.map((c) => c.id)].join(',');
  useEffect(() => {
    if (!canApprove || ids === '') return;
    const fresh = ids.split(',').filter((id) => !rungIds.has(id));
    if (fresh.length === 0) return;
    for (const id of fresh) rungIds.add(id);
    bellRef.current?.ring();
  }, [ids, canApprove]);

  const approve = useCallback(
    async (requestId: string) => {
      setBusyId(requestId);
      try {
        await api.post(`/table-requests/${requestId}/approve`, {});
      } catch (err) {
        // 409 ALREADY_DECIDED = người khác vừa duyệt. Câu báo TRUNG TÍNH — hai nhân viên cùng
        // bấm là chuyện bình thường, không phải sự cố.
        const msg = extractError(err).message;
        toast.push('info', /vừa được người khác/.test(msg) ? msg : 'Không duyệt được, thử lại nhé.');
      } finally {
        await guestPendingStore.reload();
        setBusyId(null);
      }
    },
    [toast],
  );

  const reject = useCallback(
    async (requestId: string, reason?: string) => {
      setBusyId(requestId);
      try {
        await api.post(`/table-requests/${requestId}/reject`, reason ? { reason } : {});
      } catch (err) {
        toast.push('error', extractError(err).message);
      } finally {
        await guestPendingStore.reload();
        setBusyId(null);
      }
    },
    [toast],
  );

  /** Nhận NHIỀU id vì chip là một BÀN: một chuyến ra bàn giải quyết mọi lời nhắn của bàn đó. */
  const ack = useCallback(
    async (callIds: string[]) => {
      if (callIds.length === 0) return;
      setBusyId(callIds[0]!);
      try {
        // Tuần tự chứ không `Promise.all`: một 409 bình thường (người khác nghe trước) không
        // được nuốt mất những lời nhắn còn lại.
        let failed = 0;
        for (const id of callIds) {
          try {
            await api.post(`/table-calls/${id}/ack`, {});
          } catch {
            failed++;
          }
        }
        if (failed === callIds.length) {
          toast.push('info', 'Những lời nhắn này vừa được người khác nghe rồi.');
        }
      } finally {
        await guestPendingStore.reload();
        setBusyId(null);
      }
    },
    [toast],
  );

  // Hết việc trong tấm → tự đóng.
  useEffect(() => {
    if (sheetOpen && !visible) setSheetOpen(false);
  }, [sheetOpen, visible]);

  if (!visible) return null;

  if (compact) {
    return (
      <>
        <div ref={ref} className="alert-bar" role="status">
          <button type="button" className="alert-bar-btn" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
            {requestCount > 0 && (
              <span className="alert-bar-qr">
                <BellRing size={18} aria-hidden="true" /> {requestCount} yêu cầu QR
              </span>
            )}
            {requestCount > 0 && staleItems.length > 0 && <span aria-hidden="true">·</span>}
            {staleItems.length > 0 && (
              <span className="alert-bar-stale">
                <Clock size={18} aria-hidden="true" /> {staleItems.length} bàn chưa trả
              </span>
            )}
            <ChevronRight size={20} aria-hidden="true" className="alert-bar-go" />
          </button>
        </div>
        {sheetOpen &&
          createPortal(
            <div
              className="alert-sheet-overlay"
              onClick={(e) => e.target === e.currentTarget && setSheetOpen(false)}
            >
              <div className="alert-sheet" role="dialog" aria-modal="true" aria-labelledby="alert-sheet-title">
                <div className="alert-sheet-head">
                  <h2 id="alert-sheet-title">Việc đang chờ</h2>
                  <button type="button" className="secondary alert-sheet-close" onClick={() => setSheetOpen(false)} aria-label="Đóng">
                    <X size={22} aria-hidden="true" />
                  </button>
                </div>
                <div className="alert-sheet-body">
                  {requestCount > 0 && (
                    <section>
                      <h3>Khách QR gọi ({requestCount})</h3>
                      <div className="alert-sheet-list">
                        <GuestRequestCards
                          cards={cards}
                          calls={calls}
                          busyId={busyId}
                          canApprove={canApprove}
                          onApprove={approve}
                          onReject={reject}
                          onAck={ack}
                          labeled
                        />
                      </div>
                    </section>
                  )}
                  {staleItems.length > 0 && (
                    <section>
                      <h3>Bàn chưa trả ({staleItems.length})</h3>
                      <div className="alert-sheet-list">
                        {staleItems.map((it) => (
                          <button
                            key={it.order_id}
                            type="button"
                            className="secondary alert-stale-row"
                            onClick={() => {
                              setSheetOpen(false);
                              navigate(`/orders?table=${encodeURIComponent(it.table_id)}`);
                            }}
                          >
                            <strong>{it.label}</strong>
                            <span className="muted">
                              {it.reason === 'done' && it.done_age_ms !== null
                                ? `xong ${formatAge(it.done_age_ms / 60_000)}`
                                : `mở ${formatAge(it.open_ms / 60_000)}`}
                            </span>
                            <ChevronRight size={20} aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )}
      </>
    );
  }

  return (
    <div ref={ref} className={`qr-banner${canApprove ? '' : ' qr-banner--kds'}`} role="alert">
      {/* Nhãn đứng yên, chỉ hàng chip trượt — vuốt tới đâu vẫn biết dải này nói chuyện gì. */}
      {/* Ngắn nhất có thể: chỗ trên dải là để dành cho chip số bàn. */}
      <span className="qr-banner-title">📱 {tableCount} bàn QR</span>
      <div className="qr-banner-list">
        <GuestRequestCards
          cards={cards}
          calls={calls}
          busyId={busyId}
          canApprove={canApprove}
          onApprove={approve}
          onReject={reject}
          onAck={ack}
        />
      </div>
    </div>
  );
}
