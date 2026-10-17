import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default async function Image() {
  const logo = await readFile(path.join(process.cwd(), 'public/logo.png'));
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: '#0066b3',
          color: '#fff',
          padding: '80px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={`data:image/png;base64,${logo.toString('base64')}`} width={400} height={74} />
        <div
          style={{
            display: 'flex',
            width: '100px',
            height: '6px',
            background: '#ed1c24',
            marginTop: '48px',
            marginBottom: '28px',
          }}
        />
        <div style={{ display: 'flex', fontSize: 62, fontWeight: 700 }}>Cơ hội nghề nghiệp</div>
        <div style={{ display: 'flex', fontSize: 34, marginTop: '18px', color: '#e0f2fe' }}>
          MobiFone Sơn La · Tuyển dụng
        </div>
      </div>
    ),
    size,
  );
}
