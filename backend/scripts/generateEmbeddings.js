// scripts/generateEmbeddings.js
// Run with: node scripts/generateEmbeddings.js

require('dotenv').config();
const mongoose = require('mongoose');
const Story = require('../src/models/Story');
const vectorClient = require('../src/services/vectorClientLocal');
const { createEmbedding } = require('../src/services/ai');

const MONGO = process.env.MONGO_URI || process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/legacytrunk';

async function main() {
  console.log('Connecting to MongoDB...', MONGO);
  await mongoose.connect(MONGO, { /* useNewUrlParser and useUnifiedTopology deprecated - omit */ });
  console.log('Connected.');

  // optional init for vector client (no-op for local client)
  if (typeof vectorClient.init === 'function') {
    try { await vectorClient.init(); } catch (e) { /* ignore */ }
  }

  // find stories missing embeddings
  const cursor = Story.find({ $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }] }).cursor();

  let processed = 0;
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    try {
      const text = (doc.summary && doc.summary.trim()) || (doc.transcript && doc.transcript.trim()) || (doc.content && doc.content.trim()) || '';
      if (!text) {
        console.log(`[SKIP] ${doc._id} - no textual content`);
        continue;
      }

      console.log(`[EMBED] ${doc._id} - generating embedding...`);
      const emb = await createEmbedding(text);
      if (!emb) {
        console.warn(`[FAIL] ${doc._id} - embedding returned null`);
        continue;
      }

      // Save into Story doc
      await Story.findByIdAndUpdate(doc._id, { $set: { embedding: emb } });
      // Upsert into local vector client (keeps vectorMetadata in sync)
      try {
        await vectorClient.upsertVector('local-index', String(doc._id), emb, {
          storyId: String(doc._id),
          userId: String(doc.userId),
          title: doc.title || '',
          tags: doc.tags || []
        });
      } catch (err) {
        console.warn(`[WARN] upsertVector failed for ${doc._id}:`, err?.message || err);
      }

      processed++;
      console.log(`[DONE] ${doc._id}`);
    } catch (err) {
      console.error(`[ERR] ${doc._id}:`, err?.message || err);
    }
  }

  console.log(`Finished. Processed ${processed} stories.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
