import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MatchesService } from '../matches/matches.service';
import { resolveDisplayName } from '@/common/utils/display-name.util';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private matchesService: MatchesService,
  ) {}

  async createPost(userId: string, data: { content: string; imageUrl?: string }) {
    const post = await this.prisma.post.create({
      data: {
        userId,
        content: data.content,
        imageUrl: data.imageUrl,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            major: true,
            photoUrl: true,
          },
        },
      },
    });

    return post;
  }

  async getFeed(userId: string, limit: number = 20, offset: number = 0) {
    const posts = await this.prisma.post.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            major: true,
            photoUrl: true,
          },
        },
        _count: {
          select: {
            postLikes: true,
            comments: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const postIds = posts.map((p) => p.id);
    const [userLikes, matchedIds] = await Promise.all([
      this.prisma.postLike.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true },
      }),
      this.matchesService.getMatchedUserIds(userId),
    ]);
    const likedPostIds = new Set(userLikes.map((l) => l.postId));

    // En el feed solo se ve el apodo del autor, salvo que ya hayas hecho
    // match con esa persona.
    return posts.map((post) => ({
      ...post,
      user: { ...post.user, name: resolveDisplayName(post.user, userId, matchedIds), nickname: undefined },
      likesCount: post._count.postLikes,
      commentsCount: post._count.comments,
      isLiked: likedPostIds.has(post.id),
      _count: undefined,
    }));
  }

  async getPost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            major: true,
            photoUrl: true,
          },
        },
        _count: {
          select: {
            postLikes: true,
            comments: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    const [isLiked, isMatched] = await Promise.all([
      this.prisma.postLike.findUnique({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
      }),
      this.matchesService.checkMatch(userId, post.user.id),
    ]);

    return {
      ...post,
      user: { ...post.user, name: resolveDisplayName(post.user, userId, isMatched), nickname: undefined },
      likesCount: post._count.postLikes,
      commentsCount: post._count.comments,
      isLiked: !!isLiked,
      _count: undefined,
    };
  }

  async likePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    // Check if already liked
    const existing = await this.prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existing) {
      return { message: 'Post already liked' };
    }

    // Create like and increment counters
    await this.prisma.$transaction([
      this.prisma.postLike.create({
        data: {
          postId,
          userId,
        },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      }),
      // Increment post author's likesCount for ranking
      this.prisma.user.update({
        where: { id: post.userId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);

    return { message: 'Post liked successfully' };
  }

  async unlikePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    const like = await this.prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (!like) {
      return { message: 'Post not liked' };
    }

    // Delete like and decrement counters
    await this.prisma.$transaction([
      this.prisma.postLike.delete({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      }),
      // Decrement post author's likesCount for ranking
      this.prisma.user.update({
        where: { id: post.userId },
        data: { likesCount: { decrement: 1 } },
      }),
    ]);

    return { message: 'Post unliked successfully' };
  }

  async addComment(postId: string, userId: string, content: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    const [comment] = await this.prisma.$transaction([
      this.prisma.comment.create({
        data: {
          postId,
          userId,
          content,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              major: true,
            },
          },
        },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      }),
    ]);

    return comment;
  }

  async getComments(postId: string, viewerId: string, limit: number = 20, offset: number = 0) {
    const comments = await this.prisma.comment.findMany({
      where: {
        postId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            major: true,
            photoUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const matchedIds = await this.matchesService.getMatchedUserIds(viewerId);

    return comments.map((comment) => ({
      ...comment,
      user: { ...comment.user, name: resolveDisplayName(comment.user, viewerId, matchedIds), nickname: undefined },
    }));
  }

  async deletePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    // Soft delete - decrement user's likesCount by post's likes
    await this.prisma.$transaction([
      this.prisma.post.update({
        where: { id: postId },
        data: { deletedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { likesCount: { decrement: post.likesCount } },
      }),
    ]);

    return { message: 'Post deleted successfully' };
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: true },
    });

    if (!comment || comment.deletedAt) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId && comment.post.userId !== userId) {
      throw new ForbiddenException(
        'You can only delete your own comments or comments on your posts',
      );
    }

    await this.prisma.$transaction([
      this.prisma.comment.update({
        where: { id: commentId },
        data: { deletedAt: new Date() },
      }),
      this.prisma.post.update({
        where: { id: comment.postId },
        data: { commentsCount: { decrement: 1 } },
      }),
    ]);

    return { message: 'Comment deleted successfully' };
  }
}
