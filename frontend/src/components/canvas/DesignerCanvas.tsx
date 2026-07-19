import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  ConnectionMode,
  useReactFlow
} from '@xyflow/react';
import type {
  Node,
  Edge,
  OnNodesChange,
  OnConnect,
  NodePositionChange
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSchemaStore } from '../../store/schemaStore';
import { TableNode } from './TableNode';
import { RelationshipEdge } from './RelationshipEdge';

const nodeTypes = {
  tableNode: TableNode
};

const edgeTypes = {
  relationshipEdge: RelationshipEdge
};

export const DesignerCanvas: React.FC = () => {
  const {
    tables,
    relationships,
    snapToGrid,
    selectedElement,
    selectElement,
    clearSelection,
    addTable,
    updateTablePositionLocal,
    saveTablePosition,
    addRelationship,
    undo,
    redo,
    copySelected,
    pasteCopied,
    deleteSelected,
    isPreviewMode,
    previewTables,
    previewRelationships,
    selectedTableIds,
    searchTerm
  } = useSchemaStore();

  const { screenToFlowPosition } = useReactFlow();

  const displayTables = isPreviewMode ? previewTables : tables;
  const displayRelationships = isPreviewMode ? previewRelationships : relationships;

  const visibleTables = useMemo(() => {
    let filtered = displayTables;
    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((t) => t.name.toLowerCase().includes(term));
    }
    const ids = selectedTableIds || [];
    if (ids.length > 0) {
      filtered = filtered.filter((t) => ids.includes(t.id));
    }
    return filtered;
  }, [displayTables, selectedTableIds, searchTerm]);

  const visibleRelationships = useMemo(() => {
    const ids = selectedTableIds || [];
    if (ids.length === 0) return displayRelationships;
    return displayRelationships.filter((r) =>
      ids.includes(r.fromTableId) && ids.includes(r.toTableId)
    );
  }, [displayRelationships, selectedTableIds]);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Map Tables to React Flow Nodes
  const nodes = useMemo<Node[]>(() => {
    return visibleTables.map((t) => ({
      id: String(t.id),
      type: 'tableNode',
      position: { x: t.x, y: t.y },
      width: t.width,
      height: t.height,
      style: { width: t.width, height: t.height },
      data: { table: t },
      selected: selectedElement?.type === 'table' && selectedElement.id === t.id
    }));
  }, [visibleTables, selectedElement]);

  // Map Relationships to React Flow Edges
  const edges = useMemo<Edge[]>(() => {
    return visibleRelationships.map((r) => {
      const isSelected = selectedElement?.type === 'relationship' && selectedElement.id === r.id;
      return {
        id: `edge-${r.id}`,
        source: String(r.fromTableId),
        target: String(r.toTableId),
        sourceHandle: `${r.fromColumnId}-source`,
        targetHandle: `${r.toColumnId}-target`,
        type: 'relationshipEdge',
        data: { relationType: r.relationType },
        selected: isSelected,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 12,
          height: 12,
          color: isSelected ? '#8b5cf6' : '#94a3b8'
        }
      };
    });
  }, [visibleRelationships, selectedElement]);

  // Handle Node Position changes during drag
  const onNodesChange = useCallback<OnNodesChange>(
    (changes) => {
      if (isPreviewMode) return;
      changes.forEach((change) => {
        if (change.type === 'position' && (change as NodePositionChange).position) {
          const tableId = parseInt(change.id, 10);
          const pos = (change as NodePositionChange).position;
          if (pos && !isNaN(tableId)) {
            updateTablePositionLocal(tableId, pos.x, pos.y);
          }
        }
      });
    },
    [updateTablePositionLocal, isPreviewMode]
  );

  // Save Node Position when dragging stops
  const onNodeDragStop = useCallback(
    (_event: any, node: any) => {
      if (isPreviewMode) return;
      const tableId = parseInt(node.id, 10);
      if (!isNaN(tableId)) {
        saveTablePosition(tableId, node.position.x, node.position.y);
      }
    },
    [saveTablePosition, isPreviewMode]
  );

  // Handle drawing relationships (connections)
  const onConnect = useCallback<OnConnect>(
    async (connection) => {
      if (isPreviewMode) return;
      const { source, sourceHandle, target, targetHandle } = connection;
      if (!source || !sourceHandle || !target || !targetHandle) return;

      const fromTableId = parseInt(source, 10);
      const toTableId = parseInt(target, 10);
      
      // Handle IDs look like "columnId-source" and "columnId-target"
      const fromColumnId = parseInt(sourceHandle.split('-')[0], 10);
      const toColumnId = parseInt(targetHandle.split('-')[0], 10);

      if (isNaN(fromTableId) || isNaN(toTableId) || isNaN(fromColumnId) || isNaN(toColumnId)) return;

      try {
        await addRelationship(fromTableId, fromColumnId, toTableId, toColumnId);
      } catch (err: any) {
        alert(err.message || 'Failed to establish relationship.');
      }
    },
    [addRelationship, isPreviewMode]
  );

  // Selection handler
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (isPreviewMode) return;
      const tableId = parseInt(node.id, 10);
      if (!isNaN(tableId)) {
        selectElement('table', tableId);
      }
    },
    [selectElement, isPreviewMode]
  );

  const onPaneClick = useCallback(() => {
    if (isPreviewMode) return;
    clearSelection();
  }, [clearSelection, isPreviewMode]);

  const onPaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      if (isPreviewMode) return;

      // Ignore double-clicks on table nodes
      const target = event.target as HTMLElement;
      if (target.closest('.react-flow__node')) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const tableName = prompt('Enter name for the new table:');
      if (!tableName || !tableName.trim()) return;

      addTable(tableName.trim(), Math.round(position.x), Math.round(position.y));
    },
    [screenToFlowPosition, addTable, isPreviewMode]
  );

  // Keyboard Shortcuts (Undo, Redo, Copy, Paste, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPreviewMode) return;
      const activeEl = document.activeElement;
      // Skip shortcuts if user is typing in an input field
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))
      ) {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copySelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteCopied();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo, copySelected, pasteCopied, deleteSelected, isPreviewMode]);

  return (
    <div
      ref={canvasRef}
      className="w-full h-full bg-slate-50 dark:bg-slate-950 relative"
      onClick={onPaneClick}
      onDoubleClick={onPaneDoubleClick}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        snapToGrid={snapToGrid}
        snapGrid={[15, 15]}
        fitView
        connectionMode={ConnectionMode.Loose}
        nodesDraggable={!isPreviewMode}
        nodesConnectable={!isPreviewMode}
        elementsSelectable={!isPreviewMode}
        edgesFocusable={!isPreviewMode}
        proOptions={{ hideAttribution: true }}
        className="react-flow-designer"
      >
        <Background gap={15} size={1} color="#cbd5e1" className="dark:opacity-10" />
        <Controls position="bottom-left" />
        <MiniMap
          position="bottom-right"
          nodeColor={(n) => {
            const table = n.data?.table as any;
            return table?.color || '#3b82f6';
          }}
          maskColor="rgba(241, 245, 249, 0.5)"
          className="dark:!bg-slate-900 dark:!border-slate-800"
        />
      </ReactFlow>
    </div>
  );
};
