export type Category = 'images' | 'pdf' | 'documents' | 'utilities';

export interface LocalizedString {
  ru: string;
  en: string;
}

export interface ToolOption {
  key: string;
  type: 'slider' | 'select' | 'number' | 'text' | 'pages';
  label: LocalizedString;
  default: string;
  min?: number;
  max?: number;
  step?: number;
  choices?: Array<{ value: string; label: LocalizedString }>;
  placeholder?: LocalizedString;
  helpText?: LocalizedString;
}

export interface Tool {
  id: string;
  category: Category;
  operationType: string;
  name: LocalizedString;
  description: LocalizedString;
  icon: string;
  sourceFormats: string[];
  targetFormat?: string;
  acceptMime: string[];
  maxFileSize: number;
  options: ToolOption[];
  popular?: boolean;
  multiFile?: boolean;
}
