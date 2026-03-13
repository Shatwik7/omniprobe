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
