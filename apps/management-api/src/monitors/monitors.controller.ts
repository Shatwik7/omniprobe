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
} from '@nestjs/common';
import { MonitorsService } from './monitors.service';
import { CreateMonitorDto } from './dto/create-monitor.dto';
import { UpdateMonitorDto } from './dto/update-monitor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMemberGuard } from '../auth/guards/teamMember.guard';

@Controller('teams/:teamId/projects/:projectId/monitors')
@UseGuards(JwtAuthGuard)
export class MonitorsController {
  constructor(private readonly monitorsService: MonitorsService) {}

  @Post()
  @UseGuards(TeamMemberGuard)
  create(@Body() createMonitorDto: CreateMonitorDto) {
    return this.monitorsService.create(createMonitorDto);
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
