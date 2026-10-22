import {
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  Folder,
  Presentation,
} from 'lucide-react';
import type { FileKind } from '@/domain/types';
import styles from './FileIcon.module.css';

const ICONS = {
  doc: FileText,
  sheet: FileSpreadsheet,
  slides: Presentation,
  pdf: FileType2,
  image: FileImage,
  folder: Folder,
};
const LABELS = {
  doc: 'Document',
  sheet: 'Spreadsheet',
  slides: 'Slides',
  pdf: 'PDF',
  image: 'Image',
  folder: 'Folder',
};

export function FileIcon({ kind, size = 'md' }: { kind: FileKind | 'folder'; size?: 'md' | 'lg' }) {
  const Icon = ICONS[kind];
  return (
    <span className={styles.icon} data-kind={kind} data-size={size} title={LABELS[kind]}>
      <Icon aria-label={LABELS[kind]} />
    </span>
  );
}

export const fileKindLabel = (kind: FileKind | 'folder') => LABELS[kind];
