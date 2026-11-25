// Màn "Thiết lập quán" — docs/THIET-LAP-QUAN-SPEC.md.
//
// Một chỗ để chủ repo dựng xong một quán mới: thông tin quán, tài khoản chủ quán, bàn, menu (Excel),
// tài khoản ngân hàng, công tắc tính năng. Mọi route (trừ `mo-khoa`) đòi VÉ MỞ KHOÁ trong header
// `x-thiet-lap` — vé có sau khi gõ lại mật khẩu của bất kỳ admin nào (D-03, xem `mo-khoa.ts`).
//
// Tiền tố `/admin/...` có chủ đích: proxy dev của apps/web là danh sách tiền tố CỨNG
// (vite.config.ts) và `/admin` đã nằm trong đó — controller mới không cần sửa proxy.
//
// Nhật ký: tự ghi `audit_logs` với `target_kind = 'thiet_lap'` kèm trước/sau (D-07), và
// AuditInterceptor BỎ QUA các route này (xem audit.interceptor.ts) — không thì mỗi lần lưu ra hai
// dòng, một dòng là response thô.
import {
  Allow,
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Request } from 'express';
import bcrypt from 'bcrypt';
import { DataSource, In, Not } from 'typeorm';
import {
  BANG_MAU_ADMIN,
  BANG_MAU_KHACH,
  bankNameFromBin,
  trongBang,
  validatePaymentQrDraft,
  VIETQR_BANKS,
} from '@order/schemas';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { AuthService } from '../auth/auth.service.js';
import { User } from '../auth/entities/user.entity.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditLog } from '../audit/entities/audit-log.entity.js';
import { SettingsService } from '../settings/settings.service.js';
import { PaymentQrAccount } from '../settings/entities/payment-qr-account.entity.js';
import { RestaurantTable } from '../tables/entities/restaurant-table.entity.js';
import { planBulkTables } from '../tables/table-kind.js';
import { MenuItem } from '../menu/entities/menu-item.entity.js';
import { MenuGroup } from '../menu/entities/menu-group.entity.js';
import { toTitleCase } from '../../common/text.js';
import { docVe, kyVe, MO_KHOA_TTL_MS, type VeMoKhoa } from './mo-khoa.js';
import {
  khoaTen,
  maChuaDung,
  phanLoaiMenu,
  sinhMaMon,
  slugNhom,
  TOI_DA_DONG,
  type DongExcel,
  type KetQuaPhanLoai,
} from './menu-excel.js';
import { tinhTrangThai } from './trang-thai.js';
import { thuongHieuTuCaiDat } from './html-thuong-hieu.js';
import { dungLaiAnhChiaSe, LOGO_MAX_BYTES, LOGO_MIMES, xuLyLogo } from './logo.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret-CHANGE-ME';
const HEADER_VE = 'x-thiet-lap';
const TARGET_KIND = 'thiet_lap';
const SO_DONG_NHAT_KY = 20;
const TOI_DA_BAN_MOT_LAN = 100;

// ── DTO ──────────────────────────────────────────────────────────────────────

class MoKhoaDto {
  @IsString() @MinLength(1) @MaxLength(128) password!: string;
}

class ThongTinDto {
  // 64: cùng giới hạn với màn Cài đặt (settings.controller.ts) — tên in trên đầu hoá đơn.
  @IsString() @MinLength(1) @MaxLength(64) store_name!: string;
  @IsString() @MinLength(1) @MaxLength(20) store_phone!: string;
  @IsOptional() @IsString() @MaxLength(255) store_address?: string;
}

class ChuQuanDto {
  @IsString() @MinLength(1) @MaxLength(128) full_name!: string;
  @IsString() @MinLength(3) @MaxLength(64) username!: string;
  /** Bỏ trống = giữ mật khẩu cũ. Bắt buộc khi quán chưa có chủ quán. */
  @IsOptional() @IsString() @MinLength(8) @MaxLength(128) password?: string;
}

class BanDto {
  @IsInt() @Min(1) @Max(999) tu!: number;
  @IsInt() @Min(1) @Max(999) den!: number;
}

class NganHangDto {
  @IsString() @MinLength(6) @MaxLength(16) bank_bin!: string;
  /** Chỉ cần khi BIN không có trong bảng tra (ngân hàng lạ). */
  @IsOptional() @IsString() @MaxLength(64) bank_name?: string;
  @IsString() @MinLength(4) @MaxLength(32) account_no!: string;
  @IsString() @MinLength(1) @MaxLength(128) account_name!: string;
  @IsOptional() @IsString() @MaxLength(128) label?: string;
}

class DongExcelDto {
  @IsInt() @Min(1) dong!: number;
  @IsOptional() @IsString() @MaxLength(64) ma?: string;
  @IsOptional() @IsString() @MaxLength(256) ten?: string;
  /** Số hoặc chuỗi ("45.000") — `docGia` ở menu-excel.ts mới là nơi kiểm, để báo lỗi theo dòng. */
  @IsOptional() @Allow() gia?: number | string;
  @IsOptional() @IsString() @MaxLength(128) nhom?: string;
  @IsOptional() @IsString() @MaxLength(64) don_vi?: string;
}

class MenuDto {
  @IsArray()
  @ArrayMaxSize(TOI_DA_DONG)
  @ValidateNested({ each: true })
  @Type(() => DongExcelDto)
  dongs!: DongExcelDto[];
}

class ThuongHieuDto {
  // 64: cùng giới hạn tên quán ở màn Cài đặt — tên in trên đầu hoá đơn.
  @IsString() @MinLength(1) @MaxLength(64) ten!: string;
  /** Tab trình duyệt + chữ đầu trang khách. Rỗng = dùng tên đầy đủ. */
  @IsString() @MaxLength(32) ten_ngan!: string;
  @IsString() @MaxLength(7) mau_admin!: string;
  @IsString() @MaxLength(7) mau_khach!: string;
  @IsBoolean() linh_vat!: boolean;
}

class TinhNangDto {
  @IsOptional() @IsBoolean() online_ordering_enabled?: boolean;
  @IsOptional() @IsBoolean() table_ordering_enabled?: boolean;
  @IsOptional() @IsBoolean() printing_enabled?: boolean;
}

const TEN_TINH_NANG = {
  online_ordering_enabled: 'Đặt online',
  table_ordering_enabled: 'Gọi món tại bàn',
  printing_enabled: 'In',
} as const;
type KhoaTinhNang = keyof typeof TEN_TINH_NANG;

// ── helpers ──────────────────────────────────────────────────────────────────

function nguoiDung(req: Request): NonNullable<Request['user']> {
  // AdminGuard đã chạy nên luôn có; giữ một chỗ ép kiểu thay vì rải `!` khắp file.
  return req.user!;
}

function soTkDayDu(row: Pick<PaymentQrAccount, 'bank_name' | 'account_no' | 'account_name'>) {
  return { bank_name: row.bank_name, account_no: row.account_no, account_name: row.account_name };
}

@Controller('admin/thiet-lap')
@UseGuards(AdminGuard)
export class ThietLapController {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  /** Đòi vé mở khoá còn hạn, gắn đúng người đang đăng nhập. */
  private canVe(req: Request): VeMoKhoa {
    const ve = docVe(req.header(HEADER_VE), SECRET, Date.now(), nguoiDung(req).sub);
    if (!ve) {
      // Mã ngoài FRIENDLY_VN để giữ nguyên câu (xem GlobalExceptionFilter).
      throw new ForbiddenException({
        code: 'THIET_LAP_DANG_KHOA',
        message: 'Màn thiết lập đã khoá. Nhập lại mật khẩu admin để mở.',
      });
    }
    return ve;
  }

  private async ghi(
    req: Request,
    action: string,
    moTa: string,
    truoc: unknown = null,
    sau: Record<string, unknown> = {},
  ): Promise<void> {
    const u = req.user;
    try {
      await this.audit.write({
        actor_id: u?.sub ?? null,
        actor_name: u?.full_name ?? u?.name ?? null,
        ip: req.ip || 'unknown',
        ts_ms: Date.now(),
        action_kind: `thiet_lap.${action}`,
        target_kind: TARGET_KIND,
        target_id: null,
        before_json: truoc,
        after_json: { mo_ta: moTa, ...sau },
        request_id: req.request_id ?? null,
      });
    } catch (err) {
      // Ghi nhật ký hỏng không được làm hỏng thao tác chính — cùng chính sách AuditEventHandler.
      // eslint-disable-next-line no-console
      console.error('thiet-lap: ghi nhật ký lỗi', err);
    }
  }

  private veMoi(req: Request, boi: string) {
    const het_han = Date.now() + MO_KHOA_TTL_MS;
    return { token: kyVe({ sub: nguoiDung(req).sub, boi, exp: het_han }, SECRET), het_han, boi };
  }

  // ── Mở khoá ────────────────────────────────────────────────────────────────

  /** POST /admin/thiet-lap/mo-khoa — so mật khẩu với MỌI admin đang hoạt động (D-03).
   *  Chặn dò: 5 lần / 5 phút, như `/auth/login`. */
  @Post('mo-khoa')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  async moKhoa(@Body() dto: MoKhoaDto, @Req() req: Request) {
    const admins = await this.ds.getRepository(User).find({
      where: [
        { is_active: true, is_owner: true },
        { is_active: true, role: 'admin' },
      ],
    });
    let khop: User | undefined;
    for (const a of admins) {
      if (await bcrypt.compare(dto.password, a.password_hash)) {
        khop = a;
        break;
      }
    }
    if (!khop) {
      await this.ghi(req, 'mo_khoa_sai', 'Nhập sai mật khẩu mở khoá màn thiết lập');
      throw new BadRequestException({
        code: 'THIET_LAP_SAI_MAT_KHAU',
        message: 'Mật khẩu không khớp tài khoản admin nào của quán.',
      });
    }
    const boi = khop.full_name || khop.username;
    await this.ghi(req, 'mo_khoa', `Mở khoá màn thiết lập (mật khẩu của ${boi})`);
    return { data: this.veMoi(req, boi) };
  }

  // ── Trạng thái ─────────────────────────────────────────────────────────────

  /** GET /admin/thiet-lap/trang-thai — 9 mục + chi tiết để điền form + 20 dòng nhật ký.
   *  Trả kèm vé MỚI: màn gọi lại sau mỗi lần lưu, nên vé tự gia hạn khi còn đang làm. */
  @Get('trang-thai')
  async trangThai(@Req() req: Request) {
    const ve = this.canVe(req);
    const s = await this.settings.readAll();
    const users = this.ds.getRepository(User);
    const bans = this.ds.getRepository(RestaurantTable);
    const [chuQuan, banDangDung, monDangBan, nganHang, soNhanVien, nhatKy] = await Promise.all([
      users.findOne({ where: { is_owner: true }, order: { created_at: 'ASC' } }),
      bans.find({ where: { kind: 'dine-in', is_active: true }, select: ['code'] }),
      // Đếm nhóm theo MÓN đang bán, không đếm bảng nhóm: DB mới có sẵn vài nhóm mẫu chưa có món
      // nào ("3 món · 7 nhóm" là nói sai).
      this.ds.getRepository(MenuItem).find({ where: { is_active: true }, select: ['group'] }),
      this.ds.getRepository(PaymentQrAccount).find({
        where: { is_active: true, kind: 'BANK' },
        order: { sort_order: 'ASC', created_at: 'ASC' },
      }),
      users.count({ where: { is_active: true, is_owner: false } }),
      this.ds.getRepository(AuditLog).find({
        where: { target_kind: TARGET_KIND },
        order: { ts_ms: 'DESC' },
        take: SO_DONG_NHAT_KY,
      }),
    ]);
    const tt = tinhTrangThai({
      store_name: s.store_name,
      store_phone: s.store_phone,
      store_address: s.store_address,
      chu_quan: chuQuan ? { full_name: chuQuan.full_name, username: chuQuan.username } : null,
      so_ban: banDangDung.length,
      so_mon: monDangBan.length,
      so_nhom: new Set(monDangBan.map((m) => m.group)).size,
      ngan_hang: nganHang,
      so_nhan_vien: soNhanVien,
      printing_enabled: s.printing_enabled,
      printer_host: s.printer_host,
      printer_connection: s.printer_connection,
      open_hours_count: Array.isArray(s.open_hours) ? s.open_hours.length : 0,
      online_ordering_enabled: s.online_ordering_enabled,
      table_ordering_enabled: s.table_ordering_enabled,
      thuong_hieu: thuongHieuTuCaiDat(s),
    });
    const soBanLonNhat = banDangDung.reduce((m, t) => Math.max(m, Number(t.code.replace(/\D/g, '')) || 0), 0);
    return {
      data: {
        ...tt,
        chi_tiet: {
          thong_tin: { store_name: s.store_name, store_phone: s.store_phone, store_address: s.store_address },
          chu_quan: chuQuan ? { full_name: chuQuan.full_name ?? '', username: chuQuan.username } : null,
          ban: { so_ban: banDangDung.length, so_lon_nhat: soBanLonNhat },
          ngan_hang: nganHang.map((r) => ({
            id: r.id,
            label: r.label,
            bank_bin: r.bank_bin,
            bank_name: r.bank_name,
            account_no: r.account_no,
            account_name: r.account_name,
          })),
          tinh_nang: {
            online_ordering_enabled: s.online_ordering_enabled,
            table_ordering_enabled: s.table_ordering_enabled,
            printing_enabled: s.printing_enabled,
          },
          thuong_hieu: thuongHieuTuCaiDat(s),
        },
        bang_mau: { admin: BANG_MAU_ADMIN, khach: BANG_MAU_KHACH },
        ngan_hang_ho_tro: VIETQR_BANKS.map((b) => ({ bin: b.bin, ten: b.short_name })),
        nhat_ky: nhatKy.map((l) => ({
          id: l.id,
          ts_ms: Number(l.ts_ms),
          ai: l.actor_name,
          mo_ta: (l.after_json as { mo_ta?: string } | null)?.mo_ta ?? l.action_kind,
        })),
        ve: this.veMoi(req, ve.boi),
      },
    };
  }

  // ── 1. Thông tin quán ──────────────────────────────────────────────────────

  @Put('thong-tin')
  async thongTin(@Body() dto: ThongTinDto, @Req() req: Request) {
    this.canVe(req);
    const s = await this.settings.readAll();
    const truoc = { store_name: s.store_name, store_phone: s.store_phone, store_address: s.store_address };
    const sau = {
      store_name: dto.store_name.trim(),
      store_phone: dto.store_phone.trim(),
      store_address: (dto.store_address ?? '').trim(),
    };
    if (sau.store_name === '' || sau.store_phone === '') {
      throw new BadRequestException({ code: 'THIET_LAP_THIEU', message: 'Cần đủ tên quán và số điện thoại.' });
    }
    const u = nguoiDung(req);
    await this.settings.updateMany(sau, { user_id: u.sub, full_name: u.full_name });
    await this.ghi(req, 'thong_tin', `Thông tin quán: ${sau.store_name} · ${sau.store_phone}`, truoc, sau);
    return { data: sau };
  }

  // ── 2. Tài khoản chủ quán ──────────────────────────────────────────────────

  /** Đổi được HẾT: tên, tên đăng nhập, mật khẩu (chốt 2026-11-18). Quán chưa có chủ quán thì tạo.
   *  KHÔNG bump token_version khi đổi mật khẩu — cùng chính sách "admin tự đặt mật khẩu" ở
   *  users.controller.ts: người đang làm thiết lập thường đăng nhập chính tài khoản này. */
  @Put('chu-quan')
  async chuQuan(@Body() dto: ChuQuanDto, @Req() req: Request) {
    this.canVe(req);
    const repo = this.ds.getRepository(User);
    const username = dto.username.trim();
    const full_name = dto.full_name.trim();
    if (!/^[A-Za-z0-9._-]+$/.test(username)) {
      throw new BadRequestException({
        code: 'THIET_LAP_TEN_DANG_NHAP',
        message: 'Tên đăng nhập chỉ gồm chữ không dấu, số, dấu chấm, gạch ngang, gạch dưới.',
      });
    }
    const chu = await repo.findOne({ where: { is_owner: true }, order: { created_at: 'ASC' } });
    const trung = await repo.findOne({ where: chu ? { username, id: Not(chu.id) } : { username } });
    if (trung) {
      throw new ConflictException({ code: 'THIET_LAP_TRUNG_TEN', message: `Tên đăng nhập "${username}" đã có người dùng.` });
    }

    if (!chu) {
      if (!dto.password) {
        throw new BadRequestException({ code: 'THIET_LAP_THIEU', message: 'Tạo tài khoản chủ quán cần mật khẩu (ít nhất 8 ký tự).' });
      }
      await repo.save(
        repo.create({
          username,
          full_name,
          password_hash: await AuthService.hashPassword(dto.password),
          is_owner: true,
          role: 'admin',
          is_active: true,
          token_version: 0,
        }),
      );
      await this.ghi(req, 'chu_quan', `Tạo tài khoản chủ quán ${full_name} (${username})`, null, { username, full_name });
      return { data: { username, full_name } };
    }

    const truoc = { username: chu.username, full_name: chu.full_name };
    const patch: Partial<User> = { username, full_name };
    if (dto.password) patch.password_hash = await AuthService.hashPassword(dto.password);
    await repo.update({ id: chu.id }, patch);
    const doi = [
      truoc.username !== username ? `tên đăng nhập ${truoc.username} → ${username}` : '',
      (truoc.full_name ?? '') !== full_name ? `tên ${truoc.full_name || '(trống)'} → ${full_name}` : '',
      dto.password ? 'đặt mật khẩu mới' : '',
    ].filter(Boolean);
    await this.ghi(
      req,
      'chu_quan',
      `Tài khoản chủ quán: ${doi.length ? doi.join(', ') : 'không đổi gì'}`,
      truoc,
      { username, full_name, doi_mat_khau: !!dto.password },
    );
    return { data: { username, full_name } };
  }

  // ── 3. Bàn ─────────────────────────────────────────────────────────────────

  @Post('ban')
  async ban(@Body() dto: BanDto, @Req() req: Request) {
    this.canVe(req);
    if (dto.den < dto.tu) {
      throw new BadRequestException({ code: 'THIET_LAP_BAN', message: `Số cuối (${dto.den}) phải lớn hơn hoặc bằng số đầu (${dto.tu}).` });
    }
    if (dto.den - dto.tu + 1 > TOI_DA_BAN_MOT_LAN) {
      throw new BadRequestException({ code: 'THIET_LAP_BAN', message: `Mỗi lần tạo tối đa ${TOI_DA_BAN_MOT_LAN} bàn.` });
    }
    const repo = this.ds.getRepository(RestaurantTable);
    const existing = await repo.find({ where: { kind: 'dine-in' }, select: ['id', 'code', 'kind', 'is_active'] });
    // Dùng chung bộ lên kế hoạch với POST /tables/bulk: so trùng theo SỐ bàn, mở lại bàn đã xoá.
    const plan = planBulkTables('dine-in', dto.tu, dto.den, existing);
    const moi = plan.create.map(({ num, code, name }) =>
      repo.create({ code, name, kind: 'dine-in', x: 0, y: num, is_active: true }),
    );
    if (moi.length > 0) await repo.save(moi);
    if (plan.reopen.length > 0) {
      await repo.update({ id: In(plan.reopen.map((t) => t.id)) }, { is_active: true });
    }
    const ketQua = { tao: moi.length, mo_lai: plan.reopen.length, bo_qua: plan.skippedNums.length };
    await this.ghi(
      req,
      'ban',
      `Bàn ${dto.tu} → ${dto.den}: tạo ${ketQua.tao}, mở lại ${ketQua.mo_lai}, đã có ${ketQua.bo_qua}`,
      null,
      ketQua,
    );
    return { data: ketQua };
  }

  // ── 5. Tài khoản ngân hàng ─────────────────────────────────────────────────

  private nhapNganHang(dto: NganHangDto) {
    const draft = {
      label: '',
      kind: 'BANK' as const,
      bank_bin: dto.bank_bin.trim(),
      account_no: dto.account_no.replace(/\s+/g, ''),
      account_name: dto.account_name.trim().toUpperCase(),
      image_url: null,
      note_prefix: null,
    };
    const bank_name = bankNameFromBin(draft.bank_bin) ?? (dto.bank_name?.trim() || null);
    draft.label = dto.label?.trim() || [bank_name, draft.account_name].filter(Boolean).join(' – ');
    const err = validatePaymentQrDraft(draft);
    if (err) throw new BadRequestException({ code: 'THIET_LAP_NGAN_HANG', message: err });
    return { ...draft, bank_name };
  }

  @Post('ngan-hang')
  async themNganHang(@Body() dto: NganHangDto, @Req() req: Request) {
    this.canVe(req);
    const repo = this.ds.getRepository(PaymentQrAccount);
    const d = this.nhapNganHang(dto);
    const cuoi = await repo.find({ order: { sort_order: 'DESC' }, take: 1 });
    const u = nguoiDung(req);
    const row = repo.create({
      ...d,
      sort_order: cuoi.length > 0 ? cuoi[0].sort_order + 1 : 0,
      is_active: true,
      is_hkd: false,
      created_by_user_id: u.sub,
      created_by_full_name: u.full_name,
      updated_by_user_id: u.sub,
      updated_by_full_name: u.full_name,
    });
    await repo.save(row);
    // Ghi ĐỦ số tài khoản: đổi số TK là đổi nơi tiền khách chảy về (spec §6).
    await this.ghi(req, 'ngan_hang', `Thêm TK ngân hàng ${d.bank_name ?? ''} ${d.account_no} · ${d.account_name}`, null, soTkDayDu(row));
    return { data: { id: row.id } };
  }

  @Put('ngan-hang/:id')
  async suaNganHang(@Param('id') id: string, @Body() dto: NganHangDto, @Req() req: Request) {
    this.canVe(req);
    const repo = this.ds.getRepository(PaymentQrAccount);
    const row = await repo.findOne({ where: { id, kind: 'BANK' } });
    if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Không tìm thấy tài khoản ngân hàng.' });
    const truoc = soTkDayDu(row);
    const d = this.nhapNganHang(dto);
    const u = nguoiDung(req);
    await repo.update({ id }, { ...d, updated_by_user_id: u.sub, updated_by_full_name: u.full_name });
    await this.ghi(
      req,
      'ngan_hang',
      `Sửa TK ngân hàng: ${truoc.account_no ?? ''} → ${d.account_no} · ${d.account_name}`,
      truoc,
      { bank_name: d.bank_name, account_no: d.account_no, account_name: d.account_name },
    );
    return { data: { id } };
  }

  // ── 4. Menu Excel ──────────────────────────────────────────────────────────

  private async phanLoai(dongs: DongExcel[]): Promise<KetQuaPhanLoai> {
    const [mon, nhom] = await Promise.all([
      this.ds.getRepository(MenuItem).find({
        where: { is_active: true },
        select: ['id', 'code', 'name', 'group', 'price'],
      }),
      this.ds.getRepository(MenuGroup).find({ select: ['code', 'name'] }),
    ]);
    return phanLoaiMenu(dongs, mon, nhom);
  }

  /** POST /admin/thiet-lap/menu/xem-truoc — chỉ đọc, không ghi gì. */
  @Post('menu/xem-truoc')
  @HttpCode(200)
  async xemTruocMenu(@Body() dto: MenuDto, @Req() req: Request) {
    this.canVe(req);
    return { data: await this.phanLoai(dto.dongs) };
  }

  /** POST /admin/thiet-lap/menu — phân loại LẠI ở server (không tin kết quả xem trước của máy
   *  khách: giữa hai lần bấm có thể có người sửa menu), rồi ghi trong một transaction. Dòng lỗi
   *  bỏ qua. */
  @Post('menu')
  async luuMenu(@Body() dto: MenuDto, @Req() req: Request) {
    this.canVe(req);
    const kq = await this.phanLoai(dto.dongs);
    if (kq.moi.length === 0 && kq.doi.length === 0) {
      return { data: { tao: 0, doi: 0, loi: kq.loi.length, nhom_moi: 0 } };
    }
    const nhomMoi = await this.ghiMenu(kq);
    const ketQua = { tao: kq.moi.length, doi: kq.doi.length, loi: kq.loi.length, nhom_moi: nhomMoi };
    await this.ghi(
      req,
      'menu',
      `Nhập menu: ${ketQua.tao} món mới, ${ketQua.doi} món đổi giá/nhóm, ${ketQua.loi} dòng lỗi bỏ qua`,
      null,
      { ...ketQua, doi_chi_tiet: kq.doi },
    );
    return { data: ketQua };
  }

  /** Ghi kết quả phân loại trong MỘT transaction. Trả số nhóm mới đã tạo. */
  private ghiMenu(kq: KetQuaPhanLoai): Promise<number> {
    return this.ds.transaction(async (mgr) => {
      const groups = mgr.getRepository(MenuGroup);
      const items = mgr.getRepository(MenuItem);

      // Nhóm: tên trong file → mã nhóm. Nhóm có sẵn (kể cả đã ẩn) khớp theo TÊN; chưa có thì tạo.
      const tatCaNhom = await groups.find();
      const maTheoTen = new Map(tatCaNhom.map((g) => [khoaTen(g.name), g.code]));
      const maNhomDaDung = new Set(tatCaNhom.map((g) => g.code));
      const tenNhomCanDung = [...kq.moi.map((m) => m.nhom), ...kq.doi.flatMap((d) => (d.nhom_moi ? [d.nhom_moi] : []))];
      let thuTu = tatCaNhom.reduce((m, g) => Math.max(m, g.sort_order), 0);
      let soNhomMoi = 0;
      for (const ten of tenNhomCanDung) {
        if (maTheoTen.has(khoaTen(ten))) continue;
        const code = maChuaDung(slugNhom(ten), maNhomDaDung, 16);
        maNhomDaDung.add(code);
        maTheoTen.set(khoaTen(ten), code);
        await groups.save(
          groups.create({ code, name: toTitleCase(ten), icon: null, kitchen_type: 'cook', sort_order: ++thuTu, is_active: true }),
        );
        soNhomMoi++;
      }
      const maNhom = (ten: string): string => maTheoTen.get(khoaTen(ten))!;

      // Mã món: mã có sẵn (kể cả món đã xoá — cột UNIQUE) không được dùng lại.
      const maMonDaDung = new Set((await items.find({ select: ['code'] })).map((m) => m.code));
      for (const m of kq.moi) {
        const code = m.ma && !maMonDaDung.has(m.ma) ? m.ma : sinhMaMon(maMonDaDung);
        maMonDaDung.add(code);
        await items.save(
          items.create({
            code,
            name: toTitleCase(m.ten),
            group: maNhom(m.nhom),
            price: m.gia,
            unit: m.don_vi,
            image_url: null,
            is_out_of_stock: false,
            is_active: true,
          }),
        );
      }
      // Món đã có: CHỈ giá và nhóm. Không đụng tên, đơn vị, ảnh, is_active.
      for (const d of kq.doi) {
        const patch: Partial<MenuItem> = {};
        if (d.gia_moi !== undefined) patch.price = d.gia_moi;
        if (d.nhom_moi !== undefined) patch.group = maNhom(d.nhom_moi);
        await items.update({ id: d.id }, patch);
      }
      return soNhomMoi;
    });
  }

  // ── 10. Thương hiệu (2026-11-19, spec §8c) ─────────────────────────────────

  /** PUT /admin/thiet-lap/thuong-hieu — tên đầy đủ + tên ngắn + 2 màu + linh vật. Màu CHỈ nhận
   *  mã trong bảng (đã kiểm chữ trắng ≥ 4.5:1) — gõ mã lạ qua API cũng bị chặn ở đây. */
  @Put('thuong-hieu')
  async thuongHieu(@Body() dto: ThuongHieuDto, @Req() req: Request) {
    this.canVe(req);
    const mauAdmin = dto.mau_admin.toLowerCase();
    const mauKhach = dto.mau_khach.toLowerCase();
    if (!trongBang(BANG_MAU_ADMIN, mauAdmin) || !trongBang(BANG_MAU_KHACH, mauKhach)) {
      throw new BadRequestException({ code: 'THIET_LAP_MAU', message: 'Màu không có trong bảng màu cho phép.' });
    }
    const s = await this.settings.readAll();
    const truoc = thuongHieuTuCaiDat(s);
    const ten = dto.ten.trim();
    const tenNgan = dto.ten_ngan.trim();
    if (!ten) throw new BadRequestException({ code: 'THIET_LAP_THIEU', message: 'Cần tên quán.' });
    const u = nguoiDung(req);
    await this.settings.updateMany(
      {
        store_name: ten,
        store_short_name: tenNgan,
        brand_color_admin: mauAdmin,
        brand_color_shop: mauKhach,
        mascots_enabled: dto.linh_vat,
      },
      { user_id: u.sub, full_name: u.full_name },
    );
    // Ảnh chia sẻ có NỀN màu trang khách → đổi màu thì dựng lại (chưa có logo thì bỏ qua).
    if (mauKhach !== truoc.mau_khach && truoc.logo_phien_ban > 0) {
      const ok = await dungLaiAnhChiaSe(mauKhach);
      if (ok) await this.settings.updateMany({ brand_logo_version: truoc.logo_phien_ban + 1 }, { user_id: u.sub, full_name: u.full_name });
    }
    const tenMau = (bang: typeof BANG_MAU_ADMIN, hex: string) => bang.find((m) => m.hex === hex)?.ten ?? hex;
    const doi = [
      truoc.ten !== ten ? `tên ${truoc.ten || '(trống)'} → ${ten}` : '',
      truoc.ten_ngan !== tenNgan ? `tên ngắn ${truoc.ten_ngan || '(trống)'} → ${tenNgan || '(trống)'}` : '',
      truoc.mau_admin !== mauAdmin ? `màu quản lý ${tenMau(BANG_MAU_ADMIN, truoc.mau_admin)} → ${tenMau(BANG_MAU_ADMIN, mauAdmin)}` : '',
      truoc.mau_khach !== mauKhach ? `màu trang khách ${tenMau(BANG_MAU_KHACH, truoc.mau_khach)} → ${tenMau(BANG_MAU_KHACH, mauKhach)}` : '',
      truoc.linh_vat !== dto.linh_vat ? `linh vật: ${dto.linh_vat ? 'bật' : 'tắt'}` : '',
    ].filter(Boolean);
    await this.ghi(req, 'thuong_hieu', `Thương hiệu — ${doi.length ? doi.join(', ') : 'không đổi gì'}`, truoc, {
      ten,
      ten_ngan: tenNgan,
      mau_admin: mauAdmin,
      mau_khach: mauKhach,
      linh_vat: dto.linh_vat,
    });
    return { data: thuongHieuTuCaiDat(await this.settings.readAll()) };
  }

  /** POST /admin/thiet-lap/logo (multipart `file`) — 1 ảnh → 5 bản (logo.ts), phiên bản +1. */
  @Post('logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: LOGO_MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!LOGO_MIMES.has(file.mimetype)) {
          cb(new BadRequestException({ code: 'THIET_LAP_LOGO_LOAI', message: 'Chỉ nhận ảnh JPG, PNG, WEBP, GIF hoặc ảnh iPhone (HEIC).' }), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async logo(@UploadedFile() file: Express.Multer.File | undefined, @Req() req: Request) {
    this.canVe(req);
    if (!file) throw new BadRequestException({ code: 'THIET_LAP_LOGO_HONG', message: 'Chưa chọn ảnh logo.' });
    const s = await this.settings.readAll();
    await xuLyLogo(file.buffer, s.brand_color_shop);
    const phienBan = (Number(s.brand_logo_version) || 0) + 1;
    const u = nguoiDung(req);
    await this.settings.updateMany({ brand_logo_version: phienBan }, { user_id: u.sub, full_name: u.full_name });
    await this.ghi(req, 'logo', phienBan === 1 ? 'Tải logo quán' : 'Đổi logo quán', null, { phien_ban: phienBan });
    return { data: thuongHieuTuCaiDat(await this.settings.readAll()) };
  }

  // ── 9. Tính năng ───────────────────────────────────────────────────────────

  @Put('tinh-nang')
  async tinhNang(@Body() dto: TinhNangDto, @Req() req: Request) {
    this.canVe(req);
    const s = await this.settings.readAll();
    const doi = (Object.keys(TEN_TINH_NANG) as KhoaTinhNang[]).filter(
      (k) => dto[k] !== undefined && dto[k] !== s[k],
    );
    if (doi.length === 0) return { data: {} };
    const patch = Object.fromEntries(doi.map((k) => [k, dto[k]!]));
    const truoc = Object.fromEntries(doi.map((k) => [k, s[k]]));
    const u = nguoiDung(req);
    await this.settings.updateMany(patch, { user_id: u.sub, full_name: u.full_name });
    const moTa = doi.map((k) => `${TEN_TINH_NANG[k]}: ${dto[k] ? 'bật' : 'tắt'}`).join(', ');
    await this.ghi(req, 'tinh_nang', `Tính năng — ${moTa}`, truoc, patch);
    return { data: patch };
  }
}
