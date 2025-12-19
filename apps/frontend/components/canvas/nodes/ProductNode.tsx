'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { ShoppingBag, Star, ExternalLink } from 'lucide-react';

export interface ProductNodeData {
    title: string;
    url?: string;
    price?: string;
    rating?: number;
    thumbnail?: string;
    inStock?: boolean;
}

function ProductNode({ data, selected }: NodeProps<ProductNodeData>) {
    return (
        <>
            <NodeResizer
                minWidth={150}
                minHeight={100}
                isVisible={true}
                lineClassName="border-green-500"
                handleClassName="h-3 w-3 bg-neutral-900 border-2 border-green-500 rounded"
            />
            <div
                className={`
        group relative bg-neutral-900 border rounded-xl overflow-hidden h-full w-full
        transition-all duration-200 cursor-pointer
        ${selected
                        ? 'border-green-500 shadow-lg shadow-green-500/20'
                        : 'border-neutral-700 hover:border-green-500/50'
                    }
      `}
            >
                {/* Thumbnail */}
                <div className="relative h-28 bg-neutral-800 flex items-center justify-center">
                    {data.thumbnail ? (
                        <img src={data.thumbnail} alt={data.title} className="w-full h-full object-cover" />
                    ) : (
                        <ShoppingBag size={32} className="text-neutral-600" />
                    )}

                    {/* Stock Badge */}
                    {data.inStock !== undefined && (
                        <span className={`absolute top-2 left-2 px-2 py-0.5 text-[10px] font-medium rounded-full ${data.inStock ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                            {data.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                    )}
                </div>

                {/* Details */}
                <div className="p-3">
                    <h3 className="text-sm font-medium text-white line-clamp-2 leading-tight mb-1">
                        {data.title || 'Product'}
                    </h3>

                    {data.price && (
                        <p className="text-green-400 font-semibold text-sm">{data.price}</p>
                    )}

                    {data.rating && (
                        <div className="flex items-center gap-1 mt-1">
                            <Star size={12} className="text-yellow-500 fill-yellow-500" />
                            <span className="text-xs text-neutral-400">{data.rating}</span>
                        </div>
                    )}
                </div>

                {/* Handles */}
                <Handle type="source" position={Position.Top} id="top" className="!w-2 !h-2 !bg-green-500 !border-2 !border-neutral-900" />
                <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2 !h-2 !bg-green-500 !border-2 !border-neutral-900" />
                <Handle type="source" position={Position.Left} id="left" className="!w-2 !h-2 !bg-green-500 !border-2 !border-neutral-900" />
                <Handle type="source" position={Position.Right} id="right" className="!w-2 !h-2 !bg-green-500 !border-2 !border-neutral-900" />
            </div>
        </>
    );
}

export default memo(ProductNode);
