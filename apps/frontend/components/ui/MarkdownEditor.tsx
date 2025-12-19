'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const MDEditor = dynamic(
    () => import('@uiw/react-md-editor'),
    { ssr: false }
);

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
    height?: number;
    preview?: 'live' | 'edit' | 'preview';
}

export default function MarkdownEditor({
    value,
    onChange,
    height = 400,
    preview = 'live'
}: MarkdownEditorProps) {
    return (
        <div className="w-full" data-color-mode="dark">
            <MDEditor
                value={value}
                onChange={onChange}
                height={height}
                preview={preview}
                visibleDragbar={false}
                className="!bg-neutral-900 !border !border-neutral-800 rounded-xl overflow-hidden"
                previewOptions={{
                    className: '!bg-neutral-900 !text-neutral-200 prose prose-invert max-w-none p-4'
                }}
                textareaProps={{
                    placeholder: 'Start writing... Use [[links]] to connect nodes.',
                    className: '!text-neutral-200 !bg-neutral-900'
                }}
            />
        </div>
    );
}
