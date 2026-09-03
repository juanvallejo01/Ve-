import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { LikesService } from '../src/modules/likes/likes.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { RedisService } from '../src/common/redis/redis.service';
import configuration from '../src/config/configuration';

describe('LikesService - Critical Flow', () => {
  let service: LikesService;
  let prisma: PrismaService;
  let redis: RedisService;
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
        JwtModule.register({}),
      ],
      providers: [LikesService, PrismaService, RedisService],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    service = module.get<LikesService>(LikesService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);

    // Clean database before tests
    await prisma.cleanDatabase();
  });

  afterAll(async () => {
    await prisma.cleanDatabase();
    await app.close();
  });

  describe('Mutual Like Flow', () => {
    let user1: any;
    let user2: any;

    beforeEach(async () => {
      // Create test users
      user1 = await prisma.user.create({
        data: {
          name: 'User 1',
          email: 'user1@test.com',
          password: 'password123',
          major: 'Computer Science',
        },
      });

      user2 = await prisma.user.create({
        data: {
          name: 'User 2',
          email: 'user2@test.com',
          password: 'password123',
          major: 'Engineering',
        },
      });
    });

    afterEach(async () => {
      await prisma.notification.deleteMany();
      await prisma.match.deleteMany();
      await prisma.like.deleteMany();
      await prisma.user.deleteMany();
    });

    it('should create like without match when no reverse like exists', async () => {
      const result = await service.createLike(user1.id, user2.id);

      expect(result.matchCreated).toBe(false);
      expect(result.like).toBeDefined();
      expect(result.like.senderId).toBe(user1.id);
      expect(result.like.receiverId).toBe(user2.id);

      // Verify receiver's likes count increased
      const updatedUser2 = await prisma.user.findUnique({
        where: { id: user2.id },
      });
      expect(updatedUser2?.likesCount).toBe(1);
    });

    it('should create match when mutual like exists', async () => {
      // First like: user1 likes user2
      await service.createLike(user1.id, user2.id);

      // Second like: user2 likes user1 (creates match)
      const result = await service.createLike(user2.id, user1.id);

      expect(result.matchCreated).toBe(true);
      expect(result.matchId).toBeDefined();

      // Verify match was created with ordered pair
      const match = await prisma.match.findFirst({
        where: {
          OR: [
            { userAId: user1.id, userBId: user2.id },
            { userAId: user2.id, userBId: user1.id },
          ],
        },
      });

      expect(match).toBeDefined();
      // Ensure lower ID is always userAId
      if (user1.id < user2.id) {
        expect(match?.userAId).toBe(user1.id);
        expect(match?.userBId).toBe(user2.id);
      } else {
        expect(match?.userAId).toBe(user2.id);
        expect(match?.userBId).toBe(user1.id);
      }

      // Verify notifications were created for both users
      const notifications = await prisma.notification.findMany({
        where: {
          type: 'MATCH',
        },
      });

      expect(notifications).toHaveLength(2);
      const userIds = notifications.map((n) => n.userId);
      expect(userIds).toContain(user1.id);
      expect(userIds).toContain(user2.id);
    });

    it('should prevent duplicate likes', async () => {
      await service.createLike(user1.id, user2.id);

      await expect(service.createLike(user1.id, user2.id)).rejects.toThrow(
        'Like already exists',
      );
    });

    it('should prevent self-likes', async () => {
      await expect(service.createLike(user1.id, user1.id)).rejects.toThrow(
        'Cannot like yourself',
      );
    });

    it('should handle race condition for simultaneous mutual likes', async () => {
      // Simulate simultaneous likes from both users
      const [result1, result2] = await Promise.allSettled([
        service.createLike(user1.id, user2.id),
        service.createLike(user2.id, user1.id),
      ]);

      // One should succeed, one might fail or both might succeed
      // but only one match should be created
      const matches = await prisma.match.findMany();
      expect(matches.length).toBeLessThanOrEqual(1);

      const likes = await prisma.like.findMany();
      expect(likes.length).toBeGreaterThanOrEqual(1);
      expect(likes.length).toBeLessThanOrEqual(2);
    });
  });
});
