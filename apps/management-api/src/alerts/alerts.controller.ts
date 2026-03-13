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
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMemberGuard } from '../auth/guards/teamMember.guard';
import { LongPollingService } from '@app/common/long-polling/long-polling.service';

@Controller('teams/:teamId/projects/:projectId/monitors/:monitorId/alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly pollingService: LongPollingService,
  ) {}

  @Post()
  @UseGuards(TeamMemberGuard)
  async create(
    @Param('monitorId', ParseUUIDPipe) monitorId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() createAlertDto: CreateAlertDto,
  ) {
    if (createAlertDto.monitorId !== monitorId) {
      throw new NotAcceptableException(
        'monitorId in payload must match route monitorId',
      );
    }
    if (await this.alertsService.checkMonitorInProject(monitorId, projectId)) {
      throw new NotAcceptableException(
        'Monitor does not belong to the specified project',
      );
    }

    const alert = await this.alertsService.create(createAlertDto);
    await this.pollingService.publishUpdate(`alerts:${monitorId}`, alert);
    return alert;
  }

  @Get()
  @UseGuards(TeamMemberGuard)
  async findAll(
    @Param('monitorId', ParseUUIDPipe) monitorId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    if (await this.alertsService.checkMonitorInProject(monitorId, projectId)) {
      throw new NotAcceptableException(
        'Monitor does not belong to the specified project',
      );
    }
    return this.alertsService.findAll(monitorId);
  }

  @Get('poll')
  @UseGuards(TeamMemberGuard)
  async poll(
    @Param('monitorId', ParseUUIDPipe) monitorId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    if (await this.alertsService.checkMonitorInProject(monitorId, projectId)) {
      throw new NotAcceptableException(
        'Monitor does not belong to the specified project',
      );
    }

    const data = await this.pollingService.waitForUpdates(`alerts:${monitorId}`);
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
    if (await this.alertsService.checkMonitorInProject(monitorId, projectId)) {
      throw new NotAcceptableException(
        'Monitor does not belong to the specified project',
      );
    }

    const alert = await this.alertsService.findOne(id);
    if (!alert) {
      throw new NotFoundException(`Alert #${id} not found`);
    }
    return alert;
  }

  @Patch(':id')
  @UseGuards(TeamMemberGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('monitorId', ParseUUIDPipe) monitorId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() updateAlertDto: UpdateAlertDto,
  ) {
    if (await this.alertsService.checkMonitorInProject(monitorId, projectId)) {
      throw new NotAcceptableException(
        'Monitor does not belong to the specified project',
      );
    }

    const alert = await this.alertsService.update(id, updateAlertDto);
    if (!alert) {
      throw new NotFoundException(`Alert #${id} not found`);
    }
    await this.pollingService.publishUpdate(`alerts:${monitorId}`, alert);
    return alert;
  }

  @Delete(':id')
  @UseGuards(TeamMemberGuard)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('monitorId', ParseUUIDPipe) monitorId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    if (await this.alertsService.checkMonitorInProject(monitorId, projectId)) {
      throw new NotAcceptableException(
        'Monitor does not belong to the specified project',
      );
    }

    const deleted = await this.alertsService.remove(id);
    if (!deleted) {
      throw new NotFoundException(`Alert #${id} not found`);
    }
    await this.pollingService.publishUpdate(`alerts:${monitorId}`, {
      id,
      deleted: true,
    });
    return { deleted: true };
  }
}
