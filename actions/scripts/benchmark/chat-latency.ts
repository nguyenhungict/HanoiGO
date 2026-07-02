/**
 * Real-time chat latency benchmark (end-to-end).
 *
 * Connects a genuine Socket.io client to the running GroupChatGateway and
 * measures the full round trip of a chat message:
 *
 *   client emit `send_message`
 *     -> NestJS gateway handler
 *     -> Prisma INSERT into PostgreSQL
 *     -> server `to(room).emit('new_message')`
 *     -> client receives `new_message`
 *
 * The sender is part of the room, so the same socket that sends also receives
 * the broadcast — this lets a single authenticated client time the whole path.
 *
 * Requires the backend (port 8888) and PostgreSQL to be running.
 * All messages created during the run are deleted afterwards so the database
 * is left unchanged.
 *
 * Usage:  npm run benchmark:chat
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { io, Socket } from 'socket.io-client';
import * as jwt from 'jsonwebtoken';

const URL = process.env.BENCH_URL || 'http://localhost:8888';
const WARMUP = 20;
const SAMPLES = 200;

const pct = (sorted: number[], p: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

async function main() {
  const prisma = new PrismaClient();
  const secret = process.env.JWT_SECRET || 'super-secret';

  // 1. Pick an existing user who is an APPROVED member of some activity.
  const member = await prisma.activityMember.findFirst({
    where: { status: 'APPROVED' },
    include: { user: { select: { id: true, username: true } } },
  });
  if (!member) {
    console.error('No APPROVED activity member found — seed an activity first.');
    process.exit(1);
  }
  const { activityId } = member;
  const { id: userId, username } = member.user;
  console.log(`Room ${activityId}  as ${username}\n`);

  // 2. Mint a token the gateway will accept (same secret + claims).
  const token = jwt.sign({ sub: userId, username }, secret, { expiresIn: '1h' });

  // 3. Connect and time the handshake.
  const tConnect = Date.now();
  const socket: Socket = io(`${URL}/group-chat`, {
    auth: { token },
    transports: ['websocket'],
    forceNew: true,
  });

  const createdIds: string[] = [];
  await new Promise<void>((resolve, reject) => {
    socket.on('connect_error', (e) => reject(e));
    socket.once('connect', () => resolve());
    setTimeout(() => reject(new Error('connect timeout')), 5000);
  });
  const connectMs = Date.now() - tConnect;
  console.log(`Handshake + auth: ${connectMs} ms`);

  // 4. Join the room and wait for the history payload (room is ready).
  await new Promise<void>((resolve, reject) => {
    socket.once('message_history', () => resolve());
    socket.once('error', (e) => reject(new Error(JSON.stringify(e))));
    socket.emit('join_activity', { activityId });
    setTimeout(() => reject(new Error('join timeout')), 5000);
  });

  // 5. One in-flight message at a time; time emit -> new_message.
  const sendOne = (seq: number) =>
    new Promise<number>((resolve, reject) => {
      const marker = `__bench__${seq}`;
      const t0 = process.hrtime.bigint();
      const onMsg = (msg: any) => {
        if (msg?.content !== marker) return;
        socket.off('new_message', onMsg);
        createdIds.push(msg.id);
        resolve(Number(process.hrtime.bigint() - t0) / 1e6);
      };
      socket.on('new_message', onMsg);
      socket.emit('send_message', { activityId, content: marker, type: 'TEXT' });
      setTimeout(() => reject(new Error('msg timeout')), 5000);
    });

  for (let i = 0; i < WARMUP; i++) await sendOne(i);

  const samples: number[] = [];
  for (let i = 0; i < SAMPLES; i++) samples.push(await sendOne(WARMUP + i));

  socket.disconnect();

  // 6. Clean up — remove every message this benchmark created.
  if (createdIds.length) {
    await prisma.messageReaction.deleteMany({ where: { messageId: { in: createdIds } } });
    await prisma.message.deleteMany({ where: { id: { in: createdIds } } });
  }
  await prisma.$disconnect();

  // 7. Report.
  const sorted = [...samples].sort((a, b) => a - b);
  const r2 = (x: number) => x.toFixed(1);
  console.log(`\nMessage round-trip over ${SAMPLES} samples (ms):`);
  console.log(`  min   ${r2(sorted[0])}`);
  console.log(`  mean  ${r2(mean(samples))}`);
  console.log(`  p50   ${r2(pct(sorted, 50))}`);
  console.log(`  p95   ${r2(pct(sorted, 95))}`);
  console.log(`  max   ${r2(sorted[sorted.length - 1])}`);
  console.log(`\nCleaned up ${createdIds.length} benchmark messages.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
