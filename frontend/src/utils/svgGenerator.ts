import type { Table, Relationship, RelationType } from '../types';

// Orthogonal smooth-step path generator with rounded corners matching React Flow getSmoothStepPath
const getSmoothStepPath = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  borderRadius: number = 8
) => {
  const midX = Math.round((fromX + toX) / 2);
  const midY = Math.round((fromY + toY) / 2);

  if (Math.abs(fromY - toY) < 4) {
    return {
      path: `M ${fromX} ${fromY} L ${toX} ${toY}`,
      midX,
      midY: fromY
    };
  }

  const dx = toX > fromX ? 1 : -1;
  const dy = toY > fromY ? 1 : -1;
  const r = Math.max(0, Math.min(borderRadius, Math.abs(toY - fromY) / 2, Math.abs(toX - fromX) / 2));

  const p1X = midX;
  const p1Y = fromY;
  const p2X = midX;
  const p2Y = toY;

  const path =
    `M ${fromX} ${fromY} ` +
    `L ${p1X - dx * r} ${p1Y} ` +
    `Q ${p1X} ${p1Y} ${p1X} ${p1Y + dy * r} ` +
    `L ${p2X} ${p2Y - dy * r} ` +
    `Q ${p2X} ${p2Y} ${p2X + dx * r} ${p2Y} ` +
    `L ${toX} ${toY}`;

  return { path, midX, midY };
};

export const generateNativeSVG = (
  tables: Table[],
  relationships: Relationship[],
  bounds: { x: number; y: number; width: number; height: number },
  darkMode: boolean
): string => {
  const bg = darkMode ? '#020617' : '#ffffff';
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const headerBg = darkMode ? '#1e293b' : '#f8fafc';
  const cardBorder = darkMode ? '#334155' : '#e2e8f0';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const typeColor = darkMode ? '#60a5fa' : '#2563eb';
  const pkColor = darkMode ? '#f59e0b' : '#d97706';
  const fkColor = darkMode ? '#c084fc' : '#9333ea';
  const edgeColor = darkMode ? '#94a3b8' : '#64748b';
  const badgeBg = darkMode ? '#1e293b' : '#ffffff';

  const escapeXml = (str: string) =>
    (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const formatDataType = (type: string, length?: string | null) => {
    const rawType = (type || '').toUpperCase();
    if (rawType === 'ENUM' && length) {
      return 'ENUM(...)';
    }
    if (length) {
      const cleanLen = length.replace(/^['"`]|['"`]$/g, '');
      if (cleanLen.length > 10) {
        return `${rawType}(...)`;
      }
      return `${rawType}(${cleanLen})`;
    }
    return rawType;
  };

  const getRelationText = (type?: RelationType) => {
    switch (type) {
      case 'OneToOne':
        return '1 : 1';
      case 'OneToMany':
        return '1 : N';
      case 'ManyToOne':
        return 'N : 1';
      case 'ManyToMany':
        return 'N : M';
      default:
        return '1 : N';
    }
  };

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}">
  <defs>
    <!-- Sharp, Natural React Flow Arrow Marker -->
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 2 L 8 5 L 0 8 Z" fill="${edgeColor}" />
    </marker>
    <!-- Drop Shadow for Table Cards -->
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.15" />
    </filter>
  </defs>

  <style>
    .bg { fill: ${bg}; }
    .table-card { fill: ${cardBg}; stroke: ${cardBorder}; stroke-width: 1.5px; filter: url(#shadow); }
    .table-header { fill: ${headerBg}; }
    .table-title { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; font-weight: 700; fill: ${textColor}; }
    .col-name { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; font-weight: 500; fill: ${textColor}; }
    .col-type { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; fill: ${typeColor}; }
    .badge-pk { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 10px; font-weight: 800; fill: ${pkColor}; }
    .badge-fk { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 10px; font-weight: 800; fill: ${fkColor}; }
    .row-line { stroke: ${cardBorder}; stroke-width: 1px; }
    .edge-line { fill: none; stroke: ${edgeColor}; stroke-width: 2px; marker-end: url(#arrow); }
    .rel-badge { fill: ${badgeBg}; stroke: ${cardBorder}; stroke-width: 1px; rx: 4px; }
    .rel-text { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 10px; font-weight: 700; fill: ${textColor}; text-anchor: middle; }
    .bullet-pk { fill: ${pkColor}; }
    .bullet-fk { fill: ${fkColor}; }
  </style>

  <!-- Canvas Background -->
  <rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" class="bg" />

  <!-- Foreign Key Relationships (SmoothStep Orthogonal) -->
  <g id="relationships">
`;

  // Map tables for fast lookup
  const tableMap = new Map<number, Table>();
  tables.forEach((t) => tableMap.set(t.id, t));

  relationships.forEach((rel) => {
    const fromTable = tableMap.get(rel.fromTableId);
    const toTable = tableMap.get(rel.toTableId);
    if (!fromTable || !toTable) return;

    const fromColIdx = fromTable.columns.findIndex((c) => c.id === rel.fromColumnId);
    const toColIdx = toTable.columns.findIndex((c) => c.id === rel.toColumnId);

    const fromTableWidth = fromTable.width || 240;
    const toTableWidth = toTable.width || 240;

    const fromColY = 36 + (fromColIdx >= 0 ? fromColIdx : 0) * 28 + 14;
    const toColY = 36 + (toColIdx >= 0 ? toColIdx : 0) * 28 + 14;

    let fromX = fromTable.x + fromTableWidth;
    let fromY = fromTable.y + fromColY;
    let toX = toTable.x;
    let toY = toTable.y + toColY;

    // Adjust handle direction if target is left of source
    if (fromTable.x > toTable.x + toTableWidth) {
      fromX = fromTable.x;
      toX = toTable.x + toTableWidth;
    }

    const { path, midX, midY } = getSmoothStepPath(fromX, fromY, toX, toY, 8);

    svg += `    <!-- Relation ${rel.id}: ${fromTable.name} -> ${toTable.name} -->\n`;
    svg += `    <path d="${path}" class="edge-line" />\n`;
    svg += `    <g transform="translate(${midX}, ${midY})">\n`;
    svg += `      <rect x="-16" y="-9" width="32" height="18" class="rel-badge" />\n`;
    svg += `      <text x="0" y="3.5" class="rel-text">${getRelationText(rel.relationType)}</text>\n`;
    svg += `    </g>\n`;
  });

  svg += `  </g>\n\n  <!-- Tables -->\n  <g id="tables">\n`;

  // Draw Tables
  tables.forEach((t) => {
    const w = t.width || 240;
    const headerHeight = 36;
    const rowHeight = 28;
    const totalHeight = headerHeight + (t.columns.length * rowHeight) + 8;
    const colorBarHeight = 4;
    const headerColor = t.color || '#3b82f6';

    svg += `    <!-- Table: ${escapeXml(t.name)} -->\n`;
    svg += `    <g transform="translate(${t.x}, ${t.y})">\n`;
    // Table Card Container
    svg += `      <rect x="0" y="0" width="${w}" height="${totalHeight}" rx="8" ry="8" class="table-card" />\n`;
    // Header Background
    svg += `      <path d="M 0 8 Q 0 0 8 0 L ${w - 8} 0 Q ${w} 0 ${w} 8 L ${w} ${headerHeight} L 0 ${headerHeight} Z" class="table-header" />\n`;
    // Header Color Accent Bar
    svg += `      <path d="M 0 4 Q 0 0 4 0 L ${w - 4} 0 Q ${w} 0 ${w} 4 L ${w} ${colorBarHeight} L 0 ${colorBarHeight} Z" fill="${headerColor}" />\n`;
    // Table Title
    svg += `      <text x="14" y="24" class="table-title">${escapeXml(t.name)}</text>\n`;
    // Header Line
    svg += `      <line x1="0" y1="${headerHeight}" x2="${w}" y2="${headerHeight}" class="row-line" />\n`;

    // Columns
    t.columns.forEach((col, idx) => {
      const yPos = headerHeight + (idx * rowHeight);

      if (idx > 0) {
        svg += `      <line x1="0" y1="${yPos}" x2="${w}" y2="${yPos}" class="row-line" opacity="0.5" />\n`;
      }

      let nameX = 14;

      // PK / FK Badges & Bullets
      if (col.primaryKey) {
        svg += `      <circle cx="14" cy="${yPos + 14}" r="3" class="bullet-pk" />\n`;
        svg += `      <text x="22" y="${yPos + 18}" class="badge-pk">PK</text>\n`;
        nameX = 40;
      } else if (col.foreignKey) {
        svg += `      <circle cx="14" cy="${yPos + 14}" r="3" class="bullet-fk" />\n`;
        svg += `      <text x="22" y="${yPos + 18}" class="badge-fk">FK</text>\n`;
        nameX = 40;
      } else {
        svg += `      <circle cx="14" cy="${yPos + 14}" r="2" fill="${cardBorder}" />\n`;
        nameX = 24;
      }

      // Column Name
      svg += `      <text x="${nameX}" y="${yPos + 18}" class="col-name">${escapeXml(col.name)}</text>\n`;

      // Column Type (truncated format)
      const typeText = formatDataType(col.datatype, col.length);
      svg += `      <text x="${w - 12}" y="${yPos + 18}" class="col-type" text-anchor="end">${escapeXml(typeText)}</text>\n`;
    });

    svg += `    </g>\n`;
  });

  svg += `  </g>\n</svg>`;
  return svg;
};
