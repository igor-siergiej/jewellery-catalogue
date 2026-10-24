import './styles.css';

import { useAuth } from '@imapps/web-utils';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    Bold,
    Heading1,
    Heading2,
    Heading3,
    ImageIcon,
    Italic,
    List,
    ListOrdered,
    Loader2,
    Redo,
    Strikethrough,
    Undo,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { makeUploadImageRequest } from '@/api/endpoints/uploadImage';
import { Button } from '@/components/ui/button';
import { track } from '@/utils/analytics';
import { errorContext, logger } from '@/utils/logger';
import { ResizableImage } from './ResizableImage';

export interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder = 'Start typing...' }) => {
    const [, forceUpdate] = useState({});
    const { accessToken, login, logout } = useAuth();
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
                codeBlock: false,
                horizontalRule: false,
                blockquote: false,
            }),
            Placeholder.configure({
                placeholder,
            }),
            ResizableImage.configure({
                inline: false,
                allowBase64: false,
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();

            onChange(html);
        },
        onSelectionUpdate: () => {
            forceUpdate({});
        },
        onTransaction: () => {
            forceUpdate({});
        },
        editorProps: {
            attributes: {
                class: 'tiptap-editor focus:outline-none min-h-[150px] p-3',
            },
        },
    });

    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor) return;
        e.target.value = '';
        setIsUploading(true);
        track('image_upload_started', { count: 1 });
        try {
            const { imageId } = await makeUploadImageRequest(file, () => accessToken, login, logout);
            editor
                .chain()
                .focus()
                .setImage({ src: `/api/image/${imageId}` })
                .run();
            track('image_upload_completed', { count: 1 });
        } catch (err) {
            track('image_upload_failed', { count: 1 });
            logger.error('Rich text image upload failed', errorContext(err));
        } finally {
            setIsUploading(false);
        }
    };

    if (!editor) {
        return null;
    }

    return (
        <div className="border rounded-md overflow-hidden">
            <div className="bg-muted/50 border-b p-2 flex gap-1 flex-wrap">
                <Button
                    type="button"
                    variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                >
                    <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    aria-label="Heading 2"
                >
                    <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    aria-label="Heading 3"
                >
                    <Heading3 className="h-4 w-4" />
                </Button>
                <div className="w-px bg-border mx-1" />
                <Button
                    type="button"
                    variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    aria-label="Bold"
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    aria-label="Italic"
                >
                    <Italic className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    aria-label="Strikethrough"
                >
                    <Strikethrough className="h-4 w-4" />
                </Button>
                <div className="w-px bg-border mx-1" />
                <Button
                    type="button"
                    variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    aria-label="Bullet list"
                >
                    <List className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    aria-label="Numbered list"
                >
                    <ListOrdered className="h-4 w-4" />
                </Button>
                <div className="w-px bg-border mx-1" />
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    title="Insert image"
                >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFileChange}
                />
                <div className="w-px bg-border mx-1" />
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().undo().run()}
                    aria-label="Undo"
                    disabled={!editor.can().undo()}
                >
                    <Undo className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().redo().run()}
                    aria-label="Redo"
                    disabled={!editor.can().redo()}
                >
                    <Redo className="h-4 w-4" />
                </Button>
            </div>
            <EditorContent editor={editor} className="bg-background" />
        </div>
    );
};

export default RichTextEditor;
