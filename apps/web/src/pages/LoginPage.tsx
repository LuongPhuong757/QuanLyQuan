import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, extractError } from '../lib/api.ts';
import { useAuth, defaultLandingPath, type Role } from '../lib/auth-context.tsx';
import { useToast } from '../components/Toast.tsx';
import { PasswordInput } from '../components/PasswordInput.tsx';
import { STORE_LOGO_URL, STORE_NAME } from '../lib/store-brand.ts';

export function LoginPage() {
  const { refresh } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errU, setErrU] = useState<string | null>(null);
  const [errP, setErrP] = useState<string | null>(null);

  const validateUsername = () => setErrU(username.trim() ? null : 'Bắt buộc nhập tên đăng nhập');
  const validatePassword = () => setErrP(password.length >= 8 ? null : 'Tối thiểu 8 ký tự');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    validateUsername();
    validatePassword();
    if (!username.trim() || password.length < 8) return;

    setSubmitting(true);
    try {
      await api.post('/auth/login', { username, password });
      const me = await api.get<{ data: { role: Role | null; is_owner: boolean } }>('/auth/me');
      await refresh();
      toast.push('success', `Đăng nhập thành công, chào bạn!`);
      // Redirect theo role: admin/order → /orders, kitchen → /kitchen
      const role = (me.data?.data?.role ?? (me.data?.data?.is_owner ? 'admin' : null)) as Role | null;
      navigate(defaultLandingPath(role));
    } catch (err) {
      const e = extractError(err);
      toast.push('error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="card login-card">
        <div className="login-brand">
          {/* Ảnh trang trí đi kèm tên quán ngay bên dưới → alt rỗng để trình đọc màn hình không đọc lặp. */}
          <img className="login-logo" src={STORE_LOGO_URL} alt="" width={72} height={72} />
          <h1 className="login-title">{STORE_NAME}</h1>
          {/* "Trang quản lý" phải có ngay màn đầu: nhân viên mở cả trang khách lẫn trang này
              trên cùng máy — cùng lý do header sau đăng nhập ghi "QUẢN TRỊ" (App.tsx). */}
          <p className="login-sub">Trang quản lý - Đăng nhập để vào làm việc</p>
        </div>

        <form onSubmit={submit} noValidate>
          <div className="row">
            <label htmlFor="username">Tên đăng nhập</label>
            {/* KHÔNG đổi thành "Số điện thoại"/inputMode="tel": tên đăng nhập là chuỗi tự do
                (chủ quán mặc định `admin`, nhân viên kiểu `nva` — xem AdminUsersPage). Bàn phím
                số sẽ khiến không gõ được "admin" trên điện thoại.
                Tắt tự viết hoa/tự sửa: iOS biến "admin" thành "Admin" → báo sai mật khẩu dù gõ đúng. */}
            <input
              id="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={validateUsername}
              aria-invalid={errU ? 'true' : undefined}
              aria-describedby={errU ? 'username-err' : undefined}
            />
            {errU && (
              <div className="field-error" id="username-err">
                {errU}
              </div>
            )}
          </div>

          <PasswordInput
            id="password"
            label="Mật khẩu"
            value={password}
            onChange={setPassword}
            onBlur={validatePassword}
            error={errP || undefined}
            autoComplete="current-password"
          />

          <button
            type="submit"
            className="login-submit"
            disabled={submitting || !username.trim() || password.length < 8}
          >
            {submitting && <span className="spinner" />}
            Đăng nhập
          </button>
        </form>
        {/* Thay link "Nhập mã khôi phục" bằng hướng dẫn liên hệ admin (2026-11-06, chủ repo yêu cầu):
            nhân viên quên mật khẩu thì admin đặt lại ở màn Nhân sự. Route /recover VẪN GIỮ — đường
            cứu duy nhất khi chính chủ quán quên mật khẩu (mã khôi phục cấp lúc /setup); gõ thẳng URL. */}
        <p className="login-foot">Quên mật khẩu - Liên hệ admin để được cấp lại</p>
      </div>
    </div>
  );
}
