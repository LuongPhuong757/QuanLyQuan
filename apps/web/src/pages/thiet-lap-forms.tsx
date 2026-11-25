// Các bảng con của màn "Thiết lập quán" (docs/THIET-LAP-QUAN-SPEC.md §4). Mỗi form tự gọi API
// qua `goi` (đã kèm vé mở khoá) rồi báo `onXong` để màn tải lại trạng thái.
import { useState, type FormEvent, type ReactNode } from 'react';
import { useToast } from '../components/Toast.tsx';
import { Switch } from '../components/ui/Switch.tsx';
import { docBang, MAU_EXCEL, type DongExcel } from '../lib/thiet-lap-excel.ts';
import type { GoiApi, KetQuaXemTruoc, TaiKhoanNganHang, TinhNang, TrangThai } from './thiet-lap-types.ts';

type FormProps = { tt: TrangThai; goi: GoiApi; onXong: () => void | Promise<void> };

const tien = (n: number) => n.toLocaleString('vi-VN');

/** Gửi form: khoá nút, báo lỗi tại chỗ, báo "Đã lưu" khi xong. */
function useGui(onXong: () => void | Promise<void>) {
  const toast = useToast();
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const gui = async (viec: () => Promise<unknown>, thongBao: string) => {
    setDang(true);
    setLoi(null);
    try {
      await viec();
      toast.push('success', thongBao);
      await onXong();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Lưu không được, thử lại nhé.');
    } finally {
      setDang(false);
    }
  };
  return { dang, loi, gui };
}

function O({ id, nhan, goiY, children }: { id: string; nhan: string; goiY?: string; children: ReactNode }) {
  return (
    <div className="tl-field">
      <label htmlFor={id}>{nhan}</label>
      {children}
      {goiY && <span className="tl-hint">{goiY}</span>}
    </div>
  );
}

function Chan({ dang, loi, nhan = 'Lưu' }: { dang: boolean; loi: string | null; nhan?: string }) {
  return (
    <>
      {loi && <p className="tl-err" role="alert">{loi}</p>}
      <div className="tl-btns">
        <button type="submit" className="tl-act is-pri" disabled={dang}>
          {dang ? 'Đang lưu…' : nhan}
        </button>
      </div>
    </>
  );
}

// ── 1. Thông tin quán ────────────────────────────────────────────────────────

export function ThongTinForm({ tt, goi, onXong }: FormProps) {
  const cu = tt.chi_tiet.thong_tin;
  const [ten, setTen] = useState(cu.store_name);
  const [sdt, setSdt] = useState(cu.store_phone);
  const [dc, setDc] = useState(cu.store_address);
  const { dang, loi, gui } = useGui(onXong);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void gui(
      () => goi('PUT', '/admin/thiet-lap/thong-tin', { store_name: ten, store_phone: sdt, store_address: dc }),
      'Đã lưu thông tin quán',
    );
  };
  return (
    <form className="tl-form" onSubmit={submit}>
      <O id="tl-ten-quan" nhan="Tên quán" goiY="In trên đầu hoá đơn và trang khách.">
        <input id="tl-ten-quan" value={ten} maxLength={64} onChange={(e) => setTen(e.target.value)} required />
      </O>
      <O id="tl-sdt" nhan="Số điện thoại">
        <input id="tl-sdt" inputMode="tel" value={sdt} maxLength={20} onChange={(e) => setSdt(e.target.value)} required />
      </O>
      <O id="tl-dia-chi" nhan="Địa chỉ" goiY="Không bắt buộc.">
        <input id="tl-dia-chi" value={dc} maxLength={255} onChange={(e) => setDc(e.target.value)} />
      </O>
      <Chan dang={dang} loi={loi} />
    </form>
  );
}

// ── 2. Tài khoản chủ quán ────────────────────────────────────────────────────

export function ChuQuanForm({ tt, goi, onXong }: FormProps) {
  const cu = tt.chi_tiet.chu_quan;
  const [ten, setTen] = useState(cu?.full_name ?? '');
  const [dn, setDn] = useState(cu?.username ?? '');
  const [mk, setMk] = useState('');
  const { dang, loi, gui } = useGui(onXong);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void gui(
      () => goi('PUT', '/admin/thiet-lap/chu-quan', { full_name: ten, username: dn, ...(mk ? { password: mk } : {}) }),
      cu ? 'Đã lưu tài khoản chủ quán' : 'Đã tạo tài khoản chủ quán',
    );
  };
  return (
    <form className="tl-form" onSubmit={submit}>
      <O id="tl-cq-ten" nhan="Tên chủ quán">
        <input id="tl-cq-ten" value={ten} maxLength={128} onChange={(e) => setTen(e.target.value)} required />
      </O>
      <O id="tl-cq-dn" nhan="Tên đăng nhập" goiY="Chữ không dấu, số, dấu chấm hoặc gạch.">
        <input
          id="tl-cq-dn"
          autoCapitalize="none"
          autoComplete="off"
          value={dn}
          maxLength={64}
          onChange={(e) => setDn(e.target.value)}
          required
        />
      </O>
      <O
        id="tl-cq-mk"
        nhan={cu ? 'Mật khẩu mới' : 'Mật khẩu'}
        goiY={cu ? 'Để trống thì giữ mật khẩu cũ. Ít nhất 8 ký tự.' : 'Ít nhất 8 ký tự.'}
      >
        <input
          id="tl-cq-mk"
          type="password"
          autoComplete="new-password"
          value={mk}
          minLength={8}
          maxLength={128}
          required={!cu}
          onChange={(e) => setMk(e.target.value)}
        />
      </O>
      <Chan dang={dang} loi={loi} nhan={cu ? 'Lưu' : 'Tạo tài khoản'} />
    </form>
  );
}

// ── 3. Bàn ───────────────────────────────────────────────────────────────────

export function BanForm({ tt, goi, onXong }: FormProps) {
  const { so_ban, so_lon_nhat } = tt.chi_tiet.ban;
  const [tu, setTu] = useState(String(so_lon_nhat + 1));
  const [den, setDen] = useState(String(so_lon_nhat + (so_ban === 0 ? 20 : 10)));
  const { dang, loi, gui } = useGui(onXong);
  const nTu = Number(tu);
  const nDen = Number(den);
  const hopLe = Number.isInteger(nTu) && Number.isInteger(nDen) && nTu >= 1 && nDen >= nTu && nDen - nTu < 100;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!hopLe) return;
    void gui(() => goi('POST', '/admin/thiet-lap/ban', { tu: nTu, den: nDen }), `Đã tạo bàn ${nTu} → ${nDen}`);
  };
  return (
    <form className="tl-form" onSubmit={submit}>
      <p className="tl-sub">
        {so_ban === 0 ? 'Quán chưa có bàn nào.' : `Đang có ${so_ban} bàn, số lớn nhất là ${so_lon_nhat}.`} Số đã có sẽ được bỏ qua.
      </p>
      <div className="tl-pair">
        <O id="tl-ban-tu" nhan="Từ bàn số">
          <input id="tl-ban-tu" inputMode="numeric" value={tu} onChange={(e) => setTu(e.target.value.replace(/\D/g, ''))} />
        </O>
        <O id="tl-ban-den" nhan="Đến bàn số">
          <input id="tl-ban-den" inputMode="numeric" value={den} onChange={(e) => setDen(e.target.value.replace(/\D/g, ''))} />
        </O>
      </div>
      {!hopLe && tu !== '' && den !== '' && <p className="tl-hint">Số cuối phải ≥ số đầu, tối đa 100 bàn mỗi lần.</p>}
      <Chan dang={dang} loi={loi} nhan={hopLe ? `Tạo ${nDen - nTu + 1} bàn` : 'Tạo bàn'} />
    </form>
  );
}

// ── 5. Tài khoản ngân hàng ───────────────────────────────────────────────────

export function NganHangForm({ tt, goi, onXong }: FormProps) {
  const ds = tt.chi_tiet.ngan_hang;
  const [dangSua, setDangSua] = useState<TaiKhoanNganHang | null>(ds.length > 0 ? ds[0] : null);
  const [themMoi, setThemMoi] = useState(ds.length === 0);
  const muc = themMoi ? null : dangSua;
  return (
    <div className="tl-form">
      {ds.length > 0 && (
        <div className="tl-chips" role="group" aria-label="Chọn tài khoản">
          {ds.map((t) => (
            <button
              key={t.id}
              type="button"
              className="tl-chip"
              aria-pressed={!themMoi && dangSua?.id === t.id}
              onClick={() => {
                setThemMoi(false);
                setDangSua(t);
              }}
            >
              {t.bank_name ?? 'TK'} …{(t.account_no ?? '').slice(-4)}
            </button>
          ))}
          <button type="button" className="tl-chip" aria-pressed={themMoi} onClick={() => setThemMoi(true)}>
            + Thêm TK
          </button>
        </div>
      )}
      <NganHangChiTiet key={muc?.id ?? 'moi'} tt={tt} goi={goi} onXong={onXong} cu={muc} />
    </div>
  );
}

function NganHangChiTiet({ tt, goi, onXong, cu }: FormProps & { cu: TaiKhoanNganHang | null }) {
  const [bin, setBin] = useState(cu?.bank_bin ?? '');
  const [so, setSo] = useState(cu?.account_no ?? '');
  const [ten, setTen] = useState(cu?.account_name ?? '');
  const { dang, loi, gui } = useGui(onXong);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = { bank_bin: bin, account_no: so, account_name: ten };
    void gui(
      () => (cu ? goi('PUT', `/admin/thiet-lap/ngan-hang/${cu.id}`, body) : goi('POST', '/admin/thiet-lap/ngan-hang', body)),
      cu ? 'Đã sửa tài khoản ngân hàng' : 'Đã thêm tài khoản ngân hàng',
    );
  };
  return (
    <form className="tl-form" onSubmit={submit}>
      <O id="tl-nh-bank" nhan="Ngân hàng">
        <select id="tl-nh-bank" value={bin} onChange={(e) => setBin(e.target.value)} required>
          <option value="">— Chọn ngân hàng —</option>
          {tt.ngan_hang_ho_tro.map((b) => (
            <option key={b.bin} value={b.bin}>
              {b.ten}
            </option>
          ))}
        </select>
      </O>
      <O id="tl-nh-so" nhan="Số tài khoản">
        <input id="tl-nh-so" inputMode="numeric" value={so} maxLength={19} onChange={(e) => setSo(e.target.value.replace(/\s/g, ''))} required />
      </O>
      <O id="tl-nh-ten" nhan="Tên chủ tài khoản" goiY="Viết đúng như trên thẻ, không dấu. Khách nhìn tên này trước khi chuyển.">
        <input id="tl-nh-ten" value={ten} maxLength={128} onChange={(e) => setTen(e.target.value.toUpperCase())} required />
      </O>
      {cu && <p className="tl-hint">Đổi số tài khoản là đổi nơi nhận tiền của khách. Thay đổi được ghi vào nhật ký.</p>}
      <Chan dang={dang} loi={loi} nhan={cu ? 'Lưu' : 'Thêm tài khoản'} />
    </form>
  );
}

// ── 4. Menu Excel ────────────────────────────────────────────────────────────

async function taiXlsx() {
  return import('xlsx');
}

export function MenuForm({ goi, onXong }: { goi: GoiApi; onXong: () => void | Promise<void> }) {
  const toast = useToast();
  const [tenFile, setTenFile] = useState<string | null>(null);
  const [dongs, setDongs] = useState<DongExcel[]>([]);
  const [kq, setKq] = useState<KetQuaXemTruoc | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, setDang] = useState(false);

  const taiMau = async () => {
    try {
      const XLSX = await taiXlsx();
      const ws = XLSX.utils.json_to_sheet([...MAU_EXCEL]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'menu');
      XLSX.writeFile(wb, 'menu-mau.xlsx');
    } catch {
      toast.push('error', 'Không tải được bộ đọc Excel — kiểm tra kết nối rồi thử lại.');
    }
  };

  const chonFile = async (f: File | undefined) => {
    if (!f) return;
    setTenFile(f.name);
    setKq(null);
    setLoi(null);
    setDang(true);
    try {
      const XLSX = await taiXlsx();
      // CSV phải đọc dạng CHỮ (UTF-8): đưa mảng byte cho XLSX thì nó đoán bảng mã cũ, tiêu đề
      // "Tên món" vỡ dấu và không nhận ra cột nào. File .xlsx thì tự mang bảng mã, đọc byte là đúng.
      const laCsv = /\.csv$/i.test(f.name) || f.type === 'text/csv';
      // `raw: true`: KHÔNG để XLSX tự đổi chữ thành số. Không có nó, "310.000" bị hiểu là 310 (dấu
      // chấm thập phân kiểu Mỹ) → giá sai 1000 lần. Giữ chuỗi, server `docGia` đọc theo kiểu Việt.
      const wb = laCsv
        ? XLSX.read(await f.text(), { type: 'string', raw: true })
        : XLSX.read(await f.arrayBuffer(), { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      const { dongs: d, thieuCotTen } = docBang(raw);
      if (thieuCotTen) throw new Error('File không có cột "Tên món". Tải file mẫu để xem cách đặt cột.');
      if (d.length === 0) throw new Error('File không có dòng món nào.');
      setDongs(d);
      setKq((await goi('POST', '/admin/thiet-lap/menu/xem-truoc', { dongs: d })) as KetQuaXemTruoc);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Không đọc được file.');
    } finally {
      setDang(false);
    }
  };

  const luu = async () => {
    setDang(true);
    setLoi(null);
    try {
      const r = (await goi('POST', '/admin/thiet-lap/menu', { dongs })) as { tao: number; doi: number };
      toast.push('success', `Đã lưu: ${r.tao} món mới, ${r.doi} món đổi giá/nhóm`);
      await onXong();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Lưu không được.');
    } finally {
      setDang(false);
    }
  };

  const soGhi = kq ? kq.moi.length + kq.doi.length : 0;

  return (
    <div className="tl-form">
      <div className="tl-file">
        <label className="tl-act is-pri tl-file__pick">
          {tenFile ? 'Chọn file khác' : 'Chọn file Excel'}
          <input
            id="tl-menu-file"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              void chonFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        <button type="button" className="tl-link" onClick={() => void taiMau()}>
          Tải file mẫu
        </button>
        {tenFile && <span className="tl-file__name">{tenFile}</span>}
      </div>
      <p className="tl-hint">Cột cần có: Tên món · Giá · Nhóm (· Đơn vị · Mã nếu có). Trùng tên món đã có thì cập nhật giá và nhóm.</p>

      {dang && !kq && <p className="tl-sub">Đang đọc file…</p>}
      {loi && <p className="tl-err" role="alert">{loi}</p>}

      {kq && (
        <>
          <div className="tl-counts">
            <div className="tl-count is-new"><b>{kq.moi.length}</b><span>món mới</span></div>
            <div className="tl-count is-chg"><b>{kq.doi.length}</b><span>đổi giá / nhóm</span></div>
            <div className="tl-count is-bad"><b>{kq.loi.length}</b><span>dòng lỗi, bỏ qua</span></div>
          </div>
          {kq.khong_doi > 0 && <p className="tl-hint">{kq.khong_doi} món trùng khớp, không có gì đổi.</p>}
          <div className="tl-table">
            <table>
              <thead>
                <tr><th>Tên món</th><th>Nhóm</th><th className="num">Giá</th></tr>
              </thead>
              <tbody>
                {kq.doi.length > 0 && <tr className="tl-sect"><td colSpan={3}>Đổi giá / nhóm ({kq.doi.length})</td></tr>}
                {kq.doi.map((d) => (
                  <tr key={`d${d.dong}`}>
                    <td>{d.ten}</td>
                    <td>{d.nhom_moi ? <><s>{d.nhom_cu}</s><span className="tl-moi">→ {d.nhom_moi}</span></> : <i className="tl-keep">giữ nguyên</i>}</td>
                    <td className="num">{d.gia_moi !== undefined ? <><s>{tien(d.gia_cu)}</s><span className="tl-moi">→ {tien(d.gia_moi)}</span></> : <i className="tl-keep">giữ nguyên</i>}</td>
                  </tr>
                ))}
                {kq.loi.length > 0 && <tr className="tl-sect"><td colSpan={3}>Dòng lỗi ({kq.loi.length})</td></tr>}
                {kq.loi.map((l) => (
                  <tr key={`l${l.dong}`}>
                    <td>{l.ten || '(trống)'} <span className="tl-hint">· dòng {l.dong}</span></td>
                    <td colSpan={2} className="tl-err-cell">{l.ly_do}</td>
                  </tr>
                ))}
                {kq.moi.length > 0 && <tr className="tl-sect"><td colSpan={3}>Món mới ({kq.moi.length})</td></tr>}
                {kq.moi.map((m) => (
                  <tr key={`m${m.dong}`}>
                    <td>{m.ten}</td>
                    <td>{m.nhom}</td>
                    <td className="num">{tien(m.gia)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tl-btns">
            <span className="tl-hint tl-btns__note">Món không có trong file: giữ nguyên.</span>
            <button type="button" className="tl-act is-pri" disabled={dang || soGhi === 0} onClick={() => void luu()}>
              {dang ? 'Đang lưu…' : soGhi === 0 ? 'Không có gì để lưu' : `Lưu ${soGhi} món`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── 9. Tính năng ─────────────────────────────────────────────────────────────

const TINH_NANG: Array<{ k: keyof TinhNang; ten: string; moTa: string }> = [
  { k: 'online_ordering_enabled', ten: 'Đặt món online', moTa: 'Khách đặt giao hàng / mang về qua trang web.' },
  { k: 'table_ordering_enabled', ten: 'Gọi món tại bàn', moTa: 'Khách quét QR ở bàn rồi tự gọi món.' },
  { k: 'printing_enabled', ten: 'In hoá đơn', moTa: 'Cần cài máy in ở Cài đặt → Máy in.' },
];

export function TinhNangForm({ tt, goi, onDoi }: { tt: TrangThai; goi: GoiApi; onDoi: () => Promise<void> }) {
  const toast = useToast();
  const [dang, setDang] = useState<keyof TinhNang | null>(null);
  const gat = async (k: keyof TinhNang, bat: boolean) => {
    setDang(k);
    try {
      await goi('PUT', '/admin/thiet-lap/tinh-nang', { [k]: bat });
      await onDoi();
    } catch (e) {
      toast.push('error', e instanceof Error ? e.message : 'Không đổi được.');
    } finally {
      setDang(null);
    }
  };
  return (
    <div className="tl-form">
      {TINH_NANG.map((t) => (
        <div className="tl-switch-row" key={t.k}>
          <div>
            <div className="tl-row__name">{t.ten}</div>
            <div className="tl-hint">{t.moTa}</div>
          </div>
          <Switch
            on={tt.chi_tiet.tinh_nang[t.k]}
            label={t.ten}
            disabled={dang !== null}
            onChange={(v) => void gat(t.k, v)}
          />
        </div>
      ))}
    </div>
  );
}
