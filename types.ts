import React from 'react';

export type BarcodeType = 
  | 'qrcode' 
  | 'CODE128' 
  | 'CODE39' 
  | 'EAN13' 
  | 'UPC' 
  | 'ITF14' 
  | 'MSI' 
  | 'pharmacode';

export type ExportFormat = 'png' | 'jpeg' | 'svg' | 'pdf';

export interface QRCodeConfig {
  value: string;
  barcodeType: BarcodeType;
  size: number;
  fgColor: string;
  bgColor: string;
  level: 'L' | 'M' | 'Q' | 'H';
  includeMargin: boolean;
  title?: string; // Used for library metadata
  description?: string; // Used for library metadata
  
  // Visual Customization
  renderTitle: string; // Text rendered on canvas
  renderTitleFont: string;
  renderTitleWeight: string; // 'bold', 'normal', '300', etc.
  renderTitleSize: number;
  renderTitleGap: number;
  renderTitleLetterSpacing: number; // New: Tracking for title
  
  codeFont: string; // Font for barcode numbers
  codeFontSize: number; // New: Size for barcode numbers
  codeLetterSpacing: number; // New: Tracking for barcode numbers
  codeTextGap: number; // New: Gap between barcode and text

  bgImage?: string;
  bgImageOpacity: number;
  bgImageFit: 'cover' | 'contain';
  bgImageScale: number;
  qrScale: number;
}

export interface GeneratedQR extends QRCodeConfig {
  id: string;
  createdAt: number;
}

export interface AISuggestion {
  title: string;
  description: string;
  suggestedColor: string;
}

export interface BarcodeDef {
  type: BarcodeType;
  label: string;
  description: string;
  colorClass: string; // Tailwind bg class for pastel theme
  iconClass: string; // Tailwind text class
  illustration: React.ReactNode;
}