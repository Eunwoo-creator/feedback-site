import { database } from '../../../lib/database';
import { handleFeedback } from '../../../api/feedback';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  return handleFeedback(request, database);
}
