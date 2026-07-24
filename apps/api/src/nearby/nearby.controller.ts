import { Controller, Get, Post, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { NearbyService } from './nearby.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('v1')
export class NearbyController {
  constructor(private readonly service: NearbyService) {}

  @Get('characters/nearby')
  @UseGuards(JwtAuthGuard)
  async nearby(@Query('lat') lat: string, @Query('lng') lng: string, @Query('radius') radius?: string) {
    return this.service.findNearby(
      parseFloat(lat ?? '30'), parseFloat(lng ?? '31'),
      parseInt(radius ?? '50000'), 30
    );
  }

  @Post('characters/:characterId/location')
  @UseGuards(JwtAuthGuard)
  async setLocation(@Param('characterId') id: string, @Body() body: { city: string; region?: string }, @Req() req: any) {
    return this.service.setCharacterLocation(id, body.city, body.region);
  }
}
