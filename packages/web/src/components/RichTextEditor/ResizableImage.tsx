import Image from '@tiptap/extension-image';
import type { NodeViewProps } from '@tiptap/react';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { useRef } from 'react';

const ResizableImageView: React.FC<NodeViewProps> = ({ node, updateAttributes }) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const width = (node.attrs.width as string) || '100%';

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const el = wrapperRef.current;
        if (!el) return;
        const startX = e.clientX;
        const startWidth = el.offsetWidth;
        const parentWidth = el.parentElement?.offsetWidth ?? startWidth;

        const onPointerMove = (moveEvent: PointerEvent) => {
            const newWidthPx = startWidth + (moveEvent.clientX - startX);
            const newWidthPct = Math.round(Math.max(10, Math.min(100, (newWidthPx / parentWidth) * 100)));
            updateAttributes({ width: `${newWidthPct}%` });
        };

        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    return (
        <NodeViewWrapper as="div">
            <div ref={wrapperRef} className="tiptap-image-wrapper" style={{ width }}>
                <img src={node.attrs.src as string} alt={(node.attrs.alt as string) || ''} draggable={false} />
                <div className="tiptap-image-resize-handle" onPointerDown={handlePointerDown} />
            </div>
        </NodeViewWrapper>
    );
};

export const ResizableImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: '100%',
                parseHTML: (el) => (el as HTMLImageElement).style.width || '100%',
                renderHTML: (attrs) => ({ style: `width: ${attrs.width}` }),
            },
        };
    },
    addNodeView() {
        return ReactNodeViewRenderer(ResizableImageView);
    },
});
