import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Pin, PinOff, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserNotes, UserNote } from '@/hooks/useUserNotes';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NotesDrawerProps {
  open: boolean;
  onClose: () => void;
}

// Simple markdown-ish renderer: bold, links, lists
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold
    let html = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Links
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-primary underline hover:opacity-80">$1</a>');
    // Plain URLs
    html = html.replace(/(?<!\])\((https?:\/\/[^\)]+)\)/g, '(<a href="$1" target="_blank" rel="noopener" class="text-primary underline hover:opacity-80">$1</a>)');
    html = html.replace(/(^|[^"(])(https?:\/\/\S+)/g, '$1<a href="$2" target="_blank" rel="noopener" class="text-primary underline hover:opacity-80">$2</a>');
    // Unordered list
    if (/^[-*]\s/.test(line)) {
      html = '<span class="inline-block w-2 h-2 rounded-full bg-muted-foreground/40 mr-2 align-middle"></span>' + html.replace(/^[-*]\s/, '');
    }
    return <p key={i} className="min-h-[1.2em] text-sm text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: html || '&nbsp;' }} />;
  });
}

export const NotesDrawer = ({ open, onClose }: NotesDrawerProps) => {
  const { notes, isLoading, createNote, updateNote, deleteNote } = useUserNotes();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selected = notes.find(n => n.id === selectedId) || notes[0] || null;

  // Auto-select first note
  useEffect(() => {
    if (!selectedId && notes.length > 0) setSelectedId(notes[0].id);
  }, [notes, selectedId]);

  // Sync edit state when selecting a note
  useEffect(() => {
    if (selected) {
      setEditTitle(selected.title);
      setEditContent(selected.content);
    }
  }, [selected?.id]);

  // Autosave on content change (debounced)
  const autoSave = useCallback((content: string, title: string) => {
    if (!selected) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateNote.mutate({ id: selected.id, content, title });
    }, 800);
  }, [selected?.id, updateNote]);

  const handleContentChange = (val: string) => {
    setEditContent(val);
    autoSave(val, editTitle);
  };

  const handleTitleChange = (val: string) => {
    setEditTitle(val);
    autoSave(editContent, val);
  };

  const handleCreate = async () => {
    try {
      const result = await createNote.mutateAsync({ title: 'Nueva nota' });
      setSelectedId(result.id);
      setEditing(true);
    } catch {
      toast.error('Error al crear nota');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm('¿Eliminar esta nota?')) return;
    try {
      await deleteNote.mutateAsync(selected.id);
      setSelectedId(null);
      toast.success('Nota eliminada');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const handlePin = () => {
    if (!selected) return;
    updateNote.mutate({ id: selected.id, pinned: !selected.pinned });
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998] bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-[9999] w-full max-w-[420px] bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">📌</span>
            <h2 className="text-sm font-semibold text-foreground">Pizarra</h2>
            <span className="text-[10px] text-muted-foreground">({notes.length})</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Notes list (left) */}
          <div className="w-[130px] border-r border-border flex flex-col shrink-0">
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {notes.map(note => (
                  <button
                    key={note.id}
                    onClick={() => { setSelectedId(note.id); setEditing(false); }}
                    className={cn(
                      'w-full text-left px-2 py-2 rounded-md text-xs transition-colors',
                      note.id === selected?.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-1">
                      {note.pinned && <Pin className="w-3 h-3 text-primary shrink-0" />}
                      <span className="truncate">{note.title}</span>
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">
                      {new Date(note.updated_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
            <div className="p-2 border-t border-border">
              <Button variant="ghost" size="sm" className="w-full text-xs gap-1" onClick={handleCreate}>
                <Plus className="w-3 h-3" /> Nueva
              </Button>
            </div>
          </div>

          {/* Note content (right) */}
          <div className="flex-1 flex flex-col min-w-0">
            {selected ? (
              <>
                {/* Note toolbar */}
                <div className="flex items-center gap-1 px-3 py-2 border-b border-border shrink-0">
                  {editing ? (
                    <Input
                      value={editTitle}
                      onChange={e => handleTitleChange(e.target.value)}
                      className="h-7 text-sm font-medium flex-1"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => setEditing(true)}
                      className="text-sm font-medium text-foreground truncate flex-1 text-left hover:opacity-80"
                    >
                      {selected.title}
                    </button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handlePin} title={selected.pinned ? 'Desfijar' : 'Fijar'}>
                    {selected.pinned ? <PinOff className="w-3.5 h-3.5 text-primary" /> : <Pin className="w-3.5 h-3.5 text-muted-foreground" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive/70 hover:text-destructive" onClick={handleDelete} title="Eliminar">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Content area */}
                <div className="flex-1 min-h-0">
                  {editing ? (
                    <textarea
                      ref={textareaRef}
                      value={editContent}
                      onChange={e => handleContentChange(e.target.value)}
                      className="w-full h-full resize-none bg-transparent text-sm text-foreground p-3 focus:outline-none placeholder:text-muted-foreground"
                      placeholder="Escribe aquí... Usa **negrita**, [enlace](url), - listas"
                    />
                  ) : (
                    <button
                      onClick={() => setEditing(true)}
                      className="w-full h-full text-left cursor-text"
                    >
                      <ScrollArea className="h-full">
                        <div className="p-3 space-y-0.5">
                          {selected.content ? renderMarkdown(selected.content) : (
                            <p className="text-sm text-muted-foreground italic">Click para editar...</p>
                          )}
                        </div>
                      </ScrollArea>
                    </button>
                  )}
                </div>

                {/* Footer hint */}
                <div className="px-3 py-1.5 border-t border-border text-[10px] text-muted-foreground shrink-0">
                  {editing ? 'Guardado automático · **negrita** · [texto](url) · - lista' : 'Click en el texto para editar'}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Sin notas</p>
                  <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={handleCreate}>
                    Crear primera nota
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
