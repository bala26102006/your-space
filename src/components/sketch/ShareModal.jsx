import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Share2,
  Download,
  Copy,
  MessageCircle,
  Instagram,
  Mail,
  Check,
  Loader2,
  Sparkles,
  Sliders,
  Maximize2,
  FileText,
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react';
import { exportDocument, downloadBlob } from '../../lib/sketch/exportEngine';

export default function ShareModal({
  isOpen,
  onClose,
  canvasDoc,
  title = 'Untitled Sketch',
  description = ''
}) {
  // Export Settings
  const [format, setFormat] = useState('png'); // 'png' | 'jpg' | 'pdf'
  const [scale, setScale] = useState(1); // 1 | 2 | 3
  const [preset, setPreset] = useState('original'); // 'original' | 'ig_post' | 'ig_story' | 'wa_status'
  const [fitMode, setFitMode] = useState('fit'); // 'fit' | 'crop'
  const [transparent, setTransparent] = useState(false);
  const [jpegQuality, setJpegQuality] = useState(0.92);
  const [watermark, setWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState('Created in Your Space');
  const [shareDescription, setShareDescription] = useState(false);

  // Export State
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewDimensions, setPreviewDimensions] = useState({ width: 0, height: 0 });
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Device capability detection
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [canCopyImage, setCanCopyImage] = useState(false);

  useEffect(() => {
    // Check Web Share API capability
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      try {
        const dummyFile = new File([''], 'test.png', { type: 'image/png' });
        setCanShareFiles(navigator.canShare({ files: [dummyFile] }));
      } catch (e) {
        setCanShareFiles(false);
      }
    }

    // Check ClipboardItem capability
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
      setCanCopyImage(true);
    }
  }, []);

  // Generate / Update Live Preview
  useEffect(() => {
    if (!isOpen || !canvasDoc) return;

    let active = true;
    setIsExporting(true);

    const generatePreview = async () => {
      try {
        const result = await exportDocument(canvasDoc, title, {
          format: format === 'pdf' ? 'jpg' : format,
          scale: 1, // Preview always renders at 1x for speed
          preset,
          fitMode,
          transparent: format === 'png' && transparent,
          jpegQuality,
          watermark,
          watermarkText
        });

        if (active) {
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          const url = URL.createObjectURL(result.blob);
          setPreviewUrl(url);
          setPreviewBlob(result.blob);
          setPreviewDimensions({ width: result.width, height: result.height });
          setIsExporting(false);
        }
      } catch (err) {
        console.error('Export preview error:', err);
        if (active) setIsExporting(false);
      }
    };

    const timer = setTimeout(generatePreview, 100);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, canvasDoc, format, preset, fitMode, transparent, jpegQuality, watermark, watermarkText]);

  // Cleanup preview URL on close
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  // Prepare full-scale export file
  const prepareExportFile = async () => {
    setIsExporting(true);
    try {
      const result = await exportDocument(canvasDoc, title, {
        format,
        scale,
        preset,
        fitMode,
        transparent: format === 'png' && transparent,
        jpegQuality,
        watermark,
        watermarkText
      });
      setIsExporting(false);
      return result;
    } catch (err) {
      setIsExporting(false);
      throw err;
    }
  };

  // 1. Native Web Share API
  const handleNativeShare = async () => {
    try {
      const { file } = await prepareExportFile();
      const textToShare = shareDescription && description ? description : `${title} — Created in Your Space`;

      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: title || 'Sketch',
          text: textToShare
        });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
        setStatusMessage('Sharing not supported on this device. Use Download instead.');
      }
    }
  };

  // 2. Download / Save Image
  const handleDownload = async () => {
    try {
      const { blob, filename } = await prepareExportFile();
      downloadBlob(blob, filename);
      setStatusMessage('Downloaded ✓');
      setTimeout(() => setStatusMessage(''), 2500);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  // 3. Copy Image to Clipboard
  const handleCopyImage = async () => {
    try {
      setIsExporting(true);
      // ClipboardItem requires PNG format
      const result = await exportDocument(canvasDoc, title, {
        format: 'png',
        scale: 1,
        preset,
        fitMode,
        transparent: false,
        watermark,
        watermarkText
      });

      if (navigator.clipboard?.write && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': result.blob })
        ]);
        setCopiedSuccess(true);
        setStatusMessage('Image copied to clipboard! Paste anywhere with Ctrl+V');
        setTimeout(() => {
          setCopiedSuccess(false);
          setStatusMessage('');
        }, 3500);
      } else {
        setStatusMessage('Copy image not supported in this browser. Use Download instead.');
      }
      setIsExporting(false);
    } catch (err) {
      setIsExporting(false);
      console.error('Copy to clipboard failed:', err);
      setStatusMessage('Clipboard access denied. Please download the file.');
    }
  };

  // 4. WhatsApp Share
  const handleWhatsAppShare = async () => {
    const shareText = shareDescription && description ? `${title}\n${description}` : `${title} — Created in Your Space`;

    if (canShareFiles) {
      try {
        const { file } = await prepareExportFile();
        await navigator.share({
          files: [file],
          title,
          text: shareText
        });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }

    // Desktop fallback: copy image and open WhatsApp web
    try {
      await handleCopyImage();
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
      setStatusMessage('Image copied! Press Ctrl+V in WhatsApp chat to paste.');
    } catch (e) {
      handleDownload();
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
      setStatusMessage('Downloaded! Attach image in WhatsApp chat.');
    }
  };

  // 5. Instagram Share
  const handleInstagramShare = async () => {
    if (canShareFiles) {
      try {
        const { file } = await prepareExportFile();
        await navigator.share({
          files: [file],
          title: title || 'Sketch'
        });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }

    // Desktop / Web fallback
    handleDownload();
    setStatusMessage('Downloaded! Open Instagram on mobile or web and upload from gallery.');
  };

  // 6. Email Share
  const handleEmailShare = () => {
    handleDownload();
    const subject = encodeURIComponent(`Sketch: ${title}`);
    const body = encodeURIComponent(
      `${title}\n\n${description || ''}\n\n(Attach the downloaded sketch image to this email)`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setStatusMessage('Sketch downloaded. Please attach to your email.');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-card-default border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 text-orange-500 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 id="share-modal-title" className="text-sm sm:text-base font-bold text-text-primary">
                Export &amp; Share Sketch
              </h2>
              <p className="text-[11px] text-text-muted">High-res export, social presets &amp; direct sharing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: 2 Columns on desktop */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-5 min-h-0">
          {/* Left Column: Live Preview & Preset */}
          <div className="flex flex-col gap-3">
            <div className="relative aspect-[4/3] bg-neutral-100 dark:bg-[#15171C] rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden flex items-center justify-center p-2 shadow-inner">
              {isExporting ? (
                <div className="flex flex-col items-center gap-2 text-text-muted">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                  <span className="text-xs">Rendering preview...</span>
                </div>
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt={title}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                />
              ) : (
                <div className="text-text-muted text-xs">No preview available</div>
              )}

              {/* Resolution Badge */}
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white">
                {previewDimensions.width * scale} × {previewDimensions.height * scale} px • {scale}x
              </div>
            </div>

            {/* Target Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                Preset Ratio
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { id: 'original', label: 'Original Size' },
                  { id: 'ig_post', label: 'Instagram (1:1)' },
                  { id: 'ig_story', label: 'Story (9:16)' },
                  { id: 'wa_status', label: 'WhatsApp Status' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPreset(p.id)}
                    className={`py-1.5 px-2 rounded-xl border text-left transition-all ${
                      preset === p.id
                        ? 'border-orange-500 bg-orange-500/10 font-medium text-orange-500'
                        : 'border-black/5 dark:border-white/10 text-text-secondary hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fit vs Crop option when preset differs */}
            {preset !== 'original' && (
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-text-secondary">Scaling Mode</span>
                <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setFitMode('fit')}
                    className={`px-2 py-0.5 rounded-md ${fitMode === 'fit' ? 'bg-card-default shadow-xs text-orange-500 font-medium' : 'text-text-muted'}`}
                  >
                    Fit
                  </button>
                  <button
                    type="button"
                    onClick={() => setFitMode('crop')}
                    className={`px-2 py-0.5 rounded-md ${fitMode === 'crop' ? 'bg-card-default shadow-xs text-orange-500 font-medium' : 'text-text-muted'}`}
                  >
                    Crop
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Format, Quality, Watermark & Actions */}
          <div className="flex flex-col gap-4">
            {/* Format & Scale Selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                Export Format &amp; Scale
              </label>
              <div className="flex items-center gap-2">
                {/* Formats */}
                <div className="flex-1 grid grid-cols-3 gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
                  {['png', 'jpg', 'pdf'].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormat(fmt)}
                      className={`py-1 text-xs rounded-lg uppercase font-semibold transition-all ${
                        format === fmt
                          ? 'bg-card-default text-orange-500 shadow-xs'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>

                {/* Scale buttons */}
                <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
                  {[1, 2, 3].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setScale(s)}
                      className={`px-2 py-1 text-xs rounded-lg font-semibold transition-all ${
                        scale === s
                          ? 'bg-card-default text-orange-500 shadow-xs'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                      title={`${s}x Resolution`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Format-specific toggles */}
            <div className="space-y-2 text-xs">
              {format === 'png' && (
                <label className="flex items-center justify-between text-text-secondary cursor-pointer py-1">
                  <span>Transparent Background</span>
                  <input
                    type="checkbox"
                    checked={transparent}
                    onChange={(e) => setTransparent(e.target.checked)}
                    className="rounded accent-orange-500"
                  />
                </label>
              )}

              {format === 'jpg' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-text-secondary">
                    <span>JPEG Quality</span>
                    <span>{Math.round(jpegQuality * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="1"
                    step="0.05"
                    value={jpegQuality}
                    onChange={(e) => setJpegQuality(parseFloat(e.target.value))}
                    className="w-full accent-orange-500 h-1.5 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer"
                  />
                </div>
              )}

              {/* Watermark toggle */}
              <label className="flex items-center justify-between text-text-secondary cursor-pointer py-1">
                <span>Add Watermark</span>
                <input
                  type="checkbox"
                  checked={watermark}
                  onChange={(e) => setWatermark(e.target.checked)}
                  className="rounded accent-orange-500"
                />
              </label>

              {/* Description caption toggle */}
              <label className="flex items-center justify-between text-text-secondary cursor-pointer py-1">
                <span>Include Caption / Description</span>
                <input
                  type="checkbox"
                  checked={shareDescription}
                  onChange={(e) => setShareDescription(e.target.checked)}
                  className="rounded accent-orange-500"
                />
              </label>
            </div>

            {/* Status Feedback Message */}
            {statusMessage && (
              <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Actions Grid */}
            <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
              {/* Primary: Native Share if supported, otherwise Download */}
              {canShareFiles ? (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  disabled={isExporting}
                  className="w-full py-2.5 px-4 rounded-xl bg-orange-500 text-white font-semibold text-xs hover:bg-orange-600 active:scale-98 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share via Apps (Instagram, WhatsApp...)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isExporting}
                  className="w-full py-2.5 px-4 rounded-xl bg-orange-500 text-white font-semibold text-xs hover:bg-orange-600 active:scale-98 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download / Save Image</span>
                </button>
              )}

              {/* Secondary Buttons Row */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {canShareFiles && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="py-2 px-3 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-text-primary font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-text-muted" />
                    <span>Download</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyImage}
                  className="py-2 px-3 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-text-primary font-medium flex items-center justify-center gap-1.5 transition-colors"
                  title="Copy image to paste into WhatsApp Web, Docs, Slack"
                >
                  {copiedSuccess ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-text-muted" />
                  )}
                  <span>{copiedSuccess ? 'Copied ✓' : 'Copy Image'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="py-2 px-3 rounded-xl border border-black/10 dark:border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleInstagramShare}
                  className="py-2 px-3 rounded-xl border border-black/10 dark:border-white/10 hover:bg-rose-500/10 hover:border-rose-500/30 text-rose-600 dark:text-rose-400 font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span>Instagram</span>
                </button>
              </div>

              {/* Email Button */}
              <button
                type="button"
                onClick={handleEmailShare}
                className="w-full py-1.5 text-center text-text-muted hover:text-text-primary text-[11px] flex items-center justify-center gap-1 transition-colors"
              >
                <Mail className="w-3 h-3" />
                <span>Send via Email</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
