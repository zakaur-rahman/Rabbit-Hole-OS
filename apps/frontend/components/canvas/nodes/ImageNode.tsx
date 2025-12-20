import React, { memo, useState, useCallback, useRef } from 'react';
import { NodeProps } from 'reactflow';
import { Image as ImageIcon, Upload, Link } from 'lucide-react';
import BaseNode from './BaseNode';
import { useGraphStore } from '@/store/graph.store';

export interface ImageNodeData {
    title?: string;
    url?: string;
}

function ImageNode({ data, selected, id }: NodeProps<ImageNodeData>) {
    const [url, setUrl] = useState(data.url || '');
    const [inputUrl, setInputUrl] = useState('');
    const [isInputVisible, setIsInputVisible] = useState(!data.url);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const updateNode = useGraphStore(state => state.updateNode);

    const handleUrlSubmit = useCallback(() => {
        if (inputUrl) {
            setUrl(inputUrl);
            updateNode(id, { url: inputUrl });
            setIsInputVisible(false);
        }
    }, [inputUrl, id, updateNode]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            if (result) {
                setUrl(result);
                updateNode(id, { url: result });
                setIsInputVisible(false);
            }
        };
        reader.readAsDataURL(file);
    }, [id, updateNode]);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const text = e.clipboardData.getData('text');
        if (text) { // Simple check, could be more robust URL validation
            setUrl(text);
            updateNode(id, { url: text });
            setIsInputVisible(false);
        }
    }, [id, updateNode]);

    return (
        <BaseNode
            id={id}
            selected={selected}
            title="Image"
            subtitle="MEDIA"
            accentColor="purple-500"
            icon={ImageIcon}
            iconColor="text-purple-400"
            minWidth={200}
            minHeight={200}
        >
            <div className="relative flex-1 flex flex-col h-auto min-h-[150px] w-full">
                {url ? (
                    <img
                        src={url}
                        alt="Node content"
                        className="w-full h-auto object-contain rounded-lg pointer-events-none"
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-2 gap-2 text-neutral-400">
                        <div className="flex flex-col gap-2 w-full">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={inputUrl}
                                    onChange={(e) => setInputUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                                    onPaste={handlePaste}
                                    placeholder="Paste image URL..."
                                    className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/50"
                                    onClick={(e) => e.stopPropagation()} // Prevent node drag when clicking input
                                />
                                <button
                                    onClick={handleUrlSubmit}
                                    className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded transition-colors"
                                >
                                    <Link size={14} />
                                </button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/5"></div>
                                </div>
                                <div className="relative flex justify-center text-[10px] uppercase">
                                    <span className="bg-neutral-900 px-2 text-neutral-500">Or</span>
                                </div>
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept="image/*"
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded flex items-center justify-center gap-2 text-xs font-medium transition-colors"
                            >
                                <Upload size={14} />
                                <span>Upload</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </BaseNode>
    );
}

export default memo(ImageNode);
