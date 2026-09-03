import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Post()
  createPost(
    @CurrentUser() user: any,
    @Body() createPostDto: { content: string; imageUrl?: string; accessLevel?: string },
  ) {
    return this.postsService.createPost(user.id, createPostDto);
  }

  @Get('feed')
  getFeed(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.postsService.getFeed(
      user.id,
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0,
    );
  }

  @Get(':id')
  getPost(@Param('id') id: string, @CurrentUser() user: any) {
    return this.postsService.getPost(id, user.id);
  }

  @Post(':id/like')
  likePost(@Param('id') id: string, @CurrentUser() user: any) {
    return this.postsService.likePost(id, user.id);
  }

  @Delete(':id/like')
  unlikePost(@Param('id') id: string, @CurrentUser() user: any) {
    return this.postsService.unlikePost(id, user.id);
  }

  @Post(':id/comment')
  addComment(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { content: string },
  ) {
    return this.postsService.addComment(id, user.id, body.content);
  }

  @Get(':id/comments')
  getComments(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.postsService.getComments(
      id,
      user.id,
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0,
    );
  }

  @Delete(':id')
  deletePost(@Param('id') id: string, @CurrentUser() user: any) {
    return this.postsService.deletePost(id, user.id);
  }

  @Delete('comments/:commentId')
  deleteComment(@Param('commentId') commentId: string, @CurrentUser() user: any) {
    return this.postsService.deleteComment(commentId, user.id);
  }
}
