import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { UsersModule } from '../users/users.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [UsersModule, AuditLogModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
