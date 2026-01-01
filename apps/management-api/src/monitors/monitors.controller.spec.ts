import { Test, TestingModule } from '@nestjs/testing';
import { MonitorsController } from './monitors.controller';
import { MonitorsService } from './monitors.service';

describe('MonitorsController', () => {
  let controller: MonitorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitorsController],
      providers: [MonitorsService],
    }).compile();

    controller = module.get<MonitorsController>(MonitorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
