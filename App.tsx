
import React, { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { 
  QrCode, 
  Download, 
  Trash2, 
  Sparkles, 
  History, 
  Settings, 
  Copy, 
  CheckCircle2, 
  ExternalLink, 
  Plus, 
  Maximize2,
  Image as ImageIcon,
  X,
  Layers,
  Link as LinkIcon,
  Upload,
  ZoomIn,
  Move,
  Layout,
  ChevronDown
} from 'lucide-react';
import { QRCodeConfig, GeneratedQR } from './types';
import { getSmartContext } from './services/geminiService';

const DEFAULT_CONFIG: QRCodeConfig = {
  value: '',
  size: 1024, // Mặc định độ phân giải cao
  fgColor: '#000000',
  bgColor: '#ffffff',
  level: 'H',
  includeMargin: false,
  title: '',
  description: '',
  bgImage: undefined,
  bgImageOpacity: 1.0,
  bgImageFit: 'cover',
  bgImageScale: 1.0,
  qrScale: 0.5 // Mặc định chiếm 50% ảnh
};

export default function App() {
  const [config, setConfig] = useState<QRCodeConfig>(DEFAULT_CONFIG);
  const [useBgImage, setUseBgImage] = useState(false);
  const [history, setHistory] = useState<GeneratedQR[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'svg'>('png');
  const [bgSourceType, setBgSourceType] = useState<'upload' | 'url'>('upload');
  const [bgUrlInput, setBgUrlInput] = useState('');
  
  const svgHiddenRef = useRef<SVGSVGElement>(null);
  const exportCanvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const DISPLAY_TEXT = "Quét để truy cập";
  const INTERNAL_MARGIN_RATIO = 0.05;
  const TEXT_GAP_RATIO = 0.05;
  const FONT_SIZE_RATIO = 0.08;

  useEffect(() => {
    const saved = localStorage.getItem('qr_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('qr_history', JSON.stringify(history));
  }, [history]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumeric = ['size', 'bgImageOpacity', 'bgImageScale', 'qrScale'].includes(name);
    const val = isNumeric ? parseFloat(value) : value;
    setConfig(prev => ({ ...prev, [name]: val }));
  };

  const handleQRScalePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = parseFloat(e.target.value);
    if (!isNaN(percentage)) {
      const scale = Math.min(Math.max(percentage / 100, 0.05), 1.0);
      setConfig(prev => ({ ...prev, qrScale: scale }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig(prev => ({ ...prev, bgImage: reader.result as string }));
        setUseBgImage(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlImageSubmit = () => {
    if (bgUrlInput.trim()) {
      setConfig(prev => ({ ...prev, bgImage: bgUrlInput.trim() }));
      setUseBgImage(true);
    }
  };

  const removeBgImage = () => {
    setConfig(prev => ({ ...prev, bgImage: undefined }));
    setBgUrlInput('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!config.value || !config.value.startsWith('http')) {
      alert("Vui lòng nhập URL hợp lệ");
      return;
    }
    setIsAnalyzing(true);
    try {
      const suggestion = await getSmartContext(config.value);
      setConfig(prev => ({
        ...prev,
        title: suggestion.title,
        description: suggestion.description,
        fgColor: suggestion.suggestedColor
      }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (!config.value) return;
    setHistory(prev => [{ ...config, id: crypto.randomUUID(), createdAt: Date.now() }, ...prev]);
  };

  const handleDelete = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const handleDownload = async () => {
    if (!config.value) return;

    const canvasSize = config.size;
    const qrGroupWidth = canvasSize * config.qrScale;
    const internalMargin = qrGroupWidth * INTERNAL_MARGIN_RATIO;
    const actualQRSize = qrGroupWidth - (internalMargin * 2);
    const textGap = qrGroupWidth * TEXT_GAP_RATIO;
    const fontSize = qrGroupWidth * FONT_SIZE_RATIO;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    canvas.width = canvasSize;
    canvas.height = canvasSize;

    // 1. Nền trắng cơ bản
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Vẽ ảnh nền (chỉ khi được bật)
    if (useBgImage && config.bgImage) {
      try {
        const bgImg = await loadImage(config.bgImage);
        const ratioCanvas = canvas.width / canvas.height;
        const ratioImg = bgImg.width / bgImg.height;
        let drawScale = 1;

        if (config.bgImageFit === 'cover') {
          drawScale = ratioCanvas > ratioImg ? canvas.width / bgImg.width : canvas.height / bgImg.height;
        } else {
          drawScale = ratioCanvas > ratioImg ? canvas.height / bgImg.height : canvas.width / bgImg.width;
        }

        const finalScale = drawScale * config.bgImageScale;
        const dw = bgImg.width * finalScale;
        const dh = bgImg.height * finalScale;
        const dx = (canvas.width - dw) / 2;
        const dy = (canvas.height - dh) / 2;

        ctx.save();
        ctx.globalAlpha = config.bgImageOpacity;
        ctx.drawImage(bgImg, dx, dy, dw, dh);
        ctx.restore();
      } catch (e) {
        console.error("BG Image Load Error", e);
      }
    }

    // 3. Vẽ Vùng an toàn (Safe Patch)
    const patchX = (canvas.width - qrGroupWidth) / 2;
    const patchY = (canvas.height - (qrGroupWidth + textGap + fontSize)) / 2;
    const patchW = qrGroupWidth;
    const patchH = qrGroupWidth + textGap + fontSize + internalMargin;
    const radius = qrGroupWidth * 0.05;

    ctx.fillStyle = config.bgColor;
    ctx.beginPath();
    ctx.roundRect(patchX, patchY, patchW, patchH, radius);
    ctx.fill();

    // 4. Vẽ QR Code
    const tempCanvas = exportCanvasRef.current?.querySelector('canvas');
    if (tempCanvas) {
      ctx.drawImage(tempCanvas, patchX + internalMargin, patchY + internalMargin, actualQRSize, actualQRSize);
    }

    // 5. Vẽ Văn bản
    ctx.fillStyle = config.fgColor;
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(DISPLAY_TEXT, canvas.width / 2, patchY + internalMargin + actualQRSize + textGap);

    const mimeType = exportFormat === 'png' ? 'image/png' : 'image/jpeg';
    const link = document.createElement('a');
    link.download = `smart-qr-${Date.now()}.${exportFormat}`;
    link.href = canvas.toDataURL(mimeType, 1.0);
    link.click();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(config.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const previewSize = 320;
  const previewQRWidth = previewSize * config.qrScale;
  const previewInternalMargin = previewQRWidth * INTERNAL_MARGIN_RATIO;
  const previewActualQRSize = previewQRWidth - (previewInternalMargin * 2);
  const previewTextGap = previewQRWidth * TEXT_GAP_RATIO;
  const previewFontSize = previewQRWidth * FONT_SIZE_RATIO;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Hidden QR Generator for Export Scaling */}
      <div className="hidden">
        {config.value && (
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

      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-indigo-200 shadow-lg">
              <QrCode className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Smart QR Studio</h1>
          </div>
          <div className="flex items-center gap-4">
             <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider border border-indigo-100">SafeScan v2.3</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-500" />
              Nội dung mã QR
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Đường dẫn (URL)</label>
                <div className="relative">
                  <input
                    type="url"
                    name="value"
                    value={config.value}
                    onChange={handleInputChange}
                    placeholder="https://example.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 pr-32"
                  />
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !config.value}
                    className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
                  >
                    {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    AI SMART
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-500" />
              Thiết lập hình ảnh xuất
            </h2>
            
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <label className="block text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-indigo-500" /> Độ phân giải ảnh xuất ({config.size}px)
                </label>
                <input
                  type="range"
                  name="size"
                  min="512"
                  max="2048"
                  step="128"
                  value={config.size}
                  onChange={handleInputChange}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-black mt-1 uppercase">
                  <span>SD (512px)</span>
                  <span>4K Ready (2048px)</span>
                </div>
              </div>

              <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                    <Layout className="w-4 h-4 text-indigo-600" /> Tỉ lệ mã QR so với ảnh
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={Math.round(config.qrScale * 100)}
                        onChange={handleQRScalePercentageChange}
                        className="w-16 px-2 py-1 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                      />
                      <span className="absolute -right-4 top-1 text-xs font-bold text-indigo-400">%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <input
                    type="range"
                    name="qrScale"
                    min="0.05"
                    max="1.0"
                    step="0.01"
                    value={config.qrScale}
                    onChange={handleInputChange}
                    className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>

              {/* Background Image Controls With Toggle */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-indigo-500" /> Sử dụng ảnh nền
                    </label>
                    <button 
                      onClick={() => setUseBgImage(!useBgImage)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${useBgImage ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useBgImage ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {useBgImage && (
                    <div className="flex bg-slate-200/50 p-1 rounded-lg">
                      {['upload', 'url'].map((type) => (
                        <button 
                          key={type}
                          onClick={() => setBgSourceType(type as any)}
                          className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase ${bgSourceType === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                          {type === 'upload' ? 'Máy tính' : 'Link'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {useBgImage && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    {bgSourceType === 'upload' ? (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3 bg-white border border-dashed border-slate-300 rounded-xl text-sm font-bold text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4" /> {config.bgImage ? 'Thay đổi ảnh nền' : 'Chọn ảnh từ máy'}
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={bgUrlInput}
                          onChange={(e) => setBgUrlInput(e.target.value)}
                          placeholder="Dán link ảnh tại đây..."
                          className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <button onClick={handleUrlImageSubmit} className="bg-indigo-600 text-white px-4 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">Áp dụng</button>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

                    {config.bgImage && (
                      <div className="space-y-4 pt-4 border-t border-slate-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Move className="w-3 h-3"/> Fit</label>
                            <div className="flex bg-white border border-slate-200 p-1 rounded-lg">
                              <button onClick={() => setConfig(prev => ({...prev, bgImageFit: 'cover'}))} className={`flex-1 py-1 text-[9px] font-black rounded ${config.bgImageFit === 'cover' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}>COVER</button>
                              <button onClick={() => setConfig(prev => ({...prev, bgImageFit: 'contain'}))} className={`flex-1 py-1 text-[9px] font-black rounded ${config.bgImageFit === 'contain' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}>CONTAIN</button>
                            </div>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><ZoomIn className="w-3 h-3"/> Zoom ({Math.round(config.bgImageScale * 100)}%)</label>
                             <input type="range" name="bgImageScale" min="0.1" max="3" step="0.05" value={config.bgImageScale} onChange={handleInputChange} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none accent-indigo-600" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Layers className="w-3 h-3"/> Opacity</label><span className="text-xs font-bold text-indigo-600">{Math.round(config.bgImageOpacity * 100)}%</span></div>
                          <input type="range" name="bgImageOpacity" min="0" max="1" step="0.01" value={config.bgImageOpacity} onChange={handleInputChange} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none accent-indigo-600" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">Định dạng file</label>
                    <div className="relative">
                      <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)} className="w-full appearance-none px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                        <option value="png">PNG (Trong suốt)</option>
                        <option value="jpeg">JPEG (Nén cao)</option>
                        <option value="svg">SVG (Vector)</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Màu chủ đạo</label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl">
                      <input type="color" name="fgColor" value={config.fgColor} onChange={handleInputChange} className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
                      <input type="text" name="fgColor" value={config.fgColor} onChange={handleInputChange} className="flex-1 text-xs font-mono uppercase outline-none text-slate-500" />
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 sticky top-24 flex flex-col items-center">
            <div className="w-full text-center mb-6">
              <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-widest mb-2 border border-indigo-100">Smart Visualization</span>
              <h3 className="text-xl font-bold text-slate-900 truncate px-4">{config.title || "Tác phẩm của bạn"}</h3>
              <p className="text-xs text-slate-400 mt-1 truncate px-4">Độ phân giải thực: {config.size}x{config.size}px</p>
            </div>

            <div className="relative w-full aspect-square bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex items-center justify-center group">
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
                    alt="" 
                  />
                ) : (
                  <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                     <ImageIcon className="w-12 h-12 text-slate-100" />
                  </div>
                )}
              </div>

              {config.value ? (
                <div 
                  className="relative z-10 flex flex-col items-center shadow-2xl transition-all duration-300"
                  style={{ 
                    backgroundColor: config.bgColor,
                    padding: `${previewInternalMargin}px`,
                    borderRadius: `${previewQRWidth * 0.05}px`,
                    width: `${previewQRWidth}px`
                  }}
                >
                  <QRCodeCanvas
                    value={config.value}
                    size={previewActualQRSize}
                    fgColor={config.fgColor}
                    bgColor="transparent"
                    level={config.level}
                    includeMargin={false}
                  />
                  <div 
                    className="font-bold tracking-tight text-center whitespace-nowrap overflow-hidden" 
                    style={{ 
                      marginTop: `${previewTextGap}px`,
                      color: config.fgColor,
                      fontSize: `${previewFontSize}px`,
                      width: '100%'
                    }}
                  >
                    {DISPLAY_TEXT}
                  </div>
                </div>
              ) : (
                <div className="bg-white/80 backdrop-blur-md border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center z-10 shadow-lg">
                  <QrCode className="w-16 h-16 text-slate-200 mx-auto mb-4 animate-pulse" />
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Đang chờ <br/> đường dẫn...</p>
                </div>
              )}
              
              <div className="absolute bottom-4 right-4 bg-slate-900/40 backdrop-blur-sm px-3 py-1.5 rounded-full z-20">
                 <p className="text-[9px] font-bold text-white uppercase tracking-widest">Preview Mode</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full mt-10">
              <button
                onClick={handleDownload}
                disabled={!config.value}
                className="flex items-center justify-center gap-2 px-6 py-5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-xl shadow-indigo-200 active:scale-95 uppercase tracking-wider"
              >
                <Download className="w-5 h-5" /> Xuất file
              </button>
              <button
                onClick={handleSave}
                disabled={!config.value}
                className="flex items-center justify-center gap-2 px-6 py-5 border-2 border-slate-100 text-slate-700 rounded-2xl font-black hover:bg-slate-50 hover:border-slate-200 disabled:opacity-30 transition-all active:scale-95 uppercase tracking-wider"
              >
                <History className="w-5 h-5" /> Lưu lại
              </button>
            </div>

            {config.value && (
              <div className="mt-8 w-full p-4 bg-slate-50 rounded-2xl flex items-center justify-between gap-4 border border-slate-100">
                <div className="flex-1 overflow-hidden">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1.5">Destination URL</p>
                  <p className="text-xs font-bold text-slate-600 truncate">{config.value}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCopy} className="p-2.5 bg-white hover:bg-indigo-50 rounded-xl transition-all text-slate-400 hover:text-indigo-600 shadow-sm border border-slate-100">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-6 py-3.5 z-20 flex justify-center">
        <div className="max-w-6xl w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]" />
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-75" />
            </div>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">High Performance Rendering</p>
          </div>
          <div className="flex gap-8 items-center">
             <div className="hidden md:flex items-center gap-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                <span>AI Grounding</span>
                <div className="w-1 h-1 rounded-full bg-slate-200" />
                <span>Ultra Scale Engine</span>
             </div>
             <p className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 uppercase tracking-widest">Stable v2.3.0</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
