import { useState } from 'react';
import { Check, ChefHat, ChevronLeft, Clock, Pencil, Plus, Trash2, TriangleAlert, Utensils } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardButton,
  Dialog,
  Input,
  MoneyInput,
  Select,
  Stepper,
  Textarea,
  applyBrand,
  deriveBrand,
} from '@order/ui';
import './ui-showcase.css';

/**
 * /__ui — trang mẫu Design System (DESIGN-SYSTEM.md §6 bước 3), CHỈ chạy ở dev.
 * Mọi biến thể component phải hiện ở đây; thêm biến thể mới vào packages/ui thì thêm mẫu vào đây.
 * Trang này cũng là bài kiểm luật: không có style={{…}} cho màu/chữ/khoảng cách.
 */
export function UiShowcasePage() {
  const [dialog, setDialog] = useState(false);
  const [brand, setBrand] = useState('#0057D9');
  const [brandMsg, setBrandMsg] = useState('');
  const [selected, setSelected] = useState(1);
  const [blockedMsg, setBlockedMsg] = useState('');
  const [qty, setQty] = useState(1);

  const brandCheck = deriveBrand(brand);

  return (
    <main className="uis">
      <h1 className="uis__h1">Design System — trang mẫu</h1>
      <p className="uis__lead">Nguồn: packages/ui. Đổi token ở đó, mọi màn đổi theo.</p>

      <section className="uis__sec">
        <h2 className="uis__h2">Nút</h2>
        <div className="uis__row">
          <Button icon={<Check />}>Lưu</Button>
          <Button variant="secondary" icon={<Pencil />}>Sửa</Button>
          <Button variant="ghost">Đóng</Button>
          <Button variant="danger" icon={<Trash2 />}>Huỷ món</Button>
        </div>
        <div className="uis__row">
          <Button size="lg" icon={<ChefHat />}>Gửi bếp</Button>
          <Button size="lg">Thanh toán</Button>
          <Button
            size="lg"
            blockedReason="Chưa chọn mã QR"
            onBlockedClick={() => setBlockedMsg('Nút bị chặn vẫn bấm được → màn chỉ chỗ còn thiếu.')}
          >
            Xác nhận đã thu
          </Button>
        </div>
        {blockedMsg && <p className="uis__note">{blockedMsg}</p>}
      </section>

      <section className="uis__sec">
        <h2 className="uis__h2">Ô nhập</h2>
        <div className="uis__grid">
          <Input label="Tên món" placeholder="Vd: Bún bò" hint="Tối đa 60 ký tự" />
          <MoneyInput label="Giá bán" defaultValue="45.000" />
          <div className="ui-field">
            <span className="ui-field__label">Số lượng</span>
            <Stepper label="Số lượng" value={qty} onChange={setQty} min={1} />
          </div>
          <Input label="Số điện thoại khách" inputMode="tel" defaultValue="09123" error="Số điện thoại thiếu chữ số" />
          <Select label="Danh mục" defaultValue="mon-chinh">
            <option value="mon-chinh">Món chính</option>
            <option value="do-uong">Đồ uống</option>
          </Select>
          <Textarea label="Ghi chú cho bếp" placeholder="Vd: không hành" />
        </div>
      </section>

      <section className="uis__sec">
        <h2 className="uis__h2">Nhãn trạng thái</h2>
        <div className="uis__row">
          <Badge tone="info"><Utensils />Đang ăn</Badge>
          <Badge tone="warning"><Clock />Chờ món 18'</Badge>
          <Badge tone="danger"><TriangleAlert />Trễ 25'</Badge>
          <Badge tone="success"><Check />Đã thu</Badge>
          <Badge tone="muted">Bàn trống</Badge>
        </div>
      </section>

      <section className="uis__sec">
        <h2 className="uis__h2">Thẻ</h2>
        <div className="uis__tables">
          {[1, 2, 3].map((n) => (
            <CardButton key={n} selected={selected === n} onClick={() => setSelected(n)}>
              <span className="uis__tname">Bàn {n}</span>
              <span className="uis__money">{(n * 165000).toLocaleString('vi-VN')}đ</span>
              <span className="uis__state">
                <Utensils />
                Đang ăn
              </span>
              <span className="uis__meta">{n * 14} phút</span>
            </CardButton>
          ))}
          <CardButton dashed>
            <span className="uis__tname uis__tname--muted">Bàn 4</span>
            <span className="uis__state uis__state--muted">
              <Plus />
              Mở bàn
            </span>
          </CardButton>
        </div>
        <Card>Card tĩnh — khối nội dung. Không lồng Card trong Card.</Card>
      </section>

      <section className="uis__sec">
        <h2 className="uis__h2">Hộp thoại</h2>
        <Button variant="secondary" onClick={() => setDialog(true)}>
          Mở hộp thoại thanh toán
        </Button>
        <Dialog
          open={dialog}
          onClose={() => setDialog(false)}
          title="Thanh toán · Bàn 1"
          footer={
            <>
              <Button variant="ghost" icon={<ChevronLeft />} onClick={() => setDialog(false)}>
                Quay lại
              </Button>
              <Button size="lg" icon={<Check />} onClick={() => setDialog(false)}>
                Xác nhận đã thu
              </Button>
            </>
          }
        >
          <div className="uis__total">
            <span>Tổng cần thu</span>
            <b>485.000đ</b>
          </div>
        </Dialog>
      </section>

      <section className="uis__sec">
        <h2 className="uis__h2">Màu thương hiệu của quán</h2>
        <div className="uis__row uis__row--end">
          <Input
            label="Màu chính (#RRGGBB)"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            error={brandCheck.ok ? undefined : brandCheck.reason}
            hint={brandCheck.ok ? `Chữ trắng đạt ${brandCheck.ratio.toFixed(2)}:1` : undefined}
          />
          <Button
            blockedReason={brandCheck.ok ? undefined : 'Màu chưa đạt tương phản'}
            onClick={() => {
              const r = applyBrand(brand);
              setBrandMsg(r.ok ? `Đã áp màu ${r.primary} cho cả trang.` : r.reason);
            }}
          >
            Áp dụng
          </Button>
        </div>
        {brandMsg && <p className="uis__note">{brandMsg}</p>}
      </section>
    </main>
  );
}
