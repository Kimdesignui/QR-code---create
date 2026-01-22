
export interface QRCodeConfig {
  value: string;
  size: number; // Đây sẽ là độ phân giải tổng thể của ảnh xuất (ví dụ 1280px)
  fgColor: string;
  bgColor: string;
  level: 'L' | 'M' | 'Q' | 'H';
  includeMargin: boolean;
  title?: string;
  description?: string;
  bgImage?: string;
  bgImageOpacity: number;
  bgImageFit: 'cover' | 'contain';
  bgImageScale: number;
  qrScale: number; // Tỉ lệ mã QR so với độ rộng ảnh (0.05 đến 1.0)
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
