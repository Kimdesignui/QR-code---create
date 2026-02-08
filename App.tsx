import React, { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import { 
  QrCode, 
  Download, 
  Trash2, 
  Sparkles, 
  History, 
  Settings, 
  CheckCircle2, 
  Plus, 
  Maximize2,
  Image as ImageIcon,
  Layers,
  Upload,
  ZoomIn,
  Move,
  Layout,
  ChevronDown,
  ScanBarcode,
  AlertCircle,
  ArrowLeft,
  Edit3,
  FileText,
  ShoppingBag,
  Box,
  Pill,
  CreditCard,
  Grid,
  Library as LibraryIcon,
  Type as TypeIcon,
  Scaling,
  MoveHorizontal,
  User,
  Phone,
  Mail,
  Briefcase,
  Globe,
  MapPin,
  Contact,
  ArrowUpFromLine,
  ArrowDownToLine,
  XCircle
} from 'lucide-react';
import { QRCodeConfig, GeneratedQR, BarcodeType, BarcodeDef, ExportFormat } from './types';
import { getSmartContext } from './services/geminiService';

// --- Constants & Definitions ---

const DEFAULT_CONFIG: QRCodeConfig = {
  value: '',
  barcodeType: 'qrcode',
  size: 1024,
  fgColor: '#000000',
  bgColor: '#ffffff',
  level: 'H',
  includeMargin: false,
  title: '',
  description: '',
  
  // New Visual defaults
  renderTitle: '',
  renderTitleFont: 'Roboto',
  renderTitleWeight: 'bold',
  renderTitleSize: 60, 
  renderTitleGap: 20,
  renderTitleLetterSpacing: 0,
  
  codeFont: 'monospace',
  codeFontSize: 18, // Updated default to 18px
  codeLetterSpacing: 2, 
  codeTextGap: -6, // Updated default to -6px

  bgImage: undefined,
  bgImageOpacity: 1.0,
  bgImageFit: 'cover',
  bgImageScale: 1.0,
  qrScale: 0.5
};

// Priority: Requested fonts -> System fonts -> Google fonts
const FONTS = [
  'Roboto',
  'Arial',
  'Times New Roman',
  'Open Sans',
  'Montserrat',
  'Oswald',
  'Playfair Display',
  'Lato', 
  'Segoe UI', 
  'Courier New', 
  'Verdana', 
  'Georgia',
];

const FONT_WEIGHTS = [
  { label: 'Light', value: '300' },
  { label: 'Normal', value: 'normal' },
  { label: 'Medium', value: '500' },
  { label: 'Bold', value: 'bold' },
  { label: 'Extra Bold', value: '900' },
];

const BARCODE_DEFINITIONS: BarcodeDef[] = [
  { 
    type: 'qrcode', 
    label: 'QR Code', 
    description: 'Liên kết web, Wifi, Vcard...', 
    colorClass: 'bg-violet-100', 
    iconClass: 'text-violet-600',
    illustration: <QrCode className="w-12 h-12" />
  },
  { 
    type: 'EAN13', 
    label: 'EAN-13', 
    description: 'Mã sản phẩm bán lẻ quốc tế (13 số)', 
    colorClass: 'bg-blue-100', // Changed from Rose to Blue for better contrast
    iconClass: 'text-blue-600',
    illustration: <ShoppingBag className="w-12 h-12" />
  },
  { 
    type: 'CODE128', 
    label: 'Code 128', 
    description: 'Vận chuyển & Logistics đa năng', 
    colorClass: 'bg-emerald-100', 
    iconClass: 'text-emerald-600',
    illustration: <Box className="w-12 h-12" />
  },
  { 
    type: 'UPC', 
    label: 'UPC-A', 
    description: 'Mã sản phẩm Bắc Mỹ (12 số)', 
    colorClass: 'bg-sky-100', 
    iconClass: 'text-sky-600',
    illustration: <ScanBarcode className="w-12 h-12" />
  },
  { 
    type: 'CODE39', 
    label: 'Code 39', 
    description: 'Ký tự & số, dùng trong công nghiệp', 
    colorClass: 'bg-amber-100', 
    iconClass: 'text-amber-600',
    illustration: <FileText className="w-12 h-12" />
  },
  { 
    type: 'ITF14', 
    label: 'ITF-14', 
    description: 'Mã thùng carton vận chuyển', 
    colorClass: 'bg-orange-100', 
    iconClass: 'text-orange-600',
    illustration: <Grid className="w-12 h-12" />
  },
  { 
    type: 'MSI', 
    label: 'MSI', 
    description: 'Quản lý kho & kiểm kê', 
    colorClass: 'bg-teal-100', 
    iconClass: 'text-teal-600',
    illustration: <CreditCard className="w-12 h-12" />
  },
  { 
    type: 'pharmacode', 
    label: 'Pharmacode', 
    description: 'Kiểm soát bao bì dược phẩm', 
    colorClass: 'bg-pink-100', 
    iconClass: 'text-pink-600',
    illustration: <Pill className="w-12 h-12" />
  },
];

// --- vCard Utilities ---
interface VCardData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  website: string;
  company: string;
  job: string;
  street: string;
  city: string;
  country: string;
}

const parseVCard = (str: string): VCardData => {
  const lines = str.split('\n');
  const getVal = (p: string) => {
    const line = lines.find(l => l.startsWith(p));
    return line ? line.split(':').slice(1).join(':').trim() : '';
  };
  
  // N:LastName;FirstName;;;
  const nVal = getVal('N:');
  const nParts = nVal.split(';');

  // ADR:;;Street;City;;;Country
  const adrVal = getVal('ADR:');
  const adrParts = adrVal.split(';');
  
  // TEL;TYPE=CELL: or just TEL:
  const telLine = lines.find(l => l.startsWith('TEL'));
  const tel = telLine ? telLine.split(':').slice(1).join(':').trim() : '';

  return {
    lastName: nParts[0] || '',
    firstName: nParts[1] || '',
    company: getVal('ORG:'),
    job: getVal('TITLE:'),
    phone: tel,
    email: getVal('EMAIL:'),
    website: getVal('URL:'),
    street: adrParts[2] || '',
    city: adrParts[3] || '',
    country: adrParts[6] || ''
  };
};

const generateVCard = (d: VCardData): string => {
  // Minimal vCard 3.0
  return `BEGIN:VCARD
VERSION:3.0
N:${d.lastName};${d.firstName};;;
FN:${d.firstName} ${d.lastName}
ORG:${d.company}
TITLE:${d.job}
TEL;TYPE=CELL:${d.phone}
EMAIL:${d.email}
URL:${d.website}
ADR:;;${d.street};${d.city};;;${d.country}
END:VCARD`;
};

// --- Helper Component: Debounced Input ---
const DebouncedInput = ({ 
  value, 
  onChange, 
  className, 
  placeholder,
  disabled 
}: { 
  value: string, 
  onChange: (val: string) => void, 
  className?: string,
  placeholder?: string,
  disabled?: boolean
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(handler);
  }, [localValue]);

  return (
    <input
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      className={className}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
};

// --- Helper Component: Linear Barcode Render (Preview Only) ---
// UPDATED: Now supports Manual Rendering for Font, Size and Spacing support
// UPDATED: Standard EAN-13 Layout (3 Groups)
const LinearBarcode = ({ config, className }: { config: QRCodeConfig, className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Reset error state immediately on input change
    setError(null);

    if (canvasRef.current && config.value) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      try {
        // 2. Generate Bars on a temp canvas (NO TEXT)
        const tempCanvas = document.createElement('canvas');
        JsBarcode(tempCanvas, config.value, {
          format: config.barcodeType as any,
          lineColor: config.fgColor,
          background: 'transparent',
          displayValue: false, // Hide default JsBarcode text
          width: 2, 
          height: 80, // Base height for bars
          margin: 0,
        });

        // 3. Layout Calculations
        const isEAN13 = config.barcodeType === 'EAN13' && config.value.length === 13;
        
        const fontSize = config.codeFontSize || 20;
        const textGap = config.codeTextGap ?? 5; // Use configured gap
        const textHeight = fontSize * 1.2;
        
        // Offset for EAN-13 first digit
        const firstCharWidth = isEAN13 ? (fontSize * 0.7) : 0;
        const barXOffset = isEAN13 ? firstCharWidth + 4 : 0;

        // Final Canvas Dimensions
        const totalWidth = tempCanvas.width + barXOffset;
        const totalHeight = tempCanvas.height + textGap + textHeight;

        canvas.width = totalWidth;
        canvas.height = totalHeight;

        // 4. Draw
        ctx.clearRect(0, 0, totalWidth, totalHeight);
        
        // Draw Bars
        ctx.drawImage(tempCanvas, barXOffset, 0);

        // Draw Text
        ctx.fillStyle = config.fgColor;
        ctx.font = `bold ${fontSize}px "${config.codeFont}", monospace`;
        ctx.textBaseline = 'top';
        
        if (isEAN13) {
            // --- EAN-13 Special Layout ---
            const barWidth = tempCanvas.width;
            
            // Group 1: First Digit (Floating left, NO letter spacing)
            if (typeof ctx.letterSpacing !== 'undefined') ctx.letterSpacing = '0px';
            ctx.textAlign = 'right';
            ctx.fillText(config.value[0], barXOffset - 2, tempCanvas.height + textGap);

            // Configure spacing for data blocks
            if (typeof ctx.letterSpacing !== 'undefined') {
                ctx.letterSpacing = `${config.codeLetterSpacing || 0}px`;
            }
            ctx.textAlign = 'center';

            // Group 2: Digits 2-7 (Centered in Left Half)
            // Left half center is approx 25% of bar width
            const leftCenter = barXOffset + (barWidth * 0.25);
            ctx.fillText(config.value.substring(1, 7), leftCenter, tempCanvas.height + textGap);

            // Group 3: Digits 8-13 (Centered in Right Half)
            // Right half center is approx 75% of bar width
            const rightCenter = barXOffset + (barWidth * 0.75);
            ctx.fillText(config.value.substring(7, 13), rightCenter, tempCanvas.height + textGap);

        } else {
            // --- Standard Layout for other codes ---
            ctx.textAlign = 'center';
            if (typeof ctx.letterSpacing !== 'undefined') {
                ctx.letterSpacing = `${config.codeLetterSpacing || 0}px`;
            }
            ctx.fillText(config.value, totalWidth / 2, tempCanvas.height + textGap);
        }

      } catch (e) {
        setError("Dữ liệu không hợp lệ");
      }
    }
  }, [config.value, config.barcodeType, config.fgColor, config.codeFont, config.codeFontSize, config.codeLetterSpacing, config.codeTextGap]);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 bg-red-50 rounded-lg text-red-400 ${className}`}>
        <AlertCircle className="w-6 h-6 mb-1" />
        <span className="text-[10px] font-bold text-center uppercase tracking-wider">{error}</span>
      </div>
    );
  }

  return <canvas ref={canvasRef} className={`max-w-full h-auto ${className}`} />;
};

// --- Sub-Components Defined OUTSIDE App to prevent re-render focus loss ---

const Header = ({ setView, view }: { setView: (v: any) => void, view: string }) => (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <button onClick={() => setView('dashboard')} className="flex items-center gap-2 group">
                <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
                    <ScanBarcode className="text-white w-6 h-6" />
                </div>
                <div className="text-left">
                    <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-none">Smart Barcode</h1>
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Generator AI</span>
                </div>
            </button>

            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setView('library')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all ${view === 'library' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-600 bg-slate-50 hover:bg-slate-100'}`}
                >
                    <Layers className="w-4 h-4" />
                    <span className="hidden sm:inline">Thư viện mã</span>
                </button>
            </div>
        </div>
    </header>
);

const Dashboard = ({ handleSelectType }: { handleSelectType: (t: BarcodeType) => void }) => (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-500">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight mb-2">Smart Barcode Generator AI</h1>
        <p className="text-slate-500 text-lg">Chọn loại mã bạn muốn tạo hôm nay</p>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-16">
        {BARCODE_DEFINITIONS.map((def) => (
          <button
            key={def.type}
            onClick={() => handleSelectType(def.type)}
            className={`relative group p-6 rounded-3xl border border-white/50 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center gap-4 ${def.colorClass} hover:-translate-y-1`}
          >
            <div className={`p-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm ${def.iconClass} group-hover:scale-110 transition-transform`}>
              {def.illustration}
            </div>
            <div>
              <h3 className={`font-bold text-lg mb-1 ${def.iconClass}`}>{def.label}</h3>
              <p className="text-xs font-medium text-slate-500/80 leading-snug">{def.description}</p>
            </div>
            <div className="absolute inset-0 rounded-3xl ring-2 ring-white/0 group-hover:ring-white/50 transition-all" />
          </button>
        ))}
      </div>
    </div>
);

const Library = ({ 
    history, 
    handleBackToDashboard, 
    setView, 
    handleEdit, 
    handleDelete 
}: { 
    history: GeneratedQR[], 
    handleBackToDashboard: () => void, 
    setView: (v: any) => void,
    handleEdit: (item: GeneratedQR) => void,
    handleDelete: (id: string) => void
}) => (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-4 mb-8">
            <button 
                onClick={handleBackToDashboard} 
                className="p-2 bg-white rounded-full shadow-sm text-slate-500 hover:text-slate-800"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
                <LibraryIcon className="w-8 h-8 text-indigo-500" />
                Thư viện mã của tôi
            </h2>
        </div>

        <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] p-8 shadow-sm border border-slate-100">
            {history.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p>Chưa có mã nào được lưu. Hãy tạo mã mới ngay!</p>
                <button onClick={() => setView('dashboard')} className="mt-4 px-6 py-2 bg-indigo-500 text-white font-bold rounded-xl text-sm hover:bg-indigo-600 transition-colors">
                    Tạo mã ngay
                </button>
            </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 flex items-center gap-4 group">
                    <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center p-1 overflow-hidden shrink-0">
                    {item.barcodeType === 'qrcode' ? (
                        <QRCodeCanvas value={item.value} size={50} />
                    ) : (
                        <LinearBarcode config={item} className="w-full h-full object-contain" />
                    )}
                    </div>
                    <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${BARCODE_DEFINITIONS.find(d=>d.type===item.barcodeType)?.colorClass} ${BARCODE_DEFINITIONS.find(d=>d.type===item.barcodeType)?.iconClass}`}>
                            {BARCODE_DEFINITIONS.find(d=>d.type===item.barcodeType)?.label}
                        </span>
                        <span className="text-[10px] text-slate-400">{new Date(item.createdAt || 0).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-bold text-slate-800 truncate text-sm mb-0.5">{item.title || item.value}</h4>
                    <p className="text-xs text-slate-400 truncate font-mono">{item.value}</p>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(item)} className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors" title="Sửa"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors" title="Xóa"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </div>
                ))}
            </div>
            )}
        </div>
    </div>
);

interface EditorProps {
    config: QRCodeConfig;
    setConfig: React.Dispatch<React.SetStateAction<QRCodeConfig>>;
    handleBackToDashboard: () => void;
    qrTab: 'url' | 'vcard';
    setQrTab: (t: 'url' | 'vcard') => void;
    vCardData: VCardData;
    updateVCard: (f: keyof VCardData, v: string) => void;
    isAnalyzing: boolean;
    handleAnalyze: () => void;
    useBgImage: boolean;
    setUseBgImage: (b: boolean) => void;
    bgSourceType: 'upload' | 'url';
    setBgSourceType: (t: 'upload' | 'url') => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    bgUrlInput: string;
    setBgUrlInput: (s: string) => void;
    exportFormat: ExportFormat;
    setExportFormat: (f: ExportFormat) => void;
    handleDownload: () => void;
    handleSave: () => void;
    editingId: string | null;
    exportCanvasRef: React.RefObject<HTMLDivElement>;
}

const Editor = ({
    config, setConfig, handleBackToDashboard, qrTab, setQrTab, vCardData, updateVCard,
    isAnalyzing, handleAnalyze, useBgImage, setUseBgImage, bgSourceType, setBgSourceType,
    fileInputRef, bgUrlInput, setBgUrlInput, exportFormat, setExportFormat,
    handleDownload, handleSave, editingId, exportCanvasRef
}: EditorProps) => {
    // Determine current definitions
    const def = BARCODE_DEFINITIONS.find(d => d.type === config.barcodeType) || BARCODE_DEFINITIONS[0];
    const previewSize = 320;
    const previewQRWidth = previewSize * config.qrScale;
    const previewInternalMargin = previewQRWidth * 0.05; // INTERNAL_MARGIN_RATIO
    const previewTextGap = previewQRWidth * (config.barcodeType === 'qrcode' ? 0.05 : 0);
    const previewFontSize = previewQRWidth * 0.08; // FONT_SIZE_RATIO
    
    // Calculate Preview Title spacing
    const previewTitleFontSize = config.renderTitleSize * (previewSize / 1024);
    const previewTitleGap = config.renderTitleGap * (previewSize / 1024);
    const previewTitleHeight = config.renderTitle ? (previewTitleFontSize * 1.2) : 0;

    return (
      <div className="max-w-7xl mx-auto px-4 py-6 animate-in slide-in-from-right-4 duration-500">
        <button 
            onClick={handleBackToDashboard} 
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-6 transition-colors pl-2"
        >
            <div className="p-2 bg-white rounded-full shadow-sm"><ArrowLeft className="w-4 h-4" /></div>
            Quay lại Dashboard
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Controls */}
            <div className="lg:col-span-7 space-y-6">
                
                {/* Header */}
                <div className={`p-6 rounded-3xl ${def.colorClass} flex items-center justify-between`}>
                    <div className="flex items-center gap-4">
                        <div className={`p-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm ${def.iconClass}`}>{def.illustration}</div>
                        <div>
                            <h2 className={`text-2xl font-bold ${def.iconClass}`}>{def.label} Generator</h2>
                            {/* Updated description color to match iconClass */}
                            <p className={`text-sm opacity-80 font-medium ${def.iconClass}`}>{def.description}</p>
                        </div>
                    </div>
                </div>

                {/* Input Section */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <label className="block text-sm font-bold text-slate-700 mb-4">Dữ liệu nội dung</label>
                    
                    {/* QR Code Tabs (URL vs vCard) */}
                    {config.barcodeType === 'qrcode' && (
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6">
                            <button 
                                onClick={() => {
                                    setQrTab('url');
                                    if (config.value.startsWith('BEGIN:VCARD')) setConfig(p => ({...p, value: ''}));
                                }} 
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${qrTab === 'url' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Globe className="w-4 h-4" /> Liên kết / URL
                            </button>
                            <button 
                                onClick={() => setQrTab('vcard')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${qrTab === 'vcard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Contact className="w-4 h-4" /> vCard (Danh thiếp)
                            </button>
                        </div>
                    )}

                    {/* Content Input Based on Tab */}
                    {qrTab === 'url' ? (
                        <div className="relative">
                            <DebouncedInput
                                value={config.value.startsWith('BEGIN:VCARD') ? '' : config.value}
                                onChange={(val) => {
                                    // Auto-clean for numeric types
                                    let cleanVal = val;
                                    if (['EAN13', 'UPC', 'ITF14', 'MSI', 'pharmacode'].includes(config.barcodeType)) {
                                        cleanVal = val.replace(/[\-\s]/g, '');
                                    }
                                    setConfig(p => ({...p, value: cleanVal}));
                                }}
                                placeholder="Nhập nội dung mã..."
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-slate-900 placeholder:text-slate-400 font-medium transition-all"
                            />
                            {/* Only show AI for simple text/url inputs */}
                            <button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing || !config.value}
                                className="absolute right-3 top-3 bottom-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 rounded-xl text-xs font-bold flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
                            >
                                {isAnalyzing ? <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-3 h-3" />} AI
                            </button>
                        </div>
                    ) : (
                        // vCard Form
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                             <div className="relative col-span-1">
                                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <DebouncedInput value={vCardData.firstName} onChange={(v) => updateVCard('firstName', v)} placeholder="Tên" className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none" />
                             </div>
                             <div className="relative col-span-1">
                                <DebouncedInput value={vCardData.lastName} onChange={(v) => updateVCard('lastName', v)} placeholder="Họ" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none" />
                             </div>
                             {/* ... Other vCard inputs ... */}
                             <div className="relative col-span-2 md:col-span-1">
                                <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <DebouncedInput value={vCardData.phone} onChange={(v) => updateVCard('phone', v)} placeholder="Số điện thoại" className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none" />
                             </div>
                             
                             <div className="relative col-span-2 md:col-span-1">
                                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <DebouncedInput value={vCardData.email} onChange={(v) => updateVCard('email', v)} placeholder="Email" className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none" />
                             </div>

                             <div className="relative col-span-2">
                                <Globe className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <DebouncedInput value={vCardData.website} onChange={(v) => updateVCard('website', v)} placeholder="Website URL" className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none" />
                             </div>

                             <div className="relative col-span-2 md:col-span-1">
                                <Briefcase className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <DebouncedInput value={vCardData.company} onChange={(v) => updateVCard('company', v)} placeholder="Công ty / Tổ chức" className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none" />
                             </div>
                             <div className="relative col-span-2 md:col-span-1">
                                <DebouncedInput value={vCardData.job} onChange={(v) => updateVCard('job', v)} placeholder="Chức vụ" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none" />
                             </div>

                             <div className="col-span-2 border-t border-slate-100 pt-3 mt-1">
                                <div className="flex gap-4">
                                    <div className="relative flex-1">
                                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <DebouncedInput value={vCardData.street} onChange={(v) => updateVCard('street', v)} placeholder="Địa chỉ đường" className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none" />
                                    </div>
                                </div>
                                <div className="flex gap-4 mt-3">
                                    <DebouncedInput value={vCardData.city} onChange={(v) => updateVCard('city', v)} placeholder="Thành phố" className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none" />
                                    <DebouncedInput value={vCardData.country} onChange={(v) => updateVCard('country', v)} placeholder="Quốc gia" className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none" />
                                </div>
                             </div>
                        </div>
                    )}

                    {config.barcodeType !== 'qrcode' && (
                        <div className="flex items-start gap-2 mt-3 text-amber-500 bg-amber-50 p-3 rounded-xl">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <p className="text-xs font-medium">Lưu ý: Mã {def.label} yêu cầu định dạng số và độ dài cụ thể. Hệ thống sẽ tự động loại bỏ khoảng trắng và dấu gạch ngang.</p>
                        </div>
                    )}
                </div>

                {/* Text & Fonts Customization Section */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                        <TypeIcon className="w-5 h-5 text-indigo-400" /> Văn bản & Fonts
                    </h3>
                    
                    {/* Render Title Input (Debounced) */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Tiêu đề trên mã (Tùy chọn)</label>
                        <DebouncedInput
                            value={config.renderTitle}
                            onChange={(val) => setConfig({...config, renderTitle: val})}
                            placeholder="Ví dụ: QUÉT THANH TOÁN"
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm text-slate-900 placeholder:text-slate-400"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Title Font */}
                        <div>
                             <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Font Tiêu đề</label>
                             <div className="relative">
                                <select 
                                    value={config.renderTitleFont}
                                    onChange={(e) => setConfig({...config, renderTitleFont: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl appearance-none text-sm font-medium focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900"
                                >
                                    {FONTS.map(f => <option key={f} value={f} style={{fontFamily: f}}>{f}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                             </div>
                        </div>

                         {/* Title Weight */}
                         <div>
                             <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Độ dày Tiêu đề</label>
                             <div className="relative">
                                <select 
                                    value={config.renderTitleWeight || 'bold'}
                                    onChange={(e) => setConfig({...config, renderTitleWeight: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl appearance-none text-sm font-medium focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900"
                                >
                                    {FONT_WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                             </div>
                        </div>
                    </div>

                    {/* Title Controls: Size & Spacing */}
                    {config.renderTitle && (
                         <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <div>
                                 <div className="flex justify-between mb-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Scaling className="w-3 h-3"/> Cỡ chữ</label>
                                    <span className="text-[10px] font-bold text-indigo-500">{config.renderTitleSize}px</span>
                                 </div>
                                 <input 
                                    type="range" 
                                    min="20" max="150" step="5" 
                                    value={config.renderTitleSize} 
                                    onChange={(e) => setConfig({...config, renderTitleSize: Number(e.target.value)})} 
                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none accent-indigo-500" 
                                 />
                             </div>
                             <div>
                                 <div className="flex justify-between mb-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><MoveHorizontal className="w-3 h-3"/> Giãn chữ</label>
                                    <span className="text-[10px] font-bold text-indigo-500">{config.renderTitleLetterSpacing}px</span>
                                 </div>
                                 <input 
                                    type="range" 
                                    min="-5" max="50" step="1" 
                                    value={config.renderTitleLetterSpacing} 
                                    onChange={(e) => setConfig({...config, renderTitleLetterSpacing: Number(e.target.value)})} 
                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none accent-indigo-500" 
                                 />
                             </div>
                         </div>
                    )}

                    {/* Barcode Number Settings */}
                    {config.barcodeType !== 'qrcode' && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                            <label className="text-xs font-bold text-slate-800 uppercase mb-2 flex items-center gap-2">
                                <ScanBarcode className="w-4 h-4 text-indigo-400"/> Số mã vạch
                            </label>
                            
                            <div className="relative mb-2">
                                <select 
                                    value={config.codeFont}
                                    onChange={(e) => setConfig({...config, codeFont: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl appearance-none text-sm font-medium focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900"
                                >
                                    {FONTS.map(f => <option key={f} value={f} style={{fontFamily: f}}>{f}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>

                             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4">
                                 <div>
                                     <div className="flex justify-between mb-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Scaling className="w-3 h-3"/> Cỡ số</label>
                                        <span className="text-[10px] font-bold text-indigo-500">{config.codeFontSize}px</span>
                                     </div>
                                     <input 
                                        type="range" 
                                        min="10" max="80" step="2" 
                                        value={config.codeFontSize} 
                                        onChange={(e) => setConfig({...config, codeFontSize: Number(e.target.value)})} 
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none accent-indigo-500" 
                                     />
                                 </div>
                                 <div>
                                     <div className="flex justify-between mb-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><MoveHorizontal className="w-3 h-3"/> Giãn số</label>
                                        <span className="text-[10px] font-bold text-indigo-500">{config.codeLetterSpacing || 0}px</span>
                                     </div>
                                     <input 
                                        type="range" 
                                        min="-5" max="30" step="1" 
                                        value={config.codeLetterSpacing || 0} 
                                        onChange={(e) => setConfig({...config, codeLetterSpacing: Number(e.target.value)})} 
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none accent-indigo-500" 
                                     />
                                 </div>
                             </div>

                             {/* Barcode Text Gaps Row (Number Gap + Title Gap) */}
                             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-2 grid grid-cols-2 gap-4">
                                 <div className={!config.renderTitle ? "col-span-2" : ""}>
                                     <div className="flex justify-between mb-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><ArrowUpFromLine className="w-3 h-3"/> Khoảng cách số</label>
                                        <span className="text-[10px] font-bold text-indigo-500">{config.codeTextGap ?? 5}px</span>
                                     </div>
                                     <input 
                                        type="range" 
                                        min="-20" max="50" step="1" 
                                        value={config.codeTextGap ?? 5} 
                                        onChange={(e) => setConfig({...config, codeTextGap: Number(e.target.value)})} 
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none accent-indigo-500" 
                                     />
                                 </div>
                                 
                                 {config.renderTitle && (
                                     <div>
                                         <div className="flex justify-between mb-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><ArrowDownToLine className="w-3 h-3"/> K.Cách Tiêu đề</label>
                                            <span className="text-[10px] font-bold text-indigo-500">{config.renderTitleGap}px</span>
                                         </div>
                                         <input 
                                            type="range" 
                                            min="0" max="100" step="5" 
                                            value={config.renderTitleGap} 
                                            onChange={(e) => setConfig({...config, renderTitleGap: Number(e.target.value)})} 
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none accent-indigo-500" 
                                         />
                                     </div>
                                 )}
                             </div>
                        </div>
                    )}

                    {/* Title Gap Slider (Only for QR Code, as Linear handles it in the grid above) */}
                    {config.renderTitle && config.barcodeType === 'qrcode' && (
                        <div className="bg-slate-50 p-4 rounded-2xl mt-2">
                             <div className="flex justify-between mb-2">
                                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><ArrowDownToLine className="w-4 h-4"/> Khoảng cách tiêu đề & Mã</label>
                                <span className="text-xs font-bold text-indigo-500">{config.renderTitleGap}px</span>
                             </div>
                             <input 
                                type="range" 
                                min="0" max="100" step="5" 
                                value={config.renderTitleGap} 
                                onChange={(e) => setConfig({...config, renderTitleGap: Number(e.target.value)})} 
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none accent-indigo-500" 
                             />
                        </div>
                    )}
                </div>

                {/* Design Settings Section */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-indigo-400" /> Tùy chỉnh thiết kế
                    </h3>

                    {/* Resolution & Scale */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl">
                             <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Resolution</label>
                             <input type="range" name="size" min="512" max="2048" step="128" value={config.size} onChange={(e) => setConfig({...config, size: Number(e.target.value)})} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none accent-indigo-500" />
                             <div className="text-right text-xs font-bold text-indigo-500 mt-1">{config.size}px</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl">
                             <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Scale Code</label>
                             <input type="range" name="qrScale" min="0.1" max="1" step="0.05" value={config.qrScale} onChange={(e) => setConfig({...config, qrScale: Number(e.target.value)})} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none accent-indigo-500" />
                             <div className="text-right text-xs font-bold text-indigo-500 mt-1">{Math.round(config.qrScale * 100)}%</div>
                        </div>
                    </div>

                    {/* Colors */}
                    <div className="flex gap-4">
                        <div className="flex-1">
                             <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Màu mã</label>
                             <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                                <input type="color" className="w-8 h-8 rounded-lg border-0 bg-transparent cursor-pointer" value={config.fgColor} onChange={(e) => setConfig({...config, fgColor: e.target.value})} />
                                <span className="text-xs font-mono text-slate-500">{config.fgColor}</span>
                             </div>
                        </div>
                        <div className="flex-1">
                             <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Màu nền Safe Zone</label>
                             <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                                <input type="color" className="w-8 h-8 rounded-lg border-0 bg-transparent cursor-pointer" value={config.bgColor} onChange={(e) => setConfig({...config, bgColor: e.target.value})} />
                                <span className="text-xs font-mono text-slate-500">{config.bgColor}</span>
                             </div>
                        </div>
                    </div>

                    {/* Background Image */}
                    <div className="border-t border-slate-100 pt-6">
                        <div className="flex justify-between items-center mb-4">
                             <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-indigo-400" /> Ảnh nền Poster
                             </label>
                             <button onClick={() => setUseBgImage(!useBgImage)} className={`w-10 h-5 rounded-full transition-colors relative ${useBgImage ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                                <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${useBgImage ? 'left-6' : 'left-1'}`} />
                             </button>
                        </div>
                        
                        {useBgImage && (
                            <div className="animate-in fade-in space-y-3">
                                <div className="flex gap-2 mb-3">
                                    <button onClick={() => setBgSourceType('upload')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${bgSourceType === 'upload' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>UPLOAD</button>
                                    <button onClick={() => setBgSourceType('url')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${bgSourceType === 'url' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>URL LINK</button>
                                </div>
                                {bgSourceType === 'upload' ? (
                                    <button onClick={() => fileInputRef.current?.click()} className="w-full py-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors flex flex-col items-center gap-2">
                                        <Upload className="w-5 h-5" />
                                        <span className="text-xs font-bold">Chọn ảnh từ máy</span>
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="https://" className="flex-1 px-4 py-2 bg-slate-50 rounded-xl text-sm border border-slate-200 text-slate-900" value={bgUrlInput} onChange={(e) => setBgUrlInput(e.target.value)} />
                                        <button onClick={() => {setConfig(p => ({...p, bgImage: bgUrlInput})); setUseBgImage(true);}} className="px-4 bg-indigo-500 text-white rounded-xl text-xs font-bold">OK</button>
                                    </div>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => { setConfig(p => ({...p, bgImage: reader.result as string})); setUseBgImage(true); };
                                        reader.readAsDataURL(file);
                                    }
                                }} className="hidden" />

                                {config.bgImage && (
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 block mb-1">OPACITY</label>
                                            <input type="range" min="0" max="1" step="0.1" value={config.bgImageOpacity} onChange={e => setConfig({...config, bgImageOpacity: Number(e.target.value)})} className="w-full h-1 bg-slate-200 rounded-lg appearance-none accent-indigo-500" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 block mb-1">SCALE</label>
                                            <input type="range" min="0.1" max="2" step="0.1" value={config.bgImageScale} onChange={e => setConfig({...config, bgImageScale: Number(e.target.value)})} className="w-full h-1 bg-slate-200 rounded-lg appearance-none accent-indigo-500" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: Preview & Actions */}
            <div className="lg:col-span-5 space-y-6 sticky top-24">
                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 flex flex-col items-center relative overflow-hidden transition-colors">
                    {/* Decorative Background Blob */}
                    <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full mix-blend-multiply filter blur-3xl opacity-20 ${def.colorClass.replace('bg-', 'bg-').split(' ')[0]}`} />
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-purple-200 mix-blend-multiply filter blur-3xl opacity-20" />

                    <div className="z-10 w-full flex flex-col items-center">
                        <div className="mb-6 text-center">
                            <h3 className="text-xl font-bold text-slate-800">{config.title || "Preview"}</h3>
                            <p className="text-sm text-slate-400">{config.size}x{config.size}px</p>
                        </div>

                        {/* PREVIEW CONTAINER */}
                        <div className="relative w-full aspect-square bg-white rounded-3xl shadow-2xl border border-slate-50 overflow-hidden flex items-center justify-center mb-8">
                             {/* BG Layer */}
                             <div className="absolute inset-0 z-0">
                                {(useBgImage && config.bgImage) ? (
                                    <img 
                                        src={config.bgImage} 
                                        className="w-full h-full transition-transform duration-500" 
                                        style={{ 
                                            opacity: config.bgImageOpacity, 
                                            objectFit: config.bgImageFit, 
                                            transform: `scale(${config.bgImageScale})` 
                                        }} 
                                    />
                                ) : (
                                    <div className="w-full h-full bg-slate-50/50 flex items-center justify-center">
                                        <div className={`w-full h-full opacity-10 ${def.colorClass}`} />
                                    </div>
                                )}
                             </div>

                             {/* Code Layer */}
                             {config.value ? (
                                <div 
                                    className="relative z-10 flex flex-col items-center shadow-lg transition-all duration-300"
                                    style={{ 
                                        backgroundColor: config.bgColor,
                                        padding: `${previewInternalMargin}px`,
                                        borderRadius: `${previewQRWidth * 0.05}px`,
                                        width: `${previewQRWidth}px`,
                                        height: config.barcodeType === 'qrcode' ? `${previewQRWidth + (config.renderTitle ? (previewTitleHeight + previewTitleGap) : 0)}px` : 'auto',
                                        minHeight: config.barcodeType !== 'qrcode' ? '100px' : undefined
                                    }}
                                >
                                    {/* Render Title in Preview (Approximation HTML) */}
                                    {config.renderTitle && (
                                        <div 
                                            style={{
                                                fontFamily: config.renderTitleFont,
                                                fontSize: `${previewTitleFontSize}px`,
                                                marginBottom: `${previewTitleGap}px`,
                                                color: config.fgColor,
                                                fontWeight: config.renderTitleWeight || 'bold',
                                                letterSpacing: `${config.renderTitleLetterSpacing * (previewSize/1024)}px`,
                                                textAlign: 'center',
                                                whiteSpace: 'nowrap',
                                                lineHeight: 1
                                            }}
                                        >
                                            {config.renderTitle}
                                        </div>
                                    )}

                                    {config.barcodeType === 'qrcode' ? (
                                        <QRCodeCanvas
                                            value={config.value}
                                            size={previewQRWidth - (previewInternalMargin * 2)}
                                            fgColor={config.fgColor}
                                            bgColor="transparent"
                                            level={config.level}
                                            includeMargin={false}
                                        />
                                    ) : (
                                        <LinearBarcode config={config} />
                                    )}

                                    {config.barcodeType === 'qrcode' && (
                                        <div 
                                            className="font-bold tracking-tight text-center whitespace-nowrap overflow-hidden" 
                                            style={{ 
                                                marginTop: `${previewTextGap}px`, 
                                                color: config.fgColor, 
                                                fontSize: `${previewFontSize}px`, 
                                                width: '100%' 
                                            }}
                                        >
                                            Quét để truy cập
                                        </div>
                                    )}
                                </div>
                             ) : (
                                <div className="z-10 text-center opacity-30">
                                    <ScanBarcode className="w-16 h-16 mx-auto mb-2" />
                                    <span className="text-xs font-bold uppercase">No Data</span>
                                </div>
                             )}
                        </div>

                        {/* Actions */}
                        <div className="w-full space-y-3">
                             <div className="flex gap-2 mb-2">
                                {(['png', 'jpeg', 'svg', 'pdf'] as ExportFormat[]).map(fmt => (
                                    <button 
                                        key={fmt}
                                        onClick={() => setExportFormat(fmt)}
                                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${exportFormat === fmt ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                    >
                                        {fmt}
                                    </button>
                                ))}
                             </div>

                             <button 
                                onClick={() => handleDownload()}
                                disabled={!config.value}
                                className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors shadow-lg disabled:opacity-50 disabled:shadow-none"
                             >
                                <Download className="w-5 h-5" /> Tải về {exportFormat.toUpperCase()}
                             </button>

                             <button 
                                onClick={handleSave}
                                disabled={!config.value}
                                className="w-full py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                             >
                                <History className="w-5 h-5 text-indigo-500" /> {editingId ? 'Cập nhật mã' : 'Lưu vào thư viện'}
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Hidden Canvas for QR Export */}
        <div className="hidden">
           {config.value && config.barcodeType === 'qrcode' && (
             <div ref={exportCanvasRef}>
               <QRCodeCanvas
                 value={config.value}
                 size={config.size} 
                 fgColor={config.fgColor}
                 bgColor="transparent"
                 level={config.level}
                 includeMargin={false}
               />
             </div>
           )}
        </div>
      </div>
    );
};

// --- Main App Component ---
export default function App() {
  // State: Navigation & Data
  const [view, setView] = useState<'dashboard' | 'editor' | 'library'>('dashboard');
  const [history, setHistory] = useState<GeneratedQR[]>([]);
  
  // State: Editor Configuration
  const [config, setConfig] = useState<QRCodeConfig>(DEFAULT_CONFIG);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [useBgImage, setUseBgImage] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [bgSourceType, setBgSourceType] = useState<'upload' | 'url'>('upload');
  const [bgUrlInput, setBgUrlInput] = useState('');
  
  // State: QR Input Modes (URL vs vCard)
  const [qrTab, setQrTab] = useState<'url' | 'vcard'>('url');
  const [vCardData, setVCardData] = useState<VCardData>({
    firstName: '', lastName: '', phone: '', email: '', 
    website: '', company: '', job: '', street: '', city: '', country: ''
  });

  // State: UI Feedback
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Refs
  const exportCanvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Constants for Rendering
  const INTERNAL_MARGIN_RATIO = 0.05;
  const TEXT_GAP_RATIO = config.barcodeType === 'qrcode' ? 0.05 : 0;
  const FONT_SIZE_RATIO = 0.08;

  // --- Effects ---

  useEffect(() => {
    const saved = localStorage.getItem('pastel_code_history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pastel_code_history', JSON.stringify(history));
  }, [history]);

  // Sync Input States when editing or loading a QR
  useEffect(() => {
    if (view === 'editor') {
        if (config.value.startsWith('BEGIN:VCARD')) {
            setQrTab('vcard');
            setVCardData(parseVCard(config.value));
        } else {
            setQrTab('url');
            // If switching types, config.value might be empty or a previous value
        }
    }
  }, [editingId, view, config.barcodeType]); // Depend on ID or View change, not config.value loop

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // --- Actions ---

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
  };

  const handleSelectType = (type: BarcodeType) => {
    setConfig({
      ...DEFAULT_CONFIG,
      barcodeType: type,
      value: '', 
      qrScale: type === 'qrcode' ? 0.5 : 0.8
    });
    setEditingId(null);
    setUseBgImage(false);
    
    // Reset local input states
    setQrTab('url');
    setVCardData({
        firstName: '', lastName: '', phone: '', email: '', 
        website: '', company: '', job: '', street: '', city: '', country: ''
    });

    setView('editor');
  };

  const handleEdit = (item: GeneratedQR) => {
    setConfig(item);
    setEditingId(item.id);
    setUseBgImage(!!item.bgImage);
    setView('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa mã này khỏi thư viện?')) {
      setHistory(prev => prev.filter(item => item.id !== id));
      showNotification('Đã xóa mã thành công', 'success');
    }
  };

  const handleSave = () => {
    if (!config.value) {
      showNotification('Vui lòng nhập nội dung mã', 'error');
      return;
    }
    
    if (editingId) {
      setHistory(prev => prev.map(item => item.id === editingId ? { ...config, id: editingId, createdAt: Date.now() } : item));
      setEditingId(null);
      showNotification('Đã cập nhật mã thành công!', 'success');
    } else {
      setHistory(prev => [{ ...config, id: crypto.randomUUID(), createdAt: Date.now() }, ...prev]);
      showNotification('Đã lưu vào thư viện!', 'success');
    }
  };

  const handleBackToDashboard = () => {
    setView('dashboard');
    setEditingId(null);
  };

  const handleAnalyze = async () => {
    if (!config.value) return showNotification("Vui lòng nhập nội dung", 'error');
    setIsAnalyzing(true);
    try {
      const suggestion = await getSmartContext(config.value);
      setConfig(prev => ({
        ...prev,
        title: suggestion.title, // Keep meta title
        description: suggestion.description,
        fgColor: suggestion.suggestedColor
      }));
      showNotification("Đã phân tích xong!", 'success');
    } catch(e) {
      showNotification("Lỗi khi phân tích AI", 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // vCard Field Change
  const updateVCard = (field: keyof VCardData, val: string) => {
      const newData = { ...vCardData, [field]: val };
      setVCardData(newData);
      const vcardStr = generateVCard(newData);
      setConfig(prev => ({ ...prev, value: vcardStr }));
  };

  // --- Rendering Logic (Canvas Generation) ---
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const generateCanvas = async (configToRender: QRCodeConfig): Promise<HTMLCanvasElement | null> => {
    const canvasSize = configToRender.size;
    const qrGroupWidth = canvasSize * configToRender.qrScale;
    const internalMargin = qrGroupWidth * INTERNAL_MARGIN_RATIO;
    const maxContentWidth = qrGroupWidth - (internalMargin * 2);
    
    // 1. Calculate Heights and Layout
    let barcodeHeight = maxContentWidth; 
    let barcodeImage: HTMLCanvasElement | null = null;

    // Linear Barcode Generation Logic
    if (configToRender.barcodeType !== 'qrcode') {
        const tempCanvas = document.createElement('canvas');
        try {
            // Use JsBarcode to render BARS ONLY (displayValue: false)
            // We will render text manually to support letterSpacing
            JsBarcode(tempCanvas, configToRender.value, {
                format: configToRender.barcodeType as any,
                width: 4, 
                height: 200, 
                displayValue: false, // Manual text rendering
                margin: 0, 
            });
            
            // Calculate dimensions
            const barHeight = maxContentWidth * (tempCanvas.height / tempCanvas.width);
            const textGap = configToRender.codeTextGap ?? 5; // Use configured gap
            const fontSize = configToRender.codeFontSize;
            const textHeight = fontSize * 1.2;

            barcodeHeight = barHeight + textGap + textHeight;
            
            // Create a wrapper canvas for Bar + Text
            const wrapperCanvas = document.createElement('canvas');
            
            // Offset for EAN-13 first digit
            const isEAN13 = configToRender.barcodeType === 'EAN13' && configToRender.value.length === 13;
            // Need scale factor to match maxContentWidth
            const scaleFactor = maxContentWidth / tempCanvas.width;
            
            // EAN-13 specific spacing
            // We scale the font size down slightly if it's too big relative to the bar width
            const firstCharWidth = isEAN13 ? (fontSize * 0.7) : 0;
            const barXOffset = isEAN13 ? firstCharWidth + 4 : 0;
            
            // Recalculate wrapper width to account for the offset
            wrapperCanvas.width = maxContentWidth + barXOffset;
            wrapperCanvas.height = barcodeHeight;
            const ctxWrapper = wrapperCanvas.getContext('2d');
            
            if (ctxWrapper) {
                // Draw Bars
                // Note: We need to draw the tempCanvas scaled to maxContentWidth
                ctxWrapper.drawImage(tempCanvas, barXOffset, 0, maxContentWidth, barHeight);
                
                // Draw Text
                ctxWrapper.fillStyle = configToRender.fgColor;
                ctxWrapper.font = `bold ${fontSize}px "${configToRender.codeFont}", monospace`;
                ctxWrapper.textBaseline = 'top';
                
                if (isEAN13) {
                     // Group 1: First Digit (Floating left)
                    if (typeof ctxWrapper.letterSpacing !== 'undefined') ctxWrapper.letterSpacing = '0px';
                    ctxWrapper.textAlign = 'right';
                    ctxWrapper.fillText(configToRender.value[0], barXOffset - 5, barHeight + textGap);

                    if (typeof ctxWrapper.letterSpacing !== 'undefined') {
                        ctxWrapper.letterSpacing = `${configToRender.codeLetterSpacing || 0}px`;
                    }
                    ctxWrapper.textAlign = 'center';

                    // Group 2: Digits 2-7
                    const leftCenter = barXOffset + (maxContentWidth * 0.25);
                    ctxWrapper.fillText(configToRender.value.substring(1, 7), leftCenter, barHeight + textGap);

                    // Group 3: Digits 8-13
                    const rightCenter = barXOffset + (maxContentWidth * 0.75);
                    ctxWrapper.fillText(configToRender.value.substring(7, 13), rightCenter, barHeight + textGap);
                } else {
                    if (typeof ctxWrapper.letterSpacing !== 'undefined') {
                        ctxWrapper.letterSpacing = `${configToRender.codeLetterSpacing || 0}px`;
                    }
                    ctxWrapper.textAlign = 'center';
                    // Center within the visual bar area (ignoring potential left offset if not EAN13)
                    ctxWrapper.fillText(configToRender.value, maxContentWidth / 2, barHeight + textGap);
                }
            }
            
            barcodeImage = wrapperCanvas;
        } catch (e) { return null; }
    } else {
        const qrSourceCanvas = exportCanvasRef.current?.querySelector('canvas');
        if (qrSourceCanvas) {
            barcodeImage = qrSourceCanvas;
        }
    }

    // Measure Title Height
    let titleHeight = 0;
    let titleGap = 0;
    const titleFontSize = configToRender.renderTitleSize * (canvasSize / 1024); // Scale font relative to canvas size
    
    if (configToRender.renderTitle) {
       titleHeight = titleFontSize * 1.2; // Approximate line height
       titleGap = configToRender.renderTitleGap * (canvasSize / 1024);
    }

    const fontSize = configToRender.barcodeType === 'qrcode' ? qrGroupWidth * FONT_SIZE_RATIO : 0;
    const bottomTextGap = configToRender.barcodeType === 'qrcode' ? qrGroupWidth * TEXT_GAP_RATIO : 0;
    
    // Total Patch Height
    // Note: For Linear barcodes, barcodeHeight now includes the text height
    const patchH = titleHeight + titleGap + barcodeHeight + bottomTextGap + fontSize + (internalMargin * 2);
    const patchW = qrGroupWidth;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return null;

    canvas.width = canvasSize;
    canvas.height = canvasSize;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Image Background
    if (configToRender.bgImage) {
      try {
        const bgImg = await loadImage(configToRender.bgImage);
        const ratioCanvas = canvas.width / canvas.height;
        const ratioImg = bgImg.width / bgImg.height;
        let drawScale = 1;

        if (configToRender.bgImageFit === 'cover') {
          drawScale = ratioCanvas > ratioImg ? canvas.width / bgImg.width : canvas.height / bgImg.height;
        } else {
          drawScale = ratioCanvas > ratioImg ? canvas.height / bgImg.height : canvas.width / bgImg.width;
        }

        const finalScale = drawScale * configToRender.bgImageScale;
        const dw = bgImg.width * finalScale;
        const dh = bgImg.height * finalScale;
        const dx = (canvas.width - dw) / 2;
        const dy = (canvas.height - dh) / 2;

        ctx.save();
        ctx.globalAlpha = configToRender.bgImageOpacity;
        ctx.drawImage(bgImg, dx, dy, dw, dh);
        ctx.restore();
      } catch (e) { console.error("BG Error"); }
    }

    // Safe Patch
    const patchX = (canvas.width - patchW) / 2;
    const patchY = (canvas.height - patchH) / 2;
    const radius = qrGroupWidth * 0.05;

    ctx.fillStyle = configToRender.bgColor;
    ctx.beginPath();
    ctx.roundRect(patchX, patchY, patchW, patchH, radius);
    ctx.fill();

    // --- Draw Content ---
    const drawContentX = patchX + internalMargin;
    let currentY = patchY + internalMargin;

    // 1. Draw Title Above
    if (configToRender.renderTitle) {
        ctx.fillStyle = configToRender.fgColor;
        // Construct font string with weight
        const weight = configToRender.renderTitleWeight || 'bold';
        ctx.font = `${weight} ${titleFontSize}px "${configToRender.renderTitleFont}", sans-serif`;
        
        // Apply Letter Spacing (Modern Canvas API)
        if (typeof ctx.letterSpacing !== 'undefined') {
          ctx.letterSpacing = `${configToRender.renderTitleLetterSpacing}px`;
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(configToRender.renderTitle, canvas.width / 2, currentY);
        
        // Reset Letter Spacing
        if (typeof ctx.letterSpacing !== 'undefined') {
          ctx.letterSpacing = '0px';
        }

        currentY += titleHeight + titleGap;
    }

    // 2. Draw Barcode/QR
    if (configToRender.barcodeType === 'qrcode' && barcodeImage) {
         ctx.drawImage(barcodeImage, drawContentX, currentY, maxContentWidth, maxContentWidth);
         currentY += maxContentWidth;
    } else if (barcodeImage) {
        // Draw the wrapper canvas (Bars + Text)
        // Wrapper canvas already includes offset logic
        ctx.drawImage(barcodeImage, drawContentX, currentY);
        currentY += barcodeHeight;
    }

    // 3. Draw Bottom Text (Only for QR default text "Scan to...")
    if (configToRender.barcodeType === 'qrcode') {
        const DISPLAY_TEXT = "Quét để truy cập";
        ctx.fillStyle = configToRender.fgColor;
        ctx.font = `bold ${fontSize}px Lato, "Segoe UI", "Open Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(DISPLAY_TEXT, canvas.width / 2, currentY + bottomTextGap);
    }
    return canvas;
  };

  const handleDownload = async (itemConfig: QRCodeConfig = config) => {
    if (!itemConfig.value) {
      showNotification('Không có dữ liệu để tải về', 'error');
      return;
    }

    if (view === 'dashboard' && (itemConfig as any).id !== editingId) {
        handleEdit(itemConfig as GeneratedQR);
        return; 
    }

    try {
      const canvas = await generateCanvas(itemConfig);
      if (!canvas) throw new Error("Canvas generation failed");

      const filename = `smart-barcode-${itemConfig.barcodeType}-${Date.now()}`;

      if (exportFormat === 'pdf') {
          const pdf = new jsPDF({
              orientation: 'portrait',
              unit: 'px',
              format: [canvas.width, canvas.height]
          });
          pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, canvas.width, canvas.height);
          pdf.save(`${filename}.pdf`);
      } else if (exportFormat === 'svg') {
          const link = document.createElement('a');
          link.download = `${filename}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
      } else {
          const mimeType = exportFormat === 'png' ? 'image/png' : 'image/jpeg';
          const link = document.createElement('a');
          link.download = `${filename}.${exportFormat}`;
          link.href = canvas.toDataURL(mimeType, 1.0);
          link.click();
      }
      showNotification(`Đã tải xuống ${exportFormat.toUpperCase()} thành công!`, 'success');
    } catch (e) {
      showNotification("Lỗi khi tải xuống. Vui lòng thử lại.", 'error');
    }
  };


  return (
    <div className="min-h-screen bg-[#fdfbf7] pb-20 transition-colors duration-500 relative">
      <Header setView={setView} view={view} />
      {view === 'dashboard' ? (
        <Dashboard handleSelectType={handleSelectType} />
      ) : view === 'library' ? (
        <Library 
            history={history} 
            handleBackToDashboard={handleBackToDashboard} 
            setView={setView} 
            handleEdit={handleEdit} 
            handleDelete={handleDelete}
        />
      ) : (
        <Editor 
            config={config} 
            setConfig={setConfig} 
            handleBackToDashboard={handleBackToDashboard}
            qrTab={qrTab}
            setQrTab={setQrTab}
            vCardData={vCardData}
            updateVCard={updateVCard}
            isAnalyzing={isAnalyzing}
            handleAnalyze={handleAnalyze}
            useBgImage={useBgImage}
            setUseBgImage={setUseBgImage}
            bgSourceType={bgSourceType}
            setBgSourceType={setBgSourceType}
            fileInputRef={fileInputRef}
            bgUrlInput={bgUrlInput}
            setBgUrlInput={setBgUrlInput}
            exportFormat={exportFormat}
            setExportFormat={setExportFormat}
            handleDownload={handleDownload}
            handleSave={handleSave}
            editingId={editingId}
            exportCanvasRef={exportCanvasRef}
        />
      )}

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300 border border-white/20 backdrop-blur-md ${notification.type === 'success' ? 'bg-slate-800/90 text-white' : 'bg-red-500/90 text-white'}`}>
          <div className={`p-1 rounded-full ${notification.type === 'success' ? 'bg-green-500/20' : 'bg-white/20'}`}>
             {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          </div>
          <span className="font-bold text-sm tracking-wide">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:bg-white/10 p-1 rounded-full transition-colors"><XCircle className="w-4 h-4 opacity-60" /></button>
        </div>
      )}
    </div>
  );
}