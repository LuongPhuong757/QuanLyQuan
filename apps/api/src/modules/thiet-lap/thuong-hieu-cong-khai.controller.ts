// Thương hiệu công khai (2026-11-19, spec §8c): tên, tên ngắn, 2 màu, phiên bản logo, linh vật.
//
// KHÔNG cần đăng nhập: màn đăng nhập và trang khách cũng phải hiện đúng tên + logo quán. Không có
// gì bí mật ở đây — mọi trường đều đã hiện công khai trên trang khách.
//
// Hai đường cùng một câu trả lời, vì proxy dev là danh sách tiền tố CỨNG và hai app khai khác
// nhau (CLAUDE.md §5): trang khách chỉ có `/api`, trang quản lý chỉ có tiền tố trần (`/auth`…).
import { Controller, Get } from '@nestjs/common';
import type { ThuongHieuCongKhai } from '@order/schemas';
import { SettingsService } from '../settings/settings.service.js';
import { thuongHieuTuCaiDat } from './html-thuong-hieu.js';

@Controller()
export class ThuongHieuCongKhaiController {
  constructor(private readonly settings: SettingsService) {}

  private async doc(): Promise<{ data: ThuongHieuCongKhai }> {
    return { data: thuongHieuTuCaiDat(await this.settings.readAll()) };
  }

  @Get('api/public/thuong-hieu')
  choTrangKhach() {
    return this.doc();
  }

  @Get('auth/thuong-hieu')
  choTrangQuanLy() {
    return this.doc();
  }
}
