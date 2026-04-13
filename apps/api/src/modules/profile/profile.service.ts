import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('Пользователь не найден');

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.usersService.update(userId, { name: dto.name });
    return { id: user.id, email: user.email, name: user.name };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('Пользователь не найден');

    const isValid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!isValid) throw new BadRequestException('Текущий пароль неверен');

    const newHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });
    await this.usersService.update(userId, { passwordHash: newHash });

    await this.auditLogService.log({
      action: 'password_change',
      userId,
      entityType: 'user',
      entityId: userId,
    });

    return { message: 'Пароль успешно изменён' };
  }

  async getStats(userId: string) {
    const [totalJobs, completedJobs, imageJobs, pdfJobs] = await Promise.all([
      this.prisma.fileJob.count({ where: { userId, deletedAt: null } }),
      this.prisma.fileJob.count({ where: { userId, status: 'DONE', deletedAt: null } }),
      this.prisma.fileJob.count({ where: { userId, operationType: { startsWith: 'image.' }, deletedAt: null } }),
      this.prisma.fileJob.count({ where: { userId, operationType: { startsWith: 'pdf.' }, deletedAt: null } }),
    ]);

    const sizeStats = await this.prisma.fileJob.aggregate({
      where: { userId, status: 'DONE', deletedAt: null },
      _sum: { fileSizeBefore: true, fileSizeAfter: true },
    });

    return {
      totalJobs,
      completedJobs,
      imageJobs,
      pdfJobs,
      totalSizeBefore: Number(sizeStats._sum.fileSizeBefore || 0),
      totalSizeAfter: Number(sizeStats._sum.fileSizeAfter || 0),
    };
  }
}
