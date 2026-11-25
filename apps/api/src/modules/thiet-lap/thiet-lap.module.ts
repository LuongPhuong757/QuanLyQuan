import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { ThietLapController } from './thiet-lap.controller.js';
import { ThuongHieuCongKhaiController } from './thuong-hieu-cong-khai.controller.js';

// Màn "Thiết lập quán" (docs/THIET-LAP-QUAN-SPEC.md). Không có entity riêng: đọc/ghi qua
// DataSource vào các bảng của module khác, nên không cần TypeOrmModule.forFeature và không
// đụng `data-source.ts`.
@Module({
  imports: [AuthModule, AuditModule, SettingsModule],
  controllers: [ThietLapController, ThuongHieuCongKhaiController],
})
export class ThietLapModule {}
