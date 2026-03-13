import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  NotAcceptableException,
  NotFoundException,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
import { UpdateAnalyticsDto } from './dto/update-analytics.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMemberGuard } from '../auth/guards/teamMember.guard';
import { LongPollingService } from '@app/common/long-polling/long-polling.service';

@Controller('teams/:teamId/projects/:projectId/monitors/:monitorId/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly pollingService: LongPollingService,
  ) { }

  @Post()
  @UseGuards(TeamMemberGuard)
  async create(
    @Param('monitorId', ParseUUIDPipe) monitorId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() createAnalyticsDto: CreateAnalyticsDto,
  ) {
    if (await this.analyticsService.checkMonitorInProject(monitorId, projectId)) {
      throw new NotAcceptableException(
        'Monitor does not belong to the specified project',
      );
    }
    const analytics = await this.analyticsService.create(createAnalyticsDto);
    await this.pollingService.publishUpdate(`analytics:${monitorId}`, analytics);
    return analytics;
  }

  @Get()
  @UseGuards(TeamMemberGuard)
  async findAll(
    @Param('monitorId', ParseUUIDPipe) monitorId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    if (await this.analyticsService.checkMonitorInProject(monitorId, projectId)) {
      throw new NotAcceptableException(
        'Monitor does not belong to the specified project',
      );
    }
    return this.analyticsService.findAllByMonitor(monitorId);
  }

  @Get('poll')
  @UseGuards(TeamMemberGuard)
  async poll(
    @Param('monitorId', ParseUUIDPipe) monitorId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    if (await this.analyticsService.checkMonitorInProject(monitorId, projectId)) {
      throw new NotAcceptableException(
        'Monitor does not belong to the specified project',
      );
    }
    const data = await this.pollingService.waitForUpdates(
      `analytics:${monitorId}`,
    );
    if (data === null) {
      throw new NotFoundException('Long polling timed out');
    }
    return data;
  }

  @Get('availability')
  @UseGuards(TeamMemberGuard)
  async getMonitorAvailability(
    @Param('monitorId', ParseUUIDPipe) monitorId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    if (await this.analyticsService.checkMonitorInProject(monitorId, projectId)) {
      throw new NotAcceptableException(
        'Monitor does not belong to the specified project',
      );
    }

    if ((startTime && !endTime) || (!startTime && endTime)) {
      throw new BadRequestException(
        'Both startTime and endTime are required when filtering by time range',
      );
    }

    if (startTime && endTime) {
      const parsedStart = new Date(startTime).getTime();
      const parsedEnd = new Date(endTime).getTime();

      if (Number.isNaN(parsedStart) || Number.isNaN(parsedEnd)) {
        throw new BadRequestException(
          'startTime and endTime must be valid ISO date strings',
        );
      }

      if (parsedEnd <= parsedStart) {
        throw new BadRequestException('endTime must be after startTime');
      }
    }

    return this.analyticsService.getMonitorAvailability(
      monitorId,
      startTime,
      endTime,
    );
  }

  @Get(':id')
  @UseGuards(TeamMemberGuard)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('monitorId', ParseUUIDPipe) monitorId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    if (await this.analyticsService.checkMonitorInProject(monitorId, projectId)) {
      throw new NotAcceptableException(
        'Monitor does not belong to the specified project',
      );
    }
    const analytics = await this.analyticsService.findOne(id);
    if (!analytics) throw new NotFoundException(`Analytics #${id} not found`);
    return analytics;
  }

  @Patch(':id')
  @UseGuards(TeamMemberGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('monitorId', ParseUUIDPipe) monitorId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() updateAnalyticsDto: UpdateAnalyticsDto,
  ) {
    if (await this.analyticsService.checkMonitorInProject(monitorId, projectId)) {
      throw new NotAcceptableException(
        'Monitor does not belong to the specified project',
      );
    }
    const analytics = await this.analyticsService.update(id, updateAnalyticsDto);
    if (!analytics) throw new NotFoundException(`Analytics #${id} not found`);
    await this.pollingService.publishUpdate(`analytics:${monitorId}`, analytics);
    return analytics;
  }

  @Delete(':id')
  @UseGuards(TeamMemberGuard)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('monitorId', ParseUUIDPipe) monitorId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    if (await this.analyticsService.checkMonitorInProject(monitorId, projectId)) {
      throw new NotAcceptableException(
        'Monitor does not belong to the specified project',
      );
    }
    const deleted = await this.analyticsService.remove(id);
    if (!deleted) throw new NotFoundException(`Analytics #${id} not found`);
    return { deleted: true };
  }
}
