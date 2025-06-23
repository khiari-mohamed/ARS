import { Controller, Post } from '@nestjs/common';
import { BordereauxService } from './bordereaux/bordereaux.service';

@Controller('seed')
export class SeedController {
  constructor(private readonly bordereauxService: BordereauxService) {}

  @Post()
  async seedAll() {
    try {
      const bordereaux = await this.bordereauxService.seedTestData();
      const complaints = await this.bordereauxService.seedComplaints();
      return { bordereaux, complaints };
    } catch (error) {
      console.error('Seeding error:', error);
      return { error: error.message, stack: error.stack };
    }
  }
}