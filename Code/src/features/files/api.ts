import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { filesApi } from '@/api/endpoints';
import { keys } from '@/api/keys';
import type { FileItem, FileView } from '@/domain/types';

export const useFolder = (id: string) =>
  useQuery({ queryKey: keys.folder(id), queryFn: () => filesApi.folder(id) });
export const useFolderTree = () => useQuery({ queryKey: keys.folderTree, queryFn: filesApi.tree });
export const useFiles = (view: FileView, limit?: number) =>
  useQuery({ queryKey: keys.files(view, limit), queryFn: () => filesApi.list(view, limit) });
export const useFile = (id: string | null) =>
  useQuery({ queryKey: keys.file(id ?? ''), queryFn: () => filesApi.get(id!), enabled: !!id });

function useInvalidateFiles() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: keys.allFolders });
    qc.invalidateQueries({ queryKey: keys.allFiles });
    qc.invalidateQueries({ queryKey: ['shares'] });
    qc.invalidateQueries({ queryKey: ['tasks', 'detail'] });
  };
}

export function useFileMutations() {
  const invalidate = useInvalidateFiles();
  const qc = useQueryClient();
  return {
    createFolder: useMutation({
      mutationFn: ({ parentId, name }: { parentId: string; name: string }) =>
        filesApi.createFolder(parentId, name),
      onSuccess: invalidate,
    }),
    updateFolder: useMutation({
      mutationFn: ({ id, ...patch }: { id: string; name?: string; parentId?: string }) =>
        filesApi.updateFolder(id, patch),
      onSuccess: invalidate,
    }),
    deleteFolder: useMutation({ mutationFn: filesApi.deleteFolder, onSuccess: invalidate }),
    restoreFolder: useMutation({ mutationFn: filesApi.restoreFolder, onSuccess: invalidate }),
    upload: useMutation({
      mutationFn: ({
        folderId,
        file,
      }: {
        folderId: string;
        file: { name: string; size: number };
      }) => filesApi.upload(folderId, file),
      onSuccess: invalidate,
    }),
    updateFile: useMutation({
      mutationFn: ({
        id,
        ...patch
      }: {
        id: string;
        name?: string;
        folderId?: string;
        starred?: boolean;
      }) => filesApi.update(id, patch),
      onMutate: ({ id, starred }) => {
        if (starred === undefined) return;
        // Star toggles feel instant: patch cached lists right away.
        for (const [key, data] of qc.getQueriesData<FileItem[]>({ queryKey: ['files', 'list'] })) {
          if (Array.isArray(data))
            qc.setQueryData(
              key,
              data.map((f) => (f.id === id ? { ...f, starred } : f)),
            );
        }
      },
      onSuccess: invalidate,
    }),
    deleteFile: useMutation({ mutationFn: filesApi.remove, onSuccess: invalidate }),
    restoreFile: useMutation({ mutationFn: filesApi.restore, onSuccess: invalidate }),
  };
}
