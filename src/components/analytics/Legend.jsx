export default function Legend({
  homeName = 'Home',
  homeColor = '#00ff87',
  awayName = 'Away',
  awayColor = '#00f2fe',
  showDraw = false,
  drawColor = '#64748b',
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        fontSize: '12px',
        color: 'var(--text-muted, #94a3b8)',
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '2px',
            backgroundColor: homeColor,
            display: 'inline-block',
          }}
        />
        <span style={{ color: 'var(--text-main, #f8fafc)', fontWeight: 600 }}>{homeName}</span>
      </div>

      {showDraw && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '2px',
              backgroundColor: drawColor,
              display: 'inline-block',
            }}
          />
          <span>Draw</span>
        </div>
      )}

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '2px',
            backgroundColor: awayColor,
            display: 'inline-block',
          }}
        />
        <span style={{ color: 'var(--text-main, #f8fafc)', fontWeight: 600 }}>{awayName}</span>
      </div>
    </div>
  );
}
