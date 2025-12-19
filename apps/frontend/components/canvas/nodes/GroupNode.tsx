import { memo } from 'react';
import { NodeProps, NodeResizer, NodeToolbar, Position, Handle } from 'reactflow';
import { Trash2, Palette, Scan, Copy, Edit2, Image as ImageIcon } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';

function GroupNode({ id, data, selected }: NodeProps) {
    const { removeNode } = useGraphStore();

    return (
        <>
            <NodeToolbar isVisible={selected} position={Position.Top} className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1 shadow-xl">
                <button className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white" onClick={() => removeNode(id)}>
                    <Trash2 size={14} />
                </button>
                <div className="w-px h-4 bg-neutral-800" />
                <button className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white">
                    <Palette size={14} />
                </button>
                <button className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white">
                    <Scan size={14} />
                </button>
                <button className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white">
                    <Copy size={14} />
                </button>
                <button className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white">
                    <Edit2 size={14} />
                </button>
                <button className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white">
                    <ImageIcon size={14} />
                </button>
            </NodeToolbar>

            <div
                className={`
            relative w-full h-full min-w-[200px] min-h-[200px]
            rounded-xl border-[2px] transition-all duration-200
            ${selected
                        ? 'border-green-500 shadow-xl shadow-green-500/10'
                        : 'border-neutral-700 hover:border-green-500/50'
                    }
            bg-transparent
          `}
            >
                <NodeResizer
                    isVisible={true}
                    minWidth={100}
                    minHeight={100}
                    lineClassName="border-green-500"
                    handleClassName="h-3 w-3 bg-neutral-900 border-2 border-green-500 rounded"
                />

                {/* Label Pill */}
                <div className="absolute w-28 overflow-hidden -top-10 justify-left">
                    <div className={`
                        flex items-center w-full px-1 py-1 rounded-md
                        border border-green-500/50 bg-transparent
                        ${selected ? 'border-green-500' : ''}
                    `}>
                        <input
                            className="bg-transparent border-none outline-none text-sm font-medium text-green-300 placeholder-green-500/50 w-full transition-colors"
                            placeholder="Untitled group"
                            defaultValue={data.label}
                            onChange={(e) => {
                                data.label = e.target.value;
                            }}
                        />
                    </div>
                </div>
            </div>
            {/* Handles with high z-index to ensure they are interactive */}
            <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-green-500 !border-2 !border-neutral-900 !z-50" id="top" />
            <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-green-500 !border-2 !border-neutral-900 !z-50" id="right" />
            <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-green-500 !border-2 !border-neutral-900 !z-50" id="bottom" />
            <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-green-500 !border-2 !border-neutral-900 !z-50" id="left" />
        </>
    );
}

export default memo(GroupNode);
