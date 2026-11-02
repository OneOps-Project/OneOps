import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './modules/database';
import { PlatformModule } from './modules/platform/platform.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { WorkManagementModule } from './features/work-management/work-management.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    // Hạ tầng dùng chung (global): DB + guard/decorator xác thực
    DatabaseModule,
    PlatformModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),

    // Feature modules — Thêm module mới ở đây
    AuthModule,
    UsersModule,
    AttendanceModule,      // [Dev 1]
    WorkManagementModule,  // [Dev 2]
    ChatModule,            // [Dev 3]
    NotificationsModule,   // [Dev 3]
  ],
})
export class AppModule {}
