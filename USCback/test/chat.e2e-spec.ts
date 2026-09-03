import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ChatService } from '../src/modules/chat/chat.service';
import { MatchesService } from '../src/modules/matches/matches.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { RedisService } from '../src/common/redis/redis.service';
import configuration from '../src/config/configuration';

describe('ChatService - Critical Flow', () => {
  let chatService: ChatService;
  let matchesService: MatchesService;
  let prisma: PrismaService;
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
      providers: [ChatService, MatchesService, PrismaService, RedisService],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    chatService = module.get<ChatService>(ChatService);
    matchesService = module.get<MatchesService>(MatchesService);
    prisma = module.get<PrismaService>(PrismaService);

    await prisma.cleanDatabase();
  });

  afterAll(async () => {
    await prisma.cleanDatabase();
    await app.close();
  });

  describe('Message Sending', () => {
    let user1: any;
    let user2: any;
    let user3: any;

    beforeEach(async () => {
      user1 = await prisma.user.create({
        data: {
          name: 'User 1',
          email: 'user1@test.com',
          password: 'password123',
          major: 'CS',
        },
      });

      user2 = await prisma.user.create({
        data: {
          name: 'User 2',
          email: 'user2@test.com',
          password: 'password123',
          major: 'EE',
        },
      });

      user3 = await prisma.user.create({
        data: {
          name: 'User 3',
          email: 'user3@test.com',
          password: 'password123',
          major: 'ME',
        },
      });
    });

    afterEach(async () => {
      await prisma.message.deleteMany();
      await prisma.match.deleteMany();
      await prisma.like.deleteMany();
      await prisma.user.deleteMany();
    });

    it('should allow messaging only when match exists', async () => {
      // Create match between user1 and user2
      const [userAId, userBId] =
        user1.id < user2.id ? [user1.id, user2.id] : [user2.id, user1.id];

      await prisma.match.create({
        data: {
          userAId,
          userBId,
        },
      });

      // Should allow message
      const message = await chatService.sendMessage(
        user1.id,
        user2.id,
        'Hello, matched!',
      );

      expect(message).toBeDefined();
      expect(message.content).toBe('Hello, matched!');
      expect(message.senderId).toBe(user1.id);
      expect(message.receiverId).toBe(user2.id);
    });

    it('should reject message when no match exists', async () => {
      // No match between user1 and user3
      await expect(
        chatService.sendMessage(user1.id, user3.id, 'Hello'),
      ).rejects.toThrow('You can only message users you have matched with');
    });

    it('should retrieve conversation correctly', async () => {
      // Create match
      const [userAId, userBId] =
        user1.id < user2.id ? [user1.id, user2.id] : [user2.id, user1.id];

      await prisma.match.create({
        data: { userAId, userBId },
      });

      // Send multiple messages
      await chatService.sendMessage(user1.id, user2.id, 'Message 1');
      await chatService.sendMessage(user2.id, user1.id, 'Message 2');
      await chatService.sendMessage(user1.id, user2.id, 'Message 3');

      // Get conversation
      const conversation = await chatService.getConversation(user1.id, user2.id);

      expect(conversation).toHaveLength(3);
      expect(conversation[0].content).toBe('Message 1');
      expect(conversation[1].content).toBe('Message 2');
      expect(conversation[2].content).toBe('Message 3');
    });

    it('should enforce maximum message length', async () => {
      const [userAId, userBId] =
        user1.id < user2.id ? [user1.id, user2.id] : [user2.id, user1.id];

      await prisma.match.create({
        data: { userAId, userBId },
      });

      const longMessage = 'a'.repeat(1001);

      await expect(
        chatService.sendMessage(user1.id, user2.id, longMessage),
      ).rejects.toThrow();
    });
  });
});
