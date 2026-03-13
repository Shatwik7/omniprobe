import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Notification } from '@app/database';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { TeamMemberGuard } from '../auth/guards/teamMember.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('teams/:teamId/projects/:projectId/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Post()
  @UseGuards(TeamMemberGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    return this.notificationsService.create(createNotificationDto);
  }

  @Get('by-team/:teamIdParam')
  @UseGuards(TeamMemberGuard)
  async findByTeamId(
    @Param('teamIdParam', ParseUUIDPipe) teamId: string,
  ): Promise<Notification[]> {
    return this.notificationsService.findByTeamId(teamId);
  }

  @Get('/poll')
  @UseGuards(TeamMemberGuard)
  async waitForNotification(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('timeout') timeout?: string,
  ): Promise<Notification | null> {
    const timeoutMs = timeout ? parseInt(timeout) : 30000;
    return this.notificationsService.waitForNotification(projectId, timeoutMs);
  }

  @Get()
  @UseGuards(TeamMemberGuard)
  async findAll(@Param('projectId', ParseUUIDPipe) projectId: string): Promise<Notification[]> {
    return this.notificationsService.findAll(projectId);
  }

  @Get(':id')
  @UseGuards(TeamMemberGuard)
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Notification> {
    return this.notificationsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(TeamMemberGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    return this.notificationsService.update(id, updateNotificationDto);
  }

  @Delete(':id')
  @UseGuards(TeamMemberGuard)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<Notification> {
    return this.notificationsService.remove(id);
  }
}
