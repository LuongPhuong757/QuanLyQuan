// Bảng con "Thương hiệu" của màn Thiết lập quán (2026-11-19, docs/THIET-LAP-QUAN-SPEC.md §8c).
// Tên đầy đủ + tên ngắn + logo (1 ảnh → máy tự làm 4 bản) + 2 màu từ bảng + công tắc linh vật.
//
// Bấm ô màu quản lý là ÁP THỬ ngay lên cả trang (chính màn này đổi màu theo) — chủ quán nhìn thấy
// thật trước khi lưu. Đóng không lưu thì trả lại màu cũ.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { bienMauAdmin, duongDanLogo, type MauBang, type ThuongHieuCongKhai } from '@order/schemas';
import { useToast } from '../components/Toast.tsx';
import { Switch } from '../components/ui/Switch.tsx';
import { logoVuong, taiLaiThuongHieu } from '../lib/thuong-hieu.ts';
import type { GoiApi, TrangThai } from './thiet-lap-types.ts';

function apMauThu(hex: string) {
  const goc = document.documentElement.style;
  for (const [k, v] of Object.entries(bienMauAdmin(hex))) goc.setProperty(k, v);
}

function BangMau({
  id,
  nhan,
  bang,
  chon,
  onChon,
  goiY,
}: {
  id: string;
  nhan: string;
  bang: readonly MauBang[];
  chon: string;
  onChon: (hex: string) => void;
  goiY?: string;
}) {
  const ten = bang.find((m) => m.hex === chon)?.ten ?? chon;
  return (
    <div className="tl-field">
      <span id={id}>{nhan}</span>
      <div className="th-pal" role="group" aria-labelledby={id}>
        {bang.map((m) => (
          <button
            key={m.hex}
            type="button"
            className="th-sw"
            style={{ background: m.hex }}
            aria-label={m.ten}
            aria-pressed={m.hex === chon}
            onClick={() => onChon(m.hex)}
          />
        ))}
      </div>
      <span className="tl-hint">Đang chọn: {ten}</span>
      {goiY && <span className="tl-hint">{goiY}</span>}
    </div>
  );
}

export function ThuongHieuForm({ tt, goi, onXong }: { tt: TrangThai; goi: GoiApi; onXong: () => void | Promise<void> }) {
  const toast = useToast();
  const cu = tt.chi_tiet.thuong_hieu;
  const [ten, setTen] = useState(cu.ten);
  const [tenNgan, setTenNgan] = useState(cu.ten_ngan);
  const [mauAdmin, setMauAdmin] = useState(cu.mau_admin);
  const [mauKhach, setMauKhach] = useState(cu.mau_khach);
  const [linhVat, setLinhVat] = useState(cu.linh_vat);
  const [phienBan, setPhienBan] = useState(cu.logo_phien_ban);
  const [dang, setDang] = useState<'luu' | 'logo' | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const daLuu = useRef(false);

  // Rời bảng con mà chưa lưu → trả lại màu quản lý đang dùng (đã áp thử khi bấm ô màu).
  useEffect(
    () => () => {
      if (!daLuu.current) apMauThu(cu.mau_admin);
    },
    [cu.mau_admin],
  );

  const chonMauAdmin = (hex: string) => {
    setMauAdmin(hex);
    apMauThu(hex);
  };

  const taiLogo = async (f: File | undefined) => {
    if (!f) return;
    setDang('logo');
    setLoi(null);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const th = (await goi('POST', '/admin/thiet-lap/logo', fd)) as ThuongHieuCongKhai;
      setPhienBan(th.logo_phien_ban);
      await taiLaiThuongHieu();
      toast.push('success', 'Đã cập nhật logo');
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Không tải được logo.');
    } finally {
      setDang(null);
    }
  };

  const luu = async (e: FormEvent) => {
    e.preventDefault();
    setDang('luu');
    setLoi(null);
    try {
      await goi('PUT', '/admin/thiet-lap/thuong-hieu', {
        ten,
        ten_ngan: tenNgan,
        mau_admin: mauAdmin,
        mau_khach: mauKhach,
        linh_vat: linhVat,
      });
      daLuu.current = true;
      await taiLaiThuongHieu();
      toast.push('success', 'Đã lưu thương hiệu');
      await onXong();
    } catch (er) {
      setLoi(er instanceof Error ? er.message : 'Lưu không được.');
    } finally {
      setDang(null);
    }
  };

  const logoHienTai = logoVuong({ ...cu, logo_phien_ban: phienBan });

  return (
    <form className="tl-form" onSubmit={luu}>
      <div className="tl-field">
        <label htmlFor="th-ten">Tên đầy đủ</label>
        <input id="th-ten" value={ten} maxLength={64} required onChange={(e) => setTen(e.target.value)} />
        <span className="tl-hint">In trên hoá đơn, tiêu đề trang khách, tin nhắn SMS (tự bỏ dấu).</span>
      </div>
      <div className="tl-field">
        <label htmlFor="th-ten-ngan">Tên ngắn (tuỳ chọn)</label>
        <input id="th-ten-ngan" value={tenNgan} maxLength={32} onChange={(e) => setTenNgan(e.target.value)} />
        <span className="tl-hint">Tab trình duyệt và chữ đầu trang khách. Bỏ trống thì dùng tên đầy đủ.</span>
      </div>

      <div className="tl-field">
        <span>Logo</span>
        <div className="th-logo">
          <img src={logoHienTai} alt="Logo hiện tại" width={72} height={72} />
          <label className="tl-act th-logo__pick">
            {dang === 'logo' ? 'Đang xử lý…' : phienBan > 0 ? 'Đổi ảnh logo' : 'Tải ảnh logo'}
            <input
              id="th-logo-file"
              type="file"
              accept="image/*"
              disabled={dang !== null}
              onChange={(e) => {
                void taiLogo(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        <span className="tl-hint">Ảnh được thu vừa khung vuông, không bị cắt. Máy tự làm các bản dưới đây.</span>
        {phienBan > 0 && (
          <div className="th-outs">
            <figure><img src={duongDanLogo('vuong-32', phienBan)} alt="" width={32} height={32} /><figcaption>Tab trình duyệt</figcaption></figure>
            <figure><img src={duongDanLogo('vuong-180', phienBan)} alt="" width={48} height={48} className="th-bo" /><figcaption>Màn hình chính</figcaption></figure>
            <figure><img src={duongDanLogo('den-trang', phienBan)} alt="" width={48} height={48} /><figcaption>Hoá đơn in</figcaption></figure>
            <figure><img src={duongDanLogo('chia-se', phienBan)} alt="" width={92} height={48} className="th-bo" /><figcaption>Chia sẻ link</figcaption></figure>
          </div>
        )}
      </div>

      <BangMau
        id="th-mau-admin"
        nhan="Màu trang quản lý"
        bang={tt.bang_mau.admin}
        chon={mauAdmin}
        onChon={chonMauAdmin}
        goiY="Bấm là thấy ngay trên màn này. Không có đỏ, cam, xanh lá: ba màu đó dành cho báo lỗi, cảnh báo, đã xong."
      />
      <BangMau id="th-mau-khach" nhan="Màu trang khách" bang={tt.bang_mau.khach} chon={mauKhach} onChon={setMauKhach} />

      <div className="tl-switch-row">
        <div>
          <div className="tl-row__name">Linh vật + ảnh nền Quyển menu</div>
          <div className="tl-hint">Gấu, thỏ, mèo… ở trang khách.</div>
        </div>
        <Switch on={linhVat} label="Linh vật" onChange={setLinhVat} />
      </div>

      {loi && <p className="tl-err" role="alert">{loi}</p>}
      <div className="tl-btns">
        <button type="submit" className="tl-act is-pri" disabled={dang !== null}>
          {dang === 'luu' ? 'Đang lưu…' : 'Lưu thương hiệu'}
        </button>
      </div>
    </form>
  );
}
