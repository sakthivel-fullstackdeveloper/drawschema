import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { useSchemaStore } from '../../store/schemaStore';
import type { RelationType } from '../../types';

interface RelationshipEdgeData {
  relationType: RelationType;
}

export const RelationshipEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected
}) => {
  const { selectElement } = useSchemaStore();
  const relData = data as unknown as RelationshipEdgeData | undefined;
  const relationType = relData?.relationType || 'OneToMany';

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8
  });

  const getRelationText = (type: RelationType) => {
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

  const handleEdgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Strip edge- prefix if it exists to get the actual relationship ID
    const relId = parseInt(id.replace('edge-', ''), 10);
    if (!isNaN(relId)) {
      selectElement('relationship', relId);
    }
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? '#8b5cf6' : '#94a3b8',
          strokeWidth: selected ? 3 : 2,
          cursor: 'pointer'
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all'
          }}
          onClick={handleEdgeClick}
          className="cursor-pointer select-none"
        >
          <div
            className={`px-2 py-0.5 text-[10px] font-semibold font-mono rounded shadow border transition-all duration-150 ${
              selected
                ? 'bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-400'
            }`}
          >
            {getRelationText(relationType)}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
