// Bulk order modal — shopping cart UX.
// Panel trái: grid menu (tap để thêm vào giỏ, tap lại tăng qty).
// Panel phải: giỏ hàng (− qty + xoá + note inline).
// Mobile <768px: stack vertical (menu trên, giỏ dưới).
// Submit 1 lần → BE create N items + auto báo bếp.
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, extractError } from '../lib/api.ts';
import { filterMenuBySearch } from '../lib/menu-search.ts';
import { pickAutoItem } from '../lib/auto-items.ts';
import { useToast } from './Toast.tsx';
import { useConfirm } from './ConfirmDialog.tsx';
import { ChevronRight, Minus, Plus, Search, StickyNote, Trash2, X } from 'lucide-react';

type MenuItem = {
  id: string;
  code: string;
  name: string;
  group: string;
  price: number;
  unit: string;
  image_url: string | null;
  is_out_of_stock: boolean;
  /** Bếp bật ở màn Quản lý menu khi món ế — món lên dải "NÊN MỜI KHÁCH" đầu lưới. */
  is_push_sale?: boolean;
};

type MenuGroup = {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  sort_order: number;
};

/** Mã tab giả cho "Nên mời" — không phải mã nhóm món thật nên lấy một chuỗi không thể trùng
 *  mã nhóm do chủ quán đặt. Nó sống chung ô state với mã nhóm để tab này loại trừ các tab kia:
 *  đang xem "Nên mời" rồi bấm "Món nướng" là chuyển hẳn, không phải lọc chồng. */
const PUSH_TAB = '__push_sale__';

function fmt(v: number) {
  return v.toLocaleString('vi-VN') + 'đ';
}

type CartLine = {
  menu_item: MenuItem;
  qty: number;
  note: string;
};

/** MỘT thẻ món trong lưới, tách riêng và bọc `memo` — KHÔNG phải để cho gọn file.
 *
 * Menu thật của quán là ~283 món và tab mặc định là "Tất cả", nên lưới này là ~2.000 phần tử
 * DOM. Cái hộp Gọi món lại nằm TRONG `OrderDrawer`, mà cả drawer lẫn `OrdersPage` phía sau đều
 * có nhịp poll 2 giây riêng — mỗi nhịp là một lượt re-render dội thẳng xuống đây. Không memo
 * thì cứ ~2 giây cả 283 thẻ dựng lại một lần, ngay giữa lúc ngón tay đang vuốt: đo trên máy
 * giả lập chậm 6× là 17,3ms mỗi lượt, quá ngân sách một khung hình 60fps (16,7ms) → rớt frame
 * đều đặn, đúng cái người dùng thấy là "vuốt bị giật". Có memo: 0,9ms.
 *
 * Vì vậy MỌI prop ở đây phải giữ nguyên identity giữa các lần render cha, nếu không memo thành
 * vô nghĩa: `line` là object trong `cart` (các hàm sửa giỏ chỉ thay đúng dòng bị đụng, dòng
 * khác giữ nguyên tham chiếu), `groupLabel` là chuỗi, còn `onAdd`/`onNote` phải là `useCallback`
 * deps rỗng. Thêm prop mới thì kiểm lại điều này trước.
 */
const MenuCard = memo(function MenuCard({
  it,
  line,
  groupLabel,
  onAdd,
  onStep,
  onNote,
}: {
  it: MenuItem;
  line: CartLine | undefined;
  groupLabel: string;
  onAdd: (item: MenuItem) => void;
  /** −1 / +1 ngay trên thẻ (2026-11-06) — trước chỉ tăng được, muốn bớt phải vào "Xem đơn". */
  onStep: (id: string, delta: number) => void;
  onNote: (id: string) => void;
}) {
  return (
    /* Thẻ món phải nằm trong một khung bọc: cả thẻ là MỘT cái nút (chạm đâu cũng +1 phần), mà
       nút −/+ và ghi chú thì không lồng vào trong nút được — chúng là nút anh em, xếp dưới thẻ. */
    /* Thẻ CAO CỐ ĐỊNH (2026-11-06): chọn món thì cụm [−] số [+] ĐÈ lên dòng giá và nút ghi chú là
       icon ở góc trên — thẻ không cao lên làm lệch hàng thẻ bên cạnh như bản trước. */
    <div className={`bulk-menu-card-wrap ${line ? 'picked' : ''}`}>
      <button
        className={`bulk-menu-card ${it.is_out_of_stock ? 'out' : ''}`}
        onClick={() => onAdd(it)}
        disabled={it.is_out_of_stock}
        aria-label={`${it.name}, ${it.is_out_of_stock ? 'hết món' : fmt(it.price)}${line ? `, đã chọn ${line.qty}` : ''}`}
      >
        {/* Ảnh món nếu có (image_url ở menu) — nhận ra món bằng mắt nhanh hơn đọc chữ. */}
        {it.image_url && <img className="thumb" src={it.image_url} alt="" loading="lazy" decoding="async" />}
        <div className="body">
          <div className="name">{it.name}</div>
          {/* Chỉ mã + đơn vị — danh mục đã nằm trên chip, ghi lại chỉ làm dòng này bị cắt. */}
          <div className="meta">
            {line?.note ? `Ghi chú: ${line.note}` : `${it.code} · ${it.unit}`}
          </div>
        </div>
        <div className="price">{it.is_out_of_stock ? 'Hết món' : fmt(it.price)}</div>
      </button>
      {line && (
        <>
          <div className="bulk-card-step">
            <button type="button" onClick={() => onStep(it.id, -1)} aria-label={`Bớt 1 ${it.name}`}>
              <Minus size={20} aria-hidden="true" />
            </button>
            <span className="qty" aria-live="polite">{line.qty}</span>
            <button type="button" onClick={() => onStep(it.id, +1)} aria-label={`Thêm 1 ${it.name}`}>
              <Plus size={20} aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            className={`bulk-note-btn ${line.note ? 'has' : ''}`}
            onClick={() => onNote(it.id)}
            aria-label={line.note ? `Sửa ghi chú cho ${it.name}: ${line.note}` : `Thêm ghi chú cho ${it.name}`}
          >
            <StickyNote size={20} aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
});

/** Món đã chọn, trả ra ngoài ở chế độ `onCollect`. Cố ý KHÔNG trả nguyên `MenuItem`: nơi nhận là
 *  hoá đơn tự do, nơi tên và giá được CHỤP LẠI và sửa được — trả cả object món sống là mời gọi
 *  chỗ đó bám ngược vào menu, đúng thứ tính năng này không được phép làm. */
export type PickedLine = { name: string; qty: number; unit_price: number; note: string };

type Props = {
  /** Đơn để báo bếp. Bỏ trống khi dùng `onCollect` — lúc đó không có đơn nào cả. */
  orderId: string;
  tableLabel: string;
  /** `dine-in` | `takeaway` | `delivery` — quyết định có gợi khăn lạnh vào giỏ hay không. */
  tableKind: string;
  /** Bàn CHƯA gọi món nào. Chỉ bàn mới tinh mới được gợi sẵn khăn lạnh. */
  isNewTable: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  /**
   * Chế độ GOM GIỎ: thay vì gọi API báo bếp, trả danh sách món đã chọn ra ngoài.
   *
   * Có để màn Hoá đơn tự do (M6) dùng đúng cái lưới chọn món mà nhân viên đã quen — chọn nhiều
   * món một lượt, tap tăng số phần, ghi chú ngay trên thẻ. Viết một lưới thứ hai cho giống thì
   * hai lưới sẽ khác nhau dần, và "giống màn order" là cả yêu cầu của chủ quán.
   *
   * Không truyền: mọi thứ chạy y như cũ.
   */
  onCollect?: (lines: PickedLine[]) => void;
};

export function BulkOrderModal({
  orderId,
  tableLabel,
  tableKind,
  isNewTable,
  onClose,
  onSubmitted,
  onCollect,
}: Props) {
  const toast = useToast();
  const confirm = useConfirm();
  /** Món tự bỏ vào giỏ lúc mở (khăn lạnh) — đóng hộp khi giỏ CHỈ có đúng món đó, chưa ai đụng,
   *  thì không hỏi "bỏ món?" (người ta chưa chọn gì cả). */
  const autoRef = useRef<{ id: string; qty: number } | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [groupList, setGroupList] = useState<MenuGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<string>('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Map<string, CartLine>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  /** Món đang mở ô ghi chú NGAY TRÊN LƯỚI (id món). Tách khỏi `editingNote` của giỏ
      để hai đường sửa ghi chú không giành nhau ô nhập. */
  const [noteFor, setNoteFor] = useState<string | null>(null);
  /* Con trỏ phải quay lại đúng ô này sau mỗi lần tap món — nếu không, bàn phím điện thoại
     tụt xuống và nhân viên phải bấm vào ô mới gõ được món kế. */
  const searchRef = useRef<HTMLInputElement>(null);
  /* Chữ đang gõ, đọc qua ref chứ không đọc thẳng biến `search` trong `addToCart`. Đọc thẳng
     thì `search` phải nằm trong deps của `useCallback`, gõ một chữ là callback đổi identity
     và toàn bộ `MenuCard` memo hoá re-render — đúng thứ vừa bỏ công tránh. */
  const searchValRef = useRef(search);
  searchValRef.current = search;

  useEffect(() => {
    Promise.all([
      // page_size=2000 → lấy hết menu 1 lần (default BE chỉ 200, không đủ với quán
      // có nhiều món). Order picker không phân trang trong UI.
      api.get<{ data: { items: MenuItem[] } }>('/menu?page_size=2000'),
      api.get<{ data: { items: MenuGroup[] } }>('/menu-groups'),
    ])
      .then(([menuRes, groupRes]) => {
        const items = menuRes.data.data.items;
        setMenu(items);
        setGroupList(groupRes.data.data.items);
        /* Bàn tại chỗ MỚI TINH → bỏ sẵn khăn lạnh vào giỏ (chủ quán 2026-09-08). Ở GIỎ chứ
           không thêm thẳng vào đơn: nhân viên còn sửa số lượng hoặc bấm 🗑 bỏ đi trước khi
           Báo bếp — vào đơn rồi thì muốn bỏ phải đi huỷ món, đụng cả bếp lẫn tiền.
           Đặt trong `.then` của lần nạp menu, không phải effect riêng: phải có menu mới dò được
           tên món, và làm đúng một lần lúc mở màn. */
        const auto = pickAutoItem(tableKind, isNewTable, items);
        if (auto) {
          autoRef.current = { id: auto.item.id, qty: auto.qty };
          setCart((prev) => {
            if (prev.has(auto.item.id)) return prev; // không đè lên thứ người ta đã tự chọn
            const next = new Map(prev);
            next.set(auto.item.id, { menu_item: auto.item, qty: auto.qty, note: '' });
            return next;
          });
        }
      })
      .catch((err) => toast.push('error', extractError(err).message))
      .finally(() => setLoading(false));
  }, [toast]);

  // Lookup helpers — dynamic groups (sau khi import file user có tới 30+ nhóm tự tạo)
  const groupMap = useMemo(() => new Map(groupList.map((g) => [g.code, g])), [groupList]);
  const labelOf = useCallback(
    (code: string): string => {
      const g = groupMap.get(code);
      if (!g) return code;
      return g.icon ? `${g.icon} ${g.name}` : g.name;
    },
    [groupMap],
  );

  // Tìm kiếm: không dấu + viết tắt ('ktl' → 'Khoai tây lắc'), xếp theo độ khớp.
  // Logic ở lib/menu-search.ts để MenuPickerModal dùng chung.
  //
  // `useMemo` chứ không tính trần: đây là lọc + xếp hạng trên CẢ menu (~283 món của quán), mà
  // hộp này re-render theo nhịp poll 2 giây của `OrderDrawer` bọc ngoài — tính lại mỗi nhịp là
  // tính lại một thứ không hề đổi. Deps đúng bằng 3 thứ thực sự quyết định kết quả.
  const filtered = useMemo(
    () => filterMenuBySearch(
      menu.filter((it) => {
        if (group === PUSH_TAB) return !!it.is_push_sale && !it.is_out_of_stock;
        return !group || it.group === group;
      }),
      search,
    ),
    [menu, group, search],
  );

  /* Số trên chip danh mục ĐI THEO kết quả tìm (2026-11-06) — trước "Tất cả (50)" đứng yên dù
     đang tìm ra 0 món. Không tìm thì chỉ "Tất cả" mang số (như cũ); đang tìm thì chip nào cũng
     mang số, chip 0 món mờ đi để mắt khỏi phải bấm thử. */
  const searchCounts = useMemo(() => {
    const found = filterMenuBySearch(menu, search);
    const byGroup = new Map<string, number>();
    let push = 0;
    for (const it of found) {
      byGroup.set(it.group, (byGroup.get(it.group) ?? 0) + 1);
      if (it.is_push_sale && !it.is_out_of_stock) push++;
    }
    return { all: found.length, push, byGroup };
  }, [menu, search]);
  const searching = search.trim().length > 0;

  /* Đếm món bếp đang đẩy bán — quyết định tab "Nên mời" có hiện hay không, và hiện số mấy.
     Món vừa bị báo hết thì BE đã tự tắt cờ, nhưng lọc thêm `is_out_of_stock` ở đây để một
     nhịp poll chậm không khiến ai mời hụt một món bếp vừa báo không làm được. */
  const pushCount = useMemo(
    () => menu.filter((it) => it.is_push_sale && !it.is_out_of_stock).length,
    [menu],
  );

  /* 'Tất cả' + tab "Nên mời" (chỉ khi bếp đang đẩy món nào) + tất cả nhóm động
     (sort_order ASC, đã sort ở BE).
     Tab "Nên mời" đứng NGAY SAU 'Tất cả' chứ không xếp cuối: quán có ~25 nhóm, hàng tab cuộn
     ngang, nhét cuối là nó nằm ngoài màn hình và không ai biết nó tồn tại. */
  const groupCodes = [
    '',
    ...(pushCount > 0 ? [PUSH_TAB] : []),
    ...groupList.map((g) => g.code),
  ];

  /* Mọi hàm sửa giỏ đều `useCallback` deps RỖNG — chúng là prop của `MenuCard` (memo) và của
     `CartLineList`. Chỉ cần một hàm đổi identity mỗi render là memo mất tác dụng hoàn toàn.
     Làm được deps rỗng vì bên trong chỉ đụng `setCart` dạng hàm (React đảm bảo ổn định) và
     hai cái ref — không hàm nào đọc state trực tiếp. Giữ nguyên tính chất đó khi sửa sau này. */
  const addToCart = useCallback((item: MenuItem) => {
    if (item.is_out_of_stock) return;
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(item.id);
      if (existing) {
        next.set(item.id, { ...existing, qty: Math.min(99, existing.qty + 1) });
      } else {
        next.set(item.id, { menu_item: item, qty: 1, note: '' });
      }
      return next;
    });
    /* Chọn xong thì GIỮ NGUYÊN chữ đang gõ, nhưng BÔI ĐEN sẵn (chủ quán 2026-09-19, sửa lại
       lần đầu làm xoá trắng). Xoá trắng nghe thì tiện nhưng nó cuốn luôn danh sách đang lọc:
       gọi 2 phần chân gà chiên mắm là phải gõ lại y hệt từ đầu. Giữ chữ thì thẻ món vẫn nằm
       đó, tap phát nữa là badge lên 2 — mà vẫn không phải xoá tay, vì chữ đã bôi đen: gõ chữ
       đầu tiên của món kế là chữ cũ tự bị thay. Muốn xoá hẳn thì có nút ✕ trong ô tìm.
       focus() giữ bàn phím khỏi tụt sau khi tay chạm vào thẻ món.
       Chỉ đụng khi đang có chữ: đang chọn theo danh mục thì không có gì để bôi đen, và bật
       bàn phím lúc đó chỉ tổ che mất danh sách món. */
    if (searchValRef.current) {
      searchRef.current?.focus();
      searchRef.current?.select();
    }
  }, []);

  const updateQty = useCallback((id: string, delta: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      const line = next.get(id);
      if (!line) return prev;
      const newQty = line.qty + delta;
      if (newQty <= 0) {
        next.delete(id);
      } else if (newQty <= 99) {
        next.set(id, { ...line, qty: newQty });
      }
      return next;
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const setNote = useCallback((id: string, note: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const line = next.get(id);
      if (!line) return prev;
      next.set(id, { ...line, note });
      return next;
    });
  }, []);

  /** Mở ô ghi chú từ lưới. Tách ra thành callback ổn định vì là prop của `MenuCard` (memo). */
  const openNoteFor = useCallback((id: string) => setNoteFor(id), []);

  const noteLine = noteFor ? cart.get(noteFor) ?? null : null;
  const cartLines = Array.from(cart.values());
  const total = cartLines.reduce((s, l) => s + l.menu_item.price * l.qty, 0);
  const totalQty = cartLines.reduce((s, l) => s + l.qty, 0);

  /* Đóng hộp mà giỏ còn món → HỎI (2026-11-06). Trước bấm ✕ (hoặc chạm ra ngoài) là mất sạch
     món đang chọn, không một lời cảnh báo. */
  const requestClose = async () => {
    const auto = autoRef.current;
    const onlyUntouchedAuto =
      cartLines.length === 1 &&
      !!auto &&
      cartLines[0].menu_item.id === auto.id &&
      cartLines[0].qty === auto.qty &&
      !cartLines[0].note;
    if (cartLines.length === 0 || onlyUntouchedAuto) {
      onClose();
      return;
    }
    const ok = await confirm({
      title: `Bỏ ${totalQty} món ${onCollect ? 'chưa thêm vào hoá đơn' : 'chưa báo bếp'}?`,
      message: onCollect
        ? 'Các món đang chọn sẽ mất'
        : 'Các món đang chọn sẽ mất - bếp chưa nhận được món nào',
      confirmLabel: 'Bỏ món',
      cancelLabel: 'Ở lại',
      variant: 'danger',
    });
    if (ok) onClose();
  };

  /* Xoá món cuối trong tấm "Xem đơn" → chỉ quay về danh sách món (2026-11-06), không đóng luôn
     hộp Gọi món. */
  useEffect(() => {
    if (mobileCartOpen && cart.size === 0) setMobileCartOpen(false);
  }, [mobileCartOpen, cart]);

  const clearAll = async () => {
    const ok = await confirm({
      title: `Xoá hết ${totalQty} món đã chọn?`,
      message: 'Giỏ sẽ trống - bạn chọn lại từ đầu',
      confirmLabel: 'Xoá hết',
      cancelLabel: 'Không',
      variant: 'danger',
    });
    if (ok) setCart(new Map());
  };

  const submit = async () => {
    if (cartLines.length === 0) {
      toast.push('error', 'Giỏ hàng trống');
      return;
    }
    // Chế độ gom giỏ: không có đơn nào để báo bếp, chỉ đưa món ra ngoài rồi đóng.
    if (onCollect) {
      onCollect(
        cartLines.map((l) => ({
          name: l.menu_item.name,
          qty: l.qty,
          unit_price: l.menu_item.price,
          note: l.note.trim(),
        })),
      );
      setMobileCartOpen(false);
      return;
    }
    setSubmitting(true);
    try {
      await api.post<{ data: { count: number; state: string } }>(
        `/orders/${orderId}/items-bulk`,
        {
          items: cartLines.map((l) => ({
            menu_item_id: l.menu_item.id,
            qty: l.qty,
            note: l.note.trim() || null,
          })),
          send_to_kitchen: true, // báo bếp luôn — bếp xử lý ngay
        },
      );
      toast.push('success', `Đã báo bếp ${cartLines.length} món (${totalQty} phần) — ${fmt(total)}`);
      // KHÔNG push notificationStore — readyNotifier (polling) sẽ tự emit NewOrder cho bếp.
      // Order staff vừa gọi món rồi không cần notification cho chính mình.
      setMobileCartOpen(false);
      onSubmitted();
    } catch (e) {
      toast.push('error', extractError(e).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-title"
      onClick={(e) => e.target === e.currentTarget && void requestClose()}
    >
      <style>{`
        /* Điện thoại: hộp cao CỐ ĐỊNH (2026-09-19). Trước đây chỉ có max-height nên hộp co
           theo số món còn lại — lọc còn 2 món là header với thanh cam nhảy vào giữa màn, gõ
           thêm một chữ là chúng nhảy tiếp, tap trượt sang món khác.
           dvh chứ không phải vh: trên Safari iOS, vh tính theo màn hình lúc thanh địa chỉ đã
           thu lại, nên đáy hộp (thanh cam) bị thanh địa chỉ che. Dòng vh ngay trên giữ làm dự
           phòng cho máy cũ chưa hiểu dvh — trình duyệt không hiểu sẽ bỏ qua dòng sau.
           Máy tính vẫn co theo nội dung như cũ (override ở khối desktop cuối file). */
        .bulk-container {
          background: white;
          width: 100%;
          max-width: 1100px;
          /* Điện thoại: TOÀN MÀN (2026-11-06) như drawer bàn — 95dvh để lộ một dải đầu drawer
             phía trên, trông như hai lớp popup chồng nhau. */
          height: 100vh;
          height: 100dvh;
          max-height: 100vh;
          max-height: 100dvh;
          border-radius: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          /* Mốc neo cho .bulk-mobile-bar (position: absolute). Thiếu dòng này thì thanh cam
             neo vào VIEWPORT — hộp thấp hơn màn là thanh cam rơi ra ngoài đáy hộp. */
          position: relative;
        }
        .bulk-header {
          padding: calc(8px + env(safe-area-inset-top, 0px)) 12px 8px 18px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .bulk-header h1 { margin: 0; font-size: 18px; }
        .bulk-container button.bulk-icon-btn,
        .bulk-mobile-sheet button.bulk-icon-btn {
          width: 48px; min-width: 48px; height: 48px; padding: 0;
          display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto;
        }
        .bulk-body {
          display: grid;
          grid-template-columns: 1fr;
          flex: 1;
          overflow: hidden;
          /* Mặc định flex/grid item không co nhỏ hơn nội dung: thiếu min-height:0 thì cả cột
             món đẩy hộp dài ra, vùng cuộn nằm ở đâu không ai biết. */
          min-height: 0;
        }
        @media (min-width: 768px) {
          .bulk-body { grid-template-columns: 1.4fr 1fr; }
        }
        .bulk-menu-panel {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-height: 0;  /* như .bulk-body — để .bulk-menu-grid mới thực sự là chỗ cuộn */
        }
        @media (min-width: 768px) {
          .bulk-menu-panel { border-right: 1px solid #e5e7eb; }
        }
        /* Mobile sticky bar — base mobile-first: visible mặc định. Desktop override bên dưới. */
        .bulk-mobile-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid #e5e7eb;
          padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
          display: flex;
          gap: 8px;
          align-items: stretch;
          z-index: 5;
          box-shadow: 0 -4px 16px rgba(0,0,0,0.08);
        }
        .bulk-mobile-bar .submit {
          flex: 1;
          background: #b82a1e;
          color: white;
          font-weight: 600;
          padding: 10px 14px;
          font-size: 16px;
          min-height: 56px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          display: flex;
          /* NGANG chứ không phải dọc: badge đếm đứng cạnh chữ chứ không đè lên trên đầu chữ.
             Trước đây là column vì nút từng có hai dòng chữ, giờ chỉ còn một nhãn. */
          flex-direction: row;
          gap: 10px;
          align-items: center;
          justify-content: space-between;
          line-height: 1.1;
        }
        .bulk-mobile-bar .bar-sum { display: inline-flex; align-items: center; gap: 10px; }
        .bulk-mobile-bar .bar-go { display: inline-flex; align-items: center; gap: 2px; }
        /* Badge đếm số phần đang chọn — trắng trên nền cam để đọc được mà không cần nhìn kỹ. */
        .bulk-mobile-bar .submit .bar-count {
          background: white;
          color: #8f1d14;
          font-size: 15px;
          font-weight: 600;
          min-width: 28px;
          height: 28px;
          padding: 0 8px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          animation: bulk-count-pop 0.22s ease-out;
        }
        @keyframes bulk-count-pop {
          0% { transform: scale(0.6); }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        .bulk-mobile-bar .submit:disabled {
          background: #d1d5db;
          color: #9ca3af;
          cursor: not-allowed;
        }
        /* Mobile cart sheet — slide từ dưới lên */
        .bulk-mobile-sheet-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 10000;
          display: flex;
          align-items: flex-end;
          animation: bulk-fadein 0.15s ease-out;
        }
        @keyframes bulk-fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        /* Cao BẰNG hộp Gọi món (95dvh) — trước đây 85vh, tấm giỏ thấp hơn nền phía sau nên
           mỗi lần mở/đóng cả màn nhảy một nấc. dvh vì Safari iOS, vh giữ cho máy cũ. */
        .bulk-mobile-sheet {
          background: white;
          width: 100%;
          height: 100vh;
          height: 100dvh;
          max-height: 100vh;
          max-height: 100dvh;
          border-radius: 0;
          display: flex;
          flex-direction: column;
          animation: bulk-slideup 0.2s ease-out;
        }
        @keyframes bulk-slideup {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        /* Đầu tấm giỏ ĐỨNG YÊN: tên bàn, số món và TỔNG TIỀN. Tiền dọn lên đây vì trước
           nó nằm ở chân tấm, giỏ dài là phải cuộn hết mới thấy tổng. Hàng nút [+][Báo bếp]
           thì GIỮ NGUYÊN ở chân tấm (chỉ đạo chủ quán 2026-09-21) — đã thử đưa lên trên
           cùng tổng tiền và phải trả về. flex:0 0 auto để header không bị danh sách ép co. */
        .bulk-mobile-sheet-header {
          padding: 14px 16px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 0 0 auto;
          background: white;
        }
        .bulk-sheet-head-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .bulk-mobile-sheet-header .bulk-total-row { margin-bottom: 0; }
        /* Tên bàn cùng màu xanh với đầu hộp Gọi món để đọc lướt là khớp được hai màn. */
        .bulk-sheet-table { color: #b82a1e; font-weight: 700; }
        .bulk-mobile-sheet-header h2 {
          margin: 0;
          font-size: 17px;
          min-width: 0;      /* cho nhãn co lại thay vì đẩy 'Xoá hết' và ✕ xuống dòng */
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bulk-mobile-sheet-body {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          background: #f9fafb;
        }
        /* Chân tấm ĐỨNG YÊN ở đáy: [+ gọi thêm] và [Báo bếp] ở nguyên chỗ cũ — ngón cái
           cầm điện thoại với tới đáy, còn đầu tấm thì để soát bàn và tổng tiền. */
        .bulk-mobile-sheet-footer {
          padding: 12px 14px calc(12px + env(safe-area-inset-bottom, 0px));
          background: white;
          border-top: 1px solid #e5e7eb;
          flex: 0 0 auto;
        }
        .bulk-sheet-handle {
          width: 40px;
          height: 4px;
          background: #d1d5db;
          border-radius: 2px;
          margin: 6px auto 0;
        }
        .bulk-menu-toolbar {
          flex: 0 0 auto;  /* dính trên: không co lại khi danh sách món dài */
          padding: 10px 12px;
          background: white;
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-bottom: 1px solid #f3f4f6;
        }
        .bulk-search-wrap {
          position: relative;
          display: flex;
        }
        .bulk-search-wrap input {
          width: 100%;
          padding-left: 42px;   /* chừa chỗ cho kính lúp */
          padding-right: 48px;  /* chừa chỗ cho nút ✕, chữ dài không chui xuống dưới nút */
        }
        .bulk-search-wrap input::-webkit-search-cancel-button { display: none; }
        .bulk-search-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          color: #9ca3af; pointer-events: none;
        }
        /* Viết button.bulk-search-clear chứ không phải class trần .bulk-search-clear: rule
           'button' trần trong styles.css có màu nền riêng, class trần thua nó độ ưu tiên.
           (Không dùng dấu backtick trong khối này — cả khối CSS nằm trong một template
           literal, một dấu backtick lạc vào là cắt đứt chuỗi, cả file hỏng cú pháp.) */
        button.bulk-search-clear {
          position: absolute;
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
          width: 44px;
          min-height: 44px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: #6b7280;
          font-size: 16px;
          line-height: 1;
          cursor: pointer;
        }
        /* Hàng chip cuộn ngang: ẨN thanh cuộn (2026-11-06 — thanh xám to lộ ra) và mờ dần mép
           phải để báo "còn nữa, vuốt tiếp" thay cho chip bị cắt cụt giữa chữ. */
        .bulk-menu-tabs {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 32px), transparent);
          mask-image: linear-gradient(to right, #000 calc(100% - 32px), transparent);
          padding-right: 28px;
        }
        .bulk-menu-tabs::-webkit-scrollbar { display: none; }
        .bulk-menu-tabs button {
          padding: 6px 14px;
          font-size: 15px;
          white-space: nowrap;
          min-height: 44px;
          flex: 0 0 auto;
        }
        .bulk-menu-tabs button.zero:not([aria-pressed="true"]) { opacity: 0.5; }
        /* ─── Tab "Nên mời" ──────────────────────────────────────────────────
           Tab của món bếp đang đẩy bán. Tô CAM ở cả hai trạng thái chọn/không chọn —
           các tab nhóm khác đều xanh-xám như nhau, nên màu khác là thứ duy nhất kéo
           được mắt nhân viên sang nó giữa một hàng 25 tab cuộn ngang.
           Viết button.bulk-tab-push chứ không viết trần: .secondary trong styles.css có
           cùng độ ưu tiên và sẽ đè mất màu nền của tab chưa chọn. */
        button.bulk-tab-push {
          background: #f59e0b;
          border-color: #f59e0b;
          color: #1f2937;
          font-weight: 600;
        }
        button.bulk-tab-push.secondary {
          background: #fffbeb;
          border-color: #f59e0b;
          color: #92400e;
        }
        .bulk-menu-grid {
          flex: 1;
          overflow-y: auto;
          padding: 10px 12px 96px;  /* mobile-first: chừa space cho sticky bar; desktop reset */
          display: grid;
          gap: 8px;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          /* Hàng grid tự co theo nội dung, KHÔNG chia nhau chỗ trống. Mặc định của grid là
             stretch: từ lúc hộp cao cố định (2026-09-19), lọc còn 2 món là hai thẻ đó kéo dài
             hết màn, giá nằm tít dưới đáy. */
          align-content: start;
          /* Thẻ đã chọn cao hơn (có −/+ và ghi chú) — thẻ cạnh nó giữ chiều cao của mình. */
          align-items: start;
        }
        /* Khung bọc thẻ món — chỗ neo cho nút ghi chú (thẻ là <button>, không lồng nút vào được). */
        /* content-visibility KHÔNG phải tinh chỉnh vặt — nó là thứ chữa cú "tap món xong đơ
           một nhịp" (2026-09-21).
           Tap một món làm thẻ đó mọc thêm badge số lượng + nút Ghi chú và đổi class 'noted'.
           Chỉ MỘT thẻ đổi, và React cũng chỉ render đúng một thẻ (đã memo) — nhưng trình duyệt
           thì tính lại layout cho CẢ lưới 283 thẻ, vì mọi thẻ đều là grid item có kích thước
           theo nội dung. Đo được (Chrome headless, CPU giả lập chậm 6×): React 4,3ms nhưng
           layout 48,1ms. Người dùng thấy là "bấm xong khựng một lúc".
           content-visibility:auto cho trình duyệt BỎ QUA hẳn layout của thẻ đang nằm ngoài tầm
           nhìn → 48,1ms còn 13,1ms. contain-intrinsic-size giữ chỗ chiều cao thay cho thẻ chưa
           vẽ (102px là chiều cao thật, đo tại chỗ); có từ khoá 'auto' thì sau lần vẽ đầu trình
           duyệt nhớ kích thước thật nên thanh cuộn không nhảy.
           Đã thử và LOẠI: 'contain: layout style' một mình (49→43,6ms, gần như vô ích) và
           'grid-auto-rows: 102px' (49→42,7ms) — chi phí nằm ở layout TỪNG THẺ chứ không ở việc
           chia hàng của grid.
           LƯU Ý: Safari chỉ hiểu từ bản 18. iPhone cũ hơn bỏ qua dòng này — không vỡ gì, nhưng
           cũng không nhanh lên. Máy cũ mà vẫn khựng thì phải cắt số thẻ render (phân trang /
           virtualize), CSS không làm được nữa.
           KHÔNG dùng dấu backtick trong khối chú thích này: cả khối style nằm trong một template
           literal, một dấu backtick là đóng chuỗi sớm và vỡ build. */
        .bulk-menu-card-wrap {
          position: relative;
          display: flex;
          flex-direction: column;
          contain: layout style;
          content-visibility: auto;
          contain-intrinsic-size: auto 128px;
        }
        .bulk-menu-card-wrap > .bulk-menu-card { flex: 1 1 auto; min-width: 0; }
        /* Món đã chọn: viền đỏ nhạt; cụm [−] số [+] nằm ĐÈ lên dòng giá (đáy thẻ), nút ghi chú
           là icon ở góc trên phải. Thẻ không đổi chiều cao. */
        .bulk-menu-card-wrap.picked > .bulk-menu-card { border-color: #cf3323; background: #fef6f3; }
        .bulk-menu-card-wrap.picked > .bulk-menu-card .name { padding-right: 40px; }
        .bulk-menu-card-wrap.picked > .bulk-menu-card .price { visibility: hidden; }
        .bulk-card-step {
          position: absolute;
          left: 6px;
          right: 6px;
          bottom: 6px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 2;
        }
        .bulk-card-step button {
          width: 44px; min-width: 44px; height: 44px; min-height: 44px; padding: 0;
          display: inline-flex; align-items: center; justify-content: center;
          background: white; color: #8f1d14; border: 1px solid #f3b5a9; border-radius: 10px;
        }
        .bulk-card-step .qty { font-size: 18px; font-weight: 600; color: #1f2937; }
        button.bulk-note-btn {
          position: absolute;
          top: 4px;
          right: 4px;
          z-index: 2;
          width: 44px; min-width: 44px; height: 44px; min-height: 44px; padding: 0;
          display: inline-flex; align-items: center; justify-content: center;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: #8f1d14;
        }
        button.bulk-note-btn.has { background: #fbe4de; }
        /* Ô ghi chú mở từ lưới. z-index trên cả tấm giỏ (10000) vì mở được từ trong tấm đó. */
        .bulk-note-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.5);
          z-index: 10050;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .bulk-note-box {
          background: white;
          border-radius: 14px;
          padding: 16px;
          width: 100%;
          max-width: 380px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
        }
        .bulk-note-box h3 { margin: 0 0 10px; font-size: 16px; }
        .bulk-note-box input {
          width: 100%;
          box-sizing: border-box;
          /* 16px là mức tối thiểu để Safari iOS không tự phóng to trang khi focus. */
          font-size: 16px;
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          min-height: 44px;
        }
        .bulk-note-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
        .bulk-note-done {
          background: #b82a1e;
          color: white;
          border: none;
          border-radius: 10px;
          padding: 10px 22px;
          min-height: 44px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
        }
        .bulk-menu-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 10px;
          cursor: pointer;
          text-align: left;
          min-height: 128px;   /* đủ chỗ cho cụm −/+ 44px đè lên dòng giá khi đã chọn */
          display: flex;
          flex-direction: column;
          transition: transform 0.08s, border-color 0.15s;
          color: #1f2937;
          font-weight: 400;
          position: relative;
          overflow: hidden;  /* safety — không cho con vượt khung card */
        }
        .bulk-menu-card > .body {
          flex: 1 1 auto;
          min-width: 0;
          min-height: 0;
          overflow: hidden;   /* clamp con bên trong */
          display: flex;
          flex-direction: column;
        }
        /* Hover CHỈ trên máy có chuột: trên cảm ứng, :hover dính lại sau cú chạm → thẻ vừa bớt về
           0 vẫn viền đỏ như đang được chọn. */
        @media (hover: hover) {
          .bulk-menu-card:hover:not(:disabled) {
            border-color: #b82a1e;
            transform: translateY(-1px);
          }
        }
        .bulk-menu-card:active:not(:disabled) {
          transform: scale(0.98);
        }
        .bulk-menu-card.out {
          background: #f3f4f6;
          border-color: #d1d5db;
          color: #9ca3af;
          cursor: not-allowed;
        }
        .bulk-menu-card.out .price { color: #6b7280; }
        .bulk-menu-card .thumb {
          width: calc(100% + 20px);
          margin: -10px -10px 8px;
          height: 84px;
          object-fit: cover;
          background: #f3f4f6;
        }
        .bulk-menu-card .name {
          font-size: 16px;
          font-weight: 600;
          margin: 2px 0;
          line-height: 1.25;
          /* Clamp tối đa 2 dòng — tránh tên dài đẩy giá ra khỏi card */
          display: -webkit-box;
          -webkit-line-clamp: 2;
          line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
          overflow-wrap: anywhere;
          /* Fallback nếu browser không hỗ trợ line-clamp: 2 × line-height */
          max-height: 2.5em;
        }
        .bulk-menu-card .meta {
          font-size: 13px;
          color: #9ca3af;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .bulk-menu-card .price {
          font-size: 16px;
          font-weight: 600;
          color: #b82a1e;
          margin-top: 6px;
          min-height: 44px;
          display: flex;
          align-items: flex-end;
          /* Price luôn ở đáy card, không bị name dài đẩy ra ngoài khung */
          flex: 0 0 auto;
          align-self: stretch;
          white-space: nowrap;
        }
        .bulk-cart-panel {
          /* Mobile-first: ẨN cart panel — chỉ hiện trên desktop (≥768px override bên dưới).
             Lý do: mobile dùng sticky bar dưới + slide-up sheet (tap để xem giỏ đầy đủ). */
          display: none;
          flex-direction: column;
          background: #f9fafb;
          overflow: hidden;
        }
        .bulk-cart-header {
          padding: 10px 14px;
          font-weight: 600;
          color: #6b7280;
          font-size: 13px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .bulk-cart-body {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
        }
        .bulk-cart-empty {
          color: #9ca3af;
          text-align: center;
          padding: 32px 16px;
          font-size: 13px;
        }
        .bulk-cart-line {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 8px;
        }
        .bulk-cart-line .top {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: flex-start;
          margin-bottom: 6px;
        }
        /* Tên món + tiền là thứ chủ quán soát lại trước khi Báo bếp, nên to hơn hẳn phần
           điều khiển. Trước đây tên 14px / giá 13px, còn nút −/+ 32px nhìn lấn át cả dòng. */
        .bulk-cart-line .name {
          font-size: 17px;
          font-weight: 700;
          flex: 1;
          min-width: 0;            /* cho phép flex item co lại + word-break ngắt */
          line-height: 1.3;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .bulk-cart-line .price {
          font-size: 16px;
          font-weight: 700;
          color: #b82a1e;
          white-space: nowrap;
          flex-shrink: 0;          /* price không co khi name dài */
        }
        .bulk-cart-line .row { display: flex; gap: 6px; align-items: center; }
        .qty-stepper { display: flex; align-items: center; gap: 4px; flex: 0 0 auto; }
        .qty-stepper button {
          background: #f3f4f6;
          color: #1f2937;
          border: 1px solid #d1d5db;
          width: 44px;
          height: 44px;
          min-height: 44px;
          min-width: 44px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
        }
        .qty-stepper button:hover { background: #d1d5db; }
        .qty-stepper .qty { font-weight: 700; min-width: 24px; text-align: center; font-size: 16px; }
        /* Ghi chú đứng cùng hàng với nút Xoá (giữa thanh +/− và Xoá), không xuống dòng riêng:
           dòng món gọn lại một nấc, danh sách dài bớt phải cuộn. */
        .bulk-cart-note {
          font-size: 14px;
          color: #6b7280;
          flex: 1 1 auto;
          min-width: 0;
          display: flex;
          align-items: center;
        }
        .bulk-cart-note input {
          font-size: 16px;
          padding: 4px 8px;
          min-height: 44px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        button.bulk-cart-note-btn {
          width: 100%;
          min-width: 0;
          min-height: 44px;
          padding: 4px 10px;
          font-size: 14px;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        button.bulk-cart-note-btn.has { background: #fef6f3; border-color: #f3b5a9; color: #8f1d14; }
        button.bulk-line-remove {
          width: 44px; min-width: 44px; height: 44px; min-height: 44px; padding: 0; flex: 0 0 auto;
          display: inline-flex; align-items: center; justify-content: center; color: #6b7280;
        }
        /* "Xoá hết": nút CHỮ nhỏ, xám, căn trái cuối danh sách (2026-11-06) — bản viền đỏ to hết
           ngang nổi gần bằng "Báo bếp". Vẫn hỏi lại trước khi xoá. */
        button.bulk-clear-all {
          display: inline-flex; align-items: center; gap: 6px;
          margin-top: 12px; min-height: 44px; padding: 0 8px;
          background: transparent; border: none; color: #6b7280; font-size: 15px; font-weight: 400;
        }
        .bulk-empty { grid-column: 1 / -1; text-align: center; padding: 24px 8px; color: #6b7280; font-size: 16px; }
        .bulk-empty p { margin: 0 0 12px; }
        .bulk-empty-actions { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
        .bulk-cart-footer {
          padding: 12px 14px;
          background: white;
          border-top: 1px solid #e5e7eb;
        }
        .bulk-total-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 10px;
        }
        .bulk-total-label { color: #6b7280; font-size: 13px; }
        .bulk-total-value { font-size: 22px; font-weight: 700; color: #b82a1e; }
        /* Hàng nút đáy tấm giỏ trên điện thoại: [+ gọi thêm] [Báo bếp].
           Trước đây chỉ có "Báo bếp", muốn chọn thêm món phải bấm ✕ đóng giỏ đi đã —
           mà ✕ đọc ra là "bỏ", không ai đoán nó đưa mình về danh sách món. */
        .bulk-footer-actions { display: flex; gap: 10px; align-items: stretch; }
        .bulk-footer-actions .bulk-submit { flex: 1; width: auto; }
        button.bulk-add-more {
          flex: 0 0 auto;
          min-height: 56px;
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 16px;
        }
        .bulk-submit {
          width: 100%;
          background: #b82a1e;
          color: white;
          font-size: 17px;
          font-weight: 600;
          padding: 14px;
          min-height: 56px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
        }
        .bulk-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Desktop overrides (≥768px) — đặt CUỐI để đảm bảo source-order win.
           Đây là điểm bị bug trước: media @media trước base rule sẽ bị base ghi đè. */
        @media (min-width: 768px) {
          .bulk-cart-panel { display: flex; }
          .bulk-mobile-bar { display: none; }
          .bulk-menu-grid  { padding-bottom: 10px; }
          /* Máy tính giữ nguyên như trước: hộp co theo nội dung, ít món thì hộp thấp.
             Chỉ đạo 2026-09-19 là sửa cho điện thoại. */
          .bulk-container  { height: auto; max-height: 95vh; max-height: 95dvh; border-radius: 12px; }
        }
      `}</style>

      <div className="bulk-container">
        <div className="bulk-header">
          <h1 id="bulk-title">
            {onCollect ? 'Chọn món' : 'Gọi món'} - <span style={{ color: '#b82a1e' }}>{tableLabel}</span>
          </h1>
          <button className="secondary bulk-icon-btn" onClick={() => void requestClose()} aria-label="Đóng">
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <div className="bulk-body">
          {/* PANEL TRÁI — MENU */}
          <div className="bulk-menu-panel">
            <div className="bulk-menu-toolbar">
              <div className="bulk-search-wrap">
                <Search className="bulk-search-icon" size={20} aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="search"
                  aria-label="Tìm món"
                  placeholder="Tên, mã hoặc viết tắt (vd: ktl, cf)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {/* Chữ không tự xoá sau khi chọn món nữa, nên phải có đường xoá bằng MỘT chạm.
                    Ẩn khi ô trống: nút ✕ trên ô rỗng chỉ làm người ta phân vân nó xoá cái gì. */}
                {search && (
                  <button
                    type="button"
                    className="bulk-search-clear"
                    aria-label="Xoá chữ đang tìm"
                    onClick={() => {
                      setSearch('');
                      searchRef.current?.focus();
                    }}
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="bulk-menu-tabs">
                {groupCodes.map((g) => {
                  const n =
                    g === ''
                      ? searching ? searchCounts.all : menu.length
                      : g === PUSH_TAB
                        ? searching ? searchCounts.push : pushCount
                        : searchCounts.byGroup.get(g) ?? 0;
                  const label = g === '' ? 'Tất cả' : g === PUSH_TAB ? 'Nên mời' : labelOf(g);
                  const showN = g === '' || g === PUSH_TAB || searching;
                  return (
                    <button
                      key={g || 'all'}
                      onClick={() => setGroup(g)}
                      aria-pressed={group === g}
                      className={`${group === g ? '' : 'secondary'} ${g === PUSH_TAB ? 'bulk-tab-push' : ''} ${searching && n === 0 ? 'zero' : ''}`}
                    >
                      {showN ? `${label} (${n})` : label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="bulk-menu-grid">
              {loading && <p style={{ color: '#6b7280', gridColumn: '1/-1' }}>Đang tải menu...</p>}
              {!loading && filtered.length === 0 && (
                <div className="bulk-empty">
                  <p>Không tìm thấy món{searching ? ` "${search.trim()}"` : ''}</p>
                  {/* Đang lọc theo một danh mục mà tìm không ra → có thể món nằm ở danh mục khác. */}
                  <div className="bulk-empty-actions">
                    {searching && (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => {
                          setSearch('');
                          searchRef.current?.focus();
                        }}
                      >
                        Xoá tìm kiếm
                      </button>
                    )}
                    {group !== '' && (
                      <button type="button" className="secondary" onClick={() => setGroup('')}>
                        Tìm trong tất cả món
                      </button>
                    )}
                  </div>
                </div>
              )}
              {filtered.map((it) => (
                <MenuCard
                  key={it.id}
                  it={it}
                  line={cart.get(it.id)}
                  groupLabel={labelOf(it.group)}
                  onAdd={addToCart}
                  onStep={updateQty}
                  onNote={openNoteFor}
                />
              ))}
            </div>
          </div>

          {/* PANEL PHẢI — GIỎ HÀNG (desktop only, mobile dùng sticky bar + sheet) */}
          <div className="bulk-cart-panel">
            <div className="bulk-cart-header">
              <span>{cartLines.length} món · {totalQty} phần</span>
            </div>
            <div className="bulk-cart-body">
              <CartLineList
                lines={cartLines}
                editingNote={editingNote}
                onUpdateQty={updateQty}
                onRemove={removeFromCart}
                onSetNote={setNote}
                onStartEditNote={(id) => setEditingNote(id)}
                onStopEditNote={() => setEditingNote(null)}
                onClearAll={() => void clearAll()}
              />
            </div>
            <div className="bulk-cart-footer">
              <div className="bulk-total-row">
                <span className="bulk-total-label">Tổng tạm tính:</span>
                <span className="bulk-total-value">{fmt(total)}</span>
              </div>
              <button
                className="bulk-submit"
                onClick={submit}
                disabled={submitting || cartLines.length === 0}
              >
                {submitting && <span className="spinner" />}
                {onCollect ? 'Thêm vào hoá đơn' : 'Báo bếp'}
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE — thanh dưới, ĐÚNG MỘT NÚT (chỉ đạo chủ quán 2026-09-08).
            Trước đây là hai nút: một ô tóm tắt giỏ và một nút hành động. Hai ô cạnh nhau cùng
            dẫn tới đúng một chỗ thì ô bên trái chỉ tổ chiếm nửa bề ngang mà không thêm việc gì.
            Và nút này KHÔNG báo bếp: gửi thẳng từ đây là gửi mà chưa từng nhìn lại giỏ — tap
            trúng một món hai lần là thành 2 phần mà không hề biết, gửi xong mới phát hiện thì
            món đã nằm ở bếp. Báo bếp CHỈ còn bên trong giỏ. */}
        <div className="bulk-mobile-bar">
          <button
            className="submit"
            onClick={() => setMobileCartOpen(true)}
            disabled={cartLines.length === 0}
          >
            {/* Badge đếm nằm TRONG nút, không phải một ô riêng cạnh nút: thanh dưới vẫn đúng
                MỘT nút (chỉ đạo chủ quán 2026-09-08), nhưng tap món là thấy số nhảy ngay —
                trước đây thêm xong không biết đã thêm bao nhiêu, phải mở giỏ ra mới biết.
                Đếm số PHẦN (totalQty) vì đó là con số tăng theo từng cái tap; số món/phần
                đầy đủ vẫn có ở tiêu đề giỏ. key={totalQty} để mỗi lần số đổi là badge nhảy
                một nhịp — chính cái nhịp đó nói "tap của bạn đã được nhận". */}
            {/* "3 món · 125.000đ  [Xem đơn ›]" (2026-11-06) — thanh cũ chỉ có số, không có tiền,
                nhãn lại dài. Số món vẫn nhảy một nhịp mỗi lần tap (key) để báo tap đã ăn. */}
            {totalQty > 0 ? (
              <span className="bar-sum">
                <span className="bar-count" key={totalQty}>{totalQty} món</span>
                <span>{fmt(total)}</span>
              </span>
            ) : (
              <span className="bar-sum">Chưa chọn món nào</span>
            )}
            <span className="bar-go">
              Xem đơn <ChevronRight size={20} aria-hidden="true" />
            </span>
          </button>
        </div>
      </div>

      {/* MOBILE — full cart sheet (slide-up modal-trong-modal) */}
      {mobileCartOpen && (
        <div
          className="bulk-mobile-sheet-overlay"
          onClick={(e) => {
            // Không cho cú chạm trong tấm giỏ dội lên lớp phủ của hộp Gọi món (đóng nhầm cả hộp).
            e.stopPropagation();
            if (e.target === e.currentTarget) setMobileCartOpen(false);
          }}
        >
          <div className="bulk-mobile-sheet">
            <div className="bulk-sheet-handle" />
            <div className="bulk-mobile-sheet-header">
              <div className="bulk-sheet-head-top">
                {/* KHÔNG icon và KHÔNG chữ 'Giỏ hàng' (chỉ đạo chủ quán 2026-09-08) — đang
                    đứng trong chính cái giỏ thì không cần ai nhắc lại. Tên bàn thì có: tấm
                    giỏ che kín màn, không còn thấy đầu hộp Gọi món để biết đang gọi cho bàn
                    nào. */}
                <h2>
                  <span className="bulk-sheet-table">{tableLabel}</span> · {cartLines.length} món · {totalQty} phần
                </h2>
                {/* "Xoá hết" dời xuống CUỐI danh sách (2026-11-06) — trước nó đỏ, nằm sát nút ✕. */}
                <button
                  className="secondary bulk-icon-btn"
                  onClick={() => setMobileCartOpen(false)}
                  aria-label="Quay lại danh sách món"
                >
                  <X size={22} aria-hidden="true" />
                </button>
              </div>
              <div className="bulk-total-row">
                <span className="bulk-total-label">Tổng tạm tính:</span>
                <span className="bulk-total-value">{fmt(total)}</span>
              </div>
            </div>
            <div className="bulk-mobile-sheet-body">
              <CartLineList
                lines={cartLines}
                editingNote={editingNote}
                onUpdateQty={updateQty}
                onRemove={removeFromCart}
                onSetNote={setNote}
                onStartEditNote={(id) => setEditingNote(id)}
                onStopEditNote={() => setEditingNote(null)}
                onClearAll={() => void clearAll()}
              />
            </div>
            <div className="bulk-mobile-sheet-footer">
              <div className="bulk-footer-actions">
                {/* Gọi thêm: đóng tấm giỏ để về danh sách món, GIỎ GIỮ NGUYÊN. Cùng việc với
                    nút ✕ trên đầu tấm, nhưng ✕ đọc ra là "thôi bỏ" nên không ai dám bấm khi
                    đang muốn gọi tiếp. */}
                <button
                  type="button"
                  className="secondary bulk-add-more"
                  onClick={() => setMobileCartOpen(false)}
                >
                  <Plus size={20} aria-hidden="true" /> Gọi thêm món
                </button>
                <button
                  className="bulk-submit"
                  onClick={async () => {
                    await submit();
                  }}
                  disabled={submitting || cartLines.length === 0}
                >
                  {submitting && <span className="spinner" />}
                  {onCollect ? 'Thêm vào hoá đơn' : 'Báo bếp'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ô GHI CHÚ mở thẳng từ lưới món — khỏi phải vào giỏ mới ghi được (2026-09-21).
          Gõ tới đâu ăn vào giỏ tới đó, nên đóng kiểu nào (Xong, Enter, bấm ra ngoài) cũng
          không mất chữ. */}
      {noteFor && noteLine && (
        <div
          className="bulk-note-overlay"
          onClick={(e) => e.target === e.currentTarget && setNoteFor(null)}
        >
          <div className="bulk-note-box">
            <h3>Ghi chú - {noteLine.menu_item.name}</h3>
            <input
              autoFocus
              value={noteLine.note}
              onChange={(e) => setNote(noteFor, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setNoteFor(null); }}
              placeholder="vd: ít cay, không hành..."
            />
            <div className="bulk-note-actions">
              {noteLine.note && (
                <button type="button" className="secondary" onClick={() => setNote(noteFor, '')}>
                  Xoá chữ
                </button>
              )}
              <button type="button" className="bulk-note-done" onClick={() => setNoteFor(null)}>
                Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Tái dùng cho desktop cart panel + mobile sheet body
function CartLineList({
  lines,
  editingNote,
  onUpdateQty,
  onRemove,
  onSetNote,
  onStartEditNote,
  onStopEditNote,
  onClearAll,
}: {
  lines: CartLine[];
  editingNote: string | null;
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onSetNote: (id: string, note: string) => void;
  onStartEditNote: (id: string) => void;
  onStopEditNote: () => void;
  onClearAll: () => void;
}) {
  if (lines.length === 0) {
    return (
      <div className="bulk-cart-empty">
        Chạm vào món để thêm vào đơn - chạm lại để tăng số lượng
      </div>
    );
  }
  return (
    <>
      {lines.map((line) => (
        <div key={line.menu_item.id} className="bulk-cart-line">
          <div className="top">
            <div className="name">{line.menu_item.name}</div>
            <div className="price">{fmt(line.menu_item.price * line.qty)}</div>
          </div>
          <div className="row">
            <div className="qty-stepper">
              <button onClick={() => onUpdateQty(line.menu_item.id, -1)} aria-label={`Bớt 1 ${line.menu_item.name}`}>
                <Minus size={20} aria-hidden="true" />
              </button>
              <span className="qty">{line.qty}</span>
              <button onClick={() => onUpdateQty(line.menu_item.id, +1)} aria-label={`Thêm 1 ${line.menu_item.name}`}>
                <Plus size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="bulk-cart-note">
              {editingNote === line.menu_item.id ? (
                <input
                  value={line.note}
                  onChange={(e) => onSetNote(line.menu_item.id, e.target.value)}
                  onBlur={onStopEditNote}
                  autoFocus
                  placeholder="vd: ít cay, không hành..."
                />
              ) : (
                <button
                  className={`secondary bulk-cart-note-btn ${line.note ? 'has' : ''}`}
                  onClick={() => onStartEditNote(line.menu_item.id)}
                >
                  {line.note ? line.note : '+ Ghi chú'}
                </button>
              )}
            </div>
            <button
              className="secondary bulk-line-remove"
              onClick={() => onRemove(line.menu_item.id)}
              aria-label={`Xoá ${line.menu_item.name} khỏi đơn`}
            >
              <Trash2 size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
      {/* "Xoá hết" ở CUỐI danh sách, xa nút đóng, và có hỏi lại (2026-11-06). */}
      <button type="button" className="bulk-clear-all" onClick={onClearAll}>
        <Trash2 size={18} aria-hidden="true" /> Xoá hết món đã chọn
      </button>
    </>
  );
}
