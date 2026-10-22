import { ChevronRight, Folder as FolderIcon } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Button, Dialog, Field, Input, useToast } from '@/components/ui';
import type { Folder } from '@/domain/types';
import { useFileMutations, useFolderTree } from './api';
import styles from './FolderDialogs.module.css';

export function NewFolderDialog({
  open,
  parentId,
  onClose,
}: {
  open: boolean;
  parentId: string;
  onClose: () => void;
}) {
  const { createFolder } = useFileMutations();
  const toast = useToast();
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();
  const close = () => {
    setName('');
    setError(undefined);
    onClose();
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Give the folder a name');
    createFolder.mutate(
      { parentId, name },
      {
        onSuccess: (f) => {
          close();
          toast({ title: `Created “${f.name}”`, tone: 'success' });
        },
        onError: (err) => setError(err.message),
      },
    );
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && close()}
      title="New folder"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="new-folder-form"
            loading={createFolder.isPending}
          >
            Create
          </Button>
        </>
      }
    >
      <form id="new-folder-form" onSubmit={submit} noValidate>
        <Field label="Name" error={error}>
          {(p) => (
            <Input
              {...p}
              autoFocus
              value={name}
              onChange={(e) => (setName(e.target.value), setError(undefined))}
              placeholder="Untitled folder"
            />
          )}
        </Field>
      </form>
    </Dialog>
  );
}

/** Rename a file or folder. */
export function RenameDialog({
  item,
  onClose,
}: {
  item: { type: 'file' | 'folder'; id: string; name: string } | null;
  onClose: () => void;
}) {
  const { updateFile, updateFolder } = useFileMutations();
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();
  const [lastId, setLastId] = useState<string | null>(null);
  if (item && item.id !== lastId) {
    setLastId(item.id);
    setName(item.name);
    setError(undefined);
  }
  const mutation = item?.type === 'file' ? updateFile : updateFolder;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (!name.trim()) return setError('Name can’t be empty');
    const opts = { onSuccess: onClose, onError: (err: Error) => setError(err.message) };
    if (item.type === 'file') updateFile.mutate({ id: item.id, name }, opts);
    else updateFolder.mutate({ id: item.id, name }, opts);
  };
  return (
    <Dialog
      open={!!item}
      onOpenChange={(o) => !o && onClose()}
      title={`Rename ${item?.type ?? ''}`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="rename-form" loading={mutation.isPending}>
            Rename
          </Button>
        </>
      }
    >
      <form id="rename-form" onSubmit={submit} noValidate>
        <Field label="Name" error={error}>
          {(p) => (
            <Input
              {...p}
              autoFocus
              value={name}
              onChange={(e) => (setName(e.target.value), setError(undefined))}
              onFocus={(e) => e.target.select()}
            />
          )}
        </Field>
      </form>
    </Dialog>
  );
}

interface TreeNode extends Folder {
  children: TreeNode[];
}

function buildTree(folders: Folder[]): TreeNode[] {
  const nodes = new Map(folders.map((f) => [f.id, { ...f, children: [] as TreeNode[] }]));
  const roots: TreeNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (list: TreeNode[]) => {
    list.sort((a, b) => a.name.localeCompare(b.name));
    list.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

/** Move a file or folder into a folder the user can edit. */
export function MoveDialog({
  item,
  onClose,
}: {
  item: { type: 'file' | 'folder'; id: string; name: string; parentId: string } | null;
  onClose: () => void;
}) {
  const { data } = useFolderTree();
  const { updateFile, updateFolder } = useFileMutations();
  const toast = useToast();
  const [target, setTarget] = useState<string | null>(null);
  const tree = useMemo(() => buildTree(data ?? []), [data]);
  const mutation = item?.type === 'file' ? updateFile : updateFolder;

  const submit = () => {
    if (!item || !target) return;
    const opts = {
      onSuccess: () => {
        toast({ title: `Moved “${item.name}”`, tone: 'success' });
        setTarget(null);
        onClose();
      },
      onError: (err: Error) =>
        toast({ title: "Couldn't move it", description: err.message, tone: 'danger' }),
    };
    if (item.type === 'file') updateFile.mutate({ id: item.id, folderId: target }, opts);
    else updateFolder.mutate({ id: item.id, parentId: target }, opts);
  };

  const renderNode = (node: TreeNode, depth: number) => {
    const isSelf = item?.type === 'folder' && node.id === item.id;
    const canDrop =
      (node.access === 'edit' || node.access === 'owner') && !isSelf && node.id !== item?.parentId;
    return (
      <li key={node.id}>
        <button
          type="button"
          className={styles.node}
          data-depth={Math.min(depth, 4)}
          data-selected={target === node.id}
          disabled={!canDrop}
          onClick={() => setTarget(node.id)}
          title={
            !canDrop
              ? node.id === item?.parentId
                ? 'Already here'
                : "You can't add to this folder"
              : undefined
          }
        >
          {depth > 0 && <ChevronRight className={styles.branch} aria-hidden />}
          <FolderIcon aria-hidden />
          {node.name}
        </button>
        {!isSelf && node.children.length > 0 && (
          <ul className={styles.tree}>{node.children.map((c) => renderNode(c, depth + 1))}</ul>
        )}
      </li>
    );
  };

  return (
    <Dialog
      open={!!item}
      onOpenChange={(o) => !o && (setTarget(null), onClose())}
      title={`Move “${item?.name ?? ''}”`}
      description="Choose a folder you can edit."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!target}
            loading={mutation.isPending}
            onClick={submit}
          >
            Move here
          </Button>
        </>
      }
    >
      <ul className={styles.tree}>{tree.map((n) => renderNode(n, 0))}</ul>
    </Dialog>
  );
}
