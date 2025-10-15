import 'dotenv/config';
import { shareService } from '@/lib/services/share.service';

async function main() {
  try {
    const eventId = process.argv[2];
    const folderId = process.argv[3];

    if (!eventId || !folderId) {
      console.error('Usage: npx tsx scripts/debug-share.ts <eventId> <folderId>');
      process.exit(1);
    }

    const result = await shareService.createShare({
      eventId,
      folderId,
      shareType: 'folder',
      includeDescendants: false,
      allowComments: false,
      allowDownload: false,
      metadata: {},
    });

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error running debug-share:', error);
  }
}

void main();
