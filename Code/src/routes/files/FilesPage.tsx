import {
  ArrowDownUp,
  FolderInput,
  FolderPlus,
  LayoutGrid,
  List,
  Lock,
  MoreHorizontal,
  Pencil,
  Share2,
  Star,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { usePanels } from '@/app/panels';
import { useSession } from '@/app/session';
import { useCurrentFolder, useShellActions } from '@/app/shellActions';
import {
  Avatar,
  Breadcrumbs,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  Menu,
  MenuItem,
  MenuSeparator,
  PageHeader,
  SegmentedControl,
  Skeleton,
  Tooltip,
  useToast,
} from '@/components/ui';
import type { FileItem, FileView, Folder } from '@/domain/types';
import { useFileMutations, useFiles, useFolder } from '@/features/files/api';
import { FileIcon } from '@/features/files/FileIcon';
import { MoveDialog, RenameDialog } from '@/features/files/FolderDialogs';
import { useUserMap } from '@/features/org/api';
import { ShareDialog, type ShareTarget } from '@/features/sharing/ShareDialog';
import { formatBytes, timeAgo } from '@/lib/dates';
import styles from './FilesPage.module.css';

type Layout = 'list' | 'grid';
type Sort = 'name' | 'updated';
type Item = { type: 'folder'; item: Folder } | { type: 'file'; item: FileItem };

const ROOT = 'fd_root';
const VIEW_TITLE: Record<Exclude<FileView, 'all'>, string> = {
  recent: 'Recent',
  shared: 'Shared with me',
  starred: 'Starred',
};
const VIEW_EMPTY: Record<Exclude<FileView, 'all'>, string> = {
  recent: 'Files you open or edit show up here.',
  shared: 'When someone shares a file or folder with you or your team, it shows up here.',
  starred: 'Star files to find them quickly. Use the star in a file’s details.',
};

function readLayout(): Layout {
  try {
    return localStorage.getItem('birdy.files.layout') === 'grid' ? 'grid' : 'list';
  } catch {
    return 'list';
  }
}

export function FilesPage({ view }: { view: 'folder' | Exclude<FileView, 'all'> }) {
  const { folderId = ROOT } = useParams();
  const { user } = useSession();
  const [layout, setLayoutState] = useState<Layout>(readLayout);
  const [sort, setSort] = useState<Sort>('name');
  const setLayout = (l: Layout) => {
    setLayoutState(l);
    try {
      localStorage.setItem('birdy.files.layout', l);
    } catch {
      // ignore
    }
  };

  return (
    <div className={styles.page}>
      <nav className={styles.tabs} aria-label="File views">
        {user.role !== 'guest' && (
          <NavLink to="/files" end className={styles.tab} data-active={view === 'folder'}>
            All files
          </NavLink>
        )}
        <NavLink to="/files/recent" className={styles.tab}>
          Recent
        </NavLink>
        <NavLink to="/files/shared" className={styles.tab}>
          Shared with me
        </NavLink>
        <NavLink to="/files/starred" className={styles.tab}>
          Starred
        </NavLink>
      </nav>
      {view === 'folder' ? (
        <FolderView
          key={folderId}
          folderId={folderId}
          layout={layout}
          setLayout={setLayout}
          sort={sort}
          setSort={setSort}
        />
      ) : (
        <ListView view={view} layout={layout} setLayout={setLayout} sort={sort} setSort={setSort} />
      )}
    </div>
  );
}

interface ViewProps {
  layout: Layout;
  setLayout: (l: Layout) => void;
  sort: Sort;
  setSort: (s: Sort) => void;
}

function ViewControls({ layout, setLayout, sort, setSort }: ViewProps) {
  return (
    <div className={styles.controls}>
      <Button
        size="sm"
        variant="ghost"
        icon={<ArrowDownUp />}
        onClick={() => setSort(sort === 'name' ? 'updated' : 'name')}
      >
        {sort === 'name' ? 'Name' : 'Last modified'}
      </Button>
      <SegmentedControl
        label="Layout"
        value={layout}
        onChange={setLayout}
        options={[
          { value: 'list', label: 'List', icon: <List />, iconOnly: true },
          { value: 'grid', label: 'Grid', icon: <LayoutGrid />, iconOnly: true },
        ]}
      />
    </div>
  );
}

function sortItems(items: Item[], sort: Sort): Item[] {
  return [...items].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return sort === 'name'
      ? a.item.name.localeCompare(b.item.name)
      : b.item.updatedAt.localeCompare(a.item.updatedAt);
  });
}

function FolderView({ folderId, ...viewProps }: { folderId: string } & ViewProps) {
  useCurrentFolder(folderId);
  const { data, error, isPending, refetch } = useFolder(folderId);
  const actions = useShellActions();
  const [share, setShare] = useState<ShareTarget | null>(null);

  if (isPending) return <Skeleton lines={10} size="lg" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const { folder, path, folders, files } = data;
  const canEdit = folder.access === 'edit' || folder.access === 'owner';
  const items = sortItems(
    [
      ...folders.map((f) => ({ type: 'folder' as const, item: f })),
      ...files.map((f) => ({ type: 'file' as const, item: f })),
    ],
    viewProps.sort,
  );
  const isRoot = folder.id === ROOT;

  return (
    <>
      <PageHeader
        eyebrow={
          path.length > 1 ? (
            <Breadcrumbs
              items={path.map((p) => ({
                label: p.name,
                to: p.id === ROOT ? '/files' : `/files/folders/${p.id}`,
              }))}
            />
          ) : undefined
        }
        title={isRoot ? 'Files' : folder.name}
        description={
          isRoot
            ? 'Everything your company keeps in Birdy. Project folders are private to their teams.'
            : undefined
        }
        actions={
          <>
            {!isRoot && (
              <Button
                icon={<Share2 />}
                onClick={() => setShare({ type: 'folder', id: folder.id, name: folder.name })}
              >
                Share
              </Button>
            )}
            <Tooltip content={canEdit ? 'New folder' : 'You can only view this folder'}>
              <span>
                <Button icon={<FolderPlus />} onClick={actions.newFolder} disabled={!canEdit}>
                  New folder
                </Button>
              </span>
            </Tooltip>
            <Tooltip content={canEdit ? 'Upload a file' : 'You can only view this folder'}>
              <span>
                <Button
                  variant="primary"
                  icon={<Upload />}
                  onClick={actions.upload}
                  disabled={!canEdit}
                >
                  Upload
                </Button>
              </span>
            </Tooltip>
          </>
        }
      />
      <div className={styles.toolbar}>
        <p className={styles.count}>
          {folders.length} folder{folders.length === 1 ? '' : 's'} · {files.length} file
          {files.length === 1 ? '' : 's'}
        </p>
        <ViewControls {...viewProps} />
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={<FolderPlus />}
          title="This folder is empty"
          description={
            canEdit
              ? 'Upload a file or create a folder to get started.'
              : 'Nothing has been added here yet.'
          }
          action={
            canEdit && (
              <Button variant="primary" icon={<Upload />} onClick={actions.upload}>
                Upload a file
              </Button>
            )
          }
        />
      ) : (
        <ItemList items={items} layout={viewProps.layout} />
      )}
      <ShareDialog target={share} onClose={() => setShare(null)} />
    </>
  );
}

function ListView({ view, ...viewProps }: { view: Exclude<FileView, 'all'> } & ViewProps) {
  const { data, error, isPending, refetch } = useFiles(view);
  return (
    <>
      <PageHeader title={VIEW_TITLE[view]} />
      <div className={styles.toolbar}>
        <p className={styles.count}>
          {data ? `${data.length} file${data.length === 1 ? '' : 's'}` : ''}
        </p>
        <ViewControls {...viewProps} />
      </div>
      {isPending && <Skeleton lines={10} size="lg" />}
      {error && <ErrorState error={error} onRetry={refetch} />}
      {data?.length === 0 && (
        <EmptyState
          icon={view === 'starred' ? <Star /> : <Users />}
          title={`No ${VIEW_TITLE[view].toLowerCase()} files`}
          description={VIEW_EMPTY[view]}
        />
      )}
      {!!data?.length && (
        <ItemList
          items={
            view === 'recent'
              ? data.map((f) => ({ type: 'file', item: f }))
              : sortItems(
                  data.map((f) => ({ type: 'file', item: f })),
                  viewProps.sort,
                )
          }
          layout={viewProps.layout}
          showLocation
        />
      )}
    </>
  );
}

function ItemList({
  items,
  layout,
  showLocation,
}: {
  items: Item[];
  layout: Layout;
  showLocation?: boolean;
}) {
  const users = useUserMap();
  const navigate = useNavigate();
  const { openFile, fileId } = usePanels();
  const { updateFile, deleteFile, restoreFile, deleteFolder, restoreFolder } = useFileMutations();
  const toast = useToast();
  const [share, setShare] = useState<ShareTarget | null>(null);
  const [rename, setRename] = useState<{
    type: 'file' | 'folder';
    id: string;
    name: string;
  } | null>(null);
  const [move, setMove] = useState<{
    type: 'file' | 'folder';
    id: string;
    name: string;
    parentId: string;
  } | null>(null);

  const open = (i: Item) =>
    i.type === 'folder' ? navigate(`/files/folders/${i.item.id}`) : openFile(i.item.id);
  const remove = (i: Item) => {
    const del = i.type === 'file' ? deleteFile : deleteFolder;
    const undo = () =>
      i.type === 'file' ? restoreFile.mutate(i.item.id) : restoreFolder.mutate(i.item.id);
    del.mutate(i.item.id, {
      onSuccess: () =>
        toast({ title: `Deleted “${i.item.name}”`, action: { label: 'Undo', onClick: undo } }),
      onError: (err) =>
        toast({ title: "Couldn't delete it", description: err.message, tone: 'danger' }),
    });
  };

  const menu = (i: Item) => {
    const canEdit = i.item.access === 'edit' || i.item.access === 'owner';
    const parentId = i.type === 'file' ? i.item.folderId : (i.item.parentId ?? ROOT);
    return (
      <Menu
        align="end"
        trigger={
          <IconButton
            label={`Actions for ${i.item.name}`}
            icon={<MoreHorizontal />}
            size="sm"
            noTooltip
          />
        }
      >
        <MenuItem
          icon={<Share2 />}
          onSelect={() => setShare({ type: i.type, id: i.item.id, name: i.item.name })}
        >
          Share
        </MenuItem>
        {i.type === 'file' && (
          <MenuItem
            icon={<Star />}
            onSelect={() =>
              updateFile.mutate({ id: i.item.id, starred: !(i.item as FileItem).starred })
            }
          >
            {(i.item as FileItem).starred ? 'Remove from starred' : 'Star'}
          </MenuItem>
        )}
        <MenuItem
          icon={<Pencil />}
          disabled={!canEdit}
          onSelect={() => setRename({ type: i.type, id: i.item.id, name: i.item.name })}
        >
          Rename
        </MenuItem>
        <MenuItem
          icon={<FolderInput />}
          disabled={!canEdit}
          onSelect={() => setMove({ type: i.type, id: i.item.id, name: i.item.name, parentId })}
        >
          Move
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<Trash2 />} danger disabled={!canEdit} onSelect={() => remove(i)}>
          Delete
        </MenuItem>
      </Menu>
    );
  };

  const restricted = (i: Item) => i.item.generalAccess === 'restricted';
  const detail = (i: Item) =>
    i.type === 'folder'
      ? `${i.item.itemCount} item${i.item.itemCount === 1 ? '' : 's'}`
      : formatBytes((i.item as FileItem).size);

  return (
    <>
      {layout === 'list' ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col" className={styles.hideSm}>
                Owner
              </th>
              <th scope="col">Modified</th>
              <th scope="col" className={styles.hideSm}>
                Size
              </th>
              <th scope="col">
                <span className={styles.srOnly}>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const owner = users.get(i.item.ownerId);
              return (
                <tr key={i.item.id} data-selected={i.type === 'file' && fileId === i.item.id}>
                  <td>
                    <button type="button" className={styles.nameButton} onClick={() => open(i)}>
                      <FileIcon kind={i.type === 'folder' ? 'folder' : (i.item as FileItem).kind} />
                      <span className={styles.nameText}>
                        <span className={styles.name}>{i.item.name}</span>
                        {showLocation && i.type === 'file' && (
                          <span className={styles.sub}>
                            {i.item.access === 'view' ? 'View only' : 'Can edit'}
                          </span>
                        )}
                      </span>
                      {restricted(i) && i.type === 'folder' && (
                        <Lock className={styles.lock} aria-label="Restricted" />
                      )}
                      {i.type === 'file' && (i.item as FileItem).starred && (
                        <Star className={styles.star} aria-label="Starred" />
                      )}
                    </button>
                  </td>
                  <td className={styles.hideSm}>
                    <span className={styles.owner}>
                      {owner && <Avatar user={owner} size="xs" />}
                      {owner?.name.split(' ')[0]}
                    </span>
                  </td>
                  <td className={styles.muted}>{timeAgo(i.item.updatedAt)}</td>
                  <td className={`${styles.muted} ${styles.hideSm}`}>{detail(i)}</td>
                  <td className={styles.actions}>{menu(i)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <ul className={styles.grid}>
          {items.map((i) => (
            <li
              key={i.item.id}
              className={styles.tile}
              data-selected={i.type === 'file' && fileId === i.item.id}
            >
              <button type="button" className={styles.tileButton} onClick={() => open(i)}>
                <FileIcon
                  kind={i.type === 'folder' ? 'folder' : (i.item as FileItem).kind}
                  size="lg"
                />
                <span className={styles.name}>{i.item.name}</span>
                <span className={styles.sub}>
                  {detail(i)} · {timeAgo(i.item.updatedAt)}
                </span>
              </button>
              <span className={styles.tileMenu}>{menu(i)}</span>
            </li>
          ))}
        </ul>
      )}
      <ShareDialog target={share} onClose={() => setShare(null)} />
      <RenameDialog item={rename} onClose={() => setRename(null)} />
      <MoveDialog item={move} onClose={() => setMove(null)} />
    </>
  );
}
