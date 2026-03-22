import React, { memo, useState, useCallback, useRef } from 'react';
import { NodeProps } from 'reactflow';
import { Image as ImageIcon } from 'lucide-react';
import BaseNode from './BaseNode';
import { useGraphStore } from '@/store/graph.store';
import { NodeActionsToolbar } from '../NodeActionsToolbar';
import { useNodeTheme } from '@/hooks/useNodeTheme';

export interface ImageNodeData {
    title?: string;
    url?: string;
}

function ImageNode({ data, selected, id }: NodeProps<ImageNodeData>) {
    const [url, setUrl] = useState(data.url || '');
    const [inputUrl, setInputUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const updateNode = useGraphStore(state => state.updateNode);
    const [isHovered, setIsHovered] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(false);
        }, 300);
    };

    const handleUrlSubmit = useCallback(() => {
        if (inputUrl) {
            setUrl(inputUrl);
            updateNode(id, { url: inputUrl });
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
            }
        };
        reader.readAsDataURL(file);
    }, [id, updateNode]);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const text = e.clipboardData.getData('text');
        if (text) { // Simple check, could be more robust URL validation
            setUrl(text);
            updateNode(id, { url: text });
        }
    }, [id, updateNode]);

    // Subscribe to color from node data
    const nodeColor = useGraphStore(state => state.nodes.find(n => n.id === id)?.data?.color);
    const { theme } = useNodeTheme(nodeColor || 'blue');

    return (
        <div 
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`relative w-[280px] bg-(--surface) rounded-[13px] overflow-hidden cursor-pointer transition-all duration-250 group ${selected ? '-translate-y-[2px]' : 'hover:-translate-y-[2px]'}`}
            style={{
                border: `1px solid ${selected ? theme.primary : theme.border}`,
                boxShadow: selected
                    ? `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 0 4px ${theme.glow}, 0 12px 48px rgba(0,0,0,0.7), 0 0 28px ${theme.glow}`
                    : `0 0 0 1px rgba(255,255,255,0.025) inset, 0 8px 40px rgba(0,0,0,0.65)`,
            }}
        >
            <NodeActionsToolbar nodeId={id} isVisible={isHovered} onMouseEnter={handleMouseEnter} />
            {/* Connection Dots */}
            <div
                className="absolute left-1/2 -translate-x-1/2 -top-[5px] w-[8px] h-[8px] rounded-full z-10 transition-all duration-200 border-[1.5px]"
                style={{
                    backgroundColor: selected ? theme.primary : 'var(--border2)',
                    borderColor: selected ? theme.primary : 'var(--border)',
                    boxShadow: selected ? `0 0 8px ${theme.hover}` : undefined,
                }}
            />
            <div
                className="absolute left-1/2 -translate-x-1/2 -bottom-[5px] w-[8px] h-[8px] rounded-full z-10 transition-all duration-200 border-[1.5px]"
                style={{
                    backgroundColor: selected ? theme.primary : 'var(--border2)',
                    borderColor: selected ? theme.primary : 'var(--border)',
                    boxShadow: selected ? `0 0 8px ${theme.hover}` : undefined,
                }}
            />

            {/* Hidden ReactFlow handles to maintain connectivity */}
            <div className="absolute inset-0 pointer-events-none opacity-0">
                <BaseNode
                    id={id}
                    selected={selected}
                    title="Hidden Image"
                    subtitle="MEDIA"
                    accentColor="blue-500"
                    icon={ImageIcon}
                    iconColor="text-blue-400"
                    hasInstruction={false}
                >
                    <div />
                </BaseNode>
            </div>

            {/* Header */}
            <div 
                className="px-[13px] py-[12px] pb-[11px] flex items-center gap-[10px] border-b border-(--border) relative z-10"
                style={{ background: 'linear-gradient(135deg, var(--raised) 0%, rgba(22,20,18,0.5) 100%)' }}
            >
                <div
                    className="w-[30px] h-[30px] rounded-[7px] flex items-center justify-center text-[14px] shrink-0 border"
                    style={{ backgroundColor: theme.background, borderColor: theme.border }}
                >
                    🖼
                </div>
                <div className="flex-1">
                    <div className="text-[13px] font-bold text-(--text) tracking-[0.01em] mb-[2px] leading-tight">Image</div>
                    <div className="font-mono text-[9px] tracking-[0.14em] uppercase leading-tight" style={{ color: theme.primary }}>MEDIA</div>
                </div>
                <button className="w-[22px] h-[22px] rounded-[5px] bg-transparent border border-transparent text-(--muted) flex items-center justify-center text-[14px] cursor-pointer transition-all tracking-[1px] hover:bg-(--raised) hover:border-(--border) hover:text-(--sub) leading-none pb-[6px]">
                    ...
                </button>
            </div>

            {/* Preview Area */}
            <div className="h-[140px] relative overflow-hidden flex items-center justify-center bg-[#111010] z-10">
                {!url && (
                    <div 
                        className="absolute inset-0" 
                        style={{ background: 'linear-gradient(135deg, rgba(91,143,212,0.04) 0%, transparent 60%), repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(91,143,212,0.03) 12px, rgba(91,143,212,0.03) 13px)' }}
                    />
                )}
                {url ? (
                    <img
                        src={url}
                        alt="Node content"
                        className="w-full h-full object-contain pointer-events-none relative z-10"
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[10px] z-10">
                        <span className="text-[32px] opacity-10">🖼</span>
                        <span className="font-mono text-[10px] text-(--muted) italic tracking-[0.06em]">No image loaded</span>
                    </div>
                )}
            </div>

            {/* Input Area */}
            {!url && (
                <div className="px-[13px] py-[12px] border-t border-(--border) flex flex-col gap-[8px] relative z-20 bg-(--surface)">
                    <div className="flex items-center gap-[6px]">
                        <input
                            type="text"
                            value={inputUrl}
                            onChange={(e) => setInputUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                            onPaste={handlePaste}
                            placeholder="Paste image URL..."
                            className="flex-1 h-[34px] bg-(--bg) border border-(--border2) rounded-[10px] px-[10px] font-mono text-[10px] text-(--sub) outline-none transition-all placeholder:text-(--muted)"
                            style={{ '--focus-color': theme.primary, caretColor: 'var(--amber)' } as React.CSSProperties}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            onClick={handleUrlSubmit}
                            className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-[15px] cursor-pointer shrink-0 transition-all border"
                            style={{ backgroundColor: theme.background, color: theme.primary, borderColor: theme.border }}
                        >
                            🔗
                        </button>
                    </div>

                    <div className="flex items-center gap-[10px] font-mono text-[9px] text-(--muted) tracking-[0.12em] before:content-[''] before:flex-1 before:h-px before:bg-(--border) after:content-[''] after:flex-1 after:h-px after:bg-(--border)">
                        or
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
                        className="w-full h-[36px] rounded-[10px] border border-dashed border-(--border2) bg-transparent font-sans text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-[7px] transition-all tracking-[0.03em] text-(--sub)"
                    >
                        <span className="text-[14px]">↑</span> Upload Image
                    </button>
                </div>
            )}

            {/* Footer */}
            <div 
                className="px-[13px] py-[7px] border-t border-(--border) flex items-center justify-between relative z-10"
                style={{ background: 'linear-gradient(135deg, rgba(22,20,18,0.5) 0%, var(--raised) 100%)' }}
            >
                <span className="font-mono text-[9px] text-(--muted) tracking-[0.06em]">
                    {url ? (new URL(url).hostname || 'Local Image') : 'Supports JPG · PNG · WebP · SVG'}
                </span>
                <div className="flex gap-[3px]">
                    <div className="w-[4px] h-[4px] rounded-full transition-colors duration-200" style={{ backgroundColor: theme.primary }} />
                    <div className="w-[4px] h-[4px] rounded-full transition-all duration-200 delay-50 opacity-60" style={{ backgroundColor: theme.primary }} />
                    <div className="w-[4px] h-[4px] rounded-full transition-all duration-200 delay-100 opacity-30" style={{ backgroundColor: theme.primary }} />
                </div>
            </div>
        </div>
    );
}

export default memo(ImageNode);
