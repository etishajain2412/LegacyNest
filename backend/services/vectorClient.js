
const USE_LOCAL = process.env.USE_LOCAL_VECTOR_DB === 'true';

if (USE_LOCAL) {
  module.exports = require('./vectorClientLocal');
} else {
  // fall back to existing Pinecone client
  module.exports = require('./vectorClientPinecone');
}
