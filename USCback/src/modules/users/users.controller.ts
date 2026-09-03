import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  @Get('random')
  getRandomUsers(
    @CurrentUser() user: any,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.usersService.getRandomUsers(user.id, limit || 10);
  }

  @Get('search')
  searchUsers(@CurrentUser() user: any, @Query('q') q?: string) {
    return this.usersService.searchUsers(q || '', user.id);
  }

  @Get(':id')
  getUserById(@Param('id') id: string, @CurrentUser() currentUser: any) {
    return this.usersService.getUserById(id, currentUser.id);
  }

  @Get(':id/profile')
  getUserProfile(@Param('id') id: string, @CurrentUser() currentUser: any) {
    return this.usersService.getUserProfile(id, currentUser.id);
  }

  @Put('me')
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Delete('me')
  deleteAccount(@CurrentUser() user: any) {
    return this.usersService.deleteAccount(user.id);
  }
}
