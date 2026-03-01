import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Sails - Sales Tax Made Breezy';
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
          background: 'linear-gradient(135deg, #0a1628 0%, #1a365d 50%, #2c5282 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Nautical wave pattern */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '150px',
            display: 'flex',
            opacity: 0.3,
          }}
        >
          <svg
            viewBox="0 0 1200 150"
            style={{ width: '100%', height: '100%' }}
          >
            <path
              d="M0,100 Q150,50 300,100 T600,100 T900,100 T1200,100 V150 H0 Z"
              fill="#4299e1"
            />
            <path
              d="M0,120 Q150,70 300,120 T600,120 T900,120 T1200,120 V150 H0 Z"
              fill="#63b3ed"
            />
          </svg>
        </div>

        {/* Logo/Icon - Sailboat emoji representation */}
        <div
          style={{
            fontSize: 100,
            marginBottom: 20,
            display: 'flex',
          }}
        >
          ⛵
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: 'white',
            marginBottom: 16,
            textAlign: 'center',
            display: 'flex',
          }}
        >
          Sails
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 36,
            color: '#90cdf4',
            marginBottom: 32,
            display: 'flex',
          }}
        >
          Sales Tax Made Breezy
        </div>

        {/* Features */}
        <div
          style={{
            display: 'flex',
            gap: 48,
            color: 'white',
            fontSize: 24,
            opacity: 0.9,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            ✓ Track Nexus
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            ✓ Calculate Taxes
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            ✓ Stay Compliant
          </span>
        </div>

        {/* Domain */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 40,
            fontSize: 24,
            color: '#90cdf4',
            display: 'flex',
          }}
        >
          sails.tax
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
