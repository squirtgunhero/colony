import { ImageResponse } from 'next/og';

export async function GET() {
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
          backgroundColor: '#0f0f0f',
          backgroundImage: 'radial-gradient(circle at 50% 30%, #1a1a1a 0%, #0f0f0f 70%)',
        }}
      >
        {/* Two interlocking golden rings */}
        <div style={{ display: 'flex', marginBottom: '30px' }}>
          <svg width="280" height="280" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="gold1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d4af37" />
                <stop offset="50%" stopColor="#f5d878" />
                <stop offset="100%" stopColor="#a08a50" />
              </linearGradient>
              <linearGradient id="gold2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c9a962" />
                <stop offset="50%" stopColor="#e8d48b" />
                <stop offset="100%" stopColor="#b8983f" />
              </linearGradient>
            </defs>
            <ellipse cx="11" cy="16" rx="7" ry="12" stroke="url(#gold1)" strokeWidth="1.8" fill="none" opacity="0.85"/>
            <ellipse cx="21" cy="16" rx="7" ry="12" stroke="url(#gold2)" strokeWidth="1.8" fill="none"/>
          </svg>
        </div>
        
        {/* Colony text */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: '300',
            background: 'linear-gradient(135deg, #d4af37 0%, #f5d878 50%, #c9a962 100%)',
            backgroundClip: 'text',
            color: 'transparent',
            letterSpacing: '0.15em',
            marginTop: '10px',
          }}
        >
          COLONY
        </div>
        
        {/* Subtitle */}
        <div
          style={{
            fontSize: '24px',
            color: 'rgba(255, 255, 255, 0.7)',
            marginTop: '16px',
            letterSpacing: '0.1em',
            fontWeight: '300',
          }}
        >
          Real Estate CRM
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

