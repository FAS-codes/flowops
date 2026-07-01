import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, Paperclip, Trash2, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Spinner } from '../../components/ui/Spinner';
import { useAuth } from '../../context/AuthContext';
import { api, apiError } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { can } from '../../lib/permissions';

interface Attachment {
  _id: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy?: { name: string };
  createdAt: string;
}

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsPanel({
  entityType,
  entityId,
}: {
  entityType: 'Project' | 'Lead' | 'Task';
  entityId: string;
}) {
  const qc = useQueryClient();
  const { role } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const canManage = can(role, 'project:create'); // contributor-level and above

  const queryKey = ['files', entityType, entityId];
  const { data: files } = useQuery({
    queryKey,
    queryFn: async () =>
      (
        await api.get<Attachment[]>('/files', { params: { entityType, entityId } })
      ).data,
  });

  async function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('entityType', entityType);
    form.append('entityId', entityId);
    setUploading(true);
    try {
      await api.post('/files', form);
      qc.invalidateQueries({ queryKey });
      toast.success('File uploaded');
    } catch (err) {
      toast.error(apiError(err, 'Upload failed'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/files/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('File removed');
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-ink">
          <Paperclip className="h-4 w-4 text-ink-muted" /> Attachments
          {files && files.length > 0 && (
            <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-ink-muted">
              {files.length}
            </span>
          )}
        </h3>
        {canManage && (
          <>
            <input ref={inputRef} type="file" className="hidden" onChange={onSelect} />
            <button
              className="btn-secondary px-3 py-1.5 text-sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Spinner /> : <UploadCloud className="h-4 w-4" />}
              Upload
            </button>
          </>
        )}
      </div>

      {!files || files.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">No files attached yet.</p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f._id}
              className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{f.originalName}</p>
                <p className="text-xs text-ink-subtle">
                  {humanSize(f.size)} · {f.uploadedBy?.name ?? 'Someone'} ·{' '}
                  {formatDate(f.createdAt)}
                </p>
              </div>
              <a
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost p-1.5"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </a>
              {canManage && (
                <button
                  className="btn-ghost p-1.5 text-ink-subtle hover:text-red-600"
                  onClick={() => remove.mutate(f._id)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
