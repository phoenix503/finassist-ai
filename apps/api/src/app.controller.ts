
import { Controller, Get } from '@nestjs/common';

@Controller('api')
export class AppController {
  @Get('health')
  getHealth() {
    return {
      status: 'OK',
      application: 'FinAssist AI',
      timestamp: new Date().toISOString(),
    };
  }
}

