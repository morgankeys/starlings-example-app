import { assistantHandlers } from './assistant';
import { fileHandlers } from './files';
import { orgHandlers } from './org';
import { searchHandlers } from './search';
import { taskHandlers } from './tasks';

export const handlers = [
  ...orgHandlers,
  ...taskHandlers,
  ...fileHandlers,
  ...searchHandlers,
  ...assistantHandlers,
];
