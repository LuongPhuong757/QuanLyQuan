// Kênh gửi OTP THẬT (2026-08-06) — bản cài `OtpSender` đẩy mã qua `SMS_CHANNEL` của module
// thông báo. Không tự gọi API eSMS ở đây: `EsmsChannel` đã là đường ra SMS duy nhất của hệ
// thống (M2.D-63), thêm đường thứ hai là có 2 chỗ giữ credential và 2 chỗ phải sửa khi đổi
// nhà cung cấp.
import { Inject, Injectable, Logger, Optional, ServiceUnavailableException } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service.js';
import { SMS_CHANNEL, type SmsChannel } from '../notifications/channels/sms-channel.js';
import { buildOtpSms, isUsableTemplate, maskPhone } from './otp-sms.js';
import type { OtpSender } from './otp-sender.js';

@Injectable()
export class SmsOtpSender implements OtpSender {
  private readonly logger = new Logger(SmsOtpSender.name);

  constructor(
    @Inject(SMS_CHANNEL) private readonly channel: SmsChannel,
    // Tên quán cho chỗ {quan} trong mẫu (2026-11-19). Optional: test dựng sender không có DB.
    @Optional() private readonly settings?: SettingsService,
  ) {}

  /**
   * Gửi mã, THROW khi kênh báo lỗi.
   *
   * Khác `LogOtpSender` (không bao giờ lỗi): ở đây gửi hỏng là chuyện có thật (hết tiền tài
   * khoản eSMS, sai mẫu, mạng chết). `requestOtp` đã insert row TRƯỚC rồi mới gọi sendCode
   * (xem docblock `otp.ts`) nên throw ở đây vẫn ăn quota — đúng ý đồ: khách thấy lỗi rõ ràng
   * và chờ hết cooldown 60s bấm lại, còn hơn thấy "đã gửi mã" rồi ngồi đợi một tin không tới.
   */
  /** Tên quán trong cài đặt; đọc hỏng thì rơi về mặc định của buildOtpSms — mất tên quán còn hơn
   *  không gửi được mã. */
  private async tenQuan(): Promise<string | undefined> {
    try {
      return (await this.settings?.readAll())?.store_name || undefined;
    } catch {
      return undefined;
    }
  }

  async send(phone: string, code: string): Promise<void> {
    const rawTemplate = process.env.OTP_SMS_TEMPLATE;
    // Rỗng = "chưa đặt" (docker-compose truyền biến rỗng khi .env không khai) → im lặng dùng
    // mẫu mặc định. Chỉ cảnh báo khi chủ quán ĐÃ điền mà điền sai.
    if (rawTemplate && !isUsableTemplate(rawTemplate)) {
      this.logger.warn(
        `OTP_SMS_TEMPLATE thiếu "{code}" nên bị bỏ qua — đang dùng mẫu mặc định. Sửa lại env cho khớp mẫu eSMS đã duyệt.`,
      );
    }

    const result = await this.channel.send({ to: phone, message: buildOtpSms(code, rawTemplate, await this.tenQuan()) });
    if (result.ok) return;

    // ⚠ KHÔNG bao giờ đưa `code` vào log/exception: mã là bí mật, khác hẳn LogOtpSender (bản
    // mock cố tình in mã ra log để thử luồng).
    this.logger.error(`[OTP] Gửi mã tới ${maskPhone(phone)} THẤT BẠI: ${result.error}`);
    throw new ServiceUnavailableException({
      code: 'OTP_SEND_FAILED',
      message: 'Hiện chưa gửi được mã xác minh. Vui lòng thử lại sau ít phút hoặc gọi trực tiếp cho quán.',
    });
  }
}
