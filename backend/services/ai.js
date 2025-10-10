

const dotenv = require('dotenv');
dotenv.config();

const USE_LOCAL = process.env.USE_LOCAL_EMBEDDINGS !== 'false'; 
const MODEL_NAME = process.env.LOCAL_EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';

let _localPipeline = null;

//Lazy-load the local transformer pipeline for embeddings. 
async function initLocalPipeline() {
  if (_localPipeline) return _localPipeline;
  try {
    const { pipeline } = await require('@xenova/transformers');
    _localPipeline = await pipeline('feature-extraction', MODEL_NAME);
    console.log('Local embedding pipeline initialized:', MODEL_NAME);
    return _localPipeline;
  } catch (err) {
    console.error('Failed to initialize local embedding pipeline:', err?.message || err);
    throw err;
  }
}

// Helper utilities for vector extraction 
function isNumberArray(val) {
  if (!val) return false;
  if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'number') return true;
  if (ArrayBuffer.isView(val) && typeof val[0] === 'number') return true;
  return false;
}

function toNumberArray(arr) {
  if (!arr) return null;
  if (Array.isArray(arr)) return Array.from(arr).map(n => Number(n));
  if (ArrayBuffer.isView(arr)) return Array.from(arr).map(n => Number(n));
  return null;
}

function avgVectors(vecs) {
  if (!Array.isArray(vecs) || vecs.length === 0) return null;
  const first = vecs[0];
  if (!isNumberArray(first)) return null;
  const dim = first.length;
  const sum = new Array(dim).fill(0);
  let count = 0;
  for (const v of vecs) {
    const nv = toNumberArray(v);
    if (!nv || nv.length !== dim) continue;
    for (let i = 0; i < dim; i++) sum[i] += nv[i];
    count++;
  }
  if (count === 0) return null;
  return sum.map(x => x / count);
}


function extractFlatArrayFromDataField(dataField) {
  if (!dataField) return null;
  // typed array or array
  if (Array.isArray(dataField) || ArrayBuffer.isView(dataField)) {
    return toNumberArray(dataField);
  }
  // object keyed by numeric strings
  if (typeof dataField === 'object') {
    const keys = Object.keys(dataField);
    // filter numeric keys and sort
    const numericKeys = keys.filter(k => String(Number(k)) === String(k)).sort((a, b) => Number(a) - Number(b));
    if (numericKeys.length === 0) {
      // maybe it's like { data: { values: [...] } } - try common nested shapes
      if (Array.isArray(dataField.values)) return toNumberArray(dataField.values);
      return null;
    }
    const arr = numericKeys.map(k => Number(dataField[k]));
    return arr;
  }
  return null;
}

/**
 * Given flat array and dims array, reshape into nested arrays by dims.
 * For dims like [batch, tokens, dim] we will return array of token vectors for first batch.
 * If dims is [batch, dim] we return the single vector for first batch.
 */
function reshapeFlatArrayByDims(flat, dims) {
  if (!Array.isArray(flat) || flat.length === 0) return null;
  if (!Array.isArray(dims) || dims.length === 0) return flat;

  // If dims indicate a batch dimension: e.g. [1, 8, 384]
  // We'll focus on the first batch (index 0).
  const dimsNums = dims.map(d => Number(d));
  // If dims length is 3 => [batch, tokens, dim]
  if (dimsNums.length === 3) {
    const [b, t, d] = dimsNums;
    const perBatch = t * d;
    if (flat.length === b * perBatch) {
      // Extract first batch slice
      const start = 0;
      const batchSlice = flat.slice(start, start + perBatch);
      // Split into t vectors of length d
      const tokenVectors = [];
      for (let i = 0; i < t; i++) {
        const s = i * d;
        tokenVectors.push(batchSlice.slice(s, s + d));
      }
      return tokenVectors; // array of token vectors
    }
  }

  // If dims length is 2 => [batch, dim]
  if (dimsNums.length === 2) {
    const [b, d] = dimsNums;
    if (flat.length === b * d) {
      // return first batch as vector
      return flat.slice(0, d);
    }
  }

  // If dims length is 1 => [dim]
  if (dimsNums.length === 1 && flat.length === dimsNums[0]) {
    return flat;
  }

  // Fallback: try to find plausible split: if dims last number divides length
  const lastDim = dimsNums[dimsNums.length - 1];
  if (lastDim && flat.length % lastDim === 0) {
    const count = flat.length / lastDim;
    // create array of count vectors
    const vecs = [];
    for (let i = 0; i < count; i++) {
      vecs.push(flat.slice(i * lastDim, (i + 1) * lastDim));
    }
    // if count===1 return vector else return token vectors
    return count === 1 ? vecs[0] : vecs;
  }

  // If we can't intelligently reshape, just return flat
  return flat;
}

/**
 * Attempt to extract a usable embedding vector from many possible pipeline outputs.
 * Returns number[] or null.
 */
function extractEmbeddingFromPipelineOutput(out) {
  // 1) direct number array or typed array
  if (isNumberArray(out)) return toNumberArray(out);

  // 2) If object with .data field (Xenova style), try to get flat array and reshape using dims
  if (out && typeof out === 'object') {
    if (out.data) {
      const flat = extractFlatArrayFromDataField(out.data);
      if (flat && flat.length > 0) {
        // if dims present, reshape
        if (Array.isArray(out.dims) && out.dims.length > 0) {
          const reshaped = reshapeFlatArrayByDims(flat, out.dims);
          if (Array.isArray(reshaped) && reshaped.length > 0 && isNumberArray(reshaped[0])) {
            // token vectors -> avg them
            return avgVectors(reshaped);
          }
          if (isNumberArray(reshaped)) return toNumberArray(reshaped);
        }
        // no dims to guide, if length looks like a vector return it
        return toNumberArray(flat);
      }
    }

    // If object has embeddings/result fields (other libs)
    if (Array.isArray(out.embeddings)) return extractEmbeddingFromPipelineOutput(out.embeddings);
    if (Array.isArray(out.result)) return extractEmbeddingFromPipelineOutput(out.result);
    if (Array.isArray(out.outputs)) return extractEmbeddingFromPipelineOutput(out.outputs);
  }

  // 3) If array, try nested handling (previous logic)
  if (Array.isArray(out)) {
    // simple nested like [[...]]
    if (out.length > 0 && isNumberArray(out[0])) return toNumberArray(out[0]);

    // flattened token vectors maybe in out.flat()
    const flattenedOne = out.flat && Array.isArray(out.flat) ? out.flat() : out.flat(Infinity);
    if (flattenedOne && flattenedOne.length > 0 && isNumberArray(flattenedOne[0])) {
      // If flattenedOne contains number arrays, average them
      if (Array.isArray(flattenedOne[0])) return avgVectors(flattenedOne);
      return toNumberArray(flattenedOne[0]);
    }

    // deeper shapes: check if out contains arrays of numbers
    for (const level1 of out) {
      if (Array.isArray(level1) && level1.length > 0) {
        if (isNumberArray(level1[0])) return avgVectors(level1);
        if (Array.isArray(level1[0]) && isNumberArray(level1[0][0])) return avgVectors(level1[0]);
      }
    }
  }

  // 4) Give up
  return null;
}

let _embeddingDebugLogged = false;

/**
 * Main createEmbedding function (local pipeline).
 * Returns number[] or null.
 */
async function createEmbedding(text, opts = {}) {
  if (!text || !String(text).trim()) return null;
  if (!USE_LOCAL) {
    console.warn('Local embeddings disabled; createEmbedding returning null.');
    return null;
  }

  try {
    const pipe = await initLocalPipeline();
    const out = await pipe(String(text));

    // Debug: log shape preview once
    if (!_embeddingDebugLogged) {
      try {
        const type = Array.isArray(out) ? `Array(len=${out.length})` : typeof out;
        console.log(`🧩 createEmbedding: pipeline returned type=${type}`);
        const preview = (() => {
          try {
            if (Array.isArray(out)) return JSON.stringify(out.slice(0, 1)).slice(0, 200);
            return JSON.stringify(out).slice(0, 200);
          } catch { return String(out).slice(0, 200); }
        })();
        console.log('🪄 Output preview:', preview);
      } catch {}
      _embeddingDebugLogged = true;
    }

    let emb = extractEmbeddingFromPipelineOutput(out);

    // If extraction failed but out is array, try per-element extraction
    if (!emb && Array.isArray(out)) {
      for (const candidate of out) {
        const maybe = extractEmbeddingFromPipelineOutput(candidate);
        if (maybe) {
          emb = maybe;
          break;
        }
      }
    }

    if (!emb) {
      console.warn('createEmbedding: pipeline returned unexpected shape.');
      return null;
    }

    return Array.from(emb).map(Number);
  } catch (err) {
    console.error('Local embedding failed:', err?.message || err);
    return null;
  }
}


async function generateSummaryAndTags(text) {
  if (!text || !String(text).trim()) return { summary: '', tags: [] };

  try {
    const raw = String(text).trim();
    const sentences = raw.match(/[^.!?]+[.!?]*/g) || [raw];
    let summary = '';
    for (const s of sentences) {
      if ((summary + ' ' + s).trim().length <= 280) {
        summary = (summary + ' ' + s).trim();
      } else {
        if (!summary) summary = s.trim().slice(0, 280);
        break;
      }
    }
    if (!summary) summary = raw.slice(0, 280);

    const stopwords = new Set([
      'the','a','and','to','in','of','we','i','my','our','it','is','was','for',
      'on','with','that','as','at','by','an','be','this','they','are','from','or','have','had','but'
    ]);

    const tokens = raw.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const freq = {};
    for (const t of tokens) {
      if (t.length < 3) continue;
      if (stopwords.has(t)) continue;
      freq[t] = (freq[t] || 0) + 1;
    }
    const tags = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]);

    return { summary, tags };
  } catch (err) {
    console.warn('generateSummaryAndTags error:', err?.message || err);
    return { summary: text.slice(0, 280), tags: [] };
  }
}

module.exports = { createEmbedding, generateSummaryAndTags };
