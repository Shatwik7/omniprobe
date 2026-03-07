import { Test, TestingModule } from '@nestjs/testing';
import { CommonService } from './common.service';
import { describe, beforeEach, it, expect } from '@jest/globals';
import { from } from 'rxjs';

describe('CommonService', () => {
  let service: CommonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommonService],
    }).compile();

    service = module.get<CommonService>(CommonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
