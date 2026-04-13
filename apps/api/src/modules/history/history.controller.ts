import { Controller, Get, Delete, Post, Param, Query, UseGuards } from '@nestjs/common';
import { HistoryService } from './history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-with-user.interface';
import { HistoryQueryDto } from './dto/history-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  async getHistory(@CurrentUser() user: RequestUser, @Query() query: HistoryQueryDto) {
    return this.historyService.getHistory(user.id, query);
  }

  @Delete(':id')
  async deleteEntry(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.historyService.deleteEntry(id, user.id);
  }

  @Delete()
  async clearAll(@CurrentUser() user: RequestUser) {
    return this.historyService.clearAll(user.id);
  }

  @Post(':id/repeat')
  async repeat(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.historyService.getRepeatData(id, user.id);
  }
}
