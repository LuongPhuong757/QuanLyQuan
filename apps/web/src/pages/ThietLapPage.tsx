// Màn "Thiết lập quán" `/thiet-lap` (2026-11-18) — docs/THIET-LAP-QUAN-SPEC.md.
//
// Chủ repo ngồi một lần trên màn này là dựng xong quán mới. Danh sách việc, KHÔNG phải wizard:
// mở lại sửa được bất cứ lúc nào (D-02). Vào màn phải gõ lại mật khẩu của bất kỳ admin nào (D-03).
//
// Vé mở khoá chỉ nằm trong state của màn — không localStorage: rời màn là khoá lại, đúng spec.
// Server trả vé mới mỗi lần tải trạng thái (sau mỗi lần lưu) nên đang làm thì không bị khoá giữa chừng.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, extractError } from '../lib/api.ts';
import { useToast } from '../components/Toast.tsx';
import { Sheet } from '../components/ui/Sheet.tsx';
import { settingsHref } from '../lib/settings-groups.ts';
import { BanForm, ChuQuanForm, MenuForm, NganHangForm, ThongTinForm, TinhNangForm } from './thiet-lap-forms.tsx';
import { ThuongHieuForm } from './thiet-lap-thuong-hieu.tsx';
import type { GoiApi, MaMuc, TrangThai, Ve } from './thiet-lap-types.ts';
import './thiet-lap.css';

const MA_KHOA = 'THIET_LAP_DANG_KHOA';

/** Mục tuỳ chọn đã có màn riêng đầy đủ — mở thẳng màn đó thay vì làm lại một bản kém hơn. */
const LIEN_KET_NGOAI: Partial<Record<MaMuc, { to: string; nhan: string }>> = {
  'nhan-vien': { to: '/admin/users', nhan: 'Mở màn Nhân viên' },
  'may-in': { to: settingsHref('printers'), nhan: 'Cài & in thử' },
  'gio-ban': { to: settingsHref('online', 'hours'), nhan: 'Đặt giờ' },
};

const NHAN_NUT: Record<MaMuc, { chua: string; roi: string }> = {
  'thong-tin': { chua: 'Điền', roi: 'Sửa' },
  'chu-quan': { chua: 'Tạo', roi: 'Sửa' },
  ban: { chua: 'Tạo bàn', roi: 'Thêm bàn' },
  menu: { chua: 'Nhập Excel', roi: 'Nhập Excel' },
  'ngan-hang': { chua: 'Thêm TK', roi: 'Sửa' },
  'nhan-vien': { chua: 'Thêm', roi: 'Sửa' },
  'may-in': { chua: 'Cài', roi: 'Sửa' },
  'gio-ban': { chua: 'Đặt giờ', roi: 'Sửa' },
  'tinh-nang': { chua: 'Bật / tắt', roi: 'Bật / tắt' },
  'thuong-hieu': { chua: 'Logo, tên, màu', roi: 'Sửa' },
};

const TIEU_DE_SHEET: Partial<Record<MaMuc, string>> = {
  'thong-tin': 'Thông tin quán',
  'chu-quan': 'Tài khoản chủ quán',
  ban: 'Tạo bàn',
  menu: 'Nhập menu từ Excel',
  'ngan-hang': 'Tài khoản ngân hàng',
  'tinh-nang': 'Tính năng',
  'thuong-hieu': 'Thương hiệu',
};

function gio(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function ThietLapPage() {
  const toast = useToast();
  const [ve, setVe] = useState<Ve | null>(null);
  const [tt, setTt] = useState<TrangThai | null>(null);
  const [mo, setMo] = useState<MaMuc | null>(null);

  const khoa = useCallback(() => {
    setVe(null);
    setTt(null);
    setMo(null);
  }, []);

  /** Gọi API kèm vé. Vé hết hạn ở server → khoá màn, ném lỗi để form không báo "đã lưu". */
  const goi: GoiApi = useCallback(
    async (method, url, body) => {
      if (!ve) throw new Error('Màn thiết lập đang khoá.');
      try {
        const r = await api.request({ method, url, data: body, headers: { 'x-thiet-lap': ve.token } });
        return r.data.data;
      } catch (e) {
        const err = extractError(e);
        if (err.code === MA_KHOA) {
          khoa();
          toast.push('error', err.message);
        }
        throw new Error(err.message);
      }
    },
    [ve, khoa, toast],
  );

  const taiLai = useCallback(async () => {
    try {
      const d = (await goi('GET', '/admin/thiet-lap/trang-thai')) as TrangThai;
      setTt(d);
      setVe(d.ve);
    } catch {
      /* goi() đã xử lý trường hợp khoá; lỗi khác giữ màn như cũ */
    }
  }, [goi]);

  // Vừa mở khoá → tải trạng thái lần đầu.
  const daMo = ve !== null;
  useEffect(() => {
    if (daMo && !tt) void taiLai();
  }, [daMo, tt, taiLai]);

  // Hết 15 phút không thao tác → tự khoá, không đợi tới lần bấm sau mới biết.
  useEffect(() => {
    if (!ve) return;
    const t = window.setTimeout(khoa, Math.max(0, ve.het_han - Date.now()));
    return () => window.clearTimeout(t);
  }, [ve, khoa]);

  if (!ve) return <KhoaMan onMo={setVe} />;

  const xongMot = async () => {
    setMo(null);
    await taiLai();
  };

  const batBuoc = tt?.muc.filter((m) => m.bat_buoc) ?? [];
  const tuyChon = tt?.muc.filter((m) => !m.bat_buoc) ?? [];

  return (
    <div className="container tl-page">
      <div className="tl-top">
        <h1 className="tl-title">Thiết lập quán</h1>
        {tt &&
          (tt.san_sang ? (
            <span className="tl-pill is-ok">✓ Sẵn sàng bán</span>
          ) : (
            <span className="tl-pill is-warn">⚠ Còn thiếu {tt.con_thieu} mục bắt buộc</span>
          ))}
        <button type="button" className="tl-lock" onClick={khoa}>
          Khoá lại
        </button>
      </div>
      <p className="tl-sub">Mở khoá bằng mật khẩu của {ve.boi}. Tự khoá sau 15 phút không thao tác.</p>

      {!tt ? (
        <p className="tl-sub">Đang tải…</p>
      ) : (
        <div className="tl-cols">
          <div className="tl-stack">
            <NhomMuc tieuDe="Bắt buộc" muc={batBuoc} onMo={setMo} />
            <NhomMuc tieuDe="Tuỳ chọn · làm sau cũng được" muc={tuyChon} onMo={setMo} />
          </div>
          <aside className="tl-card tl-log">
            <h2 className="tl-h">Nhật ký thay đổi</h2>
            {tt.nhat_ky.length === 0 ? (
              <p className="tl-log__empty">Chưa có thay đổi nào.</p>
            ) : (
              <ol>
                {tt.nhat_ky.map((l) => (
                  <li key={l.id}>
                    <time>{gio(l.ts_ms)}</time>
                    <span className="tl-log__what">{l.mo_ta}</span>
                    {l.ai && <span className="tl-log__who">bởi {l.ai}</span>}
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      )}

      {tt && mo && TIEU_DE_SHEET[mo] && (
        <Sheet title={TIEU_DE_SHEET[mo]!} onClose={() => setMo(null)} giuaKhiRong>
          <div className="tl-sheet">
            {mo === 'thong-tin' && <ThongTinForm tt={tt} goi={goi} onXong={xongMot} />}
            {mo === 'chu-quan' && <ChuQuanForm tt={tt} goi={goi} onXong={xongMot} />}
            {mo === 'ban' && <BanForm tt={tt} goi={goi} onXong={xongMot} />}
            {mo === 'ngan-hang' && <NganHangForm tt={tt} goi={goi} onXong={xongMot} />}
            {mo === 'menu' && <MenuForm goi={goi} onXong={xongMot} />}
            {mo === 'tinh-nang' && <TinhNangForm tt={tt} goi={goi} onDoi={taiLai} />}
            {mo === 'thuong-hieu' && <ThuongHieuForm tt={tt} goi={goi} onXong={xongMot} />}
          </div>
        </Sheet>
      )}
    </div>
  );
}

function NhomMuc({ tieuDe, muc, onMo }: { tieuDe: string; muc: TrangThai['muc']; onMo: (m: MaMuc) => void }) {
  return (
    <section className="tl-card">
      <h2 className="tl-h">{tieuDe}</h2>
      {muc.map((m) => {
        const ngoai = LIEN_KET_NGOAI[m.ma];
        const nhan = m.xong ? NHAN_NUT[m.ma].roi : NHAN_NUT[m.ma].chua;
        const loai = !m.bat_buoc ? 'opt' : m.xong ? 'ok' : 'warn';
        const nutChinh = m.bat_buoc && !m.xong;
        return (
          <div className="tl-row" key={m.ma}>
            <span className={`tl-dot is-${loai}`} aria-hidden="true">
              {loai === 'ok' ? '✓' : loai === 'warn' ? '!' : '–'}
            </span>
            <span className="tl-row__name">{m.ten}</span>
            <span className={`tl-row__sum${loai === 'warn' ? ' is-warn' : ''}`}>{m.tom_tat}</span>
            {ngoai ? (
              <Link className="tl-act" to={ngoai.to}>
                {ngoai.nhan}
              </Link>
            ) : (
              <button type="button" className={`tl-act${nutChinh ? ' is-pri' : ''}`} onClick={() => onMo(m.ma)}>
                {nhan}
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}

function KhoaMan({ onMo }: { onMo: (v: Ve) => void }) {
  const [mk, setMk] = useState('');
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, setDang] = useState(false);

  const gui = async (e: FormEvent) => {
    e.preventDefault();
    if (!mk) return;
    setDang(true);
    setLoi(null);
    try {
      const r = await api.post('/admin/thiet-lap/mo-khoa', { password: mk });
      onMo(r.data.data as Ve);
    } catch (err) {
      const x = extractError(err);
      // 429 đi qua GlobalExceptionFilter thành AUTH_RATE_LIMITED kèm câu "đợi 15 phút" của màn đăng
      // nhập — sai với giới hạn 5 phút của màn này, nên thay câu tại đây.
      setLoi(x.code === 'AUTH_RATE_LIMITED' ? 'Nhập sai nhiều lần quá. Đợi 5 phút rồi thử lại.' : x.message);
    } finally {
      setDang(false);
    }
  };

  return (
    <div className="container tl-page tl-lockscreen">
      <form className="tl-card tl-unlock" onSubmit={gui}>
        <h1 className="tl-title">Nhập mật khẩu admin</h1>
        <p className="tl-sub">Dùng mật khẩu của bất kỳ tài khoản admin nào của quán.</p>
        <label className="tl-field">
          <span>Mật khẩu</span>
          <input
            id="tl-mat-khau"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={mk}
            onChange={(e) => setMk(e.target.value)}
          />
        </label>
        {loi && <p className="tl-err" role="alert">{loi}</p>}
        <p className="tl-hint">Mở khoá 15 phút. Rời màn là khoá lại.</p>
        <div className="tl-btns">
          <Link to="/" className="tl-act">
            Quay lại
          </Link>
          <button type="submit" className="tl-act is-pri" disabled={dang || !mk}>
            {dang ? 'Đang kiểm…' : 'Mở khoá'}
          </button>
        </div>
      </form>
    </div>
  );
}
