import React from 'react';

/**
 * Props: 
 *  - match: {
 *      score: number,
 *      left: { _id, title, summary, mediaUrl, tags, transcript, userId, userName, birthYear },
 *      right: { ...same shape... },
 *      explanation: string
 *    }
 */
export default function MatchCard({ match }) {
  const left = match.left || match.storyA || match.source || {};
  const right = match.right || match.storyB || match.target || {};

  return (
    <article className="polaroid p-4">
      <div className="flex gap-4">
        <div className="w-28">
          <div className="w-28 h-28 bg-gray-100 overflow-hidden flex items-center justify-center">
            {left.mediaUrl ? <img src={left.mediaUrl} alt={left.title || 'left'} className="w-full h-full object-cover" /> : <div className="text-xs text-faded">no image</div>}
          </div>
          <div className="mt-2 text-xs text-faded">{left.userName || left.userId || ''} • {left.birthYear || ''}</div>
        </div>

        <div className="flex-1">
          <h3 className="font-serif text-lg">{left.title || 'Memory'}</h3>
          <p className="text-sm line-clamp-3">{left.summary || (left.transcript && left.transcript.slice(0, 140) + '...')}</p>

          <div className="mt-3 flex items-start gap-3">
            <div className="w-28 h-28 bg-gray-100 overflow-hidden flex items-center justify-center">
              {right.mediaUrl ? <img src={right.mediaUrl} alt={right.title || 'right'} className="w-full h-full object-cover" /> : <div className="text-xs text-faded">no image</div>}
            </div>
            <div className="flex-1">
              <h4 className="font-serif">{right.title || 'Memory'}</h4>
              <p className="text-sm line-clamp-3">{right.summary || (right.transcript && right.transcript.slice(0, 140) + '...')}</p>
            </div>
          </div>

          <div className="mt-3 text-xs text-faded">
            <strong>Why this match:</strong> {match.explanation || 'Shared themes or tags'}
          </div>

        </div>

        <div className="w-20 text-right">
          <div className="text-sm text-faded">score</div>
          <div className="text-lg font-mono">{(match.score || 0).toFixed(2)}</div>
        </div>
      </div>
    </article>
  );
}
