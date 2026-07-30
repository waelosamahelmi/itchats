import { Controller, Get, Post, Param, Req, UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RoleplayService } from './roleplay.service';

@Controller('v1/roleplay')
export class RoleplayController {
  constructor(
    @Inject(RoleplayService) private readonly roleplayService: RoleplayService,
  ) {}

  @Get(':characterId/status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Param('characterId') characterId: string, @Req() req: any) {
    return this.roleplayService.getStatus(characterId, req.user.userId);
  }

  @Post(':characterId/request')
  @UseGuards(JwtAuthGuard)
  async requestRoleplay(@Param('characterId') characterId: string, @Req() req: any) {
    return this.roleplayService.requestRoleplay(characterId, req.user.userId);
  }

  @Post(':characterId/leave')
  @UseGuards(JwtAuthGuard)
  async leaveRoleplay(@Param('characterId') characterId: string) {
    return this.roleplayService.leaveRoleplay(characterId);
  }
}
