import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { WorkerService } from './worker.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';

@Controller()
export class WorkerController {
  constructor(private readonly workerService: WorkerService) {}

  @MessagePattern('createWorker')
  create(@Payload() createWorkerDto: CreateWorkerDto) {
    return this.workerService.create(createWorkerDto);
  }

  @MessagePattern('findAllWorker')
  findAll() {
    return this.workerService.findAll();
  }

  @MessagePattern('findOneWorker')
  findOne(@Payload() id: number) {
    return this.workerService.findOne(id);
  }

  @MessagePattern('updateWorker')
  update(@Payload() updateWorkerDto: UpdateWorkerDto) {
    return this.workerService.update(updateWorkerDto.id, updateWorkerDto);
  }

  @MessagePattern('removeWorker')
  remove(@Payload() id: number) {
    return this.workerService.remove(id);
  }
}
