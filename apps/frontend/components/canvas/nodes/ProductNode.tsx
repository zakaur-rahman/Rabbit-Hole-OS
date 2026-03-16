'use client';

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { ShoppingBag, Star } from 'lucide-react';
import BaseNode from './BaseNode';

export interface ProductNodeData {
    title: string;
    url?: string;
    price?: string;
    rating?: number;
    thumbnail?: string;
    inStock?: boolean;
    color?: string;
}

function ProductNode({ data, selected, id }: NodeProps<ProductNodeData & { isPreview?: boolean }>) {
    const isPreview = data.isPreview;

    let subtitle = 'Product';
    try {
        if (data.url) {
            subtitle = new URL(data.url).hostname.replace('www.', '');
        }
    } catch { }

    return (
        <BaseNode
            id={id}
            selected={selected}
            title={data.title}
            subtitle={subtitle}
            icon={ShoppingBag}
            accentColor={data.color || 'purple'}
            minHeight={120}
            showResizer={!isPreview}
        >
            <div className="flex-1 flex flex-col min-h-0 relative">
                {/* Thumbnail */}
                <div className={`relative ${isPreview ? 'h-24' : 'h-28'} bg-(--raised)/50 flex items-center justify-center overflow-hidden`}>
                    {data.thumbnail ? (
                        <img src={data.thumbnail} alt={data.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-(--raised) to-(--bg)">
                            <ShoppingBag size={isPreview ? 24 : 32} className="text-(--node-text) opacity-10" />
                        </div>
                    )}

                    {/* Stock Badge */}
                    {data.inStock !== undefined && !isPreview && (
                        <span className={`absolute top-2 left-2 px-2 py-0.5 text-[9px] font-bold uppercase rounded-full border ${data.inStock ? 'bg-green-500/20 text-green-400 border-green-500/20' : 'bg-red-500/20 text-red-400 border-red-500/20'
                            }`}>
                            {data.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                    )}
                </div>

                {/* Details */}
                <div className={`${isPreview ? 'p-2' : 'p-3'} bg-(--bg)/20`}>
                    <div className="flex items-center justify-between gap-2">
                        {data.price && (
                            <p className="text-(--node-accent) font-bold text-sm tracking-tight">{data.price}</p>
                        )}
                        {data.rating && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/10 rounded border border-yellow-500/10">
                                <Star size={10} className="text-yellow-500 fill-yellow-500" />
                                <span className={`text-[10px] font-bold text-yellow-500 ${isPreview ? 'hidden' : ''}`}>{data.rating}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(ProductNode);
