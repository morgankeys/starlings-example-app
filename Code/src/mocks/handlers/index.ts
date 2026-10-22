import { assistantHandlers } from './assistant';
import { bulkTaskHandlers } from './bulk';
import { fileHandlers } from './files';
import { orgHandlers } from './org';
import { searchHandlers } from './search';
import { taskHandlers } from './tasks';

export const handlers = [
  ...orgHandlers,
  ...bulkTaskHandlers,
  ...taskHandlers,
  ...fileHandlers,
  ...searchHandlers,
  ...assistantHandlers,
];
