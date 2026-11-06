// Tuổi món = khách đã chờ bao lâu. Dùng CHUNG cho màn Bếp (KDS) và màn Order
// (drawer bàn) — bồi bàn và bếp phải đọc cùng một ngưỡng, nếu lệch thì bồi bàn
// thấy "đỏ" mà bếp thấy "bình thường" là hai bên tranh nhau vô ích.
//
// Luôn tính từ `created_at` (lúc khách gọi món), KHÔNG dùng `updated_at`:
// updated_at reset mỗi lần đổi state (KITCHEN → COOKING → READY) nên đồng hồ sẽ
// nhảy về 0 và che mất món đã chờ lâu.

export const AGE_WARN_MS = 10 * 60_000; // 10ph → vàng đậm (cảnh báo)
export const AGE_CRITICAL_MS = 20 * 60_000; // 20ph → đỏ đậm (khẩn cấp)

/** Màu chữ theo tuổi món. */
export function ageColor(created_at: number): string {
  const age = Date.now() - created_at;
  if (age > AGE_CRITICAL_MS) return '#b91c1c'; // đỏ-700 đậm — quá 20ph (gấp)
  if (age > AGE_WARN_MS) return '#ca8a04'; // vàng-600 đậm — quá 10ph (cảnh báo)
  return '#111827'; // đen — món mới (< 10ph)
}

/** Số phút đã chờ (làm tròn xuống, không âm nếu lệch giờ client/server). */
export function ageMinutes(created_at: number): number {
  return Math.max(0, Math.floor((Date.now() - created_at) / 60_000));
}

/**
 * Thời gian chờ / ngồi thành chữ ngắn — MỘT kiểu cho mọi màn (chủ repo chốt 2026-11-06):
 * `54p`, `1g05`, `2g00`, `25g05`.
 *
 * Trước đó mỗi chỗ một kiểu ("25h8p" ở dải trên, "25 giờ 05" trên thẻ bàn, "54 phút" thẻ khác) —
 * nhân viên đi qua lại giữa lưới bàn, drawer, Bếp phải dịch lại trong đầu. "g" thay "h" vì là chữ
 * Việt; phút luôn 2 chữ số sau giờ để đọc như đồng hồ (1g05, không phải 1g5).
 */
export function formatAge(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes));
  if (m < 60) return `${m}p`;
  const h = Math.floor(m / 60);
  return `${h}g${String(m % 60).padStart(2, '0')}`;
}

/** Đã quá ngưỡng khẩn cấp → bồi bàn nên ưu tiên hoặc báo khách. */
export function isAgeCritical(created_at: number): boolean {
  return Date.now() - created_at > AGE_CRITICAL_MS;
}
