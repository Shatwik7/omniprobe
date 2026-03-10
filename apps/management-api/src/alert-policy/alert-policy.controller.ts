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
import { AlertPolicyService } from './alert-policy.service';
import { CreateAlertPolicyDto } from './dto/create-alert-policy.dto';
import { UpdateAlertPolicyDto } from './dto/update-alert-policy.dto';
import { TeamMemberGuard } from '../auth/guards/teamMember.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('teams/:teamId/projects/:projectId/alert-policy')
@UseGuards(JwtAuthGuard)
export class AlertPolicyController {
  constructor(private readonly alertPolicyService: AlertPolicyService) {}

  @UseGuards(TeamMemberGuard)
  @Post()
  create(@Body() createAlertPolicyDto: CreateAlertPolicyDto, @Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.alertPolicyService.create(createAlertPolicyDto, projectId);
  }

  @Get()
  @UseGuards(TeamMemberGuard)
  findAll() {
    return this.alertPolicyService.findAll();
  }

  @Get(':id')
  @UseGuards(TeamMemberGuard)
  findOne(@Param('id') id: string) {
    return this.alertPolicyService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(TeamMemberGuard)
  update(
    @Param('id') id: string,
    @Body() updateAlertPolicyDto: UpdateAlertPolicyDto,
  ) {
    return this.alertPolicyService.update(id, updateAlertPolicyDto);
  }

  @Delete(':id')
  @UseGuards(TeamMemberGuard)
  remove(@Param('id') id: string) {
    return this.alertPolicyService.remove(id);
  }
}
