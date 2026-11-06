// Hộp thoại THU TIỀN (2026-09-14) — thay hộp `confirm()` cũ ở nút 💰 Thanh toán.
//
// Vì sao là component riêng chứ không nhồi thêm vào `confirm()`: hộp confirm trả về một `boolean`
// và muốn lấy giá trị ra phải đi đường `ref` (xem `misaCopiedRef` trong OrderDrawer bản cũ). Màn
// này có bốn thứ phải mang ra ngoài — hình thức thu, số tiền chuyển khoản, mã QR đã dùng, nội
// dung đã in — cộng một lần gọi mạng để lấy danh sách mã. Nhồi tất cả vào đường `ref` là mớ chỉ
// người viết nó đọc được.
//
// NGUYÊN TẮC KHÔNG ĐƯỢC PHÁ: **nút Thanh toán không bao giờ bị chặn bởi QR hay mạng.** Thu tiền
// là đường sống của quán; mã QR tải lỗi, chưa cấu hình mã nào, hay khách đổi ý trả tiền mặt —
// mọi trường hợp đó vẫn phải thu được. Mã QR là tiện ích thêm vào, không phải cửa phải qua.
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildTransferNote, buildVietQrPayload } from '@order/schemas';
import { stepBlockReason, type CheckoutStep, type PayMode } from '../lib/checkout-block.ts';
import { rejectIfTooLarge, shrinkImage } from '../lib/shrink-image.ts';
import { api, extractError } from '../lib/api.ts';
import { useToast } from './Toast.tsx';
import { Check, ChevronDown } from 'lucide-react';

/** Tài khoản QR dùng lần trước TRÊN MÁY NÀY — mở sẵn ở màn QR (chủ repo 2026-11-06, thay "luôn bắt
 *  chọn"). Tên tài khoản hiện rõ ngay dưới mã + nút Đổi, nên chọn nhầm vẫn thấy trước khi thu. */
const LAST_QR_KEY = 'qlq.lastPayQrId';
function readLastQr(): string | null {
  try { return localStorage.getItem(LAST_QR_KEY); } catch { return null; }
}
function saveLastQr(id: string) {
  try { localStorage.setItem(LAST_QR_KEY, id); } catch { /* máy chặn lưu — bỏ qua */ }
}

/** Lỗi API → câu cho người thu (2026-11-06). Trường sai → nói đúng trường; lỗi hệ thống → kèm
 *  mã để báo quản lý. Trước đây chỉ có "Dữ liệu thiếu hoặc sai định dạng" và toast đè tiêu đề. */
const FIELD_VN: Record<string, string> = {
  paid_to_account_id: 'Tài khoản nhận tiền không hợp lệ - chọn lại tài khoản ở bước quét mã',
  transfer_amount: 'Số tiền chuyển khoản không hợp lệ',
  debt_note: 'Tên khách nợ không hợp lệ',
  transfer_note: 'Nội dung chuyển khoản không hợp lệ',
  payment_photo_skip_reason: 'Lý do không chụp bill không hợp lệ',
};
function describePayError(err: unknown): string {
  const e = extractError(err) as ReturnType<typeof extractError> & { request_id?: string };
  if (e.field_errors?.length) {
    return e.field_errors.map((f) => FIELD_VN[f.field] ?? `${f.field}: ${f.message}`).join(' · ');
  }
  if (e.code === 'INTERNAL_ERROR' || e.code === 'BAD_GATEWAY' || e.code === 'BAD_RESPONSE') {
    return e.request_id
      ? `Lỗi hệ thống, báo quản lý (mã: ${e.request_id.slice(0, 8)})`
      : e.message;
  }
  return e.message;
}
import { Row, Section } from './checkout-ui.tsx';

type QrOption = {
  id: string;
  label: string;
  kind: 'BANK' | 'IMAGE';
  bank_bin: string | null;
  bank_name: string | null;
  account_no: string | null;
  account_name: string | null;
  image_url: string | null;
  /** Tiền tố ngân hàng đòi ở đầu nội dung CK (vd `SEVQR`). Thiếu nó thì cổng đối soát KHÔNG
   *  nhìn thấy giao dịch — xem `payment-code.ts`. */
  note_prefix: string | null;
};

type ItemLike = {
  id: string;
  menu_item_id: string;
  menu_item_name: string;
  menu_item_price: number;
  qty: number;
  state: string;
  note?: string | null;
  cancelled_reason?: string | null;
};

export type CheckoutResult = {
  total: number;
  auto_served_items: number;
  transfer_amount: number;
  payment_qr_label: string | null;
  /** `true` = đơn kết bằng GHI NỢ, chưa thu đồng nào (2026-09-25). */
  debt: boolean;
};

type Props = {
  orderId: string;
  table: { code: string; name: string };
  cashier: { full_name?: string | null; username?: string | null };
  /** Người đang đăng nhập có được thu chuyển khoản không. `false` = hộp thoại chỉ còn Tiền mặt. */
  canCollectTransfer: boolean;
  /** THU NỢ (2026-09-25): hộp thoại này mở cho một đơn ĐÃ GHI NỢ — gọi `/settle-debt` thay cho
   *  `/checkout`, và không có nút "Ghi nợ" (đang thu nợ mà ghi nợ tiếp là vô nghĩa). */
  settleDebt?: boolean;
  items: ItemLike[];
  itemsTotal: number;
  shipFee: number;
  onCancel: () => void;
  onDone: (res: CheckoutResult) => void;
};

/* Ba hình thức thu tiền tách bạch vì cuối ca người đếm két chỉ khớp được phần tiền mặt; `null`
   = CHƯA CHỌN, trạng thái lúc mở hộp thoại. Kiểu `PayMode` lấy từ `lib/checkout-block.ts` (khai
   báo ở đầu tệp) để luật và giao diện không lệch nhau. */

const fmt = (v: number) => `${v.toLocaleString('vi-VN')}đ`;

export function CheckoutDialog({
  orderId,
  table,
  cashier,
  items,
  itemsTotal,
  shipFee,
  canCollectTransfer,
  settleDebt = false,
  onCancel,
  onDone,
}: Props) {
  const toast = useToast();
  const total = itemsTotal + shipFee;

  /**
   * KHÔNG chọn sẵn hình thức nào (chủ quán yêu cầu 2026-09-14). Trước đây mặc định là Tiền mặt,
   * tức chỉ cần bấm Thanh toán theo quán tính là đơn được ghi "tiền mặt" — kể cả khi khách vừa
   * chuyển khoản xong. Sai kiểu đó không lộ ra ngay: nó lộ lúc đếm két cuối ca, thừa đúng bằng
   * số tiền đã về ngân hàng, và không ai nhớ bàn nào.
   *
   * Ngoại lệ: người KHÔNG được thu chuyển khoản thì chỉ còn đúng một hình thức — bắt họ chọn
   * giữa một lựa chọn duy nhất (mà hàng nút lại đang ẩn) là khoá luôn nút Thanh toán.
   */
  const [mode, setMode] = useState<PayMode | null>(canCollectTransfer ? null : 'CASH');
  const [qrOptions, setQrOptions] = useState<QrOption[]>([]);
  const [qrLoadFailed, setQrLoadFailed] = useState(false);
  // KHÔNG chọn sẵn mã nào (chủ quán chốt 2026-09-14: "luôn hỏi chọn mã nào") — nhưng danh sách
  // xếp theo thứ tự chủ quán đặt ở màn cài đặt, nên mã hay dùng vẫn nằm đầu và chỉ tốn một chạm.
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [transferInput, setTransferInput] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  /** Tên khách nợ — thứ duy nhất màn ghi nợ hỏi (D-01: nợ toàn bộ, không có số tiền để nhập). */
  const [debtNote, setDebtNote] = useState('');
  /** Ảnh bill đã đẩy lên. Đơn đã có `id` từ lúc mở bàn nên đẩy được NGAY, không phải chờ thu
   *  tiền xong — và quan trọng hơn: không chặn nút Thu tiền để chờ mạng. */
  const [photos, setPhotos] = useState<Array<{ id: string; url: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  /** Ô chọn ảnh CÓ SẴN trong máy (2026-10-20) — ô kia có `capture` nên chỉ mở được camera. */
  const galleryRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  /**
   * BỐN MÀN NỐI TIẾP (chủ quán chốt 2026-09-15), thay cho một màn cuộn dài:
   *
   *   'items' → soát bill: tổng tiền + danh sách món. MÀN MỞ RA ĐẦU TIÊN.
   *   'mode'  → "Khách trả bằng gì?" — ba nút, không gì khác.
   *   'qr'    → chìa mã cho khách quét (chỉ luồng chuyển khoản / cả hai).
   *   'bill'  → chụp bill + chốt thu tiền.
   *
   * Soát bill đứng TRƯỚC câu hỏi hình thức vì đó là trình tự thật: đọc bill cho khách nghe, khách
   * gật, LÚC ĐÓ mới hỏi trả bằng gì. Hỏi trước rồi mới bày món ra là bắt người ta trả lời khi
   * chưa biết mình đang trả cho cái gì.
   *
   * TIỀN MẶT DỪNG Ở MÀN 2: bấm "💵 Tiền mặt" là nút chính thành "Xác nhận thu tiền" ngay tại đó.
   * Đó là đường đi của phần lớn đơn trong quán — mỗi màn thêm vào là một cú chạm cho mọi bàn, mỗi
   * ngày. Người KHÔNG được thu chuyển khoản còn dừng sớm hơn, ngay ở màn soát bill: chỉ còn một
   * hình thức thì không có câu hỏi nào để hỏi.
   *
   * Vì sao tách màn thay vì cuộn: bản cũ nhồi tổng tiền, ba nút, ô nhập tiền, danh sách mã, ảnh
   * QR, chi tiết món và Misa vào cùng một khối cuộn — người thu phải vuốt tìm giữa lúc khách
   * đứng đợi, và ảnh QR (thứ phải GIƠ RA cho khách) thì nằm lấp giữa chừng.
   */
  /* 2026-11-06 (chủ repo): GỘP soát bill + "trả bằng gì" thành MỘT màn mở đầu ('mode'). Danh sách
     món thu gọn ngay dưới tổng tiền (mở sẵn nếu còn món chưa mang ra), hình thức bên dưới. Chạm
     Chuyển khoản / Cả hai là sang màn QR luôn; Tiền mặt và Ghi nợ chốt ngay tại màn này. Màn
     'items' cũ không còn được dùng. */
  const [step, setStep] = useState<CheckoutStep>('mode');
  /** Tiền khách đưa (tiền mặt) — chỉ để tính tiền thối, KHÔNG gửi lên server. */
  const [given, setGiven] = useState('');
  /** Lỗi khi chốt — hiện NGAY trong hộp thoại, trên hàng nút. */
  const [formError, setFormError] = useState<string | null>(null);
  /** Màn QR: đang mở danh sách để đổi tài khoản. */
  const [changingQr, setChangingQr] = useState(false);

  const picked = qrOptions.find((o) => o.id === pickedId) ?? null;

  /** Phần thu bằng chuyển khoản. Tiền mặt luôn là phần còn lại — không có ô nhập riêng cho nó,
   *  vì hai ô rời là hai con số có thể không cộng lại bằng tổng. */
  const transferAmount = useMemo(() => {
    if (mode === 'CASH' || mode === 'DEBT' || mode === null) return 0;
    if (mode === 'TRANSFER') return total;
    const digits = transferInput.replace(/\D/g, '');
    return Math.min(Number(digits || 0), total);
  }, [mode, transferInput, total]);

  const cashAmount = total - transferAmount;

  /** Xem `lib/checkout-block.ts` — luật nằm ngoài vì nó quyết định nút thu tiền có ăn hay không,
   *  và kiểm bằng mắt thì phải mở hộp thoại thật rồi thử đủ sáu tổ hợp. */
  //  Hỏi theo MÀN ĐANG ĐỨNG: đứng ở màn 1 mà nút mờ vì "chưa chọn mã QR" là chỉ sang một màn
  //  người ta chưa được thấy. Màn cuối vẫn kiểm trọn bộ — xem `stepBlockReason`.

  /**
   * Mã đơn 6 số để ngân hàng báo về khớp được đúng lần thu này (2026-09-22).
   *
   * `null` = chưa xin được, và đó là trạng thái HỢP LỆ chứ không phải lỗi: nội dung CK lùi về bản
   * cũ ("BAN05 LUONG THUY") và đơn này phải đối soát bằng tay. Mất đối soát tự động cho một đơn
   * còn hơn chặn một lần thu tiền — xem nguyên tắc ở đầu tệp.
   */
  const [payCode, setPayCode] = useState<string | null>(null);
  /**
   * Lý do KHÔNG chụp được bill — đường thoát duy nhất khỏi luật "ảnh bill bắt buộc" (2026-10-02).
   *
   * Rỗng = chưa dùng đường thoát. Có chữ = người thu đã bấm "Không chụp được" và gõ lý do, nút
   * chốt mở ra và lý do đi theo đơn lên server (`payment_photo_skip_reason`).
   *
   * KHÔNG tự xoá khi người ta đẩy ảnh lên sau đó: ảnh có rồi thì luật đã thoả, lý do không còn
   * được đọc tới — nhưng xoá nó đi là xoá mất thứ người dùng vừa gõ, phòng khi ảnh đẩy hỏng và
   * họ lùi về đường thoát.
   */
  const [photoSkipReason, setPhotoSkipReason] = useState('');

  /**
   * ⚠ ĐÃ GỠ: "ngân hàng xác nhận thì bỏ qua màn chụp bill" (2026-09-22 → gỡ 2026-10-02).
   *
   * Bản cũ cho đơn đã được ngân hàng báo có đi thẳng tới lúc ghi tiền, không qua bước chụp. Chủ
   * quán chốt lại: MỌI đơn chuyển khoản đều phải qua màn chụp bill, kể cả đơn trót lọt. Lý do là
   * sự NHẤT QUÁN của thao tác quầy — một luồng thu tiền lúc có lúc không có bước chụp thì người
   * thu không bao giờ thuộc, và cái bước thỉnh thoảng mới hiện ra là cái bị bấm vội nhất.
   *
   * Đừng cài lại dưới dạng "tối ưu một cú chạm": đây là quyết định có chủ ý, không phải sót.
   */

  /** Xem `lib/checkout-block.ts`. Khi màn QR trở thành màn CHỐT (đã xác thực xong), phải kiểm luật
   *  TRỌN BỘ chứ không chỉ luật của riêng màn — cùng lý do màn 'bill' vẫn gọi `checkoutBlockReason`
   *  dù hai màn trước đã kiểm: người dùng lùi lại sửa được, và state đi cùng họ. */
  const state = {
    mode,
    hasPickedQr: !!picked,
    transferAmount,
    debtNote,
    photoCount: photos.length,
    photoSkipReason,
  };
  const blockReason = stepBlockReason(step, state);
  // `picked?.note_prefix` nằm trong deps: đổi mã QR là đổi ngân hàng, mà tiền tố bắt buộc thuộc
  // về ngân hàng — không tính lại thì nội dung mang tiền tố của tài khoản vừa bỏ chọn.
  const note = useMemo(
    () => buildTransferNote(table, cashier, payCode, picked?.note_prefix),
    [table, cashier, payCode, picked?.note_prefix],
  );

  useEffect(() => {
    if (mode === 'CASH' || mode === 'DEBT' || mode === null) return;
    let alive = true;
    api
      .get<{ data: { items: QrOption[] } }>('/payment-qr')
      .then((res) => {
        if (!alive) return;
        const items = res.data.data.items;
        setQrOptions(items);
        setQrLoadFailed(false);
        // Mở sẵn tài khoản dùng lần trước (nếu còn trong danh sách của người này).
        const last = readLastQr();
        setPickedId((cur) => cur ?? (last && items.some((o) => o.id === last) ? last : null));
      })
      .catch(() => {
        // KHÔNG toast: người thu đang đứng trước khách, một thông báo đỏ ở đây chỉ làm họ hoảng.
        // Khối dưới sẽ nói rõ "không tải được danh sách mã" và họ vẫn thu tiền được.
        if (alive) setQrLoadFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [mode]);

  /**
   * Xin mã đơn khi đã chọn chuyển khoản và có số tiền.
   *
   * HOÃN 400ms: `transferAmount` đổi theo từng phím người thu gõ, và mỗi lần đổi là một lượt ghi
   * DB. Hoãn cũng để mã chỉ được xin khi con số đã đứng yên — xin theo từng phím thì bản ghi mang
   * số dở dang ("25" trên đường tới "250000").
   *
   * KHÔNG bao giờ báo lỗi ra màn: hỏng thì `payCode` giữ `null`, nội dung CK lùi về bản cũ, người
   * thu không cần biết và cũng không làm gì được với thông tin đó giữa lúc khách đứng đợi.
   */


  useEffect(() => {
    if (mode === 'CASH' || mode === null || transferAmount <= 0) {
      setPayCode(null);
      return;
    }
    let alive = true;
    const timer = setTimeout(() => {
      api
        .post<{ data: { code: string } }>('/payments/intent', {
          order_id: orderId,
          amount: transferAmount,
          account_id: picked?.id ?? null,
          // Số bàn đi vào chính mã (`BAN05ABC`) — xem `payment-code.ts`.
          table_code: table.code,
        })
        .then((res) => alive && setPayCode(res.data.data.code))
        .catch(() => alive && setPayCode(null));
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [mode, orderId, transferAmount, picked?.id]);

  /**
   * ⚠ ĐÃ GỠ: vòng hỏi ngân hàng 5 phút ở màn QR (2026-09-22 → gỡ 2026-10-02).
   *
   * Bản cũ hỏi `/payments/intent/:code` mỗi 1,5 giây trong 5 phút và bày kết quả thành ba dải
   * (xám đang hỏi · xanh tiền đã về · đỏ hết giờ). Chủ quán chốt bỏ cả ba: người thu đứng nhìn
   * một dải tự đổi màu sau lưng không giúp gì cho thao tác của họ — họ vẫn phải chụp bill, vẫn
   * phải bấm chốt — mà lại mời đứng đợi giữa lúc khách đang chờ.
   *
   * ĐỐI SOÁT KHÔNG MẤT ĐI, chỉ dời chỗ xem: `POST /payments/intent` ngay trên vẫn sinh mã đơn,
   * nội dung CK vẫn mang mã, webhook SePay vẫn ghi `PaymentIntent.paid_at`, và kết quả hiện
   * thành ✓ / ✗ ở cột "Xác thực" màn Lịch sử (`bank_verified`). Không một mắt xích nào của đối
   * soát đi qua màn này — gỡ vòng hỏi chỉ gỡ phần ĐỨNG ĐỢI TẠI QUẦY.
   */

  // Vẽ QR mỗi khi mã hoặc SỐ TIỀN đổi — số tiền nằm trong mã, nên sửa số mà không vẽ lại là chìa
  // cho khách một mã mang con số cũ.
  useEffect(() => {
    if (!picked || picked.kind !== 'BANK' || !picked.bank_bin || !picked.account_no) {
      setQrDataUrl(null);
      return;
    }
    let alive = true;
    try {
      const payload = buildVietQrPayload({
        bankBin: picked.bank_bin,
        accountNo: picked.account_no,
        amount: transferAmount,
        note,
      });
      // Nạp TRỄ thư viện vẽ QR: nó chỉ cần khi có người mở hộp thoại VÀ chọn chuyển khoản, nên
      // để nó trong bundle tải-lần-đầu là bắt mọi người — kể cả bếp, kể cả màn đăng nhập — tải
      // thêm một thư viện họ không bao giờ chạm tới.
      import('qrcode')
        .then((m) => m.default.toDataURL(payload, { width: 520, margin: 1, errorCorrectionLevel: 'M' }))
        .then((url) => alive && setQrDataUrl(url))
        .catch(() => alive && setQrDataUrl(null));
    } catch {
      // Chuỗi dựng hỏng (mã ngân hàng sai chẳng hạn) — khối QR tự ẩn, thu tiền vẫn đi tiếp.
      setQrDataUrl(null);
    }
    return () => {
      alive = false;
    };
  }, [picked, transferAmount, note]);

  const addPhotos = async (picked: FileList | null) => {
    if (!picked?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      // Thu nhỏ trước khi gửi: iPhone 48MP ra file 8-15MB, vừa vượt trần của server vừa bắt
      // người thu đứng chờ 4G đẩy hết chỗ đó lên — trong khi server nén xuống còn vài chục KB
      // ngay sau đó. Hàm này không bao giờ ném lỗi: không nén được thì trả lại file gốc.
      //
      // Rồi CHẶN NGAY Ở ĐÂY nếu vẫn quá nặng (ảnh HEIC trình duyệt không giải mã được chẳng hạn).
      // Để server từ chối thì nó trả 413 và đóng kết nối trong khi máy còn đang đẩy, axios mất
      // phản hồi và người dùng chỉ đọc được "Lỗi mạng" — xem `rejectIfTooLarge`.
      let added = 0;
      for (const f of picked) {
        const ready = await shrinkImage(f);
        const tooBig = rejectIfTooLarge(ready);
        if (tooBig) {
          toast.push('error', tooBig);
          continue;
        }
        fd.append('files', ready);
        added += 1;
      }
      if (added === 0) return;
      const res = await api.post<{ data: { items: Array<{ id: string; url: string }> } }>(
        `/orders/${orderId}/payment-photos`,
        fd,
      );
      setPhotos((prev) => [...prev, ...res.data.data.items]);
    } catch (err) {
      toast.push('error', extractError(err).message);
    } finally {
      setUploading(false);
      // Xoá value để chọn LẠI đúng tấm vừa bỏ ra cũng bắn `change`.
      if (fileRef.current) fileRef.current.value = '';
      if (galleryRef.current) galleryRef.current.value = '';
    }
  };

  const removePhoto = async (photoId: string) => {
    try {
      await api.delete(`/orders/payment-photos/${photoId}`);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      toast.push('error', extractError(err).message);
    }
  };

  /** Nút chính của màn đang đứng. CHỈ màn cuối gọi API — hai màn trước chỉ đi tiếp.
   *
   *  `mode === 'CASH'` chốt luôn tại màn 1: không có mã để chìa, không có bill để chụp, nên mọi
   *  màn sau đều rỗng. Đi qua chúng chỉ để "cho đủ bước" là bắt cả quán trả thêm một cú chạm
   *  mỗi bàn. */
  const goNext = () => {
    if (blockReason) {
      setFormError(blockReason);
      return;
    }
    if (step === 'items') {
      // Không được thu chuyển khoản → không có câu hỏi nào để hỏi, màn này là màn chốt luôn.
      if (!canCollectTransfer) submit();
      else setStep('mode');
      return;
    }
    if (step === 'mode') {
      // Tiền mặt và ghi nợ chốt luôn tại đây — không có mã để chìa, không có bill để chụp.
      if (mode === 'CASH' || mode === 'DEBT') submit();
      else setStep('qr');
      return;
    }
    // Màn QR LUÔN đi tiếp sang màn chụp bill — không còn đường tắt nào (xem ghi chú
    // "ĐÃ GỠ: ngân hàng xác nhận thì bỏ qua màn chụp bill" ở trên).
    if (step === 'qr') {
      setStep('bill');
      return;
    }
    submit();
  };

  /** Nút phụ: lùi một màn, hoặc đóng hộp thoại nếu đang ở màn đầu.
   *
   *  Lùi KHÔNG xoá thứ đã chọn (mã QR, số tiền, ảnh bill đã đẩy): người ta lùi để xem lại hoặc
   *  sửa một thứ, không phải để bắt đầu lại. Ảnh đã đẩy vẫn nằm trên server gắn với đơn — nó
   *  không phụ thuộc vào việc hộp thoại đang ở màn nào. */
  const goBack = () => {
    setFormError(null);
    if (step === 'bill') setStep('qr');
    else if (step === 'qr') setStep('mode');
    else onCancel();
  };

  /** Chữ trên nút chính — nói thẳng việc sắp xảy ra. "Xác nhận" chung chung thì người ta không
   *  biết mình đang xác nhận cái gì, mà đây là cú bấm ghi tiền vào sổ. */
  //  Màn soát bill LUÔN là "Thanh toán", kể cả với người không được thu chuyển khoản — tức kể cả
  //  khi nút đó ghi tiền luôn chứ không mở màn nào nữa. Chữ ở đây phải là chữ họ vẫn quen bấm ở
  //  nút 💰 ngoài màn bàn: người thu không biết (và không cần biết) rằng mình đang bỏ qua một màn
  //  mà đồng nghiệp có quyền hơn thì phải đi qua.
  const nextLabel =
    step === 'mode' && mode === 'DEBT'
      ? 'Xác nhận ghi nợ'
      : step === 'bill' || (step === 'mode' && mode === 'CASH')
        ? settleDebt
          ? 'Xác nhận thu nợ'
          : 'Xác nhận thu tiền'
        : 'Tiếp tục';

  const submit = async () => {
    if (blockReason) {
      setFormError(blockReason);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await api.post<{ data: CheckoutResult }>(`/orders/${orderId}/${settleDebt ? 'settle-debt' : 'checkout'}`, {
        // Ghi nợ: chỉ gửi cờ + tên khách. Không gửi cụm chuyển khoản — BE cũng bỏ qua nó.
        ...(mode === 'DEBT' ? { debt: true, debt_note: debtNote.trim() } : {}),
        ...(transferAmount > 0
          ? {
              transfer_amount: transferAmount,
              paid_to_account_id: picked?.id,
              payment_qr_label: picked?.label,
              transfer_note: note,
              // Chỉ gửi khi đơn THẬT SỰ không có ảnh: người thu có thể đã gõ lý do rồi chụp được
              // sau đó, và lúc đó đơn không có gì bất thường để ghi.
              ...(photos.length === 0 && photoSkipReason.trim()
                ? { payment_photo_skip_reason: photoSkipReason.trim() }
                : {}),
            }
          : {}),
      });
      if (transferAmount > 0 && picked) saveLastQr(picked.id);
      onDone(res.data.data);
    } catch (err) {
      setFormError(describePayError(err));
      setSubmitting(false);
    }
  };

  const servedItems = items.filter((i) => i.state === 'SERVED');
  const activeItems = items.filter((i) => !['SERVED', 'CANCELLED'].includes(i.state));
  const cancelledItems = items.filter((i) => i.state === 'CANCELLED');
  const billableUnits = items.filter((i) => i.state !== 'CANCELLED').reduce((s, i) => s + i.qty, 0);
  const servedUnits = servedItems.reduce((s, i) => s + i.qty, 0);
  const activeUnits = activeItems.reduce((s, i) => s + i.qty, 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pay-title"
      onClick={(e) => e.target === e.currentTarget && !submitting && onCancel()}
      className="vp-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(2px)',
        zIndex: 10010,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="vp-cap-90"
        style={{
          background: 'white',
          borderRadius: 14,
          maxWidth: 520,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
        }}
      >
        {/* Đầu hộp TRUNG TÍNH (2026-11-06) — bỏ nền vàng/xanh + emoji: màu cảnh báo đã nằm ở mục
            "món chưa mang ra" ngay bên dưới. */}
        <div className="pay-head">
          <h2 id="pay-title">
            {step === 'qr'
              ? `Khách quét mã - ${table.name}`
              : step === 'bill'
                ? `Xác nhận thu tiền - ${table.name}`
                : settleDebt
                  ? `Thu nợ - ${table.name}`
                  : `Thanh toán - ${table.name}`}
          </h2>
        </div>

        <div style={{ padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {step === 'mode' ? (
            /* ── MÀN ĐẦU (gộp 2026-11-06): tổng tiền → món (thu gọn) → khách trả bằng gì ── */
            <>
              {/* Tổng cần thu: nền TRUNG TÍNH — hồng + chữ đỏ trông như cảnh báo. Giữ tách phí ship
                  (đối soát tiền thu hộ shipper, M2.D-62). */}
              <div className="pay-total">
                <div className="pay-total-label">Tổng cần thu</div>
                <div className="pay-total-value">{fmt(total)}</div>
                <div className="pay-total-sub">
                  {shipFee > 0
                    ? `${servedUnits} món ${fmt(itemsTotal)} + phí ship ${fmt(shipFee)}`
                    : `${billableUnits} món`}
                </div>
              </div>

              <details className="pay-lines" open={activeUnits > 0}>
                <summary>
                  {activeUnits > 0 ? `Xem món - còn ${activeUnits} món chưa mang ra` : `Xem ${billableUnits} món`}
                  <ChevronDown size={18} aria-hidden="true" />
                </summary>
                <OrderLines
                  servedItems={servedItems}
                  activeItems={activeItems}
                  cancelledItems={cancelledItems}
                  activeUnits={activeUnits}
                />
              </details>

              <div>
                <div className="pay-q">Khách trả bằng gì?</div>
                <div className="pay-modes">
                  <ModeButton active={mode === 'CASH'} onClick={() => setMode('CASH')} label="Tiền mặt" />
                  {/* Chuyển khoản / Cả hai: chạm là SANG MÀN QR LUÔN — không cần nút "Tiếp tục". */}
                  {canCollectTransfer && (
                    <>
                      <ModeButton
                        active={mode === 'TRANSFER'}
                        onClick={() => { setMode('TRANSFER'); setFormError(null); setStep('qr'); }}
                        label="Chuyển khoản"
                      />
                      <ModeButton
                        active={mode === 'SPLIT'}
                        onClick={() => { setMode('SPLIT'); setFormError(null); setStep('qr'); }}
                        label="Cả hai"
                      />
                    </>
                  )}
                  {/* NÚT riêng, không phải ô tích (D-01): nợ là nợ toàn bộ. */}
                  {!settleDebt && (
                    <ModeButton active={mode === 'DEBT'} onClick={() => setMode('DEBT')} label="Ghi nợ" />
                  )}
                </div>
              </div>

              {/* TIỀN MẶT: khách đưa bao nhiêu → thối lại bao nhiêu (2026-11-06). Chỉ là máy tính
                  cho người thu — không gửi lên server, không chặn nút thu. */}
              {mode === 'CASH' && (() => {
                const givenNum = Number(given.replace(/\D/g, '') || 0);
                const quick = Array.from(
                  new Set([50_000, 100_000, 200_000, 500_000].map((step) => Math.ceil(total / step) * step)),
                ).filter((v) => v > total).slice(0, 3);
                return (
                  <div className="pay-cash">
                    <label htmlFor="pay-given">Khách đưa</label>
                    <input
                      id="pay-given"
                      inputMode="numeric"
                      value={given ? Number(given.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                      onChange={(e) => setGiven(e.target.value)}
                      placeholder="Nhập số tiền khách đưa"
                    />
                    <div className="pay-cash-quick">
                      <button type="button" className="secondary" onClick={() => setGiven(String(total))}>Đủ tiền</button>
                      {quick.map((v) => (
                        <button key={v} type="button" className="secondary" onClick={() => setGiven(String(v))}>
                          {v >= 1_000_000 ? `${(v / 1_000_000).toLocaleString('vi-VN')}tr` : `${v / 1000}k`}
                        </button>
                      ))}
                    </div>
                    {givenNum > 0 && (
                      <div className={`pay-change${givenNum < total ? ' is-short' : ''}`}>
                        {givenNum >= total ? `Thối lại: ${fmt(givenNum - total)}` : `Còn thiếu: ${fmt(total - givenNum)}`}
                      </div>
                    )}
                  </div>
                );
              })()}

              {mode === 'DEBT' && (
                <div>
                  <label htmlFor="pay-debt-note" style={{ fontSize: 15, fontWeight: 600 }}>
                    Ai nợ? (tên khách / ghi chú)
                  </label>
                  <input
                    id="pay-debt-note"
                    autoFocus
                    value={debtNote}
                    onChange={(e) => setDebtNote(e.target.value)}
                    maxLength={255}
                    placeholder="VD: Anh Tuấn bàn quen, 0912..."
                    style={{ width: '100%', fontSize: 17, minHeight: 48 }}
                  />
                  <div style={{ fontSize: 14, marginTop: 6, color: '#92400e' }}>
                    Bàn sẽ trống ngay. Khoản {fmt(total)} CHƯA vào doanh thu cho tới khi bấm "Thu nợ" ở màn Lịch sử
                  </div>
                </div>
              )}
            </>
          ) : step === 'qr' ? (
            /* ── MÀN 3: chìa mã cho khách quét ── */
            <>
              {/* "Cả hai" hỏi số tiền Ở ĐÂY chứ không ở màn trước: con số này nằm TRONG mã QR, nên
                  nó phải đứng cạnh cái mã mà nó thay đổi — nhập ở màn khác thì người ta không
                  thấy mã vẽ lại theo. */}
              {mode === 'SPLIT' && (
                <div>
                  <label htmlFor="pay-transfer" style={{ fontSize: 13, fontWeight: 600 }}>
                    Khách chuyển khoản bao nhiêu?
                  </label>
                  <input
                    id="pay-transfer"
                    inputMode="numeric"
                    value={transferInput ? Number(transferInput.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                    onChange={(e) => setTransferInput(e.target.value)}
                    placeholder="0"
                    style={{ width: '100%', fontSize: 20, textAlign: 'right', minHeight: 44 }}
                  />
                  <div style={{ fontSize: 14, marginTop: 6, color: '#b82a1e', fontWeight: 600 }}>
                    Còn lại thu tiền mặt: {fmt(cashAmount)}
                  </div>
                </div>
              )}
              <QrStep
                options={qrOptions}
                loadFailed={qrLoadFailed}
                pickedId={pickedId}
                onPick={(id) => { setPickedId(id); setChangingQr(false); }}
                changing={changingQr}
                onChange={() => setChangingQr(true)}
                picked={picked}
                qrDataUrl={qrDataUrl}
                transferAmount={transferAmount}
                note={note}
              />
            </>
          ) : (
            /* ── MÀN 4: chụp bill rồi chốt ── */
            <BillStep
              transferAmount={transferAmount}
              cashAmount={cashAmount}
              qrLabel={picked?.label ?? null}
              note={note}
              photos={photos}
              uploading={uploading}
              fileRef={fileRef}
              galleryRef={galleryRef}
              onPick={addPhotos}
              onRemove={removePhoto}
              skipReason={photoSkipReason}
              onSkipReason={setPhotoSkipReason}
            />
          )}
        </div>

        {formError && (
          <div className="pay-error" role="alert">{formError}</div>
        )}
        <div style={{ display: 'flex', gap: 10, padding: 14, borderTop: '1px solid #e5e7eb' }}>
          <button
            type="button"
            className="secondary"
            onClick={goBack}
            disabled={submitting}
            /* Hẹp hơn nút chính (2:1) và KHÔNG xuống dòng: chữ nút chính dài nhất là "Xác nhận thu
               tiền" — chia đôi đều thì nó gãy làm hai dòng trên điện thoại. Nút lùi chỉ là đường
               thoát, nhường chỗ cho nút người ta thật sự bấm. */
            style={{ flex: 1, minHeight: 44, whiteSpace: 'nowrap', padding: '0 8px' }}
          >
            {step === 'mode' ? 'Huỷ' : 'Quay lại'}
          </button>
          {/* CỐ Ý không dùng thuộc tính `disabled`: nút `disabled` thì trình duyệt KHÔNG bắn sự
              kiện bấm, nên nó không bao giờ nói được vì sao nó mờ — người dùng bấm vào chỗ chết
              và tự đoán. Ở đây nút vẫn nhận bấm, chỉ là bấm thì nghe lý do.
              `aria-disabled` để trình đọc màn hình vẫn hiểu đúng trạng thái.

              MỘT nút cho cả ba màn (2026-09-15) thay vì mỗi màn một nhánh JSX: chữ và việc nó
              làm đều suy ra từ `step` (xem `nextLabel` / `goNext`), nên không có đường nào để hai
              nhánh lệch nhau — bản cũ đã có hai nút và chỉ một trong hai biết tới `blockReason`. */}
          <button
            type="button"
            onClick={goNext}
            disabled={submitting}
            aria-disabled={!!blockReason}
            title={blockReason ?? undefined}
            style={{
              flex: 2,
              minHeight: 44,
              whiteSpace: 'nowrap',
              opacity: blockReason ? 0.55 : 1,
              cursor: blockReason ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? (
              <>
                <span className="spinner" />
                Đang thanh toán…
              </>
            ) : (
              nextLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Gộp các dòng cùng món thành "N×" — giống hệt hộp thoại cũ. */
function groupUnits(list: ItemLike[]): Array<{ rep: ItemLike; count: number }> {
  const m = new Map<string, { rep: ItemLike; count: number }>();
  for (const it of list) {
    const k = `${it.menu_item_id}¦${it.note ?? ''}¦${it.state}`;
    const e = m.get(k);
    if (e) e.count += it.qty;
    else m.set(k, { rep: it, count: it.qty });
  }
  return Array.from(m.values());
}

/** Kiểu dáng nằm trong `styles.css` (`.pay-modes` / `button.pay-mode`) chứ không phải style
 *  nội tuyến: nút này cần ĐỔI BỐ CỤC theo bề rộng màn hình (ngang trên máy tính, dọc trên điện
 *  thoại), mà style nội tuyến thì không viết được media query. */
function ModeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" className="pay-mode" onClick={onClick} aria-pressed={active}>
      {/* Đang chọn: ✓ + nền nhạt — không chỉ viền đỏ (dễ đọc thành "lỗi"). */}
      {active && <Check size={20} aria-hidden="true" />}
      {label}
    </button>
  );
}

/**
 * MÀN 2 — chìa mã cho khách quét (2026-09-15).
 *
 * Tách khỏi thân hộp thoại vì nó là MỘT MÀN TRỌN VẸN chứ không còn là một khối trong trang cuộn:
 * ảnh QR chiếm gần hết chiều ngang và màn hình này được GIƠ SANG cho khách, không phải để người
 * thu đọc. Đứng riêng thì không có gì khác chen vào giữa lúc đang chìa ra.
 *
 * Component THUẦN (không gọi mạng, không đọc context) — dựng lên chụp ảnh kiểm được mà không phải
 * mở cả hộp thoại rồi bấm qua màn một, cùng lệ với `BillStep`.
 */
export function QrStep({
  options,
  loadFailed,
  pickedId,
  onPick,
  picked,
  qrDataUrl,
  transferAmount,
  note,
  changing = false,
  onChange,
}: {
  options: QrOption[];
  loadFailed: boolean;
  pickedId: string | null;
  onPick: (id: string) => void;
  picked: QrOption | null;
  qrDataUrl: string | null;
  transferAmount: number;
  note: string;
  /** Đang mở danh sách để đổi tài khoản. */
  changing?: boolean;
  onChange?: () => void;
}) {
  /* MÃ QR + SỐ TIỀN LÊN ĐẦU (2026-11-06): màn này được GIƠ cho khách quét — bản trước 5 nút tài
     khoản chiếm nửa trên, mã và số tiền bị đẩy xuống phải cuộn. Tài khoản đang dùng thu thành MỘT
     dòng "TK Quán – MB Bank · Đổi" ngay dưới mã. Chưa chọn (lần đầu) hoặc bấm Đổi → hiện danh sách. */
  const showList = !picked || changing;
  return (
    <div>
      {loadFailed && (
        <div style={{ background: '#fef3c7', padding: 10, borderRadius: 8, fontSize: 14, color: '#92400e' }}>
          Không tải được danh sách mã QR. Kiểm mạng rồi thử lại. Nếu khách chưa chuyển thì quay lại
          chọn Tiền mặt vẫn thu được
        </div>
      )}

      {!loadFailed && options.length === 0 && (
        <div style={{ background: '#f3f4f6', padding: 10, borderRadius: 8, fontSize: 14, color: '#6b7280' }}>
          {/* Rỗng có hai nguồn: quán chưa có mã, HOẶC chủ quán đã ẩn hết mã với người đang thu. */}
          Không có mã QR nào cho bạn. Nhờ chủ quán thêm mã ở Cài đặt → Mã QR nhận tiền, hoặc bật mã
          cho bạn ở màn Nhân viên
        </div>
      )}

      {picked && !changing && (
        <div style={{ textAlign: 'center' }}>
          {picked.kind === 'BANK' && qrDataUrl && (
            <img src={qrDataUrl} alt="Mã QR chuyển khoản" className="pay-qr-img" />
          )}
          {picked.kind === 'IMAGE' && picked.image_url && (
            <img src={picked.image_url} alt="Mã QR" className="pay-qr-img" style={{ aspectRatio: 'auto' }} />
          )}
          {picked.kind === 'BANK' && !qrDataUrl && (
            <div style={{ fontSize: 14, color: '#b4231d' }}>
              Không dựng được mã QR cho tài khoản này - kiểm lại mã ngân hàng ở Cài đặt
            </div>
          )}
          <div className="pay-qr-amount">{fmt(transferAmount)}</div>
          {picked.kind === 'BANK' ? (
            <>
              <div className="pay-qr-acc">
                {picked.bank_name} · {picked.account_no}
                {picked.account_name ? ` · ${picked.account_name}` : ''}
              </div>
              {/* Nội dung to và rõ: khách hay gõ tay lại thay vì để app điền sẵn. */}
              <div className="pay-qr-note">{note}</div>
            </>
          ) : (
            <div style={{ color: '#92400e', fontSize: 14, marginTop: 4 }}>
              Mã ảnh không kèm được số tiền - nhắc khách gõ {fmt(transferAmount)} và nội dung “{note}”
            </div>
          )}
          {options.length > 1 && (
            <button type="button" className="secondary pay-qr-change" onClick={onChange}>
              <span>Nhận vào: <strong>{picked.label}</strong></span>
              <span className="pay-qr-change-go">Đổi <ChevronDown size={18} aria-hidden="true" /></span>
            </button>
          )}
        </div>
      )}

      {showList && options.length > 0 && (
        <>
          <div style={{ fontSize: 15, fontWeight: 600, margin: '4px 0 8px' }}>Chọn tài khoản nhận tiền</div>
          <div className="pay-qr-list">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                className="secondary"
                onClick={() => onPick(o.id)}
                aria-pressed={pickedId === o.id}
              >
                {pickedId === o.id && <Check size={18} aria-hidden="true" />}
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ⚠ ĐÃ GỠ (2026-10-02): ba dải trạng thái xác thực. Kết quả đối soát xem ở cột "Xác thực"
          màn Lịch sử. Chủ repo giữ quyết định này (2026-11-06). */}
    </div>
  );
}

/** Ba nhóm món của bill — giữ nguyên bố cục hộp thoại cũ, chỉ gom lại thành một component vì từ
 *  2026-09-15 nó xuất hiện ở HAI màn chốt khác nhau (tiền mặt chốt ở màn 1, chuyển khoản chốt ở
 *  màn bill). Chép đôi thì sẽ có ngày hai bản bill không giống nhau. */
function OrderLines({
  servedItems,
  activeItems,
  cancelledItems,
  activeUnits,
}: {
  servedItems: ItemLike[];
  activeItems: ItemLike[];
  cancelledItems: ItemLike[];
  activeUnits: number;
}) {
  return (
    <>
      {servedItems.length > 0 && (
        <Section title="✓ Đã giao (tính tiền)" color="#059669">
          {groupUnits(servedItems).map((g) => (
            <Row
              key={g.rep.id}
              left={<><strong>{g.count}×</strong> {g.rep.menu_item_name}</>}
              right={fmt(g.rep.menu_item_price * g.count)}
            />
          ))}
        </Section>
      )}

      {activeItems.length > 0 && (
        <Section title={`⚠ ${activeUnits} món CHƯA MANG RA`} color="#f59e0b" subtitle="(vẫn tính tiền)">
          {groupUnits(activeItems).map((g) => (
            <Row
              key={g.rep.id}
              left={<><strong>{g.count}×</strong> {g.rep.menu_item_name}</>}
              right={fmt(g.rep.menu_item_price * g.count)}
            />
          ))}
        </Section>
      )}

      {cancelledItems.length > 0 && (
        <Section title={`Đã huỷ (${cancelledItems.length})`} color="#6b7280" subtitle="(không tính tiền)">
          {groupUnits(cancelledItems).map((g) => (
            <Row
              key={g.rep.id}
              left={<span style={{ color: '#6b7280' }}><strong>{g.count}×</strong> {g.rep.menu_item_name}</span>}
              right={<span style={{ color: '#9ca3af', textDecoration: 'line-through' }}>{fmt(g.rep.menu_item_price * g.count)}</span>}
            />
          ))}
        </Section>
      )}
    </>
  );
}

/**
 * BƯỚC CUỐI — chụp bill (2026-09-14, chủ quán chốt).
 *
 * Đặt sau khi đã bấm Thanh toán chứ không bày sẵn từ đầu: đúng trình tự thật ngoài đời — chìa QR,
 * khách quét, khách đưa màn hình "chuyển thành công", LÚC ĐÓ mới có cái để chụp. Bày nút từ trước
 * là mời người ta chụp một màn hình chưa tồn tại.
 *
 * Ảnh là BẮT BUỘC từ 2026-10-02 (đảo lại "ảnh tuỳ chọn" của bản 2026-09-14): không có ảnh thì
 * nút "Xác nhận thu tiền" mờ — xem `checkoutBlockReason`.
 *
 * Nỗi lo của bản cũ (camera hỏng, mạng yếu, không được chặn đường thu tiền của quán) KHÔNG bị bỏ
 * qua, nó chỉ đổi hình: nút "Không chụp được" ngay dưới mở ra một ô lý do, gõ vào là đi tiếp
 * được. Tiền vẫn luôn thu được; khác là đường vòng nay để lại vết trong đơn thay vì im lặng.
 *
 * ⚠ TIỀN CHƯA ĐƯỢC GHI ở bước này — chỉ ghi khi bấm "Xác nhận thu tiền". Đóng hộp thoại giữa
 * chừng là đơn vẫn còn nguyên, chưa thu.
 *
 * `export` vì nó là component THUẦN (không gọi mạng, không đọc context) nên dựng lên kiểm bằng
 * ảnh hoặc test được mà không phải mở cả hộp thoại rồi bấm qua bước một.
 */
export function BillStep({
  transferAmount,
  cashAmount,
  qrLabel,
  note,
  photos,
  uploading,
  fileRef,
  galleryRef,
  onPick,
  onRemove,
  skipReason,
  onSkipReason,
}: {
  transferAmount: number;
  cashAmount: number;
  qrLabel: string | null;
  note: string;
  photos: Array<{ id: string; url: string }>;
  uploading: boolean;
  fileRef: React.RefObject<HTMLInputElement | null>;
  galleryRef: React.RefObject<HTMLInputElement | null>;
  onPick: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  /** Lý do không chụp được bill. Rỗng = chưa dùng đường thoát. */
  skipReason: string;
  onSkipReason: (v: string) => void;
}) {
  /* Ô lý do KHÔNG bày sẵn: bày ra là mời bỏ qua, mà mặc định phải là chụp. Nó chỉ mở khi người
     thu chủ động bấm "Không chụp được" — hoặc khi đã có chữ trong đó (lùi màn rồi quay lại). */
  const [showSkip, setShowSkip] = useState(skipReason.trim().length > 0);
  return (
    <>
      {/* Nhắc lại con số và mã đã chọn: người thu vừa rời màn QR, và đây là cơ hội cuối để phát
          hiện mình chọn nhầm tài khoản trước khi tiền được ghi vào sổ. */}
      <div style={{ background: '#e0f2fe', borderRadius: 10, padding: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#075985' }}>Khách chuyển khoản</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#075985', marginTop: 2 }}>{fmt(transferAmount)}</div>
        {qrLabel && <div style={{ fontSize: 14, color: '#0c4a6e', marginTop: 2 }}>→ {qrLabel}</div>}
        <div style={{ fontSize: 13, color: '#0c4a6e', marginTop: 4 }}>Nội dung: {note}</div>
        {cashAmount > 0 && (
          <div style={{ fontSize: 14, color: '#065f46', marginTop: 6 }}>
            + thu tiền mặt {fmt(cashAmount)}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>
          Chụp bill của khách <span style={{ color: '#b91c1c' }}>*</span>
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
          {photos.length > 0
            ? `Đã có ${photos.length} ảnh.`
            : 'Bắt buộc với đơn chuyển khoản — đây là bằng chứng khi đối soát cuối ngày.'}
        </div>

        <button
          type="button"
          className="secondary"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{ minHeight: 48, width: '100%' }}
        >
          📷 {uploading ? 'Đang tải ảnh…' : photos.length > 0 ? 'Chụp thêm' : 'Chụp bill của khách'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          hidden
          onChange={(e) => onPick(e.target.files)}
        />

        {/* Chọn ảnh CÓ SẴN (chủ quán 2026-10-20): khách gửi ảnh chụp màn hình chuyển khoản qua
            Zalo, hoặc người thu lỡ chụp bằng camera ngoài app — nút trên có `capture` nên điện
            thoại chỉ mở camera, không vào được thư viện ảnh. Ô này KHÔNG có `capture`, còn lại
            đi chung đường `onPick` (nén, chặn ảnh quá nặng, đẩy lên đơn). */}
        <button
          type="button"
          className="secondary"
          onClick={() => galleryRef.current?.click()}
          disabled={uploading}
          style={{ minHeight: 48, width: '100%', marginTop: 8 }}
        >
          🖼 Chọn ảnh có sẵn
        </button>
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => onPick(e.target.files)}
        />

        {photos.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {photos.map((p, i) => (
              <div key={p.id} style={{ position: 'relative', width: 84, height: 84 }}>
                <img
                  src={p.url}
                  alt={`Ảnh bill ${i + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <button
                  type="button"
                  aria-label={`Bỏ ảnh ${i + 1}`}
                  onClick={() => onRemove(p.id)}
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    minWidth: 26,
                    minHeight: 26,
                    padding: 0,
                    borderRadius: 999,
                    background: 'rgba(0,0,0,.6)',
                    color: 'white',
                    border: 'none',
                    fontSize: 14,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ĐƯỜNG THOÁT — chỉ hiện khi CHƯA có ảnh nào. Có ảnh rồi thì luật đã thoả, bày thêm một
            nút "không chụp được" ở đó chỉ gây hoang mang. */}
        {photos.length === 0 && (
          <div style={{ marginTop: 12 }}>
            {!showSkip ? (
              /* Nút chữ nhỏ, KHÔNG phải nút to như nút chụp: hai nút to ngang nhau là hai lựa
                 chọn ngang nhau, mà ở đây chụp mới là đường chính. */
              <button
                type="button"
                onClick={() => setShowSkip(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '6px 0',
                  color: '#6b7280',
                  fontSize: 14,
                  textDecoration: 'underline',
                }}
              >
                Không chụp được bill?
              </button>
            ) : (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 12 }}>
                <label
                  htmlFor="photo-skip-reason"
                  style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#92400e', marginBottom: 6 }}
                >
                  Vì sao không chụp được?
                </label>
                <input
                  id="photo-skip-reason"
                  type="text"
                  value={skipReason}
                  onChange={(e) => onSkipReason(e.target.value)}
                  placeholder="VD: camera hỏng, khách đã đi, mạng yếu…"
                  maxLength={255}
                  style={{ width: '100%', minHeight: 44, fontSize: 16 }}
                />
                <div style={{ fontSize: 13, color: '#92400e', marginTop: 6 }}>
                  Lý do này lưu vào đơn và hiện ở màn Lịch sử.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
