// Logo quán: 1 ảnh tải lên → 5 bản dùng ở mọi nơi (docs/THIET-LAP-QUAN-SPEC.md §8c, T-03).
//
//   vuong-512.png  nền trong suốt — logo thanh bên, màn đăng nhập, đầu trang khách (bản lớn)
//   vuong-180.png  nền TRẮNG — icon "Thêm vào màn hình chính" (iPhone tô ĐEN chỗ trong suốt)
//   vuong-32.png   nền trong suốt — biểu tượng tab trình duyệt
//   den-trang.png  1-bit trên nền trắng — đầu hoá đơn in nhiệt (máy chỉ in được đen/trắng)
//   chia-se.jpg    1200×630 nền màu trang khách + logo giữa — ảnh khi dán link lên Facebook/Zalo
//
// Ảnh được thu VỪA khung vuông (contain), không cắt: chủ quán lớn tuổi tải ảnh chụp tờ menu là
// thường, cắt tự động dễ mất chữ. Lề trống thì trong suốt / trắng.
//
// Cùng luật an toàn với ảnh món (menu-image.ts): đọc từ buffer trong RAM, `.rotate()` áp EXIF rồi
// xuất định dạng mới (không mang EXIF/GPS theo), tên file do server đặt.
import { BadRequestException } from '@nestjs/common';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

export const THU_MUC_LOGO = 'uploads/thuong-hieu';
export const LOGO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']);
export const LOGO_MAX_BYTES = 10 * 1024 * 1024;
/** Nhỏ hơn thế này thì icon màn hình chính 180px sẽ vỡ hạt. */
const CANH_NHO_NHAT = 64;

const TRONG = { r: 0, g: 0, b: 0, alpha: 0 };
const TRANG = { r: 255, g: 255, b: 255, alpha: 1 };

function vuong(src: Buffer, size: number, nen: typeof TRONG) {
  return sharp(src).resize(size, size, { fit: 'contain', background: nen });
}

/** Ghi file tạm rồi đổi tên: người đang tải trang không bao giờ đọc phải nửa file. */
async function ghi(ten: string, data: Buffer): Promise<void> {
  const dich = join(THU_MUC_LOGO, ten);
  await writeFile(`${dich}.tmp`, data);
  await rename(`${dich}.tmp`, dich);
}

/** Ảnh chia sẻ 1200×630: nền màu trang khách, logo trên thẻ trắng bo góc ở giữa. */
async function dungAnhChiaSe(goc512: Buffer, mauKhach: string): Promise<Buffer> {
  const the = await sharp({ create: { width: 420, height: 420, channels: 4, background: TRANG } })
    .composite([
      { input: Buffer.from('<svg width="420" height="420"><rect width="420" height="420" rx="48" ry="48"/></svg>'), blend: 'dest-in' },
      { input: await sharp(goc512).resize(360, 360, { fit: 'contain', background: TRONG }).png().toBuffer(), top: 30, left: 30 },
    ])
    .png()
    .toBuffer();
  return sharp({ create: { width: 1200, height: 630, channels: 3, background: mauKhach } })
    .composite([{ input: the, top: 105, left: 390 }])
    .jpeg({ quality: 85 })
    .toBuffer();
}

/** Nhận ảnh gốc, ghi đủ 5 bản. Ném 400 nếu ảnh không đọc được / quá nhỏ. */
export async function xuLyLogo(buffer: Buffer, mauKhach: string): Promise<void> {
  let goc: Buffer;
  try {
    // Chuẩn hoá một lần: xoay theo EXIF, về PNG — mọi bản sau đọc từ đây.
    goc = await sharp(buffer).rotate().png().toBuffer();
    const meta = await sharp(goc).metadata();
    if ((meta.width ?? 0) < CANH_NHO_NHAT || (meta.height ?? 0) < CANH_NHO_NHAT) {
      throw new BadRequestException({
        code: 'THIET_LAP_LOGO_NHO',
        message: `Ảnh logo nhỏ quá (cần ít nhất ${CANH_NHO_NHAT}×${CANH_NHO_NHAT} điểm ảnh).`,
      });
    }
  } catch (e) {
    if (e instanceof BadRequestException) throw e;
    throw new BadRequestException({ code: 'THIET_LAP_LOGO_HONG', message: 'Không đọc được ảnh này, chọn ảnh khác nhé.' });
  }

  await mkdir(THU_MUC_LOGO, { recursive: true });
  const v512 = await vuong(goc, 512, TRONG).png().toBuffer();
  const v180 = await vuong(goc, 180, TRANG).flatten({ background: TRANG }).png().toBuffer();
  const v32 = await vuong(goc, 32, TRONG).png().toBuffer();
  // Đen trắng: trải phẳng trên nền trắng TRƯỚC khi chuyển xám — không thì vùng trong suốt ra đen.
  const denTrang = await vuong(goc, 256, TRANG)
    .flatten({ background: TRANG })
    .greyscale()
    .threshold(160)
    .png()
    .toBuffer();
  const chiaSe = await dungAnhChiaSe(v512, mauKhach);

  await ghi('vuong-512.png', v512);
  await ghi('vuong-180.png', v180);
  await ghi('vuong-32.png', v32);
  await ghi('den-trang.png', denTrang);
  await ghi('chia-se.jpg', chiaSe);
}

/** Đổi màu trang khách thì ảnh chia sẻ (nền màu) phải dựng lại. Chưa có logo → không làm gì. */
export async function dungLaiAnhChiaSe(mauKhach: string): Promise<boolean> {
  try {
    const v512 = await readFile(join(THU_MUC_LOGO, 'vuong-512.png'));
    await ghi('chia-se.jpg', await dungAnhChiaSe(v512, mauKhach));
    return true;
  } catch {
    return false;
  }
}

/** Logo đen trắng cho hoá đơn in. Phiên bản 0 (chưa tải) hoặc file mất → null = in như cũ. */
export async function docLogoHoaDon(phienBan: number): Promise<Buffer | null> {
  if (!phienBan) return null;
  try {
    return await readFile(join(THU_MUC_LOGO, 'den-trang.png'));
  } catch {
    return null;
  }
}
