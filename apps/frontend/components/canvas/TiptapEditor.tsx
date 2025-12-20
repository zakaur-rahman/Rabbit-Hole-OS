'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import Image from '@tiptap/extension-image';
import {
    Bold, Italic, List, ListOrdered, Quote,
    Heading1, Heading2, Code, Undo, Redo,
    Link as LinkIcon, Underline as UnderlineIcon,
    Strikethrough, CheckSquare, Highlighter,
    Superscript as SupIcon, Subscript as SubIcon,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Image as ImageIcon, Upload
} from 'lucide-react';
import { useEffect, useCallback, useState, useRef } from 'react';

const Separator = () => <div className="w-px h-4 bg-white/10 mx-0.5" />;

interface TiptapEditorProps {
    content: string;
    onChange: (content: string) => void;
    onBlur?: () => void;
    autoFocus?: boolean;
}

const TiptapEditor = ({ content, onChange, onBlur, autoFocus = false }: TiptapEditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2],
                },
                codeBlock: {
                    HTMLAttributes: {
                        class: 'bg-neutral-900 rounded-md p-4 font-mono text-sm my-4 border border-white/10',
                    }
                }
            }),
            Placeholder.configure({
                placeholder: 'Start writing...',
                emptyEditorClass: 'is-editor-empty',
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-400 hover:text-blue-300 underline cursor-pointer',
                },
            }),
            Underline,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Highlight.configure({ multicolor: true }),
            Superscript,
            Subscript,
            Image.configure({
                allowBase64: true,
                HTMLAttributes: {
                    class: 'rounded-lg max-w-full max-h-[500px] object-contain my-4 shadow-lg border border-white/10',
                },
            }),
        ],
        content: content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        onBlur: ({ event }) => {
            if (containerRef.current?.contains(event.relatedTarget as Node)) {
                return;
            }
            onBlur?.();
        },
        autofocus: autoFocus,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'prose prose-sm prose-invert max-w-none focus:outline-none min-h-[100px]',
            },
        },
    });

    const [inputMode, setInputMode] = useState<'link' | 'image' | null>(null);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Update content if it changes externally
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    // Focus input when opened
    useEffect(() => {
        if (inputMode && inputRef.current) {
            inputRef.current.focus();
        }
    }, [inputMode]);

    const addImage = useCallback(() => {
        setInputMode('image');
        setInputValue('');
    }, []);

    const setLink = useCallback(() => {
        if (!editor) return;
        const previousUrl = editor.getAttributes('link').href;
        setInputValue(previousUrl || '');
        setInputMode('link');
    }, [editor]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            if (result) {
                editor.chain().focus().setImage({ src: result }).run();
                setInputMode(null);
                setInputValue('');
            }
        };
        reader.readAsDataURL(file);
    }, [editor]);

    const triggerFileUpload = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleInputConfirm = useCallback(() => {
        if (!editor) {
            setInputMode(null);
            return;
        }

        if (inputMode === 'image') {
            if (inputValue) {
                editor.chain().focus().setImage({ src: inputValue }).run();
            }
        } else if (inputMode === 'link') {
            if (inputValue === '') {
                editor.chain().focus().extendMarkRange('link').unsetLink().run();
            } else {
                editor.chain().focus().extendMarkRange('link').setLink({ href: inputValue }).run();
            }
        }
        setInputMode(null);
        setInputValue('');
    }, [editor, inputMode, inputValue]);

    const handleInputCancel = useCallback(() => {
        setInputMode(null);
        setInputValue('');
        editor?.chain().focus().run();
    }, [editor]);

    if (!editor) {
        return null;
    }

    return (
        <div ref={containerRef} className="flex flex-col h-full tiptap-container">
            <style jsx global>{`
                .tiptap-container .ProseMirror {
                    padding: 16px;
                    height: 100%;
                }
                .tiptap-container .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #525252;
                    pointer-events: none;
                    height: 0;
                }
                .tiptap-container .ProseMirror ul[data-type="taskList"] {
                    list-style: none;
                    padding: 0;
                }
                .tiptap-container .ProseMirror ul[data-type="taskList"] li {
                    display: flex;
                    align-items: flex-start;
                    margin-bottom: 0.25rem;
                }
                .tiptap-container .ProseMirror ul[data-type="taskList"] label {
                    flex: 0 0 auto;
                    user-select: none;
                    margin-right: 0.5rem;
                    margin-top: 0.2rem;
                }
                .tiptap-container .ProseMirror ul[data-type="taskList"] input[type="checkbox"] {
                    cursor: pointer;
                    accent-color: #3b82f6;
                }
                .tiptap-container .ProseMirror ul {
                    list-style-type: disc;
                    padding-left: 1.5rem;
                    margin: 0.5rem 0;
                }
                .tiptap-container .ProseMirror ol {
                    list-style-type: decimal;
                    padding-left: 1.5rem;
                    margin: 0.5rem 0;
                }
                .tiptap-container .ProseMirror pre {
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    padding: 12px;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                    margin: 0.8rem 0;
                }
                .tiptap-container .ProseMirror blockquote {
                    border-left: 3px solid #3b82f6;
                    padding-left: 16px;
                    margin: 1rem 0;
                    font-style: italic;
                    color: #d4d4d4;
                }
                .tiptap-container .ProseMirror h1 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-top: 1rem;
                    margin-bottom: 0.5rem;
                }
                .tiptap-container .ProseMirror h2 {
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin-top: 0.8rem;
                    margin-bottom: 0.4rem;
                }
                .tiptap-container .ProseMirror p {
                    margin-bottom: 0.5rem;
                }
                .tiptap-container mark {
                    background-color: #fde047;
                    color: black;
                    padding: 0 2px;
                    border-radius: 2px;
                }
            `}</style>

            <div className="flex flex-wrap items-center gap-0.5 p-1.5 bg-neutral-900/60 backdrop-blur-md border-b border-white/5 sticky top-0 z-10 overflow-x-auto no-scrollbar min-h-[40px]">
                {inputMode ? (
                    <div className="flex items-center gap-2 px-2 w-full animate-in fade-in slide-in-from-top-1 duration-200">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 min-w-fit">
                            {inputMode === 'link' ? 'Set Link' : 'Add Image'}
                        </span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInputConfirm();
                                if (e.key === 'Escape') handleInputCancel();
                            }}
                            placeholder={inputMode === 'link' ? "https://..." : "Paste image URL or click Upload"}
                            className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500/50"
                        />
                        {inputMode === 'image' && (
                            <>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <button
                                    onClick={triggerFileUpload}
                                    title="Upload local image"
                                    className="p-1 px-2 border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded transition-colors text-[10px] font-bold flex items-center gap-1"
                                >
                                    <Upload size={12} />
                                    <span>Upload</span>
                                </button>
                            </>
                        )}
                        <button
                            onClick={handleInputConfirm}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-[10px] font-bold transition-colors"
                        >
                            {inputMode === 'link' ? 'Apply' : 'Insert'}
                        </button>
                        <button
                            onClick={handleInputCancel}
                            className="px-3 py-1 hover:bg-white/5 text-neutral-400 rounded text-[10px] font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <>
                        {/* History */}
                        <ToolbarButton
                            onClick={() => editor.chain().focus().undo().run()}
                            disabled={!editor.can().undo()}
                            icon={Undo}
                            title="Undo"
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().redo().run()}
                            disabled={!editor.can().redo()}
                            icon={Redo}
                            title="Redo"
                        />

                        <Separator />

                        {/* Structure */}
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            active={editor.isActive('heading', { level: 1 })}
                            icon={Heading1}
                            title="Heading 1"
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                            active={editor.isActive('heading', { level: 2 })}
                            icon={Heading2}
                            title="Heading 2"
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            active={editor.isActive('bulletList')}
                            icon={List}
                            title="Bullet List"
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            active={editor.isActive('orderedList')}
                            icon={ListOrdered}
                            title="Ordered List"
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleTaskList().run()}
                            active={editor.isActive('taskList')}
                            icon={CheckSquare}
                            title="Task List"
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            active={editor.isActive('blockquote')}
                            icon={Quote}
                            title="Quote"
                        />

                        <Separator />

                        {/* Basic Marks */}
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            active={editor.isActive('bold')}
                            icon={Bold}
                            title="Bold"
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            active={editor.isActive('italic')}
                            icon={Italic}
                            title="Italic"
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            active={editor.isActive('strike')}
                            icon={Strikethrough}
                            title="Strikethrough"
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleCode().run()}
                            active={editor.isActive('code')}
                            icon={Code}
                            title="Inline Code"
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                            active={editor.isActive('underline')}
                            icon={UnderlineIcon}
                            title="Underline"
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleHighlight().run()}
                            active={editor.isActive('highlight')}
                            icon={Highlighter}
                            title="Highlight"
                        />
                        <ToolbarButton
                            onClick={setLink}
                            active={editor.isActive('link')}
                            icon={LinkIcon}
                            title="Link"
                        />

                        <Separator />

                        {/* Script */}
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleSuperscript().run()}
                            active={editor.isActive('superscript')}
                            icon={SupIcon}
                            title="Superscript"
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleSubscript().run()}
                            active={editor.isActive('subscript')}
                            icon={SubIcon}
                            title="Subscript"
                        />

                        <Separator />

                        {/* Alignment */}
                        <ToolbarButton
                            onClick={() => editor.chain().focus().setTextAlign('left').run()}
                            active={editor.isActive({ textAlign: 'left' })}
                            icon={AlignLeft}
                            title="Align Left"
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().setTextAlign('center').run()}
                            active={editor.isActive({ textAlign: 'center' })}
                            icon={AlignCenter}
                            title="Align Center"
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().setTextAlign('right').run()}
                            active={editor.isActive({ textAlign: 'right' })}
                            icon={AlignRight}
                            title="Align Right"
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                            active={editor.isActive({ textAlign: 'justify' })}
                            icon={AlignJustify}
                            title="Align Justify"
                        />

                        <Separator />

                        {/* Media */}
                        <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={addImage}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-neutral-500 hover:bg-white/5 hover:text-neutral-300 transition-all text-[11px] font-medium"
                        >
                            <ImageIcon size={14} />
                            <span>Add</span>
                        </button>
                    </>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};

const ToolbarButton = ({ onClick, active = false, disabled = false, icon: Icon, title }: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    icon: any;
    title: string;
}) => (
    <button
        type="button"
        onMouseDown={(e) => {
            e.preventDefault();
        }}
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`
            p-1.5 rounded-md transition-all
            ${active
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-neutral-500 hover:bg-white/5 hover:text-neutral-300'
            }
            ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
        `}
    >
        <Icon size={14} />
    </button>
);

export default TiptapEditor;
