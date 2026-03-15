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
  Inject,
} from '@nestjs/common';
import { MonitorsService } from './monitors.service';
import { CreateMonitorDto } from './dto/create-monitor.dto';
import { UpdateMonitorDto } from './dto/update-monitor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMemberGuard } from '../auth/guards/teamMember.guard';
import { CheckExecutionAddEvent, Topics } from '@app/kafka-topics';
import { ClientKafka } from '@nestjs/microservices';

@Controller('teams/:teamId/projects/:projectId/monitors')
@UseGuards(JwtAuthGuard)
export class MonitorsController {
  constructor(
    private readonly monitorsService: MonitorsService,
    @Inject('KAFKA_PRODUCER') private readonly kafkaProducer: ClientKafka,
  ) {}

  @Post()
  @UseGuards(TeamMemberGuard)
  async create(@Body() createMonitorDto: CreateMonitorDto) {
    const createdMonitor = await this.monitorsService.create(createMonitorDto);
    const event: CheckExecutionAddEvent = {
      id: createdMonitor.id,
      frequency: createMonitorDto.frequencySeconds,
    };
    this.kafkaProducer.emit(Topics.CHECK_EXECUTION_ADD, event);
    return createdMonitor;
  }

  @Get()
  @UseGuards(TeamMemberGuard)
  findAll(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.monitorsService.findAll(projectId);
  }

  @Get(':id')
  @UseGuards(TeamMemberGuard)
  findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.monitorsService.findOne(projectId, id);
  }

  @Patch(':id')
  @UseGuards(TeamMemberGuard)
  update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMonitorDto: UpdateMonitorDto,
  ) {
    return this.monitorsService.update(projectId, id, updateMonitorDto);
  }

  @Delete(':id')
  @UseGuards(TeamMemberGuard)
  remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.monitorsService.remove(projectId, id);
  }
}
