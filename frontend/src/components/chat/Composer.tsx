import React, { useState, useRef, useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { uploadService } from '@/services/upload.service';
import { putMedia, getMedia, deleteMedia } from '@/lib/idb';
import { Send, Image as ImageIcon, X, Loader2, UploadCloud, Film, Paperclip, Video } from 'lucide-react';

interface ComposerProps {
  conversationId: string;
  onSendMessage: (payload: {
    content: string;
    mediaUrl?: string;
    mediaType?: string;
  }) => void;
  disabled?: boolean;
}

export function Composer({
  conversationId,
  onSendMessage,
  disabled = false,
}: ComposerProps) {
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const currentPreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  useEffect(() => {
    currentPreviewUrlRef.current = previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    let isCancelled = false;

    const raw = typeof window !== 'undefined'
      ? localStorage.getItem(`chatapp_draft_${conversationId}`)
      : null;
    let draftText = '';
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        draftText = typeof parsed === 'object' && parsed !== null ? (parsed.text || '') : raw;
      } catch {
        draftText = raw;
      }
    }
    setText(draftText);

    getMedia(conversationId).then((mediaRecord) => {
      if (isCancelled) return;
      if (mediaRecord?.file) {
        try {
          const file = mediaRecord.file instanceof File
            ? mediaRecord.file
            : new File([mediaRecord.file], mediaRecord.name || 'attachment', { type: mediaRecord.type });

          const objectUrl = URL.createObjectURL(file);
          if (currentPreviewUrlRef.current) {
            URL.revokeObjectURL(currentPreviewUrlRef.current);
          }
          setSelectedFile(file);
          setPreviewUrl(objectUrl);
        } catch (err) {
          console.error('Failed to restore draft media:', err);
        }
      } else {
        if (currentPreviewUrlRef.current) {
          URL.revokeObjectURL(currentPreviewUrlRef.current);
        }
        setSelectedFile(null);
        setPreviewUrl(null);
      }
    });

    setUploadProgress(null);
    setUploadError(null);
    setIsDraggingFile(false);

    return () => {
      isCancelled = true;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current) {
        const socket = getSocket();
        socket.emit('typing_stop', { conversationId });
        isTypingRef.current = false;
      }
    };
  }, [conversationId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);

    if (val.trim()) {
      localStorage.setItem(`chatapp_draft_${conversationId}`, val);
    } else {
      localStorage.removeItem(`chatapp_draft_${conversationId}`);
    }

    const socket = getSocket();
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing_start', { conversationId });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing_stop', { conversationId });
    }, 2000);
  };

  const processFile = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setUploadError('Please select an image (PNG, JPG, WebP, GIF) or video (MP4, WebM, MOV)');
      return;
    }

    if (isImage && file.size > 10 * 1024 * 1024) {
      setUploadError('Image size must be less than 10MB');
      return;
    }

    if (isVideo && file.size > 50 * 1024 * 1024) {
      setUploadError('Video size must be less than 50MB');
      return;
    }

    if (currentPreviewUrlRef.current) {
      URL.revokeObjectURL(currentPreviewUrlRef.current);
    }

    setSelectedFile(file);
    setUploadError(null);
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    await putMedia(conversationId, {
      file,
      name: file.name,
      type: file.type,
      size: file.size,
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `chatapp_draft_media_${conversationId}`,
        JSON.stringify({ name: file.name, type: file.type })
      );
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files') && !isDraggingFile) {
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemoveFile = () => {
    if (currentPreviewUrlRef.current) {
      URL.revokeObjectURL(currentPreviewUrlRef.current);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError(null);

    if (typeof window !== 'undefined') {
      localStorage.removeItem(`chatapp_draft_media_${conversationId}`);
      const raw = localStorage.getItem(`chatapp_draft_${conversationId}`);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            if (parsed.text?.trim()) {
              localStorage.setItem(`chatapp_draft_${conversationId}`, parsed.text);
            } else {
              localStorage.removeItem(`chatapp_draft_${conversationId}`);
            }
          }
        } catch {}
      }
    }

    deleteMedia(conversationId).catch(() => {});

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if ((!trimmed && !selectedFile) || disabled || uploading) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current) {
      const socket = getSocket();
      socket.emit('typing_stop', { conversationId });
      isTypingRef.current = false;
    }

    let mediaUrl: string | undefined;
    let mediaType: string | undefined;

    if (selectedFile) {
      try {
        setUploading(true);
        setUploadProgress(0);
        setUploadError(null);
        const uploadResult = await uploadService.uploadFile(
          selectedFile,
          (percent) => setUploadProgress(percent)
        );
        mediaUrl = uploadResult.url;
        mediaType = uploadResult.mediaType || (selectedFile.type.startsWith('video/') ? 'video' : 'image');
      } catch (err: unknown) {
        setUploading(false);
        setUploadProgress(null);
        const msg = err instanceof Error ? err.message : 'Failed to upload media file';
        setUploadError(msg);
        return;
      }
    }

    onSendMessage({
      content: trimmed,
      mediaUrl,
      mediaType,
    });

    setText('');
    localStorage.removeItem(`chatapp_draft_${conversationId}`);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`chatapp_draft_media_${conversationId}`);
    }
    deleteMedia(conversationId).catch(() => {});

    handleRemoveFile();
    setUploading(false);
    setUploadProgress(null);
  };

  const triggerFilePicker = (type: 'image' | 'video' | 'all') => {
    setIsMenuOpen(false);
    if (!fileInputRef.current) return;
    if (type === 'image') {
      fileInputRef.current.accept = 'image/png,image/jpeg,image/webp,image/gif';
    } else if (type === 'video') {
      fileInputRef.current.accept = 'video/mp4,video/webm,video/quicktime,video/ogg';
    } else {
      fileInputRef.current.accept = 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime,video/ogg';
    }
    fileInputRef.current.click();
  };

  const canSend = (text.trim().length > 0 || selectedFile !== null) && !disabled && !uploading;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`shrink-0 border-t border-zinc-200 bg-white transition-colors ${
        isDraggingFile ? 'bg-zinc-50/90 ring-2 ring-zinc-400 ring-inset' : ''
      }`}
    >
      {isDraggingFile && (
        <div className="flex items-center justify-center gap-2 py-3 text-xs font-medium text-zinc-600 animate-pulse">
          <UploadCloud className="h-4 w-4" />
          <span>Drop image or video to attach</span>
        </div>
      )}

      {previewUrl && (
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 bg-zinc-50/80 border-b border-zinc-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              {selectedFile?.type.startsWith('video/') ? (
                <div className="relative h-14 w-20 rounded-md border border-zinc-200 overflow-hidden bg-black shadow-xs">
                  <video src={previewUrl} className="h-full w-full object-cover" muted playsInline />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                    <Film className="h-4 w-4 text-white/90" />
                  </div>
                </div>
              ) : (
                <img
                  src={previewUrl}
                  alt="Attachment preview"
                  className="h-14 w-14 rounded-md border border-zinc-200 object-cover shadow-xs"
                />
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-zinc-800 max-w-[200px] sm:max-w-xs">
                {selectedFile?.name}
              </p>
              <p className="text-[11px] text-zinc-500">
                {selectedFile ? (selectedFile.size / (1024 * 1024) >= 1 ? (selectedFile.size / (1024 * 1024)).toFixed(1) + ' MB' : (selectedFile.size / 1024).toFixed(1) + ' KB') : ''}
              </p>
              {uploading && (
                <div className="mt-1 space-y-1">
                  <p className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>
                      Uploading {selectedFile?.type.startsWith('video/') ? 'video' : 'image'}...{' '}
                      {uploadProgress !== null ? `${uploadProgress}%` : ''}
                    </span>
                  </p>
                  {uploadProgress !== null && (
                    <div className="h-1.5 w-full max-w-xs rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className="h-full bg-zinc-900 transition-all duration-150 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemoveFile}
            disabled={uploading}
            aria-label="Remove attachment"
            title="Discard attachment"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Discard</span>
          </button>
        </div>
      )}

      {uploadError && (
        <div className="px-4 pt-2 text-[11px] text-red-600">
          {uploadError}
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="relative flex items-center gap-2 p-2.5 sm:p-3"
      >
        <input
          ref={fileInputRef}
          type="file"
          id="composer-file-input"
          accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime,video/ogg"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload image or video"
        />

        {isMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-20"
              onClick={() => setIsMenuOpen(false)}
            />
            <div
              className="absolute bottom-full left-3 mb-2 z-30 w-56 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150"
              role="menu"
              aria-label="Attachment options"
            >
              <div className="px-2.5 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Attach Media
              </div>

              <button
                type="button"
                onClick={() => triggerFilePicker('image')}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-zinc-50 active:bg-zinc-100 transition-colors group"
                role="menuitem"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 group-hover:scale-105 transition-all">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-800">Photos & Images</p>
                  <p className="text-[10px] text-zinc-400">PNG, JPG, WebP, GIF</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => triggerFilePicker('video')}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-zinc-50 active:bg-zinc-100 transition-colors group"
                role="menuitem"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-100 group-hover:scale-105 transition-all">
                  <Video className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-800">Videos</p>
                  <p className="text-[10px] text-zinc-400">MP4, WebM, MOV</p>
                </div>
              </button>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          disabled={disabled || uploading}
          title="Attach Photos or Videos"
          aria-label="Attach file"
          aria-expanded={isMenuOpen}
          aria-haspopup="true"
          className={`relative z-10 flex h-9 w-9 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-md border transition-all focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-40 ${
            isMenuOpen
              ? 'border-zinc-400 bg-zinc-200 text-zinc-900 shadow-inner'
              : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200'
          }`}
        >
          <Paperclip className={`h-4 w-4 transition-transform duration-150 ${isMenuOpen ? 'rotate-45 text-zinc-900' : ''}`} />
        </button>

        <label htmlFor="composer-text-input" className="sr-only">
          Message input
        </label>
        <input
          id="composer-text-input"
          type="text"
          value={text}
          onChange={handleInputChange}
          placeholder={selectedFile ? 'Add a caption...' : 'Type a message...'}
          disabled={disabled || uploading}
          aria-label="Type a message"
          className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm sm:text-xs text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none transition-colors"
        />

        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className="flex h-9 w-9 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-white transition-colors hover:bg-zinc-800 active:bg-zinc-700 disabled:opacity-40"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </button>
      </form>
    </div>
  );
}
