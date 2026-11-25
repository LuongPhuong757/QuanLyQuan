// Phiên mở khoá màn "Thiết lập quán" (docs/THIET-LAP-QUAN-SPEC.md §2, D-03).
//
// Vì sao không dùng lại JWT đăng nhập: JWT chứng minh "người này đã đăng nhập", còn màn thiết lập
// đòi thêm "vừa gõ lại mật khẩu của một admin trong 15 phút qua" — máy tính bảng ở quầy luôn đăng
// nhập sẵn bằng tài khoản admin, ai đi ngang cũng cầm được nó. Vé mở khoá là một chuỗi ký HMAC
// riêng, sống 15 phút, GẮN với đúng phiên JWT đã xin nó (`sub`): chép vé sang máy khác đăng nhập
// tài khoản khác là vô dụng.
//
// Module thuần (chỉ `node:crypto`) để test không cần Nest/DB.
import { createHmac, timingSafeEqual } from 'node:crypto';

/** 15 phút, gia hạn mỗi lần màn tải lại trạng thái (sau mỗi lần lưu). */
export const MO_KHOA_TTL_MS = 15 * 60 * 1000;

export type VeMoKhoa = {
  /** Người đang đăng nhập (JWT `sub`) — vé chỉ dùng được với đúng phiên này. */
  sub: string;
  /** Admin có mật khẩu vừa được gõ — để ghi nhật ký "mở khoá bằng mật khẩu của ai". */
  boi: string;
  /** Hết hạn, ms. */
  exp: number;
};

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function chuKy(payload: string, secret: string): string {
  // Hậu tố riêng: cùng JWT_SECRET nhưng không thể lấy chữ ký JWT ra làm vé và ngược lại.
  return b64url(createHmac('sha256', `${secret}:thiet-lap`).update(payload).digest());
}

export function kyVe(ve: VeMoKhoa, secret: string): string {
  const payload = b64url(Buffer.from(JSON.stringify(ve), 'utf8'));
  return `${payload}.${chuKy(payload, secret)}`;
}

/** Trả vé nếu hợp lệ, còn hạn và đúng người đang đăng nhập; ngược lại `null`. */
export function docVe(token: string | undefined, secret: string, nowMs: number, sub: string): VeMoKhoa | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(chuKy(payload, secret));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  let ve: VeMoKhoa;
  try {
    ve = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as VeMoKhoa;
  } catch {
    return null;
  }
  if (typeof ve.exp !== 'number' || ve.exp <= nowMs) return null;
  if (ve.sub !== sub) return null;
  return ve;
}
