import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

async function main() {
  // Seed default settings
  await prisma.appSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      provider: 'GEMINI',
      model: 'gemini-2.0-flash',
      systemPrompt: 'You are AGENT-7, a high-level cyber intelligence AI. Your purpose is to assist in deep-cover operations, target reconnaissance, and tactical planning.',
      usePremiumTools: true,
      baseUrl: 'https://api.openai.com/v1'
    }
  });

  // Seed default assets
  const existingAssets = await prisma.asset.count();
  if (existingAssets === 0) {
    await prisma.asset.createMany({
      data: [
        { type: 'IOT_SWARM', region: 'NA-EAST', status: 'ACTIVE', dataRate: 124 },
        { type: 'GHOST_RELAY', region: 'EU-CENTRAL', status: 'EXFILTRATING', dataRate: 4050 },
        { type: 'PACKET_SNIFFER', region: 'ASIA-SOUTH', status: 'ACTIVE', dataRate: 890 },
        { type: 'TROJAN_DAEMON', region: 'SA-WEST', status: 'DORMANT', dataRate: 0 },
      ]
    });
  }

  console.log('Database seeded successfully');
}

main().catch(console.error).finally(() => process.exit(0));
