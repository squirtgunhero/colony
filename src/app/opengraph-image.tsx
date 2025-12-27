import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Colony | Real Estate CRM';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Two interlocking golden rings */}
        <div style={{ display: 'flex', position: 'relative', marginBottom: '40px' }}>
          <svg width="400" height="400" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="11" cy="16" rx="7" ry="12" stroke="#a08a50" strokeWidth="2" fill="none" opacity="0.8"/>
            <ellipse cx="21" cy="16" rx="7" ry="12" stroke="#c9a962" strokeWidth="2" fill="none"/>
          </svg>
        </div>
        
        {/* Colony text */}
        <div
          style={{
            fontSize: '80px',
            fontWeight: '600',
            color: '#c9a962',
            letterSpacing: '0.05em',
            marginTop: '20px',
          }}
        >
          COLONY
        </div>
        
        {/* Subtitle */}
        <div
          style={{
            fontSize: '32px',
            color: '#ffffff',
            opacity: 0.9,
            marginTop: '16px',
          }}
        >
          Real Estate CRM
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

