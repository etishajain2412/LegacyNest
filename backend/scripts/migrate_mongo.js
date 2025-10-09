// scripts/migrate_mongo.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user');
const Story = require('../src/models/story');

async function run() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('Connected to Mongo for migration');

  // Ensure default consentMatching for existing users
  const res = await User.updateMany({ consentMatching: { $exists: false } }, { $set: { consentMatching: true } });
  console.log('Updated users without consentMatching:', res.nModified || res.modifiedCount);

  // Create indexes (if not present)
  await Story.collection.createIndex({ familyId: 1, userId: 1 });
  console.log('Created indexes on stories');

  console.log('Migration complete');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
