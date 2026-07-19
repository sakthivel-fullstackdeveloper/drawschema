import React, { useState } from 'react';
import { useSchemaStore } from '../../store/schemaStore';
import { generateMySQL } from '../../utils/sqlGenerator';
import { parseSQL } from '../../utils/sqlParser';
import { toPng, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  Download, Upload, Sun, Moon,
  LayoutGrid, FileCode, FileJson, FileImage, FileText, Clock, Plus,
  Undo, Redo, Menu, Trash2, Sparkles, ChevronDown, ChevronUp, Copy, Check
} from 'lucide-react';

interface ToolbarProps {
  onOpenVersions: () => void;
  onSaveVersionClick: () => void;
  onToggleSidebar: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onOpenVersions, onSaveVersionClick, onToggleSidebar }) => {
  const {
    tables,
    relationships,
    darkMode,
    toggleDarkMode,
    autoLayout,
    importJsonSchema,
    isPreviewMode,
    previewTables,
    undo,
    redo,
    clearSchema,
    showToast
  } = useSchemaStore();

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importType, setImportType] = useState<'JSON' | 'SQL'>('SQL');
  const [importMode, setImportMode] = useState<'replace' | 'extend'>('replace');
  const [showPromptGuide, setShowPromptGuide] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // SQL & JSON Export download triggers
  const triggerDownload = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const data = { tables, relationships };
    triggerDownload(
      JSON.stringify(data, null, 2),
      'drawschema-export.json',
      'application/json'
    );
    setShowExportDropdown(false);
  };

  const handleExportSQL = () => {
    const sql = generateMySQL(tables, relationships);
    triggerDownload(sql, 'schema-export.sql', 'text/plain');
    setShowExportDropdown(false);
  };

  // Image & Document exports using html-to-image & jsPDF
  const getCanvasElement = (): HTMLElement => {
    const el = document.querySelector('.react-flow') as HTMLElement;
    if (!el) throw new Error('React Flow element not found on page.');
    return el;
  };

  const getNodesBoundingBox = () => {
    const allTables = isPreviewMode ? previewTables : tables;
    if (allTables.length === 0) return { x: 0, y: 0, width: 800, height: 600 };
    
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    allTables.forEach((t) => {
      if (t.x < minX) minX = t.x;
      if (t.y < minY) minY = t.y;
      
      const right = t.x + (t.width || 240);
      const bottom = t.y + (t.height || 350);
      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    });
    
    const padding = 60;
    return {
      x: minX - padding,
      y: minY - padding,
      width: (maxX - minX) + (padding * 2),
      height: (maxY - minY) + (padding * 2),
    };
  };

  const handleExportPNG = async () => {
    setIsExporting(true);
    setShowExportDropdown(false);
    try {
      const el = getCanvasElement();
      const viewportEl = el.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewportEl) throw new Error('React Flow viewport element not found.');

      const bounds = getNodesBoundingBox();

      const dataUrl = await toPng(viewportEl, {
        backgroundColor: darkMode ? '#020617' : '#f8fafc',
        width: bounds.width,
        height: bounds.height,
        style: {
          transform: `translate(${-bounds.x}px, ${-bounds.y}px) scale(1)`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
        }
      });

      const link = document.createElement('a');
      link.download = 'schema-diagram.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('PNG export failed', err);
      alert('Failed to export PNG.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSVG = async () => {
    setIsExporting(true);
    setShowExportDropdown(false);
    try {
      const el = getCanvasElement();
      const viewportEl = el.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewportEl) throw new Error('React Flow viewport element not found.');

      const bounds = getNodesBoundingBox();

      const dataUrl = await toSvg(viewportEl, {
        backgroundColor: darkMode ? '#020617' : '#f8fafc',
        width: bounds.width,
        height: bounds.height,
        style: {
          transform: `translate(${-bounds.x}px, ${-bounds.y}px) scale(1)`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
        }
      });

      const link = document.createElement('a');
      link.download = 'schema-diagram.svg';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('SVG export failed', err);
      alert('Failed to export SVG.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    setShowExportDropdown(false);
    try {
      const el = getCanvasElement();
      const viewportEl = el.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewportEl) throw new Error('React Flow viewport element not found.');

      const bounds = getNodesBoundingBox();

      const dataUrl = await toPng(viewportEl, {
        backgroundColor: darkMode ? '#020617' : '#f8fafc',
        width: bounds.width,
        height: bounds.height,
        style: {
          transform: `translate(${-bounds.x}px, ${-bounds.y}px) scale(1)`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
        }
      });

      const pdf = new jsPDF('l', 'px', [bounds.width, bounds.height]);
      pdf.addImage(dataUrl, 'PNG', 0, 0, bounds.width, bounds.height);
      pdf.save('schema-diagram.pdf');
    } catch (err) {
      console.error('PDF export failed', err);
      alert('Failed to export PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFillSample = () => {
    if (importType === 'SQL') {
      setImportText(`CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total_amount DECIMAL(10,2) DEFAULT 0.00,
  order_status ENUM('pending', 'completed') DEFAULT 'pending',
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);`);
    } else {
      setImportText(JSON.stringify({
        tables: [
          {
            name: "users",
            x: 100,
            y: 100,
            width: 220,
            height: 160,
            color: "#3b82f6",
            columns: [
              { name: "id", datatype: "INT", primaryKey: true, nullable: false, foreignKey: false, uniqueKey: false, autoIncrement: true },
              { name: "username", datatype: "VARCHAR", length: "100", primaryKey: false, nullable: false, foreignKey: false, uniqueKey: true, autoIncrement: false }
            ]
          },
          {
            name: "orders",
            x: 420,
            y: 100,
            width: 220,
            height: 160,
            color: "#10b981",
            columns: [
              { name: "id", datatype: "INT", primaryKey: true, nullable: false, foreignKey: false, uniqueKey: false, autoIncrement: true },
              { name: "user_id", datatype: "INT", primaryKey: false, nullable: false, foreignKey: true, uniqueKey: false, autoIncrement: false }
            ]
          }
        ],
        relationships: [
          {
            fromTableName: "orders",
            fromColumnName: "user_id",
            toTableName: "users",
            toColumnName: "id",
            relationType: "OneToMany",
            onDelete: "CASCADE",
            onUpdate: "CASCADE"
          }
        ]
      }, null, 2));
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;

    try {
      if (importType === 'JSON') {
        await importJsonSchema(importText, importMode);
      } else {
        const parsed = parseSQL(importText);
        await importJsonSchema(JSON.stringify(parsed), importMode);
      }
      setIsImportOpen(false);
      setImportText('');
    } catch (err: any) {
      alert(`Import failed: ${err.message || 'Check your syntax.'}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setImportText(text);
        showToast(`Loaded ${file.name} successfully!`, 'success');
      }
    };
    reader.readAsText(file);
  };

  const handleClearSchema = async () => {
    if (window.confirm("Are you sure you want to delete all tables and relationships on this canvas? This action cannot be undone.")) {
      try {
        await clearSchema();
        showToast("Canvas cleared successfully!", "success");
      } catch (err: any) {
        showToast(err.message || "Failed to clear canvas.", "error");
      }
    }
  };

  return (
    <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col min-[1101px]:flex-row min-[1101px]:items-center justify-between px-6 py-2 min-[1101px]:py-0 select-none relative z-10 gap-2 min-[1101px]:gap-4 min-[1101px]:h-14">
      
      {/* Row 1: Brand Logo & Sidebar Toggle */}
      <div className="flex items-center justify-between w-full min-[1101px]:w-auto flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-md transition min-[1101px]:hidden"
            title="Toggle Sidebar Menu"
          >
            <Menu size={16} />
          </button>

          <div className="flex items-center gap-1.5 font-black text-sm tracking-tight text-slate-800 dark:text-slate-100 uppercase">
            <span className="bg-indigo-600 text-white p-1 rounded-md">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.58 4 8 4s8-1.79 8-4M4 7c0-2.21 3.58-4 8-4s8 1.79 8 4m0 5c0 2.21-3.58 4-8 4s-8-1.79-8-4" />
              </svg>
            </span>
            DrawSchema
          </div>
        </div>
      </div>

      {/* Row 2 Container: Canvas Tools + Utility Buttons */}
      <div className="flex items-center justify-between w-full gap-3 min-[1101px]:contents overflow-x-auto py-1 min-[1101px]:py-0 scrollbar-none">
        {/* Center Canvas Tools: Auto-saved, Undo, Redo, Arrange */}
        <div className="flex items-center gap-1.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 px-2 py-1 rounded-lg flex-shrink-0">
          <span 
            title="All diagram modifications are saved automatically in real-time"
            className="flex items-center gap-1.5 px-2 py-0.5 text-slate-400 dark:text-slate-500 text-[10px] font-bold select-none"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden min-[1101px]:inline">Auto-saved</span>
          </span>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />
          <button
            onClick={undo}
            disabled={isPreviewMode}
            title="Undo (Ctrl+Z)"
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded transition disabled:opacity-40"
          >
            <Undo size={14} />
          </button>

          <button
            onClick={redo}
            disabled={isPreviewMode}
            title="Redo (Ctrl+Y)"
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded transition disabled:opacity-40"
          >
            <Redo size={14} />
          </button>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

          <button
            onClick={autoLayout}
            disabled={isPreviewMode}
            title="Arrange Layout (Auto Layout)"
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded transition disabled:opacity-40"
          >
            <LayoutGrid size={14} />
          </button>
        </div>

        {/* Middle/Right: Import, Export, Mode */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onSaveVersionClick}
            disabled={isPreviewMode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow transition disabled:opacity-55"
            title={isPreviewMode ? "Cannot save checkpoint in preview mode" : "Save a manual restore point checkpoint"}
          >
            <Plus size={13} />
            <span className="hidden min-[1101px]:inline">Save Checkpoint</span>
          </button>

          <button
            onClick={onOpenVersions}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-350 rounded-md text-xs font-medium transition"
            title="View schema version snapshots"
          >
            <Clock size={13} />
            <span className="hidden min-[1101px]:inline">History</span>
          </button>

          <button
            onClick={() => setIsImportOpen(true)}
            disabled={isPreviewMode}
            title={isPreviewMode ? "Cannot import in preview mode" : "Import schema"}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-855 text-slate-600 dark:text-slate-350 rounded-md text-xs font-medium transition disabled:opacity-55"
          >
            <Upload size={13} />
            <span className="hidden min-[1101px]:inline">Import</span>
          </button>

          <button
            onClick={handleClearSchema}
            disabled={isPreviewMode || tables.length === 0}
            title={isPreviewMode ? "Cannot clear in preview mode" : "Delete all tables and connections on the canvas"}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-900/40 hover:bg-red-50/10 dark:hover:bg-red-950/20 text-slate-600 dark:text-slate-350 hover:text-red-600 dark:hover:text-red-400 rounded-md text-xs font-medium transition disabled:opacity-35"
          >
            <Trash2 size={13} />
            <span className="hidden min-[1101px]:inline">Clear Canvas</span>
          </button>

          {/* Export drop-down */}
          <div className="relative">
            <button
              disabled={isPreviewMode || isExporting}
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              title={isPreviewMode ? "Cannot export in preview mode" : "Export schema"}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-855 text-slate-600 dark:text-slate-350 rounded-md text-xs font-medium transition disabled:opacity-55"
            >
              {isExporting ? <span className="w-3 h-3 border-2 border-slate-450 border-t-transparent rounded-full animate-spin" /> : <Download size={13} />}
              <span className="hidden min-[1101px]:inline">Export</span>
            </button>

            {showExportDropdown && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  onClick={handleExportSQL}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <FileCode size={13} className="text-indigo-500" />
                  Export MySQL (.sql)
                </button>
                <button
                  onClick={handleExportJSON}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <FileJson size={13} className="text-emerald-500" />
                  Export JSON (.json)
                </button>
                <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />
                <button
                  onClick={handleExportPNG}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <FileImage size={13} className="text-pink-500" />
                  Export Diagram (PNG)
                </button>
                <button
                  onClick={handleExportSVG}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <FileImage size={13} className="text-amber-500" />
                  Export Diagram (SVG)
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <FileText size={13} className="text-sky-500" />
                  Export Document (PDF)
                </button>
              </div>
            )}
          </div>

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 rounded-md transition"
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>

      {/* Import Modal Dialog */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
              <span className="font-bold text-sm text-slate-850 dark:text-slate-150">
                Import Schema
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => { setImportType('SQL'); setImportText(''); }}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                    importType === 'SQL'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  SQL DDL
                </button>
                <button
                  onClick={() => { setImportType('JSON'); setImportText(''); }}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                    importType === 'JSON'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  JSON
                </button>
              </div>
            </div>

            <form onSubmit={handleImportSubmit} className="p-4 space-y-3">

              {/* AI Prompt Guide — SQL only */}
              {importType === 'SQL' && (
                <div className="rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/60 dark:bg-indigo-950/40 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowPromptGuide((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={11} />
                      How to generate correct DDL with AI
                    </span>
                    {showPromptGuide ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>

                  {showPromptGuide && (() => {
                    const aiPrompt = `Generate a MySQL-compatible CREATE TABLE DDL script. Use these rules:
- Use CREATE TABLE \`table_name\` syntax with backtick-quoted names
- Supported types: INT, BIGINT, VARCHAR(n), TEXT, BOOLEAN, DATE, DATETIME, TIMESTAMP, FLOAT, DOUBLE, DECIMAL(p,s), JSON, UUID, ENUM('val1','val2')
- For arrays, add [] suffix: e.g. VARCHAR(255)[], INT[]
- Use NOT NULL or NULL explicitly on every column
- Use AUTO_INCREMENT for auto-increment integer primary keys
- Use DEFAULT value where needed (e.g. DEFAULT CURRENT_TIMESTAMP)
- Define PRIMARY KEY (col) and UNIQUE KEY (col) inside the table
- Define FOREIGN KEY (col) REFERENCES other_table(col) for relationships
- End each statement with ;
- Do NOT include IF NOT EXISTS, ENGINE=, CHARSET=, or COLLATE=

Schema to generate: [describe your tables and columns here]`;

                    return (
                      <div className="px-3 pb-3 space-y-2">
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400">Copy this prompt and paste into ChatGPT, Gemini, or Claude:</p>
                        <div className="relative">
                          <pre className="text-[9.5px] leading-relaxed text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-2.5 overflow-auto max-h-40 whitespace-pre-wrap font-mono">{aiPrompt}</pre>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(aiPrompt);
                              setPromptCopied(true);
                              setTimeout(() => setPromptCopied(false), 2000);
                            }}
                            className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-1 text-[9px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded transition"
                          >
                            {promptCopied ? <><Check size={9} /> Copied!</> : <><Copy size={9} /> Copy</>}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Import Mode Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">Mode:</span>
                <div className="flex rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`px-3 py-1.5 transition ${importMode === 'replace' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  >
                    🔄 Replace All
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('extend')}
                    className={`px-3 py-1.5 transition border-l border-slate-200 dark:border-slate-700 ${importMode === 'extend' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  >
                    ➕ Extend / Add
                  </button>
                </div>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 italic">
                  {importMode === 'replace' ? 'Clears existing tables first' : 'Adds new tables, keeps existing'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {importType === 'SQL' ? 'Paste CREATE TABLE statements' : 'Paste Diagram Schema JSON'}
                  </label>
                  <div className="flex items-center gap-2 text-[10px]">
                    <label className="font-extrabold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition underline underline-offset-2 decoration-1 cursor-pointer">
                      Upload File
                      <input
                        type="file"
                        accept={importType === 'SQL' ? '.sql,.txt' : '.json'}
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                    <span className="text-slate-300 dark:text-slate-750">|</span>
                    <button
                      type="button"
                      onClick={handleFillSample}
                      className="font-extrabold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition underline underline-offset-2 decoration-1"
                    >
                      Use Sample {importType}
                    </button>
                  </div>
                </div>
                <textarea
                  required
                  rows={8}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={
                    importType === 'SQL'
                      ? 'CREATE TABLE users (\n  id INT AUTO_INCREMENT PRIMARY KEY,\n  name VARCHAR(255) NOT NULL\n);'
                      : '{\n  "tables": [...],\n  "relationships": [...]\n}'
                  }
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-50 font-mono transition-all duration-150 leading-relaxed shadow-inner"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportOpen(false);
                    setImportText('');
                  }}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-md text-xs hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow transition"
                >
                  Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
