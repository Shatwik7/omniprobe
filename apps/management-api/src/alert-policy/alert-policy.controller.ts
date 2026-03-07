import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AlertPolicyService } from './alert-policy.service';
import { CreateAlertPolicyDto } from './dto/create-alert-policy.dto';
import { UpdateAlertPolicyDto } from './dto/update-alert-policy.dto';
import { TeamMemberGuard } from '../auth/guards/teamMember.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('alert-policy')
@UseGuards(JwtAuthGuard, TeamMemberGuard)
export class AlertPolicyController {
  constructor(private readonly alertPolicyService: AlertPolicyService) {}

  @Post()
  create(@Body() createAlertPolicyDto: CreateAlertPolicyDto) {
    return this.alertPolicyService.create(createAlertPolicyDto);
  }

  @Get()
  findAll() {
    return this.alertPolicyService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.alertPolicyService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAlertPolicyDto: UpdateAlertPolicyDto,
  ) {
    return this.alertPolicyService.update(+id, updateAlertPolicyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.alertPolicyService.remove(+id);
  }
}
