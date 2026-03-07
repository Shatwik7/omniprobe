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
  UnauthorizedException,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { CreateMetricDto } from './dto/create-metric.dto';
import { UpdateMetricDto } from './dto/update-metric.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMemberGuard } from '../auth/guards/teamMember.guard';
import { LongPollingService } from '@app/common/long-polling/long-polling.service';

@Controller('teams/:teamId/projects/:projectId/monitors/:monitorId/metrics')
@UseGuards(JwtAuthGuard)
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly pollingService: LongPollingService,
  ) {}

  @Post()
  @UseGuards(TeamMemberGuard)
  async create(@Body() createMetricDto: CreateMetricDto) {
    await this.pollingService.publishUpdate(
      createMetricDto.monitorId,
      createMetricDto,
    );
    return this.metricsService.create(createMetricDto);
  }

  @Get()
  @UseGuards(TeamMemberGuard)
  async findAll(
    @Param('monitorId') monitorId: string,
    @Param('projectId') projectId: string,
    @Query('beginDate') beginDate: Date,
    @Query('endDate') endDate: Date,
    @Query('region') region: string,
  ) {
    if (await this.metricsService.checkMonitorInProject(monitorId, projectId)) {
      throw new NotAcceptableException(
        'Monitor does not belong to the specified project',
      );
    }
    return this.metricsService.findAll(monitorId, beginDate, endDate, region);
  }

  @Get('poll')
  @UseGuards(TeamMemberGuard)
  async poll(
    @Param('monitorId') monitorId: string,
    @Param('projectId') projectId: string,
  ) {
    if (await this.metricsService.checkMonitorInProject(monitorId, projectId)) {
      throw new NotAcceptableException(
        'Monitor does not belong to the specified project',
      );
    }
    const data = await this.pollingService.waitForUpdates(monitorId);
    if (data === null) {
      throw new NotFoundException('Long polling timed out');
    }
    return data;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.metricsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMetricDto: UpdateMetricDto) {
    return this.metricsService.update(id, updateMetricDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.metricsService.remove(id);
  }
}
